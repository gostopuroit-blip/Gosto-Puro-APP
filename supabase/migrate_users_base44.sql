-- ============================================================
-- GOSTO PURO — Migração silenciosa de usuários do Base44
-- Execute no Supabase SQL Editor (projeto szgxfgjspdpwdrdrmbxx)
-- ============================================================

-- ============================================================
-- TABELA: base44_users_import
-- Armazena os dados dos usuários exportados do Base44.
-- Quando um usuário se registrar com o mesmo email, o trigger
-- handle_new_user() enriquece automaticamente o perfil.
-- ============================================================
CREATE TABLE IF NOT EXISTS base44_users_import (
  email              TEXT PRIMARY KEY,
  base44_id          TEXT UNIQUE,
  display_name       TEXT,
  role               TEXT DEFAULT 'user',
  plan               TEXT DEFAULT 'free',
  status             TEXT DEFAULT 'active',
  bio                TEXT,
  age                INTEGER,
  photo_url          TEXT,
  dietary_tags_profile TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT,
  health_conditions  TEXT,
  dark_mode          BOOLEAN DEFAULT false,
  base44_created_at  TIMESTAMPTZ,
  imported_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Sem RLS pública — acessível apenas via service_role (trigger)
ALTER TABLE base44_users_import ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_base44_users_import" ON base44_users_import
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Índice para busca rápida por email no trigger
CREATE INDEX IF NOT EXISTS idx_base44_users_import_email ON base44_users_import(email);


-- ============================================================
-- FUNÇÃO: handle_new_user() (versão atualizada com enriquecimento)
-- Ao criar um novo usuário Supabase, verifica base44_users_import
-- e preenche automaticamente os dados do perfil, se disponíveis.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  imported RECORD;
  v_role   TEXT := 'user';
  v_plan   TEXT := 'free';
  v_status TEXT := 'active';
BEGIN
  -- Tenta encontrar dados do Base44 pelo email
  SELECT * INTO imported
  FROM base44_users_import
  WHERE LOWER(email) = LOWER(new.email)
  LIMIT 1;

  -- Se encontrou dados importados, usa os valores do Base44
  IF FOUND THEN
    -- Mapeia role: admin continua admin, premium → premium, resto → user
    v_role := CASE
      WHEN imported.role = 'admin'   THEN 'admin'
      WHEN imported.plan = 'premium' THEN 'premium'
      ELSE 'user'
    END;

    -- Mapeia plan: premium se tinha plano premium
    v_plan := CASE
      WHEN imported.plan = 'premium' THEN 'premium'
      ELSE 'free'
    END;

    -- Mapeia status
    v_status := COALESCE(imported.status, 'active');
    IF v_status NOT IN ('active', 'blocked') THEN
      v_status := 'active';
    END IF;

    INSERT INTO profiles (
      id, email, role, plan, status,
      display_name, bio, age, photo_url,
      dietary_restrictions, dietary_tags_profile,
      health_conditions, dark_mode
    ) VALUES (
      new.id,
      new.email,
      v_role,
      v_plan,
      v_status,
      imported.display_name,
      imported.bio,
      imported.age,
      NULLIF(imported.photo_url, ''),
      imported.dietary_restrictions,
      COALESCE(imported.dietary_tags_profile, '{}'),
      CASE WHEN imported.health_conditions IS NOT NULL
           THEN ARRAY[imported.health_conditions]
           ELSE '{}'::text[]
      END,
      COALESCE(imported.dark_mode, false)
    );
  ELSE
    -- Novo usuário sem histórico no Base44 — perfil padrão
    INSERT INTO profiles (id, email, role, plan, status)
    VALUES (new.id, new.email, 'user', 'free', 'active');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- O trigger já existe (on_auth_user_created), só precisa recriar a função.
-- Se por algum motivo o trigger não existir, recriar:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- ============================================================
-- FIM
-- ============================================================

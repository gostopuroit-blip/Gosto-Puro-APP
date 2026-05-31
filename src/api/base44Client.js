import { supabase } from '@/lib/supabase';

// Base44 usava "created_date" / "updated_date" — Supabase usa "created_at" / "updated_at"
const FIELD_MAP = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

function mapField(field) {
  return FIELD_MAP[field] || field;
}

function parseSortParam(sort) {
  if (!sort || typeof sort !== 'string') return { column: 'created_at', ascending: false };
  const desc = sort.startsWith('-');
  const column = mapField(sort.replace(/^-/, ''));
  return { column, ascending: !desc };
}

function createEntity(tableName) {
  return {
    async filter(filters = {}, sort = '-created_at', limit = 100, skip = 0) {
      let query = supabase.from(tableName).select('*');

      for (const [rawKey, value] of Object.entries(filters)) {
        const key = mapField(rawKey);
        if (value === null || value === undefined) {
          query = query.is(key, null);
        } else if (Array.isArray(value)) {
          query = query.contains(key, value);
        } else if (typeof value === 'object' && value.$in) {
          query = query.in(key, value.$in);
        } else if (typeof value === 'object' && value.$ne) {
          query = query.neq(key, value.$ne);
        } else if (typeof value === 'object' && value.$gt) {
          query = query.gt(key, value.$gt);
        } else if (typeof value === 'object' && value.$gte) {
          query = query.gte(key, value.$gte);
        } else if (typeof value === 'object' && value.$lt) {
          query = query.lt(key, value.$lt);
        } else if (typeof value === 'object' && value.$lte) {
          query = query.lte(key, value.$lte);
        } else {
          query = query.eq(key, value);
        }
      }

      const { column, ascending } = parseSortParam(sort);
      query = query.order(column, { ascending });

      if (limit) {
        if (skip > 0) {
          query = query.range(skip, skip + limit - 1);
        } else {
          query = query.limit(limit);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async list(sort = '-created_at', limit = 1000, skip = 0) {
      let query = supabase.from(tableName).select('*');
      const { column, ascending } = parseSortParam(sort);
      query = query.order(column, { ascending });
      if (limit) {
        if (skip > 0) {
          query = query.range(skip, skip + limit - 1);
        } else {
          query = query.limit(limit);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(data) {
      // Injeta user_id automaticamente se não foi passado (necessário para RLS)
      let payload = { ...data };
      if (!payload.user_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) payload.user_id = user.id;
      }
      let { data: result, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single();
      // Tabelas sem coluna user_id (ex: notifications) — tenta de novo sem ela
      if (error && /user_id/.test(error.message || '') && payload.user_id) {
        const { user_id, ...rest } = payload;
        ({ data: result, error } = await supabase
          .from(tableName)
          .insert(rest)
          .select()
          .single());
      }
      if (error) throw error;
      return result;
    },

    async update(id, data) {
      const { data: result, error } = await supabase
        .from(tableName)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },

    async bulkCreate(items) {
      if (!items || items.length === 0) return [];
      // Injeta user_id em todos os itens
      const { data: { user } } = await supabase.auth.getUser();
      const payload = items.map(item => ({
        ...item,
        user_id: item.user_id || user?.id,
      }));
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select();
      if (error) throw error;
      return result;
    },
  };
}

const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw Object.assign(new Error('Not authenticated'), { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const purchasedSlugs = Array.isArray(profile?.purchased_products) ? profile.purchased_products : [];
    const hasPurchase = purchasedSlugs.length > 0;

    // Acesso premium "estrito": vê TODAS as receitas (premium completo, admin, expert)
    const isFullPremium =
      profile?.role === 'admin' ||
      profile?.role === 'premium' ||
      profile?.role === 'basic' ||
      profile?.plan === 'premium' ||
      profile?.plan === 'basic' ||
      profile?.is_expert === true;

    // has_access = libera Planner/Cartelle (qualquer compra OU premium completo)
    const hasAccess = isFullPremium || hasPurchase;

    // unlocked_occasions = ocasiões que esse usuário pode ver
    // Premium completo → ['*'] (tudo). Senão → união das occasioni dos produtos comprados.
    let unlockedOccasions = [];
    if (isFullPremium) {
      unlockedOccasions = ['*'];
    } else if (hasPurchase) {
      const { data: prods } = await supabase
        .from('gosto_puro_products')
        .select('slug,occasioni')
        .in('slug', purchasedSlugs);
      const set = new Set();
      (prods || []).forEach(p => (p.occasioni || []).forEach(o => set.add(o)));
      unlockedOccasions = [...set];
    }

    return {
      ...profile,
      id: user.id,
      email: user.email,
      is_premium: hasAccess,        // mantém compatibilidade com Folders/etc
      is_full_premium: isFullPremium,
      has_access: hasAccess,
      unlocked_occasions: unlockedOccasions,
    };
  },

  // Atualiza o profile do usuário logado
  async updateMe(data) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    const { data: result, error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    window.location.href = redirectUrl || '/Login';
  },

  redirectToLogin(redirectUrl) {
    const params = redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : '';
    window.location.href = `/Login${params}`;
  },
};

const NOT_AVAILABLE = (feature) => () => {
  throw new Error(`${feature} requer chave de IA (OpenAI/Anthropic) — funcionalidade não configurada no momento.`);
};

const integrations = {
  Core: {
    // Upload real pro Supabase Storage. Retorna { file_url } (formato esperado pelo código legado)
    async UploadFile({ file, bucket = 'uploads' }) {
      if (!file) throw new Error('UploadFile: arquivo ausente');
      const { data: { user } } = await supabase.auth.getUser();
      const folder = user?.id || 'anon';
      const ext = (file.name?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { file_url: data.publicUrl };
    },
    // Stubs: dão erro claro em vez de TypeError até configurar edge function
    InvokeLLM: NOT_AVAILABLE('InvokeLLM'),
    GenerateImage: NOT_AVAILABLE('GenerateImage'),
  },
};

// ------------------------------------------------------------------
// functions.invoke — substitui as Edge Functions do base44.
// Funções DB-backed rodam direto no Supabase; as que dependem de
// email/push/IA fazem no-op gracioso (retornam {success:false,message}).
// Sempre retorna { data } para casar com o formato que os callers esperam.
// ------------------------------------------------------------------
async function getAllProfiles() {
  const PAGE = 1000;
  let all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
  }
  return all;
}

async function insertNotification(row) {
  // Resolve recipient_id pelo email (permite que o destinatário leia por id também)
  if (!row.recipient_id && row.recipient_email) {
    const { data: rprof } = await supabase
      .from('profiles').select('id').ilike('email', row.recipient_email).limit(1).maybeSingle();
    if (rprof?.id) row.recipient_id = rprof.id;
  }
  // NÃO usar .select() — a policy de SELECT bloqueia ler notificação de outro usuário
  const { error } = await supabase.from('notifications').insert(row);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

const FUNCTION_HANDLERS = {
  async adminGetUsersV2() {
    return await getAllProfiles();
  },

  async adminUpdateUser({ userId, data } = {}) {
    if (!userId || !data) return { success: false, error: 'Missing userId or data' };
    const { data: updated, error } = await supabase
      .from('profiles').update(data).eq('id', userId).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, user: updated };
  },

  async createLikeNotification({ post_id, post_author_email, liker_email, liker_name, liker_photo } = {}) {
    if (!post_id || !post_author_email || !liker_email) return { success: false };
    if (liker_email === post_author_email) return { success: true, skipped: true };
    return await insertNotification({
      recipient_email: post_author_email, sender_email: liker_email,
      sender_name: liker_name || liker_email.split('@')[0], sender_photo: liker_photo || null,
      type: 'like', message: `${liker_name || liker_email.split('@')[0]} ha messo mi piace al tuo post`,
      reference_id: post_id, reference_type: 'post', is_read: false,
    });
  },

  async createFollowNotification({ followed_email, follower_email, follower_name, follower_photo } = {}) {
    if (!followed_email || !follower_email) return { success: false };
    if (follower_email === followed_email) return { success: true, skipped: true };
    return await insertNotification({
      recipient_email: followed_email, sender_email: follower_email,
      sender_name: follower_name || follower_email.split('@')[0], sender_photo: follower_photo || null,
      type: 'follow', message: `${follower_name || follower_email.split('@')[0]} ha iniziato a seguirti`,
      reference_id: follower_email, reference_type: 'profile', is_read: false,
    });
  },

  async createMentionNotification({ recipient_email, sender_name, post_id, type } = {}) {
    if (!recipient_email || !sender_name || !post_id || !type) return { success: false };
    const { data: { user } } = await supabase.auth.getUser();
    return await insertNotification({
      recipient_email, sender_email: user?.email, sender_name, type,
      message: type === 'post_mention'
        ? `${sender_name} ti ha menzionato in un post`
        : `${sender_name} ti ha menzionato in un commento`,
      reference_id: post_id, reference_type: 'post', is_read: false,
    });
  },

  async savePushSubscription({ endpoint, p256dh, auth: authKey } = {}) {
    if (!endpoint) return { success: false, error: 'Missing endpoint' };
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user?.id, user_email: user?.email, endpoint, p256dh, auth: authKey,
    }, { onConflict: 'endpoint' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  // Push web requer chaves VAPID no servidor — não configurado
  async getVapidPublicKey() {
    return { publicKey: null };
  },

  // Aplica compras pendentes a perfis já existentes (admin)
  async processPendingPremium() {
    const { data: pendings } = await supabase
      .from('pending_premium').select('*').eq('status', 'pending');
    let applied = 0;
    for (const p of pendings || []) {
      const { data: prof } = await supabase
        .from('profiles').select('id,purchased_products').ilike('email', p.email).limit(1).maybeSingle();
      if (!prof) continue;
      const { data: gp } = await supabase
        .from('gosto_puro_products').select('slug').eq('hotmart_product_id', p.product_id).maybeSingle();
      if (gp?.slug) {
        const cur = prof.purchased_products || [];
        if (!cur.includes(gp.slug)) {
          await supabase.from('profiles').update({ purchased_products: [...cur, gp.slug] }).eq('id', prof.id);
        }
      } else {
        await supabase.from('profiles').update({ plan: 'premium' }).eq('id', prof.id);
      }
      await supabase.from('pending_premium').update({ status: 'applied' }).eq('id', p.id);
      applied++;
    }
    return { success: true, applied };
  },
};

// Funções que dependem de email/push/IA — no-op gracioso até configurar infra
const NOOP_FUNCTIONS = {
  sendCustomNotification: 'Notifiche push richiedono configurazione VAPID',
  sendDailyRecipeEmailsForce: 'Invio email richiede configurazione SMTP',
  ebookFollowupSender: 'Invio email richiede configurazione SMTP',
  ebookFollowupTest: 'Invio email richiede configurazione SMTP',
  generateBulkRecipes: 'Generazione IA non configurata',
  cleanupFreeUserRecipes: 'Funzione non disponibile',
  updateBaseFreeUnlockedIds: 'Funzione non disponibile',
};

const functions = {
  async invoke(name, payload) {
    try {
      if (FUNCTION_HANDLERS[name]) {
        const result = await FUNCTION_HANDLERS[name](payload);
        return { data: result };
      }
      if (NOOP_FUNCTIONS[name]) {
        return { data: { success: false, message: NOOP_FUNCTIONS[name] } };
      }
      return { data: { success: false, error: `Função desconhecida: ${name}` } };
    } catch (e) {
      return { data: { success: false, error: e.message } };
    }
  },
};

export const base44 = {
  auth,
  integrations,
  functions,
  entities: {
    AppAnalytics: createEntity('app_analytics'),
    AppConfig: createEntity('app_config'),
    BadWord: createEntity('bad_words'),
    DailyNotification: createEntity('daily_notifications'),
    EbookPurchaseTrigger: createEntity('ebook_purchase_triggers'),
    EmailTemplate: createEntity('email_templates'),
    Folder: createEntity('folders'),
    FreeRecipe: createEntity('free_recipes'),
    GostoPuroProduct: createEntity('gosto_puro_products'),
    MealPlan: createEntity('meal_plans'),
    Notification: createEntity('notifications'),
    PendingPremium: createEntity('pending_premium'),
    PlannerUsage: createEntity('planner_usage'),
    PushSubscription: createEntity('push_subscriptions'),
    Recipe: createEntity('recipes'),
    RecipeComment: createEntity('recipe_comments'),
    RecipeOccasion: createEntity('recipe_occasions'),
    ShoppingItem: createEntity('shopping_items'),
    User: createEntity('profiles'),
    UserRecipe: createEntity('user_recipes'),
    WebhookLog: createEntity('webhook_logs'),
  },
};

-- ============================================================
-- GOSTO PURO — Supabase Migration SQL
-- ============================================================
-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard
-- 2. Selecione o projeto szgxfgjspdpwdrdrmbxx
-- 3. Vá em "SQL Editor"
-- 4. Cole e execute este arquivo inteiro
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- TABELA: profiles  (deve ser criada primeiro — outras tabelas referenciam ela)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email text unique,
  role text not null default 'user' check (role in ('user', 'admin', 'premium')),
  plan text not null default 'free' check (plan in ('free', 'premium')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  display_name text,
  bio text,
  age int,
  photo_url text,
  dietary_restrictions text,
  dietary_tags_profile text[],
  health_conditions text[],
  dark_mode boolean default false,
  is_suggested boolean default false,
  subscription_level text check (subscription_level in ('free', 'premium')),
  subscription_status text check (subscription_status in ('active', 'cancelled', 'expired', 'refunded')),
  subscription_plan text check (subscription_plan in ('monthly', 'yearly', 'lifetime')),
  expiration_date date,
  hotmart_product_id text,
  purchased_products text[],
  hotmart_product_ids text[]
);

alter table profiles enable row level security;

create policy "user_read_own_profile" on profiles
  for select using (auth.uid() = id);

create policy "user_update_own_profile" on profiles
  for update using (auth.uid() = id);

create policy "admin_all_profiles" on profiles
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role, plan, status)
  values (new.id, new.email, 'user', 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ============================================================
-- TABELA: app_config
-- ============================================================
create table if not exists app_config (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  key text not null unique,
  value text not null,
  label text
);

alter table app_config enable row level security;

create policy "admin_all_app_config" on app_config
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: recipes
-- ============================================================
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  title text not null,
  description text not null,
  image_url text,
  gen_prompt text,
  status text default 'bozza' check (status in ('pubblicata', 'bozza')),
  is_premium boolean default false,
  category text not null check (category in ('Colazione', 'Pranzo', 'Cena', 'Dolce', 'Snack', 'Bevanda')),
  occasions text[],
  lifestyle text[],
  dietary_tags text[],
  paese text,
  prep_time int not null,
  servings int,
  difficulty text check (difficulty in ('Facile', 'Media', 'Difficile')),
  calories numeric,
  calorie numeric,
  proteine numeric,
  carboidrati numeric,
  grassi numeric,
  fibre numeric,
  zuccheri numeric,
  sodio numeric,
  ingredients jsonb,
  instructions text[],
  sostituzioni jsonb,
  numero_salvate int default 0,
  numero_preparate int default 0,
  total_rating numeric default 0,
  rating_count int default 0,
  media_rating numeric default 0
);

alter table recipes enable row level security;

create policy "public_read_recipes" on recipes
  for select using (true);

create policy "admin_write_recipes" on recipes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: recipe_occasions
-- ============================================================
create table if not exists recipe_occasions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  label text not null,
  icon text,
  tipo text not null check (tipo in ('giorno', 'speciale', 'stile_vita')),
  categoria_principale text,
  mood text,
  stagione text check (stagione in ('all', 'estate', 'autunno', 'inverno', 'primavera')),
  linee_guida text[],
  image_modifiers text[],
  prompt_extra text,
  sort_order int,
  is_active boolean default true,
  show_in_home boolean default false
);

alter table recipe_occasions enable row level security;

create policy "public_read_recipe_occasions" on recipe_occasions
  for select using (true);

create policy "admin_write_recipe_occasions" on recipe_occasions
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: gosto_puro_products
-- ============================================================
create table if not exists gosto_puro_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  nome text not null,
  slug text not null unique,
  descricao text,
  image_url text,
  webhook_url text,
  hotmart_product_id text,
  occasioni text[],
  is_active boolean default true,
  sort_order int,
  is_free boolean default false
);

alter table gosto_puro_products enable row level security;

create policy "public_read_gosto_puro_products" on gosto_puro_products
  for select using (true);

create policy "admin_write_gosto_puro_products" on gosto_puro_products
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: meal_plans
-- ============================================================
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  days int not null,
  focus text,
  goal text check (goal in ('Ganho di massa', 'Dimagrimento', 'Mantenimento', 'Detox')),
  daily_kcal numeric,
  max_time int,
  servings int,
  plan_data jsonb not null,
  days_completed int[],
  is_active boolean default true
);

alter table meal_plans enable row level security;

create policy "user_own_meal_plans" on meal_plans
  for all using (auth.uid() = user_id);


-- ============================================================
-- TABELA: community_posts
-- ============================================================
create table if not exists community_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete set null,
  user_email text,
  user_name text,
  user_photo text,
  content text not null,
  image_url text,
  images text[],
  video_url text,
  media_type text check (media_type in ('image', 'video')),
  post_type text default 'image_post' check (post_type in ('image_post', 'tip', 'recipe', 'premium_content', 'poll', 'quiz')),
  title text,
  is_premium boolean default false,
  is_pinned boolean default false,
  likes text[],
  likes_count int default 0,
  comments_count int default 0,
  tags text[],
  mentions text[],
  is_expert boolean default false,
  link_preview jsonb,
  status text default 'active' check (status in ('active', 'hidden')),
  author_role text,
  author_plan text,
  author_id text
);

alter table community_posts enable row level security;

create policy "public_read_community_posts" on community_posts
  for select using (true);

create policy "user_own_community_posts" on community_posts
  for insert with check (auth.uid() = user_id);

create policy "user_update_own_community_posts" on community_posts
  for update using (auth.uid() = user_id);

create policy "user_delete_own_community_posts" on community_posts
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: community_comments
-- ============================================================
create table if not exists community_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete set null,
  post_id uuid references community_posts(id) on delete cascade not null,
  user_email text,
  user_name text,
  user_photo text,
  content text not null,
  is_expert boolean default false,
  likes text[],
  likes_count int default 0,
  mentions text[],
  reply_to_comment_id uuid,
  reply_to_user text
);

alter table community_comments enable row level security;

create policy "public_read_community_comments" on community_comments
  for select using (true);

create policy "user_own_community_comments" on community_comments
  for insert with check (auth.uid() = user_id);

create policy "user_update_own_community_comments" on community_comments
  for update using (auth.uid() = user_id);

create policy "user_delete_own_community_comments" on community_comments
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: stories
-- ============================================================
create table if not exists stories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  user_email text,
  user_name text,
  user_photo text,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text,
  views_count int default 0,
  viewers text[],
  likes text[],
  likes_count int default 0,
  expires_at timestamptz,
  status text default 'active' check (status in ('active', 'expired', 'hidden'))
);

alter table stories enable row level security;

create policy "public_read_active_stories" on stories
  for select using (status = 'active');

create policy "user_own_stories" on stories
  for insert with check (auth.uid() = user_id);

create policy "user_update_own_stories" on stories
  for update using (auth.uid() = user_id);

create policy "user_delete_own_stories" on stories
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: user_follows
-- ============================================================
create table if not exists user_follows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_by text,
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  follower_email text,
  following_email text,
  unique(follower_id, following_id)
);

alter table user_follows enable row level security;

create policy "public_read_user_follows" on user_follows
  for select using (true);

create policy "user_own_user_follows" on user_follows
  for insert with check (auth.uid() = follower_id);

create policy "user_delete_own_user_follows" on user_follows
  for delete using (auth.uid() = follower_id);


-- ============================================================
-- TABELA: user_recipes
-- ============================================================
create table if not exists user_recipes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade not null,
  is_saved boolean default false,
  is_prepared boolean default false,
  is_favorite boolean default false,
  user_rating numeric,
  folder_ids text[],
  status text check (status in ('per_fare', 'fatta')),
  sostituzioni_applicate jsonb,
  macros_personalizzati jsonb,
  unique(user_id, recipe_id)
);

alter table user_recipes enable row level security;

create policy "user_own_user_recipes" on user_recipes
  for all using (auth.uid() = user_id);


-- ============================================================
-- TABELA: folders
-- ============================================================
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  icon text,
  is_system boolean default false
);

alter table folders enable row level security;

create policy "read_own_or_system_folders" on folders
  for select using (
    is_system = true
    or auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "user_create_non_system_folders" on folders
  for insert with check (auth.uid() = user_id and is_system = false);

create policy "user_update_own_non_system_folders" on folders
  for update using (auth.uid() = user_id and is_system = false);

create policy "user_delete_own_non_system_folders" on folders
  for delete using (auth.uid() = user_id and is_system = false);


-- ============================================================
-- TABELA: shopping_items
-- ============================================================
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  quantity text,
  category text not null check (category in ('Ortofrutta', 'Carne e pesce', 'Latticini', 'Dispensa', 'Surgelati', 'Altro')),
  is_checked boolean default false,
  meal_plan_id uuid references meal_plans(id) on delete set null
);

alter table shopping_items enable row level security;

create policy "user_own_shopping_items" on shopping_items
  for all using (auth.uid() = user_id);


-- ============================================================
-- TABELA: recipe_comments
-- ============================================================
create table if not exists recipe_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete set null,
  recipe_id uuid references recipes(id) on delete cascade not null,
  user_email text,
  user_name text,
  user_photo text,
  content text not null,
  is_expert boolean default false,
  status text default 'active' check (status in ('active', 'hidden'))
);

alter table recipe_comments enable row level security;

create policy "public_read_active_recipe_comments" on recipe_comments
  for select using (status = 'active');

create policy "any_create_recipe_comments" on recipe_comments
  for insert with check (true);

create policy "user_update_own_recipe_comments" on recipe_comments
  for update using (auth.uid() = user_id);

create policy "user_delete_own_recipe_comments" on recipe_comments
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: direct_messages
-- ============================================================
create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  sender_id uuid references profiles(id) on delete set null,
  receiver_id uuid references profiles(id) on delete set null,
  sender_email text not null,
  receiver_email text not null,
  content text not null,
  media_url text,
  media_type text check (media_type in ('image', 'video', 'audio')),
  is_read boolean default false,
  read_at timestamptz,
  conversation_id text not null,
  status text default 'sent' check (status in ('sent', 'delivered', 'read', 'deleted'))
);

alter table direct_messages enable row level security;

create policy "user_own_direct_messages" on direct_messages
  for all using (auth.uid() = sender_id or auth.uid() = receiver_id);


-- ============================================================
-- TABELA: notifications
-- ============================================================
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  recipient_id uuid references profiles(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  recipient_email text not null,
  sender_email text,
  sender_name text,
  sender_photo text,
  type text not null check (type in ('like', 'comment', 'follow', 'mention', 'reply', 'share', 'new_post', 'system')),
  message text not null,
  reference_id text,
  reference_type text check (reference_type in ('post', 'comment', 'recipe', 'story', 'profile')),
  is_read boolean default false,
  read_at timestamptz
);

alter table notifications enable row level security;

create policy "user_own_notifications" on notifications
  for all using (auth.uid() = recipient_id);

create policy "any_create_notifications" on notifications
  for insert with check (true);


-- ============================================================
-- TABELA: polls
-- ============================================================
create table if not exists polls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  user_email text,
  question text not null,
  options jsonb not null,
  total_votes int default 0,
  expires_at timestamptz,
  post_id uuid references community_posts(id) on delete cascade,
  status text default 'active' check (status in ('active', 'closed'))
);

alter table polls enable row level security;

create policy "public_read_polls" on polls
  for select using (true);

create policy "user_own_polls" on polls
  for insert with check (auth.uid() = user_id);

create policy "user_update_own_polls" on polls
  for update using (auth.uid() = user_id);

create policy "user_delete_own_polls" on polls
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: quizzes
-- ============================================================
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  user_email text,
  post_id uuid references community_posts(id) on delete cascade not null,
  question text not null,
  options jsonb not null,
  explanation text,
  total_answers int default 0,
  correct_answers int default 0,
  expires_at timestamptz,
  status text default 'active' check (status in ('active', 'closed'))
);

alter table quizzes enable row level security;

create policy "public_read_quizzes" on quizzes
  for select using (true);

create policy "user_own_quizzes" on quizzes
  for insert with check (auth.uid() = user_id);

create policy "user_update_own_quizzes" on quizzes
  for update using (auth.uid() = user_id);

create policy "user_delete_own_quizzes" on quizzes
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: groups
-- ============================================================
create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  owner_id uuid references profiles(id) on delete set null,
  owner_email text not null,
  name text not null,
  description text,
  cover_image text,
  avatar_image text,
  admins text[],
  members text[],
  members_count int default 0,
  privacy text default 'public' check (privacy in ('public', 'private', 'secret')),
  category text check (category in ('food', 'recipe', 'health', 'lifestyle', 'fitness', 'general')),
  rules text[],
  status text default 'active' check (status in ('active', 'archived'))
);

alter table groups enable row level security;

create policy "public_read_groups" on groups
  for select using (true);

create policy "user_create_groups" on groups
  for insert with check (auth.uid() = owner_id);

create policy "user_update_own_groups" on groups
  for update using (auth.uid() = owner_id);

create policy "user_delete_own_groups" on groups
  for delete using (auth.uid() = owner_id);


-- ============================================================
-- TABELA: post_reactions
-- ============================================================
create table if not exists post_reactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references community_posts(id) on delete cascade not null,
  user_email text not null,
  reaction text not null check (reaction in ('❤️', '😂', '😮', '😢', '👏', '🔥')),
  unique(post_id, user_id)
);

alter table post_reactions enable row level security;

create policy "public_read_post_reactions" on post_reactions
  for select using (true);

create policy "user_own_post_reactions" on post_reactions
  for insert with check (auth.uid() = user_id);

create policy "user_update_own_post_reactions" on post_reactions
  for update using (auth.uid() = user_id);

create policy "user_delete_own_post_reactions" on post_reactions
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: saved_posts
-- ============================================================
create table if not exists saved_posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references community_posts(id) on delete cascade not null,
  user_email text not null,
  collection text default 'Salvati',
  unique(user_id, post_id)
);

alter table saved_posts enable row level security;

create policy "user_own_saved_posts" on saved_posts
  for all using (auth.uid() = user_id);


-- ============================================================
-- TABELA: post_shares
-- ============================================================
create table if not exists post_shares (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete set null,
  sharer_email text not null,
  original_post_id uuid references community_posts(id) on delete cascade not null,
  share_type text not null check (share_type in ('repost', 'story_share', 'external', 'dm_share')),
  caption text,
  shared_to text
);

alter table post_shares enable row level security;

create policy "public_read_post_shares" on post_shares
  for select using (true);

create policy "user_create_post_shares" on post_shares
  for insert with check (auth.uid() = user_id);

create policy "user_delete_own_post_shares" on post_shares
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TABELA: post_reports
-- ============================================================
create table if not exists post_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  reporter_id uuid references profiles(id) on delete set null,
  reporter_email text not null,
  reported_post_id uuid references community_posts(id) on delete cascade not null,
  reported_user_email text,
  reason text not null check (reason in ('spam', 'inappropriate', 'hate_speech', 'violence', 'nudity', 'misinformation', 'other')),
  details text,
  status text default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  moderator_note text
);

alter table post_reports enable row level security;

create policy "user_create_post_reports" on post_reports
  for insert with check (auth.uid() = reporter_id);

create policy "admin_read_post_reports" on post_reports
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_update_post_reports" on post_reports
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: user_blocks
-- ============================================================
create table if not exists user_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_by text,
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  blocker_email text not null,
  blocked_email text not null,
  reason text,
  unique(blocker_id, blocked_id)
);

alter table user_blocks enable row level security;

create policy "user_own_user_blocks" on user_blocks
  for select using (auth.uid() = blocker_id);

create policy "user_create_user_blocks" on user_blocks
  for insert with check (auth.uid() = blocker_id);

create policy "user_delete_own_user_blocks" on user_blocks
  for delete using (auth.uid() = blocker_id);


-- ============================================================
-- TABELA: hashtags
-- ============================================================
create table if not exists hashtags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null unique,
  posts_count int default 0,
  is_trending boolean default false,
  category text check (category in ('food', 'recipe', 'lifestyle', 'health', 'fitness', 'general'))
);

alter table hashtags enable row level security;

create policy "public_read_hashtags" on hashtags
  for select using (true);

create policy "any_create_hashtags" on hashtags
  for insert with check (true);

create policy "admin_update_hashtags" on hashtags
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "admin_delete_hashtags" on hashtags
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: bad_words
-- ============================================================
create table if not exists bad_words (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  word text not null unique,
  severity text default 'block' check (severity in ('warning', 'block')),
  category text check (category in ('offensive', 'hate_speech', 'sexual', 'violence', 'other'))
);

alter table bad_words enable row level security;

create policy "public_read_bad_words" on bad_words
  for select using (true);

create policy "admin_write_bad_words" on bad_words
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: push_subscriptions
-- ============================================================
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete cascade,
  user_email text,
  endpoint text not null,
  p256dh text not null,
  auth text not null
);

alter table push_subscriptions enable row level security;

create policy "user_own_push_subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);


-- ============================================================
-- TABELA: daily_notifications
-- ============================================================
create table if not exists daily_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  date text not null unique,
  recipe_ids text[] not null,
  recipe_titles text[],
  occasions text[]
);

alter table daily_notifications enable row level security;

create policy "public_read_daily_notifications" on daily_notifications
  for select using (true);

create policy "admin_write_daily_notifications" on daily_notifications
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: email_templates
-- ============================================================
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  name text not null,
  subject text not null,
  body text not null,
  is_active boolean default true
);

alter table email_templates enable row level security;

create policy "admin_all_email_templates" on email_templates
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: webhook_logs
-- ============================================================
create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  timestamp text,
  source text not null,
  event_type text not null,
  status text not null check (status in ('success', 'error')),
  payload text,
  error_message text,
  user_email text,
  transaction_id text
);

alter table webhook_logs enable row level security;

create policy "admin_read_webhook_logs" on webhook_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: pending_premium
-- ============================================================
create table if not exists pending_premium (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  email text not null,
  product_id text not null,
  event_type text not null,
  raw_payload text,
  status text default 'pending' check (status in ('pending', 'applied'))
);

alter table pending_premium enable row level security;

create policy "any_insert_pending_premium" on pending_premium
  for insert with check (true);

create policy "admin_manage_pending_premium" on pending_premium
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: pending_purchases
-- ============================================================
create table if not exists pending_purchases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  email text not null,
  slug text not null,
  hotmart_product_id text not null,
  payload text,
  applied boolean default false
);

alter table pending_purchases enable row level security;

create policy "admin_all_pending_purchases" on pending_purchases
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: ebook_purchase_triggers
-- ============================================================
create table if not exists ebook_purchase_triggers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_email text not null,
  user_name text,
  hotmart_product_id text not null,
  hotmart_transaction_id text not null unique,
  purchase_status text check (purchase_status in ('approved', 'refunded', 'cancelled')),
  purchase_approved_at text,
  email_trigger_at text,
  followup_email_sent boolean default false
);

alter table ebook_purchase_triggers enable row level security;

create policy "admin_read_ebook_purchase_triggers" on ebook_purchase_triggers
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: app_analytics
-- ============================================================
create table if not exists app_analytics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  created_by text,
  user_id uuid references profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'session_start', 'session_end', 'recipe_view', 'recipe_saved',
    'recipe_scroll', 'occasion_click', 'pwa_install_click',
    'planner_created', 'premium_view', 'premium_click', 'premium_purchase',
    'login', 'utm_visit', 'recipe_search', 'recipe_view_start',
    'recipe_view_end', 'screen_load', 'ui_click', 'push_sent',
    'push_opened', 'push_recipe_open'
  )),
  user_email text,
  user_plan text check (user_plan in ('free', 'premium')),
  session_id text,
  session_duration_seconds numeric,
  recipe_id text,
  recipe_title text,
  scroll_percentage numeric,
  occasion_label text,
  source text,
  date text not null,
  duration_seconds numeric,
  load_time_ms numeric,
  results_count int,
  notification_id text
);

alter table app_analytics enable row level security;

create policy "user_insert_app_analytics" on app_analytics
  for insert with check (auth.uid() = user_id);

create policy "admin_read_app_analytics" on app_analytics
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: free_recipes
-- ============================================================
create table if not exists free_recipes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  recipe_title text
);

alter table free_recipes enable row level security;

create policy "public_read_free_recipes" on free_recipes
  for select using (true);

create policy "admin_write_free_recipes" on free_recipes
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- TABELA: planner_usage
-- ============================================================
create table if not exists planner_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid references profiles(id) on delete cascade,
  user_email text not null,
  plans_created int default 0,
  limit_reached boolean default false,
  unique(user_id)
);

alter table planner_usage enable row level security;

create policy "any_insert_planner_usage" on planner_usage
  for insert with check (true);

create policy "user_read_own_planner_usage" on planner_usage
  for select using (auth.uid() = user_id);

create policy "any_update_planner_usage" on planner_usage
  for update using (true);

create policy "admin_delete_planner_usage" on planner_usage
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );


-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_recipes_category on recipes(category);
create index if not exists idx_recipes_status on recipes(status);
create index if not exists idx_recipes_is_premium on recipes(is_premium);
create index if not exists idx_community_posts_user_id on community_posts(user_id);
create index if not exists idx_community_posts_status on community_posts(status);
create index if not exists idx_community_comments_post_id on community_comments(post_id);
create index if not exists idx_direct_messages_conversation_id on direct_messages(conversation_id);
create index if not exists idx_notifications_recipient_id on notifications(recipient_id);
create index if not exists idx_notifications_is_read on notifications(is_read);
create index if not exists idx_user_recipes_user_id on user_recipes(user_id);
create index if not exists idx_user_follows_follower_id on user_follows(follower_id);
create index if not exists idx_user_follows_following_id on user_follows(following_id);
create index if not exists idx_stories_status on stories(status);
create index if not exists idx_stories_expires_at on stories(expires_at);
create index if not exists idx_app_analytics_date on app_analytics(date);
create index if not exists idx_app_analytics_event_type on app_analytics(event_type);
create index if not exists idx_meal_plans_user_id on meal_plans(user_id);

-- ============================================================
-- FIM DA MIGRATION — 36 tabelas
-- ============================================================

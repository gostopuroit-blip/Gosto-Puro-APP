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
    async filter(filters = {}, sort = '-created_at', limit = 100) {
      let query = supabase.from(tableName).select('*');

      for (const [key, value] of Object.entries(filters)) {
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

      if (limit) query = query.limit(limit);

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
      const { data: result, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single();
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

export const base44 = {
  auth,
  integrations,
  entities: {
    AppAnalytics: createEntity('app_analytics'),
    AppConfig: createEntity('app_config'),
    BadWord: createEntity('bad_words'),
    CommunityComment: createEntity('community_comments'),
    CommunityPost: createEntity('community_posts'),
    DailyNotification: createEntity('daily_notifications'),
    DirectMessage: createEntity('direct_messages'),
    EbookPurchaseTrigger: createEntity('ebook_purchase_triggers'),
    EmailTemplate: createEntity('email_templates'),
    Folder: createEntity('folders'),
    FreeRecipe: createEntity('free_recipes'),
    GostoPuroProduct: createEntity('gosto_puro_products'),
    Group: createEntity('groups'),
    Hashtag: createEntity('hashtags'),
    MealPlan: createEntity('meal_plans'),
    Notification: createEntity('notifications'),
    PendingPremium: createEntity('pending_premium'),
    PendingPurchase: createEntity('pending_purchases'),
    PlannerUsage: createEntity('planner_usage'),
    Poll: createEntity('polls'),
    PostReaction: createEntity('post_reactions'),
    PostReport: createEntity('post_reports'),
    PostShare: createEntity('post_shares'),
    PushSubscription: createEntity('push_subscriptions'),
    Quiz: createEntity('quizzes'),
    Recipe: createEntity('recipes'),
    RecipeComment: createEntity('recipe_comments'),
    RecipeOccasion: createEntity('recipe_occasions'),
    SavedPost: createEntity('saved_posts'),
    ShoppingItem: createEntity('shopping_items'),
    Story: createEntity('stories'),
    User: createEntity('profiles'),
    UserBlock: createEntity('user_blocks'),
    UserFollow: createEntity('user_follows'),
    UserRecipe: createEntity('user_recipes'),
    WebhookLog: createEntity('webhook_logs'),
  },
};

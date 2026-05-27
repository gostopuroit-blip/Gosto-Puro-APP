-- ============================================================
-- CORREÇÃO: Todas as policies admin que causavam recursão infinita
-- na tabela profiles. Usa a função is_admin() com SECURITY DEFINER.
-- ============================================================

-- Garante que a função is_admin() existe
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- profiles
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL USING (is_admin());

-- app_config
DROP POLICY IF EXISTS "admin_all_app_config" ON app_config;
CREATE POLICY "admin_all_app_config" ON app_config FOR ALL USING (is_admin());

-- recipes
DROP POLICY IF EXISTS "admin_write_recipes" ON recipes;
CREATE POLICY "admin_write_recipes" ON recipes FOR ALL USING (is_admin());

-- recipe_occasions
DROP POLICY IF EXISTS "admin_write_recipe_occasions" ON recipe_occasions;
CREATE POLICY "admin_write_recipe_occasions" ON recipe_occasions FOR ALL USING (is_admin());

-- gosto_puro_products
DROP POLICY IF EXISTS "admin_write_gosto_puro_products" ON gosto_puro_products;
CREATE POLICY "admin_write_gosto_puro_products" ON gosto_puro_products FOR ALL USING (is_admin());

-- post_reports
DROP POLICY IF EXISTS "admin_read_post_reports" ON post_reports;
CREATE POLICY "admin_read_post_reports" ON post_reports FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "admin_update_post_reports" ON post_reports;
CREATE POLICY "admin_update_post_reports" ON post_reports FOR UPDATE USING (is_admin());

-- hashtags
DROP POLICY IF EXISTS "admin_update_hashtags" ON hashtags;
CREATE POLICY "admin_update_hashtags" ON hashtags FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "admin_delete_hashtags" ON hashtags;
CREATE POLICY "admin_delete_hashtags" ON hashtags FOR DELETE USING (is_admin());

-- bad_words
DROP POLICY IF EXISTS "admin_write_bad_words" ON bad_words;
CREATE POLICY "admin_write_bad_words" ON bad_words FOR ALL USING (is_admin());

-- daily_notifications
DROP POLICY IF EXISTS "admin_write_daily_notifications" ON daily_notifications;
CREATE POLICY "admin_write_daily_notifications" ON daily_notifications FOR ALL USING (is_admin());

-- email_templates
DROP POLICY IF EXISTS "admin_all_email_templates" ON email_templates;
CREATE POLICY "admin_all_email_templates" ON email_templates FOR ALL USING (is_admin());

-- webhook_logs
DROP POLICY IF EXISTS "admin_read_webhook_logs" ON webhook_logs;
CREATE POLICY "admin_read_webhook_logs" ON webhook_logs FOR SELECT USING (is_admin());

-- pending_premium
DROP POLICY IF EXISTS "admin_manage_pending_premium" ON pending_premium;
CREATE POLICY "admin_manage_pending_premium" ON pending_premium FOR ALL USING (is_admin());

-- pending_purchases
DROP POLICY IF EXISTS "admin_all_pending_purchases" ON pending_purchases;
CREATE POLICY "admin_all_pending_purchases" ON pending_purchases FOR ALL USING (is_admin());

-- ebook_purchase_triggers
DROP POLICY IF EXISTS "admin_read_ebook_purchase_triggers" ON ebook_purchase_triggers;
CREATE POLICY "admin_read_ebook_purchase_triggers" ON ebook_purchase_triggers FOR SELECT USING (is_admin());

-- app_analytics
DROP POLICY IF EXISTS "admin_read_app_analytics" ON app_analytics;
CREATE POLICY "admin_read_app_analytics" ON app_analytics FOR SELECT USING (is_admin());

-- free_recipes
DROP POLICY IF EXISTS "admin_write_free_recipes" ON free_recipes;
CREATE POLICY "admin_write_free_recipes" ON free_recipes FOR ALL USING (is_admin());

-- planner_usage
DROP POLICY IF EXISTS "admin_delete_planner_usage" ON planner_usage;
CREATE POLICY "admin_delete_planner_usage" ON planner_usage FOR DELETE USING (is_admin());

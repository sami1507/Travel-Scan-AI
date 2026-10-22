-- Atomic usage counter increment (fixes free-tier cap bypass under concurrent requests)
-- and RLS for subscription_plans (reference data, was the only unprotected table
-- in the subscription system migration).

CREATE OR REPLACE FUNCTION increment_analysis_usage(p_user_id UUID, p_month TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO usage_tracking (user_id, month, analyses_count, updated_at)
  VALUES (p_user_id, p_month, 1, NOW())
  ON CONFLICT (user_id, month)
  DO UPDATE SET analyses_count = usage_tracking.analyses_count + 1, updated_at = NOW();
$$;

GRANT EXECUTE ON FUNCTION increment_analysis_usage(UUID, TEXT) TO authenticated, service_role;

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

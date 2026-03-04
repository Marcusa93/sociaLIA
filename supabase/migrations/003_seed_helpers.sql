-- Function to insert a profile after user signup (used by auth trigger)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get the default org or create one if needed
  SELECT id INTO org_id FROM organizations LIMIT 1;

  IF org_id IS NULL THEN
    INSERT INTO organizations (name, slug)
    VALUES ('Default Organization', 'default')
    RETURNING id INTO org_id;
  END IF;

  INSERT INTO profiles (user_id, organization_id, role, full_name)
  VALUES (
    NEW.id,
    org_id,
    'admin',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get monthly interactions for a platform
CREATE OR REPLACE FUNCTION get_monthly_interactions(
  p_org_id UUID,
  p_platform TEXT DEFAULT NULL,
  p_months INT DEFAULT 12
)
RETURNS TABLE(
  month DATE,
  platform TEXT,
  total_interactions NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    DATE_TRUNC('month', posted_at)::DATE as month,
    p.platform,
    SUM(pm.likes + pm.comments + pm.views * 0.1) as total_interactions
  FROM posts p
  JOIN post_metrics pm ON pm.post_id = p.id
  WHERE p.org_id = p_org_id
    AND (p_platform IS NULL OR p.platform = p_platform)
    AND p.posted_at >= NOW() - (p_months || ' months')::INTERVAL
  GROUP BY 1, 2
  ORDER BY 1, 2;
$$;

-- Function to get top accounts by interactions
CREATE OR REPLACE FUNCTION get_top_accounts(
  p_org_id UUID,
  p_platform TEXT DEFAULT NULL,
  p_limit INT DEFAULT 5
)
RETURNS TABLE(
  account_id UUID,
  handle TEXT,
  display_name TEXT,
  platform TEXT,
  activation_score NUMERIC,
  typology TEXT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    a.id as account_id,
    a.handle,
    a.display_name,
    a.platform,
    COALESCE(amf.activation_score, 0) as activation_score,
    amf.typology
  FROM accounts a
  LEFT JOIN account_month_features amf ON amf.account_id = a.id
    AND amf.month = DATE_TRUNC('month', NOW())::DATE
  WHERE a.org_id = p_org_id
    AND (p_platform IS NULL OR a.platform = p_platform)
  ORDER BY activation_score DESC
  LIMIT p_limit;
$$;

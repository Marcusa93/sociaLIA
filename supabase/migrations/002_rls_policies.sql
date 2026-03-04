-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_month_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecosystem_month_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's org_id
CREATE OR REPLACE FUNCTION auth_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Organizations: users can see their own org
CREATE POLICY "org_select" ON organizations
  FOR SELECT USING (id = auth_org_id());

-- Profiles: users can see profiles in their org
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Accounts: full CRUD within org
CREATE POLICY "accounts_select" ON accounts
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE USING (org_id = auth_org_id());

CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE USING (org_id = auth_org_id());

-- Posts: read only via UI (writes via service role)
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (org_id = auth_org_id());

-- Post metrics: read only
CREATE POLICY "post_metrics_select" ON post_metrics
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "post_metrics_insert" ON post_metrics
  FOR INSERT WITH CHECK (org_id = auth_org_id());

-- Account month features: read/write within org
CREATE POLICY "amf_select" ON account_month_features
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "amf_insert" ON account_month_features
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "amf_update" ON account_month_features
  FOR UPDATE USING (org_id = auth_org_id());

-- Ecosystem summary: read only
CREATE POLICY "ems_select" ON ecosystem_month_summary
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "ems_insert" ON ecosystem_month_summary
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "ems_update" ON ecosystem_month_summary
  FOR UPDATE USING (org_id = auth_org_id());

-- Jobs: full CRUD within org
CREATE POLICY "jobs_select" ON jobs
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "jobs_insert" ON jobs
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "jobs_update" ON jobs
  FOR UPDATE USING (org_id = auth_org_id());

-- Reports: full CRUD within org
CREATE POLICY "reports_select" ON reports
  FOR SELECT USING (org_id = auth_org_id());

CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (org_id = auth_org_id());

CREATE POLICY "reports_update" ON reports
  FOR UPDATE USING (org_id = auth_org_id());

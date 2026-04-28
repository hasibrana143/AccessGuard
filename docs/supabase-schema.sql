-- ============================================
-- AccessGuard Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- Organizations (multi-tenant)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'FREE',
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- Users - Aligned with Supabase Auth
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'USER',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Organization Members (many-to-many user-organization with role)
CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- Projects (Websites to scan)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    crawl_config JSONB DEFAULT '{"maxPages":100,"excludePaths":[],"includeSubdomains":false}',
    last_scan_at TIMESTAMPTZ,
    risk_score INTEGER,
    next_scheduled_scan TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_url ON projects(url);

-- Scans
CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    pages_scanned INTEGER DEFAULT 0,
    violations_found INTEGER DEFAULT 0,
    score INTEGER,
    summary JSONB,
    error_message TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scans_project ON scans(project_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at);

-- Violations (Core data)
CREATE TABLE IF NOT EXISTS violations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    wcag_criteria TEXT,
    severity TEXT NOT NULL,
    url TEXT NOT NULL,
    element_selector TEXT,
    element_html TEXT,
    description TEXT NOT NULL,
    remediation_code TEXT,
    ai_explanation TEXT,
    ai_confidence_score FLOAT,
    status TEXT DEFAULT 'OPEN',
    github_pr_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fixed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_violations_scan ON violations(scan_id);
CREATE INDEX IF NOT EXISTS idx_violations_project ON violations(project_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(severity);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);

-- GitHub Connections
CREATE TABLE IF NOT EXISTS github_connections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    installation_id TEXT UNIQUE NOT NULL,
    repositories JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_org ON github_connections(organization_id);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    date_range_start TIMESTAMPTZ NOT NULL,
    date_range_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);

-- Audit Logs (for legal compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- WCAG Rules Reference (pre-populated)
CREATE TABLE IF NOT EXISTS wcag_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    wcag_criteria TEXT NOT NULL,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    how_to_fix TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wcag_rules_rule ON wcag_rules(rule_id);
CREATE INDEX IF NOT EXISTS idx_wcag_criteria ON wcag_rules(wcag_criteria);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wcag_rules ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Organization members can read organizations they belong to
CREATE POLICY "Members can read organizations" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()::text
        )
    );

-- Organization owners can update organizations
CREATE POLICY "Owners can update organizations" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()::text AND role = 'OWNER'
        )
    );

-- Anyone can insert organizations (for creation)
CREATE POLICY "Anyone can insert organizations" ON organizations
    FOR INSERT WITH CHECK (true);

-- Organization members can read membership info
CREATE POLICY "Members can read memberships" ON organization_members
    FOR SELECT USING (user_id = auth.uid()::text);

-- Users can insert memberships for themselves
CREATE POLICY "Users can join organizations" ON organization_members
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Projects are readable by organization members
CREATE POLICY "Members can read projects" ON projects
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()::text
        )
    );

-- Projects can be inserted by organization members
CREATE POLICY "Members can insert projects" ON projects
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()::text
        )
    );

-- Scans are readable by organization members
CREATE POLICY "Members can read scans" ON scans
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()::text
        )
    );

-- Violations are readable by organization members
CREATE POLICY "Members can read violations" ON violations
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()::text
        )
    );

-- Violations can be updated by organization members
CREATE POLICY "Members can update violations" ON violations
    FOR UPDATE USING (
        project_id IN (
            SELECT p.id FROM projects p
            JOIN organization_members om ON om.organization_id = p.organization_id
            WHERE om.user_id = auth.uid()::text
        )
    );

-- Reports are readable by organization members
CREATE POLICY "Members can read reports" ON reports
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()::text
        )
    );

-- Audit logs readable by organization members
CREATE POLICY "Members can read audit logs" ON audit_logs
    FOR SELECT USING (
        org_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()::text
        )
    );

-- WCAG rules are readable by everyone
CREATE POLICY "Anyone can read wcag rules" ON wcag_rules
    FOR SELECT USING (true);

-- GitHub connections readable by organization members
CREATE POLICY "Members can read github connections" ON github_connections
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid()::text
        )
    );

-- Fix RLS for development - Safe version
-- Run this in Supabase SQL Editor

-- Fix users table
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Anyone can insert user profile" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Anyone can update users" ON users;

CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON users FOR UPDATE USING (true);

-- Fix organizations table
DROP POLICY IF EXISTS "Members can read organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;
DROP POLICY IF EXISTS "Anyone can insert organizations" ON organizations;
DROP POLICY IF EXISTS "Anyone can read organizations" ON organizations;
DROP POLICY IF EXISTS "Anyone can update organizations" ON organizations;

CREATE POLICY "Anyone can read organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert organizations" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update organizations" ON organizations FOR UPDATE USING (true);

-- Fix organization_members table
DROP POLICY IF EXISTS "Members can read memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can join organizations" ON organization_members;
DROP POLICY IF EXISTS "Anyone can read org members" ON organization_members;
DROP POLICY IF EXISTS "Anyone can insert org members" ON organization_members;

CREATE POLICY "Anyone can read org members" ON organization_members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert org members" ON organization_members FOR INSERT WITH CHECK (true);

-- Fix projects table
DROP POLICY IF EXISTS "Members can read projects" ON projects;
DROP POLICY IF EXISTS "Members can insert projects" ON projects;
DROP POLICY IF EXISTS "Anyone can read projects" ON projects;
DROP POLICY IF EXISTS "Anyone can insert projects" ON projects;

CREATE POLICY "Anyone can read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert projects" ON projects FOR INSERT WITH CHECK (true);

-- Fix scans table
DROP POLICY IF EXISTS "Members can read scans" ON scans;
DROP POLICY IF EXISTS "Anyone can read scans" ON scans;
DROP POLICY IF EXISTS "Anyone can insert scans" ON scans;

CREATE POLICY "Anyone can read scans" ON scans FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scans" ON scans FOR INSERT WITH CHECK (true);

-- Fix violations table
DROP POLICY IF EXISTS "Members can read violations" ON violations;
DROP POLICY IF EXISTS "Members can update violations" ON violations;
DROP POLICY IF EXISTS "Anyone can read violations" ON violations;
DROP POLICY IF EXISTS "Anyone can insert violations" ON violations;
DROP POLICY IF EXISTS "Anyone can update violations" ON violations;

CREATE POLICY "Anyone can read violations" ON violations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert violations" ON violations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update violations" ON violations FOR UPDATE USING (true);

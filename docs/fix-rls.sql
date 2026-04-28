-- Fix: Allow service role to insert user profiles
-- Run this in Supabase SQL Editor

-- First, let's allow the anon key to insert users (for registration)
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create a more permissive policy for inserts during registration
CREATE POLICY "Anyone can insert user profile" ON users
    FOR INSERT WITH CHECK (true);

-- Also allow the service role to manage all tables
-- This is needed for server-side operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

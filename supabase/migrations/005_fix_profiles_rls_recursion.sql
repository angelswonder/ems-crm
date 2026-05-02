-- Migration 005: Fix RLS recursion for profiles by using a helper function

-- Create a helper function that returns the current user's org_id using SECURITY DEFINER.
-- This avoids selecting from profiles inside the profiles RLS policy itself.
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_org_id() TO authenticated;

-- Replace the profiles SELECT policy with a version that uses the helper.
DROP POLICY IF EXISTS "Users can view own profile or org profiles" ON profiles;
CREATE POLICY "Users can view own profile or org profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR (org_id IS NOT NULL AND org_id = get_current_user_org_id())
  );

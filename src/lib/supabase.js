// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// These will be set via environment variables
// For Vercel: Add these in your project settings
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client (will be null if not configured)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase;

// Auth helpers
export const signInWithDiscord = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email, password) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email, password) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

// Layout CRUD operations
export const saveLayout = async (userId, layoutData) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('layouts')
    .upsert({
      user_id: userId,
      layout_data: layoutData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const loadLayout = async (userId) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('layouts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
};

// Public layout sharing (for OBS overlay)
export const getPublicLayout = async (shareToken) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('layouts')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_public', true)
    .single();

  if (error) return null;
  return data;
};

export const generateShareToken = async (userId) => {
  if (!supabase) throw new Error('Supabase not configured');

  // Generate a random token
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  const { data, error } = await supabase
    .from('layouts')
    .update({
      share_token: token,
      is_public: true
    })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data.share_token;
};

export const revokeShareToken = async (userId) => {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('layouts')
    .update({
      share_token: null,
      is_public: false
    })
    .eq('user_id', userId);

  if (error) throw error;
};

/*
  Supabase SQL Schema (run this in your Supabase SQL editor):

  -- Create layouts table
  CREATE TABLE layouts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    layout_data JSONB NOT NULL DEFAULT '{}',
    share_token TEXT UNIQUE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

  -- Policy: Users can read their own layouts
  CREATE POLICY "Users can read own layouts" ON layouts
    FOR SELECT USING (auth.uid() = user_id);

  -- Policy: Users can insert their own layouts
  CREATE POLICY "Users can insert own layouts" ON layouts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  -- Policy: Users can update their own layouts
  CREATE POLICY "Users can update own layouts" ON layouts
    FOR UPDATE USING (auth.uid() = user_id);

  -- Policy: Anyone can read public layouts by share_token
  CREATE POLICY "Anyone can read public layouts" ON layouts
    FOR SELECT USING (is_public = true AND share_token IS NOT NULL);

  -- Create index for faster share_token lookups
  CREATE INDEX idx_layouts_share_token ON layouts(share_token) WHERE share_token IS NOT NULL;
*/

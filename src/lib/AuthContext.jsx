// src/lib/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, loadLayout, saveLayout } from './supabase.js';
import { useStore } from './store.jsx';
import { STORAGE_KEY } from './constants.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserLayout(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserLayout(session.user.id);
        }

        if (event === 'SIGNED_OUT') {
          // Clear to localStorage state on sign out
          // but don't clear localStorage itself
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Load layout from cloud
  const loadUserLayout = async (userId) => {
    try {
      setSyncing(true);
      const layoutRow = await loadLayout(userId);

      if (layoutRow?.layout_data) {
        const data = layoutRow.layout_data;
        // Merge cloud data into store
        useStore.setState({
          keyData: data.keyData || {},
          device: data.device || 'cyro',
          gameTitle: data.gameTitle || 'Untitled',
          title: data.gameTitle || 'Untitled',
          themeId: data.themeId || null,
          randomPalette: data.randomPalette || null,
          zones: data.zones || {},
          analogNames: data.analogNames || { up: 'W', left: 'A', down: 'S', right: 'D' },
          showNumbers: data.showNumbers ?? true,
          showGloss: data.showGloss ?? true,
          showLegend: data.showLegend ?? true,
          lock: data.lock ?? true,
          grid: data.grid ?? true,
          invert: data.invert ?? false,
          snap: data.snap ?? true,
          hasUnsavedChanges: false
        });
      }
    } catch (err) {
      console.error('Failed to load cloud layout:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Save layout to cloud
  const saveUserLayout = async () => {
    if (!user) return;

    try {
      setSyncing(true);
      const state = useStore.getState();
      const layoutData = {
        keyData: state.keyData,
        device: state.device,
        gameTitle: state.gameTitle,
        themeId: state.themeId,
        randomPalette: state.randomPalette,
        zones: state.zones,
        analogNames: state.analogNames,
        showNumbers: state.showNumbers,
        showGloss: state.showGloss,
        showLegend: state.showLegend,
        lock: state.lock,
        grid: state.grid,
        invert: state.invert,
        snap: state.snap
      };

      await saveLayout(user.id, layoutData);
      useStore.setState({ hasUnsavedChanges: false });
    } catch (err) {
      console.error('Failed to save to cloud:', err);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  const value = {
    user,
    loading,
    syncing,
    isConfigured: isSupabaseConfigured(),
    loadUserLayout: user ? () => loadUserLayout(user.id) : null,
    saveUserLayout: user ? saveUserLayout : null
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

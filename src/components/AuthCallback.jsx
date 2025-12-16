// src/components/AuthCallback.jsx
// Handles OAuth callback redirects
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setError('Supabase not configured');
      return;
    }

    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;

        // Redirect to main app
        navigate('/', { replace: true });
      } catch (err) {
        setError(err.message);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0d12',
        color: '#ff6b6b'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Authentication Error</h2>
          <p>{error}</p>
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#2b305c',
              border: '1px solid rgba(138,107,255,0.35)',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b0d12',
      color: '#e9efff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Signing you in...</h2>
        <p>Please wait while we complete authentication.</p>
      </div>
    </div>
  );
}

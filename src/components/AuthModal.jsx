// src/components/AuthModal.jsx
import React, { useState } from 'react';
import {
  signInWithDiscord,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  isSupabaseConfigured
} from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';

export default function AuthModal({ isOpen, onClose }) {
  const { user, syncing, saveUserLayout } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleDiscordLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithDiscord();
      // Will redirect to Discord
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        onClose();
      } else {
        await signUpWithEmail(email, password);
        setSuccess('Check your email to confirm your account!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSave = async () => {
    try {
      setError('');
      await saveUserLayout();
      setSuccess('Layout saved to cloud!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // If logged in, show account info
  if (user) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>&times;</button>

          <h2 style={{ marginBottom: 16 }}>Account</h2>

          <div className="auth-user-info">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="auth-avatar"
              />
            )}
            <div>
              <div className="auth-username">
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email}
              </div>
              <div className="auth-email muted">{user.email}</div>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <div className="auth-actions">
            <button
              className="btn"
              onClick={handleSave}
              disabled={syncing}
              style={{ width: '100%', marginBottom: 8 }}
            >
              {syncing ? 'Saving...' : 'Save Layout to Cloud'}
            </button>

            <button
              className="btn"
              onClick={handleSignOut}
              style={{ width: '100%', background: 'rgba(255,100,100,0.2)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login/Register form
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>

        <h2 style={{ marginBottom: 16 }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        {!isSupabaseConfigured() && (
          <div className="auth-warning">
            Cloud sync is not configured. Add Supabase credentials to enable.
          </div>
        )}

        {/* Discord OAuth */}
        <button
          className="btn auth-discord-btn"
          onClick={handleDiscordLogin}
          disabled={loading || !isSupabaseConfigured()}
          style={{ width: '100%', marginBottom: 16 }}
        >
          <DiscordIcon />
          Continue with Discord
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmailSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={!isSupabaseConfigured()}
            />
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              disabled={!isSupabaseConfigured()}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button
            type="submit"
            className="btn"
            disabled={loading || !isSupabaseConfigured()}
            style={{ width: '100%', marginBottom: 12 }}
          >
            {loading ? 'Loading...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button className="link-btn" onClick={() => setMode('register')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="link-btn" onClick={() => setMode('login')}>
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8 }}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}

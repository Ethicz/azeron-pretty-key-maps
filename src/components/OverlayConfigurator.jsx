// src/components/OverlayConfigurator.jsx
// Configure and generate OBS overlay URLs
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../lib/store.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { generateShareToken, revokeShareToken, isSupabaseConfigured } from '../lib/supabase.js';
import { THEMES } from '../lib/themes.js';

export default function OverlayConfigurator({ onClose }) {
  const { user, saveUserLayout } = useAuth();
  const s = useStore();

  const [shareToken, setShareToken] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Overlay settings
  const [settings, setSettings] = useState({
    scale: 1,
    showNumbers: true,
    showGloss: true,
    showAnalog: true,
    showBg: false,
    theme: '',
    offsetX: 0,
    offsetY: 0,
    analogX: '',
    analogY: ''
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Generate share token for cloud-based sharing
  const handleGenerateToken = async () => {
    if (!user) return;

    try {
      setGenerating(true);
      setError('');

      // First save the current layout
      await saveUserLayout();

      // Then generate the share token
      const token = await generateShareToken(user.id);
      setShareToken(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeToken = async () => {
    if (!user) return;

    try {
      setGenerating(true);
      await revokeShareToken(user.id);
      setShareToken(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Generate local URL (encodes layout in URL - works without account)
  const generateLocalUrl = () => {
    const layoutData = {
      keyData: s.keyData,
      device: s.device,
      themeId: s.themeId,
      randomPalette: s.randomPalette,
      analogNames: s.analogNames
    };
    return btoa(JSON.stringify(layoutData));
  };

  // Build the overlay URL
  const overlayUrl = useMemo(() => {
    const base = `${window.location.origin}/overlay`;
    const params = new URLSearchParams();

    // Source: prefer share token, fall back to encoded layout
    if (shareToken) {
      params.set('token', shareToken);
    } else {
      // For local use, we'll use the encoded layout
      // But it's too long for a URL, so recommend cloud sync
    }

    // Settings
    if (settings.scale !== 1) params.set('scale', settings.scale.toString());
    if (!settings.showNumbers) params.set('numbers', 'false');
    if (!settings.showGloss) params.set('gloss', 'false');
    if (!settings.showAnalog) params.set('analog', 'false');
    if (settings.showBg) params.set('bg', 'true');
    if (settings.theme) params.set('theme', settings.theme);
    if (settings.offsetX) params.set('offsetX', settings.offsetX.toString());
    if (settings.offsetY) params.set('offsetY', settings.offsetY.toString());
    if (settings.analogX) params.set('analogX', settings.analogX.toString());
    if (settings.analogY) params.set('analogY', settings.analogY.toString());

    const queryString = params.toString();
    return queryString ? `${base}?${queryString}` : base;
  }, [shareToken, settings]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = overlayUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenPreview = () => {
    // Open with bg=true for preview
    const previewUrl = overlayUrl.includes('?')
      ? `${overlayUrl}&bg=true`
      : `${overlayUrl}?bg=true`;
    window.open(previewUrl, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 600, width: '95%' }}
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>&times;</button>

        <h2 style={{ marginBottom: 16 }}>OBS Overlay Setup</h2>

        <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
          Generate a URL to use as a Browser Source in OBS. The overlay shows your keypad with live key press feedback.
        </p>

        {/* Share Token Section */}
        <div className="configurator-section">
          <h3>Cloud Sharing</h3>

          {!isSupabaseConfigured() ? (
            <div className="auth-warning">
              Cloud sync not configured. Set up Supabase to enable cloud sharing.
            </div>
          ) : !user ? (
            <div className="auth-warning">
              Sign in to enable cloud sharing. This creates a short, shareable URL.
            </div>
          ) : (
            <>
              {shareToken ? (
                <div style={{ marginBottom: 12 }}>
                  <div className="auth-success" style={{ marginBottom: 8 }}>
                    Share token active! Your overlay URL is ready.
                  </div>
                  <button
                    className="btn"
                    onClick={handleRevokeToken}
                    disabled={generating}
                    style={{ background: 'rgba(255,100,100,0.2)' }}
                  >
                    Revoke Token
                  </button>
                </div>
              ) : (
                <button
                  className="btn"
                  onClick={handleGenerateToken}
                  disabled={generating}
                  style={{ marginBottom: 12 }}
                >
                  {generating ? 'Generating...' : 'Generate Share Token'}
                </button>
              )}
            </>
          )}

          {error && <div className="auth-error">{error}</div>}
        </div>

        {/* Display Settings */}
        <div className="configurator-section">
          <h3>Display Settings</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Scale</label>
              <input
                type="range"
                min="0.3"
                max="2"
                step="0.1"
                value={settings.scale}
                onChange={e => updateSetting('scale', parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <span className="muted" style={{ fontSize: 12 }}>{settings.scale.toFixed(1)}x</span>
            </div>

            <div className="field">
              <label>Theme Override</label>
              <select
                className="input"
                value={settings.theme}
                onChange={e => updateSetting('theme', e.target.value)}
              >
                <option value="">Use saved theme</option>
                {(THEMES || []).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={settings.showNumbers}
                  onChange={e => updateSetting('showNumbers', e.target.checked)}
                />
                Show Key Numbers
              </label>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={settings.showGloss}
                  onChange={e => updateSetting('showGloss', e.target.checked)}
                />
                Show Gloss Effect
              </label>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={settings.showAnalog}
                  onChange={e => updateSetting('showAnalog', e.target.checked)}
                />
                Show Analog Stick
              </label>
            </div>

            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={settings.showBg}
                  onChange={e => updateSetting('showBg', e.target.checked)}
                />
                Show Background (testing)
              </label>
            </div>
          </div>
        </div>

        {/* Position Offsets */}
        <div className="configurator-section">
          <h3>Position Adjustments</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Global Offset X</label>
              <input
                type="number"
                className="input"
                value={settings.offsetX}
                onChange={e => updateSetting('offsetX', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="field">
              <label>Global Offset Y</label>
              <input
                type="number"
                className="input"
                value={settings.offsetY}
                onChange={e => updateSetting('offsetY', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="field">
              <label>Analog X Override</label>
              <input
                type="number"
                className="input"
                placeholder="Auto"
                value={settings.analogX}
                onChange={e => updateSetting('analogX', e.target.value)}
              />
            </div>

            <div className="field">
              <label>Analog Y Override</label>
              <input
                type="number"
                className="input"
                placeholder="Auto"
                value={settings.analogY}
                onChange={e => updateSetting('analogY', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Generated URL */}
        <div className="configurator-section">
          <h3>Overlay URL</h3>

          {!shareToken && user && (
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Generate a share token above to get a short URL. Otherwise, the URL will use locally saved data.
            </p>
          )}

          <div className="url-display">
            {overlayUrl}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleCopyUrl} style={{ flex: 1 }}>
              {copied ? 'Copied!' : 'Copy URL'}
            </button>
            <button className="btn" onClick={handleOpenPreview}>
              Preview
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="configurator-section" style={{ marginBottom: 0 }}>
          <h3>OBS Setup Instructions</h3>
          <ol className="muted" style={{ fontSize: 13, paddingLeft: 20, margin: 0 }}>
            <li>In OBS, add a new "Browser" source</li>
            <li>Paste the URL above</li>
            <li>Set width/height to match your layout (start with 1920x1080)</li>
            <li>The background is transparent - keys will overlay your game</li>
            <li>Position and resize as needed in OBS</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

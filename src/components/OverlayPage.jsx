// src/components/OverlayPage.jsx
// OBS-ready transparent overlay for displaying keypad with live key feedback
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useStore } from '../lib/store.jsx';
import { currentLayout } from '../layouts/index.js';
import { THEMES } from '../lib/themes.js';
import { getPublicLayout } from '../lib/supabase.js';
import AnalogStick from './widgets/AnalogStick.jsx';
import {
  DEFAULT_RAINBOW,
  PLACEHOLDERS,
  ANALOG_W,
  ANALOG_H,
  DEFAULT_KEY_W as DEF_W,
  DEFAULT_KEY_H as DEF_H,
  AVG_CHAR_WIDTH as AVG_CHAR
} from '../lib/constants.js';

// Parse URL params
function useOverlayParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    // Layout source
    token: params.get('token') || params.get('t'),          // Share token for cloud layout
    layout: params.get('layout'),                            // Base64 encoded layout data

    // Display options
    theme: params.get('theme'),                              // Theme ID override
    scale: parseFloat(params.get('scale')) || 1,             // Scale factor (0.5 - 2)
    compact: params.get('compact') === 'true',               // Compact mode
    showAnalog: params.get('analog') !== 'false',            // Show analog stick (default true)
    showNumbers: params.get('numbers') !== 'false',          // Show key numbers (default true)
    showGloss: params.get('gloss') !== 'false',              // Show gloss effect (default true)

    // Positioning
    analogX: parseInt(params.get('analogX')) || null,        // Override analog X position
    analogY: parseInt(params.get('analogY')) || null,        // Override analog Y position
    offsetX: parseInt(params.get('offsetX')) || 0,           // Global X offset
    offsetY: parseInt(params.get('offsetY')) || 0,           // Global Y offset

    // Background (for testing - OBS will use transparent)
    bg: params.get('bg') === 'true',                         // Show background (for testing)

    // Device
    device: params.get('device') || 'cyro'                   // Device layout
  };
}

// Label layout helpers (same as BoardCanvas)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const capacityFor = (px, fontPx) => Math.max(1, Math.floor(px / (AVG_CHAR * fontPx)));

function layoutLabelSingle(availPx, text) {
  const len = Math.max(1, String(text).length);
  const size = clamp(Math.floor(availPx / (AVG_CHAR * len + 2)), 10, 16);
  return { mode: 'one', fontSize: size, text: String(text) };
}

function splitTwoLines(words, cap) {
  const line1 = [];
  for (const w of words) {
    const next = (line1.join(' ').length + (line1.length ? 1 : 0) + w.length);
    if (next <= cap) line1.push(w);
    else break;
  }
  const line2 = words.slice(line1.length);
  return [line1.join(' '), line2.join(' ')];
}

function layoutLabelTwoLine(availPx, text) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return null;

  let font = 14;
  let cap = capacityFor(availPx, font);
  let [l1, l2] = splitTwoLines(words, cap);

  const maxWord = Math.max(...words.map(w => w.length), 0);

  while ((l1.length > cap || l2.length > cap || maxWord > cap) && font > 10) {
    font -= 1;
    cap = capacityFor(availPx, font);
    [l1, l2] = splitTwoLines(words, cap);
  }

  if (maxWord > cap) return null;

  return { mode: 'two', fontSize: font, line1: l1, line2: l2 };
}

function chooseLabelLayout(availPx, text) {
  const one = layoutLabelSingle(availPx, text);
  if (one.fontSize >= 12) return one;
  const two = layoutLabelTwoLine(availPx, text);
  return two || one;
}

function themePalette(themeId) {
  if (!themeId) return null;
  const t = (THEMES || []).find(t => t.id === themeId);
  if (!t?.keys) return null;
  return t.keys.split(',').map(s => s.trim());
}

export default function OverlayPage() {
  const params = useOverlayParams();
  const [layoutData, setLayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const s = useStore();
  const pressedKeys = s.pressedKeys || new Set();

  // Load layout from token or encoded data
  useEffect(() => {
    async function loadLayout() {
      setLoading(true);
      setError(null);

      try {
        if (params.token) {
          // Load from Supabase via share token
          const data = await getPublicLayout(params.token);
          if (data?.layout_data) {
            setLayoutData(data.layout_data);
          } else {
            setError('Layout not found');
          }
        } else if (params.layout) {
          // Decode from URL param
          try {
            const decoded = JSON.parse(atob(params.layout));
            setLayoutData(decoded);
          } catch {
            setError('Invalid layout data');
          }
        } else {
          // Use current localStorage data
          const saved = localStorage.getItem('azeron-keymap-autosave');
          if (saved) {
            setLayoutData(JSON.parse(saved));
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadLayout();
  }, [params.token, params.layout]);

  // Get base layout
  const device = layoutData?.device || params.device;
  const def = useMemo(() => {
    try { return currentLayout?.(device) || {}; } catch { return {}; }
  }, [device]);

  const baseKeys = useMemo(() => {
    const arr = Array.isArray(def?.keys) ? def.keys : [];
    return arr.map((k, idx) => ({
      id: k?.id ?? idx + 1,
      num: Number.isFinite(Number(k?.num ?? k?.id)) ? Number(k?.num ?? k?.id) : null,
      x: Number(k?.x ?? 0), y: Number(k?.y ?? 0),
      w: Number(k?.w ?? DEF_W), h: Number(k?.h ?? DEF_H),
      analog: !!k?.analog, blank: !!k?.blank, split: !!k?.split,
      label: k?.label || '', subtitle: k?.subtitle || '',
      color: k?.color || null, zone: k?.zone || '',
      imageUrl: k?.imageUrl || '', imageMode: k?.imageMode || 'cover',
      emoji: k?.emoji || '', icon: k?.icon || '',
      iconColor: k?.iconColor || '#ffffff',
      iconSize: Number.isFinite(k?.iconSize) ? Number(k.iconSize) : 28,
      keyBinding: k?.keyBinding || ''
    }));
  }, [def]);

  // Merge with overlay data
  const keyData = layoutData?.keyData || {};
  const themeId = params.theme || layoutData?.themeId;
  const randomPalette = layoutData?.randomPalette;
  const analogNames = layoutData?.analogNames || { up: 'W', left: 'A', down: 'S', right: 'D' };

  const merged = useMemo(() => {
    const palTheme = themePalette(themeId);
    const pal = (randomPalette?.length ? randomPalette : (palTheme || DEFAULT_RAINBOW));

    return baseKeys.map((k, idx) => {
      const o = keyData[k.id] || {};
      const iconSizeMerged = Number(o.iconSize ?? k.iconSize ?? 28);

      let label = o.label ?? k.label ?? '';
      let subtitle = o.subtitle ?? k.subtitle ?? '';

      let color = o.color || k.color || pal[idx % pal.length];

      return {
        ...k,
        ...o,
        x: o.x ?? k.x,
        y: o.y ?? k.y,
        w: o.w ?? k.w,
        h: o.h ?? k.h,
        label,
        subtitle,
        color,
        zone: (o.zone ?? k.zone ?? ''),
        imageUrl: (o.imageUrl ?? k.imageUrl ?? ''),
        imageMode: (o.imageMode ?? k.imageMode ?? 'cover'),
        emoji: (o.emoji ?? k.emoji ?? ''),
        icon: (o.icon ?? k.icon ?? ''),
        iconColor: (o.iconColor ?? k.iconColor ?? '#ffffff'),
        iconSize: Number.isFinite(iconSizeMerged) ? iconSizeMerged : 28,
        keyBinding: (o.keyBinding ?? k.keyBinding ?? ''),
        split: !!(o.split ?? k.split),
        idx
      };
    });
  }, [baseKeys, keyData, themeId, randomPalette]);

  // Calculate bounds
  const bounds = useMemo(() => {
    const items = merged.filter(k => !k.blank);
    if (!items.length) return { x: 0, y: 0, w: 800, h: 600 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k of items) {
      const w = k.analog ? ANALOG_W : k.w;
      const h = k.analog ? ANALOG_H : k.h;
      minX = Math.min(minX, k.x);
      minY = Math.min(minY, k.y);
      maxX = Math.max(maxX, k.x + w);
      maxY = Math.max(maxY, k.y + h);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [merged]);

  // Check if key is pressed
  const isKeyPressed = useCallback((k) => {
    if (!pressedKeys || pressedKeys.size === 0) return false;
    const binding = (k.keyBinding || k.subtitle || '').trim().toUpperCase();
    if (!binding) return false;
    for (const pressed of pressedKeys) {
      if (pressed.toUpperCase() === binding) return true;
    }
    return false;
  }, [pressedKeys]);

  // Setup keyboard listeners for the overlay
  useEffect(() => {
    const normalizeKey = (e) => {
      const codeMap = {
        'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E',
        'KeyF': 'F', 'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J',
        'KeyK': 'K', 'KeyL': 'L', 'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O',
        'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R', 'KeyS': 'S', 'KeyT': 'T',
        'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X', 'KeyY': 'Y',
        'KeyZ': 'Z',
        'Digit0': '0', 'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4',
        'Digit5': '5', 'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9',
        'Numpad0': 'Num0', 'Numpad1': 'Num1', 'Numpad2': 'Num2', 'Numpad3': 'Num3',
        'Numpad4': 'Num4', 'Numpad5': 'Num5', 'Numpad6': 'Num6', 'Numpad7': 'Num7',
        'Numpad8': 'Num8', 'Numpad9': 'Num9',
        'Space': 'Space', 'Enter': 'Enter', 'Escape': 'Esc',
        'Tab': 'Tab', 'Backspace': 'Backspace', 'Delete': 'Delete',
        'ShiftLeft': 'Shift', 'ShiftRight': 'Shift',
        'ControlLeft': 'Ctrl', 'ControlRight': 'Ctrl',
        'AltLeft': 'Alt', 'AltRight': 'Alt',
        'CapsLock': 'CapsLock',
        'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4', 'F5': 'F5', 'F6': 'F6',
        'F7': 'F7', 'F8': 'F8', 'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
        'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right',
        'Home': 'Home', 'End': 'End', 'PageUp': 'PageUp', 'PageDown': 'PageDown',
        'Insert': 'Insert',
        'Minus': '-', 'Equal': '=', 'BracketLeft': '[', 'BracketRight': ']',
        'Backslash': '\\', 'Semicolon': ';', 'Quote': "'", 'Backquote': '`',
        'Comma': ',', 'Period': '.', 'Slash': '/',
      };
      return codeMap[e.code] || e.key?.toUpperCase() || e.code;
    };

    const onKeyDown = (e) => {
      const key = normalizeKey(e);
      const current = useStore.getState().pressedKeys;
      if (!current.has(key)) {
        const next = new Set(current);
        next.add(key);
        useStore.setState({ pressedKeys: next });
      }
    };

    const onKeyUp = (e) => {
      const key = normalizeKey(e);
      const current = useStore.getState().pressedKeys;
      if (current.has(key)) {
        const next = new Set(current);
        next.delete(key);
        useStore.setState({ pressedKeys: next });
      }
    };

    const onBlur = () => {
      useStore.setState({ pressedKeys: new Set() });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Also set analogNames in store for the AnalogStick component
    useStore.setState({ analogNames });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [analogNames]);

  if (loading) {
    return (
      <div className={`overlay-page ${params.bg ? 'has-bg' : ''}`}>
        <div style={{ color: '#fff' }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`overlay-page ${params.bg ? 'has-bg' : ''}`}>
        <div style={{ color: '#ff6b6b' }}>{error}</div>
      </div>
    );
  }

  const scale = clamp(params.scale, 0.3, 3);
  const showNumbers = params.showNumbers;
  const showGloss = params.showGloss;

  return (
    <div className={`overlay-page ${params.bg ? 'has-bg' : ''} ${params.compact ? 'overlay-compact' : ''}`}>
      <div
        className="overlay-container"
        style={{
          transform: `scale(${scale})`,
          width: bounds.w,
          height: bounds.h
        }}
      >
        <div
          className="overlay-board"
          style={{
            position: 'relative',
            width: bounds.w,
            height: bounds.h,
            marginLeft: -bounds.x + params.offsetX,
            marginTop: -bounds.y + params.offsetY
          }}
        >
          {merged.map((k, idx) => {
            if (k.blank) return null;

            // Analog stick
            if (k.analog && params.showAnalog) {
              const ax = params.analogX ?? k.x;
              const ay = params.analogY ?? k.y;
              return (
                <div
                  key={k.id}
                  style={{ position: 'absolute', left: ax, top: ay, width: ANALOG_W, height: ANALOG_H }}
                >
                  <AnalogStick x={0} y={0} />
                </div>
              );
            }

            if (k.analog) return null;

            // Skip split wheel for now (could add later)
            if (k.split) return null;

            const pressed = isKeyPressed(k);
            const displayLabel = k.label?.trim() || PLACEHOLDERS[idx % PLACEHOLDERS.length];
            const avail = k.w - 20;
            const lay = chooseLabelLayout(avail, displayLabel);

            return (
              <div
                key={k.id}
                data-pressed={pressed ? 'true' : 'false'}
                className="key-tile"
                style={{
                  position: 'absolute',
                  left: k.x,
                  top: k.y,
                  width: k.w,
                  height: k.h,
                  background: k.color,
                  borderRadius: 18,
                  boxShadow: showGloss
                    ? 'inset 0 1px 0 rgba(255,255,255,.15), inset 0 -10px 20px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.35)'
                    : '0 12px 40px rgba(0,0,0,.35)'
                }}
              >
                {showNumbers && k.num != null && (
                  <div className="num num-pill" style={{ position: 'absolute', zIndex: 3 }}>{k.num}</div>
                )}

                {k.imageUrl && k.imageMode === 'cover' && (
                  <img
                    alt=""
                    src={k.imageUrl}
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover', borderRadius: 18, opacity: .95,
                      zIndex: 0, pointerEvents: 'none'
                    }}
                  />
                )}

                {k.emoji && !k.icon && (
                  <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
                    <span style={{ fontSize: 28, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>{k.emoji}</span>
                  </div>
                )}

                {k.icon && !k.emoji && (
                  <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 2 }}>
                    <i
                      className={`ra ${k.icon}`}
                      style={{
                        fontSize: Number(k.iconSize) || 28,
                        lineHeight: 1,
                        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.35))',
                        color: k.iconColor || '#fff'
                      }}
                    />
                  </div>
                )}

                <div
                  className="label"
                  style={{
                    marginTop: (k.emoji || k.icon) ? 26 : 0,
                    position: 'relative', zIndex: 2,
                    textAlign: 'center',
                    color: '#fff',
                    lineHeight: 1.1
                  }}
                >
                  {lay.mode === 'two' ? (
                    <>
                      <div style={{ whiteSpace: 'nowrap', fontWeight: 700, textShadow: '0 1px 0 rgba(0,0,0,.45)', fontSize: lay.fontSize }}>{lay.line1}</div>
                      <div style={{ whiteSpace: 'nowrap', fontWeight: 700, textShadow: '0 1px 0 rgba(0,0,0,.45)', fontSize: lay.fontSize }}>{lay.line2}</div>
                    </>
                  ) : (
                    <div style={{ whiteSpace: 'nowrap', fontWeight: 700, textShadow: '0 1px 0 rgba(0,0,0,.45)', fontSize: lay.fontSize }}>
                      {lay.text}
                    </div>
                  )}
                </div>

                {k.subtitle && (
                  <div className="subtitle" style={{ position: 'relative', zIndex: 2 }}>{k.subtitle}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

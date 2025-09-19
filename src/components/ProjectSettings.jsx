// src/components/ProjectSettings.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useDispatch } from '../lib/store.jsx';
import { LAYOUTS } from '../layouts/index.js';
import { THEMES } from '../lib/themes.js';

function listDevices() {
  if (Array.isArray(LAYOUTS)) return LAYOUTS.map(l => ({ id: l.id || l.name, name: l.name || l.id }));
  return Object.keys(LAYOUTS || {}).map(k => ({ id: k, name: LAYOUTS[k]?.name || k }));
}
function listThemes() { return (THEMES || []).map(t => ({ id: t.id, name: t.name || t.id })); }
const coalesce = (a, b) => (a !== undefined ? a : b);

export default function ProjectSettings({ isMobile = false }) {
  const dispatch = useDispatch();
  const s = useStore();

  const devices = useMemo(() => listDevices(), []);
  const themes  = useMemo(() => listThemes(), []);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState(null);

  const {
    device = 'cyro',
    themeId = null,
    invert = false,
    grid = true,
    snap = true,
    showNumbers = true,
    showGloss = true
  } = s;

  async function onPickJSON(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setMsg(null);
    try {
      setBusy(true);
      const text = await file.text();
      const data = JSON.parse(text);

      const kd = (data && typeof data === 'object') ? (data.keyData || data.keys || {}) : {};
      if (kd && typeof kd !== 'object') throw new Error('Invalid JSON: keyData must be an object');

      const zones = {};
      Object.entries(kd).forEach(([id, info]) => {
        const z = info?.zone ? String(info.zone).trim() : '';
        if (z) zones[z] = Array.from(new Set([...(zones[z] || []), id]));
      });

      useStore.setState(st => {
        const nextDevice = coalesce(data.device, st.device);
        return {
          device: nextDevice,
          themeId: coalesce(data.themeId, st.themeId),
          randomPalette: ('randomPalette' in data) ? data.randomPalette : st.randomPalette,

          invert:       ('invert' in data) ? !!data.invert : st.invert,
          grid:         ('grid' in data) ? !!data.grid : st.grid,
          snap:         ('snap' in data) ? !!data.snap : st.snap,
          showNumbers:  ('showNumbers' in data) ? !!data.showNumbers : st.showNumbers,
          showGloss:    ('showGloss' in data) ? !!data.showGloss : st.showGloss,

          keys: kd || {},
          keyData: { ...(kd || {}) },
          zones,
          selection: [],
          history: [],
          future: [],
        };
      });

      if (data.device) {
        window.dispatchEvent(new CustomEvent('device:changed', { detail: { device: data.device } }));
      }
      window.dispatchEvent(new CustomEvent('layout:reset'));

      setMsg(`Imported ${Object.keys(kd || {}).length} keys${Object.keys(zones).length ? ` • ${Object.keys(zones).length} zones` : ''}.`);
    } catch (err) {
      console.error(err);
      setMsg('Import failed: invalid or incompatible JSON.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const onPickDevice = (id) => {
    dispatch({ type: 'SET', key: 'device', value: id });
    window.dispatchEvent(new CustomEvent('device:changed', { detail: { device: id } }));
  };
  const onPickTheme  = (id) => {
    useStore.setState({ themeId: id || null, randomPalette: id ? null : s.randomPalette });
  };
  const toggle = (key) => useStore.setState(prev => ({ [key]: !prev[key] }));

  const showProjectToggles = !isMobile;

  return (
    <div className="project-settings">
      {showProjectToggles && (
        <div className="group">
          <h3>Project</h3>
          <div className="row" style={{ flexWrap:'wrap', gap:8 }}>
            <label className="btn"><input type="checkbox" checked={!!invert} onChange={() => toggle('invert')} /> Invert layout (default)</label>
            <label className="btn"><input type="checkbox" checked={!!grid} onChange={() => toggle('grid')} /> Grid</label>
            <label className="btn"><input type="checkbox" checked={!!snap} onChange={() => toggle('snap')} /> Snap to grid</label>
            <label className="btn"><input type="checkbox" checked={!!showNumbers} onChange={() => toggle('showNumbers')} /> Numbers</label>
            <label className="btn"><input type="checkbox" checked={!!showGloss} onChange={() => toggle('showGloss')} /> Gloss</label>
          </div>
        </div>
      )}

      <div className="group">
        <h3>Device / Layout</h3>
        <div className="row" style={{ flexWrap:'wrap', gap:8 }}>
          {devices.map(d => (
            <button
              key={d.id}
              className="btn"
              onClick={() => onPickDevice(d.id)}
              style={d.id === device ? { outline:'1px solid rgba(138,107,255,.35)', filter:'brightness(1.08)' } : null}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <h3>Theme</h3>
        <ThemeDropdown
          value={themeId}
          themes={themes}
          onChange={onPickTheme}
        />
      </div>

      <div className="group">
        <h3>Import JSON</h3>
        <p className="hint" style={{ opacity:.8, marginTop:-6 }}>
          Import an exported Azeron Keymap Helper project JSON (from this app). This does not accept Azeron profiles or share codes.
        </p>
        <div className="row" style={{ gap:8, alignItems:'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onPickJSON}
            disabled={busy}
          />
          {busy && <span>Importing…</span>}
          {msg && <span style={{ opacity:.9 }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}

/* Theme dropdown */
function ThemeDropdown({ value, themes, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const current = value ? (themes.find(t => t.id === value)?.name || value) : 'Custom';

  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current) return; if (!wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDoc); window.removeEventListener('keydown', onKey); };
  }, []);

  const itemStyle = {
    display:'flex', alignItems:'center', width:'100%', padding:'8px 10px',
    background:'transparent', border:'1px solid transparent', borderRadius:10, cursor:'pointer'
  };

  return (
    <div ref={wrapRef} style={{ position:'relative', display:'inline-block', minWidth:240 }}>
      <button
        className="btn"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open ? 'true' : 'false'}
        style={{ minWidth:240, display:'inline-flex', justifyContent:'space-between', alignItems:'center', gap:10 }}
      >
        <span>{`Theme: ${current}`}</span>
        <span aria-hidden="true" style={{ opacity:.85 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="dropdown-menu"
          style={{
            position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:9999,
            background:'rgba(17,24,39,.96)', border:'1px solid rgba(42,54,84,.9)', borderRadius:12,
            boxShadow:'0 20px 50px rgba(0,0,0,.45)', padding:6,
            maxHeight: 4 * 40,
            overflowY:'auto'
          }}
        >
          <button
            role="option"
            aria-selected={value ? 'false' : 'true'}
            className="btn"
            style={{
              ...itemStyle,
              justifyContent:'flex-start',
              outline: !value ? '1px solid rgba(138,107,255,.35)' : undefined,
              filter:  !value ? 'brightness(1.08)' : undefined
            }}
            onClick={() => { onChange(null); setOpen(false); }}
          >
            Custom
          </button>

          <hr style={{ borderColor:'rgba(42,54,84,.6)', margin:'6px 0' }} />

          {themes.map(t => (
            <button
              key={t.id}
              role="option"
              aria-selected={value === t.id ? 'true' : 'false'}
              className="btn"
              style={{
                ...itemStyle,
                justifyContent:'flex-start',
                outline: value === t.id ? '1px solid rgba(138,107,255,.35)' : undefined,
                filter:  value === t.id ? 'brightness(1.08)' : undefined
              }}
              onClick={() => { onChange(t.id); setOpen(false); }}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

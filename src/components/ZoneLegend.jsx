// src/components/ZoneLegend.jsx
// Zone legend — derives zones from keyData when store.zones is empty.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { currentLayout } from '../layouts/index.js';
import { THEMES, BASE } from '../lib/themes.js';

const DEFAULT_RAINBOW = [
  BASE.red, BASE.orange, BASE.yellow, BASE.green,
  BASE.teal, BASE.blue, BASE.indigo, BASE.violet
];

function themePalette(themeId) {
  if (!themeId) return null;
  const t = (THEMES || []).find(t => t.id === themeId);
  if (!t?.keys) return null;
  return t.keys.split(',').map(s => s.trim());
}

function deriveZonesFromKeyData(baseKeys, keyData) {
  const out = {};
  for (const k of baseKeys) {
    const o = keyData[k.id] || {};
    const z = String(o.zone ?? k.zone ?? '').trim();
    if (!z) continue;
    const arr = out[z] || (out[z] = []);
    if (!arr.includes(k.id)) arr.push(k.id);
  }
  return out;
}

export default function ZoneLegend({ maxWidthPx = 360, twoLine = true }) {
  const { device, zones = {}, keyData = {}, themeId, randomPalette } = useStore();

  const def = useMemo(() => {
    try { return currentLayout?.(device) || {}; } catch { return {}; }
  }, [device]);

  const baseKeys = useMemo(() => {
    const arr = Array.isArray(def?.keys) ? def.keys : [];
    return arr.map((k, idx) => ({
      id: k?.id ?? idx + 1,
      idx,
      x: Number(k?.x ?? 0), y: Number(k?.y ?? 0),
      w: Number(k?.w ?? 100), h: Number(k?.h ?? 140),
      label: k?.label || '', zone: k?.zone || '', color: k?.color || null
    }));
  }, [def]);

  const palTheme = themePalette(themeId);
  const palette = (randomPalette?.length ? randomPalette : (palTheme || DEFAULT_RAINBOW));

  const mergedById = useMemo(() => {
    const m = new Map();
    baseKeys.forEach((k) => {
      const o = keyData[k.id] || {};
      const color = (o.color ?? k.color ?? palette[k.idx % palette.length]);
      const zone  = (o.zone  ?? k.zone  ?? '');
      m.set(String(k.id), { color, zone });
    });
    return m;
  }, [baseKeys, keyData, palette]);

  const effectiveZones = useMemo(() => {
    const hasZones = zones && typeof zones === 'object' && Object.keys(zones).length > 0;
    return hasZones ? zones : deriveZonesFromKeyData(baseKeys, keyData);
  }, [zones, baseKeys, keyData]);

  function zoneColor(ids) {
    const counts = new Map();
    for (const id of ids) {
      const c = mergedById.get(String(id))?.color;
      if (!c) continue;
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    if (!counts.size) return '#666';
    let best = null;
    counts.forEach((cnt, color) => {
      if (!best || cnt > best.cnt || (cnt === best.cnt && palette.indexOf(color) < palette.indexOf(best.color))) {
        best = { color, cnt };
      }
    });
    return best.color;
  }

  const entries = useMemo(() => {
    const out = [];
    Object.keys(effectiveZones || {}).forEach((zName) => {
      const ids = effectiveZones[zName] || [];
      out.push({ name: zName, color: zoneColor(ids), count: ids.length });
    });
    return out.sort((a,b) => a.name.localeCompare(b.name));
  }, [effectiveZones, mergedById, palette]);

  // hooks must not be behind conditionals — keep order stable
  const contRef = useRef(null);
  const [overflowCount, setOverflowCount] = useState(0);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const el = contRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      const clientH = el.clientHeight;
      const scrollH = el.scrollHeight;
      if (scrollH <= clientH + 1) { setOverflowCount(0); return; }

      const chips = Array.from(el.querySelectorAll('[data-chip="1"]'));
      const tops = [];
      chips.forEach((c) => { const t = c.offsetTop; if (!tops.includes(t)) tops.push(t); });
      tops.sort((a,b)=>a-b);
      const thirdRowTop = tops[2];
      if (thirdRowTop == null) { setOverflowCount(0); return; }
      const hidden = chips.filter(c => c.offsetTop >= thirdRowTop).length;
      setOverflowCount(hidden);
    });
    return () => cancelAnimationFrame(id);
  }, [entries, maxWidthPx, twoLine]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onDoc = (e) => {
      const wrap = contRef.current?.parentElement;
      if (wrap && !wrap.contains(e.target)) setPopoverOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPopoverOpen(false); };
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [popoverOpen]);

  if (!entries.length) return null;

  const chipStyle = {
    display:'inline-flex', alignItems:'center', gap:6,
    padding:'4px 8px', borderRadius:999,
    background:'rgba(6,10,22,.6)', border:'1px solid rgba(42,54,84,.7)',
    whiteSpace:'nowrap', fontSize:12, lineHeight:1
  };

  return (
    <div style={{ position:'relative', maxWidth: Math.max(180, Math.round(maxWidthPx)) }}>
      <div
        ref={contRef}
        className="zone-legend"
        style={{
          display:'flex', flexWrap:'wrap', alignItems:'center', gap:8,
          padding:'6px 8px', borderRadius:999,
          border:'1px solid rgba(42,54,84,.9)',
          background:'rgba(17,24,39,.8)',
          backdropFilter:'blur(8px)',
          boxShadow:'0 0 0 1px #202a44, 0 12px 24px #0006',
          maxHeight: twoLine ? 56 : undefined,
          overflow:'hidden'
        }}
        aria-label="Zone legend"
      >
        {entries.map(e => (
          <span key={e.name} data-chip="1" title={`${e.name} (${e.count})`} style={chipStyle}>
            <span
              aria-hidden="true"
              style={{
                width:10, height:10, borderRadius:999, background:e.color,
                boxShadow:'0 0 0 1px rgba(255,255,255,.15), 0 0 10px rgba(0,0,0,.35) inset'
              }}
            />
            <span>{e.name}</span>
          </span>
        ))}
      </div>

      {overflowCount > 0 && (
        <button
          className="btn mini"
          onClick={() => setPopoverOpen(v => !v)}
          style={{
            position:'absolute', right:6, bottom:6,
            padding:'2px 8px', borderRadius:999,
            background:'rgba(9,13,26,.9)', border:'1px solid rgba(42,54,84,.9)'
          }}
          title="Show all zones"
          aria-expanded={popoverOpen ? 'true' : 'false'}
          aria-controls="zoneLegendPopover"
        >
          +{overflowCount} more
        </button>
      )}

      {popoverOpen && (
        <div
          id="zoneLegendPopover"
          role="dialog"
          aria-label="All zones"
          style={{
            position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:10000,
            background:'rgba(17,24,39,.98)', border:'1px solid rgba(42,54,84,.9)', borderRadius:12,
            boxShadow:'0 20px 50px rgba(0,0,0,.45)',
            maxHeight: 240, overflow:'auto', padding:8, minWidth: Math.min(420, Math.max(220, maxWidthPx))
          }}
        >
          <div style={{ display:'grid', gap:6 }}>
            {entries.map(e => (
              <div key={e.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width:10, height:10, borderRadius:999, background:e.color,
                    boxShadow:'0 0 0 1px rgba(255,255,255,.15), 0 0 10px rgba(0,0,0,.35) inset'
                  }}
                />
                <span style={{ fontSize:13 }}>{e.name}</span>
                <span style={{ marginLeft:'auto', opacity:.75, fontSize:12 }}>{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

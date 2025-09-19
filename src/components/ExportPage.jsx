// src/components/ExportPage.jsx
// Export page for UI / Transparent / Print-safe, sized to US Letter landscape.

import React, { useMemo } from 'react';
import { useStore } from '../lib/store.jsx';
import { currentLayout } from '../layouts/index.js';
import { THEMES, BASE } from '../lib/themes.js';

const logoUrl = new URL('../logo.png', import.meta.url).href;

/* constants */
const DEFAULT_RAINBOW = [
  BASE.red, BASE.orange, BASE.yellow, BASE.green,
  BASE.teal, BASE.blue, BASE.indigo, BASE.violet
];
const ANALOG_W = 240, ANALOG_H = 280;

/* theme helpers */
function themePalette(themeId) {
  if (!themeId) return null;
  const t = (THEMES || []).find(t => t.id === themeId);
  if (!t?.keys) return null;
  return t.keys.split(',').map(s => s.trim());
}

/* placeholders */
const PLACEHOLDERS = [
  'Move Forward','Move Left','Move Back','Move Right','Jump','Crouch','Sprint','Walk Toggle',
  'Primary Fire','Secondary Fire','Aim / ADS','Reload','Melee','Use / Interact','Ping / Marker','Holster',
  'Prev Weapon','Next Weapon','Switch Weapon','Grenade',
  'Ability 1','Ability 2','Ability 3','Ultimate','Quick Slot 1','Quick Slot 2','Quick Slot 3','Quick Slot 4',
  'Inventory','Map','Quest / Journal','Skills','Build / Craft','Photo Mode','Toggle Camera','Scoreboard',
  'Push-to-Talk','Team Chat','Emote','Wheel / Radial','Prone','Slide / Dodge','Roll','Parry / Block',
  'Cast Spell','Mount / Vehicle','Lean Left','Lean Right','Pause / Menu','Settings'
];

/* legend data */
function buildLegendEntries({ device, keyData, themeId, randomPalette, zones }) {
  const def = currentLayout?.(device) || {};
  const base = Array.isArray(def.keys) ? def.keys : [];
  const palTheme = themePalette(themeId);
  const pal = (randomPalette?.length ? randomPalette : (palTheme || DEFAULT_RAINBOW));

  const merged = base.map((k, idx) => {
    const o = (keyData || {})[k.id] || {};
    return {
      id: k.id,
      color: o.color ?? k.color ?? pal[idx % pal.length],
      zone:  o.zone  ?? k.zone  ?? ''
    };
  });

  const byId = new Map(merged.map(k => [String(k.id), k]));
  const out = [];
  Object.keys(zones || {}).forEach(name => {
    const ids = zones[name] || [];
    let color = '#666';
    for (const id of ids) {
      const k = byId.get(String(id));
      if (k?.color) { color = k.color; break; }
    }
    out.push({ name, color, count: ids.length });
  });
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}

/* derive zones if store.zones is empty */
function deriveZonesFromKeyData(device, keyData) {
  const def = currentLayout?.(device) || {};
  const base = Array.isArray(def.keys) ? def.keys : [];
  const out = {};
  for (const k of base) {
    const o = (keyData || {})[k.id] || {};
    const z = String(o.zone ?? k.zone ?? '').trim();
    if (!z) continue;
    (out[z] ||= []).push(k.id);
  }
  return out;
}

/* analog figure (export) */
function AnalogFigure({ w, h, mode, labels }) {
  const inkStroke = mode === 'print';
  const ringStyle = {
    position:'absolute', left:'50%', top:'50%',
    width: Math.min(w, h) * 0.6, height: Math.min(w, h) * 0.6,
    transform:'translate(-50%,-50%)',
    borderRadius:'50%',
    border: inkStroke ? '2px solid #111' : '8px solid rgba(255,255,255,.12)',
    boxShadow: inkStroke ? 'none' : 'inset 0 0 20px rgba(0,0,0,.45), 0 6px 24px rgba(0,0,0,.35)'
  };
  const axisStyle = (dir) => ({
    position:'absolute',
    left: dir === 'v' ? '50%' : 0,
    top:  dir === 'v' ? 0 : '50%',
    width: dir === 'v' ? 2 : '100%',
    height: dir === 'v' ? '100%' : 2,
    transform: dir === 'v' ? 'translateX(-50%)' : 'translateY(-50%)',
    background: '#111'
  });
  const tip = (text, x, y) => (
    <div style={{ position:'absolute', left:x, top:y, transform:'translate(-50%,-50%)', fontSize:12, opacity:.85, color:'#111' }}>
      {text}
    </div>
  );
  return (
    <div style={{ position:'absolute', inset:0 }}>
      <div style={ringStyle} />
      <div style={axisStyle('v')} />
      <div style={axisStyle('h')} />
      {labels?.up &&  tip(labels.up,  '50%', '18%')}
      {labels?.down && tip(labels.down,'50%','82%')}
      {labels?.left && tip(labels.left,'18%','50%')}
      {labels?.right&& tip(labels.right,'82%','50%')}
    </div>
  );
}

/* board renderer (export) */
function BoardCanvasRenderer({ width, height, mode }) {
  const s = useStore();
  const {
    device, themeId, randomPalette, invert,
    showNumbers, grid,
    keyData = {},
    mwUpId = 'MW_UP',
    mwDownId = 'MW_DOWN',
    analogNames = { up:'W', left:'A', down:'S', right:'D' }
  } = s;

  const def = useMemo(() => { try { return currentLayout?.(device) || {}; } catch { return {}; } }, [device]);

  const base = useMemo(() => {
    const arr = Array.isArray(def?.keys) ? def.keys : [];
    return arr.map((k, i) => ({
      id: k?.id ?? i + 1,
      idx: i,
      num: Number.isFinite(Number(k?.num ?? k?.id)) ? Number(k?.num ?? k?.id) : null,
      x: Number(k?.x ?? 0), y: Number(k?.y ?? 0),
      w: Number(k?.w ?? 100), h: Number(k?.h ?? 140),
      analog: !!k?.analog, blank: !!k?.blank, split: !!k?.split,
      label: k?.label || '', subtitle: k?.subtitle || '',
      color: k?.color || null, zone: k?.zone || '',
      imageUrl: k?.imageUrl || '', imageMode: k?.imageMode || 'cover',
      emoji: k?.emoji || '', icon: k?.icon || '',
      iconColor: k?.iconColor || undefined,
      iconSize: k?.iconSize || undefined
    }));
  }, [def]);

  const palTheme = themePalette(themeId);
  const pal = (randomPalette?.length ? randomPalette : (palTheme || DEFAULT_RAINBOW));

  const merged = useMemo(() => base.map((k, idx) => {
    const o = keyData[k.id] || {};
    const isUnassigned = !!o.unassigned;
    let label = o.label ?? k.label ?? '';
    let subtitle = o.subtitle ?? k.subtitle ?? '';
    if (isUnassigned && !label) label = 'Unassigned';
    let color = o.color;
    if (!color) color = k.color;
    if (!color) color = pal[idx % pal.length];
    if (isUnassigned && !o.color && !k.color) {
      color = '#6e6e6e';
    }
    return {
      ...k,
      ...o,
      x: o.x ?? k.x, y: o.y ?? k.y, w: o.w ?? k.w, h: o.h ?? k.h,
      label,
      subtitle,
      color,
      zone: (o.zone ?? k.zone ?? ''),
      imageUrl: (o.imageUrl ?? k.imageUrl ?? ''),
      imageMode: (o.imageMode ?? k.imageMode ?? 'cover'),
      emoji: (o.emoji ?? k.emoji ?? ''),
      icon:  (o.icon  ?? k.icon  ?? ''),
      iconColor: (o.iconColor ?? k.iconColor ?? undefined),
      iconSize:  (o.iconSize  ?? k.iconSize  ?? undefined),
      split: !!(o.split ?? k.split),
      analog: !!(o.analog ?? k.analog),
      unassigned: isUnassigned
    };
  }), [base, keyData, pal]);

  // bounds include analog footprint
  const bounds = useMemo(() => {
    const items = merged.filter(k => !k.blank);
    if (!items.length) return { x:0, y:0, w:1200, h:800 };
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    for (const k of items) {
      const w = k.analog ? ANALOG_W : k.w;
      const h = k.analog ? ANALOG_H : k.h;
      minX = Math.min(minX, k.x);
      minY = Math.min(minY, k.y);
      maxX = Math.max(maxX, k.x + w);
      maxY = Math.max(maxY, k.y + h);
    }
    return { x:minX, y:minY, w:maxX-minX, h:maxY-minY };
  }, [merged]);

  // scale & center
  const pad = mode === 'ui' ? 12 : 8;
  const availW = Math.max(1, width - pad * 2);
  const availH = Math.max(1, height - pad * 2);
  const scale = Math.min(availW / bounds.w, availH / bounds.h);
  const totalW = bounds.w * scale;
  const totalH = bounds.h * scale;
  const offsetX = Math.round((width - totalW) / 2 - bounds.x * scale);
  const offsetY = Math.round((height - totalH) / 2 - bounds.y * scale);

  // label style (no ellipses)
  const labelBaseStyle = {
    fontWeight: 700,
    textShadow: 'none',
    marginTop: 0,
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    wordBreak: 'normal',
    overflowWrap: 'normal',
    padding: '0 8px',
    color: mode === 'print' ? '#000' : '#fff',
    textOverflow: 'clip',
    overflow: 'visible'
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fitFontSize = (w, text='') => {
    const len = Math.max(1, String(text).length);
    const px = Math.floor(w / (0.58 * len + 2));
    return clamp(px, 9, 13);
  };

  const KeyTile = ({ k, left, top, w, h, displayLabel }) => {
    const inkStroke = mode === 'print';
    // Derive base style. Unassigned keys are drawn with a dashed border and no fill.
    const baseStyle = {
      position:'absolute', left, top, width:w, height:h,
      borderRadius: 18,
      display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column',
      textAlign:'center', padding:10, zIndex:1
    };
    const unassigned = !!k.unassigned;
    if (unassigned) {
      baseStyle.background = 'transparent';
      if (inkStroke) {
        baseStyle.border = '2px dashed #000';
        baseStyle.color = '#000';
      } else {
        baseStyle.border = '2px dashed rgba(255,255,255,0.5)';
        baseStyle.color = '#fff';
      }
      baseStyle.boxShadow = 'none';
    } else {
      baseStyle.background = inkStroke ? '#ffffff' : k.color;
      baseStyle.border = inkStroke ? `2px solid ${k.color}` : 'none';
      baseStyle.boxShadow = inkStroke ? 'none' : '0 12px 40px rgba(0,0,0,.35)';
      baseStyle.color = inkStroke ? '#000' : '#fff';
    }
    const topBump = (s.showNumbers && k.num != null ? 8 : 0) + (k.emoji || k.icon ? 22 : 0);
    const iconSize = Number(k.iconSize ?? 28);
    const iconColor = mode === 'print' ? '#000' : (k.iconColor || labelBaseStyle.color);

    return (
      <div className="key-tile" style={baseStyle}>
        {s.showNumbers && k.num != null && (
          <div className="num num-pill" style={{
            position:'absolute', top:6, left:6, padding:'3px 8px',
            borderRadius:999, fontSize:13, lineHeight:1,
            background: mode === 'print' ? '#ffffff' : '#000000',
            color: mode === 'print' ? '#000000' : '#ffffff',
            boxShadow: mode === 'print' ? 'none' : '0 0 12px rgba(122,160,255,.25), inset 0 0 0 1px rgba(255,255,255,.2)',
            border: mode === 'print' ? '1px solid #000000' : 'none',
            zIndex: 3
          }}>{k.num}</div>
        )}

        {k.imageUrl && !unassigned && k.imageMode === 'cover' && mode !== 'print' && (
          <img
            alt=""
            src={k.imageUrl}
            style={{
              position:'absolute', inset:0, width:'100%', height:'100%',
              objectFit:'cover', borderRadius:18, opacity:.95,
              zIndex:0, pointerEvents:'none'
            }}
          />
        )}
        {k.imageUrl && !unassigned && k.imageMode === 'icon' && mode !== 'print' && (
          <img
            alt=""
            src={k.imageUrl}
            style={{
              position:'absolute', top:8, right:8, width:26, height:26,
              borderRadius:8, objectFit:'cover', boxShadow:'0 2px 10px rgba(0,0,0,.4)',
              zIndex:1, pointerEvents:'none'
            }}
          />
        )}

        {k.emoji && !k.icon && !unassigned && (
          <div style={{ position:'absolute', top:10, left:0, right:0, display:'flex', justifyContent:'center', zIndex:2 }}>
            <span style={{ fontSize:24, filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>{k.emoji}</span>
          </div>
        )}
        {k.icon && !k.emoji && !unassigned && (
          <div style={{ position:'absolute', top:12, left:0, right:0, display:'flex', justifyContent:'center', zIndex:1, pointerEvents:'none' }}>
            <i className={`ra ${k.icon}`} style={{ fontSize: iconSize, lineHeight: 1, filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))', color: iconColor }} />
          </div>
        )}

        <div
          className="label"
          style={{
            ...labelBaseStyle,
            color: 'inherit',
            marginTop: topBump,
            position:'relative',
            zIndex:3,
            fontSize: fitFontSize(w, displayLabel),
            letterSpacing: '-0.1px'
          }}
          title={displayLabel}
        >
          {displayLabel}
        </div>

        {k.subtitle ? (
          <div className="subtitle" style={{ fontSize:12, opacity:.9, marginTop:4, position:'relative', zIndex:3, color: 'inherit' }}>
            {k.subtitle}
          </div>
        ) : null}
      </div>
    );
  };

  const SplitWheel = ({ k, left, top, w, h }) => {
    const upO   = merged.find(m => String(m.id) === String(s.mwUpId || 'MW_UP')) ? (keyData[s.mwUpId || 'MW_UP'] || {}) : (keyData['MW_UP'] || {});
    const downO = merged.find(m => String(m.id) === String(s.mwDownId || 'MW_DOWN')) ? (keyData[s.mwDownId || 'MW_DOWN'] || {}) : (keyData['MW_DOWN'] || {});
    const upColor   = upO.color   ?? pal[k.idx % pal.length];
    const downColor = downO.color ?? pal[(k.idx + 1) % pal.length];
    const upLabel   = (upO.label   ?? 'Mouse Wheel Up');
    const downLabel = (downO.label ?? 'Mouse Wheel Down');
    const inkStroke = mode === 'print';
    const halfH = h / 2;

    return (
      <div style={{ position:'absolute', left, top, width:w, height:h, borderRadius:18, overflow:'hidden' }}>
        <div style={{
          position:'absolute', left:0, top:0, width:'100%', height:halfH,
          background: inkStroke ? '#ffffff' : upColor,
          borderTopLeftRadius:18, borderTopRightRadius:18,
          borderLeft: inkStroke ? `2px solid ${upColor}` : 'none',
          borderRight: inkStroke ? `2px solid ${upColor}` : 'none',
          borderTop: inkStroke ? `2px solid ${upColor}` : 'none',
          display:'flex', alignItems:'center', justifyContent:'center', color: mode === 'print' ? '#000' : '#fff'
        }}>
          <div style={{ ...labelBaseStyle, fontSize: fitFontSize(w, upLabel), letterSpacing: '-0.1px' }}>{upLabel}</div>
        </div>

        <div style={{ position:'absolute', left:0, top:halfH - 1, width:'100%', height:2, background: '#000' }} />

        <div style={{
          position:'absolute', left:0, top:halfH, width:'100%', height:halfH,
          background: inkStroke ? '#ffffff' : downColor,
          borderBottomLeftRadius:18, borderBottomRightRadius:18,
          borderLeft: inkStroke ? `2px solid ${downColor}` : 'none',
          borderRight: inkStroke ? `2px solid ${downColor}` : 'none',
          borderBottom: inkStroke ? `2px solid ${downColor}` : 'none',
          display:'flex', alignItems:'center', justifyContent:'center', color: mode === 'print' ? '#000' : '#fff'
        }}>
          <div style={{ ...labelBaseStyle, fontSize: fitFontSize(w, downLabel), letterSpacing: '-0.1px' }}>{downLabel}</div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position:'relative',
        width, height,
        border: mode === 'transparent' ? 'none' : (mode === 'print' ? '1px solid #00000022' : '1px solid rgba(42,54,84,.4)'),
        borderRadius: mode === 'ui' ? 16 : 6,
        background:
          mode === 'transparent'
            ? 'transparent'
            : (mode === 'print' ? '#ffffff' : 'linear-gradient(180deg,#0f1428,#0b1022)'),
        color: mode === 'print' ? '#000' : '#e9efff',
        overflow:'hidden'
      }}
    >
      {/* grid (board-only) */}
      {mode === 'ui' && grid && (
        <div
          style={{
            position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),' +
              'linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px),' +
              'linear-gradient(to right, transparent 0, transparent 119px, rgba(0,0,0,0.25) 120px),' +
              'linear-gradient(to bottom, transparent 0, transparent 119px, rgba(0,0,0,0.25) 120px)',
            backgroundSize: '24px 24px, 24px 24px, 120px 120px, 120px 120px',
            mixBlendMode: 'screen'
          }}
        />
      )}

      {merged.map((k) => {
        if (k.blank) return null;

        const rawLeft = invert
          ? (bounds.x + bounds.w - (k.x + (k.analog ? ANALOG_W : k.w)))
          : k.x;
        const left = offsetX + rawLeft * scale;
        const top  = offsetY + k.y * scale;
        const w    = (k.analog ? ANALOG_W : k.w) * scale;
        const h    = (k.analog ? ANALOG_H : k.h) * scale;

        if (k.analog) {
          return (
            <div
              key={`analog-${k.id}`}
              style={{
                position:'absolute', left, top, width:w, height:h,
                borderRadius:18,
                background: mode === 'print' ? '#ffffff' : 'rgba(255,255,255,.06)',
                border: mode === 'print' ? '2px solid #111' : '1px solid rgba(255,255,255,.15)',
                boxShadow: mode === 'print' ? 'none' : '0 12px 40px rgba(0,0,0,.35)'
              }}
            >
              <AnalogFigure w={w} h={h} mode={mode} labels={analogNames} />
            </div>
          );
        }

        const displayLabel =
          (k.label && k.label.trim().length > 0)
            ? k.label
            : PLACEHOLDERS[k.idx % PLACEHOLDERS.length];

        if (k.split) {
          return (
            <SplitWheel key={`mw-${k.id}`} k={k} left={left} top={top} w={w} h={h} />
          );
        }

        return (
          <KeyTile key={k.id} k={k} left={left} top={top} w={w} h={h} displayLabel={displayLabel} />
        );
      })}
    </div>
  );
}

/* export page shell */
export default function ExportPage({
  page = 'letter',
  orientation = 'landscape',
  mode = 'ui'
}) {
  const s = useStore();
  const title = s.gameTitle || 'Untitled';
  const device = s.device || 'Device';
  const showLegend = s.showLegend !== false;

  const PAGE_W = 11 * 96;
  const PAGE_H = 8.5 * 96;
  const W = orientation === 'landscape' ? PAGE_W : PAGE_H;
  const H = orientation === 'landscape' ? PAGE_H : PAGE_W;

  const headerH = mode === 'transparent' ? 0 : 92;
  const footerH = mode === 'transparent' ? 0 : 36;
  const sidePad = 40;
  const topPad  = 18;
  const boardW = W - sidePad * 2;
  const boardH = H - (headerH + footerH + topPad * 2);

  // zones (header legend)
  const effectiveZones = useMemo(() => {
    const z = s.zones || {};
    return Object.keys(z).length ? z : deriveZonesFromKeyData(s.device, s.keyData || {});
  }, [s.device, s.zones, s.keyData]);

  const legend = useMemo(() => buildLegendEntries({
    device: s.device,
    keyData: s.keyData,
    themeId: s.themeId,
    randomPalette: s.randomPalette,
    zones: effectiveZones
  }), [s.device, s.keyData, s.themeId, s.randomPalette, effectiveZones]);

  return (
    <div
      data-export-page-root
      style={{
        width: W, height: H,
        background: mode === 'transparent' ? 'transparent' : (mode === 'print' ? '#ffffff' : 'linear-gradient(180deg,#0c1024,#0a0e20)'),
        color: mode === 'print' ? '#000000' : '#e9efff',
        fontFamily:'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
        position:'relative',
        padding: `${topPad}px ${sidePad}px`
      }}
    >
      {/* export-only overrides */}
      <style>{`
        [data-export-page-root] .key-tile[data-selected="true"]::after{ display:none !important; }
        [data-export-page-root] .key-tile .label{
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }
      `}</style>

      {mode !== 'transparent' && (
        <div
          style={{
            display:'grid',
            gridTemplateColumns:'auto 1fr',
            alignItems:'center',
            gap:16,
            height: headerH - topPad
          }}
        >
          <img src={logoUrl} alt="Logo" style={{ height:52, width:'auto', objectFit:'contain' }} />

          {/* right header block: device (row 1), title (row 2), legend to the right spanning both rows */}
          <div
            style={{
              display:'grid',
              gridTemplateRows:'auto auto',
              gridTemplateColumns:'1fr auto',
              columnGap:12,
              rowGap:4,
              minWidth:0
            }}
          >
            {/* device name (row 1, col 1) */}
            <div style={{ fontSize:16, opacity:.85, color: mode === 'print' ? '#000' : '#e9efff', gridRow:'1', gridColumn:'1' }}>
              {device}
            </div>

            {/* title (row 2, col 1) */}
            <div style={{
              fontSize:24, fontWeight:800, lineHeight:1.15,
              color: mode === 'print' ? '#000' : '#e9efff',
              gridRow:'2', gridColumn:'1',
              minWidth:0, overflow:'visible', whiteSpace:'normal'
            }}>
              {title}
            </div>

            {/* legend bubbles (col 2, span rows 1–2, vertically centered beside title) */}
            {showLegend && !!legend.length && (
              <div
                style={{
                  gridColumn:'2',
                  gridRow:'1 / span 2',
                  alignSelf:'center',
                  display:'flex',
                  flexWrap:'wrap',
                  justifyContent:'flex-end',
                  gap:8,
                  maxWidth: 520,          // keep to one or two lines typically
                  maxHeight: 52,          // ~two lines worth of chips
                  overflow:'hidden'
                }}
              >
                {legend.map(e => (
                  <span key={e.name} style={{
                    display:'inline-flex', alignItems:'center', gap:6,
                    padding:'4px 8px', borderRadius:999,
                    background: mode === 'print' ? '#ffffff' : 'rgba(6,10,22,.6)',
                    border: `1px solid ${mode === 'print' ? '#00000033' : 'rgba(42,54,84,.35)'}`,
                    fontSize:12, lineHeight:1, color: mode === 'print' ? '#000' : '#e9efff'
                  }}>
                    <span aria-hidden="true" style={{
                      width:10, height:10, borderRadius:999, background:e.color,
                      boxShadow: mode === 'print' ? 'inset 0 0 0 1px rgba(0,0,0,.25)' : '0 0 0 1px rgba(255,255,255,.15), inset 0 0 10px rgba(0,0,0,.25)'
                    }}/>
                    <span>{e.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* board area */}
      <div style={{ height: boardH, width: boardW }}>
        <BoardCanvasRenderer width={boardW} height={boardH} mode={mode} />
      </div>

      {mode !== 'transparent' && (
        <div style={{
          position:'absolute', left:sidePad, right:sidePad, bottom: topPad,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          fontSize:12, opacity: .9, color: mode === 'print' ? '#000' : '#e9efff'
        }}>
          <div>{mode === 'ui' ? 'Azeron Keymap Helper — UI export' : (mode === 'transparent' ? 'Azeron Keymap Helper — Transparent export' : 'Azeron Keymap Helper — Print-safe export')}</div>
          <div>Created with Azeron Keymap Helper. Not affiliated with Azeron. Made by JimmyCPW.</div>
        </div>
      )}
    </div>
  );
}

// src/components/Inspector.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { currentLayout } from '../layouts/index.js';
import EmojiPicker from 'emoji-picker-react';
import { THEMES, BASE } from '../lib/themes.js';

const DEFAULT_RAINBOW = [
  BASE.red, BASE.orange, BASE.yellow, BASE.green,
  BASE.teal, BASE.blue, BASE.indigo, BASE.violet
];

const PLACEHOLDERS = [
  'Move Forward','Move Left','Move Back','Move Right','Jump','Crouch','Sprint','Walk Toggle',
  'Primary Fire','Secondary Fire','Aim / ADS','Reload','Melee','Use / Interact','Ping / Marker','Holster',
  'Prev Weapon','Next Weapon','Switch Weapon','Grenade',
  'Ability 1','Ability 2','Ability 3','Ultimate','Quick Slot 1','Quick Slot 2','Quick Slot 3','Quick Slot 4',
  'Inventory','Map','Quest / Journal','Skills','Build / Craft','Photo Mode','Toggle Camera','Scoreboard',
  'Push-to-Talk','Team Chat','Emote','Wheel / Radial','Prone','Slide / Dodge','Roll','Parry / Block',
  'Cast Spell','Mount / Vehicle','Lean Left','Lean Right','Pause / Menu','Settings'
];

export default function Inspector() {
  const s = useStore();
  const selection = s.selection || [];
  const multiActive = (s.multiSelect ?? s.multi) || false;
  const selectedId = selection[0] || null;
  const device = s.device;
  const themeId = s.themeId;
  const randomPalette = s.randomPalette;
  const showNumbers = s.showNumbers;

  // Split-wheel ids (align with BoardCanvas)
  const mwId     = s.mwId     || 'MW';
  const mwUpId   = s.mwUpId   || 'MW_UP';
  const mwDownId = s.mwDownId || 'MW_DOWN';

  const panelRef = useRef(null);

  // --- layout lookups ---
  const { baseKey, baseIndex } = useMemo(() => {
    const layout = currentLayout?.(device);
    const arr = Array.isArray(layout?.keys) ? layout.keys : [];
    const idx = arr.findIndex(k => String(k.id) === String(selectedId));
    return { baseKey: idx >= 0 ? arr[idx] : null, baseIndex: idx };
  }, [device, selectedId]);

  const keyData = useStore(st => st.keyData) || {};
  const overlay = baseKey ? (keyData[selectedId] || {}) : {};

  // palette
  const palette = useMemo(() => {
    const t = (THEMES || []).find(t => t.id === themeId);
    return (randomPalette?.length
      ? randomPalette
      : (t?.keys ? t.keys.split(',').map(s => s.trim()) : DEFAULT_RAINBOW)
    );
  }, [themeId, randomPalette]);

  const placeholderText = useMemo(() => {
    if (baseIndex == null || baseIndex < 0) return '';
    return PLACEHOLDERS[baseIndex % PLACEHOLDERS.length] || '';
  }, [baseIndex]);

  const active = useMemo(() => {
    if (!baseKey) return null;
    const n = Number(baseKey.num ?? baseKey.id);
    const colorFromTheme = palette[(baseIndex >= 0 ? baseIndex : 0) % palette.length];
    const labelValue = (overlay.label ?? baseKey.label ?? '');
    const subtitleValue = (overlay.subtitle ?? baseKey.subtitle ?? '');
    return {
      id: baseKey.id,
      num: Number.isFinite(n) ? n : null,
      w: overlay.w ?? baseKey.w ?? 100,
      h: overlay.h ?? baseKey.h ?? 140,
      displayLabel: (labelValue || placeholderText),
      label: labelValue,
      subtitle: subtitleValue,
      color: overlay.color ?? baseKey.color ?? colorFromTheme,
      zone: overlay.zone ?? baseKey.zone ?? '',
      imageUrl: overlay.imageUrl ?? baseKey.imageUrl ?? '',
      imageMode: overlay.imageMode ?? baseKey.imageMode ?? 'cover',
      emoji: overlay.emoji ?? baseKey.emoji ?? '',
      icon: overlay.icon ?? baseKey.icon ?? '',
      // NEW icon styling fields (with sensible defaults)
      iconColor: overlay.iconColor ?? baseKey.iconColor ?? '#ffffff',
      iconSize: overlay.iconSize ?? baseKey.iconSize ?? 32
    };
  }, [baseKey, overlay, palette, baseIndex, placeholderText]);

  const isMW = active && String(active.id) === String(mwId);
  const upOverlay   = keyData[mwUpId]   || {};
  const downOverlay = keyData[mwDownId] || {};
  const upColor   = upOverlay.color   ?? (palette[(baseIndex >= 0 ? baseIndex : 0) % palette.length]);
  const downColor = downOverlay.color ?? (palette[((baseIndex >= 0 ? baseIndex : 0) + 1) % palette.length]);
  const upLabel   = upOverlay.label   ?? 'Mouse Wheel Up';
  const downLabel = downOverlay.label ?? 'Mouse Wheel Down';

  // ---------------- Bulk-apply controls ----------------
  const [apply, setApply] = useState({
    color: true,
    zone: true,
    label: false,
    subtitle: false,
    emojiIcon: true,
    image: false,
    imageMode: true,
    iconStyling: true // new: color/size of icon
  });
  const setApplyFlag = (name) => setApply(a => ({ ...a, [name]: !a[name] }));

  function updateMany(ids, patch) {
    useStore.setState(st => {
      const kd = { ...(st.keyData || {}) };
      ids.forEach(id => { kd[id] = { ...(kd[id] || {}), ...patch }; });
      return { keyData: kd };
    });
  }
  function updateSingle(id, patch) {
    if (!id) return;
    useStore.setState(st => ({
      keyData: { ...(st.keyData || {}), [id]: { ...(st.keyData?.[id] || {}), ...patch } }
    }));
  }
  function updateWithRules(patch, kind) {
    const ids = multiActive ? (selection.length ? selection : (selectedId ? [selectedId] : [])) : (selectedId ? [selectedId] : []);
    if (!ids.length) return;

    if (multiActive) {
      if (kind === 'color'      && !apply.color)      return updateSingle(ids[0], patch);
      if (kind === 'zone'       && !apply.zone)       return updateSingle(ids[0], patch);
      if (kind === 'label'      && !apply.label)      return updateSingle(ids[0], patch);
      if (kind === 'subtitle'   && !apply.subtitle)   return updateSingle(ids[0], patch);
      if (kind === 'emojiIcon'  && !apply.emojiIcon)  return updateSingle(ids[0], patch);
      if (kind === 'image'      && !apply.image)      return updateSingle(ids[0], patch);
      if (kind === 'imageMode'  && !apply.imageMode)  return updateSingle(ids[0], patch);
      if (kind === 'iconStyling'&& !apply.iconStyling)return updateSingle(ids[0], patch);
      return updateMany(ids, patch);
    }
    return updateSingle(ids[0], patch);
  }

  // split-wheel helpers
  const isMWSelected = !!isMW;
  function updateMWHalf(which, patch) {
    const target = which === 'up' ? mwUpId : mwDownId;
    updateSingle(target, patch);
  }

  // ---------------- Emoji & Icon overlays ----------------
  const [emojiOpen, setEmojiOpen] = useState(false);

  // RPG Awesome — discover the full library from the loaded CSS
  const [iconOpen, setIconOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState('');
  const [allIcons, setAllIcons] = useState([]);

  useEffect(() => {
    // Parse CSSOM for selectors like `.ra-xyz:before` or `.ra-xyz`
    function harvestIcons() {
      const set = new Set();
      for (const sheet of Array.from(document.styleSheets || [])) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          // Likely cross-origin; skip it.
          continue;
        }
        if (!rules) continue;
        for (const r of Array.from(rules)) {
          const sel = r.selectorText || '';
          if (!sel) continue;
          // Collect `.ra-<name>` occurrences from any selector list
          sel.split(',').forEach(s => {
            const m = s.trim().match(/\.ra-([a-z0-9-]+)/i);
            if (m && m[1]) set.add(`ra-${m[1]}`);
          });
        }
      }
      return Array.from(set).sort();
    }
    const list = harvestIcons();
    setAllIcons(list);
  }, []);

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return allIcons;
    return allIcons.filter(cls => cls.toLowerCase().includes(q));
  }, [allIcons, iconQuery]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!panelRef.current) return;
      const inOverlay = e.target.closest?.('.panelOverlay');
      if (!inOverlay) { setEmojiOpen(false); setIconOpen(false); }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, []);

  if (!active) {
    return (
      <div ref={panelRef} className="inspectorWrap" style={{ padding: 10 }}>
        <div className="section">
          <h3 className="muted" style={{ margin: '6px 0' }}>Key preview</h3>
          <div className="key-preview center"><span className="muted">Select a key</span></div>
        </div>
      </div>
    );
  }

  const usingIcon = !!active.icon;
  const usingEmoji = !!active.emoji;

  // label offset when emoji/icon present; scale a bit with icon size for balance
  const labelOffset = usingIcon
    ? Math.min(Number(active.iconSize) || 32, 44) // cap so it doesn't push too far
    : (usingEmoji ? 26 : 0);

  return (
    <div ref={panelRef} className="inspectorWrap" style={{ padding: 10, position:'relative' }}>
      {/* Preview */}
      <div className="section" style={{ paddingBottom: 8 }}>
        <h3 style={{ margin:'6px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>Key preview</span>
          {multiActive && selection.length > 1 && (
            <span className="muted" style={{ fontSize:12 }}>Bulk editing {selection.length} keys</span>
          )}
        </h3>
        <div className="key-preview" style={{ display:'flex', alignItems:'center', justifyContent:'center', height: 180 }}>
          {!isMWSelected ? (
            <div
              className="key-tile"
              style={{
                width: active.w, height: active.h, borderRadius: 18, position: 'relative',
                background: active.color,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                boxShadow:'inset 0 1px 0 rgba(255,255,255,.15), inset 0 -10px 20px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.35)'
              }}
            >
              {showNumbers && active.num != null && (
                <div className="num num-pill" style={{ position:'absolute', zIndex:3 }}>{active.num}</div>
              )}

              {active.imageUrl && active.imageMode === 'cover' && (
                <img
                  alt=""
                  src={active.imageUrl}
                  style={{
                    position:'absolute', inset:0, width:'100%', height:'100%',
                    objectFit:'cover', borderRadius:18, opacity:.95,
                    zIndex:0, pointerEvents:'none'
                  }}
                />
              )}
              {active.imageUrl && active.imageMode === 'icon' && (
                <img
                  alt=""
                  src={active.imageUrl}
                  style={{
                    position:'absolute', top:8, right:8, width:26, height:26,
                    borderRadius:8, objectFit:'cover', boxShadow:'0 2px 10px rgba(0,0,0,.4)',
                    zIndex:1, pointerEvents:'none'
                  }}
                />
              )}

              {usingEmoji && !usingIcon && (
                <div style={{ position:'absolute', top:10, left:0, right:0, display:'flex', justifyContent:'center', zIndex:2 }}>
                  <span style={{ fontSize:28, filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>{active.emoji}</span>
                </div>
              )}
              {usingIcon && !usingEmoji && (
                <div style={{ position:'absolute', top:12, left:0, right:0, display:'flex', justifyContent:'center', zIndex:2 }}>
                  <i
                    className={`ra ${active.icon}`}
                    style={{
                      fontSize: Number(active.iconSize) || 32,
                      color: active.iconColor,
                      lineHeight: 1,
                      filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))'
                    }}
                  />
                </div>
              )}

              <div className="label" style={{ marginTop: labelOffset, position:'relative', zIndex:2 }}>
                {active.displayLabel}
              </div>
              {active.subtitle ? <div className="subtitle" style={{ position:'relative', zIndex:2 }}>{active.subtitle}</div> : null}
            </div>
          ) : (
            // split preview like BoardCanvas SplitWheel
            <div
              className="key-tile"
              style={{
                width: active.w, height: active.h, borderRadius: 18, position: 'relative',
                background: '#0000', boxShadow:'0 12px 40px rgba(0,0,0,.35)', overflow:'hidden'
              }}
            >
              <div style={{
                position:'absolute', left:0, top:0, width:'100%', height:'50%',
                background: upColor, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <div className="label" style={{ fontWeight:700, textShadow:'0 1px 0 rgba(0,0,0,.45)', position:'relative', zIndex:2 }}>{upLabel}</div>
              </div>
              <div style={{ position:'absolute', left:0, top:'50%', width:'100%', height:2, background:'rgba(0,0,0,.25)' }} />
              <div style={{
                position:'absolute', left:0, top:'50%', width:'100%', height:'50%',
                background: downColor, color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center'
              }}>
                <div className="label" style={{ fontWeight:700, textShadow:'0 1px 0 rgba(0,0,0,.45)', position:'relative', zIndex:2 }}>{downLabel}</div>
              </div>
              {showNumbers && active.num != null && (
                <div className="num num-pill" style={{ position:'absolute', zIndex:3 }}>{active.num}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk-apply chips */}
      {multiActive && selection.length > 0 && (
        <div className="section" style={{ paddingTop: 6 }}>
          <div className="bulkBar">
            <span className="muted" style={{ fontSize:12, marginRight:6 }}>Apply to selected:</span>
            <Chip on={apply.color}        onToggle={() => setApplyFlag('color')}>Color</Chip>
            <Chip on={apply.zone}         onToggle={() => setApplyFlag('zone')}>Zone</Chip>
            <Chip on={apply.label}        onToggle={() => setApplyFlag('label')}>Label</Chip>
            <Chip on={apply.subtitle}     onToggle={() => setApplyFlag('subtitle')}>Subtitle</Chip>
            <Chip on={apply.emojiIcon}    onToggle={() => setApplyFlag('emojiIcon')}>Emoji/Icon</Chip>
            <Chip on={apply.image}        onToggle={() => setApplyFlag('image')}>Image</Chip>
            <Chip on={apply.imageMode}    onToggle={() => setApplyFlag('imageMode')}>Image Mode</Chip>
            <Chip on={apply.iconStyling}  onToggle={() => setApplyFlag('iconStyling')}>Icon Style</Chip>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="section" style={{ paddingTop: 6 }}>
        <h3 style={{ margin:'6px 0' }}>Key details</h3>
        {!isMWSelected ? (
          <div className="grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="field">
              <label>Label</label>
              <input
                className="input"
                value={active.label}
                placeholder={placeholderText || 'Label'}
                onChange={(e) => updateWithRules({ label: e.target.value }, 'label')}
              />
            </div>
            <div className="field">
              <label>Subtitle</label>
              <input
                className="input"
                value={active.subtitle}
                placeholder="Subtitle"
                onChange={(e) => updateWithRules({ subtitle: e.target.value }, 'subtitle')}
              />
            </div>
            <div className="field">
              <label>Zone</label>
              {/* A combo box for zones: shows existing zones and allows free entry. When selecting an existing
                  zone, the key color will update to match that zone's color. */}
              <input
                className="input"
                list="zone-options-desktop"
                placeholder="e.g., Combat, Movement..."
                value={active.zone}
                onChange={(e) => {
                  const val = e.target.value;
                  // When assigning to an existing zone, update color to match that zone.
                  const allZones = s.zones || {};
                  const zoneIds = (allZones && val && allZones[val]) || null;
                  if (zoneIds && zoneIds.length) {
                    // Determine color from first key in the zone (overlay or base)
                    const st = useStore.getState();
                    const id0 = zoneIds[0];
                    const kd = st.keyData?.[id0] || {};
                    let color = kd.color;
                    if (!color) {
                      const layout = currentLayout?.(st.device);
                      const base = Array.isArray(layout?.keys) ? layout.keys.find(k => String(k.id) === String(id0)) : null;
                      color = base?.color;
                    }
                    // apply both zone and color if color is found; otherwise just zone
                    const patch = { zone: val };
                    if (color) patch.color = color;
                    updateWithRules(patch, 'zone');
                  } else {
                    // new or empty zone: just update zone
                    updateWithRules({ zone: val }, 'zone');
                  }
                }}
              />
              <datalist id="zone-options-desktop">
                {Object.keys(s.zones || {}).map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label>Key Color</label>
              <input
                type="color"
                className="color-input"
                value={active.color}
                onChange={(e) => updateWithRules({ color: e.target.value }, 'color')}
              />
            </div>
          </div>
        ) : (
          <div className="grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="field">
              <label>Wheel Up – Label</label>
              <input
                className="input"
                value={upOverlay.label ?? ''}
                placeholder="Mouse Wheel Up"
                onChange={(e)=>updateMWHalf('up', { label: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Wheel Down – Label</label>
              <input
                className="input"
                value={downOverlay.label ?? ''}
                placeholder="Mouse Wheel Down"
                onChange={(e)=>updateMWHalf('down', { label: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Wheel Up – Color</label>
              <input
                type="color"
                className="color-input"
                value={upOverlay.color ?? upColor}
                onChange={(e)=>updateMWHalf('up', { color: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Wheel Down – Color</label>
              <input
                type="color"
                className="color-input"
                value={downOverlay.color ?? downColor}
                onChange={(e)=>updateMWHalf('down', { color: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Media */}
      {!isMWSelected && (
        <div className="section" style={{ paddingTop: 6 }}>
          <h3 style={{ margin:'6px 0' }}>Media</h3>
          <div className="grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, alignItems:'start' }}>
            <div className="field">
              <label>Emoji / Icon</label>
              <div className="row" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <button className="btn mini"
                  onClick={() => { setEmojiOpen(true); setIconOpen(false); }}
                  title="Pick Emoji" style={{ minWidth:56 }}>
                  {active.emoji ? <span style={{ fontSize:18 }}>{active.emoji}</span> : 'Pick Emoji'}
                </button>
                <button className="btn mini"
                  onClick={() => { setIconOpen(true); setEmojiOpen(false); }}
                  title="Pick Icon" disabled={!!active.emoji} style={{ minWidth:56 }}>
                  {active.icon ? <i className={`ra ${active.icon}`} style={{ fontSize:18 }} /> : 'Pick Icon'}
                </button>
                {active.emoji && <button className="btn mini" onClick={() => updateWithRules({ emoji:'' }, 'emojiIcon')}>Clear Emoji</button>}
                {active.icon   && <button className="btn mini" onClick={() => updateWithRules({ icon:'', iconColor:'#ffffff', iconSize:32 }, 'emojiIcon')}>Clear Icon</button>}
              </div>

              {/* Icon styling controls — only show when an icon is present */}
              {active.icon && (
                <div className="grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
                  <div className="field">
                    <label>Icon color</label>
                    <input
                      type="color"
                      className="color-input"
                      value={active.iconColor}
                      onChange={(e)=>updateWithRules({ iconColor: e.target.value }, 'iconStyling')}
                    />
                  </div>
                  <div className="field">
                    <label>Icon size</label>
                    <input
                      type="range" min="16" max="64" step="1"
                      value={active.iconSize}
                      onChange={(e)=>updateWithRules({ iconSize: Number(e.target.value) }, 'iconStyling')}
                    />
                  </div>
                </div>
              )}

              <div className="muted" style={{ fontSize:12, marginTop:6 }}>
                Emoji and Icon are exclusive. Images can be used with either.
              </div>
            </div>

            <div className="field">
              <label>Image</label>
              <div className="row" style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input
                  type="file" accept="image/*" className="input"
                  onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => updateWithRules({ imageUrl: reader.result }, 'image');
                    reader.readAsDataURL(f);
                  }}
                />
                {active.imageUrl && <button className="btn mini" onClick={() => updateWithRules({ imageUrl:'' }, 'image')}>Remove</button>}
              </div>
              <div className="field" style={{ marginTop:8 }}>
                <label>Image mode</label>
                <select
                  className="input"
                  value={active.imageMode}
                  onChange={(e) => updateWithRules({ imageMode: e.target.value }, 'imageMode')}
                >
                  <option value="cover">Cover</option>
                  <option value="icon">Icon (top-right)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emoji overlay */}
      {emojiOpen && (
        <div className="panelOverlay" role="dialog" aria-label="Emoji picker">
          <div className="panelOverlayInner" style={{ display:'flex' }}>
            <EmojiPicker
              theme="dark"
              width="100%"
              height="100%"
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
              onEmojiClick={(emojiData) => {
                updateWithRules({ emoji: emojiData.emoji, icon:'' }, 'emojiIcon');
                setEmojiOpen(false);
              }}
            />
          </div>
          <div className="panelOverlayFooter">
            <button className="btn" style={{ width:'100%' }} onClick={() => setEmojiOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Icon overlay (RPG Awesome) */}
      {iconOpen && (
        <div className="panelOverlay" role="dialog" aria-label="Icon picker">
          <div className="panelOverlayInner">
            <div className="row" style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input className="input" placeholder="Search icons…" value={iconQuery} onChange={(e)=>setIconQuery(e.target.value)} />
              <button className="btn mini" onClick={()=>{ updateWithRules({ icon:'' }, 'emojiIcon'); }}>None</button>
            </div>

            {allIcons.length === 0 && (
              <div className="muted" style={{ marginBottom:8, fontSize:12 }}>
                Couldn’t enumerate icons from CSS (likely a cross-origin stylesheet). Serve RPG Awesome CSS from the same origin to populate this list.
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:10, maxHeight:360, overflow:'auto' }}>
              {filteredIcons.map(cls => (
                <button
                  key={cls}
                  className="btn mini"
                  title={cls}
                  onClick={() => { updateWithRules({ icon:cls, emoji:'' }, 'emojiIcon'); setIconOpen(false); }}
                >
                  <i className={`ra ${cls}`} style={{ fontSize:20 }} />
                </button>
              ))}
            </div>

            <div className="muted" style={{ marginTop:8, fontSize:12 }}>
              Make sure RPG Awesome CSS is loaded to see icons.
            </div>
          </div>
          <div className="panelOverlayFooter">
            <button className="btn" style={{ width:'100%' }} onClick={() => setIconOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ on, onToggle, children }) {
  return (
    <button
      className="applyChip"
      data-active={on ? 'true' : 'false'}
      onClick={onToggle}
      type="button"
      title={on ? 'Will apply' : 'Won’t apply'}
    >
      {children}
    </button>
  );
}

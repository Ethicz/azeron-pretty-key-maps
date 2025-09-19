// src/components/MobileInspector.jsx
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

export default function MobileInspector() {
  const s = useStore();
  const open = !!s.isMobileInspectorOpen;

  const selection = s.selection || [];
  const selectedId = s.mobileInspectorKeyId || selection[0] || null;
  const multiActive = (s.multiSelect ?? s.multi) || false;

  const device = s.device;
  const themeId = s.themeId;
  const randomPalette = s.randomPalette;
  const showNumbers = s.showNumbers;
  const invert = !!s.invert;

  // Split-wheel ids (align with BoardCanvas)
  const mwId     = s.mwId     || 'MW';
  const mwUpId   = s.mwUpId   || 'MW_UP';
  const mwDownId = s.mwDownId || 'MW_DOWN';

  const topbarH = s.topbarH || 56;

  // Bulk-apply toggles (includes iconStyling)
  //
  // By default, none of the attributes are selected.  The user can toggle
  // individual chips on to copy that property to other selected keys.  This
  // matches the classic design where chips start as greyed-out pills rather
  // than being pre-selected.  See styles.css for visual details.
  const [apply, setApply] = useState({
    color: false,
    zone: false,
    label: false,
    subtitle: false,
    emojiIcon: false,
    image: false,
    imageMode: false,
    iconStyling: false
  });
  function setApplyFlag(name) { setApply(a => ({ ...a, [name]: !a[name] })); }

  // Lock board dragging while open (canvas still scrolls independently)
  useEffect(() => {
    if (!open) return;
    const prev = useStore.getState().lock;
    useStore.setState({ lock: true });
    return () => useStore.setState({ lock: prev });
  }, [open]);

  // Layout + base keys
  const def = useMemo(() => currentLayout?.(device) || {}, [device]);
  const baseArr = useMemo(() => {
    const arr = Array.isArray(def.keys) ? def.keys : [];
    return arr.filter(k => !k.blank);
  }, [def]);

  const keyData = useStore(st => st.keyData) || {};

  // palette
  const palette = useMemo(() => {
    const t = (THEMES || []).find(t => t.id === themeId);
    return (randomPalette?.length
      ? randomPalette
      : (t?.keys ? t.keys.split(',').map(s => s.trim()) : DEFAULT_RAINBOW)
    );
  }, [themeId, randomPalette]);

  // Sync our pointer to the active key with selection
  useEffect(() => {
    if (!open) return;
    if (selection.length) {
      useStore.setState({ mobileInspectorKeyId: selection[0] });
    }
  }, [open, selection]);

  // Ensure a valid starting selection when panel opens / device changes
  useEffect(() => {
    if (!open) return;
    const arr = Array.isArray(baseArr) ? baseArr : [];
    if (!arr.length) return;
    const current = selectedId && arr.some(k => String(k.id) === String(selectedId))
      ? selectedId
      : arr[0].id;
    if (current !== selectedId || !selection.length) {
      useStore.setState({ mobileInspectorKeyId: current, selection: [current] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, device]);

  // Merge the active key (mirror BoardCanvas logic)
  const selectedIndex = useMemo(
    () => baseArr.findIndex(k => String(k.id) === String(selectedId)),
    [baseArr, selectedId]
  );
  const active = useMemo(() => {
    if (selectedIndex < 0) return null;
    const base = baseArr[selectedIndex];
    const overlay = keyData[base.id] || {};
    const color = overlay.color ?? base.color ?? palette[selectedIndex % palette.length];
    return {
      id: base.id,
      num: (Number(base.num ?? base.id) || null),
      w: overlay.w ?? base.w ?? 100,
      h: overlay.h ?? base.h ?? 140,
      label: (overlay.label ?? base.label ?? ''),
      subtitle: (overlay.subtitle ?? base.subtitle ?? ''),
      color,
      zone: overlay.zone ?? base.zone ?? '',
      imageUrl: overlay.imageUrl ?? base.imageUrl ?? '',
      imageMode: overlay.imageMode ?? base.imageMode ?? 'cover',
      emoji: overlay.emoji ?? base.emoji ?? '',
      icon: overlay.icon ?? base.icon ?? '',
      iconColor: overlay.iconColor ?? base.iconColor ?? '#ffffff',
      iconSize: overlay.iconSize ?? base.iconSize ?? 28
    };
  }, [selectedIndex, baseArr, keyData, palette]);

  const isMW = active && String(active.id) === String(mwId);
  const upOverlay   = keyData[mwUpId]   || {};
  const downOverlay = keyData[mwDownId] || {};
  const upColor   = upOverlay.color   ?? (palette[(selectedIndex >= 0 ? selectedIndex : 0) % palette.length]);
  const downColor = downOverlay.color ?? (palette[((selectedIndex >= 0 ? selectedIndex : 0) + 1) % palette.length]);
  const upLabel   = upOverlay.label   ?? 'Mouse Wheel Up';
  const downLabel = downOverlay.label ?? 'Mouse Wheel Down';

  // ---------- ORDERED NAVIGATION (column-first, then row; respects Invert) ----------
  const orderedIds = useMemo(() => {
    if (!Array.isArray(baseArr) || baseArr.length === 0) return [];
    const enriched = baseArr.map((bk, i) => {
      const o = keyData[bk.id] || {};
      const w = o.w ?? bk.w ?? 100;
      const h = o.h ?? bk.h ?? 140;
      const x = o.x ?? bk.x ?? 0;
      const y = o.y ?? bk.y ?? 0;
      return { id: bk.id, x, y, w, h, idx: i };
    });
    const sorted = enriched.slice().sort((a, b) => {
      const ax = invert ? -a.x : a.x;
      const bx = invert ? -b.x : b.x;
      if (ax !== bx) return ax - bx;
      if (a.y !== b.y) return a.y - b.y;
      return a.idx - b.idx;
    });
    return sorted.map(k => k.id);
  }, [baseArr, keyData, invert]);

  function moveSelection(step) {
    if (!orderedIds.length) return;
    const currId = selectedId ?? orderedIds[0];
    let idx = orderedIds.findIndex(id => String(id) === String(currId));
    if (idx < 0) idx = 0;
    const nextIdx = (idx + step + orderedIds.length) % orderedIds.length;
    const nextId = orderedIds[nextIdx];
    const set = new Set(selection);
    if (multiActive) set.add(nextId);
    useStore.setState({
      selection: multiActive ? Array.from(set) : [nextId],
      mobileInspectorKeyId: nextId
    });
  }
  const goLeft  = () => moveSelection(-1);
  const goRight = () => moveSelection(+1);

  // Swipe to navigate keys
  const swipeRef = useRef({ x:0, y:0, active:false });
  function onTouchStart(e) {
    const t = e.touches[0]; swipeRef.current = { x: t.clientX, y: t.clientY, active:true };
  }
  function onTouchEnd(e) {
    if (!swipeRef.current.active) return;
    const changed = e.changedTouches[0];
    const dx = (changed.clientX - swipeRef.current.x);
    const dy = (changed.clientY - swipeRef.current.y);
    swipeRef.current.active = false;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goLeft(); else goRight();
    }
  }

  // apply helpers
  function updateMany(ids, patch) {
    useStore.setState(st => {
      const kd = { ...(st.keyData || {}) };
      ids.forEach(id => { kd[id] = { ...(kd[id] || {}), ...patch }; });
      return { keyData: kd };
    });
  }
  function updateSingle(id, patch) {
    useStore.setState(st => ({ keyData: { ...(st.keyData || {}), [id]: { ...(st.keyData?.[id] || {}), ...patch } } }));
  }
  function updateWithRules(patch, kind) {
    const ids = multiActive ? (selection.length ? selection : (active ? [active.id] : [])) : (active ? [active.id] : []);
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

  // emoji/icon overlays
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [iconQuery, setIconQuery] = useState('');

  // RPG Awesome — discover the full library from the loaded CSS (works if CSS is same-origin)
  const [allIcons, setAllIcons] = useState([]);
  useEffect(() => {
    function harvestIcons() {
      const set = new Set();
      for (const sheet of Array.from(document.styleSheets || [])) {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          // Cross-origin stylesheet: skip it.
          continue;
        }
        if (!rules) continue;
        for (const r of Array.from(rules)) {
          const sel = r.selectorText || '';
          if (sel && /\.ra-[a-z0-9-]+/i.test(sel)) {
            sel.split(',').forEach(s => {
              const m = s.trim().match(/\.ra-([a-z0-9-]+)/i);
              if (m) set.add(`ra-${m[1]}`);
            });
          }
        }
      }
      // Filter out the base ".ra" and sort for stable UI
      return Array.from(set).filter(n => n !== 'ra').sort();
    }
    const list = harvestIcons();
    setAllIcons(list);
  }, []);

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    if (!q) return allIcons;
    return allIcons.filter(cls => cls.toLowerCase().includes(q));
  }, [allIcons, iconQuery]);

  const close = () => useStore.setState({ isMobileInspectorOpen: false });

  if (!open) return null;

  // display label for preview (placeholder visible but not written into state)
  const displayLabel = active?.label?.trim().length
    ? active.label
    : PLACEHOLDERS[(selectedIndex >= 0 ? selectedIndex : 0) % PLACEHOLDERS.length];

  /* --- Body ref and scroll-to-top helper --- */
  // Ref for the scrollable body. Needed to scroll back to the top from a
  // floating button. See scrollToTop().
  const bodyRef = useRef(null);

  function scrollToTop() {
    const el = bodyRef.current;
    if (el) {
      // Smoothly scroll back to the top of the inspector
      el.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div
      className={`mobiInspWrap${open ? ' open' : ''}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mobiInspHeader">
        <button className="btn mini" onClick={close}>Close</button>
        <div className="mobiInspTitle">
          {active && showNumbers && active.num != null && (
            <span className="applyChip" data-active="true">#{active.num}</span>
          )}
          <div className="applyChip" style={{ background: active?.color || '#333', color:'#fff', whiteSpace:'nowrap' }}>
            {(active ? (active.label || displayLabel) : 'Key').slice(0,18)}
          </div>
        </div>
        <div className="navBtns">
          <button className="iconbtn" aria-label="Prev" onClick={goLeft}>‹</button>
          <button className="iconbtn" aria-label="Next" onClick={goRight}>›</button>
        </div>
      </div>

      <div className="mobiInspBody" ref={bodyRef}>
        {!active ? (
          <div className="muted">Select a key…</div>
        ) : (
          <>
            {/* Preview */}
            <div className="section" style={{ paddingBottom: 8, margin: 0 }}>
              <h3 style={{ margin:'6px 0' }}>Key preview</h3>
              <div className="key-preview" style={{ display:'flex', alignItems:'center', justifyContent:'center', height: 160 }}>
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
                      <div className="num num-pill" style={{ zIndex: 3, position:'absolute' }}>{active.num}</div>
                    )}

                    {active.imageUrl && active.imageMode === 'cover' && (
                      <img
                        alt=""
                        src={active.imageUrl}
                        style={{
                          position:'absolute', inset:0, width:'100%', height:'100%',
                          objectFit:'cover', borderRadius:18, opacity:.95,
                          zIndex: 0, pointerEvents:'none'
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
                          zIndex: 2, pointerEvents:'none'
                        }}
                      />
                    )}

                    {active.emoji && !active.icon && (
                      <div style={{ position:'absolute', top:10, left:0, right:0, display:'flex', justifyContent:'center', zIndex:2 }}>
                        <span style={{ fontSize:24, filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>{active.emoji}</span>
                      </div>
                    )}
                    {active.icon && !active.emoji && (
                      <div style={{ position:'absolute', top:10, left:0, right:0, display:'flex', justifyContent:'center', zIndex:2 }}>
                        <i
                          className={`ra ${active.icon}`}
                          style={{
                            fontSize: Number(active.iconSize) || 28,
                            color: active.iconColor || '#fff',
                            lineHeight: 1,
                            filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))'
                          }}
                        />
                      </div>
                    )}

                    <div className="label" style={{ marginTop:(active.emoji || active.icon) ? 24 : 0, position:'relative', zIndex:2 }}>
                      {active.label || displayLabel}
                    </div>
                    {active.subtitle ? (
                      <div className="subtitle" style={{ position:'relative', zIndex:2 }}>{active.subtitle}</div>
                    ) : null}
                  </div>
                ) : (
                  // Split preview like BoardCanvas SplitWheel
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
                      <div className="label" style={{ fontWeight:700, textShadow:'0 1px 0 rgba(0,0,0,.45)' }}>{upLabel}</div>
                    </div>
                    <div style={{ position:'absolute', left:0, top:'50%', width:'100%', height:2, background:'rgba(0,0,0,.25)' }} />
                    <div style={{
                      position:'absolute', left:0, top:'50%', width:'100%', height:'50%',
                      background: downColor, color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                      <div className="label" style={{ fontWeight:700, textShadow:'0 1px 0 rgba(0,0,0,.45)' }}>{downLabel}</div>
                    </div>
                    {showNumbers && active.num != null && (<div className="num num-pill">{active.num}</div>)}
                  </div>
                )}
              </div>
            </div>

            {/* Bulk-apply chips */}
            {selection.length > 0 && (
              <div className="section" style={{ paddingTop: 6, margin: 0 }}>
                <div className="bulkBar" style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                  <span className="muted" style={{ fontSize:12, marginRight:6 }}>Apply to selected:</span>
                  <button className="applyChip" data-active={apply.color ? 'true' : 'false'} onClick={()=>setApplyFlag('color')}>Color</button>
                  <button className="applyChip" data-active={apply.zone ? 'true' : 'false'} onClick={()=>setApplyFlag('zone')}>Zone</button>
                  <button className="applyChip" data-active={apply.label ? 'true' : 'false'} onClick={()=>setApplyFlag('label')}>Label</button>
                  <button className="applyChip" data-active={apply.subtitle ? 'true' : 'false'} onClick={()=>setApplyFlag('subtitle')}>Subtitle</button>
                  <button className="applyChip" data-active={apply.emojiIcon ? 'true' : 'false'} onClick={()=>setApplyFlag('emojiIcon')}>Emoji/Icon</button>
                  <button className="applyChip" data-active={apply.image ? 'true' : 'false'} onClick={()=>setApplyFlag('image')}>Image</button>
                  <button className="applyChip" data-active={apply.imageMode ? 'true' : 'false'} onClick={()=>setApplyFlag('imageMode')}>Image Mode</button>
                  <button className="applyChip" data-active={apply.iconStyling ? 'true' : 'false'} onClick={()=>setApplyFlag('iconStyling')}>Icon Style</button>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="section" style={{ paddingTop: 6, margin: 0 }}>
              <h3 style={{ margin:'6px 0' }}>Key details</h3>
              {!isMWSelected ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div className="field">
                    <label>Label</label>
                    <input className="input" value={active.label} onChange={(e)=>updateWithRules({ label: e.target.value }, 'label')} />
                  </div>
                  <div className="field">
                    <label>Subtitle</label>
                    <input className="input" value={active.subtitle} onChange={(e)=>updateWithRules({ subtitle: e.target.value }, 'subtitle')} />
                  </div>
                  <div className="field">
                    <label>Zone</label>
                    <input
                      className="input"
                      list="zone-options-mobile"
                      value={active.zone}
                      placeholder="e.g., Combat"
                      onChange={(e) => {
                        const val = e.target.value;
                        const allZones = s.zones || {};
                        const zoneIds = (allZones && val && allZones[val]) || null;
                        if (zoneIds && zoneIds.length) {
                          const st = useStore.getState();
                          const id0 = zoneIds[0];
                          const kd = st.keyData?.[id0] || {};
                          let color = kd.color;
                          if (!color) {
                            const layout = currentLayout?.(st.device);
                            const base = Array.isArray(layout?.keys) ? layout.keys.find(k => String(k.id) === String(id0)) : null;
                            color = base?.color;
                          }
                          const patch = { zone: val };
                          if (color) patch.color = color;
                          updateWithRules(patch, 'zone');
                        } else {
                          updateWithRules({ zone: val }, 'zone');
                        }
                      }}
                    />
                    <datalist id="zone-options-mobile">
                      {Object.keys(s.zones || {}).map((z) => (
                        <option key={z} value={z} />
                      ))}
                    </datalist>
                  </div>
                  <div className="field">
                    <label>Key Color</label>
                    <input type="color" className="color-input" value={active.color} onChange={(e)=>updateWithRules({ color: e.target.value }, 'color')} />
                  </div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <div className="field">
                    <label>Wheel Up – Label</label>
                    <input className="input" value={upOverlay.label ?? ''} placeholder="Mouse Wheel Up"
                           onChange={(e)=>updateMWHalf('up', { label: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Wheel Down – Label</label>
                    <input className="input" value={downOverlay.label ?? ''} placeholder="Mouse Wheel Down"
                           onChange={(e)=>updateMWHalf('down', { label: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Wheel Up – Color</label>
                    <input type="color" className="color-input" value={upOverlay.color ?? upColor}
                           onChange={(e)=>updateMWHalf('up', { color: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>Wheel Down – Color</label>
                    <input type="color" className="color-input" value={downOverlay.color ?? downColor}
                           onChange={(e)=>updateMWHalf('down', { color: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            {/* Media */}
            {!isMWSelected && (
              <div className="section" style={{ paddingTop: 6, margin: 0 }}>
                <h3 style={{ margin:'6px 0' }}>Media</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, alignItems:'start' }}>
                  <div className="field">
                    <label>Emoji / Icon</label>
                    <div className="row" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <button className="btn mini" onClick={() => { setEmojiOpen(true); setIconOpen(false); }} title="Pick Emoji" style={{ minWidth:56 }}>
                        {active.emoji ? <span style={{ fontSize:18 }}>{active.emoji}</span> : 'Pick Emoji'}
                      </button>
                      <button className="btn mini" onClick={() => { setIconOpen(true); setEmojiOpen(false); }} title="Pick Icon" disabled={!!active.emoji} style={{ minWidth:56 }}>
                        {active.icon ? <i className={`ra ${active.icon}`} style={{ fontSize:18 }} /> : 'Pick Icon'}
                      </button>
                      {active.emoji && <button className="btn mini" onClick={() => updateWithRules({ emoji:'' }, 'emojiIcon')}>Clear Emoji</button>}
                      {active.icon   && <button className="btn mini" onClick={() => updateWithRules({ icon:'', iconColor:'#ffffff', iconSize:28 }, 'emojiIcon')}>Clear Icon</button>}
                    </div>

                    {(active.icon && !active.emoji) && (
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
          </>
        )}
      </div>

      {/* Back to top button for long inspectors
          When the panel content is lengthy, allow users to quickly scroll
          back to the start. It appears near the bottom-right of the screen
          and only renders when the inspector is open. */}
      {open && (
        <button
          className="btn mini"
          onClick={scrollToTop}
          title="Back to top"
          style={{
            position: 'fixed',
            right: 20,
            bottom: 80,
            zIndex: 200,
            opacity: 0.9
          }}
        >↑ Top</button>
      )}

      {/* Emoji overlay (emoji-picker-react) */}
      {emojiOpen && (
        <div className="panelOverlay" role="dialog" aria-label="Emoji picker" style={{ position:'fixed', inset:0, zIndex:101 }}>
          <div className="panelOverlayInner" style={{ display:'flex' }}>
            <EmojiPicker
              theme="dark"
              lazyLoadEmojis
              width="100%"
              height="100%"
              previewConfig={{ showPreview: false }}
              onEmojiClick={(emojiData/*, event */) => {
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
        <div className="panelOverlay" role="dialog" aria-label="Icon picker" style={{ position:'fixed', inset:0, zIndex:101 }}>
          <div className="panelOverlayInner">
            <div className="row" style={{ display:'flex', gap:8, marginBottom:8 }}>
              <input className="input" placeholder="Search icons…" value={iconQuery} onChange={(e)=>setIconQuery(e.target.value)} />
              <button className="btn mini" onClick={()=>{ updateWithRules({ icon:'' }, 'emojiIcon'); }}>None</button>
            </div>

            {allIcons.length === 0 && (
              <div className="muted" style={{ marginBottom:8, fontSize:12 }}>
                Couldn’t enumerate icons from CSS (likely a cross-origin stylesheet). Serve the RPG Awesome CSS from the same origin to list all icons.
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:10, maxHeight:360, overflow:'auto' }}>
              {filteredIcons.map(cls => (
                <button key={cls} className="btn mini" title={cls}
                        onClick={()=>{ updateWithRules({ icon:cls, emoji:'' }, 'emojiIcon'); setIconOpen(false); }}>
                  <i className={`ra ${cls}`} style={{ fontSize:20 }} />
                </button>
              ))}
            </div>

            <div className="panelOverlayFooter" style={{ marginTop:8 }}>
              <button className="btn" style={{ width:'100%' }} onClick={() => setIconOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

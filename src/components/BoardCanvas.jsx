// src/components/BoardCanvas.jsx
// Live board canvas:
// - Centers layout horizontally/vertically (accounts for legend/HUD).
// - Lock blocks key dragging only (panning still via space/middle/right).
// - Analog stick never triggers canvas panning.
// - Split mouse wheel renders as two halves (Up/Down) with independent labels/colors.
// - Legend clamps to two lines with “+N more” popover (handled by ZoneLegend).

import React, {
  forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState
} from 'react';
import { useStore, useDispatch } from '../lib/store.jsx'; // history commit on drag-end
import { currentLayout } from '../layouts/index.js';
import { THEMES, BASE } from '../lib/themes.js';
import AnalogStick from './widgets/AnalogStick.jsx';
import ZoneLegend from './ZoneLegend.jsx';
import ContextMenu from './widgets/ContextMenu.jsx';

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

const GRID_STEP = 20;
const DEF_W = 100, DEF_H = 140;
const ANALOG_W = 240, ANALOG_H = 280;

/* label fit (single-line first; two-line fallback, no mid-word breaks) */
const AVG_CHAR = 0.58; // em/char heuristic
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

const BoardCanvas = forwardRef(function BoardCanvas(_, ref) {
  const s = useStore();
  const dispatch = useDispatch(); // history commit on drag-end

  // toggles
  const lockOn     = s.lock !== false;
  const showLegend = s.showLegend !== false;

  const {
    device, selection = [],
    snap, invert, showNumbers, themeId, randomPalette, showGloss
  } = s;

  const multiActive = (s.multiSelect ?? s.multi) || false;

  // MW ids
  const mwId     = s.mwId     || 'MW';
  const mwUpId   = s.mwUpId   || 'MW_UP';
  const mwDownId = s.mwDownId || 'MW_DOWN';

  const hostRef = useRef(null);
  const stageRef = useRef(null);
  const clusterRef = useRef(null);
  const hudRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const [dragId, setDragId] = useState(null);

  const [clusterPadTop, setClusterPadTop] = useState(12);
  const [clusterPadRight, setClusterPadRight] = useState(12);
  const [legendMaxWidth, setLegendMaxWidth] = useState(360);

  // ---------- Context menu state (x,y,+ optional key focus) ----------
  const [ctx, setCtx] = useState(null); // { x, y, keyId?: string|null }

  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 820px)').matches;
  });
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 820px)');
    const onChange = (e) => setIsNarrow(e.matches);
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);
    setIsNarrow(mq.matches);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange);
    };
  }, []);

  const def = useMemo(() => {
    try { return currentLayout?.(device) || {}; } catch { return {}; }
  }, [device]);

  const baseKeys = useMemo(() => {
    const arr = Array.isArray(def?.keys) ? def.keys : [];
    return arr.map((k, idx) => {
      const n = Number(k?.num ?? k?.id);
      return {
        id: k?.id ?? idx + 1,
        num: Number.isFinite(n) ? n : null,
        x: Number(k?.x ?? 0), y: Number(k?.y ?? 0),
        w: Number(k?.w ?? DEF_W), h: Number(k?.h ?? DEF_H),
        analog: !!k?.analog, blank: !!k?.blank, split: !!k?.split,
        label: k?.label || '', subtitle: k?.subtitle || '',
        color: k?.color || null, zone: k?.zone || '',
        imageUrl: k?.imageUrl || '', imageMode: k?.imageMode || 'cover',
        emoji: k?.emoji || '', icon: k?.icon || '',
        iconColor: k?.iconColor || '#ffffff',
        iconSize: Number.isFinite(k?.iconSize) ? Number(k.iconSize) : 28
      };
    });
  }, [def]);

  const keyData = useStore(st => st.keyData) || {};

  const merged = useMemo(() => {
    const palTheme = themePalette(themeId);
    const pal = (randomPalette?.length ? randomPalette : (palTheme || DEFAULT_RAINBOW));
    return baseKeys.map((k, idx) => {
      const o = keyData[k.id] || {};
      const iconSizeMerged = Number(o.iconSize ?? k.iconSize ?? 28);
      const isUnassigned = !!o.unassigned;
      // Compose label and subtitle. When unassigned and no label is provided,
      // show a placeholder. Avoid overriding explicit user labels.
      let label = o.label ?? k.label ?? '';
      let subtitle = o.subtitle ?? k.subtitle ?? '';
      if (isUnassigned && !label) label = 'Unassigned';
      // Choose color: if unassigned and no explicit color exists, fall back to a
      // muted grey. Otherwise use palette or user-defined color.
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
        iconColor: (o.iconColor ?? k.iconColor ?? '#ffffff'),
        iconSize: Number.isFinite(iconSizeMerged) ? iconSizeMerged : 28,
        split: !!(o.split ?? k.split),
        idx,
        unassigned: isUnassigned
      };
    });
  }, [baseKeys, keyData, themeId, randomPalette]);

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
    return { x:minX, y:minY, w:maxX - minX, h:maxY - minY };
  }, [merged]);

  useImperativeHandle(ref, () => ({
    zoomIn:  () => smoothZoomAt(+0.1),
    zoomOut: () => smoothZoomAt(-0.1),
    resetView: () => { setZoom(1); setPan({ x: 0, y: 0 }); },
    fitToView
  }));

  // measure overlay cluster
  useEffect(() => {
    const ro = new ResizeObserver(measureClusterAndHost);
    clusterRef.current && ro.observe(clusterRef.current);
    hudRef.current && ro.observe(hudRef.current);
    hostRef.current && ro.observe(hostRef.current);
    measureClusterAndHost();
    return () => ro.disconnect();
  }, [showLegend, isNarrow]); // eslint-disable-line
  function measureClusterAndHost() {
    const host = hostRef.current;
    const cluster = clusterRef.current;
    const hud = hudRef.current;
    if (!host) return;

    const hostW = host.clientWidth;
    const pad = 12;
    const hudW = hud ? hud.getBoundingClientRect().width : 0;

    const gap = 8;
    const safety = 16;
    const availLegend = Math.max(180, hostW - pad - hudW - gap - safety);
    setLegendMaxWidth(availLegend);

    if (cluster) {
      requestAnimationFrame(() => {
        const r = cluster.getBoundingClientRect();
        setClusterPadTop(Math.ceil(r.height + 8));
        setClusterPadRight(Math.ceil((hudW || 0) + 12));
      });
    } else {
      setClusterPadTop(12);
      setClusterPadRight(12);
    }
  }

  // initial/reactive fit
  useEffect(() => {
    const id = setTimeout(fitToView, 0);
    return () => clearTimeout(id);
  }, [device, s.invert, clusterPadTop, clusterPadRight, bounds.w, bounds.h]);

  // Run a one-time fit on mount. Without this, the initial render on
  // mobile can momentarily show the layout off to the side until the
  // resize observer or other effects trigger.  Deferring via setTimeout
  // allows the DOM to settle before measuring.
  useEffect(() => {
    const id = setTimeout(() => fitToView(), 0);
    return () => clearTimeout(id);
  }, []);

  // When the narrow breakpoint changes (mobile vs desktop), re-fit the
  // layout so it starts centered. Without this, the initial zoom on
  // mobile can be off until the user zooms manually.
  useEffect(() => {
    const id = setTimeout(fitToView, 0);
    return () => clearTimeout(id);
  }, [isNarrow]);

  // Re-fit the view whenever the host container resizes (e.g. on mobile
  // orientation changes or after CSS adjusts grid columns). Using a
  // ResizeObserver ensures the layout is centred even if the dimensions
  // change after mount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      // defer to allow layout to settle
      setTimeout(() => fitToView(), 0);
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // external commands
  useEffect(() => {
    const onZoomCmd = (e) => {
      const cmd = e?.detail?.cmd;
      if (cmd === 'in')       smoothZoomAt(+0.1);
      else if (cmd === 'out') smoothZoomAt(-0.1);
      else if (cmd === 'reset') { setZoom(1); setPan({ x: 0, y: 0 }); }
      else if (cmd === 'fit') fitToView();
    };
    const onDeviceChanged = () => fitToView();
    const onLayoutReset   = () => fitToView();
    window.addEventListener('board:zoom', onZoomCmd);
    window.addEventListener('device:changed', onDeviceChanged);
    window.addEventListener('layout:reset', onLayoutReset);
    return () => {
      window.removeEventListener('board:zoom', onZoomCmd);
      window.removeEventListener('device:changed', onDeviceChanged);
      window.removeEventListener('layout:reset', onLayoutReset);
    };
  }, []);

  function fitToView() {
    const host = hostRef.current;
    if (!host || !isFinite(bounds.w) || !isFinite(bounds.h)) return;

    // Increase the padding around the layout on narrow (mobile) screens so
    // that users don’t have to pan right up against the keys.  On desktop we
    // retain the original 12px margin, whereas on mobile we use 24px.  This
    // widens the effective viewing area and prevents the layout from being cut
    // off on the left when the app first loads.
    const pad = isNarrow ? 24 : 12;
    const vw = host.clientWidth;
    const vh = host.clientHeight;

    const availW = Math.max(1, vw - pad * 2 - clusterPadRight);
    const availH = Math.max(1, vh - pad * 2 - clusterPadTop);

    const scaleX = availW / bounds.w;
    const scaleY = availH / bounds.h;
    const s = clamp(Math.min(scaleX, scaleY), 0.2, 2.5);

    const { nx, ny } = centerPanForZoom(s, vw, vh);
    setZoom(s);
    setPan({ x: nx, y: ny });
  }

  function centerPanForZoom(z, vw, vh) {
    const host = hostRef.current;
    if (!host) return { nx: pan.x, ny: pan.y };
    // Match the padding used in fitToView(): widen margin on narrow screens
    // so the layout is centred nicely with extra space on mobile.  Use the
    // same logic as fitToView() but without needing to recompute scale.
    const pad = isNarrow ? 24 : 12;
    const viewW = vw ?? host.clientWidth;
    const viewH = vh ?? host.clientHeight;

    const totalW = bounds.w * z;
    const totalH = bounds.h * z;

    // centre horizontally between left pad and right overlays.  subtract pad
    // from both sides and clusterPadRight only from the right side.
    const availableW = viewW - pad * 2 - clusterPadRight;
    const availableH = viewH - pad * 2 - clusterPadTop;

    const nx = Math.round((availableW - totalW) / 2 - bounds.x * z + pad);
    const ny = Math.round((availableH - totalH) / 2 - bounds.y * z + pad);
    return { nx, ny };
  }

  function applyZoomCentered(newZoom) {
    const host = hostRef.current;
    if (!host) return;
    const { nx, ny } = centerPanForZoom(newZoom, host.clientWidth, host.clientHeight);
    setZoom(newZoom);
    setPan({ x: nx, y: ny });
  }

  const isSelected = (id) => selection.includes(id);
  const additiveFromEvent = (e) => (e?.ctrlKey || e?.metaKey || multiActive);

  // dragging
  const dragRef = useRef(null);
  function onKeyPointerDown(e, k) {
    toggleSelect(k.id, additiveFromEvent(e));
    if (lockOn || k.blank || k.analog) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { id: k.id, sx: e.clientX, sy: e.clientY, ox: k.x, oy: k.y };
    setDragId(k.id);
  }
  function onKeyPointerMove(e, k) {
    if (!dragRef.current || dragRef.current.id !== k.id) return;
    const dz = Math.max(zoom, 0.0001);
    const dx = (e.clientX - dragRef.current.sx) / dz;
    const dy = (e.clientY - dragRef.current.sy) / dz;

    let nx = dragRef.current.ox + (invert ? -dx : dx);
    let ny = dragRef.current.oy + dy;
    if (snap) {
      nx = Math.round(nx / GRID_STEP) * GRID_STEP;
      ny = Math.round(ny / GRID_STEP) * GRID_STEP;
    }
    useStore.setState(st => ({
      keyData: { ...(st.keyData || {}), [k.id]: { ...(st.keyData?.[k.id] || {}), x: nx, y: ny } }
    }));
  }
  // history commit on drag-end
  function onKeyPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragId(null);
    if (!drag) return;

    const st = useStore.getState();
    const live = st.keyData?.[drag.id] || st.keys?.[drag.id] || {};
    const x = Number.isFinite(live.x) ? live.x : drag.ox;
    const y = Number.isFinite(live.y) ? live.y : drag.oy;

    dispatch({ type: 'EDIT_KEYS', ids: [drag.id], patch: { x, y } });
  }

  function toggleSelect(id, additive) {
    if (additive) {
      const set = new Set(selection);
      set.has(id) ? set.delete(id) : set.add(id);
      useStore.setState({ selection: Array.from(set) });
    } else {
      useStore.setState({ selection: [id] });
    }
  }

  // panning (Space/middle/right mouse or panEnabled)
  const panRef = useRef(null);
  // Track pinch zoom state for mobile multi-touch gestures
  const pinchRef = useRef({ active: false, initialDist: 0, initialZoom: 1, initialPanX: 0, initialPanY: 0, centerX: 0, centerY: 0 });
  const [spacePan, setSpacePan] = useState(false);
  const panEnabled = !!useStore.getState().panEnabled;
  useEffect(() => {
    const onDown = (e) => { if (e.code === 'Space') setSpacePan(true); };
    const onUp   = (e) => { if (e.code === 'Space') setSpacePan(false); };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // ---------- Right-click menu vs pan behavior ----------
  function openContextAt(e, keyId = null) {
    e.preventDefault();
    e.stopPropagation();
    setCtx({ x: e.clientX, y: e.clientY, keyId });
  }

  function onStagePointerDown(e) {
    // If a multi-touch pinch is in progress, ignore pointer down events to prevent
    // inadvertent drags or selections.
    if (isPinching()) return;
    const clickedTile   = e.target.closest?.('.key-tile');
    const clickedAnalog = e.target.closest?.('.analog-stick');
    if (clickedAnalog) return;

    const left = e.button === 0, middle = e.button === 1, right = e.button === 2;

    // Right-click on open canvas → context menu (do NOT start panning)
    if (right && !clickedTile) {
      openContextAt(e, null);
      return;
    }

    const allowPan = middle || (left && (spacePan || panEnabled));
    if (clickedTile && !allowPan) return;

    if (!additiveFromEvent(e)) useStore.setState({ selection: [] });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    stageRef.current && (stageRef.current.style.cursor = 'grabbing');
  }
  function onStagePointerMove(e) {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.sx;
    const dy = e.clientY - panRef.current.sy;
    setPan({ x: panRef.current.ox + dx, y: panRef.current.oy + dy });
  }
  function onStagePointerUp() { panRef.current = null; stageRef.current && (stageRef.current.style.cursor = ''); }

  // zoom
  function clampZoom(z) { return Math.min(2.5, Math.max(0.2, z)); }

  function zoomAtPoint(clientX, clientY, deltaScale) {
    const host = hostRef.current; if (!host) return;
    const worldX = (clientX - pan.x) / zoom;
    const worldY = (clientY - pan.y) / zoom;
    const next = clampZoom(zoom * deltaScale);
    const nx = clientX - worldX * next;
    const ny = clientY - worldY * next;
    setZoom(next); setPan({ x: nx, y: ny });
  }

  function smoothZoomAt(deltaStep) {
    const host = hostRef.current; if (!host) return;
    const rect = host.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const next = clampZoom(zoom * (1 + deltaStep));

    if (isNarrow) {
      applyZoomCentered(next);
    } else {
      zoomAtPoint(cx, cy, (1 + deltaStep));
    }
  }

  function onWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const factor = Math.pow(1.0015, -e.deltaY);
      const next = clampZoom(zoom * factor);
      if (isNarrow) {
        applyZoomCentered(next);
      } else {
        zoomAtPoint(e.clientX, e.clientY, factor);
      }
    }
  }

  /* -------------------------------------------------------------------
     Touch-based pinch-to-zoom (mobile)
     When two fingers are placed on the canvas and moved closer/further
     apart, adjust the zoom level accordingly and translate the pan so
     the pinch centre remains anchored on the same content.
  ------------------------------------------------------------------- */
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        // Start a pinch gesture
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        pinchRef.current.active = true;
        pinchRef.current.initialDist = dist;
        pinchRef.current.initialZoom = zoom;
        pinchRef.current.initialPanX = pan.x;
        pinchRef.current.initialPanY = pan.y;
        pinchRef.current.centerX = (t0.clientX + t1.clientX) / 2;
        pinchRef.current.centerY = (t0.clientY + t1.clientY) / 2;
      }
    }

    function onTouchMove(e) {
      if (!pinchRef.current.active) return;
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const ratio = dist / (pinchRef.current.initialDist || 1);
      const nextZoom = clampZoom(pinchRef.current.initialZoom * ratio);
      // Compute current centre of pinch
      const cx = (t0.clientX + t1.clientX) / 2;
      const cy = (t0.clientY + t1.clientY) / 2;
      // World coordinates of the point that should remain anchored
      const worldX0 = (pinchRef.current.centerX - pinchRef.current.initialPanX) / pinchRef.current.initialZoom;
      const worldY0 = (pinchRef.current.centerY - pinchRef.current.initialPanY) / pinchRef.current.initialZoom;
      const newPanX = cx - worldX0 * nextZoom;
      const newPanY = cy - worldY0 * nextZoom;
      setZoom(nextZoom);
      setPan({ x: newPanX, y: newPanY });
    }

    function onTouchEnd() {
      if (pinchRef.current.active) {
        pinchRef.current.active = false;
      }
    }

    stageEl.addEventListener('touchstart', onTouchStart, { passive: false });
    stageEl.addEventListener('touchmove', onTouchMove, { passive: false });
    stageEl.addEventListener('touchend', onTouchEnd);
    stageEl.addEventListener('touchcancel', onTouchEnd);
    return () => {
      stageEl.removeEventListener('touchstart', onTouchStart);
      stageEl.removeEventListener('touchmove', onTouchMove);
      stageEl.removeEventListener('touchend', onTouchEnd);
      stageEl.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [zoom, pan]);

  // Prevent starting drag/pan when a pinch gesture is active
  function isPinching() {
    return !!pinchRef.current.active;
  }

  // reset
  function resetLayoutWithWarning() {
    const ok = window.confirm(
      'Reset layout?\n\nThis will reset all settings and clear the board.'
    );
    if (!ok) return;

    const st = useStore.getState();
    const before = JSON.parse(JSON.stringify(st.keys || {}));
    const next   = { ...(st.keys || {}) };
    baseKeys.forEach((bk) => {
      const w = bk.analog ? ANALOG_W : (bk.w ?? DEF_W);
      const h = bk.analog ? ANALOG_H : (bk.h ?? DEF_H);
      next[bk.id] = { ...(next[bk.id] || {}), x: bk.x ?? 0, y: bk.y ?? 0, w, h };
    });
    useStore.setState({
      keys: next,
      keyData: { ...(st.keyData || {}), ...next },
      history: [...(st.history || []), before],
      future: []
    });
    window.dispatchEvent(new CustomEvent('layout:reset'));
  }

  const hostStyle = { position:'absolute', inset:0, overflow:'hidden' };
  const stageStyle = {
    position:'absolute',
    left: 0, top: 0,
    width: Math.max(bounds.x + bounds.w + 200, (hostRef.current?.clientWidth || 1600)),
    height: Math.max(bounds.y + bounds.h + 200, (hostRef.current?.clientHeight || 900)),
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
    willChange: 'transform',
    touchAction: 'none'
  };

  function ZoomHud() {
    return (
      <div
        ref={hudRef}
        className="zoom-hud-chip"
        style={{
          display:'inline-flex', gap:6, padding:'6px 8px', borderRadius:999,
          border:'1px solid rgba(42,54,84,.9)', background:'rgba(17,24,39,.8)',
          backdropFilter:'blur(8px)', boxShadow:'0 0 0 1px #202a44, 0 12px 24px #0006',
          alignItems:'center'
        }}
      >
        <span
          title={lockOn ? 'Canvas locked: key dragging disabled' : 'Canvas unlocked'}
          style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'0 6px', fontSize:12, opacity: lockOn ? 1 : .7 }}
          data-lock={lockOn ? 'on' : 'off'}
        >
          <span aria-hidden="true">{lockOn ? '🔒' : '🔓'}</span>
          <span>{lockOn ? 'Locked' : 'Unlocked'}</span>
        </span>

        <button className="btn mini" onClick={() => smoothZoomAt(-0.1)} title="Zoom out">−</button>
        <button className="btn mini" onClick={fitToView} title="Fit to view">Fit</button>
        <button className="btn mini" onClick={() => smoothZoomAt(+0.1)} title="Zoom in">＋</button>
        <button className="btn mini" onClick={resetLayoutWithWarning} title="Reset layout">↺</button>
      </div>
    );
  }

  /**
   * Handler for the mobile zoom slider. This slider directly sets the zoom level
   * and recenters the board so the view remains centered. It clamps the zoom
   * within the allowed range.
   */
  function onMobileSliderChange(e) {
    const target = e?.target;
    if (!target) return;
    let nz = parseFloat(target.value);
    if (!isFinite(nz)) return;
    nz = clampZoom(nz);
    // When adjusting zoom via slider, always keep the content centered
    applyZoomCentered(nz);
  }

  // split mouse wheel (Up/Down halves)
  function SplitWheel({ k, left, top }) {
    const w = k.w, h = k.h;
    const palTheme = themePalette(themeId);
    const pal = (randomPalette?.length ? randomPalette : (palTheme || DEFAULT_RAINBOW));

    const upO   = keyData[mwUpId]   || {};
    const downO = keyData[mwDownId] || {};
    const upColor   = upO.color   ?? pal[k.idx % pal.length];
    const downColor = downO.color ?? pal[(k.idx + 1) % pal.length];
    const upLabel   = (upO.label   ?? 'Mouse Wheel Up');
    const downLabel = (downO.label ?? 'Mouse Wheel Down');

    const halfH = h / 2;
    const avail = w - 20;

    const upLayout   = chooseLabelLayout(avail, upLabel);
    const downLayout = chooseLabelLayout(avail, downLabel);

    const LabelBlock = ({ lay, title }) => {
      const common = {
        fontWeight:700,
        textShadow:'0 1px 0 rgba(0,0,0,.45)',
        position:'relative', zIndex:2,
        letterSpacing:'-0.1px'
      };
      if (lay.mode === 'two') {
        return (
          <div className="label" title={title} style={{ ...common, textAlign:'center', lineHeight:1.1 }}>
            <div style={{ whiteSpace:'nowrap', fontSize: lay.fontSize }}>{lay.line1}</div>
            <div style={{ whiteSpace:'nowrap', fontSize: lay.fontSize }}>{lay.line2}</div>
          </div>
        );
      }
      return (
        <div
          className="label"
          title={title}
          style={{
            ...common,
            whiteSpace:'nowrap', overflow:'visible', textOverflow:'clip',
            fontSize: lay.fontSize
          }}
        >
          {lay.text}
        </div>
      );
    };

    return (
      <div
        className="key-tile"
        style={{
          position:'absolute', left, top, width:w, height:h, zIndex:(dragId === k.id) ? 1000 : (isSelected(k.id) ? 10 : 1),
          borderRadius:18, cursor:'pointer', touchAction:'none', overflow:'hidden',
          boxShadow: showGloss
            ? 'inset 0 1px 0 rgba(255,255,255,.15), inset 0 -10px 20px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.35)'
            : '0 12px 40px rgba(0,0,0,.35)'
        }}
        onPointerDown={(e) => onKeyPointerDown(e, k)}
        onPointerMove={(e) => onKeyPointerMove(e, k)}
        onPointerUp={onKeyPointerUp}
        onContextMenu={(e) => {
          // Right-click selects key (if not already) and opens menu
          if (!selection.includes(k.id)) useStore.setState({ selection: [k.id] });
          openContextAt(e, k.id);
        }}
      >
        <div style={{
          position:'absolute', left:0, top:0, width:'100%', height:halfH,
          background: upColor, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          borderTopLeftRadius:18, borderTopRightRadius:18
        }}>
          <LabelBlock lay={upLayout} title={upLabel} />
        </div>

        <div style={{
          position:'absolute', left:0, top:halfH - 1, width:'100%', height:2,
          background:'rgba(0,0,0,.25)'
        }} />

        <div style={{
          position:'absolute', left:0, top:halfH, width:'100%', height:halfH,
          background: downColor, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          borderBottomLeftRadius:18, borderBottomRightRadius:18
        }}>
          <LabelBlock lay={downLayout} title={downLabel} />
        </div>

        {showNumbers && k.num != null && (
          <div className="num num-pill" style={{ position:'absolute', zIndex:3 }}>{k.num}</div>
        )}
      </div>
    );
  }

  // ---------- COPY/PASTE bridge for ContextMenu ----------
  function ensureSelectionFromCtx() {
    const st = useStore.getState();
    if ((!st.selection || !st.selection.length) && ctx?.keyId) {
      useStore.setState({ selection: [ctx.keyId] });
    }
  }

  function copySelectionToClipboard() {
    // Populate clipboard with the actual visual properties of the first selected key.
    // Rely on the merged key list rather than raw keyData so defaults (palette/labels) are captured.
    ensureSelectionFromCtx();
    const st = useStore.getState();
    const ids = st.selection || [];
    if (!ids.length) return;
    // Only copy from the first selected id
    const id = ids[0];
    // Find the fully merged key (includes default palette, theme colours, etc.)
    const k = merged.find((item) => item.id === id) || {};
    const clip = {
      // Copy only defined fields to avoid overwriting existing values with empty strings.
      // Note: empty strings ("") are considered defined, so they will be copied; this allows
      // users to intentionally clear fields when pasting.
      label: k.label !== undefined ? k.label : undefined,
      subtitle: k.subtitle !== undefined ? k.subtitle : undefined,
      // legacy alias mirrors subtitle
      sub: k.subtitle !== undefined ? k.subtitle : undefined,
      emoji: k.emoji !== undefined ? k.emoji : undefined,
      color: k.color !== undefined ? k.color : undefined,
      zone: k.zone !== undefined ? k.zone : undefined,
      imageUrl: k.imageUrl !== undefined ? k.imageUrl : undefined,
      // legacy alias for imageUrl
      image: k.imageUrl !== undefined ? k.imageUrl : undefined,
      imageMode: k.imageMode !== undefined ? k.imageMode : undefined,
      icon: k.icon !== undefined ? k.icon : undefined,
      iconColor: k.iconColor !== undefined ? k.iconColor : undefined,
      iconSize: k.iconSize !== undefined ? k.iconSize : undefined
    };
    dispatch({ type: 'COPY', data: clip });
  }

  function handleContextAction(action) {
    ensureSelectionFromCtx();
    switch (action) {
      case 'copy':
        copySelectionToClipboard();
        break;
      case 'pasteLabel':
        dispatch({ type: 'PASTE', fields: ['label'] });
        break;
      case 'pasteSub':
        dispatch({ type: 'PASTE', fields: ['subtitle', 'sub'] });
        break;
      case 'pasteEmoji':
        dispatch({ type: 'PASTE', fields: ['emoji'] });
        break;
      case 'pasteColor':
        dispatch({ type: 'PASTE', fields: ['color'] });
        break;
      case 'pasteImage':
        dispatch({ type: 'PASTE', fields: ['imageUrl', 'image', 'imageMode'] });
        break;
      case 'pasteIcon':
        dispatch({ type: 'PASTE', fields: ['icon', 'iconColor', 'iconSize'] });
        break;
      case 'pasteAll':
        dispatch({ type: 'PASTE' }); // store default covers all relevant fields
        break;
      default:
        break;
    }
  }

  return (
    <div className="stageWrap" ref={hostRef} style={hostStyle} onWheel={onWheel} data-export-root="board">
      {/* overlay cluster */}
      <div
        ref={clusterRef}
        className="overlay-tr-cluster"
        style={{
          position:'absolute', top:8, right:8, zIndex:6,
          display:'flex', alignItems:'flex-start', gap:8, pointerEvents:'none'
        }}
      >
        {showLegend && (
          <div style={{ pointerEvents:'auto' }}>
            <ZoneLegend maxWidthPx={legendMaxWidth} twoLine />
          </div>
        )}
        <div style={{ pointerEvents:'auto' }}>
          <ZoomHud />
        </div>
      </div>

      {/*
        Mobile controls: show only on narrow screens. We separate the zoom slider
        (left side) from the undo/redo controls (right side) so they don’t collide
        with any keys. The slider allows continuous zoom adjustments, and the
        buttons perform undo/redo actions.
      */}
      {isNarrow && (
        <>
          {/* Zoom slider positioned on the left */}
          <div
            className="mobileZoomSlider"
            style={{
              position: 'absolute',
              left: 16,
              bottom: 16,
              width: '40%',
              maxWidth: 220,
              zIndex: 6,
              pointerEvents: 'auto'
            }}
          >
            <input
              type="range"
              min={0.2}
              max={2.5}
              step={0.05}
              value={zoom}
              onChange={onMobileSliderChange}
              aria-label="Zoom"
              style={{ width: '100%' }}
            />
          </div>
          {/* Undo/Redo buttons positioned on the right */}
          <div
            className="mobileUndoRedo"
            style={{
              position: 'absolute',
              right: 16,
              bottom: 16,
              display: 'flex',
              gap: 8,
              zIndex: 6,
              pointerEvents: 'auto'
            }}
          >
            <button
              className="btn"
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={!(s.history && s.history.length)}
              title="Undo"
            >
              Undo
            </button>
            <button
              className="btn"
              onClick={() => dispatch({ type: 'REDO' })}
              disabled={!(s.future && s.future.length)}
              title="Redo"
            >
              Redo
            </button>
          </div>
        </>
      )}

      <div
        className="stage"
        ref={stageRef}
        style={stageStyle}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onContextMenu={(e) => {
          // Right-click empty canvas → menu (keys handle their own right-click)
          const clickedTile = e.target.closest?.('.key-tile');
          const clickedAnalog = e.target.closest?.('.analog-stick');
          if (!clickedTile && !clickedAnalog) openContextAt(e, null);
          else e.preventDefault();
        }}
      >
        {merged.map((k, idx) => {
          if (k.blank) return null;

        // analog tile
          if (k.analog) {
            const w = ANALOG_W, h = ANALOG_H;
            const stageW = Math.max(bounds.x + bounds.w + 200, hostRef.current?.clientWidth || 1600);
            const left = invert ? (stageW - (k.x + w)) : k.x;
            const top  = k.y;
            return (
              <div
                key={k.id}
                className="analog-stick"
                style={{ position:'absolute', left, top, width:w, height:h, zIndex:2 }}
                onContextMenu={(e) => e.preventDefault()} // no menu on analog
              >
                <AnalogStick />
              </div>
            );
          }

          // split MW (robust)
          if (k.split || String(k.id) === mwId) {
            const stageW = Math.max(bounds.x + bounds.w + 200, hostRef.current?.clientWidth || 1600);
            const left = invert ? (stageW - (k.x + k.w)) : k.x;
            const top  = k.y;
            return <SplitWheel key={k.id} k={k} left={left} top={top} />;
          }

          // normal key
          const stageW = Math.max(bounds.x + bounds.w + 200, hostRef.current?.clientWidth || 1600);
          const left = invert ? (stageW - (k.x + k.w)) : k.x;
          const top  = k.y;
          const sel = isSelected(k.id);
          const z = (dragId === k.id) ? 1000 : (sel ? 10 : 1);

          const isMW = String(k.id) === mwId;
          const displayLabel = isMW
            ? (k.label && k.label.trim().length ? k.label : 'Mouse Wheel')
            : ((k.label && k.label.trim().length > 0)
                ? k.label
                : PLACEHOLDERS[idx % PLACEHOLDERS.length]);

          const avail = k.w - 20; // rough padding allowance
          const lay = chooseLabelLayout(avail, displayLabel);

          return (
            <div
              key={k.id}
              data-key-id={k.id}
              data-selected={sel ? 'true' : 'false'}
              className="key-tile"
              style={{
                position:'absolute', left, top, width:k.w, height:k.h, zIndex:z,
                background: k.color, borderRadius: 18, cursor:'pointer',
                boxShadow: showGloss
                  ? 'inset 0 1px 0 rgba(255,255,255,.15), inset 0 -10px 20px rgba(0,0,0,.2), 0 12px 40px rgba(0,0,0,.35)'
                  : '0 12px 40px rgba(0,0,0,.35)',
                touchAction: 'none'
              }}
              onPointerDown={(e) => onKeyPointerDown(e, k)}
              onPointerMove={(e) => onKeyPointerMove(e, k)}
              onPointerUp={onKeyPointerUp}
              onContextMenu={(e) => {
                if (!selection.includes(k.id)) useStore.setState({ selection: [k.id] });
                openContextAt(e, k.id);
              }}
            >
              {showNumbers && k.num != null && (<div className="num num-pill" style={{ position:'absolute', zIndex:3 }}>{k.num}</div>)}

              {/* background image */}
              {k.imageUrl && k.imageMode === 'cover' && (
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
              {k.imageUrl && k.imageMode === 'icon' && (
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

              {k.emoji && !k.icon && (
                <div style={{ position:'absolute', top:10, left:0, right:0, display:'flex', justifyContent:'center', zIndex:2 }}>
                  <span style={{ fontSize:28, filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))' }}>{k.emoji}</span>
                </div>
              )}
              {k.icon && !k.emoji && (
                <div style={{ position:'absolute', top:12, left:0, right:0, display:'flex', justifyContent:'center', zIndex:2 }}>
                  <i
                    className={`ra ${k.icon}`}
                    style={{
                      fontSize: Number(k.iconSize) || 28,
                      lineHeight: 1,
                      filter:'drop-shadow(0 2px 2px rgba(0,0,0,.35))',
                      color: k.iconColor || '#fff'
                    }}
                  />
                </div>
              )}

              {/* label with two-line fallback */}
              <div
                className="label"
                style={{
                  marginTop:(k.emoji || k.icon) ? 26 : 0,
                  position:'relative', zIndex:2,
                  textAlign:'center',
                  color:'#fff',
                  lineHeight:1.1,
                  letterSpacing:'-0.1px'
                }}
                title={displayLabel}
              >
                {lay.mode === 'two' ? (
                  <>
                    <div style={{ whiteSpace:'nowrap', fontWeight:700, textShadow:'0 1px 0 rgba(0,0,0,.45)', fontSize: lay.fontSize }}>{lay.line1}</div>
                    <div style={{ whiteSpace:'nowrap', fontWeight:700, textShadow:'0 1px 0 rgba(0,0,0,.45)', fontSize: lay.fontSize }}>{lay.line2}</div>
                  </>
                ) : (
                  <div style={{ whiteSpace:'nowrap', fontWeight:700, textShadow:'0 1px 0 rgba(0,0,0,.45)', fontSize: lay.fontSize }}>
                    {lay.text}
                  </div>
                )}
              </div>

              {k.subtitle ? <div className="subtitle" style={{ position:'relative', zIndex:2 }}>{k.subtitle}</div> : null}
            </div>
          );
        })}
      </div>

      {/* ---------- Context Menu Mount ---------- */}
      {ctx && (
        <ContextMenu
          x={ctx.x}
          y={ctx.y}
          selection={selection}
          clipboard={s.clipboard}
          onAction={handleContextAction}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  );
});

export default BoardCanvas;

// src/lib/store.jsx
import { create } from 'zustand';

// deep clone for history snapshots
const snap = (obj) => JSON.parse(JSON.stringify(obj));

const initial = {
  /* ------------ Mobile overlays (explicit defaults) ------------ */
  isControlsOpen: false,
  isSaveOpen: false,
  isSettingsOpen: false,
  isMobileInspectorOpen: false,
  mobileInspectorKeyId: null,

  /* ------------ Legacy flags kept for compatibility ------------ */
  mobileInspectorOpen: false,
  mobileProjectOpen: false,

  /* ---------------------- Identity ---------------------- */
  device: 'cyro',
  // prefer gameTitle; keep legacy "title" around if something reads it
  gameTitle: 'Untitled',
  title: 'Untitled',

  /* ---------------------- Theme & Palette ---------------------- */
  themeId: null,
  randomPalette: null,

  /* ---------------------- Key data ---------------------- */
  // Newer components (BoardCanvas/Inspector/MobileInspector) use keyData
  keyData: {}, // id -> { label, subtitle, color, emoji, imageUrl, imageMode, icon, zone, x, y, w, h }
  // Older actions below keep using "keys"; keep it to avoid breaking undo/redo code paths
  keys: {},

  zones: {},          // { [zoneName]: string[] ids }
  selection: [],
  clipboard: null,

  // snapshot for transient edits during drag (e.g., color slider)
  pendingBefore: null,

  /* ---------------------- UI flags ---------------------- */
  showNumbers: true,
  showGloss: true,
  showLegend: true,   // legend ON by default (desktop & mobile)
  lock: true,         // lock ON by default (blocks key dragging only)
  grid: true,
  invert: false,
  multiSelect: false,
  snap: true,
  panEnabled: false,  // panning still via Space/middle/right mouse unless enabled

  /* ---------------------- Board view ---------------------- */
  zoom: 1,
  pan: { x: 40, y: 40 },

  /* ---------------------- Layout measurements ---------------------- */
  topbarH: 0,         // set by TopBar effect; used by MobileInspector

  /* ---------------------- History ---------------------- */
  history: [],
  future: [],

  // Whether the help/tutorial panel is open
  isHelpOpen: false,

  /* ---------------------- Special ids ---------------------- */
  mwId: 'MW',         // lets BoardCanvas match id === mwId
  mwUpId: 'MW_UP',
  mwDownId: 'MW_DOWN',
  analogNames: { up: 'W', left: 'A', down: 'S', right: 'D' }
};

export const useStore = create(() => ({ ...initial }));

export const useDispatch = () => (action) => {
  const s = useStore.getState();

  switch (action.type) {
    /* ---------- Simple UI actions ---------- */
    case 'OPEN': {
      const key = action.key;
      const next = { [key]: true };
      // keep legacy mirrors in sync
      if (key === 'isMobileInspectorOpen') next.mobileInspectorOpen = true;
      if (key === 'isSettingsOpen') next.mobileProjectOpen = true;
      useStore.setState(next);
      break;
    }
    case 'CLOSE': {
      const key = action.key;
      const next = { [key]: false };
      if (key === 'isMobileInspectorOpen') next.mobileInspectorOpen = false;
      if (key === 'isSettingsOpen') next.mobileProjectOpen = false;
      useStore.setState(next);
      break;
    }

    /* ---------- Project / layout ---------- */
    case 'LOAD_LAYOUT': {
      useStore.setState({
        device: action.id,
        keys: action.keys || {},
        keyData: action.keys || {}, // keep both in sync for safety
        selection: [],
        history: [],
        future: []
      });
      // notify listeners (BoardCanvas refit)
      try { window.dispatchEvent(new CustomEvent('device:changed', { detail: { device: action.id } })); } catch {}
      break;
    }

    case 'SELECT': {
      useStore.setState({ selection: action.ids || [] });
      break;
    }

    case 'TOGGLE': {
      const key = action.key;
      useStore.setState({ [key]: !s[key] });
      break;
    }

    case 'SET': {
      const { key, value } = action;
      useStore.setState({ [key]: value });
      if (key === 'device') {
        // broadcast so BoardCanvas can fitToView
        try { window.dispatchEvent(new CustomEvent('device:changed', { detail: { device: value } })); } catch {}
      }
      break;
    }


    /* ---------- Clipboard ops ---------- */
    case 'COPY': {
      // Just write to clipboard; no history update
      useStore.setState({ clipboard: action.data || null });
      break;
    }

    case 'PASTE': {
      const clip = s.clipboard;
      if (!clip) return;
      const ids = (action.ids && action.ids.length ? action.ids : s.selection);
      if (!ids.length) return;

      // Snapshot current keyData so undo/redo can restore prior state
      const before = snap(s.keyData || {});
      const nextKD = { ...(s.keyData || {}) };

      // Determine which fields to paste. If none specified, use the full list of supported attributes.
      // Including `zone` here ensures that "Paste All" will copy the zone as well, which makes
      // cloning behaviour intuitive. Note: coordinates and dimensions (x,y,w,h) are intentionally
      // omitted so that pasting does not move keys around.
      const defaultFields = [
        'label', 'subtitle', 'sub', 'emoji', 'icon', 'color', 'zone',
        'imageUrl', 'image', 'imageMode', 'iconColor', 'iconSize'
      ];
      const fields = action.fields && action.fields.length ? action.fields : defaultFields;

      ids.forEach((id) => {
        const curr = nextKD[id] || {};
        const patch = {};
        fields.forEach((f) => {
          switch (f) {
            case 'label': {
              if (clip.label !== undefined) {
                patch.label = clip.label;
              }
              break;
            }
            case 'subtitle':
            case 'sub': {
              const val = clip.subtitle !== undefined ? clip.subtitle : clip.sub;
              if (val !== undefined) {
                patch.subtitle = val;
                // maintain legacy alias
                patch.sub = val;
              }
              break;
            }
            case 'emoji': {
              if (clip.emoji !== undefined) {
                patch.emoji = clip.emoji;
              }
              break;
            }
            case 'icon': {
              if (clip.icon !== undefined) {
                patch.icon = clip.icon;
              }
              break;
            }
            case 'color': {
              if (clip.color !== undefined) {
                patch.color = clip.color;
              }
              break;
            }
            case 'imageUrl': {
              if (clip.imageUrl !== undefined) {
                patch.imageUrl = clip.imageUrl;
              }
              break;
            }
            case 'image': {
              if (clip.image !== undefined) {
                patch.imageUrl = clip.image;
              }
              break;
            }
            case 'imageMode': {
              if (clip.imageMode !== undefined) {
                patch.imageMode = clip.imageMode;
              }
              break;
            }
            case 'iconColor': {
              if (clip.iconColor !== undefined) {
                patch.iconColor = clip.iconColor;
              }
              break;
            }
            case 'iconSize': {
              if (clip.iconSize !== undefined) {
                patch.iconSize = clip.iconSize;
              }
              break;
            }
            default: {
              // fallback: assign any matching property from clip
              if (clip[f] !== undefined) {
                patch[f] = clip[f];
              }
              break;
            }
          }
        });
        // Emoji/Icon exclusivity: don't keep both. If both are set and non-empty, favour the one being pasted.
        if (patch.emoji) {
          patch.icon = undefined;
        }
        if (patch.icon) {
          patch.emoji = undefined;
        }
        nextKD[id] = { ...curr, ...patch };
      });

      useStore.setState({
        keyData: nextKD,
        // mirror legacy keys for compatibility
        keys: { ...(s.keys || {}), ...nextKD },
        history: [...s.history, before],
        future: []
      });
      break;
    }

    /* ---------- Edit keys: transient (drag) vs committed (drop) ---------- */
    case 'EDIT_KEYS': {
      const ids = (action.ids && action.ids.length ? action.ids : s.selection);
      if (!ids.length) return;

      if (action.transient) {
        // Stash state on first transient update
        if (!s.pendingBefore) {
          useStore.setState({ pendingBefore: snap(s.keyData || {}) });
        }
        const nextKD = { ...(s.keyData || {}) };
        ids.forEach((id) => {
          nextKD[id] = { ...(nextKD[id] || {}), ...(action.patch || {}) };
        });
        useStore.setState({
          keyData: nextKD,
          keys: { ...(s.keys || {}), ...nextKD }
        });
        break;
      }

      const beforeKD = s.pendingBefore ? s.pendingBefore : snap(s.keyData || {});
      const nextKD2 = { ...(s.keyData || {}) };
      ids.forEach((id) => {
        nextKD2[id] = { ...(nextKD2[id] || {}), ...(action.patch || {}) };
      });
      useStore.setState({
        keyData: nextKD2,
        keys: { ...(s.keys || {}), ...nextKD2 },
        history: [...s.history, beforeKD],
        future: [],
        pendingBefore: null
      });
      break;
    }

    /* ---------- Undo / Redo (over keyData) ---------- */
    case 'UNDO': {
      const history = [...s.history];
      if (!history.length) return;
      const prev = history.pop();
      useStore.setState({
        keyData: prev,
        keys: { ...(s.keys || {}), ...prev },
        history,
        future: [s.keyData, ...s.future],
        pendingBefore: null
      });
      break;
    }

    case 'REDO': {
      const future = [...s.future];
      if (!future.length) return;
      const next = future.shift();
      useStore.setState({
        keyData: next,
        keys: { ...(s.keys || {}), ...next },
        future,
        history: [...s.history, s.keyData],
        pendingBefore: null
      });
      break;
    }

    /* ---------- Movement (optional) ---------- */
    case 'MOVE_KEY': {
      if (s.lock) return; // respect lock: block key dragging only
      const before = snap(s.keys);
      const next = { ...s.keys };
      const id = action.id;
      const curr = next[id] || {};
      next[id] = { ...curr, x: action.pos.x, y: action.pos.y };
      useStore.setState({
        keys: next,
        keyData: { ...(s.keyData || {}), ...next },
        history: [...s.history, before],
        future: []
      });
      break;
    }

    /* ---------- Zones ---------- */
    case 'ASSIGN_ZONE': {
      const ids = (action.ids && action.ids.length ? action.ids : s.selection);
      const zone = (action.zone || '').trim();
      if (!ids.length) return;

      const beforeKeys = snap(s.keys);
      const beforeZones = snap(s.zones);

      const nextKeys = { ...s.keys };
      const nextZones = { ...s.zones };

      // remove from all zones
      Object.keys(nextZones).forEach((z) => {
        nextZones[z] = nextZones[z].filter((kid) => !ids.includes(kid));
        if (!nextZones[z].length) delete nextZones[z];
      });

      if (zone) nextZones[zone] = Array.from(new Set([...(nextZones[zone] || []), ...ids]));

      ids.forEach((id) => {
        const curr = nextKeys[id] || {};
        nextKeys[id] = { ...curr, zone: zone || undefined };
      });

      useStore.setState({
        keys: nextKeys,
        keyData: { ...(s.keyData || {}), ...nextKeys },
        zones: nextZones,
        history: [...s.history, beforeKeys],
        future: []
      });
      break;
    }


    /* ---------- Optional: pipe zoom commands as events ---------- */
    case 'BOARD_ZOOM': {
      // dispatch({type:'BOARD_ZOOM', cmd:'in'|'out'|'fit'|'reset'})
      try { window.dispatchEvent(new CustomEvent('board:zoom', { detail: { cmd: action.cmd } })); } catch {}
      break;
    }

    default:
      console.warn('Unknown action', action);
  }
};

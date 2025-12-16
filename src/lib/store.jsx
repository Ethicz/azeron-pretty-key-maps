// src/lib/store.jsx
import { create } from 'zustand';
import { MAX_HISTORY, STORAGE_KEY, AUTOSAVE_DEBOUNCE_MS } from './constants.js';

// deep clone for history snapshots
const snap = (obj) => JSON.parse(JSON.stringify(obj));

// Load saved state from localStorage
function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        keyData: parsed.keyData || {},
        device: parsed.device || 'cyro',
        gameTitle: parsed.gameTitle || 'Untitled',
        title: parsed.gameTitle || 'Untitled',
        themeId: parsed.themeId || null,
        randomPalette: parsed.randomPalette || null,
        zones: parsed.zones || {},
        analogNames: parsed.analogNames || { up: 'W', left: 'A', down: 'S', right: 'D' },
        showNumbers: parsed.showNumbers ?? true,
        showGloss: parsed.showGloss ?? true,
        showLegend: parsed.showLegend ?? true,
        lock: parsed.lock ?? true,
        grid: parsed.grid ?? true,
        invert: parsed.invert ?? false,
        snap: parsed.snap ?? true,
      };
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }
  return {};
}

const savedState = loadSavedState();

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
  gameTitle: 'Untitled',
  title: 'Untitled',

  /* ---------------------- Theme & Palette ---------------------- */
  themeId: null,
  randomPalette: null,

  /* ---------------------- Key data ---------------------- */
  // Single source of truth for key data
  keyData: {},

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

  // Track if there are unsaved changes (for beforeunload warning)
  hasUnsavedChanges: false,

  /* ---------------------- Special ids ---------------------- */
  mwId: 'MW',         // lets BoardCanvas match id === mwId
  mwUpId: 'MW_UP',
  mwDownId: 'MW_DOWN',
  analogNames: { up: 'W', left: 'A', down: 'S', right: 'D' },

  /* ---------------------- Live mode: pressed keys ---------------------- */
  pressedKeys: new Set(), // Set of currently pressed key codes (e.g., 'KeyW', 'Space')

  // Merge in any saved state from localStorage
  ...savedState,
};

export const useStore = create(() => ({ ...initial }));

// Auto-save to localStorage with debouncing
let saveTimeout = null;
useStore.subscribe((state, prevState) => {
  // Only save when significant data changes, not UI state
  const shouldSave =
    state.keyData !== prevState.keyData ||
    state.device !== prevState.device ||
    state.gameTitle !== prevState.gameTitle ||
    state.themeId !== prevState.themeId ||
    state.randomPalette !== prevState.randomPalette ||
    state.zones !== prevState.zones ||
    state.analogNames !== prevState.analogNames ||
    state.showNumbers !== prevState.showNumbers ||
    state.showGloss !== prevState.showGloss ||
    state.showLegend !== prevState.showLegend ||
    state.lock !== prevState.lock ||
    state.grid !== prevState.grid ||
    state.invert !== prevState.invert ||
    state.snap !== prevState.snap;

  if (shouldSave) {
    // Mark as having unsaved changes
    if (!state.hasUnsavedChanges) {
      useStore.setState({ hasUnsavedChanges: true });
    }

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          keyData: state.keyData,
          device: state.device,
          gameTitle: state.gameTitle,
          themeId: state.themeId,
          randomPalette: state.randomPalette,
          zones: state.zones,
          analogNames: state.analogNames,
          showNumbers: state.showNumbers,
          showGloss: state.showGloss,
          showLegend: state.showLegend,
          lock: state.lock,
          grid: state.grid,
          invert: state.invert,
          snap: state.snap,
          savedAt: Date.now()
        }));
        // Mark as saved
        useStore.setState({ hasUnsavedChanges: false });
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }
});

// Helper to cap history at MAX_HISTORY
const capHistory = (history) => history.slice(-MAX_HISTORY);

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
        keyData: action.keys || {},
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
              if (clip[f] !== undefined) {
                patch[f] = clip[f];
              }
              break;
            }
          }
        });
        // Emoji/Icon exclusivity
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
        history: capHistory([...s.history, before]),
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
        useStore.setState({ keyData: nextKD });
        break;
      }

      const beforeKD = s.pendingBefore ? s.pendingBefore : snap(s.keyData || {});
      const nextKD2 = { ...(s.keyData || {}) };
      ids.forEach((id) => {
        nextKD2[id] = { ...(nextKD2[id] || {}), ...(action.patch || {}) };
      });
      useStore.setState({
        keyData: nextKD2,
        history: capHistory([...s.history, beforeKD]),
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
        history,
        future: [s.keyData, ...s.future].slice(0, MAX_HISTORY),
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
        future,
        history: capHistory([...s.history, s.keyData]),
        pendingBefore: null
      });
      break;
    }

    /* ---------- Movement (optional) ---------- */
    case 'MOVE_KEY': {
      if (s.lock) return; // respect lock: block key dragging only
      const before = snap(s.keyData);
      const next = { ...s.keyData };
      const id = action.id;
      const curr = next[id] || {};
      next[id] = { ...curr, x: action.pos.x, y: action.pos.y };
      useStore.setState({
        keyData: next,
        history: capHistory([...s.history, before]),
        future: []
      });
      break;
    }

    /* ---------- Zones ---------- */
    case 'ASSIGN_ZONE': {
      const ids = (action.ids && action.ids.length ? action.ids : s.selection);
      const zone = (action.zone || '').trim();
      if (!ids.length) return;

      const beforeKD = snap(s.keyData);
      const nextKD = { ...s.keyData };
      const nextZones = { ...s.zones };

      // remove from all zones
      Object.keys(nextZones).forEach((z) => {
        nextZones[z] = nextZones[z].filter((kid) => !ids.includes(kid));
        if (!nextZones[z].length) delete nextZones[z];
      });

      if (zone) nextZones[zone] = Array.from(new Set([...(nextZones[zone] || []), ...ids]));

      ids.forEach((id) => {
        const curr = nextKD[id] || {};
        nextKD[id] = { ...curr, zone: zone || undefined };
      });

      useStore.setState({
        keyData: nextKD,
        zones: nextZones,
        history: capHistory([...s.history, beforeKD]),
        future: []
      });
      break;
    }

    /* ---------- Clear saved data ---------- */
    case 'CLEAR_SAVED': {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to clear saved data:', e);
      }
      break;
    }

    /* ---------- Optional: pipe zoom commands as events ---------- */
    case 'BOARD_ZOOM': {
      try { window.dispatchEvent(new CustomEvent('board:zoom', { detail: { cmd: action.cmd } })); } catch {}
      break;
    }

    default:
      console.warn('Unknown action', action);
  }
};

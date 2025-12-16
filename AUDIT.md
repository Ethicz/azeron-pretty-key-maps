# Azeron Pretty Key Maps — Code Audit Report

**Date:** December 16, 2025
**Scope:** Full codebase review for quality, performance, UX, and maintainability improvements
**Constraint:** Preserve existing layouts and visual design

---

## Executive Summary

This is a well-crafted React application for creating Azeron keypad printouts. The codebase is compact (~6.3K LOC), uses modern tooling (Vite, Zustand), and has thoughtful responsive design. However, there are significant opportunities for improvement in code organization, data persistence, performance, and user experience.

**Priority Levels:**
- 🔴 **Critical** — High impact, should address first
- 🟠 **Important** — Significant improvement, medium effort
- 🟡 **Nice-to-have** — Quality of life improvements

---

## 🔴 Critical Improvements

### 1. Add Auto-Save to LocalStorage

**Problem:** Users lose all work if they accidentally close the browser, refresh the page, or experience a crash. This is the #1 usability issue.

**Solution:** Implement auto-save with localStorage debouncing.

**Location:** `src/lib/store.jsx`

```jsx
// Add after initial state definition
const STORAGE_KEY = 'azeron-keymap-autosave';
const DEBOUNCE_MS = 1000;

// Load from localStorage on init
function loadSavedState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        keyData: parsed.keyData || {},
        device: parsed.device || 'cyro',
        gameTitle: parsed.gameTitle || 'Untitled',
        themeId: parsed.themeId || null,
        zones: parsed.zones || {},
        // Don't restore transient UI state
      };
    }
  } catch (e) {
    console.warn('Failed to load saved state:', e);
  }
  return {};
}

// Add subscription in store setup
let saveTimeout = null;
useStore.subscribe((state, prevState) => {
  // Only save when data changes, not UI flags
  if (state.keyData !== prevState.keyData ||
      state.device !== prevState.device ||
      state.gameTitle !== prevState.gameTitle) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          keyData: state.keyData,
          device: state.device,
          gameTitle: state.gameTitle,
          themeId: state.themeId,
          zones: state.zones,
          savedAt: Date.now()
        }));
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, DEBOUNCE_MS);
  }
});
```

**Effort:** ~30 minutes
**Impact:** Prevents data loss, huge UX improvement

---

### 2. Limit Undo/Redo History

**Problem:** History arrays grow unbounded, consuming memory indefinitely.

**Location:** `src/lib/store.jsx:290` and `:320`

**Solution:**
```jsx
const MAX_HISTORY = 50;

// In EDIT_KEYS and other history-pushing actions:
useStore.setState({
  keyData: nextKD2,
  keys: { ...(s.keys || {}), ...nextKD2 },
  history: [...s.history, beforeKD].slice(-MAX_HISTORY), // Cap at 50
  future: [],
  pendingBefore: null
});
```

**Effort:** 10 minutes
**Impact:** Prevents memory leaks in long sessions

---

### 3. Extract Duplicated Constants

**Problem:** `PLACEHOLDERS` array (50 items) is duplicated in 4 files. `DEFAULT_RAINBOW` palette is repeated 5+ times. Changes require editing multiple files.

**Locations:**
- `src/components/BoardCanvas.jsx:24-32`
- `src/components/Inspector.jsx:13-21`
- `src/components/MobileInspector.jsx`
- `src/components/ExportPage.jsx`

**Solution:** Create `src/lib/constants.js`:

```js
import { BASE } from './themes.js';

export const DEFAULT_RAINBOW = [
  BASE.red, BASE.orange, BASE.yellow, BASE.green,
  BASE.teal, BASE.blue, BASE.indigo, BASE.violet
];

export const PLACEHOLDERS = [
  'Move Forward','Move Left','Move Back','Move Right','Jump','Crouch','Sprint','Walk Toggle',
  'Primary Fire','Secondary Fire','Aim / ADS','Reload','Melee','Use / Interact','Ping / Marker','Holster',
  'Prev Weapon','Next Weapon','Switch Weapon','Grenade',
  'Ability 1','Ability 2','Ability 3','Ultimate','Quick Slot 1','Quick Slot 2','Quick Slot 3','Quick Slot 4',
  'Inventory','Map','Quest / Journal','Skills','Build / Craft','Photo Mode','Toggle Camera','Scoreboard',
  'Push-to-Talk','Team Chat','Emote','Wheel / Radial','Prone','Slide / Dodge','Roll','Parry / Block',
  'Cast Spell','Mount / Vehicle','Lean Left','Lean Right','Pause / Menu','Settings'
];

// Layout dimensions
export const GRID_STEP = 20;
export const DEFAULT_KEY_W = 100;
export const DEFAULT_KEY_H = 140;
export const ANALOG_W = 240;
export const ANALOG_H = 280;
```

**Effort:** 20 minutes
**Impact:** Single source of truth, easier maintenance

---

## 🟠 Important Improvements

### 4. Split BoardCanvas Into Smaller Components

**Problem:** `BoardCanvas.jsx` is 1,117 lines — too large to maintain effectively. It handles rendering, drag/drop, zoom, pan, context menus, and more.

**Solution:** Extract into focused components:

```
src/components/board/
├── BoardCanvas.jsx       # Main container (~200 lines)
├── KeyTileRenderer.jsx   # Renders individual key tiles
├── SplitWheelTile.jsx    # Split mouse wheel (currently inline)
├── ZoomControls.jsx      # ZoomHud extracted
├── MobileControls.jsx    # Mobile slider + undo/redo
├── useBoardZoom.js       # Custom hook for zoom/pan logic
├── useBoardDrag.js       # Custom hook for drag logic
└── usePinchZoom.js       # Touch pinch-zoom hook
```

**Example extraction — useBoardZoom.js:**
```js
import { useState, useCallback, useRef } from 'react';

export function useBoardZoom(initialZoom = 1) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const clampZoom = useCallback((z) => Math.min(2.5, Math.max(0.2, z)), []);

  const zoomAtPoint = useCallback((clientX, clientY, deltaScale) => {
    const worldX = (clientX - pan.x) / zoom;
    const worldY = (clientY - pan.y) / zoom;
    const next = clampZoom(zoom * deltaScale);
    const nx = clientX - worldX * next;
    const ny = clientY - worldY * next;
    setZoom(next);
    setPan({ x: nx, y: ny });
  }, [zoom, pan, clampZoom]);

  return { zoom, pan, setZoom, setPan, zoomAtPoint, clampZoom };
}
```

**Effort:** 2-3 hours
**Impact:** Dramatically easier to maintain and test

---

### 5. Consolidate Dual State Fields

**Problem:** Both `keyData` and `keys` are maintained in parallel for "legacy compatibility." This doubles memory usage and creates sync bugs.

**Location:** `src/lib/store.jsx:30-33`

```js
keyData: {}, // id -> { label, subtitle, color, ... }
keys: {},    // Older actions below keep using "keys"
```

**Solution:** Pick one (`keyData` is better named) and migrate all references. The store's `snap()` function already clones, so there's no actual reason to keep both.

**Migration steps:**
1. Search codebase for `st.keys` and `s.keys`
2. Replace with `st.keyData` / `s.keyData`
3. Remove `keys` from initial state
4. Remove sync logic from all actions

**Effort:** 1 hour
**Impact:** Simpler code, less memory, fewer bugs

---

### 6. Add "Unsaved Changes" Warning

**Problem:** No warning when navigating away with unsaved work.

**Solution:** Add beforeunload handler:

```jsx
// In App.jsx or a dedicated hook
useEffect(() => {
  const handler = (e) => {
    const state = useStore.getState();
    const hasChanges = state.history.length > 0;
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, []);
```

**Effort:** 15 minutes
**Impact:** Prevents accidental data loss

---

### 7. Fix KeyTile.jsx Widget Unused

**Problem:** There's a `src/components/widgets/KeyTile.jsx` (272 lines) that appears to be a standalone component, but `BoardCanvas.jsx` renders key tiles inline (~100 lines of JSX). This is confusing and wasteful.

**Solution:** Either:
- **Option A:** Use the existing `KeyTile` widget in `BoardCanvas`
- **Option B:** Delete the unused widget file

The inline rendering in BoardCanvas could be replaced with:
```jsx
<KeyTile
  key={k.id}
  keyData={k}
  isSelected={isSelected(k.id)}
  onPointerDown={(e) => onKeyPointerDown(e, k)}
  onPointerMove={(e) => onKeyPointerMove(e, k)}
  onPointerUp={onKeyPointerUp}
  onContextMenu={(e) => { /* ... */ }}
/>
```

**Effort:** 1 hour
**Impact:** DRY code, consistent rendering

---

### 8. Remove Unused Framer Motion

**Problem:** `framer-motion` is in `package.json` but minimally used in the codebase. It adds ~50KB to the bundle.

**Verification:**
```bash
grep -r "framer-motion" src/
grep -r "motion\." src/
```

If no meaningful animations are found, remove:
```bash
npm uninstall framer-motion
```

**Effort:** 10 minutes
**Impact:** Smaller bundle size

---

### 9. Add Error Boundaries

**Problem:** If a component crashes (e.g., bad JSON import), the entire app goes white with no feedback.

**Solution:** Add React error boundary:

```jsx
// src/components/ErrorBoundary.jsx
import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#fff', background: '#1a1a2e' }}>
          <h2>Something went wrong</h2>
          <p>Try refreshing the page. Your auto-saved data should be preserved.</p>
          <pre style={{ color: '#ff6b6b' }}>{this.state.error?.message}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

Wrap in `main.jsx`:
```jsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

**Effort:** 20 minutes
**Impact:** Graceful failure handling

---

## 🟡 Nice-to-Have Improvements

### 10. Add Keyboard Navigation for Key Selection

**Problem:** Keys can only be selected by mouse/touch. Power users want arrow-key navigation.

**Solution:**
```jsx
// In BoardCanvas, add keyboard handler
useEffect(() => {
  const onKeyDown = (e) => {
    if (!selection.length) return;
    const currentIdx = merged.findIndex(k => k.id === selection[0]);
    if (currentIdx < 0) return;

    let nextIdx = currentIdx;
    switch (e.key) {
      case 'ArrowRight': nextIdx = Math.min(merged.length - 1, currentIdx + 1); break;
      case 'ArrowLeft': nextIdx = Math.max(0, currentIdx - 1); break;
      case 'ArrowDown': nextIdx = Math.min(merged.length - 1, currentIdx + 5); break;
      case 'ArrowUp': nextIdx = Math.max(0, currentIdx - 5); break;
      default: return;
    }
    if (nextIdx !== currentIdx) {
      e.preventDefault();
      useStore.setState({ selection: [merged[nextIdx].id] });
    }
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [selection, merged]);
```

**Effort:** 30 minutes
**Impact:** Better accessibility, power-user friendly

---

### 11. Add PDF Export Option

**Problem:** Only PNG export is available. PDFs scale better for printing.

**Solution:** Use `jspdf` library:

```bash
npm install jspdf
```

```js
// src/lib/exportPdf.js
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

export async function downloadPDF(element, filename = 'keymap.pdf') {
  const dataUrl = await toPng(element, { quality: 1.0 });
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
  const imgProps = pdf.getImageProperties(dataUrl);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
}
```

**Effort:** 45 minutes
**Impact:** Better print quality

---

### 12. Use Proper `<button>` Elements

**Problem:** Many clickable elements are `<div className="btn">` instead of semantic `<button>` elements. This breaks keyboard accessibility and screen readers.

**Solution:** Replace:
```jsx
// Before
<div className="btn" onClick={...}>Save</div>

// After
<button type="button" className="btn" onClick={...}>Save</button>
```

**Effort:** 1 hour (global find/replace with manual review)
**Impact:** Accessibility compliance

---

### 13. Add Theme Preview in Dropdown

**Problem:** Theme dropdown shows text names only. Users must apply a theme to see its colors.

**Solution:** Add color swatches:
```jsx
{THEMES.map(t => (
  <button key={t.id} onClick={() => selectTheme(t.id)}>
    <span className="theme-swatches">
      {t.keys.split(',').slice(0, 4).map((c, i) => (
        <span key={i} style={{ background: c.trim(), width: 12, height: 12, borderRadius: 3 }} />
      ))}
    </span>
    <span>{t.name}</span>
  </button>
))}
```

**Effort:** 30 minutes
**Impact:** Faster theme selection

---

### 14. Typo in Widget Filename

**Problem:** `src/components/widgets/Keyile.jsx` — missing "T" in KeyTile.

**Solution:**
```bash
git mv src/components/widgets/Keyile.jsx src/components/widgets/KeyTile.jsx
# Update any imports
```

Note: Check if this is actually used or if it's a duplicate of `KeyTile.jsx`.

**Effort:** 5 minutes
**Impact:** Code clarity

---

## Performance Optimizations

### 15. Optimize Store Subscriptions

**Problem:** `BoardCanvas` subscribes to the entire store with `useStore()`, causing re-renders on any state change.

**Current:**
```jsx
const s = useStore();
```

**Better:**
```jsx
const device = useStore(s => s.device);
const selection = useStore(s => s.selection);
const lock = useStore(s => s.lock);
// etc.
```

Or use a shallow comparison selector:
```jsx
import { shallow } from 'zustand/shallow';

const { device, selection, lock } = useStore(
  s => ({ device: s.device, selection: s.selection, lock: s.lock }),
  shallow
);
```

**Effort:** 30 minutes
**Impact:** Fewer unnecessary re-renders

---

### 16. Memoize Expensive Computations

**Problem:** `merged` array in BoardCanvas recomputes on every render even when inputs haven't changed.

**Current code handles this with `useMemo`, but dependencies are broad.** Consider React.memo for child components:

```jsx
const KeyTileRenderer = React.memo(function KeyTileRenderer({ keyData, ...props }) {
  // render logic
}, (prev, next) => {
  // custom comparison
  return prev.keyData.id === next.keyData.id &&
         prev.keyData.label === next.keyData.label &&
         prev.keyData.color === next.keyData.color;
});
```

**Effort:** 1 hour
**Impact:** Smoother interactions with many keys

---

## Summary — Priority Action Items

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 🔴 | Auto-save to localStorage | 30 min | Prevents data loss |
| 🔴 | Limit undo/redo history | 10 min | Prevents memory leak |
| 🔴 | Extract duplicated constants | 20 min | Maintainability |
| 🟠 | Split BoardCanvas | 2-3 hrs | Major maintainability |
| 🟠 | Consolidate keys/keyData | 1 hr | Simpler state |
| 🟠 | Add unsaved changes warning | 15 min | UX safety |
| 🟠 | Error boundary | 20 min | Graceful failures |
| 🟡 | Keyboard navigation | 30 min | Accessibility |
| 🟡 | PDF export | 45 min | Better printing |
| 🟡 | Semantic buttons | 1 hr | Accessibility |

---

## What's Already Good

Your app does several things well:

1. **Zustand state management** — Clean, minimal, with good dispatch pattern
2. **Responsive design** — Mobile-first with notch support
3. **Colorblind themes** — Thoughtful accessibility inclusion
4. **Pinch-to-zoom** — Well-implemented touch support
5. **Transient vs committed edits** — Smart undo/redo strategy
6. **Zone system** — Flexible key grouping
7. **Context menu** — Right-click for quick actions
8. **Theme variety** — 26 themes including game-specific ones

---

## Next Steps

1. Start with **auto-save** — biggest bang for buck
2. Extract **constants** to reduce duplication
3. Add **history limit** and **beforeunload warning**
4. Plan the **BoardCanvas refactor** for a focused session

The app is solid for its purpose. These improvements will make it more robust and maintainable without changing its character.

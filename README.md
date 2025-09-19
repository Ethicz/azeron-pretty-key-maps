Azeron Key-Mapper — Copy/Paste + Undo/Redo Polish
What we’re trying to accomplish

Make the editor feel consistent and predictable:

Copy/Paste from the context menu should work every time (single or multi-select), pasting exactly what you copied.

Undo/Redo should match user expectations:

Desktop buttons and keyboard shortcuts are aligned (Undo = ↶ / Ctrl/Cmd+Z, Redo = ↷ / Ctrl+Shift+Z).

Color picker drags shouldn’t flood history; a drag is one undoable change with live preview while dragging.

UI placement:

Undo/Redo buttons live on the far right of the desktop top bar.

On mobile, a small undo/redo chip appears under the canvas (bottom-left) so it doesn’t get in the way.

Footer: add a small disclaimer + two buttons (Discord, Azeron) without touching core flows.

Why these changes

Your app’s source of truth is keyData, but some older paths (incl. paste and some history) still wrote/read from keys. That mismatch made it look like pastes didn’t work (or got overwritten by live inspector).

Native <input type="color"> fires a lot of input events while dragging. Treating each as a commit spammed history. We need transient updates during drag + one final commit on drop.

Undo/Redo labeling was flipped at first; mapping it correctly prevents “Undo looks like Redo.”

Change plan (minimal & surgical)

Store (src/lib/store.jsx)

Make PASTE operate on keyData (snapshot keyData into history; mirror back to keys for legacy code paths).

Enforce emoji vs icon exclusivity on paste.

Add transient edits to EDIT_KEYS to support live preview while dragging controls (e.g., color), and commit one history step at the end.

Ensure UNDO/REDO work over keyData snapshots and clear any transient stash.

BoardCanvas

When copying, include all fields needed for a complete paste (iconColor, iconSize, imageMode, legacy aliases).

Keep context-menu logic that respects current selection (don’t collapse a multi-select when right-clicking an already-selected key).

Inspector

Wire color input to send transient:true updates on onInput, and a committed EDIT_KEYS on onChange.

TopBar + Mobile overlay

Ensure the Undo ↶ button triggers UNDO and Redo ↷ triggers REDO.

Desktop: position far-right; Mobile: small controls bottom-left under canvas.

Footer

Add a neutral disclaimer and two buttons (Discord, Azeron) without interfering with existing flows.

Code: exact patches

Use these markers if you paste partials:
// BEGIN <marker> … // END <marker>

1) Store — Clipboard + History + Transient Edits

File: src/lib/store.jsx

Add a pendingBefore field to initial:

// BEGIN store-initial-pending
pendingBefore: null, // stash a snapshot during slider/picker drags
// END store-initial-pending


Replace the Clipboard ops + Undo/Redo block with this (drop-in):

// BEGIN store-clipboard-and-history
/* ---------- Clipboard ops ---------- */
case 'COPY': {
  useStore.setState({ clipboard: action.data || null });
  break;
}

case 'PASTE': {
  const clip = s.clipboard;
  if (!clip) return;
  const ids = (action.ids && action.ids.length ? action.ids : s.selection);
  if (!ids.length) return;

  // Use keyData as source of truth
  const before = snap(s.keyData || {});
  const nextKD = { ...(s.keyData || {}) };

  const fields = action.fields || [
    'label', 'subtitle', 'sub', 'emoji', 'icon', 'color',
    'imageUrl', 'image', 'imageMode', 'iconColor', 'iconSize'
  ];

  ids.forEach((id) => {
    const curr = nextKD[id] || {};
    const patch = {};

    fields.forEach((f) => {
      if (f === 'sub' && clip.sub !== undefined) {
        patch.subtitle = clip.sub;
      } else if (f === 'image' && clip.image !== undefined) {
        patch.imageUrl = clip.image;
      } else if (clip[f] !== undefined) {
        patch[f] = clip[f];
      }
    });

    // Emoji/Icon exclusive
    if (patch.emoji !== undefined && patch.emoji) {
      patch.icon = undefined;
    }
    if (patch.icon !== undefined && patch.icon) {
      patch.emoji = undefined;
    }

    nextKD[id] = { ...curr, ...patch };
  });

  useStore.setState({
    keyData: nextKD,
    // keep legacy mirror in sync
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
    if (!s.pendingBefore) {
      useStore.setState({ pendingBefore: snap(s.keyData || {}) });
    }
    const nextKD = { ...(s.keyData || {}) };
    ids.forEach((id) => { nextKD[id] = { ...(nextKD[id] || {}), ...(action.patch || {}) }; });
    useStore.setState({
      keyData: nextKD,
      keys: { ...(s.keys || {}), ...nextKD } // mirror
    });
    break;
  }

  const before = s.pendingBefore ? s.pendingBefore : snap(s.keyData || {});
  const nextKD = { ...(s.keyData || {}) };
  ids.forEach((id) => { nextKD[id] = { ...(nextKD[id] || {}), ...(action.patch || {}) }; });

  useStore.setState({
    keyData: nextKD,
    keys: { ...(s.keys || {}), ...nextKD },
    history: [...s.history, before],
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
// END store-clipboard-and-history

2) BoardCanvas — Copy includes all fields

File: src/components/BoardCanvas.jsx
Update the clipboard payload:

// BEGIN ctx-copy-fields
function copySelectionToClipboard() {
  ensureSelectionFromCtx();
  const st = useStore.getState();
  const ids = st.selection || [];
  if (!ids.length) return;
  const id = ids[0];
  const src = (st.keyData && st.keyData[id]) || {};
  const clip = {
    label: src.label ?? '',
    subtitle: src.subtitle ?? '',
    sub: src.subtitle ?? '',
    emoji: src.emoji ?? '',
    icon: src.icon ?? '',
    iconColor: src.iconColor ?? '#ffffff',
    iconSize: src.iconSize ?? 32,
    color: src.color ?? null,
    imageUrl: src.imageUrl ?? '',
    image: src.imageUrl ?? '',
    imageMode: src.imageMode ?? 'cover'
  };
  dispatch({ type: 'COPY', data: clip });
}
// END ctx-copy-fields


(Optional) Add icon paste actions to the context menu and route them to PASTE with ['icon','iconColor','iconSize'] or just ['iconColor','iconSize'].

3) Inspector — Color input: transient while dragging, commit on change

File: src/components/Inspector.jsx
Wire color to transient updates:

// BEGIN inspector-color-transient
<input
  type="color"
  value={active.color}
  onInput={(e) => {
    const val = e.target.value;
    updateWithRules({ color: val }, 'color'); // local preview across selected IDs

    const ids = (useStore.getState().multiSelect
      ? (useStore.getState().selection || [])
      : [active.id]).filter(Boolean);

    if (ids.length) {
      useDispatch()({ type:'EDIT_KEYS', ids, patch:{ color: val }, transient:true });
    }
  }}
  onChange={(e) => {
    const val = e.target.value;
    const ids = (useStore.getState().multiSelect
      ? (useStore.getState().selection || [])
      : [active.id]).filter(Boolean);

    if (ids.length) {
      useDispatch()({ type:'EDIT_KEYS', ids, patch:{ color: val } }); // single history step
    }
  }}
/>
// END inspector-color-transient

4) UI — Undo/Redo button mapping

File: src/components/TopBar.jsx (desktop)
Button handlers and labels:

// BEGIN undo-redo-desktop
<div className="toolbarRight" style={{ position:'absolute', right:12, top:12, display:'flex', gap:8 }}>
  <button
    className="btn"
    title="Undo (Ctrl/Cmd+Z)"
    disabled={!(useStore.getState().history||[]).length}
    onClick={() => dispatch({ type:'UNDO' })}
  >
    ↶ Undo
  </button>
  <button
    className="btn"
    title="Redo (Ctrl+Shift+Z)"
    disabled={!(useStore.getState().future||[]).length}
    onClick={() => dispatch({ type:'REDO' })}
  >
    Redo ↷
  </button>
</div>
// END undo-redo-desktop


File: src/components/BoardCanvas.jsx (mobile overlay under canvas)

// BEGIN undo-redo-mobile
{isNarrow && (
  <div
    style={{
      position:'absolute', left:12, bottom:12, zIndex:6,
      display:'flex', gap:8, pointerEvents:'auto'
    }}
  >
    <button
      className="btn"
      title="Undo"
      disabled={!(useStore.getState().history||[]).length}
      onClick={() => dispatch({ type:'UNDO' })}
    >
      ↶
    </button>
    <button
      className="btn"
      title="Redo"
      disabled={!(useStore.getState().future||[]).length}
      onClick={() => dispatch({ type:'REDO' })}
    >
      ↷
    </button>
  </div>
)}
// END undo-redo-mobile

5) Footer

File: src/App.jsx (after <main>)

// BEGIN app-footer
<footer className="appFooter">
  <div className="footLine">
    This tool is community-made for faster, clearer Azeron key mapping. Not affiliated with Azeron.
  </div>
  <div className="footActions">
    <a className="btn" href="https://discord.gg/yourserver" target="_blank" rel="noreferrer">Join the Discord</a>
    <a className="btn" href="https://www.azeron.eu/" target="_blank" rel="noreferrer">Visit Azeron</a>
  </div>
</footer>
// END app-footer


(Update the Discord URL as needed.)

Testing checklist

Copy/Paste:

Copy a key → Paste All onto single and multi-selection.

Verify label, subtitle, emoji/icon (exclusive), color, image + mode, icon color/size.

Undo/Redo:

Desktop ↶/↷ and keyboard shortcuts behave correctly.

Color dragging produces live preview but one undo step on mouse up.

Multi-select:

Right-click on any already-selected key opens the menu without breaking selection.

Bulk paste applies to all selected keys.

Mobile:

Undo/Redo chip appears bottom-left, non-intrusive, and works.

Footer:

Visible, links work, nothing overlaps.
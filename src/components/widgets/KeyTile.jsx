// src/components/widgets/KeyTile.jsx
import React, { useRef } from 'react';
import { useStore } from '../../lib/store.jsx';
import { lightenColor, isLight } from '../../lib/utils.js';
import { currentLayout } from '../../layouts/index.js';

const TILE_W = 120;
const TILE_H = 140;
const GRID = 40;
const DRAG_THRESHOLD = 4;

export default function KeyTile({ id, x, y, w = TILE_W, h = TILE_H, onContext }) {
  const s = useStore();
  const def = currentLayout(s.device);

  const data = (s.keyData && s.keyData[id]) || (s.keys && s.keys[id]) || {};
  const selected = (s.selection || []).includes(id);
  const multi = !!s.multiSelect;
  const { showNumbers = true, showGloss = true, lock = false } = s;

  // numbering (exclude blanks, preserve order)
  const allNonBlank = def.keys.filter(k => !k.blank);
  const idx = allNonBlank.findIndex(k => k.id === id);
  const number = idx >= 0 ? idx + 1 : null;

  // face + text colors
  const unassigned = !!data.unassigned;
  // Determine the base color. Use a muted grey for unassigned keys if
  // the user hasn't explicitly chosen a color. Otherwise use the
  // assigned color or fallback blue.
  let base = data.color;
  if (!base) {
    base = unassigned ? '#6e6e6e' : '#4a90e2';
  }
  const labelColor = isLight(base) ? '#0c1225' : '#ffffff';
  const subColor   = isLight(base) ? '#0c1225' : 'rgba(255,255,255,0.9)';

  const top = lightenColor(base, 30);
  const bottom = lightenColor(base, -10);
  const baseGrad = `linear-gradient(150deg, ${top}, ${bottom})`;
  const sheen = `radial-gradient(circle at 22% 18%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 65%)`;
  const backgroundStyle = {
    backgroundColor: base,
    backgroundImage: showGloss ? `${baseGrad}, ${sheen}` : baseGrad
  };

  // emoji/icon/image
  const { emoji, icon, image, imageMode } = data;
  // unify subtitle field for backward compatibility; default to empty string
  const subtitle = data.subtitle ?? data.sub ?? '';
  const centerEmoji = !!emoji && imageMode !== 'icon' && !image;
  // scale emoji size relative to tile width
  const EMOJI_SIZE = Math.round(w * 0.34);

  // ── drag & selection ────────────────────────────────────────────────────────
  const dragRef = useRef(null);

  const commitMove = (dx, dy) => {
    const st = useStore.getState();
    const ids = (st.selection && st.selection.length ? st.selection : [id]);
    // snapshot keyData so that undo/redo reverts positions
    const before = JSON.parse(JSON.stringify(st.keyData || {}));
    const next = { ...(st.keyData || {}) };
    const step = st.snap ? GRID : 1;
    ids.forEach(kid => {
      const defK = getKey(def, kid);
      const src = next[kid] || {};
      const ox = src.x ?? (defK?.x || 0);
      const oy = src.y ?? (defK?.y || 0);
      next[kid] = {
        ...src,
        x: Math.round((ox + dx) / step) * step,
        y: Math.round((oy + dy) / step) * step
      };
    });
    useStore.setState({
      keyData: next,
      keys: { ...(st.keys || {}), ...next },
      history: [...(st.history || []), before],
      future: []
    });
  };

  const onMouseDown = (e) => {
    if (e.button === 2) return;

    if (multi || e.shiftKey || e.ctrlKey || e.metaKey) {
      const sel = new Set(useStore.getState().selection || []);
      sel.has(id) ? sel.delete(id) : sel.add(id);
      useStore.setState({ selection: Array.from(sel) });
    } else {
      useStore.setState({ selection: [id] });
    }

    if (lock) return;

    dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false };

    const onMove = (ev) => {
      const d = dragRef.current; if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.moved && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) d.moved = true;
      if (!d.moved) return;

      const st = useStore.getState();
      const ids = (st.selection && st.selection.length ? st.selection : [id]);
      const next = { ...(st.keyData || {}) };
      ids.forEach(kid => {
        const defK = getKey(def, kid);
        const src = next[kid] || {};
        const ox = src.x ?? (defK?.x || 0);
        const oy = src.y ?? (defK?.y || 0);
        next[kid] = { ...src, x: ox + dx, y: oy + dy };
      });
      useStore.setState({ keyData: next, keys: { ...(st.keys || {}), ...next } });
    };

    const onUp = (ev) => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      const d = dragRef.current; dragRef.current = null;
      if (!d || !d.moved) return;
      commitMove(ev.clientX - d.startX, ev.clientY - d.startY);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onContextMenu = (e) => {
    e.preventDefault();
    onContext?.(e);
  };

  // ── graphic layer ───────────────────────────────────────────────────────────
  const Graphic = () => {
    if (image && imageMode === 'fill') {
      return (
        <img
          src={image}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.75, borderRadius: 16, pointerEvents: 'none'
          }}
        />
      );
    }

    if (emoji) {
      if (imageMode === 'icon') {
        // small corner mark
        return (
          <div
            style={{
              position: 'absolute', right: 6, top: 6, zIndex: 2,
              width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.45))', pointerEvents: 'none'
            }}
          >
            <span aria-hidden="true">{emoji}</span>
          </div>
        );
      }
      // centered emoji (placed high enough to avoid label collision)
      return (
        <div
          style={{
            position: 'absolute', left: 0, right: 0,
            top: '42%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1, pointerEvents: 'none',
            filter: 'drop-shadow(0 3px 10px rgba(0,0,0,.45))'
          }}
        >
          <span aria-hidden="true" style={{ fontSize: EMOJI_SIZE, lineHeight: 1 }}>{emoji}</span>
        </div>
      );
    }

    if (icon) {
      return (
        <div
          style={{
            position: 'absolute', right: 6, top: 6, zIndex: 2,
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.45))', pointerEvents: 'none'
          }}
        >
          <span aria-hidden="true">{icon}</span>
        </div>
      );
    }

    return null;
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={`key-tile${selected ? ' selected' : ''}`}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{
        position: 'absolute',
        left: x, top: y, width: w, height: h, borderRadius: 16, ...backgroundStyle
      }}
        aria-label={data.label || (unassigned ? 'Unassigned' : `Key ${number || ''}`)}
    >
      {/* subtle inner border */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.18)', pointerEvents: 'none'
      }} />

      {/* number pill */}
      {showNumbers && number != null && (
        <div className="numWrap"><div className="numBadge">{number}</div></div>
      )}

      {/* graphic */}
      <Graphic />

      {/* text block — positioned lower so it never touches emoji */}
      <div
        style={{
          position: 'absolute', left: 8, right: 8,
          top: centerEmoji ? '74%' : '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 2, textAlign: 'center'
        }}
      >
        <div
          className="label"
          style={{
            color: labelColor,
            fontWeight: 800, fontSize: 13, letterSpacing: '.2px',
            /* crisp thin outline for contrast on light colors */
            textShadow:
              '-1px 0 0 rgba(0,0,0,.55), 1px 0 0 rgba(0,0,0,.55),' +
              '0 -1px 0 rgba(0,0,0,.55), 0 1px 0 rgba(0,0,0,.55)'
          }}
        >
          {data.label || (unassigned ? 'Unassigned' : '')}
        </div>
        {subtitle ? (
          <div
            className="sub"
            style={{
              color: subColor,
              marginTop: 4,
              fontWeight: 700, fontSize: 11,
              textShadow:
                '-1px 0 0 rgba(0,0,0,.55), 1px 0 0 rgba(0,0,0,.55),' +
                '0 -1px 0 rgba(0,0,0,.55), 0 1px 0 rgba(0,0,0,.55)'
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* helper */
function getKey(def, id) {
  for (const k of def.keys) if (k.id === id) return k;
  return null;
}

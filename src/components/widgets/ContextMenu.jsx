import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Clamped, click-away closing context menu.
 * - Uses viewport coords (fixed) and clamps within the .stage rect.
 * - Closes on click-away or Escape.
 */
export default function ContextMenu({ x, y, clipboard, selection, onAction, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });
  const hasClipboard = clipboard != null;

  // Clamp to the .stage rect
  useLayoutEffect(() => {
    const stage = document.querySelector('.stage');
    const bounds = stage
      ? stage.getBoundingClientRect()
      : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth || 260;
    const h = el.offsetHeight || 140;
    const M = 8;

    const nx = Math.max(bounds.left + M, Math.min(x, bounds.right - w - M));
    const ny = Math.max(bounds.top + M,  Math.min(y, bounds.bottom - h - M));
    setPos({ x: nx, y: ny });
  }, [x, y]);

  // Click-away & Escape to close
  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose?.();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      role="menu"
    >
      <div className="title">Key actions</div>

      <div className="menu-row">
        <button onClick={() => { onAction?.('copy'); onClose?.(); }}>Copy</button>
      </div>

      <div className="menu-row">
        <button disabled={!hasClipboard} onClick={() => { onAction?.('pasteEmoji'); onClose?.(); }}>Paste Emoji</button>
        <button disabled={!hasClipboard} onClick={() => { onAction?.('pasteColor'); onClose?.(); }}>Paste Color</button>
        <button disabled={!hasClipboard} onClick={() => { onAction?.('pasteImage'); onClose?.(); }}>Paste Image</button>
        <button disabled={!hasClipboard} onClick={() => { onAction?.('pasteIcon'); onClose?.(); }}>Paste Icon</button>
      </div>

      <div className="menu-row">
        <button disabled={!hasClipboard} onClick={() => { onAction?.('pasteAll'); onClose?.(); }} style={{ flex: 1 }}>Paste All</button>
      </div>

      <div className="menu-row">
        <button onClick={onClose} style={{ flex: 1 }}>Close</button>
      </div>
    </div>
  );
}

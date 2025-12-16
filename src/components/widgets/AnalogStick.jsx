// src/components/widgets/AnalogStick.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../lib/store.jsx';
import { currentLayout } from '../../layouts/index.js';

export default function AnalogStick({ x, y }) {
  const s = useStore();
  const def = currentLayout(s.device);

  // analog key at (x,y)
  const analogId = useMemo(() => {
    let found = null;
    for (const k of def.keys) {
      if (!k.analog) continue;
      // prefer keyData overlay; fall back to legacy keys
      const kv = (s.keyData && s.keyData[k.id]) || (s.keys && s.keys[k.id]) || {};
      const px = kv.x !== undefined ? kv.x : k.x;
      const py = kv.y !== undefined ? kv.y : k.y;
      if (px === x && py === y) { found = k.id; break; }
      if (!found) found = k.id;
    }
    return found;
  }, [def, s.keyData, s.keys, x, y]);

  const data = (analogId && ((s.keyData && s.keyData[analogId]) || (s.keys && s.keys[analogId]))) || {};
  const label = (data.label || 'Analog Stick').trim();
  const showGloss = !!s.showGloss;

  // directional labels/bindings from store
  const dnRaw = s.analogNames || {};
  const dn = {
    up: (dnRaw.up || 'W'),
    right: (dnRaw.right || 'D'),
    down: (dnRaw.down || 'S'),
    left: (dnRaw.left || 'A'),
  };

  // Read pressed keys for keyboard-driven analog input
  const pressedKeys = s.pressedKeys || new Set();

  // Calculate keyboard-driven axis values based on pressed direction keys
  const keyboardAxes = useMemo(() => {
    if (!pressedKeys || pressedKeys.size === 0) return null;

    let x = 0, y = 0;

    // Check each direction (case insensitive)
    const isPressed = (binding) => {
      const normalized = (binding || '').trim().toUpperCase();
      if (!normalized) return false;
      for (const key of pressedKeys) {
        if (key.toUpperCase() === normalized) return true;
      }
      return false;
    };

    if (isPressed(dn.up))    y -= 1;
    if (isPressed(dn.down))  y += 1;
    if (isPressed(dn.left))  x -= 1;
    if (isPressed(dn.right)) x += 1;

    // Normalize diagonal movement to unit circle
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x = x / len;
      y = y / len;
    }

    if (x === 0 && y === 0) return null;
    return { x, y };
  }, [pressedKeys, dn.up, dn.down, dn.left, dn.right]);

  // layout
  const W = 240, H = 280;
  const cx = W / 2, cy = H / 2;
  const rOuter = Math.min(W, H) * 0.36;
  const rInner = rOuter * 0.45;

  // cap geometry
  const capR = rInner * 0.92;
  const maxTravel = rOuter - capR - 6;

  // live/drag axes
  const liveAxesRaw = readAxes(s, analogId);
  const [drag, setDrag] = useState(null);
  const svgRef = useRef(null);

  // mouse drag (when no live axes)
  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;

    let dragging = false;
    const toNorm = (evt) => {
      const rect = el.getBoundingClientRect();
      const mx = evt.clientX - rect.left;
      const my = evt.clientY - rect.top;
      const ox = mx - cx;
      const oy = my - cy;
      const len = Math.hypot(ox, oy);
      const lim = maxTravel;
      const k = len > lim ? lim / len : 1;
      const tx = ox * k, ty = oy * k;
      return { x: clamp(tx / lim, -1, 1), y: clamp(ty / lim, -1, 1) };
    };

    const onDown = (e) => {
      if (liveAxesRaw) return;
      e.preventDefault();
      document.body.classList.add('dragging');
      dragging = true;
      setDrag(toNorm(e));
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

    const onMove = (e) => {
      if (!dragging) return;
      e.preventDefault();
      setDrag(toNorm(e));
    };

    const onUp = () => {
      dragging = false;
      setDrag({ x: 0, y: 0 });
      document.body.classList.remove('dragging');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    el.addEventListener('mousedown', onDown);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [liveAxesRaw, maxTravel]);

  // deadzone
  const DZ = 0.12;
  // Priority: live gamepad axes > keyboard input > mouse drag
  const activeAxes = liveAxesRaw ?? keyboardAxes ?? drag;
  const normAxes = normalizeWithDeadzone(activeAxes, DZ) || { x: 0, y: 0 };
  const ax = normAxes.x;
  const ay = normAxes.y;

  // physics
  const posRef = useRef({ x: 0, y: 0 });
  const velRef = useRef({ x: 0, y: 0 });
  const actRef = useRef(0);
  const rafRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [activity, setActivity] = useState(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);

    const stiffness = 0.30;
    const damping = 0.84;

    const targetX = ax * maxTravel;
    const targetY = ay * maxTravel;

    const step = () => {
      const p = posRef.current;
      const v = velRef.current;

      const dx = targetX - p.x;
      const dy = targetY - p.y;

      v.x = v.x * damping + dx * stiffness;
      v.y = v.y * damping + dy * stiffness;

      p.x += v.x;
      p.y += v.y;

      setPos({ x: p.x, y: p.y });

      const speed = Math.hypot(v.x, v.y);
      actRef.current = Math.max(0, Math.max(speed * 0.9, actRef.current * 0.72) - 0.004);
      setActivity(actRef.current);

      const close = Math.hypot(targetX - p.x, targetY - p.y) < 0.12;
      const slow  = Math.hypot(v.x, v.y) < 0.02;
      const nearCenterTarget = Math.hypot(targetX, targetY) < 0.06;

      if ((close && slow) || (nearCenterTarget && slow)) {
        p.x = targetX; p.y = targetY;
        v.x = 0; v.y = 0;
        actRef.current = 0;
        setPos({ x: p.x, y: p.y });
        setActivity(0);
        return;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [ax, ay, maxTravel]);

  const capX = cx + pos.x, capY = cy + pos.y;

  // glow
  const rimGlowOpacity     = Math.min(0.78, activity * 0.8);
  const rimHaloOpacity     = Math.min(0.6,  activity * 0.6);
  const uiRingBloomOpacity = 0.20;

  return (
    <div className="analog" style={{ position: 'absolute', left: x, top: y, width: W, height: H, pointerEvents: 'auto' }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        aria-label="Analog Stick"
        style={{ display: 'block' }}
      >
        <defs>
          {/* panel */}
          <linearGradient id="plateGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#121624"/>
            <stop offset="100%" stopColor="#0a0e1a"/>
          </linearGradient>
          <linearGradient id="gloss" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.30)" />
            <stop offset="28%"  stopColor="rgba(255,255,255,0.14)" />
            <stop offset="55%"  stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
          </linearGradient>

          {/* accents */}
          <linearGradient id="uiStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"  stopColor="#77b0ff"/>
            <stop offset="100%" stopColor="#9a7bff"/>
          </linearGradient>
          <radialGradient id="uiGlow" cx="50%" cy="50%" r="65%">
            <stop offset="0%"  stopColor="#6ea8ff"/>
            <stop offset="55%" stopColor="#7f7aff"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
          </radialGradient>

          {/* ring bloom */}
          <radialGradient id="ringGlow" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
          </radialGradient>

          {/* cap */}
          <radialGradient id="capRim" cx="50%" cy="40%" r="90%">
            <stop offset="0%"  stopColor="#1e2537"/>
            <stop offset="70%" stopColor="#0a0d16"/>
            <stop offset="100%" stopColor="#000308"/>
          </radialGradient>
          <radialGradient id="capConcave" cx="50%" cy="55%" r="65%">
            <stop offset="0%"  stopColor="#0b0e18"/>
            <stop offset="55%" stopColor="#11162a"/>
            <stop offset="100%" stopColor="#070a12"/>
          </radialGradient>
          <radialGradient id="capSpec" cx="38%" cy="28%" r="55%">
            <stop offset="0%"  stopColor="rgba(255,255,255,0.35)"/>
            <stop offset="35%" stopColor="rgba(255,255,255,0.15)"/>
            <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </radialGradient>

          {/* glow/shadow */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <radialGradient id="capShadow" cx="50%" cy="50%" r="60%">
            <stop offset="0%"  stopColor="rgba(0,0,0,0.55)"/>
            <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
          </radialGradient>
        </defs>

        {/* panel */}
        <rect x="0" y="0" width={W} height={H} rx="18" ry="18" fill="url(#plateGrad)" />
        <rect x="0.75" y="0.75" width={W - 1.5} height={H - 1.5} rx="16.5" ry="16.5"
              fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
        {showGloss && <path d={roundedRectPath(1.5, 1.5, W - 3, H * 0.55, 16)} fill="url(#gloss)" />}

        {/* guides */}
        <circle cx={cx} cy={cy} r={rOuter} fill="url(#ringGlow)" opacity={uiRingBloomOpacity} />
        <g fill="none" opacity="0.95">
          <circle cx={cx} cy={cy} r={rOuter} stroke="url(#uiStroke)" strokeWidth="2.25"/>
          <circle cx={cx} cy={cy} r={rInner} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2"/>
          <line x1={cx - rOuter} y1={cy} x2={cx + rOuter} y2={cy} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2"/>
          <line x1={cx} y1={cy - rOuter} x2={cx} y2={cy + rOuter} stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2"/>
        </g>
        <circle cx={cx} cy={cy} r="3" fill="#ffffff" />

        {/* dir labels */}
        <g style={{ font: '700 12px system-ui, -apple-system, Segoe UI, Roboto', fill: '#ffffff' }} opacity="0.95">
          <text x={cx} y={cy - rOuter - 6} textAnchor="middle" dominantBaseline="ideographic">{dn.up}</text>
          <text x={cx + rOuter + 6} y={cy + 4} textAnchor="start" dominantBaseline="middle">{dn.right}</text>
          <text x={cx} y={cy + rOuter + 16} textAnchor="middle" dominantBaseline="hanging">{dn.down}</text>
          <text x={cx - rOuter - 6} y={cy + 4} textAnchor="end" dominantBaseline="middle">{dn.left}</text>
        </g>

        {/* cap aura */}
        <circle cx={cx + pos.x} cy={cy + pos.y} r={capR * 1.15} fill="url(#uiGlow)" opacity={Math.min(0.18, activity)} />
        {/* shadow */}
        <circle cx={cx + pos.x * 0.85} cy={cy + pos.y * 0.85} r={capR * 1.02} fill="url(#capShadow)" opacity="0.85" />
        {/* cap */}
        <circle cx={cx + pos.x} cy={cy + pos.y} r={capR} fill="url(#capRim)"/>
        <circle cx={cx + pos.x} cy={cy + pos.y} r={capR * 0.8} fill="url(#capConcave)"/>
        <circle cx={cx + pos.x} cy={cy + pos.y} r={capR * 0.96} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={capR * 0.08}/>
        <circle cx={cx + pos.x - capR * 0.28} cy={cy + pos.y - capR * 0.28} r={capR * 0.52} fill="url(#capSpec)" opacity="0.5"/>

        {/* rim glow */}
        <circle cx={cx + pos.x} cy={cy + pos.y} r={capR * 0.98} fill="none" stroke="url(#uiStroke)"
                strokeWidth={Math.max(2, capR * 0.10)} opacity={rimGlowOpacity} />
        <circle cx={cx + pos.x} cy={cy + pos.y} r={capR * 0.98} fill="none" stroke="url(#uiStroke)"
                strokeWidth={capR * 0.50} opacity={rimHaloOpacity} filter="url(#softGlow)" />

        {/* label */}
        <text
          x={cx}
          y={H - 10}
          textAnchor="middle"
          dominantBaseline="alphabetic"
          style={{ font: '700 16px system-ui, -apple-system, Segoe UI, Roboto', fill: '#ffffff' }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

/* helpers */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function normalizeWithDeadzone(axis, dz) {
  if (!axis) return null;
  const rescale = (v) => {
    const av = Math.abs(v);
    if (av <= dz) return 0;
    const sign = v < 0 ? -1 : 1;
    return sign * (av - dz) / (1 - dz);
  };
  return { x: clamp(rescale(axis.x || 0), -1, 1), y: clamp(rescale(axis.y || 0), -1, 1) };
}

function readAxes(s, analogId) {
  const a1 = s?.analog?.[analogId];
  if (isFinite(a1?.x) && isFinite(a1?.y)) return { x: clamp(a1.x, -1, 1), y: clamp(a1.y, -1, 1) };
  const a2 = s?.axes;
  if (isFinite(a2?.x) && isFinite(a2?.y)) return { x: clamp(a2.x, -1, 1), y: clamp(a2.y, -1, 1) };
  const a3 = s?.input?.axes;
  if (isFinite(a3?.x) && isFinite(a3?.y)) return { x: clamp(a3.x, -1, 1), y: clamp(a3.y, -1, 1) };
  return null;
}

function roundedRectPath(x, y, w, h, r) {
  return [
    `M${x + r},${y}`,
    `H${x + w - r}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `V${y + h - r}`,
    `Q${x + w},${y + h} ${x + w - r},${y + h}`,
    `H${x + r}`,
    `Q${x},${y + h} ${x},${y + h - r}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    'Z'
  ].join(' ');
}

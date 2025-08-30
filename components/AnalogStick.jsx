import React, { useRef, useState, useEffect } from "react";

// interactive analog with spring back
export default function AnalogStick({ x, y }){
  const W = 120*2 + 22;
  const H = (140 + 16) + 140;
  const cx = W/2, cy = H/2 + 6;
  const outer = Math.min(W,H)/2 - 24;
  const inner = outer*0.35;

  const [pos, setPos] = useState({ dx: 0, dy: 0 });
  const [spring, setSpring] = useState(false);
  const ref = useRef(null);

  useEffect(()=>{
    const el = ref.current; if(!el) return;
    let dragging = false;

    const ptToLocal = (clientX, clientY) => {
      const rect = el.getBoundingClientRect();
      return { lx: clientX - rect.left, ly: clientY - rect.top };
    };

    const down = (e) => { dragging = true; setSpring(false); move(e);
      window.addEventListener("mousemove",move); window.addEventListener("mouseup",up); };
    function move(e){
      if(!dragging) return;
      const { lx, ly } = ptToLocal(e.clientX, e.clientY);
      const dx = lx - cx, dy = ly - cy;
      const max = outer - 8;
      const mag = Math.hypot(dx,dy);
      const k = mag > max ? (max / mag) : 1;
      setPos({ dx: dx*k, dy: dy*k });
    }
    const up = () => {
      dragging = false; setSpring(true); setPos({ dx: 0, dy: 0 });
      window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up);
    };

    el.addEventListener("mousedown",down);
    return ()=> el.removeEventListener("mousedown",down);
  },[]);

  return (
    <svg ref={ref} className="analog" style={{ position:"absolute", left:x, top:y }} width={W} height={H} title="Analog Stick">
      <defs>
        <radialGradient id="ring" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#2C2F48"/><stop offset="100%" stopColor="#14162A"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="20" ry="20" className="analogCard"/>
      <text x={W/2} y="28" className="analogTitle">Analog Stick</text>
      <circle cx={cx} cy={cy} r={outer} fill="url(#ring)" stroke="rgba(255,255,255,.18)" strokeWidth="8"/>
      <line x1={cx-outer} y1={cy} x2={cx+outer} y2={cy} stroke="rgba(255,255,255,.14)" strokeWidth="2"/>
      <line x1={cx} y1={cy-outer} x2={cx} y2={cy+outer} stroke="rgba(255,255,255,.14)" strokeWidth="2"/>

      <g transform={`translate(${cx + pos.dx}, ${cy + pos.dy})`} style={{ transition: spring ? "transform .18s ease-out" : "none" }}>
        <circle r={inner} fill="#232845" stroke="rgba(255,255,255,.42)" strokeWidth="3"/>
        <ellipse cx={-inner*0.3} cy={-inner*0.4} rx={inner*0.5} ry={inner*0.3} fill="rgba(255,255,255,.28)"/>
      </g>
    </svg>
  );
}

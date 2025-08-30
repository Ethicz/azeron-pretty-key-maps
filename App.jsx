import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EmojiPicker from "emoji-picker-react";
import * as htmlToImage from "html-to-image";
import "./styles.css";

/* =========================
   SVG ICONS
   ========================= */
const SaveIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 3h11l3 3v15a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#fff" />
    <path d="M7 3h8v6H7z" fill="#6a50eb" />
    <path d="M7 15h10v5H7z" fill="#fff" />
  </svg>
);
const ImageIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="#fff" strokeWidth="2"/>
    <circle cx="9" cy="9" r="2" fill="#fff"/>
    <path d="M5 18l5-5 3 3 4-4 2 2v4H5z" fill="#fff"/>
  </svg>
);
const SmileIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
    <circle cx="9" cy="10" r="1.5" fill="#fff"/>
    <circle cx="15" cy="10" r="1.5" fill="#fff"/>
    <path d="M8 15c1.2 1 2.5 1.5 4 1.5s2.8-.5 4-1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

/* =========================
   Robust layout imports
   ========================= */
import * as CYRO_MOD from "./layouts/cyro";
import * as CLASSIC_MOD from "./layouts/classic";
import * as COMPACT_MOD from "./layouts/compact";
import * as CYBORG_MOD from "./layouts/cyborg";
import * as KEYZEN_MOD from "./layouts/keyzen";

const FALLBACK = {
  positions: {
    "1": { x: 260, y: 320 },
    "2": { x: 392, y: 320 },
    "3": { x: 524, y: 320 },
    "ANALOG": { x: 680, y: 360, analog: true }
  }
};
function resolvePositions(moduleObj, name) {
  try {
    const m = moduleObj ?? {};
    const candidate = m.positions ?? m.default?.positions ?? m.default ?? m;
    if (candidate && typeof candidate === "object") {
      return candidate.positions ? { ...candidate.positions } : { ...candidate };
    }
  } catch {}
  console.warn(`[Keymap] Using FALLBACK for layout "${name}" — check exports in layouts/${name}.`);
  return { ...FALLBACK.positions };
}
const LAYOUTS = {
  cyro:    resolvePositions(CYRO_MOD,    "cyro"),
  classic: resolvePositions(CLASSIC_MOD, "classic"),
  compact: resolvePositions(COMPACT_MOD, "compact"),
  cyborg:  resolvePositions(CYBORG_MOD,  "cyborg"),
  keyzen:  resolvePositions(KEYZEN_MOD,  "keyzen"),
};

/* =========================
   Geometry and constants
   ========================= */
const KEY_W = 120, KEY_H = 140, R = 18;
const GAP_X = 22, GAP_Y = 16;
const SNAP_GRID = 20;
const VIS_GRID = 48;

/* =========================
   Colors
   ========================= */
const BASE = {
  red: "#D21C2A", orange: "#E26F25", yellow: "#E5A92F",
  green: "#169447", teal: "#1CB2A6", blue: "#2F5EE0",
  indigo: "#444BE0", violet: "#A247E6", gray: "#495064",
};

/* =========================
   Helpers
   ========================= */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function normalizeHex(c, fallback="#777777"){
  if(!c || typeof c !== "string") return fallback;
  let s = c.trim();
  if(!s.startsWith("#")) s = "#"+s;
  const short = /^#([0-9a-fA-F]{3})$/;
  const long  = /^#([0-9a-fA-F]{6})$/;
  if(short.test(s)){ const r=s[1], g=s[2], b=s[3]; s = `#${r}${r}${g}${g}${b}${b}`; }
  return long.test(s) ? s.toUpperCase() : fallback;
}
function seededRandomColor(seed) {
  const keys = Object.keys(BASE);
  const idx = Math.abs([...String(seed)].reduce((a,c)=>a + c.charCodeAt(0), 0)) % keys.length;
  return BASE[keys[idx]];
}

/* =========================
   Default VG labels
   ========================= */
const VG_LABELS = [
  "Move Forward W","Move Left A","Move Back S","Move Right D",
  "Jump","Crouch","Sprint","Walk Toggle",
  "Reload","Interact Use","Melee","Ping Marker",
  "Primary Fire","Secondary Fire","Aim","Holster",
  "Switch Weapon","Next Weapon","Prev Weapon",
  "Grenade Throw","Ability 1","Ability 2","Ultimate",
  "Map","Inventory","Scoreboard","Quest Log","Pause Menu",
  "Push To Talk","Emote Wheel","Screenshot","Photo Mode",
  "Mount Vehicle","Horn","Repair","Flashlight",
  "Quick Save","Quick Load","Craft","Build",
  "Place Marker","Zoom In","Zoom Out","Radial Menu",
  "Context Action","Finisher","Heal Medkit","Use Shield",
  "Stealth","Roll Dodge","Parry Block","Charge",
];
function defaultKeymapForLayout(layout){
  const ids = Object.entries(layout)
    .filter(([,p])=>!p.blank && !p.analog && !p.split)
    .map(([id])=>id)
    .sort((a,b)=>Number(a)-Number(b));
  const map = {};
  let li = 0;
  ids.forEach((id)=>{
    const label = VG_LABELS[li % VG_LABELS.length];
    li++;
    map[id] = { label, sub: "", color: seededRandomColor(id), emoji: "", image: null, imageMode:"icon" };
  });
  map["MU"] = { label: "Mouse Up", color: BASE.teal };
  map["MD"] = { label: "Mouse Down", color: BASE.indigo };
  return map;
}

/* =========================
   Canvas helpers
   ========================= */
const rr=(ctx,x,y,w,h,r)=>{ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); };
function drawKeyBase(ctx,x,y,w,h,color){
  color = normalizeHex(color, "#777777");
  rr(ctx,x,y,w,h,R); ctx.fillStyle=color; ctx.fill();
  ctx.lineWidth=1.2; ctx.strokeStyle="#222"; ctx.stroke();
}
function drawKey(ctx,x,y,w,h,data){
  drawKeyBase(ctx,x,y,w,h,data?.color);

  // Cover image
  if(data?.image && data?.imageMode === "cover" && data.__img){
    const img = data.__img, iw = img.width, ih = img.height;
    const s = Math.max(w/iw, h/ih), tw = iw*s, th = ih*s;
    const dx = x + (w - tw)/2, dy = y + (h - th)/2;
    ctx.save(); rr(ctx,x,y,w,h,R); ctx.clip(); ctx.drawImage(img, dx, dy, tw, th); ctx.restore();
    ctx.lineWidth=1.2; ctx.strokeStyle="#222"; rr(ctx,x,y,w,h,R); ctx.stroke();
  }

  // Icon image
  if(data?.image && data?.imageMode !== "cover" && data.__img){
    const s = 26, rx = x + w - 8 - s, ry = y + 8;
    ctx.save(); rr(ctx, rx, ry, s, s, 6); ctx.clip(); ctx.drawImage(data.__img, rx, ry, s, s); ctx.restore();
    ctx.lineWidth=1; ctx.strokeStyle="rgba(0,0,0,.4)"; rr(ctx, rx, ry, s, s, 6); ctx.stroke();
  }

  // Optional emoji
  if (data?.emoji) {
    ctx.font = "24px Montserrat";
    ctx.fillStyle = "#111";
    ctx.fillText(data.emoji, x+w-30, y+30);
  }

  // Label — shrink-to-fit
  let size = 18;
  const label = data?.label || "Action";
  ctx.font = `800 ${size}px Montserrat`;
  let metrics = ctx.measureText(label);
  while (metrics.width > w - 20 && size > 10) {
    size--;
    ctx.font = `800 ${size}px Montserrat`;
    metrics = ctx.measureText(label);
  }
  ctx.fillStyle = "#111";
  ctx.fillText(label, x+10, y+h-38);

  // Sub — shrink-to-fit
  size = 16;
  const sub = data?.sub || "";
  ctx.font = `600 ${size}px Montserrat`;
  metrics = ctx.measureText(sub);
  while (metrics.width > w - 20 && size > 10) {
    size--;
    ctx.font = `600 ${size}px Montserrat`;
    metrics = ctx.measureText(sub);
  }
  ctx.fillStyle = "#444";
  ctx.fillText(sub, x+10, y+h-16);
}

function drawSplit(ctx,x,y,w,h,up,down){
  const upC   = normalizeHex(up.color,   BASE.teal);
  const downC = normalizeHex(down.color, BASE.indigo);
  ctx.save(); rr(ctx,x,y,w,h,R); ctx.clip();
  ctx.fillStyle=upC;   ctx.fillRect(x,y,w,h/2);
  ctx.fillStyle=downC; ctx.fillRect(x,y+h/2,w,h/2);
  ctx.restore();
  ctx.lineWidth=1.2; ctx.strokeStyle="#222"; rr(ctx,x,y,w,h,R); ctx.stroke();
  ctx.fillStyle="#111"; ctx.font="bold 16px ui-sans-serif";
  ctx.fillText(up.label||"Mouse Up", x+10, y+h/2-10);
  ctx.fillText(down.label||"Mouse Down", x+10, y+h-12);
}
function drawAnalogMonoline(ctx, x, y){
  const w = KEY_W * 2 + GAP_X;
  const h = (KEY_H + GAP_Y) + KEY_H;
  const cx = x + w / 2, cy = y + h / 2 + 12;
  const outer = Math.min(w, h) / 2 - 28;
  const inner = outer * 0.35;
  ctx.strokeStyle = "#000"; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.arc(cx,cy,outer,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx-outer,cy); ctx.lineTo(cx+outer,cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy-outer); ctx.lineTo(cx,cy+outer); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2); ctx.stroke();
}
function loadImage(url){ return new Promise((res, rej)=>{ const img = new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=url; }); }

/* =========================
   SplitWheel and Analog
   ========================= */
function SplitWheel({ x, y, up, down, gloss, onPick }){
  return (
    <div className={`splitTile ${gloss ? "gloss" : ""}`} style={{ left:x, top:y }} onMouseDown={(e)=>onPick("MW", e)}>
      <div className="half top" style={{ background: up?.color || BASE.teal }}>{up?.label || "Mouse Up"}</div>
      <div className="half bottom" style={{ background: down?.color || BASE.indigo }}>{down?.label || "Mouse Down"}</div>
    </div>
  );
}
function AnalogStick({ x, y }){
  const w = KEY_W*2 + GAP_X;
  const h = (KEY_H + GAP_Y) + KEY_H;
  const cx = w/2, cy = h/2 + 6;
  const outer = Math.min(w,h)/2 - 24;
  const inner = outer*0.35;
  const ref = useRef(null);
  const [pos, setPos] = useState({ dx:0, dy:0 });
  const [spring, setSpring] = useState(false);
  useEffect(()=>{
    const el=ref.current; if(!el) return; let dragging=false;
    const bbox = ()=> el.getBoundingClientRect();
    const down=e=>{ dragging=true; setSpring(false); move(e); window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);};
    const move=e=>{
      if(!dragging) return;
      const {left,top} = bbox(); const lx = e.clientX-left, ly = e.clientY-top;
      const dx = lx - cx, dy = ly - cy;
      const max = outer - 8; const mag = Math.hypot(dx,dy); const k = mag>max ? max/mag : 1;
      setPos({ dx: dx*k, dy: dy*k });
    };
    const up=()=>{ dragging=false; setSpring(true); setPos({dx:0,dy:0}); window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up); };
    el.addEventListener("mousedown",down); return ()=> el.removeEventListener("mousedown",down);
  },[]);
  return (
    <svg ref={ref} className="analog" style={{ position:"absolute", left:x, top:y }} width={w} height={h}>
      <defs>
        <radialGradient id="ring" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#2C2F48"/><stop offset="100%" stopColor="#14162A"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={w} height={h} rx="20" ry="20" className="analogCard"/>
      <text x={w/2} y={28} textAnchor="middle" className="analogTitle">Analog Stick</text>
      <circle cx={w/2} cy={h/2+6} r={outer} fill="url(#ring)" stroke="rgba(255,255,255,.18)" strokeWidth="8"/>
      <line x1={w/2-outer} y1={h/2+6} x2={w/2+outer} y2={h/2+6} stroke="rgba(255,255,255,.14)" strokeWidth="2"/>
      <line x1={w/2} y1={h/2+6-outer} x2={w/2} y2={h/2+6+outer} stroke="rgba(255,255,255,.14)" strokeWidth="2"/>
      <g transform={`translate(${w/2+pos.dx},${h/2+6+pos.dy})`} style={{ transition: spring ? "transform .18s ease-out" : "none" }}>
        <circle r={inner} fill="#232845" stroke="rgba(255,255,255,.42)" strokeWidth="3"/>
        <ellipse cx={-inner*0.3} cy={-inner*0.4} rx={inner*0.5} ry={inner*0.3} fill="rgba(255,255,255,.28)"/>
      </g>
    </svg>
  );
}

/* =========================
   Device picker
   ========================= */
function DevicePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDown = e => {
      if (ref.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  const devices = [
    ["cyro","Cyro"],
    ["classic","Classic"],
    ["compact","Compact"],
    ["cyborg","Cyborg"],
    ["keyzen","Keyzen"],
  ];

  const label = devices.find(d => d[0] === value)?.[1] || "Cyro";

  return (
    <div ref={ref} className="deviceWrap">
      <button
        className="btn glossy deviceBtn"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Choose device"
      >
        {label}
        <span className="chev">▾</span>
      </button>
      {open && (
        <div role="listbox" className="deviceMenu">
          {devices.map(([val, lab]) => (
            <button
              key={val}
              role="option"
              className={`deviceItem ${val===value?"active":""}`}
              onClick={() => { onChange(val); setOpen(false); }}
              aria-selected={val===value}
            >
              {lab}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================
   Main App
   ========================= */
export default function App(){
  const [profile, setProfile] = useState("cyro");
  const [layout, setLayout]  = useState(() => ({ ...LAYOUTS.cyro }));
  const [map, setMap]        = useState(() => defaultKeymapForLayout(LAYOUTS.cyro));

  const [gloss, setGloss] = useState(true);
  const [showNumbers, setShowNumbers] = useState(true);
  const [snapGrid, setSnapGrid] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [locked, setLocked] = useState(true);

  const [multi, setMulti] = useState(false);
  const [lasso, setLasso] = useState(null);

  const [zoom, setZoom] = useState(0.75);
  const containerRef = useRef(null);
  const [fitZoom, setFitZoom] = useState(1);

  const [gameTitle, setGameTitle] = useState("");
  const [selection, setSelection] = useState([]);
  const [showPopover, setShowPopover] = useState(false);
  const lastSelected = selection[selection.length-1] || null;

  const [menu, setMenu] = useState(null);
  const canvasRef = useRef(null);
  const stageDomRef = useRef(null);
const stageRef = useRef(null);           // you already had this below, keep only one copy

const setStageEl = el => {               // one place to set both refs
  stageDomRef.current = el;
  stageRef.current = el;
};


  const mu = map["MU"] || { label:"Mouse Up", color: BASE.teal };
  const md = map["MD"] || { label:"Mouse Down", color: BASE.indigo };

  /* Canvas extents */
  const calcExtents = (ly) => {
    let maxX = 0, maxY = 0;
    const entries = Object.entries(ly || {});
    if (entries.length === 0) return { W: 1200, H: 700 };
    entries.forEach(([_, p]) => {
      const w = p.analog ? (KEY_W * 2 + GAP_X) : KEY_W;
      const h = KEY_H;
      maxX = Math.max(maxX, p.x + w);
      maxY = Math.max(maxY, p.y + h);
    });
    return { W: Math.max(600, maxX + 80), H: Math.max(400, maxY + 110) };
  };
  const { W: CANVAS_W, H: CANVAS_H } = calcExtents(layout);

  useEffect(()=>{
    const ro = new ResizeObserver(()=>{
      const el = containerRef.current; if(!el) return;
      const avail = el.clientWidth - 24;
      const z = CANVAS_W > 0 ? Math.max(0.4, Math.min(1, avail / CANVAS_W)) : 1;
      setFitZoom(z);
    });
    if(containerRef.current) ro.observe(containerRef.current);
    return ()=> ro.disconnect();
  },[CANVAS_W]);
  const displayZoom = Math.min(zoom, fitZoom);
  const stageW = CANVAS_W * displayZoom, stageH = CANVAS_H * displayZoom;

  /* Profile switch */
  useEffect(()=>{
    const next = LAYOUTS[profile] || FALLBACK.positions;
    setLayout({ ...next });
    setMap(defaultKeymapForLayout(next));
    setSelection([]); setShowPopover(false); setMenu(null);
  },[profile]);

  /* Click away */
  useEffect(()=>{
    const onDown = (e)=>{
      const stage = document.getElementById("stage-root");
      if (stage?.contains(e.target)) return;
      if (e.target.closest?.(".ctxMenu") || e.target.closest?.(".emojiPanel")) return;
      setSelection([]); setShowPopover(false); setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive:true });
    return ()=>{
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  },[]);

  const colorFor = (id) => map[id]?.color || BASE.blue;

  const dragTo = (ids, nx, ny) => {
    if(locked) return;
    setLayout(prev=>{
      const next = { ...prev };
      ids.forEach(id=>{
        const p = next[id]; if(!p) return;
        const limX = CANVAS_W - KEY_W - 20;
        const limY = CANVAS_H - KEY_H - 20;
        const x = snapGrid ? Math.round(nx/SNAP_GRID)*SNAP_GRID : nx;
        const y = snapGrid ? Math.round(ny/SNAP_GRID)*SNAP_GRID : ny;
        next[id] = { ...p, x: clamp(x, 0, limX), y: clamp(y, 0, limY) };
      });
      return next;
    });
  };

  const toggleSelect = (id) => setSelection(s=> s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);

const onPick = (id, e) => {
  if (e?.button !== 0) return;
  if (multi || e?.ctrlKey || e?.metaKey) {
    // Multi mode: toggle selection AND open the editor
    setShowPopover(true);
    setMenu(null);
    toggleSelect(id);
  } else {
    // Single select: open as before
    setSelection([id]);
    setShowPopover(true);
    setMenu(null);
  }
};


  const openMenu = (e, id) => {
    e.preventDefault();
    if(!selection.includes(id)) setSelection([id]);
    setShowPopover(false);
    const pad = 6, W = 340, H = 196;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = e.clientX, y = e.clientY;
    if (x + W > vw - pad) x = vw - W - pad;
    if (y + H > vh - pad) y = vh - H - pad;
    if (x < pad) x = pad; if (y < pad) y = pad;
    setMenu({ x, y, w: W, h: H });
  };

  /* Lasso */
  const lassoStart = useRef(null);
  const beginLasso = (e)=>{
    if(!multi) return;
    if(e.target.id !== "stage-root") return;
    const rect = stageRef.current.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / displayZoom;
    const sy = (e.clientY - rect.top) / displayZoom;
    lassoStart.current = { sx, sy };
    setLasso({ x:sx, y:sy, w:0, h:0 });
    const move=(ev)=>{
      const cx = (ev.clientX - rect.left) / displayZoom;
      const cy = (ev.clientY - rect.top) / displayZoom;
      const x = Math.min(sx, cx), y = Math.min(sy, cy);
      const w = Math.abs(cx - sx), h = Math.abs(cy - sy);
      setLasso({ x, y, w, h });
    };
    const up=()=>{
      window.removeEventListener("mousemove",move);
      window.removeEventListener("mouseup",up);
      const box = { x:lassoStart.current.sx, y:lassoStart.current.sy, w:0, h:0, ...lasso };
      const hits = Object.entries(layout)
        .filter(([_,p])=>!p.blank && !p.analog && !p.split)
        .map(([id,p])=>({ id, rect:{ x:p.x, y:p.y, w:KEY_W, h:KEY_H } }))
        .filter(({rect})=> rect.x < box.x+box.w && rect.x+rect.w > box.x && rect.y < box.y+box.h && rect.y+rect.h > box.y)
        .map(h=>h.id);
      setSelection(prev => {
  const set = new Set(prev);
  hits.forEach(id => set.add(id));
  const arr = [...set];
  // Show the editor after the lasso so you can bulk edit immediately
  setShowPopover(true);
  setMenu(null);
  return arr;
});
setLasso(null);

    };
    window.addEventListener("mousemove",move);
    window.addEventListener("mouseup",up);
  };

  /* Clipboard */
  const [clipboard, setClipboard] = useState(null);
  const doCopy = () => {
    const id = selection[0]; if(!id) return;
    const d = map[id] || {};
    setClipboard({ label:d.label, sub:d.sub, emoji:d.emoji, color:d.color, image:d.image || null, imageMode:d.imageMode || "icon" });
  };
  const doPaste = (opts) => {
    if(!clipboard || selection.length===0) return;
    setMap(prev=>{
      const next = { ...prev };
      selection.forEach(id=>{
        const base = next[id] || {};
        const apply = { ...base };
        const changingColor = opts.color && typeof clipboard.color === "string";
        if(opts.label) apply.label = clipboard.label;
        if(opts.sub)   apply.sub   = clipboard.sub;
        if(opts.emoji) apply.emoji = clipboard.emoji;
        if(opts.color && clipboard.color) apply.color = clipboard.color;
        if(opts.image) { apply.image = clipboard.image || null; apply.imageMode = clipboard.imageMode || "icon"; }
        next[id] = apply;
      });
      return next;
    });
  };

  /* Field updates */
  const setField = (field, value) => {
    setMap(prev=>{
      const next = { ...prev };
      selection.forEach(id=>{
        const base = next[id] || {};
        next[id] = { ...base, [field]: value };
      });
      return next;
    });
  };

  const invertLayout = () => {
    setLayout(prev=>{
      const maxX = Object.values(prev).reduce((m,p)=>{
        const bw = p.analog ? (KEY_W*2+GAP_X) : KEY_W;
        return Math.max(m, p.x + bw);
      }, 0);
      const next = {};
      Object.entries(prev).forEach(([id,pos])=>{
        const bw = pos.analog ? (KEY_W*2+GAP_X) : KEY_W;
        next[id] = { ...pos, x: maxX - bw - pos.x };
      });
      return next;
    });
  };

    /* Export PNG — centered + printer-friendly */
  
    // =========================
// printer-friendly canvas export
// =========================
const saveImage = async () => {
  const c = canvasRef.current;
  if (!c) return;

  // Render at device pixel ratio
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  c.width = CANVAS_W * dpr;
  c.height = CANVAS_H * dpr;
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 1) Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // 2) Title
// Title
const title =
  gameTitle?.trim() ||
  (profile[0].toUpperCase() + profile.slice(1)) + " Layout";
ctx.fillStyle = "#111";
ctx.font = "800 32px Montserrat, ui-sans-serif";
const tw = ctx.measureText(title).width;
ctx.fillText(title, (CANVAS_W - tw) / 2, 48);

// App name
ctx.font = "600 20px Montserrat, ui-sans-serif";
const appName = "Azeron Keymap Helper";
const aw = ctx.measureText(appName).width;
ctx.fillText(appName, (CANVAS_W - aw) / 2, 80);

// Author + disclaimer
ctx.font = "italic 14px Montserrat, ui-sans-serif";
ctx.fillStyle = "#444";
ctx.fillText("Created by JimmyCPW — not affiliated with Azeron", (CANVAS_W - 420) / 2, CANVAS_H - 40);

  // 3) Preload key images
  const withImages = Object.entries(layout)
    .filter(([, p]) => !p.analog && !p.split && !p.blank)
    .map(([id]) => ({ id, data: map[id] }));
  for (const { data } of withImages) {
    if (data?.image) {
      try {
        data.__img = await loadImage(data.image);
      } catch {}
    }
  }

  // 4) Centering offsets
  let minX = Infinity,
    minY = Infinity,
    maxX = 0,
    maxY = 0;
  Object.values(layout).forEach((pos) => {
    const w = pos.analog ? KEY_W * 2 + GAP_X : KEY_W;
    const h = pos.analog ? KEY_H * 2 + GAP_Y : KEY_H;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + w);
    maxY = Math.max(maxY, pos.y + h);
  });
  const layoutWidth = maxX - minX;
  const layoutHeight = maxY - minY;
  const offsetX = (CANVAS_W - layoutWidth) / 2 - minX;
  const offsetY = (CANVAS_H - layoutHeight) / 2 - minY + 40;

  // 5) Draw keys and split
  Object.entries(layout).forEach(([id, pos]) => {
    if (pos.blank) return;
    if (pos.split) {
      const up = map["MU"] || { label: "Mouse Up", color: BASE.teal };
      const down = map["MD"] || { label: "Mouse Down", color: BASE.indigo };
      drawSplit(
        ctx,
        pos.x + offsetX,
        pos.y + offsetY,
        KEY_W,
        KEY_H,
        up,
        down
      );
      return;
    }
    if (pos.analog) return;
    drawKey(
      ctx,
      pos.x + offsetX,
      pos.y + offsetY,
      KEY_W,
      KEY_H,
      map[id] || {}
    );
  });

  // 6) Analog stick
  const ap = layout["ANALOG"];
  if (ap) drawAnalogMonoline(ctx, ap.x + offsetX, ap.y + offsetY);

  // 7) Footer
  const footer =
    "Generated with Azeron Keymap Helper — not affiliated with Azeron";
  ctx.fillStyle = "#444";
  ctx.font = "600 14px Montserrat, ui-sans-serif";
  const fw = ctx.measureText(footer).width;
  ctx.fillText(footer, (CANVAS_W - fw) / 2, CANVAS_H - 20);

  // 8) Download
  const url = c.toDataURL("image/png");
  const a = document.createElement("a");
  a.download = `azeron_${profile}_print.png`;
  a.href = url;
  a.click();
};

// =========================
// glossy UI DOM snapshot
// =========================
const exportUI = async () => {
  const stage = stageDomRef.current;
  if (!stage) return;

  // Optional: hide grid overlay
  const panel = stage.closest(".panel");
  const grid =
    panel?.querySelector('div[aria-hidden="true"]') || null;

  // Save current styles
  const prevTransform = stage.style.transform;
  const prevW = stage.style.width;
  const prevH = stage.style.height;
  const prevAttr = stage.getAttribute("data-exporting");
  const prevGridDisplay = grid ? grid.style.display : null;

  try {
    // Freeze scaling for capture
    stage.style.transform = "none";
    stage.style.width = `${CANVAS_W}px`;
    stage.style.height = `${CANVAS_H}px`;
    stage.setAttribute("data-exporting", "1");
    if (grid) grid.style.display = "none";

    const dataUrl = await htmlToImage.toPng(stage, {
      canvasWidth: CANVAS_W,
      canvasHeight: CANVAS_H,
      backgroundColor: "#0b0f1d",
      pixelRatio: Math.max(2, Math.floor(window.devicePixelRatio || 1)),
      style: { transform: "none" }
    });

    const a = document.createElement("a");
    a.download = `azeron_${profile}_ui.png`;
    a.href = dataUrl;
    a.click();
  } catch (err) {
    console.error(err);
    alert("UI export failed. Ensure images are same-origin or data URLs.");
  } finally {
    // Restore styles
    stage.style.transform = prevTransform;
    stage.style.width = prevW;
    stage.style.height = prevH;
    if (prevAttr == null) stage.removeAttribute("data-exporting");
    else stage.setAttribute("data-exporting", prevAttr);
    if (grid && prevGridDisplay != null) grid.style.display = prevGridDisplay;
  }
};

  /* Emoji picker portal */
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiButtonRef = useRef(null);
  const pickerRef = useRef(null);
  
  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e) => {
      const anchor = emojiButtonRef.current, panel = pickerRef.current;
      if (anchor?.contains(e.target) || panel?.contains(e.target)) return;
      setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [emojiOpen]);

  /* Popover placement */
  function placePopover(){
    if(!lastSelected) return null;
    const popW = 380, popH = 480, pad = 12;
    const p = layout[lastSelected]; if(!p) return null;
    const blockW = p.analog ? (KEY_W*2+GAP_X) : KEY_W;
    let x = p.x + blockW + pad;
    let y = p.y;
    if (x + popW > CANVAS_W - pad) x = p.x - popW - pad;
    x = clamp(x, pad, CANVAS_W - popW - pad);
    y = clamp(y, pad, CANVAS_H - popH - pad);
    return { x, y, w:popW, h:popH, side: x > p.x ? "right" : "left" };
  }
  const pop = placePopover();
  const active = lastSelected ? (map[lastSelected]||{}) : {};

  const ScrollbarCSS = () => (
    <style>{`
      .emojiPanel{scrollbar-width:thin;scrollbar-color:#7c5cff rgba(255,255,255,.08)}
      .emojiPanel::-webkit-scrollbar{width:10px;height:10px}
      .emojiPanel::-webkit-scrollbar-track{background:rgba(255,255,255,.08);border-radius:8px}
      .emojiPanel::-webkit-scrollbar-thumb{background:#7c5cff;border-radius:8px}
      .emojiPanel::-webkit-scrollbar-thumb:hover{background:#6a50eb}
    `}</style>
  );

  return (
    <div className="pageRoot">
      {/* Header with logo from project root */}
      <header className="header">
        <img src="/logo.png" alt="Unofficial Azeron Keymap Helper" className="brandLogo" />
      </header>

      {/* Top controls */}
      <div className="topbar">
        <div className="toolbarWrap">
          {/* Bar 1 */}
          <div className="rowWrap">
            <DevicePicker value={profile} onChange={setProfile} />

            <label className="badge"><input type="checkbox" checked={locked} onChange={e=>setLocked(e.target.checked)} /> Lock</label>
            <label className="badge"><input type="checkbox" checked={multi} onChange={e=>setMulti(e.target.checked)} /> Multi</label>
            <label className="badge"><input type="checkbox" checked={snapGrid} onChange={e=>setSnapGrid(e.target.checked)} /> Snap</label>
            <label className="badge"><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)} /> Grid</label>
            <label className="badge"><input type="checkbox" checked={gloss} onChange={e=>setGloss(e.target.checked)} /> Gloss</label>
            <label className="badge"><input type="checkbox" checked={showNumbers} onChange={e=>setShowNumbers(e.target.checked)} /> #</label>

            <button className="btn" onClick={invertLayout}>Invert</button>
            <button className="btn" title="Randomize colors" onClick={()=>{
              setMap(prev=>{
                const next = { ...prev };
                Object.keys(layout).forEach(id=>{
                  if(layout[id].blank || layout[id].analog || layout[id].split) return;
                  next[id] = { ...(next[id]||{}), color: seededRandomColor(id + Date.now()) };
                });
                return next;
              });
            }}>🎲</button>
          </div>

          {/* Bar 2 */}
          <div className="rowWrap centerWrap">
            <input
              className="input titleInput"
              placeholder="Title of your game"
              value={gameTitle}
              onChange={e=>setGameTitle(e.target.value)}
              style={{ maxWidth:520, minWidth:220 }}
            />

            <button
              className="btn"
              onClick={()=>{
                const payload = { version: 14, profile, layout, map, gameTitle, gloss, showNumbers };
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)], { type:"application/json" }));
                a.download = `azeron_${profile}_theme.json`;
                a.click(); URL.revokeObjectURL(a.href);
              }}
            >
              Save Theme
            </button>

            <button
              className="btn"
              onClick={()=>{
                const inp = document.createElement("input");
                inp.type="file"; inp.accept="application/json,.json";
                inp.onchange = async (e)=>{
                  const f=e.target.files?.[0]; if(!f) return;
                  try{
                    const data = JSON.parse(await f.text());
                    const next = data.layout ? (data.layout.positions || data.layout) : (LAYOUTS[data.profile||profile] || LAYOUTS[profile]);
                    if(data.profile) setProfile(data.profile);
                    if(next) setLayout({ ...next });
                    if(data.map) setMap(data.map);
                    if(data.gameTitle!=null) setGameTitle(data.gameTitle);
                    if(data.gloss!=null) setGloss(!!data.gloss);
                    if(data.showNumbers!=null) setShowNumbers(!!data.showNumbers);
                  }catch{ alert("Failed to load theme"); }
                };
                inp.click();
              }}
            >
              Load Theme
            </button>

            {/* Save dropdown */}
<div style={{ position: "relative" }}>
  <button
    className="btn primary"
    title="Save"
    onClick={(e) => {
      const m = e.currentTarget.nextSibling;
      m.style.display = m.style.display === "block" ? "none" : "block";
    }}
    style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#0b1f6f", borderColor:"rgba(255,255,255,.14)" }}
  >
    Save
    <span style={{ marginLeft: 8 }}>▾</span>
  </button>
  <div
    style={{
      position:"absolute",
      top:"calc(100% + 6px)",
      right:0,
      display:"none",
      background:"rgba(18,23,53,0.96)",
      border:"1px solid rgba(255,255,255,.10)",
      borderRadius:12,
      boxShadow:"0 12px 28px rgba(0,0,0,.45)",
      padding:8,
      zIndex:10,
      minWidth:220
    }}
    onMouseLeave={(e)=>{ e.currentTarget.style.display="none"; }}
  >
    <button className="btn" style={{ width:"100%", marginBottom:6 }} onClick={saveImage}>
      Save printer friendly PNG
    </button>
    <button className="btn" style={{ width:"100%" }} onClick={exportUI}>
      Save colored UI PNG
    </button>
  </div>
</div>


            {/* zoom and reset cluster */}
            <button className="btn" title="Zoom Out" onClick={()=>setZoom(z=>Math.max(0.4, +(z-0.1).toFixed(2)))}>–</button>
            <button className="btn" title="Zoom In" onClick={()=>setZoom(z=>Math.min(2, +(z+0.1).toFixed(2)))}>+</button>
            <button
              className="btn"
              title="Reset layout"
              onClick={()=>{
                const next = LAYOUTS[profile] || FALLBACK.positions;
                setLayout({ ...next });
                setMap(defaultKeymapForLayout(next));
              }}
            >
              Reset Layout
            </button>
          </div>
        </div>
      </div>

      {/* Mapper */}
      <div className="canvasWrap" ref={containerRef}>
        <div
          className="panel"
          style={{
            position:"relative",
            /* Secondary promotional background over gradient under grid and keys.
               To enable, uncomment and set your image url. */
            // backgroundImage: `url(/promo.jpg)`,
            // backgroundSize: "cover",
            // backgroundPosition: "center",
          }}
        >
          {/* Grid */}
          {showGrid && (
            <div
              aria-hidden
              style={{
                position:"absolute", inset:0, pointerEvents:"none",
                backgroundImage: `
                  linear-gradient(to right, rgba(255,255,255,.06) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(255,255,255,.06) 1px, transparent 1px)
                `,
                backgroundSize: `${VIS_GRID*displayZoom}px ${VIS_GRID*displayZoom}px, ${VIS_GRID*displayZoom}px ${VIS_GRID*displayZoom}px`,
                zIndex:0
              }}
            />
          )}

          <div className="stageBox" style={{ width: stageW, height: stageH }}>
            <div
  id="stage-root"
  ref={stageDomRef}
  className="stage"
  style={{
    width: CANVAS_W,
    height: CANVAS_H,
    transform: `scale(${displayZoom})`,
    transformOrigin: "top left",
    position: "relative"
  }}
  onMouseDown={(e)=>{
    if(e.button!==0) return;
    if(e.target.id === "stage-root"){
      if(multi){ beginLasso(e); } else { setSelection([]); setShowPopover(false); setMenu(null); }
    }
  }}
>
              {lasso && (
                <div style={{
                  position:"absolute", left:lasso.x, top:lasso.y, width:lasso.w, height:lasso.h,
                  border:"1px dashed rgba(124,92,255,.9)", background:"rgba(124,92,255,.15)", borderRadius:6, pointerEvents:"none", zIndex:5
                }}/>
              )}

              {/* blanks */}
              {Object.entries(layout).filter(([_,p])=>p.blank).map(([id,pos])=>(
                <div key={id} className="blank" style={{ left:pos.x, top:pos.y }} />
              ))}

              {/* split wheel */}
              {layout["MW"] && (
                <SplitWheel x={layout["MW"].x} y={layout["MW"].y} up={map["MU"]} down={map["MD"]} gloss={gloss} onPick={onPick} />
              )}

              {/* keys */}
              {Object.entries(layout).map(([id,pos])=>{
                if(pos.blank || pos.analog || pos.split) return null;
                return (
                  <KeyTile
                    key={id}
                    id={id}
                    data={{ ...map[id], color: colorFor(id) }}
                    x={pos.x} y={pos.y}
                    gloss={gloss}
                    showNumbers={showNumbers}
                    selected={selection.includes(id)}
                    selection={selection.length ? selection : [id]}
                    draggable={!locked}
                    zoom={displayZoom}
                    onPick={onPick}
                    onDrag={(ids,nx,ny)=>dragTo(ids,nx,ny)}
                    onContext={(e)=>openMenu(e,id)}
                  />
                );
              })}

              {/* analog */}
              {layout["ANALOG"] && <AnalogStick x={layout["ANALOG"].x} y={layout["ANALOG"].y} />}

              {/* Edit popover */}
              {lastSelected && showPopover && pop && (
                <div
                  className={`popover ${pop.side}`}
                  style={{
                    left:pop.x, top:pop.y, width:pop.w, height:pop.h,
                    position:"absolute", borderRadius:14,
                    background:"rgba(15,20,42,.90)", backdropFilter:"blur(6px)",
                    border:"1px solid rgba(255,255,255,.08)", boxShadow:"0 10px 28px rgba(0,0,0,.35)", display:"flex", flexDirection:"column"
                  }}
                  onMouseDown={(e)=>e.stopPropagation()}
                >
                  <div className="popHeader" style={{ padding:"10px 12px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>Selected {selection.length>1 ? `${selection.length} keys` : `#${lastSelected}`}</span>
                    <button className="iconBtn" onClick={()=>{ setSelection([]); setShowPopover(false); }} aria-label="Close">✕</button>
                  </div>
                  <div style={{ padding:12 }}>
                    <div className="row"><label>Label</label>
                      <input className="input" value={active.label||""} onChange={e=>setField("label", e.target.value)} />
                    </div>
                    <div className="row"><label>Sub</label>
                      <input className="input" value={active.sub||""} onChange={e=>setField("sub", e.target.value)} />
                    </div>
                    <div className="row"><label>Emoji</label>
                      <button ref={emojiButtonRef} className="btn" style={{ padding:"6px 10px", display:"inline-flex", alignItems:"center", gap:8 }} onClick={()=>setEmojiOpen(v=>!v)}>
                        <SmileIcon />
                        <span>Pick Emoji</span>
                      </button>
                    </div>
                    {emojiOpen && createPortal(
                      <>
                        <ScrollbarCSS />
                        <div
                          ref={pickerRef}
                          className="emojiPanel"
                          style={{
                            position:"fixed", zIndex: 9999,
                            ...(() => {
                              const r = emojiButtonRef.current?.getBoundingClientRect();
                              const panelW = 360, pad = 8;
                              const top = (r?.bottom ?? 0) + 6;
                              let left = (r?.left ?? 0);
                              const vw = window.innerWidth;
                              if (left + panelW > vw - pad) left = Math.max(pad, vw - panelW - pad);
                              return { top, left, width:panelW, maxHeight:360 };
                            })(),
                            overflowY:"auto", overflowX:"hidden",
                            boxShadow:"0 12px 28px rgba(0,0,0,.45)",
                            borderRadius:12,
                            background:"rgba(18,23,53,0.96)",
                            border:"1px solid rgba(255,255,255,.10)"
                          }}
                          onMouseDown={(e)=>e.stopPropagation()}
                        >
                          <EmojiPicker
                            theme="dark"
                            autoFocusSearch={false}
                            onEmojiClick={(data)=>{
                              setField("emoji", data.emoji);
                              setEmojiOpen(false);
                              emojiButtonRef.current?.focus();
                            }}
                          />
                        </div>
                      </>,
                      document.body
                    )}
                    <div className="row" style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <label>Color</label>
                      <input type="color" className="colorPicker" value={normalizeHex(active.color||BASE.blue)} onChange={e=>setField("color", e.target.value)} />
                      <label htmlFor="img-upload" className="iconBtn" title="Upload image" style={{ cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
                        <ImageIcon />
                      </label>
                      <input id="img-upload" type="file" accept="image/*" style={{ display:"none" }} onChange={async (e)=>{
                        const f=e.target.files?.[0]; if(!f) return;
                        const url = await new Promise(r=>{ const rd=new FileReader(); rd.onload=()=>r(rd.result); rd.readAsDataURL(f); });
                        setField("image", url); e.target.value = "";
                      }} />
                    </div>
                    <div className="row"><label>Image Mode</label>
                      <div style={{ display:"flex", gap:8 }}>
                        <button className={`btn ${active.imageMode!=="cover"?"primary":""}`} onClick={()=>setField("imageMode","icon")}>Icon</button>
                        <button className={`btn ${active.imageMode==="cover"?"primary":""}`} onClick={()=>setField("imageMode","cover")}>Cover</button>
                      </div>
                    </div>
                    <div className="row"><label>Clear Image</label>
                      <button className="btn" onClick={()=>{ setField("image", null); setField("imageMode","icon"); }}>Remove</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Right click menu */}
              {menu && createPortal(
                <div
                  className="ctxMenu"
                  style={{
                    position:"fixed", left:menu.x, top:menu.y, width:menu.w, height:menu.h,
                    background:"rgba(18,23,53,0.96)", border:"1px solid rgba(255,255,255,.10)",
                    borderRadius:12, boxShadow:"0 12px 28px rgba(0,0,0,.45)", padding:10, zIndex:9999,
                    display:"flex", flexDirection:"column", justifyContent:"space-between"
                  }}
                  onContextMenu={(e)=>e.preventDefault()}
                  onMouseDown={(e)=>e.stopPropagation()}
                >
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:6, opacity:.9 }}>Key actions</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6 }}>
                    {[
                      ["Copy",            ()=>doCopy()],
                      ["Paste Label",     ()=>doPaste({label:true})],
                      ["Paste Sub",       ()=>doPaste({sub:true})],
                      ["Paste Emoji",     ()=>doPaste({emoji:true})],
                      ["Paste Color",     ()=>doPaste({color:true})],
                      ["Paste Image",     ()=>doPaste({image:true})],
                    ].map(([label,fn])=>(
                      <button
                        key={label}
                        className="btn"
                        onClick={fn}
                        style={{ fontSize:12, padding:"4px 6px", lineHeight:1.1, whiteSpace:"nowrap" }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginTop:6 }}>
                    <button className="btn" onClick={()=>setMenu(null)} style={{ padding:"4px 8px", fontSize:12 }}>Close</button>
                    <button className="btn" onClick={()=>doPaste({label:true,sub:true,emoji:true,color:true,image:true})} style={{ padding:"4px 8px", fontSize:12 }}>Paste All</button>
                  </div>
                </div>,
                document.body
              )}

              <canvas ref={canvasRef} style={{ display:"none" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer links and disclaimer */}
      <footer className="footer">
        <div className="footerLinks">
          <a className="btn" href="https://discord.gg/9tw9pju" target="_blank" rel="noreferrer">Azeron Discord</a>
          <a className="btn" href="https://www.azeron.eu" target="_blank" rel="noreferrer">Buy Azeron</a>
        </div>
        <div className="disclaimer">
          Not affiliated with Azeron. This is a fan made tool to help users create printable key map layouts.
        </div>
      </footer>
    </div>
  );
}

/* =========================
   Key component
   ========================= */
function KeyTile({
  id, data, x, y, selected, selection, gloss, showNumbers,
  draggable, zoom, onPick, onDrag, onContext
}){
  const ref = useRef(null);

  useEffect(()=>{ if(!draggable) return; const el=ref.current; if(!el) return;
    let sx=0,sy=0,ox=0,oy=0,drag=false;
    const down=e=>{
      if(e.button!==0) return;
      drag=true; sx=e.clientX; sy=e.clientY; ox=x; oy=y;
      onPick(id, e);
      window.addEventListener("mousemove",move); window.addEventListener("mouseup",up);
      e.preventDefault();
    };
    const move=e=>{
      if(!drag) return;
      const dx=(e.clientX-sx)/zoom, dy=(e.clientY-sy)/zoom;
      onDrag(selection, Math.round(ox+dx), Math.round(oy+dy));
    };
    const up=()=>{ if(!drag) return; drag=false;
      window.removeEventListener("mousemove",move); window.removeEventListener("mouseup",up);
    };
    el.addEventListener("mousedown",down);
    return ()=> el.removeEventListener("mousedown",down);
  },[draggable,x,y,zoom,onPick,onDrag,selection,id]);

  const flatBg = data?.color || BASE.blue;
  const mergedStyle = gloss
    ? { left:x, top:y, "--key": data?.color || BASE.blue }
    : { left:x, top:y, background: normalizeHex(flatBg), boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06), 0 12px 26px rgba(0,0,0,.45)" };

  const labelSize = data?.label ? (data.label.length > 30 ? 14 : data.label.length > 22 ? 16 : 18) : 18;
  const subSize   = data?.sub   ? (data.sub.length   > 28 ? 13 : data.sub.length   > 20 ? 14 : 16) : 16;

  return (
    <div
      ref={ref}
      className={`key ${gloss?'gloss':''} ${selected?'selected':''}`}
      style={mergedStyle}
      onMouseDown={(e)=>onPick(id,e)}
      onContextMenu={(e)=>onContext?.(e, id)}
      title={`Key ${id}`}
    >
      {data?.image && data?.imageMode === "cover" && (
        <img alt="" src={data.image} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", borderRadius:12, zIndex:0 }} />
      )}

      {showNumbers && (
        <div style={{
          position:"absolute", top:6, left:8,
          background:"rgba(0,0,0,.85)", color:"#fff",
          borderRadius:"10px", padding:"2px 7px", fontSize:14, fontWeight:800,
          boxShadow:"0 1px 4px rgba(0,0,0,.45)", zIndex:2
        }}>#{id}</div>
      )}

      {data?.image && data?.imageMode !== "cover" && (
        <img alt="" src={data.image} style={{ position:"absolute", right:8, top:8, width:26, height:26, borderRadius:6, objectFit:"cover", boxShadow:"0 1px 4px rgba(0,0,0,.5)", zIndex:2 }} />
      )}

      {data?.emoji ? <div className="emoji" style={{ zIndex:2 }}>{data.emoji}</div> : null}

      <div
        className="label"
        style={{
          zIndex:2,
          fontSize: labelSize,
          lineHeight: 1.1,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          hyphens: "auto"
        }}
      >
        {data?.label || "Action"}
      </div>

      <div
        className="sub"
        style={{
          zIndex:2,
          fontSize: subSize,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
          hyphens: "auto"
        }}
      >
        {data?.sub || ""}
      </div>
    </div>
  );
}

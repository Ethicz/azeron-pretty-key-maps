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
const LockIcon = ({size=18, on=false})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="4" y="10" width="16" height="10" rx="2" stroke="#fff" strokeWidth="2" opacity=".9"/>
    <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="#fff" strokeWidth="2" opacity=".9"/>
    {on ? <circle cx="12" cy="15" r="2" fill="#79a1ff"/> : null}
  </svg>
);
const MultiIcon   = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="6" width="14" height="12" rx="2" stroke="#fff" strokeWidth="2" opacity=".9" />
    <rect x="7" y="4" width="14" height="12" rx="2" stroke="#fff" strokeWidth="2" opacity=".5" />
  </svg>
);

// A simple edit (pencil) icon for multi‑edit mode on mobile
const EditIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 17.25v3.75h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="#fff" />
    <path d="M14.44 5.34l3.75 3.75 2.13-2.13a1 1 0 0 0 0-1.41L18.1 3.33a1 1 0 0 0-1.41 0l-2.25 2.01z" fill="#fff" />
  </svg>
);
const SnapIcon    = ({size=18})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 8h6M3 16h6M15 8h6M15 16h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".9"/><circle cx="12" cy="12" r="2" fill="#79a1ff"/></svg>
);
const GridIcon    = ({size=18})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 8h18M3 16h18M8 3v18M16 3v18" stroke="#fff" strokeWidth="2" opacity=".9"/></svg>
);
const HashIcon    = ({size=18})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M9 3L7 21M17 3l-2 18M4 9h16M3 15h16" stroke="#fff" strokeWidth="2"/></svg>
);
const InvertIcon  = ({size=18})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 8-8v16a8 8 0 0 1-8-8z" stroke="#fff" strokeWidth="2"/></svg>
);
const DiceIcon    = ({size=18})=>(
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#fff" strokeWidth="2"/><circle cx="9" cy="9" r="1.4" fill="#fff"/><circle cx="15" cy="9" r="1.4" fill="#fff"/><circle cx="9" cy="15" r="1.4" fill="#fff"/><circle cx="15" cy="15" r="1.4" fill="#fff"/></svg>
);
const ZoomOutIcon = ({size=18})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2"/><path d="M8 11h6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M20 20l-3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>);
const ZoomInIcon  = ({size=18})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#fff" strokeWidth="2"/><path d="M8 11h6M11 8v6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><path d="M20 20l-3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>);
const ResetIcon = ({ size = 18 }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const ThemeIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
    <g transform="translate(12 12) scale(1.18) translate(-12 -12)" fill={color}>
      <path d="M16.22 13.96c1.04-3.9-1.44-7.93-5.49-9.01C6.14 3.72-0.36 6.91 1.08 11.01c.48 1.35 1.41 1.67 3.15 1.7h.11c.92.01 1.18.06 1.26.19.12.21.12.55-.01 1.46-.07.43-.09.58-.12.82-.16 1.43.09 2.55 1.02 3.54 2.93 3.15 8.56-.39 9.73-4.78ZM2.97 10.34c-.73-2.06 3.93-4.34 7.24-3.46 3 .8 4.8 3.75 4.05 6.58-.84 3.13-4.78 5.6-6.33 3.93-.48-.52-.6-1.07-.5-1.98.02-.19.05-.33.11-.73.22-1.4.21-2.04-.27-2.82-.6-.97-1.3-1.13-2.94-1.15h-.11c-.97-.01-1.2-.09-1.26-.37Z" />
      <circle cx="6" cy="8.75" r="1.25" />
      <circle cx="9.75" cy="8.75" r="1.25" />
      <circle cx="12.25" cy="11.75" r="1.25" />
      <circle cx="10.75" cy="15.25" r="1.25" />
      <path d="M14.37 3.6c.49-.26 1.1-.07 1.36.4l4.1 8.4c.15.31.02.69-.3.86-.3.16-.68.05-.85-.25l-4.71-8.07c-.27-.46-.11-1.07.35-1.34Z" />
      <path d="M12.54 3.48c.49.91 1.31 1.17 2.09.75.78-.42 1.02-1.25.53-2.18-.55-1.05-1.74-1.99-2.52-1.57-.78.42-.66 1.99-.1 3Zm.88-.47c-.16-.31-.28-.73-.3-1-.02-.27.01-.42.01-.42s.18.09.4.27c.3.24.6.59.76.9.23.42.17.63-.14.79-.31.16-.52.1-.73-.53Z" />
    </g>
  </svg>
);
const FolderIcon  = ({size=18})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 7h6l2 2h10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" stroke="#fff" strokeWidth="2"/></svg>);
const PasteIcon   = ({size=18})=>(<svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="7" y="5" width="10" height="14" rx="2" stroke="#fff" strokeWidth="2"/><path d="M9 3h6v2H9z" fill="#fff"/></svg>);

/* Settings gear icon for mobile */
const SettingsIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" stroke="#fff" strokeWidth="2" />
    <path d="M12 3v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 19v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 12h2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M19 12h2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M5.64 5.64l1.41 1.41" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M16.95 16.95l1.41 1.41" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M5.64 18.36l1.41-1.41" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M16.95 7.05l1.41-1.41" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* Reusable toggle button (icon-only) */
function IconToggle({on, title, onClick, children}) {
  return (
    <button
      className={`iconToggle ${on ? "on" : ""}`}
      aria-pressed={!!on}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

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
   Preset Themes
   ========================= */
const THEMES = [
  { id:"soft_pastel",   name:"Soft Pastel",   cat:"Core",        keys:"#9AD5FF,#B8E1FF,#D8F0FF,#C8FFD9,#FFE6A7,#FFC3C3" },
  { id:"midnight",      name:"Midnight",      cat:"Core",        keys:"#4A65FF,#3FC4FF,#28E0A5,#FFC857,#FF5E5B,#A28CFF" },
  { id:"mono_ink",      name:"Mono Ink",      cat:"Core",        keys:"#9FA7B8,#C8CFDC,#6B7385,#B0B9CC,#8892A8,#DDE3F2" },

  { id:"xbox_vibes",         name:"Xbox Vibes",           cat:"Controllers", keys:"#107C10,#3CDB4E,#D04242,#40CCD0,#ECDB33,#3A3A3A" },
  { id:"ps_vibes",           name:"PlayStation Vibes",    cat:"Controllers", keys:"#00A74F,#D22630,#0072CE,#D82882,#1F1F1F,#FFFFFF" },
  { id:"switch_neon",        name:"Switch Neon",          cat:"Controllers", keys:"#0AB9E6,#FF3C28,#828282,#0F0F0F,#E6FF00,#1EDC00" },

  { id:"halo_master_chief",  name:"Halo Master Chief",    cat:"Games", keys:"#84926A,#EFB82A,#4C4A45,#CDCFCC,#2C2E2A,#1B1B1B" },
  { id:"persona5",           name:"Persona 5",            cat:"Games", keys:"#0D0D0D,#D92323,#732424,#8C6723,#F2E852,#FFFFFF" },
  { id:"cyberpunk_neon",     name:"Cyberpunk Neon",       cat:"Games", keys:"#02D7F2,#F2E900,#007AFF,#EA00D9,#133E7C,#091833" },
  { id:"zelda_hyrule",       name:"Zelda Hyrule",         cat:"Games", keys:"#0A2E36,#F2D492,#8DA399,#C46F3E,#B22C1B,#D4AF7F" },
  { id:"mario_classic",      name:"Mario Classic",        cat:"Games", keys:"#E60012,#3B82F6,#FFD500,#8B4513,#FFFFFF,#000000" },
  { id:"sonic_speed",        name:"Sonic",                cat:"Games", keys:"#0055FF,#F4FF00,#FFFFFF,#000000,#FF6600,#00B3FF" },
  { id:"portal_test",        name:"Portal",               cat:"Games", keys:"#0088CC,#FF6600,#222222,#DDDDDD,#99D6FF,#FFB380" },
  { id:"minecraft_over",     name:"Minecraft Overworld",  cat:"Games", keys:"#67B22F,#BFAE92,#523F2E,#F2E08B,#8C764A,#4F6B3A" },
  { id:"overwatch_ui",       name:"Overwatch UI",         cat:"Games", keys:"#F6BA2D,#34B3E4,#E84C3D,#FFFFFF,#1D1D1D,#8D8D8D" },
  { id:"tetris_blocks",      name:"Tetris Blocks",        cat:"Games", keys:"#00FFFF,#0000FF,#FF0000,#FFFF00,#FF8000,#008000" },
  { id:"splatoon_ink",       name:"Splatoon Ink",         cat:"Games", keys:"#FF00BB,#00FF7F,#7D00FF,#00E5FF,#FFE600,#111111" },
  { id:"metroid_varia",      name:"Metroid Varia",        cat:"Games", keys:"#F26D1F,#00D1B2,#3F3F46,#A2A2A2,#0E7490,#F2F2F2" },
  { id:"hollow_knight",      name:"Hollow Knight",        cat:"Games", keys:"#0C1A24,#3AA0C8,#6EC1E4,#E6F1F4,#384B59,#FFFFFF" },

  { id:"cb_okabe_ito",  name:"Colorblind Okabe Ito",      cat:"Color Vision", keys:"#E69F00,#56B4E9,#009E73,#F0E442,#0072B2,#CC79A7" },
  { id:"cb_tol_bright", name:"Colorblind Tol Bright",     cat:"Color Vision", keys:"#4477AA,#66CCEE,#228833,#CCBB44,#EE6677,#AA3377" },
  { id:"cb_tol_muted",  name:"Colorblind Tol Muted",      cat:"Color Vision", keys:"#332288,#88CCEE,#44AA99,#117733,#999933,#DDCC77" },
  { id:"cb_deuter",     name:"Deuteranopia High Contrast",cat:"Color Vision", keys:"#000000,#FFFFFF,#0072B2,#E69F00,#56B4E9,#CC79A7" },
  { id:"cb_protan",     name:"Protanopia High Contrast",  cat:"Color Vision", keys:"#000000,#FFFFFF,#0072B2,#E69F00,#56B4E9,#009E73" },
  { id:"cb_tritan",     name:"Tritanopia High Contrast",  cat:"Color Vision", keys:"#000000,#FFFFFF,#E69F00,#009E73,#D55E00,#CC79A7" },
  { id:"cb_achromat",   name:"Achromat High Contrast",    cat:"Color Vision", keys:"#000000,#222222,#555555,#888888,#BBBBBB,#FFFFFF" }
];

/* =========================
   Helpers
   ========================= */
function useLongPress(onLongPress, onClick, { delay = 600 } = {}) {
  // Track whether the long press callback has fired to avoid invoking onClick afterwards
  const timeout = React.useRef();
  const longPressFired = React.useRef(false);
  const start = (e) => {
    // Reset flag when a new press starts
    longPressFired.current = false;
    timeout.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress(e);
    }, delay);
  };
  const clear = (e, triggerClick = true) => {
    clearTimeout(timeout.current);
    // Only call onClick if the long press did not fire and triggerClick is true
    if (!longPressFired.current && triggerClick) onClick(e);
    // Reset the flag after handling
    longPressFired.current = false;
  };
  return {
    onPointerDown: start,
    onPointerUp: (e) => clear(e, true),
    onPointerLeave: (e) => clear(e, false)
  };
}

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

// === Contrast utilities (WCAG-ish) ===
const LIGHT_TEXT_CUTOFF = 0.70; // tweak 0.85–0.92 to taste

function hexToRgb(hex) {
  const h = normalizeHex(hex);
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  if (!m) return { r: 119, g: 119, b: 119 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function relLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r), G = toLin(g), B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
// Only flip to black on VERY light backgrounds
function bestTextOn(bgHex) {
  const L = relLuminance(bgHex);
  return L >= LIGHT_TEXT_CUTOFF ? "#111" : "#FFFFFF";
}
function textPair(bgHex) {
  const label = bestTextOn(bgHex);
  const sub   = label === "#FFFFFF" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.72)";
  return { label, sub };
}


/* =========================
   Themes → map (including MU/MD)
   ========================= */
function applyTheme(map, layout, themeId){
  const t = THEMES.find(x => x.id === themeId);
  if (!t) return map;

  const cols = t.keys.split(",").map(c => normalizeHex(c));
  if (cols.length === 0) return map;

  // keys in layout
  const ids = Object.entries(layout)
    .filter(([, p]) => !p.blank && !p.analog && !p.split)
    .map(([id]) => id)
    .sort((a, b) => Number(a) - Number(b));

  const next = { ...map };
  ids.forEach((id, i) => {
    next[id] = { ...(next[id] || {}), color: cols[i % cols.length] };
  });

  // Also theme Mouse Up / Mouse Down halves using first two palette entries
  const muCol = cols[0] ?? BASE.teal;
  const mdCol = cols[(cols.length > 1 ? 1 : 0)] ?? BASE.indigo;
  next.MU = { ...(next.MU || { label: "Mouse Up" }), color: muCol };
  next.MD = { ...(next.MD || { label: "Mouse Down" }), color: mdCol };

  return next;
}

/* =========================
   Azeron import code → labels
   ========================= */
function tryDecodePlainJSON(b64){
  try{ return JSON.parse(atob(b64.trim())); }catch{ return null; }
}
function findButtonBuckets(obj, buckets = []) {
  if (!obj || typeof obj !== "object") return buckets;
  const isBucket = Array.isArray(obj) || Object.values(obj).some(v => v && typeof v === "object");
  if (isBucket) {
    const sample = Array.isArray(obj) ? obj[0] : Object.values(obj)[0];
    if (sample && typeof sample === "object") {
      const hasKeyish = "id" in sample || "key" in sample || "button" in sample || "name" in sample || "label" in sample || "title" in sample;
      if (hasKeyish) buckets.push(obj);
    }
  }
  Object.values(obj).forEach(v => v && typeof v === "object" && findButtonBuckets(v, buckets));
  return buckets;
}
const entryToRecord = (e) => {
  if (!e || typeof e !== "object") return null;
  const id = e.id ?? e.key ?? e.button ?? e.name ?? e.title ?? null;
  const label = e.label ?? e.title ?? e.name ?? e.binding ?? e.action ?? null;
  const sub = e.sub ?? e.subtitle ?? e.secondary ?? "";
  const emoji = e.emoji ?? "";
  const color = e.color ?? null;
  return { id, label, sub, emoji, color };
};
function applyVendorToMap(vendorJSON, layout, prevMap){
  const next = { ...prevMap };
  const ids = Object.entries(layout)
    .filter(([,p])=>!p.blank && !p.analog && !p.split)
    .map(([id])=>id).sort((a,b)=>Number(a)-Number(b));

  const buckets = findButtonBuckets(vendorJSON);
  if (!buckets.length) return next;

  const bucket = buckets.sort((a,b)=>(Array.isArray(b)?b.length:Object.keys(b).length)-(Array.isArray(a)?a.length:Object.keys(a).length))[0];
  const entries = Array.isArray(bucket) ? bucket : Object.entries(bucket).map(([kid,v])=>({ id:kid, ...v }));

  // 1) direct id match
  let matched = 0;
  entries.forEach(en=>{
    const rec = entryToRecord(en); if(!rec || !rec.id) return;
    if (ids.includes(String(rec.id))) {
      next[String(rec.id)] = {
        ...(next[String(rec.id)]||{}),
        ...(rec.label ? {label:rec.label}:{}),
        ...(rec.sub ? {sub:rec.sub}:{}),
        ...(rec.emoji ? {emoji:rec.emoji}:{}),
        ...(rec.color ? {color: normalizeHex(rec.color)}:{}),
      };
      matched++;
    }
  });
  // 2) fallback: order
  if (matched < Math.max(2, Math.floor(ids.length*0.25))) {
    const records = entries.map(entryToRecord).filter(Boolean);
    for(let i=0;i<Math.min(ids.length,records.length);i++){
      const id = ids[i], rec = records[i];
      next[id] = {
        ...(next[id]||{}),
        ...(rec.label ? {label:rec.label}:{}),
        ...(rec.sub ? {sub:rec.sub}:{}),
        ...(rec.emoji ? {emoji:rec.emoji}:{}),
        ...(rec.color ? {color: normalizeHex(rec.color)}:{}),
      };
    }
  }
  return next;
}
async function importAzeronCode(b64, layout, setMap){
  if (!b64 || typeof b64 !== "string") return false;
  let vendor = tryDecodePlainJSON(b64);
  if (!vendor){ alert("Couldn’t decode the code. Make sure it’s the full export string."); return false; }
  setMap(prev => applyVendorToMap(vendor, layout, prev));
  return true;
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
    map[id] = { label, sub: "", color: seededRandomColor(id), emoji: "", image: null, imageMode:"icon", group: "" };
  });
  map["MU"] = { label: "Mouse Up", color: BASE.teal, group: "" };
  map["MD"] = { label: "Mouse Down", color: BASE.indigo, group: "" };
  return map;
}

/* =========================
   Official profile import helpers
   ========================= */
// Map XInput button bitmasks to human‑readable names. These values are based on
// the XINPUT_GAMEPAD_* constants defined by Microsoft. Only common buttons are
// mapped here; any unmapped value falls back to a numeric label.
const XINPUT_BUTTON_NAMES = {
  0x1000: 'Y',
  0x2000: 'X',
  0x4000: 'B',
  0x8000: 'A',
  0x0100: 'LB',
  0x0200: 'RB',
  0x0001: 'DPad Up',
  0x0002: 'DPad Down',
  0x0004: 'DPad Left',
  0x0008: 'DPad Right',
  0x0010: 'Start',
  0x0020: 'Back',
  0x0040: 'LThumb',
  0x0080: 'RThumb',
};


/* =========================
   Canvas helpers (PNG)
   ========================= */
const rr=(ctx,x,y,w,h,r)=>{ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); };
function drawKeyBase(ctx,x,y,w,h,color){
  color = normalizeHex(color, "#777777");
  rr(ctx,x,y,w,h,R); ctx.fillStyle=color; ctx.fill();
  ctx.lineWidth=1.2; ctx.strokeStyle="#222"; ctx.stroke();
}
function drawKey(ctx,x,y,w,h,data){
  const col = normalizeHex(data?.color || BASE.blue);
  drawKeyBase(ctx,x,y,w,h,col);

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
    ctx.fillStyle = bestTextOn(col);
    ctx.fillText(data.emoji, x+w-30, y+30);
  }

  // Label — shrink-to-fit
  let size = 18;
  const label = data?.label || "Action";
  const pair = textPair(col);
  ctx.font = `800 ${size}px Montserrat`;
  let metrics = ctx.measureText(label);
  while (metrics.width > w - 20 && size > 10) {
    size--;
    ctx.font = `800 ${size}px Montserrat`;
    metrics = ctx.measureText(label);
  }
  ctx.fillStyle = pair.label;
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
  ctx.fillStyle = pair.sub;
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

  ctx.font="bold 16px ui-sans-serif";
  ctx.fillStyle = bestTextOn(upC);
  ctx.fillText(up.label||"Mouse Up", x+10, y+h/2-10);
  ctx.fillStyle = bestTextOn(downC);
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
  const upColor = up?.color || BASE.teal;
  const downColor = down?.color || BASE.indigo;
  return (
    <div className={`splitTile ${gloss ? "gloss" : ""}`} style={{ left:x, top:y }} title="Mouse Wheel">
      <div
        className="half top"
        style={{ background: upColor, color: bestTextOn(upColor) }}
        onMouseDown={(e)=>onPick("MU", e)}
        onContextMenu={(e)=>{ e.preventDefault(); onPick("MU", e); }}
      >
        {up?.label || "Mouse Up"}
      </div>
      <div
        className="half bottom"
        style={{ background: downColor, color: bestTextOn(downColor) }}
        onMouseDown={(e)=>onPick("MD", e)}
        onContextMenu={(e)=>{ e.preventDefault(); onPick("MD", e); }}
      >
        {down?.label || "Mouse Down"}
      </div>
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
   // BottomSheet uses React.forwardRef so we can attach a ref to the root element for click‑away detection
   const BottomSheet = React.forwardRef(function BottomSheet({ open, onClose, children }, ref) {
     return createPortal(
       <div ref={ref} className={`sheet ${open ? "open" : ""}`} onClick={onClose}>
         <div className="sheetBody" onClick={(e) => e.stopPropagation()}>
           <div className="handle" />
           {children}
         </div>
       </div>,
       document.body
     );
   });

   // FullScreenSheet renders a full‑screen overlay for mobile editing and settings. It uses a separate
   // CSS class to occupy the entire viewport and hides scrollbars. The ref is forwarded to the
   // inner panel to support click‑away detection.
   const FullScreenSheet = React.forwardRef(function FullScreenSheet({ open, onClose, children }, ref) {
     // A full‑screen modal used on mobile for settings and key editing. The overlay is rendered
     // via a portal to the document body. We intentionally avoid closing the sheet on
     // touchstart because some mobile keyboards will emit synthetic touch events that
     // inadvertently close the panel. Instead, outside clicks are handled by the
     // global handleOutside effect below. The root div retains an onClick handler
     // so that mouse clicks outside the panel still close the sheet.
     if (!open) return null;
     return createPortal(
       <div className="fullSheet" onClick={onClose}>
         <div
           ref={ref}
           className="fullSheetBody"
           // Stop all click and touch events from bubbling up to the overlay. This keeps
           // the overlay open while interacting with form fields on mobile.
           onClick={(e) => e.stopPropagation()}
           onMouseDown={(e) => e.stopPropagation()}
           onTouchStart={(e) => e.stopPropagation()}
         >
           {children}
         </div>
       </div>,
       document.body
     );
   });
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

  // Mobile scroll/pinch container + stage refs
  const stageBoxRef = useRef(null);
  const stageDomRef = useRef(null);
  const stageRef = useRef(null);
  const setStageEl = (el) => { stageDomRef.current = el; stageRef.current = el; };

  // Mobile flag
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Decode share link data on initial load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('data');
      if (encoded) {
        const data = decodeShareData(encoded);
        if (data) {
          if (data.map) setMap({ ...data.map });
          if (data.profile) setProfile(data.profile);
          if (data.layout) setLayout({ ...data.layout });
          if (data.gameTitle != null) setGameTitle(data.gameTitle);
          if (typeof data.gloss === 'boolean') setGloss(data.gloss);
          if (typeof data.showNumbers === 'boolean') setShowNumbers(data.showNumbers);
          if (typeof data.snapGrid === 'boolean') setSnapGrid(data.snapGrid);
          if (typeof data.showGrid === 'boolean') setShowGrid(data.showGrid);
          if (data.printOptions) setPrintOptions({ ...data.printOptions });
        }
      }
    } catch (err) {
      console.error('Failed to decode share data', err);
    }
  }, []);

  // Mobile settings overlay ref and state
  // Refs for full‑screen mobile overlays. settingsRef points to the settings panel body and
  // editRef points to the key edit panel body. They are used to detect clicks inside the
  // overlays so that outside clicks can dismiss them.
  const settingsRef = useRef(null);
  const editRef     = useRef(null);
  // Mobile overlay visibility flags. When `showMobileSettings` or `showMobileEdit` are true
  // the corresponding full‑screen overlay is rendered.
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showMobileEdit,     setShowMobileEdit]     = useState(false);

  // Mobile save menu visibility. Controls the dropdown menu for save options on mobile.
  const [showMobileSaveMenu, setShowMobileSaveMenu] = useState(false);

  // Print options for PNG export. Controls whether colors and numbers are printed and whether
  // a group legend or title is included. These options are adjustable by the user in settings.
  const [printOptions, setPrintOptions] = useState({
    showColors: true,
    showNumbers: true,
    includeLegend: true,
    includeTitle: true,
  });

  // Profile management: store multiple custom key maps that users can switch between.
  // These profiles are persisted in localStorage. Each profile has a name and a map.
  const [profilesList, setProfilesList] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem('azeronProfiles') || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [currentProfileIndex, setCurrentProfileIndex] = useState(() => {
    const idx = parseInt(window.localStorage.getItem('azeronCurrentProfile') || '0', 10);
    return isNaN(idx) ? 0 : idx;
  });

  // Persist profiles and current index to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem('azeronProfiles', JSON.stringify(profilesList));
    } catch {}
  }, [profilesList]);
  useEffect(() => {
    try {
      window.localStorage.setItem('azeronCurrentProfile', String(currentProfileIndex));
    } catch {}
  }, [currentProfileIndex]);

  // When currentProfileIndex changes, load that profile's map
  useEffect(() => {
    if (profilesList[currentProfileIndex] && profilesList[currentProfileIndex].map) {
      const prof = profilesList[currentProfileIndex];
      setMap(prev => {
        // Spread to avoid mutations
        return { ...prof.map };
      });
    }
  }, [currentProfileIndex]);

  // Save the current map as a new profile
  const saveCurrentProfile = () => {
    const name = window.prompt('Profile name:', `Profile ${profilesList.length + 1}`);
    if (!name) return;
    const newProfiles = [...profilesList, { name, map: { ...map } }];
    setProfilesList(newProfiles);
    setCurrentProfileIndex(newProfiles.length - 1);
  };

  // Load a profile by index (string or number)
  const loadProfileByIndex = (idx) => {
    const i = parseInt(idx, 10);
    if (!isNaN(i) && profilesList[i] && profilesList[i].map) {
      setCurrentProfileIndex(i);
    }
  };

  // Import an official JSON profile file and merge its button labels into the current map.
  // This expects the file contents to be a JSON object similar to the vendor exports,
  // containing button definitions. It does not handle CSV or other formats.
  const importOfficialProfileFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        setMap(prev => applyVendorToMap(json, layout, prev));
      } catch (err) {
        console.error('JSON import failed', err);
        alert('Failed to import profile');
      }
    };
    reader.readAsText(file);
  };

  // Prompt the user for an Azeron export code (URL-safe Base64 + LZMA) and
  // import it into the current map. Uses importAzeronCode to handle decoding.
  const handleImportCode = async () => {
    const code = window.prompt('Paste Azeron export code:');
    if (!code) return;
    try {
      await importAzeronCode(code.trim(), layout, setMap);
    } catch (err) {
      console.error('Import code failed', err);
    }
  };

  // CSV export/import functionality removed. See handleImportCode and
  // importOfficialProfileFile for the new import mechanisms.

  // Generate and copy a share link with encoded map to clipboard
  const exportShareLink = () => {
    const payload = {
      map,
      profile,
      layout,
      gameTitle,
      gloss,
      showNumbers,
      snapGrid,
      showGrid,
      printOptions,
    };
    const encoded = encodeShareData(payload);
    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Share link copied to clipboard');
    }, () => {
      alert('Unable to copy share link');
    });
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

  // Close mobile overlays when clicking outside of them. This effect runs whenever either
  // overlay is open. It checks whether the click occurred within the settings or edit panels,
  // within the context menu or emoji picker, or on the stage itself, and only closes the
  // overlays when the click is elsewhere on the document.
  useEffect(() => {
    const handleOutside = (e) => {
      if (settingsRef.current && settingsRef.current.contains(e.target)) return;
      if (editRef.current && editRef.current.contains(e.target)) return;
      if (e.target.closest?.(".ctxMenu") || e.target.closest?.(".emojiPanel")) return;
      const stageRoot = document.getElementById("stage-root");
      if (stageRoot?.contains(e.target)) return;
      if (showMobileSettings) setShowMobileSettings(false);
      if (showMobileEdit) setShowMobileEdit(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showMobileSettings, showMobileEdit]);

  // Fit zoom (responsive)
  useEffect(()=>{
    const ro = new ResizeObserver(()=>{
      const el = containerRef.current; if(!el) return;
      const pad = 24;
      const availW = Math.max(200, el.clientWidth  - pad);
      const availH = Math.max(200, el.clientHeight - pad);
      const zW = CANVAS_W > 0 ? availW / CANVAS_W : 1;
      const zH = CANVAS_H > 0 ? availH / CANVAS_H : 1;
      const z = Math.max(0.35, Math.min(1, Math.min(zW, zH)));
      setFitZoom(z);
    });
    if(containerRef.current) ro.observe(containerRef.current);
    return ()=> ro.disconnect();
  },[CANVAS_W, CANVAS_H]);

  // Mobile pan (1-finger) + pinch (2-finger)
  useEffect(() => {
    const box = stageBoxRef.current;
    if (!box) return;

    if (!isMobile) {
      box.style.touchAction = "auto";
      return;
    }
    box.style.touchAction = "none";

    const pointers = new Map();
    let lastDist = 0;
    let isPanning = false;
    let panStart = { x: 0, y: 0, sx: 0, sy: 0 };

    const dist = () => {
      const a = [...pointers.values()];
      if (a.length < 2) return 0;
      const [p1, p2] = a;
      const dx = p1.x - p2.x, dy = p1.y - p2.y;
      return Math.hypot(dx, dy);
    };

    const onDown = (e) => {
      box.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY, sx: box.scrollLeft, sy: box.scrollTop };
      } else if (pointers.size === 2) {
        lastDist = dist();
      }
    };

    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && isPanning) {
        const dx = panStart.x - e.clientX;
        const dy = panStart.y - e.clientY;
        box.scrollLeft = panStart.sx + dx;
        box.scrollTop  = panStart.sy + dy;
      } else if (pointers.size >= 2) {
        const d = dist();
        if (lastDist) {
          const factor = d / lastDist;
          setZoom(z => clamp(+((z * factor)).toFixed(3), 0.35, 2));
        }
        lastDist = d;
      }
    };

    const onUp = (e) => {
      pointers.delete(e.pointerId);
      box.releasePointerCapture?.(e.pointerId);
      if (pointers.size < 2) lastDist = 0;
      if (pointers.size === 0) isPanning = false;
    };

    box.addEventListener("pointerdown", onDown, { passive: false });
    box.addEventListener("pointermove", onMove, { passive: false });
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);

    return () => {
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
    };
  }, [isMobile]);
  // was: const displayZoom = Math.min(zoom, fitZoom);
const displayZoom = isMobile ? Math.min(zoom, fitZoom) : zoom;
const stageW = CANVAS_W * displayZoom, stageH = CANVAS_H * displayZoom;


  /* Profile switch */
  useEffect(()=>{
    const next = LAYOUTS[profile] || FALLBACK.positions;
    setLayout({ ...next });
    setMap(defaultKeymapForLayout(next));
    setSelection([]); setShowPopover(false); setMenu(null);
  },[profile]);

  /* Clear selection and popover when clicking outside of the stage and any overlays. This effect
     is separate from the overlay close logic so that selection and menus are cleared even when
     no mobile overlays are open. */
  useEffect(() => {
    const onDown = (e) => {
      // ignore clicks inside mobile overlays
      if (settingsRef.current && settingsRef.current.contains(e.target)) return;
      if (editRef.current && editRef.current.contains(e.target)) return;
      // ignore clicks on context menus or emoji picker
      if (e.target.closest?.(".ctxMenu") || e.target.closest?.(".emojiPanel")) return;
      // ignore clicks on the stage so selection clears via stage handlers
      const stage = document.getElementById("stage-root");
      if (stage?.contains(e.target)) return;
      // clear selection and close popovers/menus and mobile save dropdown
      setSelection([]);
      setShowPopover(false);
      setMenu(null);
      setShowMobileSaveMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

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

  // Compute a legend of groups (zones) assigned to keys. Each entry is [groupName, [colors...]]
  const groupLegend = React.useMemo(() => {
    const result = {};
    Object.entries(map).forEach(([k, d]) => {
      if (d && d.group) {
        if (!result[d.group]) result[d.group] = [];
        if (d.color) result[d.group].push(d.color);
      }
    });
    return Object.entries(result);
  }, [map]);

  const onPick = (id, e) => {
    // Only respond to left clicks or touches; ignore right click events for selection
    if (e?.button !== 0 && e?.pointerType !== "touch") return;
    // On mobile devices, selecting a key opens the full‑screen edit overlay. When
    // multi‑select mode is active (or the user holds ctrl/meta), we toggle the key in
    // the current selection; otherwise we replace the selection with this key. Any
    // existing popovers or context menus are closed.
    if (isMobile) {
      if (multi || e?.ctrlKey || e?.metaKey) {
        // In multi mode just update the selection; do not open the edit panel
        toggleSelect(id);
        setShowPopover(false);
        setMenu(null);
        return;
      } else {
        // Single select: replace selection and open the edit panel
        setSelection([id]);
        setShowPopover(false);
        setMenu(null);
        setShowMobileEdit(true);
        return;
      }
    }
    // Desktop behaviour: show the popover and update the selection. Multi‑select is
    // supported via ctrl/meta or the multi flag.
    if (multi || e?.ctrlKey || e?.metaKey) {
      setShowPopover(true);
      setMenu(null);
      toggleSelect(id);
    } else {
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
  const beginLasso = (e) => {
    if (!multi) return;
    if (e.target.id !== "stage-root") return;

    const el = stageRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
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
      const box = { x:lassoStart.current.sx, y:lassoStart.current.sy, ...lasso };
      const hits = Object.entries(layout)
        .filter(([_,p])=>!p.blank && !p.analog && !p.split)
        .map(([id,p])=>({ id, rect:{ x:p.x, y:p.y, w:KEY_W, h:KEY_H } }))
        .filter(({rect})=> rect.x < box.x+box.w && rect.x+rect.w > box.x && rect.y < box.y+box.h && rect.y+rect.h > box.y)
        .map(h=>h.id);
      setSelection(prev => {
        const set = new Set(prev);
        hits.forEach(id => set.add(id));
        const arr = [...set];
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
    setClipboard({
      label: d.label,
      sub: d.sub,
      emoji: d.emoji,
      color: d.color,
      image: d.image || null,
      imageMode: d.imageMode || 'icon',
      group: d.group
    });
  };
  const doPaste = (opts) => {
    if(!clipboard || selection.length===0) return;
    setMap(prev=>{
      const next = { ...prev };
      selection.forEach(id=>{
        const base = next[id] || {};
        const apply = { ...base };
        if(opts.label) apply.label = clipboard.label;
        if(opts.sub)   apply.sub   = clipboard.sub;
        if(opts.emoji) apply.emoji = clipboard.emoji;
        if(opts.color && clipboard.color) apply.color = clipboard.color;
        if(opts.image) { apply.image = clipboard.image || null; apply.imageMode = clipboard.imageMode || "icon"; }
        if(opts.group) apply.group = clipboard.group;
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

  // Mobile settings sheet content replicating the desktop top bar
  const MobileSettingsContent = () => (
    <div className="toolbarWrap">
      {/* Bar 1 */}
      <div className="rowWrap">
        <DevicePicker value={profile} onChange={setProfile} />

        <label className="badge"><input type="checkbox" checked={locked} onChange={e=>setLocked(e.target.checked)} /> Lock</label>
        {/* Hide the Multi toggle on mobile since multi‑select is controlled via the top‑bar multi icon */}
        {!isMobile && (
          <label className="badge"><input type="checkbox" checked={multi} onChange={e=>setMulti(e.target.checked)} /> Multi</label>
        )}
        <label className="badge"><input type="checkbox" checked={snapGrid} onChange={e=>setSnapGrid(e.target.checked)} /> Snap</label>
        <label className="badge"><input type="checkbox" checked={showGrid} onChange={e=>setShowGrid(e.target.checked)} /> Grid</label>
        <label className="badge"><input type="checkbox" checked={gloss} onChange={e=>setGloss(e.target.checked)} /> Gloss</label>
        <label className="badge"><input type="checkbox" checked={showNumbers} onChange={e=>setShowNumbers(e.target.checked)} /> #</label>

        <button className="btn" onClick={invertLayout}>Invert</button>
        <button
          className="btn"
          title="Randomize colors"
          onClick={() => {
            setMap(prev => {
              const next = { ...prev };
              Object.keys(layout).forEach(id => {
                // Skip blank/analog/split keys and keys belonging to a group (so their colors remain locked)
                if (layout[id].blank || layout[id].analog || layout[id].split) return;
                if (prev[id] && prev[id].group) return;
                next[id] = { ...(next[id] || {}), color: seededRandomColor(id + Date.now()) };
              });
              // Randomize MU and MD if they are not grouped
              if (!(prev["MU"] && prev["MU"].group)) {
                next["MU"] = { ...(next["MU"] || {}), color: seededRandomColor("MU" + Date.now()) };
              }
              if (!(prev["MD"] && prev["MD"].group)) {
                next["MD"] = { ...(next["MD"] || {}), color: seededRandomColor("MD" + Date.now()) };
              }
              return next;
            });
          }}
        >
          🎲
        </button>
      </div>

      {/* Bar 2 */}
      <div className="rowWrap centerWrap">
        <input
          className="input titleInput titleInputXL"
          placeholder="Title of your game"
          value={gameTitle}
          onChange={e=>setGameTitle(e.target.value)}
          style={{ maxWidth:620, minWidth:260 }}
        />

        {/* THEME / SAVE / LOAD */}
        <div className="compactMenuWrap">
          <button
            className="iconToggle"
            title="Theme & file actions"
            onClick={(e)=>{
              const menu = e.currentTarget.nextSibling;
              menu.classList.toggle("open");
            }}
          >
            <ThemeIcon />
          </button>
          <div
            className="compactMenu"
            onMouseLeave={(e)=>e.currentTarget.classList.remove("open")}
          >
            <div className="row">
              <select
                className="select"
                defaultValue="__none__"
                aria-label="Apply preset theme"
                onChange={e=>{
                  const id = e.target.value;
                  if (id === "__none__") return;
                  setMap(prev => applyTheme(prev, layout, id));
                }}
              >
                <option value="__none__">Apply preset theme…</option>
                {(() => {
                  const byCat = THEMES.reduce((acc, t) => {
                    const k = t.cat || "Other";
                    (acc[k] ||= []).push(t);
                    return acc;
                  }, {});
                  Object.values(byCat).forEach(arr =>
                    arr.sort((a,b) => a.name.localeCompare(b.name))
                  );
                  const order = ["Core", "Controllers", "Games", "Color Vision", "Other"];
                  const orderedCats = [
                    ...order.filter(k => byCat[k]),
                    ...Object.keys(byCat).filter(k => !order.includes(k)),
                  ];
                  return orderedCats.map(cat => (
                    <optgroup key={cat} label={cat}>
                      {byCat[cat].map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ));
                })()}
              </select>
            </div>

            <div className="row">
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
                <SaveIcon />&nbsp; Save Theme JSON
              </button>
            </div>

            <div className="row">
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
                <FolderIcon />&nbsp; Load Theme JSON
              </button>
            </div>
            <div className="row">
              <button className="btn" onClick={(e)=>e.currentTarget.closest(".compactMenu").classList.remove("open")}>Close</button>
            </div>
          </div>
        </div>

        {/* Save images */}
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
            Save <span style={{ marginLeft: 8 }}>▾</span>
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
            <button className="btn" style={{ width:"100%", marginBottom:6 }} onClick={saveImage}>Save printer friendly PNG</button>
            <button className="btn" style={{ width:"100%" }} onClick={exportUI}>Save colored UI PNG</button>
          </div>
        </div>


        {/* Zoom controls are omitted on mobile devices; use pinch‑to‑zoom instead */}
        {!isMobile && (
          <>
            <button className="iconToggle" title="Zoom Out" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}><ZoomOutIcon /></button>
            <button className="iconToggle" title="Zoom In"  onClick={() => setZoom(z => Math.min(2,   +(z + 0.1).toFixed(2)))}><ZoomInIcon /></button>
          </>
        )}

        <button
          className="btn iconLabel"
          onClick={()=>{
            const next = LAYOUTS[profile] || FALLBACK.positions;
            setLayout({ ...next });
            setMap(defaultKeymapForLayout(next));
            setSelection([]); setShowPopover(false); setMenu(null);
          }}
        >
          <ResetIcon size={16} />
          <span>Reset Layout</span>
        </button>
      </div>
    </div>
  );

  // Mobile edit overlay content. Displays a preview of the currently selected key and
  // provides controls for editing label, sub label, emoji, color, image and image mode.
  // It also exposes copy/paste operations in a two‑column grid. A Continue button
  // closes the overlay when the user is finished editing.
  const MobileEditContent = () => {
    if (!lastSelected) return null;
    const activeKey = map[lastSelected] || {};
    // Local input states for label, sub and group. These avoid updating the
    // keymap on every keystroke, which on some mobile keyboards (e.g. Samsung
    // Galaxy S25 Ultra) causes the input to lose focus and the keyboard to
    // collapse. Instead, we update the global keymap only when the user
    // presses the Continue button.
    const [labelInput, setLabelInput] = React.useState(activeKey.label || "");
    const [subInput, setSubInput] = React.useState(activeKey.sub || "");
    const [groupInput, setGroupInput] = React.useState(activeKey.group || "");
    // When selection changes or activeKey updates (e.g. switching between keys),
    // sync the local inputs to reflect the new key values.
    React.useEffect(() => {
      setLabelInput(activeKey.label || "");
      setSubInput(activeKey.sub || "");
      setGroupInput(activeKey.group || "");
    }, [lastSelected, activeKey.label, activeKey.sub, activeKey.group]);
    // Local state for quick group name in multi-edit mode
    const [quickGroupName, setQuickGroupName] = React.useState("");
    const flatBg = normalizeHex(activeKey.color || BASE.blue);
    const pair   = textPair(flatBg);
    const labelSize = activeKey.label ? (activeKey.label.length > 30 ? 14 : activeKey.label.length > 22 ? 16 : 18) : 18;
    const subSize   = activeKey.sub   ? (activeKey.sub.length   > 28 ? 13 : activeKey.sub.length   > 20 ? 14 : 16) : 16;

    // Hidden input reference (legacy). The native OS emoji picker is no longer used on mobile; we use the custom emoji picker for consistency.
    const emojiNativeRef = React.useRef(null);
    // Define the list of key actions. The last action spans both columns.
    const keyActions = [
      { label: "Copy",      fn: () => doCopy() },
      { label: "Paste Label",  fn: () => doPaste({ label: true }) },
      { label: "Paste Sub",    fn: () => doPaste({ sub: true }) },
      { label: "Paste Emoji",  fn: () => doPaste({ emoji: true }) },
      { label: "Paste Color",  fn: () => doPaste({ color: true }) },
      { label: "Paste Image",  fn: () => doPaste({ image: true }) },
      { label: "Paste All",    fn: () => doPaste({ label: true, sub: true, emoji: true, color: true, image: true, group: true }), span: true }
    ];
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          height: '100%',
          overflowY: 'auto',
          padding: 16,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 460,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Preview row for selected keys when in multi-select mode. Only show when more than one key is selected. */}
          {selection.length > 1 && (
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}
            >
              {selection.slice(0, 3).map((sid, idx) => {
                const kd = map[sid] || {};
                const col = normalizeHex(kd.color || BASE.blue);
                const tp = textPair(col);
                const lbl = kd.label || '';
                const fontSize = lbl.length > 10 ? 10 : lbl.length > 6 ? 12 : 14;
                return (
                  <div
                    key={sid}
                    style={{
                      width: 80,
                      height: 96,
                      borderRadius: 12,
                      background: col,
                      boxShadow: '0 6px 16px rgba(0,0,0,.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-end',
                      padding: '6px 8px',
                      overflow: 'hidden',
                    }}
                  >
                    {kd.image && kd.imageMode === 'cover' && (
                      <img
                        alt=""
                        src={kd.image}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, zIndex: 0 }}
                      />
                    )}
                    {kd.emoji && (
                      <div style={{ zIndex: 2, fontSize: 22, marginBottom: 4 }}>{kd.emoji}</div>
                    )}
                    {kd.label && (
                      <div
                        style={{
                          zIndex: 2,
                          fontSize: fontSize,
                          fontWeight: 700,
                          lineHeight: 1.1,
                          color: tp.label,
                          maxWidth: '100%',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {kd.label}
                      </div>
                    )}
                  </div>
                );
              })}
              {selection.length > 3 && (
                <div
                  style={{
                    width: 80,
                    height: 96,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    fontWeight: 700,
                    color: '#fff',
                  }}
                >
                  +
                </div>
              )}
            </div>
          )}

          {/* Quick group assignment: show when multiple keys are selected */}
          {selection.length > 1 && (
            <div>
              <input
                className="input"
                placeholder="Name Quick Group"
                value={quickGroupName}
                onChange={e => setQuickGroupName(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <button
                className="btn primary"
                onClick={() => {
                  const name = quickGroupName.trim();
                  if (name) {
                    // Update all selected keys immediately via setField. Also update
                    // the local group input so subsequent edits reflect the new group.
                    setField('group', name);
                    setGroupInput(name);
                    setQuickGroupName('');
                  }
                }}
                style={{ width: '100%' }}
              >
                Make Group
              </button>
            </div>
          )}
          {/* Preview of the selected key */}
          <div style={{ alignSelf: 'center' }}>
            <div
              style={{
                position: 'relative',
                width: 120,
                height: 140,
                borderRadius: 18,
                background: gloss
                  ? `radial-gradient(130% 170% at 30% 10%, rgba(255,255,255,.35), rgba(255,255,255,.08) 42%, rgba(255,255,255,.04) 60%, transparent 70%),` +
                    ` radial-gradient(120% 170% at 70% 90%, rgba(0,0,0,.30), rgba(0,0,0,.14) 40%, transparent 70%), ` + flatBg
                  : flatBg,
                boxShadow: '0 14px 28px rgba(0,0,0,.45)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                padding: '10px 12px',
                overflow: 'hidden',
              }}
            >
              {activeKey.image && activeKey.imageMode === 'cover' && (
                <img
                  alt=""
                  src={activeKey.image}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18, zIndex: 0 }}
                />
              )}
              {activeKey.image && activeKey.imageMode !== 'cover' && (
                <img
                  alt=""
                  src={activeKey.image}
                  style={{ position: 'absolute', right: 8, top: 8, width: 26, height: 26, borderRadius: 6, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,.5)', zIndex: 2 }}
                />
              )}
              {activeKey.emoji && (
                <div style={{ zIndex: 2, fontSize: 32, marginBottom: 6 }}>{activeKey.emoji}</div>
              )}
              {activeKey.label && (
                <div style={{ zIndex: 2, fontSize: labelSize, fontWeight: 700, lineHeight: 1.1, color: pair.label }}>
                  {activeKey.label}
                </div>
              )}
              {activeKey.sub && (
                <div style={{ zIndex: 2, fontSize: subSize, color: pair.sub, opacity: 0.9 }}>{activeKey.sub}</div>
              )}
            </div>
          </div>
          {/* Editing fields */}
          <div className="row">
            <input
              className="input"
              placeholder="Label"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="row">
            <input
              className="input"
              placeholder="Sub"
              value={subInput}
              onChange={e => setSubInput(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {/* Group field: allows assigning a group/category to this key */}
          <div className="row">
            <input
              className="input"
              placeholder="Group"
              value={groupInput}
              onChange={e => setGroupInput(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="row">
            {/* Use the same custom emoji picker on both desktop and mobile. Clicking toggles the picker. */}
            <button
              ref={emojiButtonRef}
              className="btn"
              style={{ width: '100%', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onClick={() => setEmojiOpen(v => !v)}
            >
              <SmileIcon />
              <span>{activeKey.emoji || 'Pick Emoji'}</span>
            </button>
          </div>
          {emojiOpen && createPortal(
            <>
              <ScrollbarCSS />
              <div
                ref={pickerRef}
                className="emojiPanel"
                style={{
                  position: 'fixed',
                  zIndex: 9999,
                  ...(() => {
                    // Align the emoji panel relative to the button or hidden input.
                    const r = emojiButtonRef.current?.getBoundingClientRect();
                    const panelW = 360, pad = 8;
                    const top = (r?.bottom ?? 0) + 6;
                    let left = (r?.left ?? 0);
                    const vw = window.innerWidth;
                    if (left + panelW > vw - pad) left = Math.max(pad, vw - panelW - pad);
                    return { top, left, width: panelW, maxHeight: 360 };
                  })(),
                  overflowY: 'auto', overflowX: 'hidden',
                  boxShadow: '0 12px 28px rgba(0,0,0,.45)',
                  borderRadius: 12,
                  background: 'rgba(18,23,53,0.96)',
                  border: '1px solid rgba(255,255,255,.10)',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <EmojiPicker
                  theme="dark"
                  autoFocusSearch={false}
                  onEmojiClick={(data) => {
                    setField('emoji', data.emoji);
                    setEmojiOpen(false);
                    emojiButtonRef.current?.focus();
                  }}
                />
              </div>
            </>,
            document.body
          )}
          {/* Color picker row: color fills full width */}
          <div style={{ marginTop: 10, width: '100%' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Color</label>
            <input
              type="color"
              className="colorPicker"
              value={normalizeHex(activeKey.color || BASE.blue)}
              onChange={e => setField('color', e.target.value)}
              style={{ width: '100%', height: 36 }}
            />
          </div>

          {/* Image functions: upload, mode toggle, remove */}
          <div style={{ fontWeight: 600, fontSize: 14, marginTop: 12 }}>Image</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
            <label
              htmlFor="img-upload-mobile"
              className="iconBtn"
              title="Upload image"
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ImageIcon />
            </label>
            <input
              id="img-upload-mobile"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const url = await new Promise(r => {
                  const rd = new FileReader();
                  rd.onload = () => r(rd.result);
                  rd.readAsDataURL(f);
                });
                setField('image', url);
                e.target.value = '';
              }}
            />
            <button
              className={`btn ${activeKey.imageMode !== 'cover' ? 'primary' : ''}`}
              onClick={() => setField('imageMode', 'icon')}
            >
              Icon
            </button>
            <button
              className={`btn ${activeKey.imageMode === 'cover' ? 'primary' : ''}`}
              onClick={() => setField('imageMode', 'cover')}
            >
              Cover
            </button>
            <button
              className="btn"
              onClick={() => {
                setField('image', null);
                setField('imageMode', 'icon');
              }}
            >
              Remove
            </button>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Key actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, width: '100%' }}>
            {keyActions.map(({ label, fn, span }, idx) => (
              <button
                key={label}
                className={`btn ${span ? 'primary' : ''}`}
                onClick={fn}
                style={span ? { gridColumn: '1 / -1' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="btn"
            onClick={() => {
              // Commit local edits to the keymap before closing. Update all selected keys
              // with the current label, sub, and group values. This avoids re-rendering
              // the whole app on every keystroke and preserves keyboard focus during editing.
              setMap(prev => {
                const next = { ...prev };
                selection.forEach(id => {
                  const base = next[id] || {};
                  next[id] = { ...base, label: labelInput, sub: subInput, group: groupInput };
                });
                return next;
              });
              setShowMobileEdit(false);
            }}
            style={{ marginTop: 8 }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  // MobileSettingsPanel presents settings in a simple vertical list for small screens.
  // It includes toggles for lock/multi/snap/grid/gloss/numbers, buttons to invert the layout,
  // randomize colors, adjust zoom, reset the layout, and a close button. A DevicePicker is
  // provided to switch between supported devices.
  const MobileSettingsPanel = () => {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Settings</div>
        {/* Device picker for hardware profile */}
        <DevicePicker value={profile} onChange={setProfile} />
        {/* Profile selection removed completely per user request */}
        {/* Toggles for layout and appearance */}
        <label className="badge"><input type="checkbox" checked={locked} onChange={e => setLocked(e.target.checked)} /> Lock</label>
        {/* Hide the Multi toggle on mobile; multi‑select is controlled via the top‑bar multi icon */}
        {!isMobile && (
          <label className="badge"><input type="checkbox" checked={multi} onChange={e => setMulti(e.target.checked)} /> Multi</label>
        )}
        <label className="badge"><input type="checkbox" checked={snapGrid} onChange={e => setSnapGrid(e.target.checked)} /> Snap</label>
        <label className="badge"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} /> Grid</label>
        <label className="badge"><input type="checkbox" checked={gloss} onChange={e => setGloss(e.target.checked)} /> Gloss</label>
        <label className="badge"><input type="checkbox" checked={showNumbers} onChange={e => setShowNumbers(e.target.checked)} /> #</label>
        {/* Print options */}
        <div style={{ fontWeight: 600, marginTop: 12 }}>Print Options</div>
        <label className="badge"><input type="checkbox" checked={printOptions.showColors} onChange={e => setPrintOptions(opt => ({ ...opt, showColors: e.target.checked }))} /> Show Colors</label>
        <label className="badge"><input type="checkbox" checked={printOptions.showNumbers} onChange={e => setPrintOptions(opt => ({ ...opt, showNumbers: e.target.checked }))} /> Show Numbers</label>
        <label className="badge"><input type="checkbox" checked={printOptions.includeLegend} onChange={e => setPrintOptions(opt => ({ ...opt, includeLegend: e.target.checked }))} /> Legend</label>
        <label className="badge"><input type="checkbox" checked={printOptions.includeTitle} onChange={e => setPrintOptions(opt => ({ ...opt, includeTitle: e.target.checked }))} /> Title</label>
        {/* Key layout actions */}
        <button className="btn" onClick={invertLayout}>Invert</button>
        <button
          className="btn"
          onClick={() => {
            setMap(prev => {
              const next = { ...prev };
              Object.keys(layout).forEach(id => {
                // Skip blank/analog/split keys and group-locked keys
                if (layout[id].blank || layout[id].analog || layout[id].split) return;
                if (prev[id] && prev[id].group) return;
                next[id] = { ...(next[id] || {}), color: seededRandomColor(id + Date.now()) };
              });
              // Randomize MU and MD if they are not grouped
              if (!(prev['MU'] && prev['MU'].group)) {
                next['MU'] = { ...(next['MU'] || {}), color: seededRandomColor('MU' + Date.now()) };
              }
              if (!(prev['MD'] && prev['MD'].group)) {
                next['MD'] = { ...(next['MD'] || {}), color: seededRandomColor('MD' + Date.now()) };
              }
              return next;
            });
          }}
        >
          Randomize Colors
        </button>
        {/* Omit zoom controls on mobile; pinch‑to‑zoom provides this functionality */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="iconToggle" title="Zoom Out" onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}><ZoomOutIcon /></button>
            <button className="iconToggle" title="Zoom In"  onClick={() => setZoom(z => Math.min(2,   +(z + 0.1).toFixed(2)))}><ZoomInIcon /></button>
          </div>
        )}
        <button
          className="btn iconLabel"
          onClick={() => {
            const next = LAYOUTS[profile] || FALLBACK.positions;
            setLayout({ ...next });
            setMap(defaultKeymapForLayout(next));
            setSelection([]); setShowPopover(false); setMenu(null);
          }}
        >
          <ResetIcon size={16} />&nbsp;Reset Layout
        </button>
        {/* Import/export and sharing (removed per user request) */}
        {/* Hidden file input removed */}
        <button className="btn" onClick={() => setShowMobileSettings(false)}>Close</button>
      </div>
    );
  };

  /* Export PNG — centered + printer-friendly */
  const saveImage = async () => {
    const c = canvasRef.current;
    if (!c) return;

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    c.width = CANVAS_W * dpr;
    c.height = CANVAS_H * dpr;
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1) Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 2) Title and headers (if enabled)
    if (printOptions?.includeTitle) {
      /*
       * Draw a neutral header and footer. The header shows the game title (or
       * fallback title) and the device type. The footer gives credit to
       * JimmyCPW. To adhere to the request of having only the keys in color,
       * the header and footer use a monochrome gradient.
       */
      const headerH = 72;
      const footerH = 40;
      // header background (monochrome)
      const grdH = ctx.createLinearGradient(0, 0, 0, headerH);
      grdH.addColorStop(0, '#1a1a33');
      grdH.addColorStop(1, '#0e0e21');
      ctx.fillStyle = grdH;
      ctx.fillRect(0, 0, CANVAS_W, headerH);

      // Determine game title and device
      const game = gameTitle?.trim() || '';
      const deviceName = profile ? (profile[0].toUpperCase() + profile.slice(1)) : '';
      // Draw game name (first line)
      ctx.fillStyle = '#f2f2f2';
      ctx.font = '700 30px Montserrat, ui-sans-serif';
      const gt = game || (deviceName ? `${deviceName} Layout` : '');
      if (gt) ctx.fillText(gt, 20, 40);
      // Draw device type (second line)
      ctx.font = '600 20px Montserrat, ui-sans-serif';
      if (deviceName) ctx.fillText(deviceName, 20, 68);

      // footer background (monochrome)
      const grdF = ctx.createLinearGradient(0, CANVAS_H - footerH, 0, CANVAS_H);
      grdF.addColorStop(0, '#0e0e21');
      grdF.addColorStop(1, '#1a1a33');
      ctx.fillStyle = grdF;
      ctx.fillRect(0, CANVAS_H - footerH, CANVAS_W, footerH);
      // footer text (credit)
      ctx.fillStyle = '#f2f2f2';
      ctx.font = '600 16px Montserrat, ui-sans-serif';
      const credit = 'Created by JimmyCPW';
      ctx.fillText(credit, 20, CANVAS_H - 20);
    }

    // 3) Preload key images
    const withImages = Object.entries(layout)
      .filter(([, p]) => !p.analog && !p.split && !p.blank)
      .map(([id]) => ({ id, data: map[id] }));
    for (const { data } of withImages) {
      if (data?.image) {
        try { data.__img = await loadImage(data.image); } catch {}
      }
    }

    // 4) Centering offsets
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    Object.values(layout).forEach((pos) => {
      const w = pos.analog ? KEY_W * 2 + GAP_X : KEY_W;
      const h = KEY_H;
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + w);
      maxY = Math.max(maxY, pos.y + h);
    });
    const layoutWidth = maxX - minX;
    const layoutHeight = maxY - minY;
    const offsetX = (CANVAS_W - layoutWidth) / 2 - minX;
    // Calculate vertical offset to center the layout between the header and footer.
    let offsetY;
    if (printOptions?.includeTitle) {
      // match header/footer heights used in the drawing above
      const headerH = 72;
      const footerH = 40;
      const availH = CANVAS_H - headerH - footerH;
      offsetY = headerH + (availH - layoutHeight) / 2 - minY;
    } else {
      // fallback to legacy margin when no title/headers
      const legacyTop = 40;
      offsetY = (CANVAS_H - layoutHeight) / 2 - minY + legacyTop;
    }

    // 5) Draw keys and split
    const colorOverride = printOptions?.showColors ? null : '#cccccc';
    Object.entries(layout).forEach(([id, pos]) => {
      if (pos.blank) return;
      if (pos.split) {
        const up = map["MU"] || { label: "Mouse Up", color: BASE.teal };
        const down = map["MD"] || { label: "Mouse Down", color: BASE.indigo };
        drawSplit(ctx, pos.x + offsetX, pos.y + offsetY, KEY_W, KEY_H,
          colorOverride ? { ...up, color: colorOverride } : up,
          colorOverride ? { ...down, color: colorOverride } : down
        );
        return;
      }
      if (pos.analog) return;
      const keyData = map[id] || {};
      const overrideData = colorOverride ? { ...keyData, color: colorOverride } : keyData;
      drawKey(ctx, pos.x + offsetX, pos.y + offsetY, KEY_W, KEY_H, overrideData);
    });

    // 6) Analog stick
    const ap = layout["ANALOG"];
    if (ap) drawAnalogMonoline(ctx, ap.x + offsetX, ap.y + offsetY);

    // Group legend (optional)
    if (printOptions?.includeLegend) {
      // Collect groups from map
      const groups = {};
      Object.entries(map).forEach(([id, data]) => {
        if (data && data.group) {
          if (!groups[data.group]) groups[data.group] = [];
          if (data.color) groups[data.group].push(data.color);
        }
      });
      const entries = Object.entries(groups);
      if (entries.length) {
        let y = CANVAS_H - 140;
        const x0 = 40;
        entries.forEach(([g, cols]) => {
          const col = cols.length ? cols[0] : '#888';
          // color box
          ctx.fillStyle = col;
          ctx.fillRect(x0, y, 18, 12);
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x0, y, 18, 12);
          // label
          ctx.fillStyle = '#111';
          ctx.font = '600 14px Montserrat, ui-sans-serif';
          ctx.fillText(g, x0 + 24, y + 11);
          y += 20;
        });
      }
    }
    // 7) Footer
    const footer = "Generated with Azeron Keymap Helper — not affiliated with Azeron";
    // draw this in white so it stands out on the neutral footer background
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 14px Montserrat, ui-sans-serif";
    const fw = ctx.measureText(footer).width;
    ctx.fillText(footer, (CANVAS_W - fw) / 2, CANVAS_H - 20);

    // 8) Prepare final canvas sized to standard US letter ratio (11x8.5) in landscape.
    const targetRatio = 11 / 8.5;
    const origW = c.width; // pixel dimensions include devicePixelRatio
    const origH = c.height;
    let finalW = origW;
    let finalH = origH;
    if (origW / origH > targetRatio) {
      // original is wider than 11:8.5, expand height to fit ratio
      finalH = Math.round(origW / targetRatio);
      finalW = origW;
    } else {
      // original is taller/narrower, expand width to fit ratio
      finalW = Math.round(origH * targetRatio);
      finalH = origH;
    }
    // Create a new canvas with the desired ratio
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = finalW;
    finalCanvas.height = finalH;
    const fctx = finalCanvas.getContext('2d');
    // fill background with white
    fctx.fillStyle = '#ffffff';
    fctx.fillRect(0, 0, finalW, finalH);
    // center original canvas within final canvas
    const offsetX2 = (finalW - origW) / 2;
    const offsetY2 = (finalH - origH) / 2;
    fctx.drawImage(c, offsetX2, offsetY2, origW, origH);
    // Convert final canvas to PNG and trigger download
    const url = finalCanvas.toDataURL('image/png');
    // For mobile Safari/Chrome the download may not trigger unless the element is part of the DOM.
    const a = document.createElement('a');
    a.download = `azeron_${profile}_print.png`;
    a.href = url;
    // Append to body to ensure click works on mobile
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // glossy UI DOM snapshot
  const exportUI = async () => {
    const stage = stageDomRef.current;
    if (!stage) return;

    const panel = stage.closest(".panel");
    const grid = panel?.querySelector('div[aria-hidden="true"]') || null;

    const prevTransform = stage.style.transform;
    const prevW = stage.style.width;
    const prevH = stage.style.height;
    const prevAttr = stage.getAttribute("data-exporting");
    const prevGridDisplay = grid ? grid.style.display : null;

    try {
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

      // On mobile we need to append the anchor to the DOM for download to work
      const a = document.createElement("a");
      a.download = `azeron_${profile}_ui.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("UI export failed. Ensure images are same-origin or data URLs.");
    } finally {
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

    // anchor rect
    let ax = 0, ay = 0, aw = KEY_W, ah = KEY_H;
    if (lastSelected === "MU" || lastSelected === "MD") {
      const mw = layout["MW"]; if (!mw) return null;
      ax = mw.x; ay = mw.y + (lastSelected === "MU" ? 0 : KEY_H/2);
      aw = KEY_W; ah = KEY_H/2;
    } else {
      const p = layout[lastSelected]; if (!p) return null;
      ax = p.x; ay = p.y;
      aw = p.analog ? (KEY_W*2+GAP_X) : KEY_W;
      ah = KEY_H;
    }

    // right of anchor
    let side = "right";
    let x = ax + aw + pad;
    let y = ay;

    if (x + popW > CANVAS_W - pad) {
      x = ax - popW - pad;
      side = "left";
    }
    x = clamp(x, pad, Math.max(pad, CANVAS_W - popW - pad));

    if (y + popH > CANVAS_H - pad) {
      y = ay + ah - popH;
    }
    y = clamp(y, pad, Math.max(pad, CANVAS_H - popH - pad));

    return { x, y, w: popW, h: popH, side };
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
      <header className="header">
        {/* Settings button on the left for mobile */}
        {isMobile && (
          <button
            className="settingsButton"
            onClick={() => setShowMobileSettings(true)}
            aria-label="Settings"
          onMouseDown={(e) => e.stopPropagation()}
          >
            <SettingsIcon size={20} />
          </button>
        )}
        {/* Center brand within a flex wrapper */}
        <div className="brandWrap">
          <img src="/logo.png" alt="Unofficial Azeron Keymap Helper" className="brandLogo" />
        </div>
        {/* Multi‑select and edit controls on mobile aligned to the right */}
        {isMobile && (
          <div className="mobileMultiControls">
            <button
              className={`iconToggle ${multi ? 'on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setMulti((m) => !m);
              }}
              aria-pressed={multi}
              title="Toggle multi‑select"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <MultiIcon />
            </button>
            {multi && (
              <button
                className="iconToggle"
                title="Edit selected keys"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selection.length > 0) {
                    setShowPopover(false);
                    setMenu(null);
                    setShowMobileEdit(true);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <EditIcon />
              </button>
            )}
        {/* Save button: toggles a small dropdown menu for saving images (print-friendly or colored UI). Always shown on mobile. */}
        <div style={{ position: 'relative' }}>
          <button
            className={`iconToggle`}
            title="Save images"
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileSaveMenu((v) => !v);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <SaveIcon />
          </button>
          {showMobileSaveMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                background: 'rgba(18,23,53,0.96)',
                border: '1px solid rgba(255,255,255,.10)',
                borderRadius: 12,
                boxShadow: '0 12px 28px rgba(0,0,0,.45)',
                padding: 8,
                zIndex: 30,
                minWidth: 200,
              }}
              onMouseLeave={!isMobile ? () => setShowMobileSaveMenu(false) : undefined}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <button
                className="btn"
                style={{ width: '100%', marginBottom: 6 }}
                onClick={async () => {
                  setShowMobileSaveMenu(false);
                  await saveImage();
                }}
              >
                Save printer friendly PNG
              </button>
              <button
                className="btn"
                style={{ width: '100%' }}
                onClick={async () => {
                  setShowMobileSaveMenu(false);
                  await exportUI();
                }}
              >
                Save colored UI PNG
              </button>
            </div>
          )}
        </div>
          </div>
        )}
      </header>

      {/* mobile settings overlay */}
      {isMobile && showMobileSettings && (
        <FullScreenSheet ref={settingsRef} open={showMobileSettings} onClose={() => setShowMobileSettings(false)}>
          <MobileSettingsPanel />
        </FullScreenSheet>
      )}

      {/* mobile edit overlay */}
      {isMobile && showMobileEdit && (
        <FullScreenSheet ref={editRef} open={showMobileEdit} onClose={() => setShowMobileEdit(false)}>
          <MobileEditContent />
        </FullScreenSheet>
      )}

      {/* Mobile legend is rendered inside the panel below the header. It is handled
         elsewhere in the layout to ensure it never overlaps the keys. See the
         legendBar element in the canvas panel. */}
      {/* Top controls (desktop only) */}
      {!isMobile && (
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
            <button
              className="btn"
              title="Randomize colors"
              onClick={() => {
                setMap(prev => {
                  const next = { ...prev };
                  Object.keys(layout).forEach(id => {
                    // Skip blank/analog/split keys and group-locked keys
                    if (layout[id].blank || layout[id].analog || layout[id].split) return;
                    if (prev[id] && prev[id].group) return;
                    next[id] = { ...(next[id] || {}), color: seededRandomColor(id + Date.now()) };
                  });
                  // Randomize MU and MD if they are not grouped
                  if (!(prev["MU"] && prev["MU"].group)) {
                    next["MU"] = { ...(next["MU"] || {}), color: seededRandomColor("MU" + Date.now()) };
                  }
                  if (!(prev["MD"] && prev["MD"].group)) {
                    next["MD"] = { ...(next["MD"] || {}), color: seededRandomColor("MD" + Date.now()) };
                  }
                  return next;
                });
              }}
            >
              🎲
            </button>
          </div>

          {/* Bar 2 */}
          <div className="rowWrap centerWrap">
            <input
              className="input titleInput titleInputXL"
              placeholder="Title of your game"
              value={gameTitle}
              onChange={e=>setGameTitle(e.target.value)}
              style={{ maxWidth:620, minWidth:260 }}
            />

            {/* THEME / SAVE / LOAD */}
            <div className="compactMenuWrap">
              <button
                className="iconToggle"
                title="Theme & file actions"
                onClick={(e)=>{
                  const menu = e.currentTarget.nextSibling;
                  menu.classList.toggle("open");
                }}
              >
                <ThemeIcon />
              </button>
              <div
                className="compactMenu"
                onMouseLeave={(e)=>e.currentTarget.classList.remove("open")}
              >
                <div className="row">
                  <select
                    className="select"
                    defaultValue="__none__"
                    aria-label="Apply preset theme"
                    onChange={e=>{
                      const id = e.target.value;
                      if (id === "__none__") return;
                      setMap(prev => applyTheme(prev, layout, id));
                    }}
                  >
                    <option value="__none__">Apply preset theme…</option>
                    {(() => {
                      const byCat = THEMES.reduce((acc, t) => {
                        const k = t.cat || "Other";
                        (acc[k] ||= []).push(t);
                        return acc;
                      }, {});
                      Object.values(byCat).forEach(arr =>
                        arr.sort((a,b) => a.name.localeCompare(b.name))
                      );
                      const order = ["Core", "Controllers", "Games", "Color Vision", "Other"];
                      const orderedCats = [
                        ...order.filter(k => byCat[k]),
                        ...Object.keys(byCat).filter(k => !order.includes(k)),
                      ];
                      return orderedCats.map(cat => (
                        <optgroup key={cat} label={cat}>
                          {byCat[cat].map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>

                <div className="row">
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
                    <SaveIcon />&nbsp; Save Theme JSON
                  </button>
                </div>

                <div className="row">
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
                    <FolderIcon />&nbsp; Load Theme JSON
                  </button>
                </div>
                {/* Profile management removed in theme menu per user request */}

                {/* Print options removed in theme menu to avoid duplication */}

                {/* Export/import/share removed per user request */}

                <div className="row">
                  <button className="btn" onClick={(e)=>e.currentTarget.closest(".compactMenu").classList.remove("open")}> 
                    Close
                  </button>
                </div>
              </div>
            </div>

            {/* Save images */}
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
                Save <span style={{ marginLeft: 8 }}>▾</span>
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

            {/* Zoom + Reset */}
            <button className="iconToggle" title="Zoom Out" onClick={()=>setZoom(z=>Math.max(0.4, +(z-0.1).toFixed(2)))}><ZoomOutIcon /></button>
            <button className="iconToggle" title="Zoom In"  onClick={()=>setZoom(z=>Math.min(2,   +(z+0.1).toFixed(2)))}><ZoomInIcon /></button>

            <button
              className="btn iconLabel"
              onClick={()=>{
                const next = LAYOUTS[profile] || FALLBACK.positions;
                setLayout({ ...next });
                setMap(defaultKeymapForLayout(next));
                setSelection([]); setShowPopover(false); setMenu(null);
              }}
            >
              <ResetIcon size={16} />
              <span>Reset Layout</span>
            </button>
          </div>

        </div>
      </div>
      )}

      {/* Mapper */}
      <div className="canvasWrap" ref={containerRef}>
        <div
          className="panel"
          style={{ position:"relative" }}
        >
          {/* Mobile legend bar: when groups are defined on mobile, show a horizontal legend
              banner across the top of the stage area. This sits below the header and
              above the map so it never overlaps keys. */}
          {isMobile && groupLegend.length > 0 && (
            <div className="legendBar">
              <div className="legendTitle" style={{ marginRight: 8 }}>Groups</div>
              <div className="legendRow">
                {groupLegend.map(([g, cols]) => {
                  const color = cols.length ? cols[0] : '#888';
                  return (
                    <div key={g} className="legendItem">
                      <div className="legendDot" style={{ background: color }} />
                      <div className="legendText">{g}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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

          <div
  className="stageBox"
  ref={stageBoxRef}
  /* Desktop: no scrollbars. Mobile: scroll/pinch container. */
  style={{
    width: stageW,
    height: stageH,
    overflow: isMobile ? "auto" : "hidden",
    WebkitOverflowScrolling: isMobile ? "touch" : "auto"
  }}
>
  <div
    id="stage-root"
    ref={setStageEl}
    className="stage"
    style={{
      width: CANVAS_W,
      height: CANVAS_H,
      transform: `scale(${displayZoom})`,
      transformOrigin: "top left",
      position: "relative"
    }}
    /* Desktop uses mouse events; mobile uses pointer for pan/pinch */
    onPointerDown={(e) => {
      if (e.button !== 0 && e.pointerType !== "touch") return;
      if (e.target.id === "stage-root") {
        if (multi) { beginLasso(e); }
        else { setSelection([]); setShowPopover(false); setMenu(null); }
      }
    }}
  >
    {lasso && (
      <div
        style={{
          position:"absolute",
          left: lasso.x, top: lasso.y,
          width: lasso.w, height: lasso.h,
          border:"1px dashed rgba(124,92,255,.9)",
          background:"rgba(124,92,255,.15)",
          borderRadius:6,
          pointerEvents:"none",
          zIndex:5
        }}
      />
    )}

    {/* blanks */}
    {Object.entries(layout).filter(([_,p])=>p.blank).map(([id,pos])=>(
      <div key={id} className="blank" style={{ left:pos.x, top:pos.y }} />
    ))}

    {/* split wheel */}
    {layout["MW"] && (
      <SplitWheel
        x={layout["MW"].x}
        y={layout["MW"].y}
        up={map["MU"]}
        down={map["MD"]}
        gloss={gloss}
        onPick={onPick}
        showNumbers={showNumbers}
      />
    )}

    {/* keys */}
    {Object.entries(layout).map(([id, pos]) => {
      if (pos.blank || pos.analog || pos.split) return null;
      return (
        <KeyTile
          key={id}
          id={id}
          data={{ ...map[id], color: colorFor(id) }}
          x={pos.x}
          y={pos.y}
          gloss={gloss}
          showNumbers={showNumbers}
          selected={selection.includes(id)}
          selection={selection.length ? selection : [id]}
          draggable={!locked}
          zoom={displayZoom}
          onPick={onPick}
          onDrag={(ids, nx, ny) => dragTo(ids, nx, ny)}
          onContext={(e) => openMenu(e, id)}
        />
      );
    })}

    {/* analog */}
    {layout["ANALOG"] && (
      <AnalogStick x={layout["ANALOG"].x} y={layout["ANALOG"].y} />
    )}

    {/* Edit popover */}
    {lastSelected && showPopover && pop && (
      <div
        className={`popover ${pop.side}`}
        style={{
          left:pop.x, top:pop.y, width:pop.w, height:pop.h,
          position:"absolute", borderRadius:14,
          background:"rgba(15,20,42,.90)", backdropFilter:"blur(6px)",
          border:"1px solid rgba(255,255,255,.08)",
          boxShadow:"0 10px 28px rgba(0,0,0,.35)",
          display:"flex", flexDirection:"column"
        }}
        onMouseDown={(e)=>e.stopPropagation()}
      >
        <div className="popHeader" style={{
          padding:"10px 12px",
          borderBottom:"1px solid rgba(255,255,255,.06)",
          display:"flex", justifyContent:"space-between", alignItems:"center"
        }}>
          <span>Selected {selection.length>1 ? `${selection.length} keys` : `#${lastSelected}`}</span>
          <button className="iconBtn" onClick={()=>{ setSelection([]); setShowPopover(false); }} aria-label="Close">✕</button>
        </div>

        <div style={{ padding:12 }}>
          <div className="row">
            <label>Label</label>
            <input className="input" value={active.label||""} onChange={e=>setField("label", e.target.value)} />
          </div>

          <div className="row">
            <label>Sub</label>
            <input className="input" value={active.sub||""} onChange={e=>setField("sub", e.target.value)} />
          </div>

          {/* Group field for assigning a zone/group to this key. Only shown on desktop (mobile uses quick group assignment). */}
          <div className="row">
            <label>Group</label>
            <input
              className="input"
              value={active.group || ''}
              onChange={e => setField('group', e.target.value)}
            />
          </div>

          <div className="row">
            <label>Emoji</label>
            <button
              ref={emojiButtonRef}
              className="btn"
              style={{ padding:"6px 10px", display:"inline-flex", alignItems:"center", gap:8 }}
              onClick={()=>setEmojiOpen(v=>!v)}
            >
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
            <input
              type="color"
              className="colorPicker"
              value={normalizeHex(active.color||BASE.blue)}
              onChange={e=>setField("color", e.target.value)}
              /* enlarge swatch for better visibility */
              style={{ width: 72, height: 42, padding: 2, borderRadius: 8, border: '2px solid #e7e9f6', background: '#fff' }}
            />
            <label
              htmlFor="img-upload"
              className="iconBtn"
              title="Upload image"
              style={{ cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}
            >
              <ImageIcon />
            </label>
            <input
              id="img-upload"
              type="file"
              accept="image/*"
              style={{ display:"none" }}
              onChange={async (e)=>{
                const f=e.target.files?.[0]; if(!f) return;
                const url = await new Promise(r=>{ const rd=new FileReader(); rd.onload=()=>r(rd.result); rd.readAsDataURL(f); });
                setField("image", url); e.target.value = "";
              }}
            />
          </div>

          <div className="row">
            <label>Image Mode</label>
            <div style={{ display:"flex", gap:8, width:"100%" }}>
              <button
                className={`btn ${active.imageMode!=="cover"?"primary":""}`}
                onClick={()=>setField("imageMode","icon")}
                style={{ flex: 1 }}
              >Icon</button>
              <button
                className={`btn ${active.imageMode==="cover"?"primary":""}`}
                onClick={()=>setField("imageMode","cover")}
                style={{ flex: 1 }}
              >Cover</button>
            </div>
          </div>
          {/* Show clear image only if an image is currently assigned */}
          {active?.image && (
            <div className="row">
              <label>Clear Image</label>
              <button className="btn" onClick={()=>{ setField("image", null); setField("imageMode","icon"); }}>Remove</button>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Right click menu (desktop) / Bottom sheet (mobile) */}
{menu && (
  isMobile ? (
    <BottomSheet open={!!menu} onClose={() => setMenu(null)}>
      <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>Key actions</div>
        <button className="btn" onClick={() => doCopy()}>Copy</button>
        <button className="btn" onClick={() => doPaste({label:true})}>Paste Label</button>
        <button className="btn" onClick={() => doPaste({sub:true})}>Paste Sub</button>
        <button className="btn" onClick={() => doPaste({emoji:true})}>Paste Emoji</button>
        <button className="btn" onClick={() => doPaste({color:true})}>Paste Color</button>
        <button className="btn" onClick={() => doPaste({image:true})}>Paste Image</button>
        <button className="btn primary" onClick={() => doPaste({label:true,sub:true,emoji:true,color:true,image:true,group:true})}>Paste All</button>
        <button className="btn" onClick={() => setMenu(null)}>Close</button>
      </div>
    </BottomSheet>
  ) : createPortal(
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
        <button className="btn" onClick={()=>doPaste({label:true,sub:true,emoji:true,color:true,image:true,group:true})} style={{ padding:"4px 8px", fontSize:12 }}>Paste All</button>
      </div>
    </div>,
    document.body
  )
)}


    <canvas ref={canvasRef} style={{ display:"none" }} />

    {/* Group legend overlay */}
    {groupLegend.length > 0 && (
      isMobile
        ? null /* mobile legend will render above the stage */
        : (stageBoxRef.current && createPortal(
            <div className="legendUI" style={{ left: 'auto', right: 12, top: 'auto', bottom: 12 }}>
              <div className="legendTitle">Groups</div>
              {groupLegend.map(([g, cols]) => {
                const color = cols.length ? cols[0] : '#888';
                return (
                  <div key={g} className="legendItem">
                    <div className="legendDot" style={{ background: color }} />
                    <div className="legendText">{g}</div>
                  </div>
                );
              })}
            </div>, stageBoxRef.current)
          )
    )}
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
  id,
  data,
  x,
  y,
  selected,
  selection,
  gloss,
  showNumbers,
  draggable,
  zoom,
  onPick,
  onDrag,
  onContext,
}) {
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

  const flatBg = normalizeHex(data?.color || BASE.blue);
  const pair = textPair(flatBg);

  const mergedStyle = gloss
    ? { left:x, top:y, "--key": flatBg }
    : { left:x, top:y, background: flatBg, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.06), 0 12px 26px rgba(0,0,0,.45)" };

  const labelSize = data?.label ? (data.label.length > 30 ? 14 : data.label.length > 22 ? 16 : 18) : 18;
  const subSize   = data?.sub   ? (data.sub.length   > 28 ? 13 : data.sub.length   > 20 ? 14 : 16) : 16;

  return (
    <div
      ref={ref}
      className={`key ${gloss ? 'gloss' : ''} ${selected ? 'selected' : ''}`}
      style={mergedStyle}
      // Use pointer events to select keys on both mobile and desktop. Only respond to
      // primary pointer (mouse or touch).
      onPointerDown={(e) => {
        if (e.button === 0 || e.pointerType === 'touch') {
          onPick(id, e);
        }
      }}
      onContextMenu={(e) => onContext?.(e, id)}
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

      {data?.emoji ? <div className="emoji" style={{ zIndex:2, color: pair.label }}>{data.emoji}</div> : null}

      <div
        className="label"
        style={{
          zIndex:2,
          color: pair.label,
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
          color: pair.sub,
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

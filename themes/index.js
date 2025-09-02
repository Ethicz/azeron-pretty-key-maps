// Row keys for 6 visual rows (we’ll map by sorted Y positions)
export const ROWS = ["R1","R2","R3","R4","R5","R6"];

export const defaultRowPalette = {
  R1: "#1e88e5", // blue
  R2: "#43a047", // green
  R3: "#ef6c00", // orange
  R4: "#8e24aa", // violet
  R5: "#f9a825", // yellow
  R6: "#d32f2f", // red
};

export function deriveMonochromePalette(hexBase = "#8e8e94") {
  const steps = [-18, -9, 0, 6, 12, 18];
  return Object.fromEntries(ROWS.map((r, i) => [r, adjustLightness(hexBase, steps[i])]));
}

function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function hexToRgb(c){ const s = c.replace("#",""); return { r:parseInt(s.slice(0,2),16), g:parseInt(s.slice(2,4),16), b:parseInt(s.slice(4,6),16) }; }
function toHex(n){ return n.toString(16).padStart(2, "0"); }
function rgbToHex({r,g,b}){ return `#${toHex(r)}${toHex(g)}${toHex(b)}`; }

function adjustLightness(hex, delta){
  const { r,g,b } = hexToRgb(hex);
  const k = delta / 100;
  const rr = clamp(Math.round(r + (255 - r) * Math.max(0,k) + r * Math.min(0,k)), 0, 255);
  const gg = clamp(Math.round(g + (255 - g) * Math.max(0,k) + g * Math.min(0,k)), 0, 255);
  const bb = clamp(Math.round(b + (255 - b) * Math.max(0,k) + b * Math.min(0,k)), 0, 255);
  return rgbToHex({ r: rr, g: gg, b: bb });
}

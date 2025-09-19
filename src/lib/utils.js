
// Luminance helper
export function luminance(hex) {
  const c = hex.replace('#','');
  const r = parseInt(c.slice(0,2),16)/255;
  const g = parseInt(c.slice(2,4),16)/255;
  const b = parseInt(c.slice(4,6),16)/255;
  const arr = [r,g,b].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*arr[0] + 0.7152*arr[1] + 0.0722*arr[2];
}
export function isLight(hex) { return luminance(hex) > 0.5; }
export function lightenColor(hex, amt) {
  const n = (c) => Math.max(0, Math.min(255, c + Math.round(255*amt/100)));
  const c = hex.replace('#','');
  const r = n(parseInt(c.slice(0,2),16));
  const g = n(parseInt(c.slice(2,4),16));
  const b = n(parseInt(c.slice(4,6),16));
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}
export function download(name, dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = name; a.click();
}

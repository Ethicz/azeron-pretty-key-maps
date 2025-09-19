// src/lib/exportImage.js
import * as htmlToImage from 'html-to-image';

/**
 * Capture a DOM node to a PNG and download it.
 * @param {HTMLElement} node
 * @param {{fileName:string, scale?:number, bg?:string}} opts
 */
export async function downloadPNG(node, { fileName, scale = 3, bg } = {}) {
  if (!node) throw new Error('No node to capture');
  const dataUrl = await htmlToImage.toPng(node, {
    pixelRatio: scale,
    backgroundColor: bg // undefined => transparent
  });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName || 'layout.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

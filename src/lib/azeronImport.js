// src/lib/azeronImport.js
// Universal Azeron importer → writes labels to your store by layout key id.
// Robust to “wrong rows” by mapping PHYSICAL first: pinOne → layout key id via PIN_TO_ID.
// Falls back to identity mapping if no override. Wheel is split to MW_UP/MW_DOWN.
// No game-specific presets.

import { currentLayout } from '../layouts/index.js';
import { useStore } from './store.jsx';

/* ------------------------- per-layout physical pin → visual id ------------------------- */
/**
 * For Cyro, your visual ids ("1","2","3","4", … "28","29","20","31", etc.) do not
 * match Azeron physical pins. This map aligns pins to the tiles you actually want
 * labeled. Derived from your uploaded profile JSON.
 *
 * Examples from your data:
 *  - input 28 has pinOne 19  ⇒ pin 19 → "28"
 *  - input 29 has pinOne 18  ⇒ pin 18 → "29"
 *  - input 6  has pinOne 1   ⇒ pin  1 → "6"
 *  - input 7  has pinOne 2   ⇒ pin  2 → "7"
 *  - input 8  has pinOne 3   ⇒ pin  3 → "8"
 *  - input 1  has pinOne 4   ⇒ pin  4 → "1"
 *  - input 2  has pinOne 5   ⇒ pin  5 → "2"
 *  - input 3  has pinOne 6   ⇒ pin  6 → "3"
 *  - input 4  has pinOne 7   ⇒ pin  7 → "4"
 *  - input 15 has pinOne 8   ⇒ pin  8 → "15"
 *  - input 14 has pinOne 9   ⇒ pin  9 → "14"
 *  - input 9  has pinOne 10  ⇒ pin 10 → "9"
 *  - input 10 has pinOne 11  ⇒ pin 11 → "10"
 *  - input 17 has pinOne 12  ⇒ pin 12 → "17"
 *  - input 16 has pinOne 13  ⇒ pin 13 → "16"
 *  - input 12 has pinOne 14  ⇒ pin 14 → "12"
 *  - input 11 has pinOne 15  ⇒ pin 15 → "11"
 *  - input 20 has pinOne 20  ⇒ pin 20 → "20"
 *  - input 22 has pinOne 22  ⇒ pin 22 → "22"
 *
 * Anything not listed falls back to the identity mapping: pin N → id "N" (only if that id exists in the layout).
 */
const PIN_TO_ID = {
  cyro: {
    1:  "6",
    2:  "7",
    3:  "8",
    4:  "1",
    5:  "2",
    6:  "3",
    7:  "4",
    8:  "15",
    9:  "14",
    10: "9",
    11: "10",
    12: "17",
    13: "16",
    14: "12",
    15: "11",
    18: "29",
    19: "28",
    20: "20",
    22: "22",
    // You can add more here if you discover pins we haven’t seen yet.
  }
};

/* ------------------------- keycode helpers (for pretty fallback labels) ------------------------- */

const VK = (() => {
  const m = {
    9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 27: 'Esc',
    32: 'Space', 33: 'PageUp', 34: 'PageDown', 35: 'End', 36: 'Home',
    37: 'Left', 38: 'Up', 39: 'Right', 40: 'Down', 45: 'Insert', 46: 'Delete',
    186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/',
    219: '[', 220: '\\', 221: ']', 222: "'",
  };
  for (let c = 65; c <= 90; c++) m[c] = String.fromCharCode(c);      // A–Z
  for (let c = 48; c <= 57; c++) m[c] = String.fromCharCode(c);      // 0–9
  for (let c = 112, i = 1; c <= 123; c++, i++) m[c] = `F${i}`;       // F1–F12
  for (let c = 96, i = 0; c <= 105; c++, i++) m[c] = `Num${i}`;      // Numpad
  return m;
})();
const MOUSE = { 1: 'Mouse1', 2: 'Mouse2', 3: 'Mouse3', 4: 'Mouse4', 5: 'Mouse5' };
const MOD  = { 16: 'Shift', 17: 'Ctrl', 18: 'Alt' };

function codeToKey(code, typeHint) {
  if (!code) return '';
  const n = Number(code);
  if (typeHint === 'mouse' || MOUSE[n]) return MOUSE[n] || `Mouse(${n})`;
  return VK[n] || `VK(${n})`;
}
function compose(mod, base, typeHint) {
  const modName = MOD[Number(mod)] || '';
  const baseName = codeToKey(base, typeHint);
  if (modName && baseName) return `${modName}+${baseName}`;
  return modName || baseName || '';
}

/* ------------------------- parser ------------------------- */
/**
 * Parse a single Azeron profile into:
 *   {
 *     profileName: string,
 *     byId:  { [input.id]: { label, output, type, pinOne } },
 *     byPin: { [pinOne]:    { label, output, type, pinOne } },
 *     analog?: { ... } // summarized stick data (not labeled onto a tile)
 *   }
 */
export function buildLabelsFromAzeron(json, chosenProfileName) {
  const profiles = json?.profiles || [];
  const profile = profiles.find(p => p.name === chosenProfileName) || profiles[0];
  if (!profile) throw new Error('No profiles found in JSON');

  const out = { profileName: profile.name, byId: {}, byPin: {}, analog: null };

  for (const input of (profile.inputs || [])) {
    const type0 = String(input.types?.[0] || '');
    const isMouse = type0 === '15';
    const isAnalog = type0 === '36';

    if (isAnalog) {
      const a = input.analogSettings || {};
      const k = a.analogKeys || {};
      const L = k.left || {}, R = k.right || {};
      const toName = (arr) => compose(0, arr?.[0], 'key');
      out.analog = {
        id: input.id,
        pinOne: input.pinOne,
        directions: {
          up:    toName(L.up)    || toName(R.up)    || '',
          right: toName(L.right) || toName(R.right) || '',
          down:  toName(L.down)  || toName(R.down)  || '',
          left:  toName(L.left)  || toName(R.left)  || '',
        },
        angle: a.angle ?? null,
        cones: a.analogCones || null,
      };
      continue;
    }

    const base   = input.keyValues?.[0] || 0;   // tap action (short press)
    const mod    = input.metaValues?.[0] || 0;
    const output = compose(mod, base, isMouse ? 'mouse' : 'key');
    const label  = (input.label && String(input.label).trim()) || output || `Input ${input.id}`;
    const datum  = { label, output, type: isMouse ? 'mouse' : 'key', pinOne: input.pinOne };

    out.byId[input.id] = datum;
    if (Number.isInteger(input.pinOne)) out.byPin[input.pinOne] = datum;
  }

  return out;
}

/* ------------------------- applier ------------------------- */
/**
 * Apply labels onto the active layout IDs used by the canvas.
 * Strategy:
 *   1) PRIMARY: physical mapping by pinOne → PIN_TO_ID[layout][pin] (or identity).
 *   2) FALLBACK: fill any remaining by input.id → same-number id (only if valid).
 *   3) WHEEL: detect “Mouse Wheel Up/Down” in labels and place onto MW_UP/MW_DOWN.
 *   4) SKIP: blanks and analog tiles never get labels.
 */
export function applyAzeronProfile(json, chosenProfileName, layoutId = (useStore.getState().device || 'cyro')) {
  const labels = buildLabelsFromAzeron(json, chosenProfileName);
  const def = currentLayout(layoutId);  // normalized layout with keys and ids

  // Valid target ids for this layout (skip blanks & analog)
  const validIds = new Set(
    (def.keys || [])
      .filter(k => !k.blank && !k.analog)
      .map(k => String(k.id))
  );

  // Wheel halves (your BoardCanvas reads these state keys)
  const st = useStore.getState();
  const MW_UP_ID   = String(st?.mwUpId   || 'MW_UP');
  const MW_DOWN_ID = String(st?.mwDownId || 'MW_DOWN');

  const pinMap = PIN_TO_ID[layoutId] || {};
  const patch = {};

  // 1) Primary: physical mapping by pinOne using PIN_TO_ID (or identity fallback)
  for (const [pinStr, datum] of Object.entries(labels.byPin || {})) {
    const pin = Number(pinStr);
    const targetId = String(pinMap[pin] || pin);  // default identity if not overridden
    if (validIds.has(targetId)) {
      patch[targetId] = { ...(patch[targetId] || {}), label: datum.label };
    }
  }

  // 2) Fallback: fill gaps by input.id -> same-number id (only if not set by pin mapping)
  for (const [idStr, datum] of Object.entries(labels.byId || {})) {
    const targetId = String(Number(idStr));
    if (!patch[targetId] && validIds.has(targetId)) {
      patch[targetId] = { ...(patch[targetId] || {}), label: datum.label };
    }
  }

  // 3) Wheel split
  const isWheelUp   = (s) => /\b(mouse\s*wheel\s*up|mw\s*up)\b/i.test(s || '');
  const isWheelDown = (s) => /\b(mouse\s*wheel\s*down|mw\s*down)\b/i.test(s || '');
  for (const [, datum] of Object.entries(labels.byId || {})) {
    if (isWheelUp(datum.label)   && validIds.has(MW_UP_ID))
      patch[MW_UP_ID] = { ...(patch[MW_UP_ID] || {}), label: datum.label };
    if (isWheelDown(datum.label) && validIds.has(MW_DOWN_ID))
      patch[MW_DOWN_ID] = { ...(patch[MW_DOWN_ID] || {}), label: datum.label };
  }

  // Determine which ids exist for this layout (skip blanks & analog)
  // We'll mark keys that are not patched as unassigned so the UI can
  // render them distinctly. We don't want to clobber any user-defined
  // labels/emoji/icons on those keys, so we only mark unassigned when
  // there is no existing label or media on the key.
  const currentKD = useStore.getState().keyData || {};
  for (const id of validIds) {
    const idStr = String(id);
    // If this id wasn't assigned a label above, it's unassigned.
    if (!patch[idStr]) {
      const existing = currentKD[idStr] || {};
      const hasContent = !!(existing.label || existing.subtitle || existing.emoji || existing.icon || existing.imageUrl);
      if (!hasContent) {
        patch[idStr] = { ...(patch[idStr] || {}), unassigned: true };
      }
    } else {
      // Ensure previously unassigned flags are cleared on assigned keys
      patch[idStr] = { ...(patch[idStr] || {}), unassigned: false };
    }
  }

  // 4) Commit → BoardCanvas merges by id and renders (that’s already how your app works)
  useStore.setState(s => ({ keyData: { ...(s.keyData || {}), ...patch } }));

  return { profileName: labels.profileName, patch };
}

/* ------------------------- convenience: pure transform ------------------------- */
export function toKeyData(json, chosenProfileName, layoutId = (useStore.getState().device || 'cyro')) {
  const { patch } = applyAzeronProfile(json, chosenProfileName, layoutId);
  return patch;
}

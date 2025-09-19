import cyro from './cyro.js';
import classic from './classic.js';
import compact from './compact.js';
import cyborg from './cyborg.js';
import keyzen from './keyzen.js';

export const LAYOUTS = {
  [cyro.id]: cyro,
  [classic.id]: classic,
  [compact.id]: compact,
  [cyborg.id]: cyborg,
  [keyzen.id]: keyzen
};

/**
 *
 * @param {object} def Raw layout definition
 * @returns {object} Normalised layout
 */
function normalize(def) {
  // Provide dimensions so BoardCanvas has w/h even if the layout didn’t specify them.
  const DEF_W = 100, DEF_H = 140;
  const ANALOG_W = 240, ANALOG_H = 280;

  const keys = Object.entries(def.positions || {}).map(([id, pos]) => {
    const analog = !!pos.analog;
    const w = Number.isFinite(pos.w) ? pos.w : (analog ? ANALOG_W : DEF_W);
    const h = Number.isFinite(pos.h) ? pos.h : (analog ? ANALOG_H : DEF_H);
    const num = Number.isFinite(+id) ? +id : null;

    return {
      // identity
      id,
      num,

      // placement
      x: pos.x || 0,
      y: pos.y || 0,
      w,
      h,

      // flags
      analog,
      split: !!pos.split,
      blank: !!pos.blank,

      // optional presentation fields (passed through if present)
      label: pos.label || '',
      subtitle: pos.subtitle || '',
      color: pos.color || null,
      zone: pos.zone || '',
      imageUrl: pos.imageUrl || '',
      imageMode: pos.imageMode || 'cover',
      emoji: pos.emoji || '',
      icon: pos.icon || ''
    };
  });

  return { id: def.id, name: def.name, keys };
}

/**
 * Retrieve the current layout by identifier. If the id is unknown
 * fallback to the first layout in the registry. The returned object
 * contains an array of key objects describing positions and flags.
 *
 * @param {string} id Layout identifier
 */
export function currentLayout(id = cyro.id) {
  const def = LAYOUTS[id] || cyro;
  return normalize(def);
}

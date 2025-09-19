// Mapping of icon names used in the v5 prototype to fallback emoji glyphs.
// The original v5 project depended on the `rpg-awesome` icon font to draw
// fantasy‑themed glyphs. That font is not available in this combined
// version so we instead map each identifier to a representative
// unicode emoji. If you wish to replace these with your own artwork or
// integrate an icon library you can adjust the values here. The keys
// correspond to the names used in the v5 source and the values are
// strings rendered inside the key tiles.

export const ICONS = [
  'sword', 'shield', 'potion-bottle', 'magic-swirl', 'dragon', 'archer',
  'bomb', 'book', 'anvil', 'gem', 'health', 'double-team',
  'crossed-swords', 'ship-emblem', 'feather-wing', 'bleeding-eye',
  'three-keys', 'wizard-staff', 'arrows-cardinal', 'targeting'
];

export const ICON_EMOJI_MAP = {
  'sword': '🗡️',
  'shield': '🛡️',
  'potion-bottle': '🧪',
  'magic-swirl': '✨',
  'dragon': '🐉',
  'archer': '🏹',
  'bomb': '💣',
  'book': '📖',
  'anvil': '⚒️',
  'gem': '💎',
  'health': '❤️',
  'double-team': '👥',
  'crossed-swords': '⚔️',
  'ship-emblem': '🚢',
  'feather-wing': '🪶',
  'bleeding-eye': '👁️',
  'three-keys': '🔑🔑🔑',
  'wizard-staff': '🪄',
  'arrows-cardinal': '↕️',
  'targeting': '🎯'
};
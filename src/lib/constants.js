// src/lib/constants.js
// Shared constants extracted from multiple components to ensure single source of truth

import { BASE } from './themes.js';

// Default color palette when no theme is selected
export const DEFAULT_RAINBOW = [
  BASE.red, BASE.orange, BASE.yellow, BASE.green,
  BASE.teal, BASE.blue, BASE.indigo, BASE.violet
];

// Placeholder labels for keys when user hasn't set a custom label
export const PLACEHOLDERS = [
  'Move Forward', 'Move Left', 'Move Back', 'Move Right', 'Jump', 'Crouch', 'Sprint', 'Walk Toggle',
  'Primary Fire', 'Secondary Fire', 'Aim / ADS', 'Reload', 'Melee', 'Use / Interact', 'Ping / Marker', 'Holster',
  'Prev Weapon', 'Next Weapon', 'Switch Weapon', 'Grenade',
  'Ability 1', 'Ability 2', 'Ability 3', 'Ultimate', 'Quick Slot 1', 'Quick Slot 2', 'Quick Slot 3', 'Quick Slot 4',
  'Inventory', 'Map', 'Quest / Journal', 'Skills', 'Build / Craft', 'Photo Mode', 'Toggle Camera', 'Scoreboard',
  'Push-to-Talk', 'Team Chat', 'Emote', 'Wheel / Radial', 'Prone', 'Slide / Dodge', 'Roll', 'Parry / Block',
  'Cast Spell', 'Mount / Vehicle', 'Lean Left', 'Lean Right', 'Pause / Menu', 'Settings'
];

// Layout dimensions
export const GRID_STEP = 20;
export const DEFAULT_KEY_W = 100;
export const DEFAULT_KEY_H = 140;
export const ANALOG_W = 240;
export const ANALOG_H = 280;

// History limits
export const MAX_HISTORY = 50;

// Auto-save configuration
export const STORAGE_KEY = 'azeron-keymap-autosave';
export const AUTOSAVE_DEBOUNCE_MS = 1000;

// Label fitting heuristics
export const AVG_CHAR_WIDTH = 0.58; // em/char heuristic for label fitting

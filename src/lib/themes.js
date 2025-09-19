// Preset colour themes and base palette for the Azeron key mapper.
// These definitions were derived from a previous version of the app and
// allow users to quickly apply cohesive colour schemes to their key
// layouts. Each theme lists six comma-separated hex codes for the
// primary colours. When applied, the colours will be assigned in
// sequence across the keys.

export const BASE = {
  red: '#D21C2A',
  orange: '#E26F25',
  yellow: '#E5A92F',
  green: '#169447',
  teal: '#1CB2A6',
  blue: '#2F5EE0',
  indigo: '#444BE0',
  violet: '#A247E6',
  gray: '#495064'
};

export const THEMES = [
  { id: 'soft_pastel', name: 'Soft Pastel', cat: 'Core', keys: '#9AD5FF,#B8E1FF,#D8F0FF,#C8FFD9,#FFE6A7,#FFC3C3' },
  { id: 'midnight', name: 'Midnight', cat: 'Core', keys: '#4A65FF,#3FC4FF,#28E0A5,#FFC857,#FF5E5B,#A28CFF' },
  { id: 'mono_ink', name: 'Mono Ink', cat: 'Core', keys: '#9FA7B8,#C8CFDC,#6B7385,#B0B9CC,#8892A8,#DDE3F2' },
  { id: 'xbox_vibes', name: 'Xbox Vibes', cat: 'Controllers', keys: '#107C10,#3CDB4E,#D04242,#40CCD0,#ECDB33,#3A3A3A' },
  { id: 'ps_vibes', name: 'PlayStation Vibes', cat: 'Controllers', keys: '#00A74F,#D22630,#0072CE,#D82882,#1F1F1F,#FFFFFF' },
  { id: 'switch_neon', name: 'Switch Neon', cat: 'Controllers', keys: '#0AB9E6,#FF3C28,#828282,#0F0F0F,#E6FF00,#1EDC00' },
  { id: 'halo_master_chief', name: 'Halo Master Chief', cat: 'Games', keys: '#84926A,#EFB82A,#4C4A45,#CDCFCC,#2C2E2A,#1B1B1B' },
  { id: 'persona5', name: 'Persona 5', cat: 'Games', keys: '#0D0D0D,#D92323,#732424,#8C6723,#F2E852,#FFFFFF' },
  { id: 'cyberpunk_neon', name: 'Cyberpunk Neon', cat: 'Games', keys: '#02D7F2,#F2E900,#007AFF,#EA00D9,#133E7C,#091833' },
  { id: 'zelda_hyrule', name: 'Zelda Hyrule', cat: 'Games', keys: '#0A2E36,#F2D492,#8DA399,#C46F3E,#B22C1B,#D4AF7F' },
  { id: 'mario_classic', name: 'Mario Classic', cat: 'Games', keys: '#E60012,#3B82F6,#FFD500,#8B4513,#FFFFFF,#000000' },
  { id: 'sonic_speed', name: 'Sonic', cat: 'Games', keys: '#0055FF,#F4FF00,#FFFFFF,#000000,#FF6600,#00B3FF' },
  { id: 'portal_test', name: 'Portal', cat: 'Games', keys: '#0088CC,#FF6600,#222222,#DDDDDD,#99D6FF,#FFB380' },
  { id: 'minecraft_over', name: 'Minecraft Overworld', cat: 'Games', keys: '#67B22F,#BFAE92,#523F2E,#F2E08B,#8C764A,#4F6B3A' },
  { id: 'overwatch_ui', name: 'Overwatch UI', cat: 'Games', keys: '#F6BA2D,#34B3E4,#E84C3D,#FFFFFF,#1D1D1D,#8D8D8D' },
  { id: 'tetris_blocks', name: 'Tetris Blocks', cat: 'Games', keys: '#00FFFF,#0000FF,#FF0000,#FFFF00,#FF8000,#008000' },
  { id: 'splatoon_ink', name: 'Splatoon Ink', cat: 'Games', keys: '#FF00BB,#00FF7F,#7D00FF,#00E5FF,#FFE600,#111111' },
  { id: 'metroid_varia', name: 'Metroid Varia', cat: 'Games', keys: '#F26D1F,#00D1B2,#3F3F46,#A2A2A2,#0E7490,#F2F2F2' },
  { id: 'hollow_knight', name: 'Hollow Knight', cat: 'Games', keys: '#0C1A24,#3AA0C8,#6EC1E4,#E6F1F4,#384B59,#FFFFFF' },
  { id: 'cb_okabe_ito', name: 'Colorblind Okabe Ito', cat: 'Color Vision', keys: '#E69F00,#56B4E9,#009E73,#F0E442,#0072B2,#CC79A7' },
  { id: 'cb_tol_bright', name: 'Colorblind Tol Bright', cat: 'Color Vision', keys: '#4477AA,#66CCEE,#228833,#CCBB44,#EE6677,#AA3377' },
  { id: 'cb_tol_muted', name: 'Colorblind Tol Muted', cat: 'Color Vision', keys: '#332288,#88CCEE,#44AA99,#117733,#999933,#DDCC77' },
  { id: 'cb_deuter', name: 'Deuteranopia High Contrast', cat: 'Color Vision', keys: '#000000,#FFFFFF,#0072B2,#E69F00,#56B4E9,#CC79A7' },
  { id: 'cb_protan', name: 'Protanopia High Contrast', cat: 'Color Vision', keys: '#000000,#FFFFFF,#0072B2,#E69F00,#56B4E9,#009E73' },
  { id: 'cb_tritan', name: 'Tritanopia High Contrast', cat: 'Color Vision', keys: '#000000,#FFFFFF,#E69F00,#009E73,#D55E00,#CC79A7' },
  { id: 'cb_achromat', name: 'Achromat High Contrast', cat: 'Color Vision', keys: '#000000,#222222,#555555,#888888,#BBBBBB,#FFFFFF' }
];
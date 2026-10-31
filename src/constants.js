export const WORLD = { w: 1280, h: 720 };

export const DAY_LENGTH = 88;
export const NIGHT_PREP = 4.6;
export const NIGHT_CLEAR_DELAY = 3.2;
export const MAX_HEARTS = 12;
export const TOTAL_NIGHTS = 7;
export const START_COINS = 130;
export const WATER_CAPACITY = 12;

export const CROPS = {
  turnip: {
    id: 'turnip',
    name: 'Turnip',
    cost: 12,
    sell: 32,
    days: 1,
    icon: '#i-turnip',
    color: '#d9b6de',
    blurb: 'Quick, dependable, and sweet in a stew.',
  },
  sunberry: {
    id: 'sunberry',
    name: 'Sunberry',
    cost: 26,
    sell: 78,
    days: 2,
    icon: '#i-sunberry',
    color: '#f0a24d',
    blurb: 'Takes two days. Tastes like a warm afternoon.',
  },
  moonflower: {
    id: 'moonflower',
    name: 'Moonflower',
    cost: 48,
    sell: 180,
    days: 3,
    icon: '#i-moonflower',
    color: '#bde7ff',
    blurb: 'Three days. Blooms only for the patient.',
  },
};

export const TOOLS = [
  { id: 'hoe', name: 'Hoe', icon: '#i-hoe', kind: 'tool', cost: 0, hint: 'till soil' },
  { id: 'water', name: 'Watering Can', icon: '#i-water', kind: 'tool', cost: 0, hint: 'water a plot' },
  { id: 'turnip', name: 'Turnip Seed', icon: '#i-turnip', kind: 'seed', cost: CROPS.turnip.cost, hint: 'plant a turnip' },
  { id: 'sunberry', name: 'Sunberry Seed', icon: '#i-sunberry', kind: 'seed', cost: CROPS.sunberry.cost, hint: 'plant a sunberry' },
  { id: 'moonflower', name: 'Moonflower Seed', icon: '#i-moonflower', kind: 'seed', cost: CROPS.moonflower.cost, hint: 'plant a moonflower' },
];

export const TOWER_TYPES = {
  lantern: {
    id: 'lantern',
    name: 'Sun Lantern',
    icon: '#i-lantern',
    color: '#ffd479',
    glow: 'rgba(255, 212, 121, 0.55)',
    desc: 'Hurls a warm bolt at the furthest shadow in reach.',
    stat: 'Single target · steady damage',
    levels: [
      { cost: 55, dmg: 13, range: 152, cd: 0.82 },
      { cost: 55, dmg: 20, range: 172, cd: 0.68 },
      { cost: 80, dmg: 31, range: 194, cd: 0.54 },
    ],
  },
  frost: {
    id: 'frost',
    name: 'Frost Sprinkler',
    icon: '#i-frost',
    color: '#a8dcff',
    glow: 'rgba(150, 211, 255, 0.55)',
    desc: 'Pulses cold dew around itself, chilling every nearby shadow.',
    stat: 'Area pulse · slows enemies',
    levels: [
      { cost: 70, dmg: 4, range: 116, cd: 0.95, slow: 0.38, slowTime: 1.5 },
      { cost: 60, dmg: 7, range: 136, cd: 0.85, slow: 0.48, slowTime: 1.8 },
      { cost: 85, dmg: 11, range: 158, cd: 0.75, slow: 0.58, slowTime: 2.1 },
    ],
  },
  bramble: {
    id: 'bramble',
    name: 'Bramble Totem',
    icon: '#i-bramble',
    color: '#a6d27e',
    glow: 'rgba(166, 210, 126, 0.5)',
    desc: 'Lobs a thorn seed that bursts in a knot of roots.',
    stat: 'Splash damage · long range',
    levels: [
      { cost: 90, dmg: 32, range: 176, cd: 1.62, splash: 54 },
      { cost: 72, dmg: 52, range: 196, cd: 1.42, splash: 64 },
      { cost: 98, dmg: 82, range: 216, cd: 1.22, splash: 78 },
    ],
  },
};

export const ENEMY_TYPES = {
  shade: {
    id: 'shade',
    name: 'Shade',
    hp: 30,
    speed: 49,
    damage: 1,
    reward: 0,
    radius: 13,
    color: '#2a2245',
  },
  wisp: {
    id: 'wisp',
    name: 'Wisp',
    hp: 22,
    speed: 76,
    damage: 1,
    reward: 0,
    radius: 10,
    color: '#6fd4e8',
  },
  brute: {
    id: 'brute',
    name: 'Hollow Brute',
    hp: 165,
    speed: 31,
    damage: 3,
    reward: 0,
    radius: 19,
    color: '#3c2a3f',
  },
  boss: {
    id: 'boss',
    name: 'The Hollow Stag',
    hp: 1050,
    speed: 23,
    damage: 7,
    reward: 0,
    radius: 30,
    color: '#3a2d56',
  },
};

export const NIGHTS = {
  1: [['shade', 8, 0.9]],
  2: [['shade', 10, 0.78], ['wisp', 3, 1.4]],
  3: [['shade', 12, 0.68], ['wisp', 5, 1.15], ['brute', 1, 5.0]],
  4: [['shade', 13, 0.6], ['wisp', 8, 0.95], ['brute', 2, 4.2]],
  5: [['shade', 16, 0.52], ['wisp', 10, 0.8], ['brute', 3, 3.6]],
  6: [['shade', 18, 0.46], ['wisp', 13, 0.68], ['brute', 4, 3.2]],
  7: [['shade', 20, 0.4], ['wisp', 15, 0.6], ['brute', 5, 2.8], ['boss', 1, 7.0]],
};

export const PATH_WAYPOINTS = [
  [-40, 152],
  [100, 172],
  [242, 141],
  [368, 196],
  [468, 296],
  [592, 330],
  [702, 420],
  [822, 470],
  [950, 440],
  [1032, 375],
  [1092, 337],
];

export const PLOT_LAYOUT = { cols: 5, rows: 4, x: 150, y: 401, size: 54, gap: 8 };
export const FIELD_BOUNDS = {
  x: PLOT_LAYOUT.x - 18,
  y: PLOT_LAYOUT.y - 16,
  w: PLOT_LAYOUT.cols * (PLOT_LAYOUT.size + PLOT_LAYOUT.gap) - PLOT_LAYOUT.gap + 36,
  h: PLOT_LAYOUT.rows * (PLOT_LAYOUT.size + PLOT_LAYOUT.gap) - PLOT_LAYOUT.gap + 32,
};

export const PADS = [
  { x: 250, y: 92 },
  { x: 392, y: 270 },
  { x: 538, y: 236 },
  { x: 706, y: 342 },
  { x: 836, y: 386 },
  { x: 902, y: 523 },
  { x: 754, y: 546 },
  { x: 1038, y: 478 },
];

export const HOUSE = { x: 986, y: 342, doorX: 1092, doorY: 340 };
export const WELL = { x: 562, y: 574, r: 34 };
export const POND = { x: 1004, y: 604, rx: 146, ry: 68 };

export const TREES = [
  { x: 42, y: 120, s: 1.32, kind: 0 },
  { x: 132, y: 54, s: 1.08, kind: 1 },
  { x: 235, y: 78, s: 0.92, kind: 0 },
  { x: 28, y: 255, s: 1.18, kind: 1 },
  { x: 104, y: 332, s: 0.96, kind: 0 },
  { x: 52, y: 448, s: 1.22, kind: 1 },
  { x: 18, y: 624, s: 1.1, kind: 0 },
  { x: 152, y: 682, s: 0.94, kind: 1 },
  { x: 316, y: 694, s: 0.82, kind: 0 },
  { x: 486, y: 700, s: 0.9, kind: 1 },
  { x: 688, y: 702, s: 0.84, kind: 0 },
  { x: 848, y: 698, s: 0.95, kind: 1 },
  { x: 1232, y: 626, s: 1.0, kind: 0 },
  { x: 1244, y: 470, s: 1.1, kind: 1 },
  { x: 1252, y: 282, s: 1.3, kind: 0 },
  { x: 1242, y: 122, s: 1.18, kind: 1 },
  { x: 1138, y: 46, s: 0.86, kind: 0 },
  { x: 846, y: 38, s: 0.8, kind: 1 },
  { x: 632, y: 30, s: 0.88, kind: 0 },
  { x: 456, y: 40, s: 0.76, kind: 1 },
  { x: 340, y: 28, s: 0.9, kind: 0 },
];

export const BUSHES = [
  { x: 116, y: 208, s: 0.9 },
  { x: 306, y: 330, s: 0.7 },
  { x: 64, y: 524, s: 0.8 },
  { x: 526, y: 628, s: 0.72 },
  { x: 640, y: 652, s: 0.8 },
  { x: 924, y: 330, s: 0.6 },
  { x: 1226, y: 374, s: 0.74 },
  { x: 1188, y: 690, s: 0.7 },
  { x: 760, y: 666, s: 0.64 },
  { x: 214, y: 668, s: 0.62 },
];

export const ROCKS = [
  { x: 78, y: 372, s: 0.8 },
  { x: 600, y: 74, s: 0.55 },
  { x: 1130, y: 530, s: 0.7 },
  { x: 500, y: 660, s: 0.5 },
  { x: 890, y: 72, s: 0.5 },
];

export const FLOWERS = [
  [206, 345, '#f2c96a'], [224, 354, '#e88f6f'], [190, 360, '#d8b6e8'],
  [476, 360, '#f2c96a'], [492, 372, '#e88f6f'], [512, 356, '#f5e7a8'],
  [606, 232, '#e88f6f'], [622, 244, '#f2c96a'], [588, 246, '#d8b6e8'],
  [748, 640, '#f2c96a'], [774, 650, '#e88f6f'], [1160, 390, '#f5e7a8'],
  [1184, 402, '#d8b6e8'], [350, 126, '#f2c96a'], [370, 118, '#e88f6f'],
  [66, 560, '#f5e7a8'], [94, 570, '#d8b6e8'],
];

export const STONE_PATCHES = [
  [1116, 396], [1148, 402], [1176, 414], [1052, 408],
];

export function buildWave(night) {
  const groups = NIGHTS[night] || NIGHTS[TOTAL_NIGHTS];
  const list = [];
  groups.forEach(([type, count, interval], gi) => {
    for (let i = 0; i < count; i++) {
      const jitter = (Math.sin(i * 12.9898 + night * 4.1414) * 43758.5453) % 1;
      list.push({
        type,
        t: 3.2 + i * interval + gi * 1.15 + Math.abs(jitter) * 0.35,
      });
    }
  });
  list.sort((a, b) => a.t - b.t);
  return list;
}

export const NIGHT_REWARDS = [0, 62, 82, 104, 128, 156, 190, 260];

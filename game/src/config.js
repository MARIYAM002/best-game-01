// Lumen Reef tuning: every number the game balances on lives here, in one place.
export const STEP = 1 / 60;
export const BEST_KEY = 'lumen-reef-best';
export const TOTAL_WAVES = 10;
export const REEF_MAX = 3;

export const PLAYER = {
  radius: 16,
  accel: 2600,
  maxSpeed: 360,
  fireInterval: 0.16,
  rapidFireInterval: 0.085,
  bulletSpeed: 640,
  invulnSeconds: 1.6,
  knockback: 320,
};

export const BULLET = { radius: 5, damage: 1, life: 1.1 };

export const ENEMY = {
  wisp: { hp: 1, speed: 58, radius: 14, score: 50, color: '#b678ff' },
  darter: { hp: 1, speed: 138, radius: 12, score: 80, color: '#ff5fd2' },
  bulwark: { hp: 3, speed: 27, radius: 27, score: 150, color: '#8f7bff' },
  boss: { hp: 60, speed: 36, radius: 66, score: 2000, color: '#ff4d6d' },
};

export const MOTE_SCORE = 25;
export const COMBO_WINDOW = 4;
export const COMBO_MAX = 5;
export const POWERUP_DURATION = 8;

export const PALETTE = {
  bgTop: '#04101f',
  bgBottom: '#07303a',
  cyan: '#59f2ff',
  gold: '#ffd76a',
  magenta: '#ff5fd2',
  violet: '#b678ff',
  green: '#7dffb0',
  coral: '#ff8a6b',
  ink: '#0a0f1e',
};

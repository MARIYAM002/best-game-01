// The world: everything that moves, spawns, collides and scores in Lumen Reef.
// The player is a lanternfish guarding the reef heart at the centre of the field.
// Ink wisps, darters and bulwarks drift in from the edges to snuff the heart out;
// every 10th wave the Gloomwhale comes. The reef has 3 integrity: lose it and
// the reef goes dark. Clear wave 10 and the reef shines again.
import {
  BULLET,
  COMBO_MAX,
  COMBO_WINDOW,
  ENEMY,
  PLAYER,
  POWERUP_DURATION,
  REEF_MAX,
  STEP,
  TOTAL_WAVES,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE = 8;
export const EVENT_SHOT = 16;
export const EVENT_MOTE = 32;
export const EVENT_POWER = 64;
export const EVENT_BOSS = 128;

const TAU = Math.PI * 2;
const HEART_RADIUS = 34;
const INTRO_SECONDS = 3;
const MAX_ENEMIES = 42;

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function spawnEdgePoint(random, width, height, margin) {
  const side = random.int(0, 3);
  if (side === 0) return { x: random.range(margin, width - margin), y: -margin };
  if (side === 1) return { x: random.range(margin, width - margin), y: height + margin };
  if (side === 2) return { x: -margin, y: random.range(margin, height - margin) };
  return { x: width + margin, y: random.range(margin, height - margin) };
}

export function createWorld(random, fieldWidth, fieldHeight) {
  const state = {
    time: 0,
    score: 0,
    combo: 1,
    comboTimer: 0,
    reef: REEF_MAX,
    wave: 0,
    phase: 'title',
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    player: null,
    bullets: [],
    enemies: [],
    motes: [],
    powerups: [],
    particles: [],
    floaters: [],
    boss: null,
    shake: 0,
    kills: 0,
    motesCollected: 0,
    events: 0,
    fieldWidth,
    fieldHeight,
  };

  function heart() {
    return { x: state.fieldWidth / 2, y: state.fieldHeight / 2 };
  }

  function freshPlayer() {
    return {
      x: state.fieldWidth / 2,
      y: state.fieldHeight / 2 + 170,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      fireTimer: 0,
      invuln: 0,
      shield: false,
      rapidUntil: 0,
      tripleUntil: 0,
    };
  }

  function seedFloaters() {
    state.floaters = [];
    for (let i = 0; i < 70; i += 1) {
      state.floaters.push({
        x: random.range(0, state.fieldWidth),
        y: random.range(0, state.fieldHeight),
        radius: random.range(1, 3.5),
        speed: random.range(6, 26),
        alpha: random.range(0.15, 0.6),
        bubble: random.chance(0.35),
      });
    }
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, TAU);
      const velocity = random.range(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: random.range(0.35, 0.8),
        maxLife: 0.8,
        size: random.range(2, 5),
        color,
      });
    }
  }

  function addScore(base) {
    const gained = base * state.combo;
    state.score += gained;
    return gained;
  }

  function raiseCombo() {
    state.combo = Math.min(state.combo + 1, COMBO_MAX);
    state.comboTimer = COMBO_WINDOW;
  }

  function dropLoot(x, y, kind) {
    if (kind === 'bulwark' || kind === 'boss') {
      if (random.chance(0.05) && state.reef < REEF_MAX) {
        state.powerups.push({ kind: 'heart', x, y, t: 0 });
        return;
      }
      if (random.chance(0.22)) {
        state.powerups.push({ kind: random.pick(['shield', 'rapid', 'triple']), x, y, t: 0 });
        return;
      }
    }
    if (random.chance(0.7)) {
      state.motes.push({ x, y, vx: random.range(-30, 30), vy: random.range(-30, 30), t: 0 });
    }
  }

  function killEnemy(enemy, index) {
    state.enemies.splice(index, 1);
    state.kills += 1;
    const stats = ENEMY[enemy.kind];
    addScore(stats.score);
    raiseCombo();
    burst(enemy.x, enemy.y, stats.color, enemy.kind === 'boss' ? 60 : 16, 220);
    state.shake = Math.max(state.shake, enemy.kind === 'boss' ? 14 : 5);
    dropLoot(enemy.x, enemy.y, enemy.kind);
    if (enemy.kind === 'bulwark') {
      for (let i = 0; i < 2; i += 1) {
        state.enemies.push(makeEnemy('wisp', enemy.x + random.range(-20, 20), enemy.y + random.range(-20, 20)));
      }
    }
    if (enemy.kind === 'boss') {
      state.boss = null;
      state.phase = 'won';
      state.events |= EVENT_WIN;
      burst(enemy.x, enemy.y, '#ffd76a', 80, 320);
    }
  }

  function makeEnemy(kind, x, y) {
    const stats = ENEMY[kind];
    const enemy = {
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      radius: stats.radius,
      speed: stats.speed * random.range(0.9, 1.15),
      score: stats.score,
      t: random.range(0, TAU),
      seed: random.range(0, TAU),
      flash: 0,
      chargeTimer: random.range(5, 7),
      spawnTimer: random.range(3, 5),
      telegraph: 0,
    };
    if (kind === 'boss') state.boss = enemy;
    return enemy;
  }

  function buildWaveQueue(wave) {
    const queue = [];
    const total = 5 + wave * 3;
    for (let i = 0; i < total; i += 1) queue.push('wisp');
    for (let i = 0; i < Math.floor(wave / 2) + 1; i += 1) queue.push('darter');
    if (wave >= 4) for (let i = 0; i < Math.floor(wave / 3); i += 1) queue.push('bulwark');
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random.next() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    return queue;
  }

  function startWave(wave) {
    state.wave = wave;
    state.phase = 'intro';
    state.waveTimer = INTRO_SECONDS;
    state.spawnQueue = wave === TOTAL_WAVES ? [] : buildWaveQueue(wave);
    state.spawnTimer = 0.6;
    state.events |= EVENT_WAVE;
    if (wave === TOTAL_WAVES) {
      const point = { x: state.fieldWidth / 2, y: -80 };
      state.enemies.push(makeEnemy('boss', point.x, point.y));
      state.events |= EVENT_BOSS;
    }
  }

  function reefHit(fromX, fromY) {
    if (state.player.shield) {
      state.player.shield = false;
      burst(state.player.x, state.player.y, '#59f2ff', 20, 240);
      state.events |= EVENT_HIT;
      return;
    }
    state.reef -= 1;
    state.shake = Math.max(state.shake, 10);
    burst(fromX, fromY, '#ff4d6d', 24, 260);
    state.events |= EVENT_HIT;
    if (state.reef <= 0) {
      state.reef = 0;
      state.phase = 'over';
      state.events |= EVENT_OVER;
      burst(heart().x, heart().y, '#ff4d6d', 70, 320);
    }
  }

  function updatePlayer(dt, input) {
    const player = state.player;
    const move = input ? input.move : { x: 0, y: 0 };
    player.vx += move.x * PLAYER.accel * dt;
    player.vy += move.y * PLAYER.accel * dt;
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > PLAYER.maxSpeed) {
      player.vx = (player.vx / speed) * PLAYER.maxSpeed;
      player.vy = (player.vy / speed) * PLAYER.maxSpeed;
    }
    player.vx *= Math.pow(0.12, dt);
    player.vy *= Math.pow(0.12, dt);
    player.x = Math.min(state.fieldWidth - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.min(state.fieldHeight - PLAYER.radius, Math.max(PLAYER.radius, player.y + player.vy * dt));
    if (input) {
      player.angle = Math.atan2(input.aimY - player.y, input.aimX - player.x);
    }
    player.invuln = Math.max(0, player.invuln - dt);
    player.fireTimer -= dt;
    if (input && input.shooting && player.fireTimer <= 0 && state.phase === 'active') {
      const interval = state.time < player.rapidUntil ? PLAYER.rapidFireInterval : PLAYER.fireInterval;
      player.fireTimer = interval;
      const angles = state.time < player.tripleUntil
        ? [player.angle - 0.22, player.angle, player.angle + 0.22]
        : [player.angle];
      angles.forEach((angle) => {
        state.bullets.push({
          x: player.x + Math.cos(angle) * (PLAYER.radius + 6),
          y: player.y + Math.sin(angle) * (PLAYER.radius + 6),
          vx: Math.cos(angle) * PLAYER.bulletSpeed,
          vy: Math.sin(angle) * PLAYER.bulletSpeed,
          life: BULLET.life,
        });
      });
      state.events |= EVENT_SHOT;
    }
  }

  function updateEnemies(dt) {
    const target = heart();
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.t += dt;
      enemy.flash = Math.max(0, enemy.flash - dt);
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      const nx = dx / distance;
      const ny = dy / distance;
      if (enemy.kind === 'wisp') {
        const wobble = Math.sin(enemy.t * 2.4 + enemy.seed) * 0.7;
        enemy.vx = (nx - ny * wobble) * enemy.speed;
        enemy.vy = (ny + nx * wobble) * enemy.speed;
      } else if (enemy.kind === 'darter') {
        const zig = Math.sin(enemy.t * 5 + enemy.seed) * 1.1;
        enemy.vx = (nx - ny * zig) * enemy.speed;
        enemy.vy = (ny + nx * zig) * enemy.speed;
      } else if (enemy.kind === 'bulwark') {
        enemy.vx = nx * enemy.speed;
        enemy.vy = ny * enemy.speed;
      } else if (enemy.kind === 'boss') {
        updateBoss(enemy, dt, nx, ny, distance);
      }
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      const heartDistance = Math.hypot(enemy.x - target.x, enemy.y - target.y);
      if (heartDistance < HEART_RADIUS + enemy.radius * 0.6) {
        state.enemies.splice(i, 1);
        if (enemy.kind === 'boss') state.boss = null;
        reefHit(enemy.x, enemy.y);
        continue;
      }
      const player = state.player;
      if (player.invuln <= 0) {
        const playerDistance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (playerDistance < enemy.radius + PLAYER.radius) {
          enemy.hp -= 1;
          enemy.flash = 0.15;
          player.invuln = PLAYER.invulnSeconds;
          const knockAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
          player.vx += Math.cos(knockAngle) * PLAYER.knockback;
          player.vy += Math.sin(knockAngle) * PLAYER.knockback;
          reefHit(enemy.x, enemy.y);
          if (enemy.hp <= 0) killEnemy(enemy, i);
        }
      }
    }
  }

  function updateBoss(boss, dt, nx, ny, distance) {
    boss.chargeTimer -= dt;
    boss.spawnTimer -= dt;
    if (boss.telegraph > 0) {
      boss.telegraph -= dt;
      boss.vx = 0;
      boss.vy = 0;
      if (boss.telegraph <= 0) {
        const player = state.player;
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        boss.vx = Math.cos(angle) * 420;
        boss.vy = Math.sin(angle) * 420;
        boss.chargeTimer = 6;
      }
      return;
    }
    if (boss.chargeTimer <= 0 && distance > 140) {
      boss.telegraph = 0.8;
      return;
    }
    boss.vx = nx * boss.speed;
    boss.vy = ny * boss.speed;
    if (boss.spawnTimer <= 0 && state.enemies.length < MAX_ENEMIES) {
      boss.spawnTimer = 4;
      for (let i = 0; i < 2; i += 1) {
        state.enemies.push(makeEnemy('wisp', boss.x + random.range(-40, 40), boss.y + random.range(-40, 40)));
      }
    }
  }

  function updateBullets(dt) {
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;
      let dead = bullet.life <= 0
        || bullet.x < -20 || bullet.x > state.fieldWidth + 20
        || bullet.y < -20 || bullet.y > state.fieldHeight + 20;
      if (!dead) {
        for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
          const enemy = state.enemies[j];
          const radius = enemy.radius + BULLET.radius;
          if (distanceSquared(bullet.x, bullet.y, enemy.x, enemy.y) < radius * radius) {
            enemy.hp -= BULLET.damage;
            enemy.flash = 0.12;
            dead = true;
            if (enemy.hp <= 0) killEnemy(enemy, j);
            break;
          }
        }
      }
      if (dead) state.bullets.splice(i, 1);
    }
  }

  function updatePickups(dt) {
    const player = state.player;
    for (let i = state.motes.length - 1; i >= 0; i -= 1) {
      const mote = state.motes[i];
      mote.t += dt;
      const dx = player.x - mote.x;
      const dy = player.y - mote.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < 130) {
        mote.vx += (dx / distance) * 900 * dt;
        mote.vy += (dy / distance) * 900 * dt;
      }
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.vx *= Math.pow(0.2, dt);
      mote.vy *= Math.pow(0.2, dt);
      if (distance < PLAYER.radius + 12) {
        state.motes.splice(i, 1);
        state.motesCollected += 1;
        addScore(25);
        raiseCombo();
        state.events |= EVENT_MOTE;
        burst(mote.x, mote.y, '#ffd76a', 6, 120);
      }
    }
    for (let i = state.powerups.length - 1; i >= 0; i -= 1) {
      const power = state.powerups[i];
      power.t += dt;
      power.y += Math.sin(power.t * 2) * 12 * dt;
      const distance = Math.hypot(power.x - player.x, power.y - player.y);
      if (distance < PLAYER.radius + 16) {
        state.powerups.splice(i, 1);
        applyPowerup(power.kind);
        state.events |= EVENT_POWER;
      } else if (power.t > 12) {
        state.powerups.splice(i, 1);
      }
    }
  }

  function applyPowerup(kind) {
    const player = state.player;
    if (kind === 'shield') player.shield = true;
    else if (kind === 'rapid') player.rapidUntil = state.time + POWERUP_DURATION;
    else if (kind === 'triple') player.tripleUntil = state.time + POWERUP_DURATION;
    else if (kind === 'heart') state.reef = Math.min(REEF_MAX, state.reef + 1);
    burst(player.x, player.y, '#7dffb0', 18, 200);
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.1, dt);
      particle.vy *= Math.pow(0.1, dt);
      particle.life -= dt;
      if (particle.life <= 0) state.particles.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - dt * 26);
  }

  function updateFloaters(dt) {
    state.floaters.forEach((floater) => {
      floater.y -= floater.speed * dt;
      floater.x += Math.sin(state.time * 0.5 + floater.y * 0.01) * 6 * dt;
      if (floater.y < -8) {
        floater.y = state.fieldHeight + 8;
        floater.x = random.range(0, state.fieldWidth);
      }
    });
  }

  function updateSpawning(dt) {
    if (state.spawnQueue.length === 0) return;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.enemies.length < MAX_ENEMIES) {
      const interval = Math.max(0.35, 1.15 - state.wave * 0.07);
      state.spawnTimer = interval;
      const kind = state.spawnQueue.shift();
      const point = spawnEdgePoint(random, state.fieldWidth, state.fieldHeight, 40);
      state.enemies.push(makeEnemy(kind, point.x, point.y));
    }
  }

  function step(dt, input) {
    state.events = 0;
    state.time += dt;
    updateFloaters(dt);
    updateParticles(dt);
    if (state.phase === 'title') {
      if (state.enemies.length < 5 && random.chance(dt * 0.8)) {
        const point = spawnEdgePoint(random, state.fieldWidth, state.fieldHeight, 40);
        state.enemies.push(makeEnemy(random.pick(['wisp', 'wisp', 'darter']), point.x, point.y));
      }
      state.enemies.forEach((enemy) => {
        enemy.t += dt;
        enemy.x += Math.sin(enemy.t * 0.8 + enemy.seed) * 24 * dt;
        enemy.y += 18 * dt;
        if (enemy.y > state.fieldHeight + 40) enemy.y = -40;
      });
      return state.events;
    }
    if (state.phase === 'won' || state.phase === 'over') return state.events;

    updatePlayer(dt, input);
    if (state.phase === 'intro') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) state.phase = 'active';
    } else if (state.phase === 'active') {
      updateSpawning(dt);
      updateEnemies(dt);
      updateBullets(dt);
      updatePickups(dt);
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) state.combo = 1;
      }
      if (state.phase === 'active' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
        if (state.wave >= TOTAL_WAVES) {
          state.phase = 'won';
          state.events |= EVENT_WIN;
        } else {
          startWave(state.wave + 1);
        }
      }
    }
    return state.events;
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.reef = REEF_MAX;
    state.wave = 0;
    state.phase = 'title';
    state.waveTimer = 0;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.player = freshPlayer();
    state.bullets = [];
    state.enemies = [];
    state.motes = [];
    state.powerups = [];
    state.particles = [];
    state.boss = null;
    state.shake = 0;
    state.kills = 0;
    state.motesCollected = 0;
    state.events = 0;
    seedFloaters();
  }

  function startGame() {
    reset();
    state.phase = 'intro';
    state.waveTimer = 1.2;
    state.wave = 1;
    state.spawnQueue = buildWaveQueue(1);
    state.spawnTimer = 0.8;
    state.events |= EVENT_WAVE;
  }

  function setField(width, height) {
    state.fieldWidth = width;
    state.fieldHeight = height;
    if (state.player) {
      state.player.x = Math.min(width - PLAYER.radius, Math.max(PLAYER.radius, state.player.x));
      state.player.y = Math.min(height - PLAYER.radius, Math.max(PLAYER.radius, state.player.y));
    }
  }

  reset();
  return {
    state,
    heart,
    reset,
    startGame,
    startWave,
    step,
    setField,
    makeEnemy,
    HEART_RADIUS,
  };
}

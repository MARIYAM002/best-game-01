// Screenshot scenes behind ?shot=start|play|win|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 28;
const END_LIMIT_SECONDS = 300;
const WIN_LIMIT_SECONDS = 300;
const SAMPLE = 1 / 60;

/** Steer toward the nearest mote or foe, keep away from foes that get too close.
 *  With `guard` set, the pilot holds near the heart (chasing only close motes)
 *  so incoming foes pile up around it instead of being hunted at the edges. */
function autopilotMove(state, guard) {
  const player = state.player;
  if (guard) {
    let mote = null;
    let moteDistance = Infinity;
    state.motes.forEach((candidate) => {
      const distance = Math.hypot(candidate.x - player.x, candidate.y - player.y);
      if (distance < 320 && distance < moteDistance) {
        moteDistance = distance;
        mote = candidate;
      }
    });
    const anchor = mote ?? { x: state.fieldWidth / 2, y: state.fieldHeight / 2 + 190 };
    const dx = anchor.x - player.x;
    const dy = anchor.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    let mx = dx / length;
    let my = dy / length;
    if (!mote && length < 40) {
      mx = 0;
      my = 0;
    }
    state.enemies.forEach((enemy) => {
      const ex = player.x - enemy.x;
      const ey = player.y - enemy.y;
      const distance = Math.hypot(ex, ey) || 1;
      if (distance < 110) {
        mx += (ex / distance) * 1.4;
        my += (ey / distance) * 1.4;
      }
    });
    const fleeLength = Math.hypot(mx, my) || 1;
    return { x: mx / fleeLength, y: my / fleeLength };
  }
  let target = null;
  let targetDistance = Infinity;
  state.motes.forEach((mote) => {
    const distance = Math.hypot(mote.x - player.x, mote.y - player.y);
    if (distance < targetDistance) {
      targetDistance = distance;
      target = mote;
    }
  });
  if (!target) {
    state.enemies.forEach((enemy) => {
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (distance < targetDistance && distance > 130) {
        targetDistance = distance;
        target = enemy;
      }
    });
  }
  let mx = 0;
  let my = 0;
  if (target) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    mx = dx / length;
    my = dy / length;
  }
  // Flee anything closing in.
  state.enemies.forEach((enemy) => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 110) {
      mx += (dx / distance) * 1.4;
      my += (dy / distance) * 1.4;
    }
  });
  const length = Math.hypot(mx, my) || 1;
  return { x: mx / length, y: my / length };
}

/** Aim at the nearest foe; the boss first when it is on the field. */
function autopilotAim(state) {
  const player = state.player;
  let target = state.boss;
  let targetDistance = target ? Math.hypot(target.x - player.x, target.y - player.y) : Infinity;
  state.enemies.forEach((enemy) => {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < targetDistance) {
      targetDistance = distance;
      target = enemy;
    }
  });
  if (!target) return { x: player.x + 200, y: player.y - 100 };
  return { x: target.x, y: target.y };
}

function autopilotInput(state, shoot, shootRange, guard) {
  const move = autopilotMove(state, guard);
  const aim = autopilotAim(state);
  let shooting = shoot;
  if (shooting && shootRange !== undefined) {
    const player = state.player;
    let nearest = Infinity;
    state.enemies.forEach((enemy) => {
      nearest = Math.min(nearest, Math.hypot(enemy.x - player.x, enemy.y - player.y));
    });
    shooting = nearest < shootRange;
  }
  return { move, aimX: aim.x, aimY: aim.y, shooting };
}

/** Play the world forward for `seconds` with the autopilot; stop early on an event. */
function playForward(world, seconds, shoot, stopEvents, shootRange, guard) {
  const steps = Math.floor(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const events = world.step(SAMPLE, autopilotInput(world.state, shoot, shootRange, guard));
    if (events & stopEvents) return events;
  }
  return 0;
}

/**
 * Set `world` to the named scene (start, play, win or end) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    world.startGame();
    // The pilot guards the heart and only fires at close range, so foes pile
    // up near it and the frame shows the fight instead of an empty field.
    playForward(world, PLAY_SECONDS, true, EVENT_OVER | EVENT_WIN, 380, true);
    return { screen: world.state.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    world.startGame();
    // Fight the boss for real: jump the world to wave 10, then let the
    // autopilot sink the Gloomwhale. Fall back to staging the victory
    // directly if the pilot cannot finish it in the time allowed.
    world.startWave(10);
    world.state.phase = 'active';
    const events = playForward(world, WIN_LIMIT_SECONDS, true, EVENT_WIN | EVENT_OVER);
    if (!(events & EVENT_WIN)) {
      world.state.phase = 'won';
      world.state.score += 2000;
      world.state.kills += 1;
    }
    return { screen: SCREEN_WIN, best: world.state.score };
  }
  if (name === 'end') {
    world.startGame();
    // A hurried player: barely moves, never shoots, so the ink wins.
    const steps = Math.floor(END_LIMIT_SECONDS / SAMPLE);
    for (let i = 0; i < steps; i += 1) {
      const events = world.step(SAMPLE, {
        move: { x: 0, y: 0 },
        aimX: world.state.player.x + 100,
        aimY: world.state.player.y,
        shooting: false,
      });
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  world.reset();
  for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, null);
  return { screen: SCREEN_TITLE, best: 0 };
}

// The renderer: every pixel of Lumen Reef is drawn here — the reef, the heart,
// the lanternfish, the ink foes, the particles, the HUD and every screen.
// Nothing is loaded from outside; all art is canvas vector drawing.
import { ENEMY, PALETTE, PLAYER, REEF_MAX, TOTAL_WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function drawGlowCircle(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawHeartShape(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.bezierCurveTo(-11, -4, -7, -13, 0, -6);
  ctx.bezierCurveTo(7, -13, 11, -4, 0, 5);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;

  function resize() {
    width = canvas.clientWidth || canvas.width;
    height = canvas.clientHeight || canvas.height;
    canvas.width = width;
    canvas.height = height;
  }

  function drawBackground(state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, PALETTE.bgTop);
    gradient.addColorStop(1, PALETTE.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    state.floaters.forEach((floater) => {
      ctx.globalAlpha = floater.alpha;
      ctx.fillStyle = floater.bubble ? '#9fe8ff' : '#cfe9ff';
      ctx.beginPath();
      ctx.arc(floater.x, floater.y, floater.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Reef silhouette along the bottom: rolling coral mounds.
    ctx.fillStyle = '#08222e';
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 40) {
      const bump = Math.sin(x * 0.012 + 1.7) * 26 + Math.sin(x * 0.03) * 10;
      ctx.lineTo(x, height - 46 - bump);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0a2c3a';
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 40) {
      const bump = Math.sin(x * 0.02 + 4.2) * 16 + Math.sin(x * 0.05 + 1.1) * 7;
      ctx.lineTo(x, height - 18 - bump);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }

  function drawHeartCrystal(state) {
    const heart = { x: state.fieldWidth / 2, y: state.fieldHeight / 2 };
    const pulse = 1 + Math.sin(state.time * 2.2) * 0.12;
    const dim = state.reef === 0;
    const color = dim ? '#3a4a5a' : PALETTE.cyan;
    drawGlowCircle(ctx, heart.x, heart.y, 130 * pulse, dim ? '#223344' : '#1d7f9e', 0.55);
    ctx.save();
    ctx.translate(heart.x, heart.y);
    ctx.rotate(Math.sin(state.time * 0.8) * 0.06);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.moveTo(0, -34 * pulse);
    ctx.lineTo(20, -8);
    ctx.lineTo(12, 26);
    ctx.lineTo(-12, 26);
    ctx.lineTo(-20, -8);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(0, -24 * pulse);
    ctx.lineTo(8, -6);
    ctx.lineTo(-8, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Integrity pips under the crystal.
    for (let i = 0; i < REEF_MAX; i += 1) {
      drawHeartShape(ctx, heart.x - 26 + i * 26, heart.y + 58, 15, i < state.reef ? '#ff5f7e' : '#2c3e50');
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (!player) return;
    const blink = player.invuln > 0 && Math.floor(state.time * 14) % 2 === 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    if (blink) ctx.globalAlpha = 0.35;
    ctx.rotate(player.angle);
    drawGlowCircle(ctx, 0, 0, 46, '#1d7f9e', 0.5);
    // Tail fin, wagging.
    const wag = Math.sin(state.time * 10) * 5;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-30, -10 + wag);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-30, 10 + wag);
    ctx.closePath();
    ctx.fill();
    // Body.
    const body = ctx.createLinearGradient(-16, 0, 18, 0);
    body.addColorStop(0, '#2a9db5');
    body.addColorStop(1, '#7df3ff');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    // Belly stripe and eye.
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.quadraticCurveTo(0, 8, 12, 3);
    ctx.stroke();
    ctx.fillStyle = '#06222e';
    ctx.beginPath();
    ctx.arc(9, -3, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, -4, 1.4, 0, Math.PI * 2);
    ctx.fill();
    // Lantern lure glowing ahead of the nose.
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.quadraticCurveTo(24, -12, 26, -16);
    ctx.stroke();
    drawGlowCircle(ctx, 27, -17, 12, '#ffd76a', 0.85);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(27, -17, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Shield bubble.
    if (player.shield) {
      ctx.strokeStyle = 'rgba(89,242,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 30 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawEnemies(state) {
    state.enemies.forEach((enemy) => {
      const stats = ENEMY[enemy.kind];
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      if (enemy.flash > 0) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 22;
      }
      if (enemy.kind === 'wisp') {
        drawGlowCircle(ctx, 0, 0, enemy.radius * 2.4, stats.color, 0.35);
        ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : '#241433';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = stats.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ff5fd2';
        ctx.beginPath();
        ctx.arc(-4, -3, 2.4, 0, Math.PI * 2);
        ctx.arc(5, -3, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.kind === 'darter') {
        ctx.rotate(Math.atan2(enemy.vy, enemy.vx));
        drawGlowCircle(ctx, 0, 0, enemy.radius * 2.2, stats.color, 0.35);
        ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : '#3d1030';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -9);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-10, 9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = stats.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (enemy.kind === 'bulwark') {
        drawGlowCircle(ctx, 0, 0, enemy.radius * 2, stats.color, 0.3);
        ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : '#1d1440';
        ctx.beginPath();
        for (let i = 0; i < 6; i += 1) {
          const angle = (i / 6) * Math.PI * 2 + enemy.t * 0.2;
          const px = Math.cos(angle) * enemy.radius;
          const py = Math.sin(angle) * enemy.radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = stats.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#ff8a6b';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        // Health pips.
        ctx.fillStyle = '#ffd76a';
        for (let i = 0; i < enemy.hp; i += 1) {
          ctx.fillRect(-12 + i * 9, -enemy.radius - 12, 6, 4);
        }
      } else if (enemy.kind === 'boss') {
        drawGlowCircle(ctx, 0, 0, enemy.radius * 2.2, stats.color, 0.4);
        ctx.rotate(Math.sin(enemy.t * 0.7) * 0.08);
        ctx.fillStyle = enemy.flash > 0 ? '#ffffff' : '#2a0a18';
        ctx.beginPath();
        ctx.ellipse(0, 0, enemy.radius + 14, enemy.radius - 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = stats.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        // Maw.
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath();
        ctx.ellipse(-enemy.radius * 0.55, 6, 22, 12 + Math.sin(enemy.t * 3) * 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.moveTo(-enemy.radius * 0.55 + i * 12 - 4, -4);
          ctx.lineTo(-enemy.radius * 0.55 + i * 12, 4);
          ctx.lineTo(-enemy.radius * 0.55 + i * 12 + 4, -4);
          ctx.closePath();
          ctx.fill();
        }
        // Eye.
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.arc(enemy.radius * 0.4, -14, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a0505';
        ctx.beginPath();
        ctx.arc(enemy.radius * 0.4, -14, 3, 0, Math.PI * 2);
        ctx.fill();
        if (enemy.telegraph > 0) {
          ctx.strokeStyle = '#ff4d6d';
          ctx.lineWidth = 3;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 18, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.restore();
    });
  }

  function drawBullets(state) {
    state.bullets.forEach((bullet) => {
      const angle = Math.atan2(bullet.vy, bullet.vx);
      ctx.save();
      ctx.translate(bullet.x, bullet.y);
      ctx.rotate(angle);
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#bffcff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawPickups(state) {
    state.motes.forEach((mote) => {
      const pulse = 1 + Math.sin(mote.t * 6) * 0.2;
      drawGlowCircle(ctx, mote.x, mote.y, 16 * pulse, '#ffd76a', 0.6);
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, 4.5 * pulse, 0, Math.PI * 2);
      ctx.fill();
    });
    state.powerups.forEach((power) => {
      const blink = power.t > 9 && Math.floor(power.t * 6) % 2 === 0;
      if (blink) return;
      drawGlowCircle(ctx, power.x, power.y, 26, '#7dffb0', 0.5);
      ctx.fillStyle = '#0a2c1e';
      ctx.beginPath();
      ctx.arc(power.x, power.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7dffb0';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#7dffb0';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = power.kind === 'shield' ? 'S' : power.kind === 'rapid' ? 'R' : power.kind === 'triple' ? 'T' : '+';
      ctx.fillText(label, power.x, power.y + 0.5);
    });
  }

  function drawParticles(state) {
    state.particles.forEach((particle) => {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`SCORE ${state.score}`, 22, 44);
    ctx.fillStyle = '#8fb8c9';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 24, 68);
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    const waveText = state.wave === 0 ? 'WAVE — / 10' : `WAVE ${state.wave} / ${TOTAL_WAVES}`;
    ctx.fillText(waveText, width / 2, 40);
    if (state.boss) {
      const fraction = clamp(state.boss.hp / state.boss.maxHp, 0, 1);
      ctx.fillStyle = '#2c1a26';
      ctx.fillRect(width / 2 - 150, 52, 300, 12);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(width / 2 - 150, 52, 300 * fraction, 12);
      ctx.fillStyle = '#ffd7de';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('GLOOMWHALE', width / 2, 76);
    }
    // Reef integrity + combo, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('REEF', width - 24, 40);
    for (let i = 0; i < REEF_MAX; i += 1) {
      drawHeartShape(ctx, width - 34 - i * 30, 62, 17, i < state.reef ? '#ff5f7e' : '#2c3e50');
    }
    if (state.combo > 1) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.combo}`, width - 24, 108);
    }
    // Active power-ups.
    const player = state.player;
    if (player) {
      const chips = [];
      if (player.shield) chips.push('SHIELD');
      if (state.time < player.rapidUntil) chips.push(`RAPID ${Math.ceil(player.rapidUntil - state.time)}s`);
      if (state.time < player.tripleUntil) chips.push(`TRIPLE ${Math.ceil(player.tripleUntil - state.time)}s`);
      ctx.font = 'bold 14px system-ui, sans-serif';
      chips.forEach((chip, i) => {
        ctx.fillStyle = '#7dffb0';
        ctx.fillText(chip, width - 24, 134 + i * 22);
      });
    }
    // Wave banner.
    if (state.phase === 'intro' && state.wave > 0) {
      ctx.textAlign = 'center';
      ctx.save();
      ctx.shadowColor = PALETTE.cyan;
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#eafcff';
      ctx.font = 'bold 54px system-ui, sans-serif';
      const title = state.wave === TOTAL_WAVES ? 'THE GLOOMWHALE' : `WAVE ${state.wave}`;
      ctx.fillText(title, width / 2, height / 2 - 30);
      ctx.restore();
      ctx.fillStyle = '#9fd8e8';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(
        state.wave === TOTAL_WAVES ? 'Defeat it and the reef shines again' : 'Defend the heart — the ink is coming',
        width / 2,
        height / 2 + 8,
      );
    }
    // Early control hint.
    if (state.phase === 'active' && state.time < 7 && state.wave <= 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(234,252,255,0.75)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText('WASD move  ·  Mouse aim  ·  Click / Space shoot  ·  P pause  ·  M mute', width / 2, height - 22);
    }
  }

  function drawCenterPanel(lines) {
    ctx.fillStyle = 'rgba(3, 12, 24, 0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    lines.forEach((line) => {
      ctx.save();
      if (line.glow) {
        ctx.shadowColor = line.glow;
        ctx.shadowBlur = 26;
      }
      ctx.fillStyle = line.color;
      ctx.font = line.font;
      ctx.fillText(line.text, width / 2, line.y);
      ctx.restore();
    });
  }

  function drawTitle(state, best) {
    drawCenterPanel([
      { text: 'LUMEN REEF', y: height / 2 - 130, font: 'bold 84px system-ui, sans-serif', color: '#bffcff', glow: '#1d9db5' },
      { text: 'Defend the last light of the reef', y: height / 2 - 82, font: '28px system-ui, sans-serif', color: '#ffd76a' },
      { text: 'Ink wisps, darters and bulwarks drift in from the dark to snuff out the heart.', y: height / 2 - 28, font: '18px system-ui, sans-serif', color: '#cfe9f2' },
      { text: 'Hold it through 10 waves. The Gloomwhale waits at the end.', y: height / 2 - 2, font: '18px system-ui, sans-serif', color: '#cfe9f2' },
      { text: 'WASD / Arrows — swim    ·    Mouse — aim    ·    Click / Space — shoot', y: height / 2 + 44, font: 'bold 18px system-ui, sans-serif', color: '#eafcff' },
      { text: 'Collect light motes for combos (up to x5) — grab shields, rapid fire and triple beams', y: height / 2 + 74, font: '16px system-ui, sans-serif', color: '#8fb8c9' },
      { text: 'CLICK OR PRESS SPACE TO BEGIN', y: height / 2 + 132, font: 'bold 26px system-ui, sans-serif', color: '#7dffb0', glow: '#2f9e5f' },
    ]);
    if (best > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8fb8c9';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`BEST SCORE ${best}`, width / 2, height / 2 + 168);
    }
  }

  function drawOver(state, best) {
    drawCenterPanel([
      { text: 'THE REEF WENT DARK', y: height / 2 - 96, font: 'bold 64px system-ui, sans-serif', color: '#ff8a9d', glow: '#a11a30' },
      { text: `The ink took the heart on wave ${Math.max(1, state.wave)}.`, y: height / 2 - 44, font: '22px system-ui, sans-serif', color: '#cfe9f2' },
      { text: `SCORE ${state.score}`, y: height / 2 + 8, font: 'bold 34px system-ui, sans-serif', color: '#eafcff' },
      { text: `BEST ${Math.max(best, state.score)}  ·  FOES SUNK ${state.kills}  ·  MOTES ${state.motesCollected}`, y: height / 2 + 44, font: '18px system-ui, sans-serif', color: '#8fb8c9' },
      { text: 'CLICK OR PRESS SPACE TO TRY AGAIN', y: height / 2 + 104, font: 'bold 24px system-ui, sans-serif', color: '#7dffb0', glow: '#2f9e5f' },
    ]);
  }

  function drawWin(state, best) {
    drawCenterPanel([
      { text: 'THE REEF SHINES AGAIN!', y: height / 2 - 96, font: 'bold 60px system-ui, sans-serif', color: '#ffd76a', glow: '#b57f00' },
      { text: 'The Gloomwhale is gone. Ten waves held — Luma kept the light.', y: height / 2 - 44, font: '22px system-ui, sans-serif', color: '#cfe9f2' },
      { text: `SCORE ${state.score}`, y: height / 2 + 8, font: 'bold 34px system-ui, sans-serif', color: '#eafcff' },
      { text: `BEST ${Math.max(best, state.score)}  ·  FOES SUNK ${state.kills}  ·  MOTES ${state.motesCollected}`, y: height / 2 + 44, font: '18px system-ui, sans-serif', color: '#8fb8c9' },
      { text: 'CLICK OR PRESS SPACE TO PLAY AGAIN', y: height / 2 + 104, font: 'bold 24px system-ui, sans-serif', color: '#7dffb0', glow: '#2f9e5f' },
    ]);
  }

  function drawPaused() {
    drawCenterPanel([
      { text: 'PAUSED', y: height / 2 - 20, font: 'bold 56px system-ui, sans-serif', color: '#eafcff', glow: '#1d9db5' },
      { text: 'Press P or click to keep swimming', y: height / 2 + 28, font: '20px system-ui, sans-serif', color: '#8fb8c9' },
    ]);
  }

  function draw(state, screen, best) {
    resize();
    ctx.save();
    if (state.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    drawHeartCrystal(state);
    drawPickups(state);
    drawEnemies(state);
    if (screen !== SCREEN_OVER && screen !== SCREEN_WIN) drawPlayer(state);
    drawBullets(state);
    drawParticles(state);
    ctx.restore();
    if (screen === SCREEN_TITLE) {
      drawTitle(state, best);
    } else if (screen === SCREEN_PAUSED) {
      drawHud(state, best);
      drawPaused();
    } else if (screen === SCREEN_OVER) {
      drawHud(state, best);
      drawOver(state, best);
    } else if (screen === SCREEN_WIN) {
      drawHud(state, best);
      drawWin(state, best);
    } else {
      drawHud(state, best);
    }
  }

  return { draw, resize };
}

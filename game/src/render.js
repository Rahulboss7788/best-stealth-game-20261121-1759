// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// museum is scaled to fit the window and centred. Night lighting is a darkness layer
// with holes punched where the thief, the Star, the exit and the guards stand; the
// vision cones are drawn on top of the dark, so they read at a glance. Flat shapes and
// canvas text for the HUD and the panels.
import { ARTIFACT, CASES, EXIT, RUG, STATUES, WALLS } from './level.js';
import { FIELD, FONT, GUARD, PALETTE, PLAYER } from './config.js';
import { PHASE_CAUGHT, PHASE_WON } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TILE = 80;
const PANEL = { width: 640, top: 150, line: 36, bottom: 64 };

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const light = document.createElement('canvas');
  light.width = FIELD.width;
  light.height = FIELD.height;
  const lightCtx = light.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  window.addEventListener('resize', resize);
  resize();

  /** Convert a mouse position to field coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.x / (window.devicePixelRatio || 1)) / view.scale,
      y: (clientY - rect.top - view.y / (window.devicePixelRatio || 1)) / view.scale,
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`.trim());
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floorA;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.floorB;
    for (let ty = 0; ty < FIELD.height / TILE; ty += 1) {
      for (let tx = 0; tx < FIELD.width / TILE; tx += 1) {
        if ((tx + ty) % 2 === 0) context.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    context.strokeStyle = PALETTE.floorLine;
    context.lineWidth = 1;
    for (let gx = 0; gx <= FIELD.width; gx += TILE) {
      context.beginPath();
      context.moveTo(gx, 0);
      context.lineTo(gx, FIELD.height);
      context.stroke();
    }
    for (let gy = 0; gy <= FIELD.height; gy += TILE) {
      context.beginPath();
      context.moveTo(0, gy);
      context.lineTo(FIELD.width, gy);
      context.stroke();
    }
    context.fillStyle = PALETTE.rug;
    context.fillRect(RUG.x, RUG.y, RUG.w, RUG.h);
    context.strokeStyle = PALETTE.rugEdge;
    context.lineWidth = 4;
    context.strokeRect(RUG.x + 6, RUG.y + 6, RUG.w - 12, RUG.h - 12);
  }

  function drawWalls() {
    for (const wall of WALLS) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, 4);
    }
  }

  function drawCover() {
    for (const box of CASES) {
      context.fillStyle = PALETTE.caseFrame;
      context.fillRect(box.x - 3, box.y - 3, box.w + 6, box.h + 6);
      context.fillStyle = PALETTE.caseGlass;
      context.fillRect(box.x, box.y, box.w, box.h);
      context.fillStyle = 'rgba(255,255,255,0.35)';
      context.fillRect(box.x + 6, box.y + 5, box.w - 12, 5);
      context.fillStyle = PALETTE.artifact;
      context.beginPath();
      context.arc(box.x + box.w / 2, box.y + box.h / 2, 6, 0, Math.PI * 2);
      context.fill();
    }
    for (const statue of STATUES) {
      context.fillStyle = PALETTE.statueBase;
      context.fillRect(statue.x - 16, statue.y - 16, 32, 32);
      context.fillStyle = PALETTE.statue;
      context.beginPath();
      context.arc(statue.x, statue.y, statue.r - 4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#8b95a5';
      context.beginPath();
      context.arc(statue.x, statue.y - 4, 7, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawArtifact(time) {
    const pulse = 0.75 + 0.25 * Math.sin(time * 3);
    const glow = context.createRadialGradient(
      ARTIFACT.x, ARTIFACT.y, 4, ARTIFACT.x, ARTIFACT.y, 70 * pulse,
    );
    glow.addColorStop(0, 'rgba(255, 217, 74, 0.5)');
    glow.addColorStop(1, 'rgba(255, 217, 74, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(ARTIFACT.x, ARTIFACT.y, 70 * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.pedestal;
    context.fillRect(ARTIFACT.x - 16, ARTIFACT.y - 12, 32, 26);
    context.fillStyle = PALETTE.artifact;
    context.beginPath();
    context.moveTo(ARTIFACT.x, ARTIFACT.y - 14);
    context.lineTo(ARTIFACT.x + 10, ARTIFACT.y);
    context.lineTo(ARTIFACT.x, ARTIFACT.y + 14);
    context.lineTo(ARTIFACT.x - 10, ARTIFACT.y);
    context.closePath();
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(ARTIFACT.x, ARTIFACT.y - 7);
    context.lineTo(ARTIFACT.x + 4, ARTIFACT.y - 1);
    context.lineTo(ARTIFACT.x, ARTIFACT.y + 3);
    context.lineTo(ARTIFACT.x - 4, ARTIFACT.y - 1);
    context.closePath();
    context.fill();
  }

  function drawExit(state) {
    const active = state.artifactTaken;
    const pulse = active ? 0.7 + 0.3 * Math.sin(state.elapsed * 4) : 0.45;
    context.fillStyle = PALETTE.exit;
    context.globalAlpha = pulse;
    context.fillRect(EXIT.x - 4, EXIT.y - 6, EXIT.w + 8, EXIT.h + 6);
    context.globalAlpha = 1;
    context.fillStyle = '#0d2b18';
    context.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
    text('EXIT', EXIT.x + EXIT.w / 2, EXIT.y - 12, 20, active ? PALETTE.exitSign : PALETTE.muted, 'center', '700');
  }

  function drawCone(guard) {
    const color =
      guard.state === 'chase'
        ? PALETTE.coneAlert
        : guard.suspicion > 0.35
          ? PALETTE.coneSuspicious
          : PALETTE.cone;
    const gradient = context.createRadialGradient(
      guard.x, guard.y, 10, guard.x, guard.y, GUARD.viewRange,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 214, 90, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, GUARD.viewRange, guard.facing - GUARD.viewHalfAngle, guard.facing + GUARD.viewHalfAngle);
    context.closePath();
    context.fill();
  }

  function drawGuard(guard) {
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.guardCap;
    context.beginPath();
    context.arc(guard.x, guard.y, GUARD.radius - 5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#d7e3f4';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.lineTo(
      guard.x + Math.cos(guard.facing) * (GUARD.radius + 6),
      guard.y + Math.sin(guard.facing) * (GUARD.radius + 6),
    );
    context.stroke();
    if (guard.state === 'chase') {
      text('!', guard.x, guard.y - GUARD.radius - 8, 22, PALETTE.danger, 'center', '800');
    } else if (guard.suspicion > 0.35) {
      text('?', guard.x, guard.y - GUARD.radius - 8, 20, PALETTE.warn, 'center', '800');
    }
  }

  function drawPlayer(state, time) {
    const player = state.player;
    const bob = player.moving ? Math.sin(time * 14) * 1.5 : 0;
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y + bob, PLAYER.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerHood;
    context.beginPath();
    context.arc(player.x, player.y + bob - 3, PLAYER.radius - 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1a1426';
    context.beginPath();
    context.arc(player.x, player.y + bob - 3, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(232, 228, 216, 0.35)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, PLAYER.radius + 5, 0, Math.PI * 2);
    context.stroke();
  }

  function drawDarkness(state) {
    lightCtx.clearRect(0, 0, FIELD.width, FIELD.height);
    lightCtx.fillStyle = PALETTE.darkness;
    lightCtx.fillRect(0, 0, FIELD.width, FIELD.height);
    lightCtx.globalCompositeOperation = 'destination-out';
    const holes = [
      { x: state.player.x, y: state.player.y, r: 150 },
      { x: ARTIFACT.x, y: ARTIFACT.y, r: 90 },
      { x: EXIT.x + EXIT.w / 2, y: EXIT.y + EXIT.h / 2, r: 80 },
    ];
    for (const guard of state.guards) holes.push({ x: guard.x, y: guard.y, r: 70 });
    for (const hole of holes) {
      const gradient = lightCtx.createRadialGradient(hole.x, hole.y, 8, hole.x, hole.y, hole.r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      lightCtx.fillStyle = gradient;
      lightCtx.beginPath();
      lightCtx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2);
      lightCtx.fill();
    }
    lightCtx.globalCompositeOperation = 'source-over';
    context.drawImage(light, 0, 0);
  }

  function drawHud(state, best) {
    let maxSuspicion = 0;
    let chasing = false;
    for (const guard of state.guards) {
      if (guard.suspicion > maxSuspicion) maxSuspicion = guard.suspicion;
      if (guard.state === 'chase') chasing = true;
    }
    context.fillStyle = PALETTE.panel;
    context.fillRect(16, 12, 560, 58);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1;
    context.strokeRect(16, 12, 560, 58);
    text(
      state.artifactTaken ? 'Reach the exit — unseen!' : 'Steal the Star of Halcyon',
      30, 38, 20, state.artifactTaken ? PALETTE.good : PALETTE.text, 'left', '600',
    );
    text(state.artifactTaken ? '★ Star taken' : '☆ Star in the vault', 30, 60, 14, PALETTE.muted);
    context.fillStyle = '#20263a';
    context.fillRect(300, 26, 150, 12);
    context.fillStyle = chasing ? PALETTE.danger : maxSuspicion > 0.35 ? PALETTE.warn : PALETTE.good;
    context.fillRect(300, 26, 150 * maxSuspicion, 12);
    text(chasing ? 'SPOTTED!' : 'unseen', 458, 37, 13, chasing ? PALETTE.danger : PALETTE.muted, 'left', '700');
    context.fillStyle = PALETTE.panel;
    context.fillRect(FIELD.width - 216, 12, 200, 58);
    context.strokeStyle = PALETTE.panelEdge;
    context.strokeRect(FIELD.width - 216, 12, 200, 58);
    text(formatTime(state.elapsed * 1000), FIELD.width - 30, 38, 20, PALETTE.text, 'right', '600');
    text(best > 0 ? `Best ghost ${formatTime(best)}` : 'No ghost run yet', FIELD.width - 30, 60, 14, PALETTE.muted, 'right');
    if (chasing) {
      context.fillStyle = 'rgba(180, 20, 12, 0.85)';
      context.fillRect(FIELD.width / 2 - 190, 84, 380, 34);
      text('SPOTTED — break line of sight!', FIELD.width / 2, 108, 20, '#ffffff', 'center', '800');
    }
    if (state.exitHintTimer > 0) {
      context.fillStyle = PALETTE.panel;
      context.fillRect(FIELD.width / 2 - 260, FIELD.height - 96, 520, 36);
      text('The exit is locked to you — steal the Star first!', FIELD.width / 2, FIELD.height - 71, 18, PALETTE.warn, 'center', '600');
    }
    text('WASD / Arrows — move · Click — walk to · P — pause · M — mute', 16, FIELD.height - 16, 14, PALETTE.muted);
  }

  function drawPanel(title, lines, prompt, titleColor) {
    const height = PANEL.top + PANEL.line * lines.length + PANEL.bottom;
    const y0 = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(5, 8, 16, 0.78)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect((FIELD.width - PANEL.width) / 2, y0, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect((FIELD.width - PANEL.width) / 2, y0, PANEL.width, height);
    text(title, FIELD.width / 2, y0 + 58, 40, titleColor, 'center', '800');
    lines.forEach((line, index) => {
      text(line, FIELD.width / 2, y0 + 108 + index * PANEL.line, 19, PALETTE.text, 'center');
    });
    text(prompt, FIELD.width / 2, y0 + height - 26, 17, PALETTE.muted, 'center', '600');
  }

  function draw(state, screen, best, time) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawFloor();
    drawWalls();
    drawCover();
    if (!state.artifactTaken) drawArtifact(time);
    drawExit(state);
    drawDarkness(state);
    for (const guard of state.guards) drawCone(guard);
    for (const guard of state.guards) drawGuard(guard);
    if (screen !== SCREEN_TITLE) drawPlayer(state, time);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'THE VELVET VAULT',
        [
          'A museum heist in the dark. You are Wren, a thief.',
          'Slip past the night guards — their cones are their eyes.',
          'Hide behind statues and display cases. Lift the Star,',
          'then reach the green EXIT unseen.',
        ],
        'Press Space or click to begin',
        PALETTE.artifact,
      );
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The guards wait. The Star waits.'], 'Press P to resume', PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      if (state.phase === PHASE_WON) {
        drawPanel(
          'CLEAN GETAWAY',
          [
            `You lifted the Star in ${formatTime(state.winMs)}.`,
            state.spottedEver
              ? 'They saw you — but you still slipped away.'
              : 'Ghost — never seen, never heard.',
            best > 0 ? `Best ghost run: ${formatTime(best)}` : '',
          ].filter((line) => line !== ''),
          'Press Space to play again',
          PALETTE.good,
        );
      } else {
        drawPanel(
          'CAUGHT!',
          [
            state.caughtBy ? `Guard ${state.caughtBy} caught you in the dark.` : 'A guard caught you in the dark.',
            'The Star stays in its case. Tonight, at least.',
          ],
          'Press Space to try again',
          PALETTE.danger,
        );
      }
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw, toField, resize };
}

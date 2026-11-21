// The game's rules and state, with no drawing and no browser in it: the thief, the
// guards and their patrols, suspicion and chases, the artifact and the exit. step()
// advances one fixed step and returns what happened as bit flags, so the caller can
// play sounds without the world knowing about screens or sound. Nothing here allocates
// after createWorld returns.
import { FIELD, GUARD, PLAYER, STEP, SUSPICION } from './config.js';
import {
  ARTIFACT,
  GUARDS,
  PLAYER_START,
  collideCircle,
  inExit,
  nearArtifact,
} from './level.js';
import { visibility } from './vision.js';

export const EVENT_STEP = 1;
export const EVENT_ALERT = 2;
export const EVENT_PICKUP = 4;
export const EVENT_WIN = 8;
export const EVENT_CAUGHT = 16;

export const PHASE_PLAY = 'play';
export const PHASE_WON = 'won';
export const PHASE_CAUGHT = 'caught';

/** Seconds a guard waits at each waypoint, sweeping its gaze. */
const WAYPOINT_PAUSE = 1.2;
/** How far a guard's gaze sweeps while it waits at a waypoint, in radians. */
const SCAN_SWEEP = 0.7;

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function angleLerp(from, to, t) {
  let diff = to - from;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return from + diff * t;
}

export function createWorld(random) {
  const player = {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    moving: false,
    grace: 0,
  };
  const guards = GUARDS.map((def) => {
    const first = def.waypoints[0];
    const second = def.waypoints[1];
    return {
      name: def.name,
      def,
      x: first.x,
      y: first.y,
      facing: Math.atan2(second.y - first.y, second.x - first.x),
      waypointIndex: 1,
      patrolForward: true,
      pauseTimer: 0,
      scanPhase: 0,
      suspicion: 0,
      state: 'patrol',
      chaseTimer: 0,
      lastSeenX: first.x,
      lastSeenY: first.y,
    };
  });
  const state = {
    player,
    guards,
    phase: PHASE_PLAY,
    artifactTaken: false,
    elapsed: 0,
    spottedEver: false,
    winMs: 0,
    exitHintTimer: 0,
    stepTimer: 0,
    caughtBy: '',
  };

  function reset() {
    player.x = PLAYER_START.x;
    player.y = PLAYER_START.y;
    player.moving = false;
    player.grace = 0;
    for (let index = 0; index < guards.length; index += 1) {
      const guard = guards[index];
      const first = guard.def.waypoints[0];
      const second = guard.def.waypoints[1];
      guard.x = first.x;
      guard.y = first.y;
      guard.facing = Math.atan2(second.y - first.y, second.x - first.x);
      guard.waypointIndex = 1;
      guard.patrolForward = true;
      guard.pauseTimer = 0;
      guard.scanPhase = 0;
      guard.suspicion = 0;
      guard.state = 'patrol';
      guard.chaseTimer = 0;
      guard.lastSeenX = first.x;
      guard.lastSeenY = first.y;
    }
    state.phase = PHASE_PLAY;
    state.artifactTaken = false;
    state.elapsed = 0;
    state.spottedEver = false;
    state.winMs = 0;
    state.exitHintTimer = 0;
    state.stepTimer = 0;
    state.caughtBy = '';
  }

  /** Move a guard toward (tx, ty) at `speed`, sliding along walls. Returns true on arrival. */
  function moveGuard(guard, tx, ty, speed, dt) {
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) return true;
    const stepLen = Math.min(dist, speed * dt);
    const nx = guard.x + (dx / dist) * stepLen;
    const ny = guard.y + (dy / dist) * stepLen;
    const fixed = collideCircle(nx, ny, GUARD.radius);
    guard.x = fixed.x;
    guard.y = fixed.y;
    const targetFacing = Math.atan2(dy, dx);
    guard.facing = angleLerp(guard.facing, targetFacing, Math.min(1, dt * 8));
    return dist <= stepLen + 1;
  }

  /** Advance one guard's patrol: walk its waypoints, pausing and sweeping its gaze. */
  function patrol(guard, dt) {
    const target = guard.def.waypoints[guard.waypointIndex];
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      guard.scanPhase += dt;
      const next = guard.def.waypoints[guard.waypointIndex];
      const base = Math.atan2(next.y - guard.y, next.x - guard.x);
      guard.facing = base + Math.sin(guard.scanPhase * 2.2) * SCAN_SWEEP;
      if (guard.pauseTimer <= 0) guard.scanPhase = 0;
      return;
    }
    const arrived = moveGuard(guard, target.x, target.y, GUARD.patrolSpeed * guard.def.pace, dt);
    if (!arrived) return;
    guard.pauseTimer = WAYPOINT_PAUSE;
    const last = guard.def.waypoints.length - 1;
    if (guard.def.waypoints.length <= 2) {
      guard.waypointIndex = guard.waypointIndex === 0 ? 1 : 0;
      return;
    }
    if (guard.patrolForward) {
      if (guard.waypointIndex === last) {
        guard.patrolForward = false;
        guard.waypointIndex = last - 1;
      } else {
        guard.waypointIndex += 1;
      }
    } else if (guard.waypointIndex === 0) {
      guard.patrolForward = true;
      guard.waypointIndex = 1;
    } else {
      guard.waypointIndex -= 1;
    }
  }

  /** Advance one guard's chase: hunt the last seen spot, give up when the trail goes cold. */
  function chase(guard, dt, seesPlayer) {
    if (seesPlayer) {
      guard.lastSeenX = player.x;
      guard.lastSeenY = player.y;
      guard.chaseTimer = GUARD.giveUpSeconds;
    } else {
      guard.chaseTimer -= dt;
    }
    if (guard.chaseTimer <= 0) {
      guard.state = 'patrol';
      guard.suspicion = SUSPICION.afterChase;
      guard.pauseTimer = 0;
      return;
    }
    moveGuard(guard, guard.lastSeenX, guard.lastSeenY, GUARD.chaseSpeed, dt);
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    if (dx * dx + dy * dy < GUARD.catchRange * GUARD.catchRange && player.grace <= 0) {
      state.phase = PHASE_CAUGHT;
      state.caughtBy = guard.name;
    }
  }

  /**
   * One fixed step. `move` is {x, y} (a unit vector or 0,0). With `harmless` set
   * (the title screen's backdrop) the guards patrol but nobody is ever spotted.
   */
  function step(dt, move, harmless) {
    let events = 0;
    if (state.phase !== PHASE_PLAY) return events;
    state.elapsed += dt;
    if (player.grace > 0) player.grace = Math.max(0, player.grace - dt);
    if (state.exitHintTimer > 0) state.exitHintTimer = Math.max(0, state.exitHintTimer - dt);

    const len = Math.sqrt(move.x * move.x + move.y * move.y);
    player.moving = len > 0.01;
    if (player.moving) {
      const nx = player.x + (move.x / len) * PLAYER.speed * dt;
      const ny = player.y + (move.y / len) * PLAYER.speed * dt;
      const fixed = collideCircle(nx, ny, PLAYER.radius);
      player.x = fixed.x;
      player.y = fixed.y;
      state.stepTimer += dt;
      if (state.stepTimer >= 0.28) {
        state.stepTimer = 0;
        events |= EVENT_STEP;
      }
    } else {
      state.stepTimer = 0;
    }

    for (const guard of guards) {
      if (guard.state === 'patrol') patrol(guard, dt);
      const seen = visibility(guard, player);
      if (harmless) {
        guard.suspicion = 0;
        continue;
      }
      if (seen.heard) {
        guard.suspicion = clamp01(guard.suspicion + SUSPICION.riseHeard * dt);
      } else if (seen.seen > 0) {
        const rate = SUSPICION.riseFar + (SUSPICION.riseNear - SUSPICION.riseFar) * seen.seen;
        guard.suspicion = clamp01(guard.suspicion + rate * dt);
      } else {
        guard.suspicion = clamp01(guard.suspicion - SUSPICION.decay * dt);
      }
      if (guard.state === 'patrol' && guard.suspicion >= 1) {
        guard.state = 'chase';
        guard.chaseTimer = GUARD.giveUpSeconds;
        guard.lastSeenX = player.x;
        guard.lastSeenY = player.y;
        state.spottedEver = true;
        events |= EVENT_ALERT;
      }
      if (guard.state === 'chase') chase(guard, dt, seen.seen > 0 || seen.heard);
      if (state.phase !== PHASE_PLAY) {
        events |= EVENT_CAUGHT;
        return events;
      }
    }

    if (!state.artifactTaken && nearArtifact(player.x, player.y)) {
      state.artifactTaken = true;
      events |= EVENT_PICKUP;
    }
    if (inExit(player.x, player.y)) {
      if (state.artifactTaken) {
        state.phase = PHASE_WON;
        state.winMs = Math.round(state.elapsed * 1000);
        events |= EVENT_WIN;
      } else if (state.exitHintTimer === 0) {
        state.exitHintTimer = 2.5;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}

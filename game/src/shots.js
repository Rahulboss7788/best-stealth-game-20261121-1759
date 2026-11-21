// The screenshot scenes behind ?shot=start|play|spotted|win. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot that walks the thief
// between waypoints, so the frame is what a short game really looks like and the same
// seed always gives the same frame. The play scene stages the thief behind cover with
// the guards patrolling (no detection), so the cover shot is always clean; the spotted
// scene uses the real rules and catches the moment a guard gives chase.
import { STEP } from './config.js';
import { PHASE_CAUGHT, PHASE_WON } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Steer the thief toward the current waypoint; advance when close. */
function waypointPilot(state, waypoints, index) {
  if (index >= waypoints.length) return { move: { x: 0, y: 0 }, index };
  const target = waypoints[index];
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 14) return { move: { x: 0, y: 0 }, index: index + 1 };
  return { move: { x: dx / dist, y: dy / dist }, index };
}

/**
 * Set `world` to the named scene (start, play, spotted or win; any other name is
 * start) and return the screen to draw over it and the best time to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name === 'play') {
    // A scenic sneak: up the entrance hall, through the left door into the gallery,
    // and behind the display case by the rug, with the Star glowing in the vault
    // above. Guards patrol for real; detection is off so the frame stays clean.
    world.reset();
    const waypoints = [
      { x: 100, y: 560 },
      { x: 200, y: 520 },
      { x: 420, y: 520 },
      { x: 500, y: 420 },
      { x: 560, y: 370 },
    ];
    let index = 0;
    const steps = Math.floor(17 / STEP);
    for (let i = 0; i < steps; i += 1) {
      const pilot = waypointPilot(state, waypoints, index);
      index = pilot.index;
      world.step(STEP, pilot.move, true);
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'spotted') {
    // Walk the thief straight into Marlow's patrol lane, hold still in the cone
    // until the guard gives chase, then run for the door while the alarm is up.
    world.reset();
    const waypoints = [{ x: 640, y: 300 }];
    let index = 0;
    let chasing = false;
    let fleeSteps = 0;
    const maxSteps = Math.floor(40 / STEP);
    for (let i = 0; i < maxSteps; i += 1) {
      let move;
      if (!chasing) {
        const pilot = waypointPilot(state, waypoints, index);
        index = pilot.index;
        move = pilot.move;
      } else {
        move = { x: 0, y: 1 };
        fleeSteps += 1;
        if (fleeSteps > Math.floor(0.9 / STEP)) break;
      }
      world.step(STEP, move, false);
      if (state.phase === PHASE_CAUGHT) break;
      if (!chasing) {
        for (const guard of state.guards) {
          if (guard.state === 'chase') chasing = true;
        }
      }
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    // The getaway itself: the Star already lifted, the thief a few steps from the
    // green door. Walk in and let the real win trigger.
    world.reset();
    state.artifactTaken = true;
    state.player.x = 640;
    state.player.y = 668;
    for (let i = 0; i < Math.floor(10 / STEP); i += 1) {
      world.step(STEP, { x: 0, y: 1 }, true);
      if (state.phase === PHASE_WON) break;
    }
    return { screen: SCREEN_OVER, best: state.winMs };
  }
  // start: the title over a live museum, guards on patrol, five seconds in.
  world.reset();
  for (let i = 0; i < Math.floor(5 / STEP); i += 1) {
    world.step(STEP, { x: 0, y: 0 }, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}

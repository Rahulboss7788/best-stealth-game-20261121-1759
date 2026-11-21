// A guard's sight: is the player inside the vision cone, and is the line between them
// clear? A cone alone is not enough — a statue or a display case between guard and thief
// breaks the sight line, which is what makes cover work.
import { GUARD } from './config.js';
import { lineOfSightClear } from './level.js';

/**
 * How visible the player is to this guard, 0 when unseen. Returns a number 0..1:
 * 0 when out of the cone or behind cover, rising toward 1 as the player gets closer.
 * Also returns true when the player is close enough to be heard whatever way the
 * guard faces. `guard` carries x, y and facing (radians); `player` carries x and y.
 */
export function visibility(guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);
  if (dist < GUARD.hearRange) return { seen: 1, heard: true, dist };
  if (dist > GUARD.viewRange) return { seen: 0, heard: false, dist };
  const angleToPlayer = Math.atan2(dy, dx);
  let diff = angleToPlayer - guard.facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > GUARD.viewHalfAngle) return { seen: 0, heard: false, dist };
  if (!lineOfSightClear(guard.x, guard.y, player.x, player.y)) return { seen: 0, heard: false, dist };
  return { seen: 1 - dist / GUARD.viewRange, heard: false, dist };
}

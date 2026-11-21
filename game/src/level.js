// The museum: its walls, the cover that blocks sight and movement, the guards' patrol
// routes, the artifact's pedestal, the exit door and where the thief starts. All of it is
// plain data; the world moves the pieces, the renderer draws them, vision tests them.
//
// Rooms, bottom to top: the entrance hall (A), the main gallery (B) and the vault (C).
// Walls between rooms leave door gaps; cover is statues (circles) and display cases
// (rectangles). Every patrol route was checked against the walls and cover so a guard
// never has to walk through one.

export const WALLS = [
  // Outer walls. The south wall leaves the exit gap at x 600..680.
  { x: 0, y: 0, w: 1280, h: 24 },
  { x: 0, y: 696, w: 600, h: 24 },
  { x: 680, y: 696, w: 600, h: 24 },
  { x: 0, y: 0, w: 24, h: 720 },
  { x: 1256, y: 0, w: 24, h: 720 },
  // Vault (C) / gallery (B) wall at y 240; door gaps at x 324..480 and 800..956.
  { x: 24, y: 240, w: 300, h: 20 },
  { x: 480, y: 240, w: 320, h: 20 },
  { x: 956, y: 240, w: 300, h: 20 },
  // Gallery (B) / entrance (A) wall at y 480; door gaps at x 384..640 and 840..1020.
  { x: 24, y: 480, w: 360, h: 20 },
  { x: 640, y: 480, w: 200, h: 20 },
  { x: 1020, y: 480, w: 236, h: 20 },
];

/** Statues: circles that block sight and movement. */
export const STATUES = [
  { x: 300, y: 140, r: 22 },
  { x: 980, y: 140, r: 22 },
  { x: 200, y: 360, r: 22 },
  { x: 1080, y: 360, r: 22 },
  { x: 640, y: 420, r: 22 },
  { x: 640, y: 650, r: 22 },
];

/** Display cases: rectangles that block sight and movement. */
export const CASES = [
  { x: 480, y: 110, w: 90, h: 44 },
  { x: 710, y: 110, w: 90, h: 44 },
  { x: 480, y: 320, w: 90, h: 44 },
  { x: 710, y: 320, w: 90, h: 44 },
  { x: 300, y: 536, w: 90, h: 44 },
  { x: 890, y: 536, w: 90, h: 44 },
];

/** The Star of Halcyon, on its pedestal in the vault. */
export const ARTIFACT = { x: 640, y: 130, r: 18 };

/** The exit door: the gap in the south wall. */
export const EXIT = { x: 600, y: 688, w: 80, h: 32 };

/** Where the thief starts, bottom-left of the entrance hall. */
export const PLAYER_START = { x: 100, y: 660 };

/** The night guards: name, patrol waypoints, pace multiplier and facing at rest. */
export const GUARDS = [
  {
    name: 'Marlow',
    waypoints: [
      { x: 150, y: 300 },
      { x: 1130, y: 300 },
    ],
    pace: 1.0,
  },
  {
    name: 'Iris',
    waypoints: [
      { x: 380, y: 240 },
      { x: 900, y: 240 },
      { x: 900, y: 50 },
      { x: 380, y: 50 },
    ],
    pace: 0.8,
  },
  {
    name: 'Bram',
    waypoints: [
      { x: 150, y: 600 },
      { x: 1130, y: 600 },
    ],
    pace: 1.05,
  },
  {
    name: 'Sable',
    waypoints: [
      { x: 900, y: 280 },
      { x: 900, y: 460 },
    ],
    pace: 0.9,
  },
];

/** A rug in the main gallery, drawn under everything for the museum feel. */
export const RUG = { x: 340, y: 300, w: 600, h: 140 };

/** Does the segment (x1,y1)-(x2,y2) cross the axis-aligned rectangle? */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < rect.x || minX > rect.x + rect.w || maxY < rect.y || minY > rect.y + rect.h) return false;
  if (x1 >= rect.x && x1 <= rect.x + rect.w && y1 >= rect.y && y1 <= rect.y + rect.h) return true;
  if (x2 >= rect.x && x2 <= rect.x + rect.w && y2 >= rect.y && y2 <= rect.y + rect.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    const den = dx * (ey2 - ey1) - dy * (ex2 - ex1);
    if (den === 0) continue;
    const t = ((ex1 - x1) * (ey2 - ey1) - (ey1 - y1) * (ex2 - ex1)) / den;
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

/** Does the segment (x1,y1)-(x2,y2) cross the circle? */
function segmentHitsCircle(x1, y1, x2, y2, circle) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0) t = Math.max(0, Math.min(1, ((circle.x - x1) * dx + (circle.y - y1) * dy) / lenSq));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const ddx = cx - circle.x;
  const ddy = cy - circle.y;
  return ddx * ddx + ddy * ddy < circle.r * circle.r;
}

/**
 * True when nothing solid stands between (x1,y1) and (x2,y2): no wall, no display
 * case and no statue. Cover is what makes stealth possible.
 */
export function lineOfSightClear(x1, y1, x2, y2) {
  for (const wall of WALLS) if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  for (const box of CASES) if (segmentHitsRect(x1, y1, x2, y2, box)) return false;
  for (const statue of STATUES) if (segmentHitsCircle(x1, y1, x2, y2, statue)) return false;
  return true;
}

/**
 * Push a circle (x, y, radius) out of every wall, case and statue it overlaps, so a
 * walker slides along solid things instead of passing through them. Returns the
 * corrected position. Movement is resolved axis by axis by the caller for sliding.
 */
export function collideCircle(x, y, radius) {
  let px = x;
  let py = y;
  const solids = [];
  for (const wall of WALLS) solids.push(wall);
  for (const box of CASES) solids.push(box);
  for (const rect of solids) {
    const nearX = Math.max(rect.x, Math.min(px, rect.x + rect.w));
    const nearY = Math.max(rect.y, Math.min(py, rect.y + rect.h));
    const ddx = px - nearX;
    const ddy = py - nearY;
    const distSq = ddx * ddx + ddy * ddy;
    if (distSq >= radius * radius) continue;
    if (distSq === 0) {
      py = rect.y - radius;
      continue;
    }
    const dist = Math.sqrt(distSq);
    px = nearX + (ddx / dist) * radius;
    py = nearY + (ddy / dist) * radius;
  }
  for (const statue of STATUES) {
    const ddx = px - statue.x;
    const ddy = py - statue.y;
    const distSq = ddx * ddx + ddy * ddy;
    const minDist = radius + statue.r;
    if (distSq >= minDist * minDist || distSq === 0) continue;
    const dist = Math.sqrt(distSq);
    px = statue.x + (ddx / dist) * minDist;
    py = statue.y + (ddy / dist) * minDist;
  }
  return { x: px, y: py };
}

/** True when the point is inside the exit doorway. */
export function inExit(x, y) {
  return x >= EXIT.x && x <= EXIT.x + EXIT.w && y >= EXIT.y && y <= EXIT.y + EXIT.h;
}

/** True when the point is close enough to lift the artifact. */
export function nearArtifact(x, y) {
  const dx = x - ARTIFACT.x;
  const dy = y - ARTIFACT.y;
  return dx * dx + dy * dy < (ARTIFACT.r + 22) * (ARTIFACT.r + 22);
}

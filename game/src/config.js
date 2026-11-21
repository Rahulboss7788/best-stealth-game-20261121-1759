// Every tuning number and colour in one place. The museum is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
//
// The Velvet Vault: a top-down museum heist at night. You are Wren, a thief. Slip past
// the night guards, lift the Star of Halcyon from its pedestal, and reach the exit unseen.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 12,
  speed: 205,
  /** Seconds of grace after a close call before a guard can catch you again. */
  grace: 0.6,
};

export const GUARD = {
  radius: 14,
  /** Patrol speed; each guard multiplies this by its own pace. */
  patrolSpeed: 78,
  /** Chase speed: slower than the player, so a clean break is possible. */
  chaseSpeed: 140,
  /** How far a guard can see, in pixels. */
  viewRange: 200,
  /** Half of the vision cone's angle, in radians. */
  viewHalfAngle: (32 * Math.PI) / 180,
  /** Within this distance a guard hears you whatever way it faces. */
  hearRange: 55,
  /** Seconds a chasing guard keeps hunting after losing sight of you. */
  giveUpSeconds: 2.5,
  /** Distance at which a chasing guard catches you. */
  catchRange: 26,
};

/** Suspicion 0..1; at 1 the guard is alerted and gives chase. */
export const SUSPICION = {
  /** Rise per second while the player is in the cone: nearer is faster. */
  riseNear: 1.0,
  riseFar: 0.4,
  /** Rise per second while the player is inside hearRange. */
  riseHeard: 1.4,
  /** Fall per second while the player is unseen. */
  decay: 0.6,
  /** Suspicion a guard keeps when it gives up a chase. */
  afterChase: 0.35,
};

export const PALETTE = {
  backdrop: '#070a12',
  floorA: '#1a2030',
  floorB: '#161c2a',
  floorLine: '#232c42',
  rug: '#3a1f2b',
  rugEdge: '#6b3a44',
  wall: '#2c3550',
  wallTop: '#4a5a80',
  caseGlass: '#7fa8c9',
  caseFrame: '#8a6d3b',
  statue: '#b8c0cc',
  statueBase: '#3a4152',
  pedestal: '#4a3f2a',
  artifact: '#ffd94a',
  artifactGlow: '#ffe98a',
  exit: '#2fae5f',
  exitSign: '#7dffab',
  player: '#e8e4d8',
  playerHood: '#5b4a8a',
  guard: '#3d5a80',
  guardCap: '#22344d',
  cone: 'rgba(255, 214, 90, 0.28)',
  coneSuspicious: 'rgba(255, 150, 50, 0.42)',
  coneAlert: 'rgba(255, 70, 60, 0.5)',
  darkness: 'rgba(3, 5, 12, 0.5)',
  text: '#eef1f5',
  muted: '#9aa5bb',
  danger: '#ff5a4e',
  warn: '#ffb347',
  good: '#7dffab',
  panel: 'rgba(10, 14, 26, 0.82)',
  panelEdge: '#3a4a6b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best (fastest ghost) time is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-vault.best-ms';

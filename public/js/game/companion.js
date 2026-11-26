import { AVATAR_SPEED } from '../../../shared/content/config.js';
import { route } from './path.js';

const GAP = 0.85;
const CATCH_UP = 7;
const REPLAN_SECONDS = 0.24;

/** A local visual follower. Nothing it does is sent over the player's socket. */
export function createCompanion() {
  let points = [];
  let untilPlan = 0;
  return (state, pose, leader, dt) => {
    const distance = Math.hypot(leader.x - pose.x, leader.z - pose.z);
    if (distance <= GAP + 0.025) {
      points = [];
      untilPlan = 0;
      return { ...pose, a: 0 };
    }

    untilPlan -= dt;
    if (untilPlan <= 0) {
      untilPlan = REPLAN_SECONDS;
      const bearing = Math.atan2(pose.z - leader.z, pose.x - leader.x);
      points = [];
      for (const angle of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
        const goal = {
          x: leader.x + Math.cos(bearing + angle) * GAP,
          z: leader.z + Math.sin(bearing + angle) * GAP,
        };
        const origin = distance > CATCH_UP ? leader : pose;
        const path = route(state, origin, goal);
        if (!path?.reached) {
          if (origin === pose && !points.length) points = path?.points ?? [];
          continue;
        }
        if (distance > CATCH_UP) {
          return { ...goal, f: leader.f, a: 0 };
        }
        points = path.points;
        break;
      }
    }

    let remaining = Math.min(.1, dt) * AVATAR_SPEED * 1.18;
    let { x, z, f } = pose;
    while (points.length && remaining > 0) {
      const point = points[0];
      const dx = point.x - x;
      const dz = point.z - z;
      const length = Math.hypot(dx, dz);
      if (length < 1e-5) { points.shift(); continue; }
      const step = Math.min(length, remaining);
      x += dx * step / length;
      z += dz * step / length;
      f = Math.atan2(dx, dz);
      remaining -= step;
      if (step === length) points.shift();
    }
    return { x, z, f, a: x === pose.x && z === pose.z ? 0 : 1 };
  };
}

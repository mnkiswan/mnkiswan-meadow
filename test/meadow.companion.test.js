import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEADOW_CAST, animationRig, farmerBody } from '../shared/content/cast.js';
import { avatarValueOk } from '../shared/rules/actions/avatar.js';
import { spawnAt } from '../shared/rules/grid.js';
import { createCompanion } from '../public/js/game/companion.js';
import { walkGrid } from '../public/js/game/path.js';
import { makeFarm } from './helpers.js';

test('the two lead characters are defaults and all six cast choices are valid saves', () => {
  assert.equal(farmerBody('p1'), 'mnki');
  assert.equal(farmerBody('p2'), 'swan');
  assert.equal(farmerBody('p1', { avatar: { top: '#FFFFFF' } }), 'farmer_a');
  assert.equal(farmerBody('p2', { avatar: { body: 'fox_boy' } }), 'fox_boy');
  assert.equal(Object.keys(MEADOW_CAST).length, 6);
  for (const body of Object.keys(MEADOW_CAST)) {
    assert.ok(avatarValueOk('body', body));
    assert.match(animationRig(body), /^farmer_[ab]$/);
  }
});

test('offline companion approaches the other farmer, stops at their side and stays on walkable tiles', () => {
  const state = makeFarm();
  const grid = walkGrid(state);
  let pose = { ...spawnAt(state, 'p2'), f: 0, a: 0 };
  const leader = { x: 24.5, z: 30.5, f: 0, a: 0 };
  assert.ok(grid.cost[Math.floor(leader.z) * grid.n + Math.floor(leader.x)]);
  const follow = createCompanion();
  for (let i = 0; i < 360; i++) {
    pose = follow(state, pose, leader, 1 / 60);
    assert.ok(grid.cost[Math.floor(pose.z) * grid.n + Math.floor(pose.x)]);
  }
  const gap = Math.hypot(pose.x - leader.x, pose.z - leader.z);
  assert.ok(gap > 0.4 && gap < 1.3, `companion gap: ${gap}`);
  assert.equal(pose.a, 0);
});

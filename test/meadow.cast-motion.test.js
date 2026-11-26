import { test } from 'node:test';
import assert from 'node:assert/strict';
import { castMotion, GESTURE_TIME } from '../public/js/render/cast-motion.js';
import en from '../public/js/i18n/en/moments.js';
import pl from '../public/js/i18n/pl/moments.js';

test('idle bends both arms down and locomotion alternates left and right strides', () => {
  const idle = castMotion(0, 0);
  const walk = castMotion(Math.PI / 20, 2);
  const run = castMotion(Math.PI / 20, 4);
  assert.ok(idle.limbs.slice(0, 4).every(([, y]) => y < -.5));
  assert.ok(walk.limbs[4][2] > 0 && walk.limbs[6][2] < 0);
  assert.ok(run.limbs[4][2] > walk.limbs[4][2]);
});

test('work, gestures and special activities produce distinct poses and settle back to idle', () => {
  const idle = castMotion(0, 0);
  for (const [gesture, duration] of Object.entries(GESTURE_TIME)) {
    assert.notDeepEqual(castMotion(0, 0, gesture, duration / 2, 'sickle'), idle, gesture);
    assert.deepEqual(castMotion(0, 0, gesture, duration, 'sickle'), idle, gesture);
  }
  for (const stance of ['seat', 'ride', 'fish']) assert.notDeepEqual(castMotion(0, 0, null, 0, null, stance), idle);
  assert.deepEqual(castMotion(60, 3, 'dance', 1, null, null, true), idle);
});

test('Meadow reflections are available in both languages', () => {
  for (const group of ['rest', 'grow']) {
    for (let i = 0; i < 4; i++) {
      const key = `moments.wisdom.${group}.${i}`;
      assert.match(en[key], /\.$/);
      assert.match(pl[key], /\.$/);
      assert.notEqual(en[key], pl[key]);
    }
  }
});

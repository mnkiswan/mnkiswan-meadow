// Directions in the character's frame: +Y is up, +Z is forward. These poses
// are independent of the imported skeleton's local axes and bind pose.
const WORK = {
  seed_bag: [.50, .25], watering_can: [.37, .65], sickle: [.62, .76],
  axe: [.75, .8], hammer: [.65, .63], feed_scoop: [.45, .35], basket: [.35, .46], compost_scoop: [.47, .49],
};

export const GESTURE_TIME = {
  work: .75, wave: 1.4, highFive: .85, heart: 1.25, cheer: 1.3,
  laugh: 1.2, dance: 2.1, come: 1.25, thumbs: 1.1, wow: 1.0, sleepy: 1.65, star: 1.0,
};

export function castMotion(time, speed, gesture, age, tool, stance, still = false) {
  const gait = still || stance ? 0 : Math.min(1, Math.max(0, speed) / 3);
  const step = Math.sin(time * 10) * gait;
  const breath = still ? 0 : Math.sin(time * 2.5);
  const duration = GESTURE_TIME[gesture];
  const progress = duration ? Math.min(1, Math.max(0, age / duration)) : 1;
  const beat = still || stance || progress >= 1 ? 0 : Math.sin(Math.PI * progress) ** 0.75;
  const active = beat > 0.001;
  const [reach, bend] = WORK[tool] ?? [.43, .45];
  const work = active && gesture === 'work' ? beat : 0;
  const greeting = active && ['wave', 'highFive', 'come', 'thumbs'].includes(gesture) ? beat : 0;
  const both = active && ['cheer', 'wow', 'heart', 'dance', 'star'].includes(gesture) ? beat : 0;
  const sleepy = gesture === 'sleepy' ? beat : 0;
  const laugh = active && gesture === 'laugh' ? beat : 0;
  const dance = gesture === 'dance' ? both * Math.sin(time * 13) : 0;
  const heart = gesture === 'heart' ? both : 0;
  const armsUp = both - heart;
  const swing = (gesture === 'wave' || gesture === 'come') ? Math.sin(time * 17) * greeting : 0;
  const seated = stance === 'seat' || stance === 'ride';
  const fishing = stance === 'fish';
  const armY = fishing ? -.55 : -.97;
  const armZ = fishing ? .75 : seated ? .37 : .08;
  return {
    // upper arm, forearm, thigh, shin: left then right
    limbs: [
      [.24 + armsUp * .35, armY + armsUp * 1.75, armZ - step * .34 + heart * .75 + dance * .18],
      [.06 - heart * .66, -.91 + armsUp * 1.75 + heart * .85, .26 - step * .35 + heart * .58],
      [-.24 - armsUp * .35 - work * .22, armY + greeting * 1.48 + armsUp * 1.75 + work * bend, armZ + step * .34 + work * reach + greeting * .6 + heart * .75],
      [-.06 + swing * .48 + heart * .66, -.91 + greeting * 1.99 + armsUp * 1.75 + heart * .85 + work * bend, .26 + step * .35 + work * reach + greeting * .32 + heart * .58],
      [seated ? .26 : .04, seated ? -.40 : -1, seated ? .9 : step * .46],
      [0, -1, seated ? -.18 : Math.min(0, step) * .48],
      [seated ? -.26 : -.04, seated ? -.40 : -1, seated ? .9 : -step * .46],
      [0, -1, seated ? -.18 : Math.min(0, -step) * .48],
    ],
    lift: seated ? 0 : Math.abs(step) * .055 + breath * .009 + armsUp * Math.abs(Math.sin(time * 9)) * .065,
    lean: work * .26 + laugh * .18 + gait * .08,
    sway: dance * .18 + breath * .025,
    nod: work * .19 + sleepy * .3 + laugh * Math.sin(time * 14) * .12,
  };
}

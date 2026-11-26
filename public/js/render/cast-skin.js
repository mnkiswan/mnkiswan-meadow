import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { MEADOW_CAST } from '../../../shared/content/cast.js';
import { assetUrl, fetchAsset } from '../net/asset-base.js';
import { castMotion } from './cast-motion.js';

const templates = new Map();
const sections = [
  ['upperarm_l', 'lowerarm_l'], ['lowerarm_l', 'hand_l'],
  ['upperarm_r', 'lowerarm_r'], ['lowerarm_r', 'hand_r'],
  ['thigh_l', 'calf_l'], ['calf_l', 'foot_l'],
  ['thigh_r', 'calf_r'], ['calf_r', 'foot_r'],
];

export async function loadCastSkin(body, driver) {
  if (!Object.hasOwn(MEADOW_CAST, body)) return null;
  if (!templates.has(body)) {
    const pending = fetchAsset(assetUrl(`/assets/cast/${body}.glb`)).then(async (response) => {
      if (!response.ok) throw new Error(`Character asset returned HTTP ${response.status}`);
      return new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
    }).catch((error) => { templates.delete(body); throw error; });
    templates.set(body, pending);
  }
  const object = clone((await templates.get(body)).scene);
  const root = new THREE.Group();
  root.add(object);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Invalid character bounds');
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = 1.95 / size.y;
  object.scale.multiplyScalar(scale);
  object.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z).multiplyScalar(scale));
  const joints = new Map();
  object.traverse((node) => {
    if (node.isBone) joints.set(node.name, node);
    if (node.isMesh) node.castShadow = true;
  });

  const from = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const aim = new THREE.Quaternion();
  const rotation = new THREE.Quaternion();
  const frame = new THREE.Quaternion();
  const links = sections.map(([start, end]) => {
    const joint = joints.get(start);
    const tip = joints.get(end);
    if (!joint || !tip) throw new Error('Incomplete character animation rig');
    joint.getWorldPosition(from);
    const bindDirection = tip.getWorldPosition(new THREE.Vector3()).sub(from).normalize()
      .applyQuaternion(joint.parent.getWorldQuaternion(rotation).invert());
    return { joint, bindDirection, rest: joint.quaternion.clone() };
  });
  const meshes = [];
  driver.traverse((node) => { if (node.isSkinnedMesh) meshes.push(node); });
  const head = joints.get('head');
  const headRest = head?.quaternion.clone();
  const euler = new THREE.Euler();
  const hand = joints.get('hand_r');

  let lastStaticStance;
  let staticPoseApplied = false;
  function update({ time = 0, speed = 0, gesture, age = 0, tool, stance, still = false } = {}) {
    if (still && staticPoseApplied && stance === lastStaticStance) {
      root.position.y = driver.position.y;
      return;
    }
    staticPoseApplied = still;
    lastStaticStance = stance;
    const pose = castMotion(time, speed, gesture, age, tool, stance, still);
    root.position.y = driver.position.y + pose.lift;
    root.rotation.set(pose.lean, 0, pose.sway);
    root.getWorldQuaternion(frame);
    for (let i = 0; i < links.length; i++) {
      const { joint, bindDirection, rest } = links[i];
      direction.fromArray(pose.limbs[i]).normalize().applyQuaternion(frame)
        .applyQuaternion(joint.parent.getWorldQuaternion(rotation).invert());
      joint.quaternion.copy(aim.setFromUnitVectors(bindDirection, direction)).multiply(rest);
    }
    if (head) head.quaternion.copy(headRest).multiply(aim.setFromEuler(euler.set(pose.nod, 0, -pose.sway)));
  }

  // Pose before attaching to avoid a visible bind-pose frame during model loads.
  update();
  for (const mesh of meshes) mesh.visible = false;
  return { root, hand, update };
}

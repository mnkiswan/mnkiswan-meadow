import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { MEADOW_CAST } from '../../../shared/content/cast.js';
import { assetUrl, fetchAsset } from '../net/asset-base.js';

const templates = new Map();
const sections = [
  ['upperarm_l', 'lowerarm_l', 'UpperArmL', 'LowerArmL'],
  ['lowerarm_l', 'hand_l', 'LowerArmL', 'WristL'],
  ['upperarm_r', 'lowerarm_r', 'UpperArmR', 'LowerArmR'],
  ['lowerarm_r', 'hand_r', 'LowerArmR', 'WristR'],
  ['thigh_l', 'calf_l', 'UpperLegL', 'LowerLegL'],
  ['calf_l', 'foot_l', 'LowerLegL', 'FootL'],
  ['thigh_r', 'calf_r', 'UpperLegR', 'LowerLegR'],
  ['calf_r', 'foot_r', 'LowerLegR', 'FootR'],
];

export async function loadCastSkin(body, driver, bones) {
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
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Invalid character bounds');
  const center = box.getCenter(new THREE.Vector3());
  const scale = 1.95 / size.y;
  object.scale.multiplyScalar(scale);
  object.position.sub(new THREE.Vector3(center.x, box.min.y, center.z).multiplyScalar(scale));
  const joints = new Map();
  object.traverse((node) => {
    if (node.isBone) joints.set(node.name, node);
    if (node.isMesh) { node.castShadow = true; node.frustumCulled = false; }
  });
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const aim = new THREE.Quaternion();
  const parentRotation = new THREE.Quaternion();
  const links = sections.flatMap(([start, end, source, sourceEnd]) => {
    const joint = joints.get(start);
    const tip = joints.get(end);
    if (!joint || !tip || !bones[source] || !bones[sourceEnd]) return [];
    const rest = joint.quaternion.clone();
    joint.getWorldPosition(from);
    tip.getWorldPosition(to);
    const direction = to.sub(from).normalize().applyQuaternion(joint.parent.getWorldQuaternion(parentRotation).invert());
    return [{ joint, rest, direction, source: bones[source], end: bones[sourceEnd] }];
  });
  if (links.length < 8) throw new Error('Incomplete character animation rig');
  const sourceMeshes = [];
  driver.traverse((node) => { if (node.isSkinnedMesh) sourceMeshes.push(node); });
  const hips = bones.Hips;
  const head = joints.get('head');
  const headRest = head?.quaternion.clone();
  const euler = new THREE.Euler();
  const hipsHome = hips?.position.y ?? 0;
  return {
    root,
    update({ sitting = false, riding = false, fishing = false } = {}) {
      // Special seat poses and rods retain the original rig until individually fitted to the new proportions.
      const visible = !(sitting || riding || fishing);
      root.visible = visible;
      for (const mesh of sourceMeshes) mesh.visible = !visible;
      if (!visible) return;
      const offset = hips?.position.y ?? 0;
      root.position.y = driver.position.y + Math.max(-0.18, Math.min(0.28, offset - hipsHome));
      for (const link of links) {
        link.source.getWorldPosition(from);
        link.end.getWorldPosition(to);
        const direction = to.sub(from).normalize()
          .applyQuaternion(link.joint.parent.getWorldQuaternion(parentRotation).invert());
        aim.setFromUnitVectors(link.direction, direction);
        link.joint.quaternion.copy(aim).multiply(link.rest);
      }
      if (head && bones.Head) {
        euler.setFromQuaternion(bones.Head.quaternion);
        head.quaternion.copy(headRest).multiply(aim.setFromEuler(euler.set(euler.x * .25, euler.y * .25, euler.z * .25)));
      }
    },
  };
}

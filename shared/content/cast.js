// Fixed character designs. The original farmer builds remain available for wardrobe customization.
export const MEADOW_CAST = Object.freeze({
  mnki: { name: 'MNKI', rig: 'farmer_a' },
  swan: { name: 'Swan', rig: 'farmer_b' },
  fox_boy: { name: 'Fox Boy', rig: 'farmer_a' },
  frog_boy: { name: 'Frog Boy', rig: 'farmer_a' },
  bunny_girl: { name: 'Bunny Girl', rig: 'farmer_b' },
  cat_girl: { name: 'Cat Girl', rig: 'farmer_b' },
});

export function farmerBody(pid, player) {
  const look = player?.avatar;
  // Preserve an existing player's custom wardrobe, including saves with only colour or hair overrides.
  return look?.body ?? (look ? (pid === 'p2' ? 'farmer_b' : 'farmer_a') : (pid === 'p2' ? 'swan' : 'mnki'));
}

export function animationRig(body) {
  return Object.hasOwn(MEADOW_CAST, body) ? MEADOW_CAST[body].rig : body;
}

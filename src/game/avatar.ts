import * as THREE from 'three';

export interface AvatarConfig {
  name: string;
  gender: 'male' | 'female';
  skinTone: string;
  hairStyle: 'fade' | 'slick' | 'afro' | 'buzz' | 'long' | 'cap' | 'bandana';
  hairColor: string;
  facialHair: 'clean' | 'stubble' | 'beard' | 'mustache';
  topType: 'hawaiian' | 'suit' | 'hoodie' | 'tank' | 'leather';
  topColor: string;
  pantsType: 'jeans' | 'chinos' | 'shorts' | 'track';
  pantsColor: string;
  shoesType: 'sneakers' | 'loafers' | 'boots';
  shoesColor: string;
  accessory: 'none' | 'sunglasses' | 'gold_chain' | 'aviators' | 'watch';
}

export const SKIN_TONES = [
  { name: 'Claro / Light', color: '#f7d0b3' },
  { name: 'Bronceado / Tan', color: '#e0ac69' },
  { name: 'Oliva / Olive', color: '#c68642' },
  { name: 'Moreno / Dark', color: '#8d5524' },
  { name: 'Oscuro / Deep', color: '#3d2314' }
];

export const HAIR_COLORS = [
  { name: 'Negro Azabache', color: '#18181b' },
  { name: 'Castaño Oscuro', color: '#3f2212' },
  { name: 'Rubio Dorado', color: '#eab308' },
  { name: 'Platino / Gris', color: '#e2e8f0' },
  { name: 'Rosa Neón Vice', color: '#ec4899' },
  { name: 'Cian Miami', color: '#06b6d4' }
];

export const TOP_COLORS = [
  { name: 'Cian Vice', color: '#0ea5e9' },
  { name: 'Rosa Flamingo', color: '#f43f5e' },
  { name: 'Negro Smoking', color: '#09090b' },
  { name: 'Blanco Puro', color: '#f8fafc' },
  { name: 'Dorado Lujo', color: '#eab308' },
  { name: 'Esmeralda', color: '#10b981' },
  { name: 'Púrpura Neón', color: '#8b5cf6' }
];

export const PANTS_COLORS = [
  { name: 'Azul Denim', color: '#1e3a8a' },
  { name: 'Negro Mate', color: '#18181b' },
  { name: 'Beige Chino', color: '#d6c5a0' },
  { name: 'Blanco Resort', color: '#f1f5f9' },
  { name: 'Gris Carbón', color: '#334155' }
];

export const DEFAULT_AVATAR: AvatarConfig = {
  name: 'Tommy',
  gender: 'male',
  skinTone: '#e0ac69',
  hairStyle: 'slick',
  hairColor: '#18181b',
  facialHair: 'stubble',
  topType: 'hawaiian',
  topColor: '#0ea5e9',
  pantsType: 'jeans',
  pantsColor: '#1e3a8a',
  shoesType: 'sneakers',
  shoesColor: '#f8fafc',
  accessory: 'aviators'
};

export const AVATAR_PRESETS: Record<string, AvatarConfig> = {
  tommy: { ...DEFAULT_AVATAR, name: 'Tommy Vice' },
  detective: {
    name: 'Detective Miami',
    gender: 'male',
    skinTone: '#f7d0b3',
    hairStyle: 'fade',
    hairColor: '#3f2212',
    facialHair: 'mustache',
    topType: 'suit',
    topColor: '#f8fafc',
    pantsType: 'chinos',
    pantsColor: '#f1f5f9',
    shoesType: 'loafers',
    shoesColor: '#3f2212',
    accessory: 'sunglasses'
  },
  cartel: {
    name: 'Don Ricardo',
    gender: 'male',
    skinTone: '#c68642',
    hairStyle: 'slick',
    hairColor: '#18181b',
    facialHair: 'beard',
    topType: 'leather',
    topColor: '#09090b',
    pantsType: 'jeans',
    pantsColor: '#18181b',
    shoesType: 'boots',
    shoesColor: '#09090b',
    accessory: 'gold_chain'
  },
  racer: {
    name: 'Street Racer',
    gender: 'male',
    skinTone: '#8d5524',
    hairStyle: 'buzz',
    hairColor: '#ec4899',
    facialHair: 'clean',
    topType: 'tank',
    topColor: '#f43f5e',
    pantsType: 'track',
    pantsColor: '#18181b',
    shoesType: 'sneakers',
    shoesColor: '#eab308',
    accessory: 'watch'
  }
};

/**
 * Procedural contact shadow for character grounding
 */
const shadowGeo = new THREE.CircleGeometry(0.45, 16);
const shadowMat = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.5,
  depthWrite: false
});

/**
 * Builds a customizable 3-12 part Three.js character model
 */
export function buildCustomAvatarMesh(cfg: AvatarConfig = DEFAULT_AVATAR): THREE.Group {
  const charGroup = new THREE.Group();

  // Color parsers
  const parseHex = (hex: string, fallback: number) => {
    try {
      const clean = hex.replace('#', '0x');
      const val = parseInt(clean, 16);
      return isNaN(val) ? fallback : val;
    } catch {
      return fallback;
    }
  };

  const skinMat = new THREE.MeshStandardMaterial({
    color: parseHex(cfg.skinTone, 0xe0ac69),
    roughness: 0.72,
    metalness: 0.05
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: parseHex(cfg.hairColor, 0x18181b),
    roughness: 0.85
  });

  const topMat = new THREE.MeshStandardMaterial({
    color: parseHex(cfg.topColor, 0x0ea5e9),
    roughness: 0.65
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: parseHex(cfg.pantsColor, 0x1e3a8a),
    roughness: 0.75
  });

  const shoeMat = new THREE.MeshStandardMaterial({
    color: parseHex(cfg.shoesColor, 0xf8fafc),
    roughness: 0.5
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.2
  });

  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    metalness: 0.9,
    roughness: 0.1
  });

  // 1. Ground contact shadow disc
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  charGroup.add(shadow);

  // 2. Torso with top garment
  const torsoGeo = new THREE.BoxGeometry(0.46, 0.56, 0.26);
  const torso = new THREE.Mesh(torsoGeo, topMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  charGroup.add(torso);

  // Top Collar / Neck detail
  if (cfg.topType === 'hawaiian') {
    // Open V-neck chest skin showing
    const chestGeo = new THREE.BoxGeometry(0.18, 0.2, 0.04);
    const chest = new THREE.Mesh(chestGeo, skinMat);
    chest.position.set(0, 1.2, -0.12);
    charGroup.add(chest);
  } else if (cfg.topType === 'suit') {
    // Red or Black Tie
    const tieGeo = new THREE.BoxGeometry(0.08, 0.32, 0.03);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 1.12, -0.14);
    charGroup.add(tie);
  }

  // 3. Head
  const headGeo = new THREE.BoxGeometry(0.26, 0.28, 0.26);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.48;
  head.castShadow = true;
  charGroup.add(head);

  // Facial Hair (Stubble, Beard, Mustache)
  if (cfg.facialHair === 'beard') {
    const beardGeo = new THREE.BoxGeometry(0.24, 0.12, 0.14);
    const beard = new THREE.Mesh(beardGeo, hairMat);
    beard.position.set(0, 1.38, -0.08);
    charGroup.add(beard);
  } else if (cfg.facialHair === 'mustache') {
    const stacheGeo = new THREE.BoxGeometry(0.18, 0.04, 0.06);
    const stache = new THREE.Mesh(stacheGeo, hairMat);
    stache.position.set(0, 1.42, -0.14);
    charGroup.add(stache);
  } else if (cfg.facialHair === 'stubble') {
    const stubbleMat = new THREE.MeshStandardMaterial({
      color: parseHex(cfg.skinTone, 0xe0ac69),
      roughness: 0.9
    });
    stubbleMat.color.lerp(new THREE.Color(0x18181b), 0.25);
    const stubGeo = new THREE.BoxGeometry(0.25, 0.08, 0.12);
    const stubble = new THREE.Mesh(stubGeo, stubbleMat);
    stubble.position.set(0, 1.38, -0.08);
    charGroup.add(stubble);
  }

  // 4. Hairstyles
  if (cfg.hairStyle === 'slick') {
    const hairGeo = new THREE.BoxGeometry(0.28, 0.12, 0.3);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.58, 0.02);
    charGroup.add(hair);
  } else if (cfg.hairStyle === 'afro') {
    const hairGeo = new THREE.SphereGeometry(0.24, 12, 10);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.62, 0);
    charGroup.add(hair);
  } else if (cfg.hairStyle === 'fade') {
    const hairGeo = new THREE.BoxGeometry(0.27, 0.08, 0.26);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.6, -0.01);
    charGroup.add(hair);
  } else if (cfg.hairStyle === 'buzz') {
    const hairGeo = new THREE.BoxGeometry(0.27, 0.04, 0.27);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 1.59, 0);
    charGroup.add(hair);
  } else if (cfg.hairStyle === 'cap') {
    // Baseball Cap with visor
    const capMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const capDome = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), capMat);
    capDome.position.set(0, 1.6, 0);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.16), capMat);
    visor.position.set(0, 1.58, -0.2);
    charGroup.add(capDome);
    charGroup.add(visor);
  } else if (cfg.hairStyle === 'bandana') {
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.6 });
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.28), bandMat);
    band.position.set(0, 1.55, 0);
    charGroup.add(band);
  }

  // 5. Accessories
  if (cfg.accessory === 'aviators' || cfg.accessory === 'sunglasses') {
    const glassGeo = new THREE.BoxGeometry(0.24, 0.06, 0.08);
    const shades = new THREE.Mesh(glassGeo, darkGlassMat);
    shades.position.set(0, 1.48, -0.14);
    charGroup.add(shades);
  }
  if (cfg.accessory === 'gold_chain') {
    // 3D Cuban Chain around neck
    const chainGeo = new THREE.TorusGeometry(0.14, 0.025, 8, 16);
    chainGeo.rotateX(Math.PI / 2.5);
    const chain = new THREE.Mesh(chainGeo, goldMat);
    chain.position.set(0, 1.25, -0.04);
    charGroup.add(chain);
  }
  if (cfg.accessory === 'watch') {
    // Gold watch on left wrist
    const watchGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8);
    const watch = new THREE.Mesh(watchGeo, goldMat);
    watch.position.set(-0.32, 0.85, 0);
    charGroup.add(watch);
  }

  // 6. Arms (Sleeves or Bare Skin for tank top)
  const armMat = cfg.topType === 'tank' ? skinMat : topMat;
  const armGeo = new THREE.BoxGeometry(0.12, 0.48, 0.12);
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.32, 1.05, 0);
  leftArm.castShadow = true;
  charGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.32, 1.05, 0);
  rightArm.castShadow = true;
  charGroup.add(rightArm);

  // 7. Legs (Pants or Shorts)
  const legHeight = cfg.pantsType === 'shorts' ? 0.32 : 0.58;
  const legGeo = new THREE.BoxGeometry(0.16, legHeight, 0.16);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.14, 0.48, 0);
  leftLeg.castShadow = true;
  charGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.14, 0.48, 0);
  rightLeg.castShadow = true;
  charGroup.add(rightLeg);

  if (cfg.pantsType === 'shorts') {
    // Bare calves skin
    const calfGeo = new THREE.BoxGeometry(0.14, 0.26, 0.14);
    const leftCalf = new THREE.Mesh(calfGeo, skinMat);
    leftCalf.position.set(-0.14, 0.22, 0);
    const rightCalf = new THREE.Mesh(calfGeo, skinMat);
    rightCalf.position.set(0.14, 0.22, 0);
    charGroup.add(leftCalf);
    charGroup.add(rightCalf);
  }

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.17, 0.12, 0.24);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(-0.14, 0.08, -0.04);
  charGroup.add(leftShoe);

  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0.14, 0.08, -0.04);
  charGroup.add(rightShoe);

  // 8. Weapon Hand Socket & Flash
  const gunGroup = new THREE.Group();
  const barrelGeo = new THREE.BoxGeometry(0.06, 0.08, 0.22);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  gunGroup.add(barrel);
  gunGroup.position.set(0.32, 0.88, -0.16);
  charGroup.add(gunGroup);

  const flashGeo = new THREE.SphereGeometry(0.12, 8, 8);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0 });
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.set(0, 0, -0.2);
  gunGroup.add(flash);

  charGroup.userData = {
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    gunGroup,
    flash,
    walkTime: 0,
    config: cfg
  };

  return charGroup;
}

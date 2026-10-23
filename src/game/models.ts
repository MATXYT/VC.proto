import * as THREE from 'three';
import { buildCustomAvatarMesh, DEFAULT_AVATAR, AvatarConfig } from './avatar';

// Cached materials for performance & zero GC
const rubberMat = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.9,
  metalness: 0.05
});

const rimSilverMat = new THREE.MeshStandardMaterial({
  color: 0xd4d4d8,
  roughness: 0.2,
  metalness: 0.9
});

const rimGoldMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  roughness: 0.25,
  metalness: 0.85
});

const brakeCaliperMat = new THREE.MeshStandardMaterial({
  color: 0xdc2626, // Red Brembo sports brake caliper
  roughness: 0.3,
  metalness: 0.7
});

const glassTintedMat = new THREE.MeshStandardMaterial({
  color: 0x09090b,
  roughness: 0.05,
  metalness: 0.95,
  transparent: true,
  opacity: 0.82
});

const chromeHighMat = new THREE.MeshStandardMaterial({
  color: 0xf8fafc,
  roughness: 0.1,
  metalness: 0.98
});

const matteBlackMat = new THREE.MeshStandardMaterial({
  color: 0x09090b,
  roughness: 0.8,
  metalness: 0.2
});

const headlightGlowMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 2.5,
  roughness: 0.1
});

const amberTurnMat = new THREE.MeshStandardMaterial({
  color: 0xf59e0b,
  emissive: 0xd97706,
  emissiveIntensity: 1.8
});

const taillightGlowMat = new THREE.MeshStandardMaterial({
  color: 0x990000,
  emissive: 0xff0022,
  emissiveIntensity: 2.2,
  roughness: 0.15
});

// Procedural contact shadow
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const contactShadowTex = createContactShadowTexture();
const shadowMat = new THREE.MeshBasicMaterial({
  map: contactShadowTex,
  transparent: true,
  opacity: 0.58,
  depthWrite: false
});

/**
 * Creates high-fidelity Wheel Assembly with decoupled Steer Group and Spin Group.
 * This completely avoids gimbal locking / wobbling during combined steering and spinning!
 */
export interface WheelAssembly {
  steerGroup: THREE.Group; // Pivots around Y for steering
  spinGroup: THREE.Group;  // Rolls around X for driving
}

export function createWheelAssembly(radius: number = 0.38, width: number = 0.28, isGold: boolean = false): WheelAssembly {
  const steerGroup = new THREE.Group();
  const spinGroup = new THREE.Group();

  // 1. Rubber Tire with tread rim
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, rubberMat);
  tire.castShadow = true;
  spinGroup.add(tire);

  // 2. Alloy Rim Base
  const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 1.05, 14);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, isGold ? rimGoldMat : rimSilverMat);
  spinGroup.add(rim);

  // 3. 5-Spoke Star Design
  const spokeGeo = new THREE.BoxGeometry(width * 1.06, radius * 0.58, 0.05);
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(spokeGeo, isGold ? rimGoldMat : rimSilverMat);
    spoke.rotation.x = (i * Math.PI * 2) / 5;
    spinGroup.add(spoke);
  }

  // 4. Brake Disc & Red Caliper (stays stationary relative to steering, doesn't spin with wheel)
  const discGeo = new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width * 0.3, 12);
  discGeo.rotateZ(Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, chromeHighMat);
  steerGroup.add(disc);

  const caliperGeo = new THREE.BoxGeometry(width * 0.35, radius * 0.25, radius * 0.22);
  const caliper = new THREE.Mesh(caliperGeo, brakeCaliperMat);
  caliper.position.set(0, radius * 0.3, 0);
  steerGroup.add(caliper);

  steerGroup.add(spinGroup);

  return { steerGroup, spinGroup };
}

/**
 * Procedural AAA 3D Vehicle Models (3-12+ parts)
 */
export function createVehicleMesh(type: string = 'sport', paintColorHex: number = 0xdc2626): THREE.Group {
  const carGroup = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({
    color: paintColorHex,
    roughness: 0.18,
    metalness: 0.8
  });

  // 1. Under-car contact shadow
  const shadowGeo = new THREE.PlaneGeometry(2.8, 5.4);
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  carGroup.add(shadow);

  // Wheels placement holders
  const wheels: {
    fl: WheelAssembly;
    fr: WheelAssembly;
    rl: WheelAssembly;
    rr: WheelAssembly;
  } = {} as unknown as typeof wheels;

  // ==========================================
  // SUPERCAR CHEETAH GT (Ferrari Testarossa style)
  // ==========================================
  if (type === 'sport') {
    // Lower Chassis with front splitter and rear diffuser
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.45, 4.5), paintMat);
    lowerBody.position.y = 0.42;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    carGroup.add(lowerBody);

    // Aerodynamic Sloped Hood
    const hoodGeo = new THREE.BoxGeometry(1.95, 0.2, 1.8);
    const hood = new THREE.Mesh(hoodGeo, paintMat);
    hood.position.set(0, 0.58, -1.25);
    hood.rotation.x = 0.08;
    hood.castShadow = true;
    carGroup.add(hood);

    // Front Splitter / Air Dam
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.08, 0.4), matteBlackMat);
    splitter.position.set(0, 0.22, -2.25);
    carGroup.add(splitter);

    // Sleek Greenhouse / Tinted Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.48, 2.1), glassTintedMat);
    cabin.position.set(0, 0.82, -0.1);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Roof panel
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.06, 1.6), paintMat);
    roof.position.set(0, 1.08, -0.1);
    roof.castShadow = true;
    carGroup.add(roof);

    // Iconic Side Intake Strakes (Testarossa style)
    const strakeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const strakeL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), strakeMat);
      strakeL.position.set(-1.04, 0.42 + i * 0.07, 0.4);
      carGroup.add(strakeL);

      const strakeR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), strakeMat);
      strakeR.position.set(1.04, 0.42 + i * 0.07, 0.4);
      carGroup.add(strakeR);
    }

    // Rear Engine Louvers
    for (let i = 0; i < 5; i++) {
      const louver = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.03, 0.12), matteBlackMat);
      louver.position.set(0, 0.72 + i * 0.05, 0.8 + i * 0.24);
      carGroup.add(louver);
    }

    // High GT Wing Spoiler with metallic uprights
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.38), paintMat);
    wing.position.set(0, 1.05, 2.05);
    wing.castShadow = true;
    carGroup.add(wing);

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35), chromeHighMat);
    postL.position.set(-0.65, 0.9, 2.05);
    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35), chromeHighMat);
    postR.position.set(0.65, 0.9, 2.05);
    carGroup.add(postL);
    carGroup.add(postR);

    // Headlights (Twin recessed xenon projectors)
    const hlGeo = new THREE.BoxGeometry(0.38, 0.12, 0.08);
    const hlL = new THREE.Mesh(hlGeo, headlightGlowMat);
    hlL.position.set(-0.72, 0.52, -2.25);
    const hlR = new THREE.Mesh(hlGeo, headlightGlowMat);
    hlR.position.set(0.72, 0.52, -2.25);
    carGroup.add(hlL);
    carGroup.add(hlR);

    // Amber front turn signals
    const turnL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.08), amberTurnMat);
    turnL.position.set(-0.95, 0.45, -2.24);
    const turnR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.08), amberTurnMat);
    turnR.position.set(0.95, 0.45, -2.24);
    carGroup.add(turnL);
    carGroup.add(turnR);

    // Full-width continuous neon red taillight bar
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 0.08), taillightGlowMat);
    tailBar.position.set(0, 0.58, 2.25);
    carGroup.add(tailBar);

    // Quad Chrome Exhaust Pipes
    const exGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.28, 8);
    exGeo.rotateX(Math.PI / 2);
    [-0.6, -0.45, 0.45, 0.6].forEach((x) => {
      const ex = new THREE.Mesh(exGeo, chromeHighMat);
      ex.position.set(x, 0.28, 2.3);
      carGroup.add(ex);
    });

    // Wheels
    const wX = 0.98;
    const wY = 0.38;
    const wFz = -1.35;
    const wRz = 1.35;

    wheels.fl = createWheelAssembly(0.38, 0.28, false);
    wheels.fl.steerGroup.position.set(-wX, wY, wFz);
    carGroup.add(wheels.fl.steerGroup);

    wheels.fr = createWheelAssembly(0.38, 0.28, false);
    wheels.fr.steerGroup.position.set(wX, wY, wFz);
    carGroup.add(wheels.fr.steerGroup);

    wheels.rl = createWheelAssembly(0.38, 0.32, false); // wider rear tires
    wheels.rl.steerGroup.position.set(-wX, wY, wRz);
    carGroup.add(wheels.rl.steerGroup);

    wheels.rr = createWheelAssembly(0.38, 0.32, false);
    wheels.rr.steerGroup.position.set(wX, wY, wRz);
    carGroup.add(wheels.rr.steerGroup);
  }
  // ==========================================
  // MUSCLE CAR SABRE TURBO
  // ==========================================
  else if (type === 'muscle') {
    // Beefy lower chassis
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.62, 4.7), paintMat);
    body.position.y = 0.5;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Heavy Chrome front bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.25), chromeHighMat);
    bumper.position.set(0, 0.35, -2.4);
    carGroup.add(bumper);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.54, 2.35), glassTintedMat);
    cabin.position.set(0, 0.94, -0.15);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Fastback Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 2.2), paintMat);
    roof.position.set(0, 1.22, -0.15);
    roof.castShadow = true;
    carGroup.add(roof);

    // Chrome Blower / Shaker Hood Scoop protruding from hood!
    const scoopBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.7), chromeHighMat);
    scoopBase.position.set(0, 0.9, -1.3);
    carGroup.add(scoopBase);

    // Triple butterflies / intake holes
    const holeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8);
    holeGeo.rotateX(Math.PI / 2);
    [-0.14, 0, 0.14].forEach((x) => {
      const hole = new THREE.Mesh(holeGeo, matteBlackMat);
      hole.position.set(x, 0.92, -1.66);
      carGroup.add(hole);
    });

    // Dual Racing Stripes down the center
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });
    [-0.16, 0.16].forEach((x) => {
      const stripeHood = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 1.8), stripeMat);
      stripeHood.position.set(x, 0.82, -1.3);
      carGroup.add(stripeHood);

      const stripeRoof = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 2.2), stripeMat);
      stripeRoof.position.set(x, 1.26, -0.15);
      carGroup.add(stripeRoof);
    });

    // Quad Round Chrome Headlights
    [-0.75, -0.55, 0.55, 0.75].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), headlightGlowMat);
      hl.geometry.rotateX(Math.PI / 2);
      hl.position.set(x, 0.58, -2.36);
      carGroup.add(hl);
    });

    // Dual horizontal taillights
    [-0.65, 0.65].forEach((x) => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.14, 0.08), taillightGlowMat);
      tl.position.set(x, 0.58, 2.36);
      carGroup.add(tl);
    });

    // Side Lake-Pipe Chrome Exhausts
    const sideExGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8);
    sideExGeo.rotateX(Math.PI / 2);
    const exL = new THREE.Mesh(sideExGeo, chromeHighMat);
    exL.position.set(-1.12, 0.28, 0.2);
    const exR = new THREE.Mesh(sideExGeo, chromeHighMat);
    exR.position.set(1.12, 0.28, 0.2);
    carGroup.add(exL);
    carGroup.add(exR);

    // Deep-Dish Mag Wheels
    wheels.fl = createWheelAssembly(0.4, 0.28, true);
    wheels.fl.steerGroup.position.set(-1.02, 0.4, -1.4);
    carGroup.add(wheels.fl.steerGroup);

    wheels.fr = createWheelAssembly(0.4, 0.28, true);
    wheels.fr.steerGroup.position.set(1.02, 0.4, -1.4);
    carGroup.add(wheels.fr.steerGroup);

    wheels.rl = createWheelAssembly(0.44, 0.36, true); // Big fat rear muscle tires
    wheels.rl.steerGroup.position.set(-1.02, 0.44, 1.4);
    carGroup.add(wheels.rl.steerGroup);

    wheels.rr = createWheelAssembly(0.44, 0.36, true);
    wheels.rr.steerGroup.position.set(1.02, 0.44, 1.4);
    carGroup.add(wheels.rr.steerGroup);
  }
  // ==========================================
  // POLICE CRUISER INTERCEPTOR (VCPD)
  // ==========================================
  else if (type === 'police') {
    // Body (Black & White VCPD patrol styling)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.5 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.5 });

    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.7), bodyMat);
    lowerBody.position.y = 0.5;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    carGroup.add(lowerBody);

    // White Center Doors
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 1.8), whiteDoorMat);
    doorL.position.set(-1.06, 0.52, -0.1);
    const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.55, 1.8), whiteDoorMat);
    doorR.position.set(1.06, 0.52, -0.1);
    carGroup.add(doorL);
    carGroup.add(doorR);

    // Gold Police Star Badge on door
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.5 });
    const badgeL = new THREE.Mesh(new THREE.CircleGeometry(0.18, 6), badgeMat);
    badgeL.rotation.y = -Math.PI / 2;
    badgeL.position.set(-1.09, 0.55, -0.1);
    const badgeR = new THREE.Mesh(new THREE.CircleGeometry(0.18, 6), badgeMat);
    badgeR.rotation.y = Math.PI / 2;
    badgeR.position.set(1.09, 0.55, -0.1);
    carGroup.add(badgeL);
    carGroup.add(badgeR);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.58, 2.35), glassTintedMat);
    cabin.position.set(0, 0.95, -0.15);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // White Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.06, 2.2), whiteDoorMat);
    roof.position.set(0, 1.25, -0.15);
    roof.castShadow = true;
    carGroup.add(roof);

    // Front Push Bumper / Bull Bar with rubber pads
    const bullBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.14), matteBlackMat);
    bullBar.position.set(0, 0.45, -2.42);
    carGroup.add(bullBar);

    // Police Siren Lightbar (Alternating Red/Blue Strobe)
    const barFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.22), chromeHighMat);
    barFrame.position.set(0, 1.32, -0.15);
    carGroup.add(barFrame);

    const blueSirenMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0088ff,
      emissiveIntensity: 3.0
    });
    const redSirenMat = new THREE.MeshStandardMaterial({
      color: 0xff0022,
      emissive: 0xff0022,
      emissiveIntensity: 3.0
    });

    const blueSiren = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.18), blueSirenMat);
    blueSiren.position.set(-0.3, 1.38, -0.15);
    const redSiren = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.18), redSirenMat);
    redSiren.position.set(0.3, 1.38, -0.15);
    carGroup.add(blueSiren);
    carGroup.add(redSiren);
    carGroup.userData.sirens = { blue: blueSiren, red: redSiren };

    // Spotlight on driver's A-pillar
    const spotlight = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8), chromeHighMat);
    spotlight.geometry.rotateZ(Math.PI / 4);
    spotlight.position.set(-0.88, 1.05, -1.05);
    carGroup.add(spotlight);

    // Headlights & Taillights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), headlightGlowMat);
    hlL.position.set(-0.72, 0.52, -2.36);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), headlightGlowMat);
    hlR.position.set(0.72, 0.52, -2.36);
    carGroup.add(hlL);
    carGroup.add(hlR);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), taillightGlowMat);
    tlL.position.set(-0.72, 0.56, 2.36);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), taillightGlowMat);
    tlR.position.set(0.72, 0.56, 2.36);
    carGroup.add(tlL);
    carGroup.add(tlR);

    // Heavy duty steel wheels with chrome hubcaps
    wheels.fl = createWheelAssembly(0.4, 0.28, false);
    wheels.fl.steerGroup.position.set(-0.98, 0.4, -1.4);
    carGroup.add(wheels.fl.steerGroup);

    wheels.fr = createWheelAssembly(0.4, 0.28, false);
    wheels.fr.steerGroup.position.set(0.98, 0.4, -1.4);
    carGroup.add(wheels.fr.steerGroup);

    wheels.rl = createWheelAssembly(0.4, 0.28, false);
    wheels.rl.steerGroup.position.set(-0.98, 0.4, 1.4);
    carGroup.add(wheels.rl.steerGroup);

    wheels.rr = createWheelAssembly(0.4, 0.28, false);
    wheels.rr.steerGroup.position.set(0.98, 0.4, 1.4);
    carGroup.add(wheels.rr.steerGroup);
  }
  // ==========================================
  // SWAT ARMORED ENFORCER TRUCK
  // ==========================================
  else {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.1, 5.2), armorMat);
    body.position.y = 0.85;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Roof Turret Ring Hatch
    const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 12), matteBlackMat);
    hatch.position.set(0, 1.48, -0.4);
    carGroup.add(hatch);

    // Armored Window slits
    const windowSlit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.2, 0.1), glassTintedMat);
    windowSlit.position.set(0, 1.1, -2.62);
    carGroup.add(windowSlit);

    // Reinforced front ramming cowcatcher
    const plow = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.2), matteBlackMat);
    plow.position.set(0, 0.5, -2.65);
    carGroup.add(plow);

    // Heavy duty offroad wheels
    wheels.fl = createWheelAssembly(0.48, 0.36, false);
    wheels.fl.steerGroup.position.set(-1.12, 0.48, -1.6);
    carGroup.add(wheels.fl.steerGroup);

    wheels.fr = createWheelAssembly(0.48, 0.36, false);
    wheels.fr.steerGroup.position.set(1.12, 0.48, -1.6);
    carGroup.add(wheels.fr.steerGroup);

    wheels.rl = createWheelAssembly(0.48, 0.36, false);
    wheels.rl.steerGroup.position.set(-1.12, 0.48, 1.6);
    carGroup.add(wheels.rl.steerGroup);

    wheels.rr = createWheelAssembly(0.48, 0.36, false);
    wheels.rr.steerGroup.position.set(1.12, 0.48, 1.6);
    carGroup.add(wheels.rr.steerGroup);
  }

  // Attach wheels to userData for decoupled roll and steer
  carGroup.userData.wheels = wheels;

  return carGroup;
}

/**
 * Character mesh helper supporting both custom AvatarConfig and numeric hex color
 */
export function createCharacterMesh(configOrColor?: AvatarConfig | number | Partial<AvatarConfig>): THREE.Group {
  if (typeof configOrColor === 'number') {
    const hex = '#' + configOrColor.toString(16).padStart(6, '0');
    return buildCustomAvatarMesh({ ...DEFAULT_AVATAR, topColor: hex });
  }
  if (configOrColor && typeof configOrColor === 'object') {
    return buildCustomAvatarMesh({ ...DEFAULT_AVATAR, ...configOrColor });
  }
  return buildCustomAvatarMesh(DEFAULT_AVATAR);
}

/**
 * Procedural Palm Tree with 8 curved tropical fronds
 */
export function createPalmTree(): THREE.Group {
  const palm = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x785338, roughness: 0.9 });
  const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65, side: THREE.DoubleSide });

  // Segmented curved trunk
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 6.2, 8);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 3.1;
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  palm.add(trunk);

  // 8 Angled fronds
  const frondGeo = new THREE.PlaneGeometry(0.9, 3.6);
  frondGeo.translate(0, 1.8, 0);

  for (let i = 0; i < 8; i++) {
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.set(0, 6.1, 0);
    frond.rotation.y = (i * Math.PI * 2) / 8;
    frond.rotation.x = 0.88;
    frond.castShadow = true;
    palm.add(frond);
  }

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 8), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  palm.add(shadow);

  return palm;
}

/**
 * Streetlamp
 */
export function createStreetLamp(): THREE.Group {
  const lamp = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.7 });

  const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.2, 8);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 3.1;
  pole.castShadow = true;
  lamp.add(pole);

  const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6);
  armGeo.rotateZ(Math.PI / 2.5);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0.55, 6.0, 0);
  lamp.add(arm);

  const bulbGeo = new THREE.BoxGeometry(0.38, 0.16, 0.38);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff7ed,
    emissive: 0xfef08a,
    emissiveIntensity: 2.2,
    roughness: 0.2
  });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(1.2, 5.8, 0);
  lamp.add(bulb);

  return lamp;
}

/**
 * Stunt Jump Ramp with high-visibility chevron hazard stripes
 */
export function createStuntRamp(): THREE.Group {
  const ramp = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0, 2.0);
  shape.lineTo(5.0, 0);
  shape.closePath();

  const extrudeSettings = { depth: 4.5, bevelEnabled: false };
  const rampGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  rampGeo.center();

  const rampMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.6,
    metalness: 0.2
  });

  const mesh = new THREE.Mesh(rampGeo, rampMat);
  mesh.position.y = 1.0;
  mesh.castShadow = true;
  ramp.add(mesh);

  return ramp;
}

/**
 * Pickups (Health, Armor, Cash, Weapon)
 */
export function createPickup(type: 'health' | 'armor' | 'cash' | 'weapon'): THREE.Group {
  const group = new THREE.Group();

  if (type === 'health') {
    const hBar = new THREE.BoxGeometry(0.65, 0.22, 0.22);
    const vBar = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 1.5
    });
    group.add(new THREE.Mesh(hBar, mat));
    group.add(new THREE.Mesh(vBar, mat));
  } else if (type === 'armor') {
    const geo = new THREE.OctahedronGeometry(0.42);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 1.5,
      metalness: 0.8
    });
    group.add(new THREE.Mesh(geo, mat));
  } else if (type === 'cash') {
    const geo = new THREE.BoxGeometry(0.55, 0.28, 0.35);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.3
    });
    group.add(new THREE.Mesh(geo, mat));
  } else {
    const geo = new THREE.BoxGeometry(0.65, 0.25, 0.35);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.5,
      metalness: 0.9
    });
    group.add(new THREE.Mesh(geo, mat));
  }

  const ringGeo = new THREE.RingGeometry(0.35, 0.5, 16);
  const ringMat = new THREE.MeshBasicMaterial({
    color: type === 'health' ? 0xef4444 : (type === 'armor' ? 0x3b82f6 : 0x10b981),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -0.55;
  group.add(ring);

  group.userData = { type, baseY: 0.85, spinRate: 2.0 };
  return group;
}

/**
 * Rooftop Wooden Water Tower with steel truss legs and iron hoops
 */
export function createWaterTower(): THREE.Group {
  const tower = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x785338, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });

  // 4 Steel truss legs
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.8, 6);
  const legAngles = [-0.9, 0.9];
  for (const lx of legAngles) {
    for (const lz of legAngles) {
      const leg = new THREE.Mesh(legGeo, ironMat);
      leg.position.set(lx, 1.9, lz);
      leg.castShadow = true;
      tower.add(leg);
    }
  }

  // Cross braces
  const braceMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.7 });
  const ringPlatform = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.15, 12), braceMat);
  ringPlatform.position.y = 3.8;
  ringPlatform.castShadow = true;
  tower.add(ringPlatform);

  // Wooden Cedar Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 2.6, 16), woodMat);
  barrel.position.y = 5.2;
  barrel.castShadow = true;
  tower.add(barrel);

  // Iron hoops around barrel
  for (const hy of [4.3, 5.2, 6.1]) {
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.38, 0.08, 16), ironMat);
    hoop.position.y = hy;
    tower.add(hoop);
  }

  // Conical roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.0, 16), woodMat);
  roof.position.y = 7.0;
  roof.castShadow = true;
  tower.add(roof);

  return tower;
}

/**
 * Miami Art Deco Lifeguard Tower on Stilts
 */
export function createLifeguardTower(): THREE.Group {
  const tower = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8 });
  const tealMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.5 });
  const coralMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });

  // 4 Stilts
  const stiltGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8);
  for (const sx of [-1.1, 1.1]) {
    for (const sz of [-1.1, 1.1]) {
      const stilt = new THREE.Mesh(stiltGeo, woodMat);
      stilt.position.set(sx, 1.5, sz);
      stilt.castShadow = true;
      tower.add(stilt);
    }
  }

  // Platform deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 2.8), tealMat);
  deck.position.y = 3.1;
  deck.castShadow = true;
  tower.add(deck);

  // Railing
  const railGeo = new THREE.BoxGeometry(2.7, 0.8, 0.06);
  const railF = new THREE.Mesh(railGeo, whiteMat);
  railF.position.set(0, 3.6, 1.35);
  tower.add(railF);
  const railB = new THREE.Mesh(railGeo, whiteMat);
  railB.position.set(0, 3.6, -1.35);
  tower.add(railB);

  // Lookout Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), coralMat);
  cabin.position.set(0, 4.25, 0);
  cabin.castShadow = true;
  tower.add(cabin);

  // Wide wrap-around windows
  const winMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 });
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.65, 1.95), winMat);
  win.position.set(0, 4.4, 0);
  tower.add(win);

  // Cantilevered overhang roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, 2.5), tealMat);
  roof.position.set(0, 5.35, 0);
  roof.castShadow = true;
  tower.add(roof);

  // Access ladder / steps
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.1), woodMat);
  ladder.position.set(0, 1.5, 1.8);
  ladder.rotation.x = -0.4;
  tower.add(ladder);

  return tower;
}

/**
 * Beach Parasol Umbrella with lounge chair
 */
export function createBeachUmbrella(color: number = 0xf43f5e): THREE.Group {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
  const fabricMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7, side: THREE.DoubleSide });

  // Tilted wooden pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 8), poleMat);
  pole.position.set(0, 1.4, 0);
  pole.rotation.z = 0.12;
  pole.castShadow = true;
  group.add(pole);

  // Umbrella canopy
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.6, 12, 1, true), fabricMat);
  canopy.position.set(0.18, 2.7, 0);
  canopy.rotation.z = 0.12;
  canopy.castShadow = true;
  group.add(canopy);

  // Striped rim accent
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.04, 6, 16), whiteMat);
  rim.position.set(0.18, 2.4, 0);
  rim.rotation.x = Math.PI / 2;
  rim.rotation.y = 0.12;
  group.add(rim);

  // Reclined Beach Chaise Lounge
  const loungerMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 });
  const loungeBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 1.8), loungerMat);
  loungeBase.position.set(-0.6, 0.12, 0.2);
  loungeBase.castShadow = true;
  group.add(loungeBase);

  const loungeBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.7), loungerMat);
  loungeBack.position.set(-0.6, 0.42, -0.5);
  loungeBack.rotation.x = 0.6;
  group.add(loungeBack);

  return group;
}

/**
 * City Cast Iron Fire Hydrant
 */
export function createFireHydrant(): THREE.Group {
  const hydrant = new THREE.Group();
  const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.6 });
  const silverMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.85 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10), redMat);
  body.position.y = 0.35;
  body.castShadow = true;
  hydrant.add(body);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), redMat);
  cap.position.y = 0.7;
  hydrant.add(cap);

  const nut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), silverMat);
  nut.position.y = 0.86;
  hydrant.add(nut);

  // Side nozzle caps
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), silverMat);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.y = 0.42;
  hydrant.add(nozzle);

  return hydrant;
}

/**
 * Commercial Alley Dumpster
 */
export function createDumpster(): THREE.Group {
  const dumpster = new THREE.Group();
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, metalness: 0.3 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });

  const bin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.2), greenMat);
  bin.position.y = 0.65;
  bin.castShadow = true;
  bin.receiveShadow = true;
  dumpster.add(bin);

  // Plastic Lids angled
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.08, 1.25), blackMat);
  lid.position.set(0, 1.23, 0);
  lid.rotation.x = -0.06;
  dumpster.add(lid);

  // Forklift side channels
  const channelGeo = new THREE.BoxGeometry(0.12, 0.16, 1.0);
  const chL = new THREE.Mesh(channelGeo, blackMat);
  chL.position.set(-0.95, 0.55, 0);
  dumpster.add(chL);
  const chR = new THREE.Mesh(channelGeo, blackMat);
  chR.position.set(0.95, 0.55, 0);
  dumpster.add(chR);

  return dumpster;
}

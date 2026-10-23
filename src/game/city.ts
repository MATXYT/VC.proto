import * as THREE from 'three';
import {
  createPalmTree,
  createStreetLamp,
  createStuntRamp,
  createPickup,
  createWaterTower,
  createLifeguardTower,
  createBeachUmbrella,
  createFireHydrant,
  createDumpster
} from './models';

export interface BuildingDef {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: number;
  name?: string;
  hasNeon?: boolean;
  hasAwning?: boolean;
  hasWaterTower?: boolean;
}

export interface CityData {
  buildings: BuildingDef[];
  spawnX: number;
  spawnZ: number;
  collisionBoxes: THREE.Box3[];
}

/**
 * Procedural asphalt texture with road markings
 */
function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base with subtle aggregate speckles
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle road grain
  ctx.fillStyle = '#1c1e22';
  for (let i = 0; i < 2000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Double yellow divider down center (horizontal)
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 252, 512, 4);
  ctx.fillRect(0, 260, 512, 4);

  // Dashed white lane dividers
  ctx.fillStyle = '#f8fafc';
  for (let x = 0; x < 512; x += 64) {
    ctx.fillRect(x + 12, 126, 32, 4);
    ctx.fillRect(x + 12, 386, 32, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Procedural sidewalk concrete texture
 */
function createSidewalkTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(0, 0, 256, 256);

  // Concrete expansion joints
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(128, 0, 128, 256);
  ctx.strokeRect(0, 128, 256, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Procedural Building Facade Windows Texture
 */
function createBuildingTexture(windowColor: string = '#fef08a'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);

  // Window grid
  ctx.fillStyle = windowColor;
  for (let y = 16; y < 240; y += 48) {
    for (let x = 16; x < 240; x += 40) {
      if (Math.random() > 0.15) {
        ctx.fillRect(x, y, 24, 32);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene: THREE.Scene): CityData {
  const roadTex = createRoadTexture();
  const sidewalkTex = createSidewalkTexture();
  const collisionBoxes: THREE.Box3[] = [];

  // Ground plane: 420x420 meters
  const groundGeo = new THREE.PlaneGeometry(420, 420);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.95,
    metalness: 0.05
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Ocean Water along East Coast (Vice City tropical beach)
  const oceanGeo = new THREE.PlaneGeometry(420, 140);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.85,
    transparent: true,
    opacity: 0.9
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, -0.15, 170);
  scene.add(ocean);

  // Golden Sand Beach Strip
  const beachGeo = new THREE.PlaneGeometry(420, 36);
  const beachMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.95
  });
  const beach = new THREE.Mesh(beachGeo, beachMat);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.02, 98);
  beach.receiveShadow = true;
  scene.add(beach);

  // Roads Grid:
  const ROAD_WIDTH = 18;
  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.7,
    metalness: 0.2
  });

  const eastWestRoadZ = [70, 0, -70, -140];
  eastWestRoadZ.forEach((z) => {
    const rGeo = new THREE.PlaneGeometry(380, ROAD_WIDTH);
    const road = new THREE.Mesh(rGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.03, z);
    road.receiveShadow = true;
    scene.add(road);
  });

  const northSouthRoadX = [-120, -40, 40, 120];
  northSouthRoadX.forEach((x) => {
    const rGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 260);
    const road = new THREE.Mesh(rGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.rotation.z = Math.PI / 2;
    road.position.set(x, 0.035, -35);
    road.receiveShadow = true;
    scene.add(road);
  });

  // Sidewalk material
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    roughness: 0.85
  });

  // Buildings definitions
  const buildings: BuildingDef[] = [
    // Ocean Drive Block
    { x: -15, z: 35, w: 22, d: 24, h: 42, color: 0xf43f5e, name: 'OCEAN VIEW HOTEL', hasNeon: true, hasAwning: true },
    { x: 15, z: 35, w: 22, d: 24, h: 56, color: 0x06b6d4, name: 'THE MALIBU CLUB', hasNeon: true, hasAwning: true, hasWaterTower: true },

    // Ocean Drive West & East
    { x: -80, z: 35, w: 28, d: 26, h: 48, color: 0x8b5cf6, name: 'CORAL TOWER', hasAwning: true },
    { x: 80, z: 35, w: 28, d: 26, h: 65, color: 0xec4899, name: 'VICE CASINO', hasNeon: true, hasWaterTower: true },

    // Central Business District
    { x: -80, z: -35, w: 32, d: 30, h: 88, color: 0x1e293b, name: 'VICE BANK TOWER' },
    { x: 0, z: -35, w: 34, d: 30, h: 105, color: 0x0f172a, name: 'METROPOLIS CENTER' },
    { x: 80, z: -35, w: 30, d: 28, h: 74, color: 0x334155, name: 'FINANCIAL PLAZA' },

    // North Commercial Strip
    { x: -80, z: -105, w: 30, d: 26, h: 32, color: 0xd97706, name: 'AMMU-NATION', hasNeon: true, hasAwning: true },
    { x: 0, z: -105, w: 34, d: 28, h: 28, color: 0x059669, name: 'PAY N SPRAY', hasNeon: true },
    { x: 80, z: -105, w: 30, d: 26, h: 36, color: 0x7c3aed, name: 'AUTO DEALERSHIP', hasWaterTower: true },

    // Outskirts Warehouses & Resorts
    { x: -160, z: 0, w: 36, d: 40, h: 22, color: 0x475569, name: 'PORT DOCKS', hasWaterTower: true },
    { x: -160, z: -70, w: 36, d: 40, h: 24, color: 0x334155, name: 'WAREHOUSE 4' },
    { x: 160, z: 0, w: 36, d: 40, h: 38, color: 0x0284c7, name: 'MARINA RESORT', hasAwning: true },
    { x: 160, z: -70, w: 36, d: 40, h: 44, color: 0x6366f1, name: 'PALM HEIGHTS' }
  ];

  buildings.forEach((b) => {
    const bGroup = new THREE.Group();

    // 1. Concrete sidewalk plinth underneath building
    const plinthGeo = new THREE.BoxGeometry(b.w + 4, 0.25, b.d + 4);
    const plinth = new THREE.Mesh(plinthGeo, sidewalkMat);
    plinth.position.set(0, 0.125, 0);
    plinth.receiveShadow = true;
    bGroup.add(plinth);

    // 2. Main Building Tower
    const towerGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const winTex = createBuildingTexture(b.hasNeon ? '#f472b6' : '#fef08a');
    const towerMat = new THREE.MeshStandardMaterial({
      color: b.color,
      map: winTex,
      roughness: 0.4,
      metalness: 0.35
    });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, b.h / 2 + 0.25, 0);
    tower.castShadow = true;
    tower.receiveShadow = true;
    bGroup.add(tower);

    // 3. Art Deco Stepped Crown (Iconic 1980s Miami architecture)
    const crown1 = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.8, 3.5, b.d * 0.8),
      new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.5, metalness: 0.4 })
    );
    crown1.position.set(0, b.h + 1.75, 0);
    crown1.castShadow = true;
    bGroup.add(crown1);

    const crown2 = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.5, 2.5, b.d * 0.5),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    crown2.position.set(0, b.h + 4.5, 0);
    crown2.castShadow = true;
    bGroup.add(crown2);

    // 4. Rooftop Radio Antenna Spire with blinking red safety beacon
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.15, 6.0, 6);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    const mast = new THREE.Mesh(mastGeo, mastMat);
    mast.position.set(0, b.h + 8.5, 0);
    bGroup.add(mast);

    const beaconGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 2.5
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, b.h + 11.5, 0);
    bGroup.add(beacon);

    // 5. Entrance Fabric Awning
    if (b.hasAwning) {
      const awningGeo = new THREE.BoxGeometry(7.0, 0.4, 3.2);
      const awningMat = new THREE.MeshStandardMaterial({
        color: b.color === 0xf43f5e ? 0x06b6d4 : 0xf43f5e,
        roughness: 0.6
      });
      const awning = new THREE.Mesh(awningGeo, awningMat);
      awning.position.set(0, 3.4, b.d / 2 + 1.6);
      awning.rotation.x = 0.15;
      awning.castShadow = true;
      bGroup.add(awning);
    }

    // 6. Rooftop Water Tower
    if (b.hasWaterTower) {
      const wt = createWaterTower();
      wt.position.set(b.w * 0.25, b.h + 0.25, -b.d * 0.2);
      bGroup.add(wt);
    }

    // 7. Neon Sign on Facade
    if (b.hasNeon && b.name) {
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sctx = signCanvas.getContext('2d')!;
      sctx.fillStyle = '#09090b';
      sctx.fillRect(0, 0, 512, 128);

      sctx.font = 'bold 36px Impact, sans-serif';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.fillStyle = '#f43f5e';
      sctx.shadowColor = '#fb7185';
      sctx.shadowBlur = 18;
      sctx.fillText(b.name, 256, 64);

      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      const signGeo = new THREE.PlaneGeometry(b.w * 0.72, 3.4);
      const signMat = new THREE.MeshStandardMaterial({
        map: signTex,
        emissive: 0xffffff,
        emissiveMap: signTex,
        emissiveIntensity: 1.8,
        roughness: 0.2
      });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 10, b.d / 2 + 0.12);
      bGroup.add(signMesh);
    }

    bGroup.position.set(b.x, 0, b.z);
    scene.add(bGroup);

    // Register collision box for vehicle/player collision resolution
    const box = new THREE.Box3(
      new THREE.Vector3(b.x - b.w / 2, 0, b.z - b.d / 2),
      new THREE.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2)
    );
    collisionBoxes.push(box);
  });

  // Tropical Palm Trees
  for (let x = -160; x <= 160; x += 22) {
    const palm = createPalmTree();
    palm.position.set(x, 0, 79);
    palm.rotation.y = Math.random() * Math.PI * 2;
    scene.add(palm);

    const palm2 = createPalmTree();
    palm2.position.set(x, 0, 61);
    palm2.rotation.y = Math.random() * Math.PI * 2;
    scene.add(palm2);
  }

  // Streetlamps along main avenues
  for (let x = -150; x <= 150; x += 36) {
    const lamp = createStreetLamp();
    lamp.position.set(x, 0, 70 - 10);
    scene.add(lamp);

    const lamp2 = createStreetLamp();
    lamp2.position.set(x, 0, 0 - 10);
    scene.add(lamp2);
  }

  // Beach Lifeguard Towers along Ocean Coast
  [-70, 0, 70].forEach((lx) => {
    const lg = createLifeguardTower();
    lg.position.set(lx, 0, 108);
    lg.rotation.y = Math.PI;
    scene.add(lg);
  });

  // Beach Parasols and Loungers
  const umbrellaColors = [0xf43f5e, 0x06b6d4, 0xf59e0b, 0x10b981];
  for (let x = -130; x <= 130; x += 20) {
    const col = umbrellaColors[Math.abs(x) % umbrellaColors.length];
    const umb = createBeachUmbrella(col);
    umb.position.set(x + (Math.random() - 0.5) * 4, 0, 94 + (Math.random() - 0.5) * 4);
    umb.rotation.y = Math.random() * Math.PI * 2;
    scene.add(umb);
  }

  // Fire Hydrants at street intersections
  [-125, -45, 35, 115].forEach((hx) => {
    [76, 6, -64].forEach((hz) => {
      const hyd = createFireHydrant();
      hyd.position.set(hx, 0, hz);
      scene.add(hyd);
    });
  });

  // Commercial Dumpsters in back alleys
  const dumpstersPos = [
    { x: -5, z: 20 },
    { x: 35, z: 20 },
    { x: -95, z: -20 },
    { x: 65, z: -90 },
    { x: -140, z: -15 }
  ];
  dumpstersPos.forEach((dp) => {
    const dump = createDumpster();
    dump.position.set(dp.x, 0, dp.z);
    dump.rotation.y = (Math.PI / 2) * (Math.random() > 0.5 ? 1 : 0);
    scene.add(dump);
  });

  // Stunt jump ramps
  const ramp1 = createStuntRamp();
  ramp1.position.set(0, 0, 58);
  ramp1.rotation.y = Math.PI;
  scene.add(ramp1);

  const ramp2 = createStuntRamp();
  ramp2.position.set(60, 0, -12);
  ramp2.rotation.y = Math.PI / 2;
  scene.add(ramp2);

  // Strategic Pickups
  const pickups = [
    { type: 'health' as const, x: -10, z: 20 },
    { type: 'armor' as const, x: 20, z: 20 },
    { type: 'cash' as const, x: 0, z: 88 },
    { type: 'cash' as const, x: -60, z: -20 },
    { type: 'weapon' as const, x: -65, z: -90 },
    { type: 'weapon' as const, x: 15, z: -90 }
  ];

  pickups.forEach((p) => {
    const item = createPickup(p.type);
    item.position.set(p.x, 0.8, p.z);
    scene.add(item);
  });

  return {
    buildings,
    spawnX: 0,
    spawnZ: 70, // Spawns directly on sunny Ocean Drive
    collisionBoxes
  };
}


import * as THREE from 'three';

export type MissionType = 'courier' | 'bounty' | 'steal_car' | 'police_evasion' | 'street_race';

export interface MissionCheckpoint {
  x: number;
  z: number;
  name: string;
}

export interface Mission {
  id: string;
  title: string;
  giver: string;
  type: MissionType;
  description: string;
  targetPos: { x: number; z: number };
  timeLimit: number; // in seconds (0 for no timer)
  timeRemaining: number;
  rewardCash: number;
  rewardXp: number;
  checkpoints?: MissionCheckpoint[];
  currentCheckpointIdx: number;
  status: 'available' | 'active' | 'completed' | 'failed';
  targetVehicleType?: string;
  targetHealth?: number;
}

const MISSION_GIVERS = [
  { name: 'Ricardo Díaz', title: 'Jefe del Cartel de la Mansión' },
  { name: 'Coronel Cortez', title: 'Capitán del Yate Privado' },
  { name: 'Ken Rosenberg', title: 'Abogado de Vice Beach' },
  { name: 'Phil Cassidy', title: 'Traficante de Armamento Pesado' },
  { name: 'Avery Carrington', title: 'Magnate de Rascacielos' }
];

const DESTINATION_POIS: MissionCheckpoint[] = [
  { x: 0, z: 70, name: 'Ocean Drive Boulevard' },
  { x: -15, z: 35, name: 'Ocean View Hotel' },
  { x: 15, z: 35, name: 'The Malibu Club' },
  { x: 80, z: 35, name: 'Vice Casino' },
  { x: 0, z: -35, name: 'Torre Metropolis Center' },
  { x: -80, z: -35, name: 'Banco Central de Vice' },
  { x: -80, z: -105, name: 'Ammu-Nation Norte' },
  { x: 0, z: -105, name: 'Taller Pay N Spray' },
  { x: -160, z: 0, name: 'Almacén Portuario Docks' },
  { x: 160, z: 0, name: 'Marina Náutica Resort' }
];

/**
 * Procedurally generates a unique dynamic mission tailored to player's current position and level
 */
export function generateDynamicMission(
  playerRep: number = 0,
  playerX: number = 0,
  playerZ: number = 70
): Mission {
  const giver = MISSION_GIVERS[Math.floor(Math.random() * MISSION_GIVERS.length)];
  const types: MissionType[] = ['courier', 'bounty', 'steal_car', 'police_evasion', 'street_race'];
  const type = types[Math.floor(Math.random() * types.length)];

  // Choose POI distant from player
  const validPois = DESTINATION_POIS.filter((p) => {
    const distSq = (p.x - playerX) ** 2 + (p.z - playerZ) ** 2;
    return distSq > 40 * 40; // at least 40m away
  });
  const targetPoi = validPois.length > 0
    ? validPois[Math.floor(Math.random() * validPois.length)]
    : DESTINATION_POIS[0];

  const missionId = 'm_' + Math.random().toString(36).substring(2, 9);
  const baseReward = 5000 + Math.floor(Math.random() * 8000) + playerRep * 500;

  let title = '';
  let description = '';
  let timeLimit = 75;
  let checkpoints: MissionCheckpoint[] | undefined = undefined;
  let targetVehicleType: string | undefined = undefined;

  switch (type) {
    case 'courier':
      title = `Entrega Urgente a ${targetPoi.name}`;
      description = `Lleva el maletín confidencial a ${targetPoi.name} antes de que se agote el tiempo. Evita a la policía.`;
      timeLimit = 85;
      break;
    case 'bounty':
      title = `Eliminar Objetivo del Cartel`;
      description = `Localiza el vehículo rival cerca de ${targetPoi.name} y embístelo hasta neutralizarlo.`;
      timeLimit = 110;
      targetVehicleType = 'muscle';
      break;
    case 'steal_car':
      title = `Encargo Especial de Vehículo`;
      description = `Roba el superdeportivo aparcado en ${targetPoi.name} y llévalo intacto al garaje de Pay N Spray.`;
      timeLimit = 100;
      targetVehicleType = 'sport';
      break;
    case 'police_evasion':
      title = `Despiste a Máxima Velocidad`;
      description = `Atrae la atención de la policía y sobrevive con 3 estrellas de búsqueda durante 45 segundos sin ser arrestado.`;
      timeLimit = 50;
      break;
    case 'street_race':
      title = `Carrera Clandestina Ocean Drive`;
      description = `Cruza los 3 puntos de control a máxima velocidad con tu vehículo antes del límite de tiempo.`;
      timeLimit = 65;
      checkpoints = [
        DESTINATION_POIS[0],
        DESTINATION_POIS[2],
        DESTINATION_POIS[4]
      ];
      break;
  }

  return {
    id: missionId,
    title,
    giver: giver.name,
    type,
    description,
    targetPos: { x: targetPoi.x, z: targetPoi.z },
    timeLimit,
    timeRemaining: timeLimit,
    rewardCash: baseReward,
    rewardXp: Math.floor(baseReward / 25),
    checkpoints,
    currentCheckpointIdx: 0,
    status: 'available',
    targetVehicleType,
    targetHealth: 100
  };
}

/**
 * Creates 3D In-World Glowing Waypoint Beacon (Golden pillar + rotating marker)
 */
export function createWaypointBeacon(): THREE.Group {
  const beacon = new THREE.Group();

  // 1. Vertical golden light beam (cylinder with emissive glow)
  const beamGeo = new THREE.CylinderGeometry(0.8, 1.4, 25, 16);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 12.5;
  beacon.add(beam);

  // 2. Spinning Diamond Marker in center
  const markerGeo = new THREE.OctahedronGeometry(1.2);
  const markerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 2.0,
    metalness: 0.9,
    roughness: 0.1
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.y = 2.5;
  beacon.add(marker);

  // 3. Ground Ripple Rings
  const ringGeo = new THREE.RingGeometry(1.8, 2.4, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  beacon.add(ring);

  beacon.userData = { marker, ring, time: 0 };
  return beacon;
}

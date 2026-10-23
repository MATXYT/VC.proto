/**
 * Pure logic and physics routines for 3D GTA Web:
 * - Vehicle kinematics (acceleration, steering, drift slip, braking)
 * - Pedestrian / Player movement (walking, sprint, jump, collision)
 * - Wanted level progression and decay
 * - Weapons and damage balance
 * - City layout geometry data
 */

export interface VehicleConfig {
  maxSpeed: number;
  reverseSpeed: number;
  acceleration: number;
  brakeForce: number;
  turnSpeed: number;
  driftSlip: number;
  mass: number;
  width: number;
  length: number;
  height: number;
}

export const VEHICLE_TYPES: Record<string, VehicleConfig> = {
  sport: {
    maxSpeed: 38,
    reverseSpeed: 14,
    acceleration: 22,
    brakeForce: 35,
    turnSpeed: 2.4,
    driftSlip: 0.94,
    mass: 1200,
    width: 2.1,
    length: 4.6,
    height: 1.25
  },
  muscle: {
    maxSpeed: 34,
    reverseSpeed: 12,
    acceleration: 20,
    brakeForce: 28,
    turnSpeed: 2.1,
    driftSlip: 0.90,
    mass: 1600,
    width: 2.2,
    length: 4.8,
    height: 1.35
  },
  police: {
    maxSpeed: 36,
    reverseSpeed: 14,
    acceleration: 24,
    brakeForce: 36,
    turnSpeed: 2.3,
    driftSlip: 0.93,
    mass: 1500,
    width: 2.15,
    length: 4.7,
    height: 1.45
  },
  truck: {
    maxSpeed: 24,
    reverseSpeed: 8,
    acceleration: 12,
    brakeForce: 24,
    turnSpeed: 1.5,
    driftSlip: 0.82,
    mass: 2800,
    width: 2.4,
    length: 6.0,
    height: 2.2
  }
};

export interface VehicleState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  steerAngle: number;
  slip: number;
  health: number;
  type: string;
}

/**
 * Step vehicle physics using clamped delta time.
 */
export function stepVehicle(
  state: VehicleState,
  inputs: {
    throttle: number; // -1 (reverse/brake) to +1 (forward)
    steer: number;    // -1 (left) to +1 (right)
    handbrake: boolean;
  },
  dt: number,
  config: VehicleConfig = VEHICLE_TYPES[state.type] || VEHICLE_TYPES.sport
): VehicleState {
  const clampedDt = Math.min(dt, 0.05);

  let newSpeed = state.speed;
  const isMovingForward = newSpeed > 0.1;
  const isMovingReverse = newSpeed < -0.1;

  if (inputs.throttle > 0) {
    if (newSpeed < 0) {
      // Braking while reversing
      newSpeed += config.brakeForce * clampedDt;
      if (newSpeed > 0) newSpeed = 0;
    } else {
      // Accelerating forward
      newSpeed += config.acceleration * inputs.throttle * clampedDt;
      if (newSpeed > config.maxSpeed) newSpeed = config.maxSpeed;
    }
  } else if (inputs.throttle < 0) {
    if (isMovingForward) {
      // Braking while moving forward
      newSpeed -= config.brakeForce * clampedDt;
      if (newSpeed < 0) newSpeed = 0;
    } else {
      // Reversing
      newSpeed += config.acceleration * inputs.throttle * 0.65 * clampedDt;
      if (newSpeed < -config.reverseSpeed) newSpeed = -config.reverseSpeed;
    }
  } else {
    // Coasting friction / drag
    const drag = 6.0 * clampedDt;
    if (newSpeed > drag) newSpeed -= drag;
    else if (newSpeed < -drag) newSpeed += drag;
    else newSpeed = 0;
  }

  // Handbrake application
  let currentSlip = 0.98;
  if (inputs.handbrake) {
    newSpeed *= Math.max(0, 1 - 3.5 * clampedDt);
    currentSlip = config.driftSlip;
  }

  // Steering: sensitivity decreases slightly at very high speeds for stability
  const speedRatio = Math.min(1, Math.abs(newSpeed) / 15);
  const targetSteer = inputs.steer * (config.turnSpeed * (1 - speedRatio * 0.3));
  const newSteer = state.steerAngle + (targetSteer - state.steerAngle) * Math.min(1, 10 * clampedDt);

  // Turn rate is proportional to forward/backward motion
  let newYaw = state.yaw;
  if (Math.abs(newSpeed) > 0.1) {
    const forwardSign = newSpeed >= 0 ? 1 : -1;
    newYaw -= newSteer * forwardSign * clampedDt * (inputs.handbrake ? 1.6 : 1.0);
  }

  // Position update based on heading
  const forwardX = -Math.sin(newYaw);
  const forwardZ = -Math.cos(newYaw);

  const newX = state.x + forwardX * newSpeed * clampedDt;
  const newZ = state.z + forwardZ * newSpeed * clampedDt;

  return {
    ...state,
    x: newX,
    z: newZ,
    yaw: newYaw,
    speed: newSpeed,
    steerAngle: newSteer,
    slip: currentSlip
  };
}

export interface PlayerPhysicsState {
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  isGrounded: boolean;
  health: number;
  armor: number;
  stamina: number;
}

/**
 * Step player foot physics (WASD, sprint, jump, gravity)
 */
export function stepPlayer(
  player: PlayerPhysicsState,
  inputs: {
    moveForward: number; // -1 to 1
    moveRight: number;   // -1 to 1
    sprint: boolean;
    jump: boolean;
    cameraYaw: number;
  },
  dt: number
): PlayerPhysicsState {
  const clampedDt = Math.min(dt, 0.05);
  const GRAVITY = -24;
  const JUMP_IMPULSE = 8.5;

  let speed = 4.5; // Walk
  let newStamina = player.stamina;

  if (inputs.sprint && (inputs.moveForward !== 0 || inputs.moveRight !== 0) && player.stamina > 5) {
    speed = 8.8; // Sprint
    newStamina = Math.max(0, player.stamina - 15 * clampedDt);
  } else {
    newStamina = Math.min(100, player.stamina + 20 * clampedDt);
  }

  // Compute world movement direction relative to cameraYaw
  let newX = player.x;
  let newZ = player.z;
  let newYaw = player.yaw;

  const moveLen = Math.hypot(inputs.moveForward, inputs.moveRight);
  if (moveLen > 0.01) {
    const normForward = inputs.moveForward / moveLen;
    const normRight = inputs.moveRight / moveLen;

    const sinCam = Math.sin(inputs.cameraYaw);
    const cosCam = Math.cos(inputs.cameraYaw);

    // Forward vector in world is (-sin, -cos), Right is (cos, -sin)
    const worldDirX = -sinCam * normForward + cosCam * normRight;
    const worldDirZ = -cosCam * normForward - sinCam * normRight;

    newX += worldDirX * speed * clampedDt;
    newZ += worldDirZ * speed * clampedDt;

    // Face direction of travel smoothly
    newYaw = Math.atan2(-worldDirX, -worldDirZ);
  }

  // Vertical physics (gravity & jumping)
  let newVy = player.vy + GRAVITY * clampedDt;
  let newY = player.y + newVy * clampedDt;
  let isGrounded = false;

  const GROUND_Y = 0.0;
  if (newY <= GROUND_Y) {
    newY = GROUND_Y;
    newVy = 0;
    isGrounded = true;
  }

  if (inputs.jump && isGrounded) {
    newVy = JUMP_IMPULSE;
    isGrounded = false;
  }

  return {
    ...player,
    x: newX,
    y: newY,
    z: newZ,
    vy: newVy,
    yaw: newYaw,
    isGrounded,
    stamina: newStamina
  };
}

/**
 * Circle / AABB distance check for vehicle entry & collision
 */
export function isNear(x1: number, z1: number, x2: number, z2: number, threshold: number): boolean {
  const dx = x1 - x2;
  const dz = z1 - z2;
  return dx * dx + dz * dz <= threshold * threshold;
}

/**
 * Wanted Level calculation
 */
export interface WantedState {
  level: number;       // 0 to 5 stars
  crimePoints: number; // 0 to 100 per star
  cooldownTimer: number;
}

export function addCrime(wanted: WantedState, severity: 'minor' | 'theft' | 'assault' | 'cop_kill'): WantedState {
  const pointsMap = {
    minor: 30,
    theft: 60,
    assault: 90,
    cop_kill: 180
  };

  const pointsToAdd = pointsMap[severity] || 30;
  let newPoints = wanted.crimePoints + pointsToAdd;
  let newLevel = Math.min(5, Math.floor(newPoints / 100));

  return {
    level: Math.max(1, newLevel),
    crimePoints: newPoints,
    cooldownTimer: 15.0 // 15 seconds without crimes to begin decay
  };
}

export function updateWantedDecay(wanted: WantedState, dt: number, isPursued: boolean): WantedState {
  if (wanted.level === 0) return wanted;
  if (isPursued) {
    return { ...wanted, cooldownTimer: 12.0 };
  }

  let timer = wanted.cooldownTimer - dt;
  if (timer <= 0) {
    const pointsDecay = 25 * dt;
    const newPoints = Math.max(0, wanted.crimePoints - pointsDecay);
    const newLevel = Math.min(5, Math.floor(newPoints / 100));
    return {
      level: newLevel,
      crimePoints: newPoints,
      cooldownTimer: 0
    };
  }

  return {
    ...wanted,
    cooldownTimer: timer
  };
}

export interface WeaponSpec {
  name: string;
  type: 'melee' | 'pistol' | 'smg' | 'shotgun';
  damage: number;
  fireRate: number; // shots per second
  range: number;
  ammoCap: number;
  recoil: number;
}

export const WEAPON_REGISTRY: Record<string, WeaponSpec> = {
  fists: {
    name: 'Puños (Fists)',
    type: 'melee',
    damage: 25,
    fireRate: 2.2,
    range: 2.4,
    ammoCap: Infinity,
    recoil: 0.1
  },
  pistol: {
    name: '9mm Pistol',
    type: 'pistol',
    damage: 34,
    fireRate: 3.5,
    range: 45,
    ammoCap: 90,
    recoil: 0.35
  },
  smg: {
    name: 'Micro SMG',
    type: 'smg',
    damage: 22,
    fireRate: 9.0,
    range: 40,
    ammoCap: 250,
    recoil: 0.25
  },
  shotgun: {
    name: 'Combat Shotgun',
    type: 'shotgun',
    damage: 85,
    fireRate: 1.2,
    range: 22,
    ammoCap: 40,
    recoil: 0.7
  }
};

/**
 * Apply damage taking armor into account.
 */
export function applyDamage(
  health: number,
  armor: number,
  rawDamage: number
): { health: number; armor: number; dead: boolean } {
  let remDamage = rawDamage;
  let newArmor = armor;
  let newHealth = health;

  if (newArmor > 0) {
    const absorbed = Math.min(newArmor, remDamage * 0.7);
    newArmor -= absorbed;
    remDamage -= absorbed;
  }

  newHealth = Math.max(0, newHealth - remDamage);

  return {
    health: Math.round(newHealth),
    armor: Math.round(newArmor),
    dead: newHealth <= 0
  };
}

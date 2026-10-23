import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stepVehicle,
  stepPlayer,
  isNear,
  addCrime,
  updateWantedDecay,
  applyDamage,
  VEHICLE_TYPES
} from './physics';

test('Vehicle accelerates up to maxSpeed when throttle is positive', () => {
  let car = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    speed: 0,
    steerAngle: 0,
    slip: 1,
    health: 100,
    type: 'sport'
  };

  for (let i = 0; i < 20; i++) {
    car = stepVehicle(car, { throttle: 1, steer: 0, handbrake: false }, 0.05);
  }

  assert.ok(car.speed > 10, 'Car should have accelerated forward');
  assert.ok(car.speed <= VEHICLE_TYPES.sport.maxSpeed, 'Car speed should not exceed max speed');
  assert.ok(car.z < 0, 'Car heading along forward z should have moved forward in -Z coordinate space');
});

test('Vehicle steering right (steer = +1) turns car towards positive X', () => {
  let car = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    speed: 20,
    steerAngle: 0,
    slip: 1,
    health: 100,
    type: 'sport'
  };

  // Step while steering right (steer = 1)
  for (let i = 0; i < 10; i++) {
    car = stepVehicle(car, { throttle: 1, steer: 1, handbrake: false }, 0.05);
  }

  // Turning right should steer car towards +X (x > 0)
  assert.ok(car.x > 0, `Car should move towards positive X when steering right, got x=${car.x}`);
});

test('Vehicle steering left (steer = -1) turns car towards negative X', () => {
  let car = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    speed: 20,
    steerAngle: 0,
    slip: 1,
    health: 100,
    type: 'sport'
  };

  for (let i = 0; i < 10; i++) {
    car = stepVehicle(car, { throttle: 1, steer: -1, handbrake: false }, 0.05);
  }

  assert.ok(car.x < 0, `Car should move towards negative X when steering left, got x=${car.x}`);
});

test('Vehicle handbrake triggers drift slip and decelerates', () => {
  let car = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    speed: 25,
    steerAngle: 0,
    slip: 1,
    health: 100,
    type: 'sport'
  };

  const stepped = stepVehicle(car, { throttle: 0, steer: 1, handbrake: true }, 0.05);
  assert.equal(stepped.slip, VEHICLE_TYPES.sport.driftSlip, 'Slip factor matches drift slip value');
  assert.ok(stepped.speed < 25, 'Handbrake slows the car down');
});

test('Player movement and sprint consume stamina', () => {
  const player = {
    x: 0,
    y: 0,
    z: 0,
    vy: 0,
    yaw: 0,
    isGrounded: true,
    health: 100,
    armor: 100,
    stamina: 100
  };

  const moved = stepPlayer(
    player,
    { moveForward: 1, moveRight: 0, sprint: true, jump: false, cameraYaw: 0 },
    0.05
  );

  assert.ok(moved.stamina < 100, 'Sprinting consumes stamina');
  assert.ok(moved.z < 0, 'Moving forward advances in world position');
});

test('Player jump launches with upward velocity', () => {
  const player = {
    x: 0,
    y: 0,
    z: 0,
    vy: 0,
    yaw: 0,
    isGrounded: true,
    health: 100,
    armor: 0,
    stamina: 100
  };

  const jumped = stepPlayer(
    player,
    { moveForward: 0, moveRight: 0, sprint: false, jump: true, cameraYaw: 0 },
    0.05
  );

  assert.ok(jumped.vy > 0, 'Jump gives positive vertical impulse');
  assert.equal(jumped.isGrounded, false, 'Player is airborne after jumping');
});

test('Wanted level accumulates and decays when not pursued', () => {
  let wanted = { level: 0, crimePoints: 0, cooldownTimer: 0 };
  wanted = addCrime(wanted, 'theft');
  assert.ok(wanted.level >= 1, 'Car theft adds wanted stars');
  assert.equal(wanted.cooldownTimer, 15);

  wanted = addCrime(wanted, 'cop_kill');
  assert.ok(wanted.crimePoints >= 240, 'Killing a cop adds massive crime points');
  assert.ok(wanted.level >= 2, 'Crime points increase wanted star level');

  wanted = updateWantedDecay(wanted, 16.0, false);
  assert.ok(wanted.crimePoints < 240, 'Decay timer reduces crime points when unpursued');
});

test('Damage calculation prioritizes armor absorption', () => {
  const result = applyDamage(100, 50, 40);
  assert.ok(result.armor < 50, 'Armor absorbed part of the hit');
  assert.ok(result.health < 100, 'Remaining damage affected health');
  assert.equal(result.dead, false);

  const fatal = applyDamage(20, 0, 50);
  assert.equal(fatal.dead, true);
  assert.equal(fatal.health, 0);
});

test('isNear correctly calculates distance threshold', () => {
  assert.equal(isNear(0, 0, 2, 2, 3), true);
  assert.equal(isNear(0, 0, 10, 10, 5), false);
});

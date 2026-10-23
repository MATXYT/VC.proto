/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import {
  stepVehicle,
  stepPlayer,
  isNear,
  addCrime,
  updateWantedDecay,
  applyDamage,
  VehicleState,
  PlayerPhysicsState,
  WantedState,
  WEAPON_REGISTRY
} from './game/physics';
import { createVehicleMesh } from './game/models';
import { buildCity } from './game/city';
import { InputManager } from './game/controls';
import { MultiplayerClient, RemotePlayer } from './game/multiplayer';
import { soundEngine } from './game/audio';
import { AvatarConfig, DEFAULT_AVATAR, buildCustomAvatarMesh } from './game/avatar';
import { Mission, generateDynamicMission, createWaypointBeacon } from './game/missions';
import {
  PlayerProgression,
  DEFAULT_PROGRESSION,
  addSkillXp
} from './game/progression';

import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { TouchOverlay } from './components/TouchOverlay';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { AvatarCustomizer } from './components/AvatarCustomizer';
import { PhoneMenu } from './components/PhoneMenu';

type GameState = 'title' | 'playing' | 'paused' | 'gameover';

// Scratch math helpers outside the render loop for zero-GC execution
const _vec3A = new THREE.Vector3();
const _vec3CamTarget = new THREE.Vector3();

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);

  // High-level Game State Machine
  const [gameState, setGameState] = useState<GameState>('title');
  const [gameOverReason, setGameOverReason] = useState<'wasted' | 'busted'>('wasted');
  const [cashLost, setCashLost] = useState(0);

  // Avatar Customization State
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [showAvatarCustomizer, setShowAvatarCustomizer] = useState(false);

  // Character Progression & Economy State
  const [progression, setProgression] = useState<PlayerProgression>(DEFAULT_PROGRESSION);
  const [showPhoneMenu, setShowPhoneMenu] = useState(false);

  // Dynamic Missions State
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [availableMissions, setAvailableMissions] = useState<Mission[]>(() => [
    generateDynamicMission(1, 0, 70),
    generateDynamicMission(1, 0, 70),
    generateDynamicMission(1, 0, 70)
  ]);

  // HUD State (synced at throttled intervals from simulation)
  const [hudState, setHudState] = useState({
    health: 100,
    armor: 100,
    stamina: 100,
    cash: 25000,
    wantedLevel: 0,
    weapon: 'pistol',
    ammo: 90,
    inVehicle: false,
    vehicleSpeed: 0,
    vehicleHealth: 100,
    gear: 1,
    nearVehicle: false,
    isGamepadActive: false,
    playerPos: { x: 0, z: 70, yaw: 0 }
  });

  const [remotePlayersMap, setRemotePlayersMap] = useState<Map<string, RemotePlayer>>(new Map());

  // Input & Multiplayer Managers
  const inputManagerRef = useRef<InputManager | null>(null);
  const mpClientRef = useRef<MultiplayerClient | null>(null);

  // Mutable Simulation State in Refs (bypasses React re-renders)
  const simRef = useRef({
    state: 'title' as GameState,
    avatarConfig: DEFAULT_AVATAR,
    progression: DEFAULT_PROGRESSION,
    activeMission: null as Mission | null,
    player: {
      x: 0,
      y: 0,
      z: 70,
      vy: 0,
      yaw: 0,
      isGrounded: true,
      health: 100,
      armor: 100,
      stamina: 100
    } as PlayerPhysicsState,
    wanted: {
      level: 0,
      crimePoints: 0,
      cooldownTimer: 0
    } as WantedState,
    currentWeaponKey: 'pistol',
    weapons: {
      fists: { ammo: Infinity },
      pistol: { ammo: 90 },
      smg: { ammo: 250 },
      shotgun: { ammo: 40 }
    } as Record<string, { ammo: number }>,
    inVehicle: false,
    currentVehicleIndex: -1,
    cameraAngle: { yaw: 0, pitch: 0.25, dist: 5.5 },
    vehicles: [] as Array<{
      state: VehicleState;
      mesh: THREE.Group;
      isTraffic?: boolean;
    }>,
    playerMesh: null as THREE.Group | null,
    waypointBeacon: null as THREE.Group | null,
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    collisionBoxes: [] as THREE.Box3[],
    lastHudSync: 0,
    lastShotTime: 0,
    lastSkillTime: 0,
    lastPropertyIncomeTime: 0,
    titleTourAngle: 0,
    cameraShake: 0
  });

  // Start Game transition
  const handleStartGame = useCallback((playerName: string) => {
    const sim = simRef.current;
    sim.state = 'playing';
    setGameState('playing');
    document.body.dataset.state = 'playing';

    if (mpClientRef.current) {
      mpClientRef.current.myName = playerName;
    }

    mountRef.current?.requestPointerLock?.();
  }, []);

  // Update Avatar Config and rebuild in-scene mesh
  const handleSaveAvatar = useCallback((newConfig: AvatarConfig) => {
    setAvatarConfig(newConfig);
    const sim = simRef.current;
    sim.avatarConfig = newConfig;

    if (sim.scene && sim.playerMesh) {
      sim.scene.remove(sim.playerMesh);
      const newMesh = buildCustomAvatarMesh(newConfig);
      newMesh.position.set(sim.player.x, sim.player.y, sim.player.z);
      newMesh.rotation.y = sim.player.yaw;
      newMesh.visible = !sim.inVehicle;
      sim.scene.add(newMesh);
      sim.playerMesh = newMesh;
    }

    if (mpClientRef.current) {
      mpClientRef.current.myName = newConfig.name;
    }
  }, []);

  // Pause toggle
  const handlePauseToggle = useCallback(() => {
    const sim = simRef.current;
    if (sim.state === 'playing') {
      sim.state = 'paused';
      setGameState('paused');
      document.body.dataset.state = 'paused';
      document.exitPointerLock?.();
      soundEngine.stopEngine();
    } else if (sim.state === 'paused') {
      sim.state = 'playing';
      setGameState('playing');
      document.body.dataset.state = 'playing';
      mountRef.current?.requestPointerLock?.();
    }
  }, []);

  // Phone toggle
  const handleTogglePhone = useCallback(() => {
    setShowPhoneMenu((prev) => {
      const next = !prev;
      if (next) {
        document.exitPointerLock?.();
      } else {
        mountRef.current?.requestPointerLock?.();
      }
      return next;
    });
  }, []);

  // Mission actions
  const handleAcceptMission = useCallback((mission: Mission) => {
    const active = { ...mission, status: 'active' as const };
    setActiveMission(active);
    simRef.current.activeMission = active;

    if (simRef.current.waypointBeacon) {
      simRef.current.waypointBeacon.position.set(mission.targetPos.x, 0, mission.targetPos.z);
      simRef.current.waypointBeacon.visible = true;
    }
    soundEngine.playHorn();
  }, []);

  const handleAbandonMission = useCallback(() => {
    setActiveMission(null);
    simRef.current.activeMission = null;
    if (simRef.current.waypointBeacon) {
      simRef.current.waypointBeacon.visible = false;
    }
  }, []);

  // Spawn vehicle beside player from Garaje
  const handleSpawnGarageVehicle = useCallback((type: 'sport' | 'muscle' | 'police' | 'truck') => {
    const sim = simRef.current;
    if (!sim.scene) return;

    // Position 4m in front of player
    const spawnX = sim.player.x - Math.sin(sim.player.yaw) * 4.5;
    const spawnZ = sim.player.z - Math.cos(sim.player.yaw) * 4.5;

    const colors: Record<string, number> = {
      sport: 0x06b6d4, // Cyan sport
      muscle: 0xf59e0b, // Gold muscle
      police: 0xffffff,
      truck: 0x334155
    };

    const mesh = createVehicleMesh(type, colors[type] || 0xef4444);
    mesh.position.set(spawnX, 0, spawnZ);
    mesh.rotation.y = sim.player.yaw;
    sim.scene.add(mesh);

    sim.vehicles.unshift({
      state: {
        x: spawnX,
        y: 0,
        z: spawnZ,
        yaw: sim.player.yaw,
        speed: 0,
        steerAngle: 0,
        slip: 1,
        health: 100,
        type
      },
      mesh
    });

    soundEngine.playCash();
  }, []);

  // Reset player / vehicle position
  const handleReset = useCallback(() => {
    const sim = simRef.current;
    sim.player.x = 0;
    sim.player.y = 0;
    sim.player.z = 70;
    sim.player.vy = 0;
    sim.inVehicle = false;
    sim.currentVehicleIndex = -1;
    if (sim.playerMesh) sim.playerMesh.visible = true;

    if (sim.state === 'paused') {
      sim.state = 'playing';
      setGameState('playing');
      document.body.dataset.state = 'playing';
    }
  }, []);

  // Respawn after Wasted / Busted
  const handleRespawn = useCallback(() => {
    const sim = simRef.current;
    sim.player.health = 100;
    sim.player.armor = 50;
    sim.player.x = -15;
    sim.player.y = 0;
    sim.player.z = 50;
    sim.player.vy = 0;
    sim.inVehicle = false;
    sim.currentVehicleIndex = -1;
    sim.wanted = { level: 0, crimePoints: 0, cooldownTimer: 0 };
    if (sim.playerMesh) sim.playerMesh.visible = true;

    sim.state = 'playing';
    setGameState('playing');
    document.body.dataset.state = 'playing';
  }, []);

  const handleRadioToggle = useCallback(() => {
    return soundEngine.toggleRadio();
  }, []);

  // Three.js Mount & Game Loop Lifecycle
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect software WebGL from GPU renderer string (never UA)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Three.js WebGLRenderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Scene and Studio Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf472b6);
    scene.fog = new THREE.FogExp2(0xf472b6, 0.008);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Camera
    const camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.2,
      600
    );
    camera.position.set(0, 15, 95);

    // 5. Lighting Rig
    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    sunLight.position.set(80, 100, 60);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 280;
    const d = 90;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.2);
    scene.add(hemiLight);

    // 6. Build 3D City
    const cityData = buildCity(scene);
    simRef.current.collisionBoxes = cityData.collisionBoxes;

    // 7. Spawn Player Avatar Mesh (using AvatarConfig)
    const playerMesh = buildCustomAvatarMesh(simRef.current.avatarConfig);
    playerMesh.position.set(simRef.current.player.x, 0, simRef.current.player.z);
    scene.add(playerMesh);
    simRef.current.playerMesh = playerMesh;

    // 8. 3D In-World Waypoint Beacon for Dynamic Missions
    const waypointBeacon = createWaypointBeacon();
    waypointBeacon.visible = false;
    scene.add(waypointBeacon);
    simRef.current.waypointBeacon = waypointBeacon;

    // 9. Spawn 3D Vehicles
    const initialVehicles = [
      { type: 'sport', color: 0xec4899, x: 0, z: 62, yaw: Math.PI / 2 },
      { type: 'muscle', color: 0xf59e0b, x: 38, z: 25, yaw: 0 },
      { type: 'police', color: 0xffffff, x: -75, z: -15, yaw: Math.PI },
      { type: 'police', color: 0xffffff, x: 60, z: 70, yaw: -Math.PI / 2 },
      { type: 'truck', color: 0x1e293b, x: -110, z: 70, yaw: Math.PI / 2 },
      { type: 'sport', color: 0x06b6d4, x: 22, z: 25, yaw: Math.PI }
    ];

    const vehicleObjects: Array<{ state: VehicleState; mesh: THREE.Group }> = [];

    initialVehicles.forEach((v) => {
      const mesh = createVehicleMesh(v.type, v.color);
      mesh.position.set(v.x, 0, v.z);
      mesh.rotation.y = v.yaw;
      scene.add(mesh);

      vehicleObjects.push({
        state: {
          x: v.x,
          y: 0,
          z: v.z,
          yaw: v.yaw,
          speed: 0,
          steerAngle: 0,
          slip: 1,
          health: 100,
          type: v.type
        },
        mesh
      });
    });

    simRef.current.vehicles = vehicleObjects;

    // 10. Input & Multiplayer
    const inputMgr = new InputManager();
    inputManagerRef.current = inputMgr;

    const mpClient = new MultiplayerClient(scene);
    mpClientRef.current = mpClient;

    simRef.current.scene = scene;
    simRef.current.camera = camera;
    simRef.current.renderer = renderer;

    // Tab key listener for Phone
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        handleTogglePhone();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Autostart URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autostart') === '1') {
      handleStartGame('Player 1');
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 11. 60 FPS Game Simulation & Rendering Loop
    let lastTime = performance.now();
    let animFrameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animFrameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          animFrameId = window.setTimeout(cb, 60);
        }
      };
      animFrameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const sim = simRef.current;
      const inputs = inputMgr.poll();

      if (inputs.pause && sim.state === 'playing') {
        handlePauseToggle();
      }
      if (inputs.resetVehicle) {
        handleReset();
      }

      // Weapon switching
      if (inputs.weaponSlot) {
        const weaponKeys = ['fists', 'pistol', 'smg', 'shotgun'];
        if (inputs.weaponSlot === 99) {
          const currentIdx = weaponKeys.indexOf(sim.currentWeaponKey);
          sim.currentWeaponKey = weaponKeys[(currentIdx + 1) % weaponKeys.length];
        } else if (inputs.weaponSlot >= 1 && inputs.weaponSlot <= 4) {
          sim.currentWeaponKey = weaponKeys[inputs.weaponSlot - 1];
        }
      }

      soundEngine.updateSiren(sim.wanted.level);

      // Animate 3D Waypoint Beacon
      if (sim.waypointBeacon && sim.waypointBeacon.visible) {
        sim.waypointBeacon.userData.time = (sim.waypointBeacon.userData.time || 0) + dt;
        sim.waypointBeacon.userData.marker.rotation.y += dt * 1.8;
        sim.waypointBeacon.userData.marker.position.y =
          2.5 + Math.sin(sim.waypointBeacon.userData.time * 2.5) * 0.4;
      }

      // ============================================
      // SIMULATION LOGIC
      // ============================================
      if (sim.state === 'playing') {
        // Camera rotation
        sim.cameraAngle.yaw -= inputs.lookDeltaX * 0.0035;
        sim.cameraAngle.pitch = Math.max(
          -0.2,
          Math.min(1.1, sim.cameraAngle.pitch + inputs.lookDeltaY * 0.0035)
        );

        // Check nearest vehicle
        let nearestVehIdx = -1;
        let minDistSq = 30.25; // 5.5m range
        for (let i = 0; i < sim.vehicles.length; i++) {
          const v = sim.vehicles[i];
          const distSq =
            (sim.player.x - v.state.x) * (sim.player.x - v.state.x) +
            (sim.player.z - v.state.z) * (sim.player.z - v.state.z);
          if (distSq < minDistSq) {
            minDistSq = distSq;
            nearestVehIdx = i;
          }
        }

        // Enter / Exit Vehicle Trigger
        if (inputs.enterVehicle) {
          if (sim.inVehicle) {
            sim.inVehicle = false;
            const currentCar = sim.vehicles[sim.currentVehicleIndex];
            if (currentCar) {
              sim.player.x = currentCar.state.x - Math.cos(currentCar.state.yaw) * 2.2;
              sim.player.z = currentCar.state.z + Math.sin(currentCar.state.yaw) * 2.2;
              sim.player.y = 0;
            }
            sim.currentVehicleIndex = -1;
            if (sim.playerMesh) sim.playerMesh.visible = true;
            soundEngine.stopEngine();
          } else if (nearestVehIdx !== -1) {
            sim.inVehicle = true;
            sim.currentVehicleIndex = nearestVehIdx;
            if (sim.playerMesh) sim.playerMesh.visible = false;
            if (sim.wanted.level === 0) {
              sim.wanted = addCrime(sim.wanted, 'theft');
            }
          }
        }

        if (inputs.horn && sim.inVehicle) {
          soundEngine.playHorn();
        }

        // --------------------------------------------
        // VEHICLE DRIVING PHYSICS (Correct Non-Inverted Steering)
        // --------------------------------------------
        if (sim.inVehicle && sim.currentVehicleIndex !== -1) {
          const veh = sim.vehicles[sim.currentVehicleIndex];
          if (veh) {
            const throttle = inputs.moveForward;
            // CORRECT STEERING: Right (+inputs.moveRight) turns Right, Left turns Left!
            const steer = inputs.moveRight;
            const handbrake = inputs.jump;

            // Apply driving skill multiplier
            const drivingLvl = sim.progression.skills.driving.level;
            const customConfig = {
              maxSpeed: 38 + drivingLvl * 1.5,
              reverseSpeed: 14,
              acceleration: 22 + drivingLvl * 1.2,
              brakeForce: 35,
              turnSpeed: 2.4 + drivingLvl * 0.1,
              driftSlip: 0.94,
              mass: 1200,
              width: 2.1,
              length: 4.6,
              height: 1.25
            };

            veh.state = stepVehicle(veh.state, { throttle, steer, handbrake }, dt, customConfig);

            // Driving skill XP gain on high speed or drift
            if (Math.abs(veh.state.speed) > 18 && now - sim.lastSkillTime > 1500) {
              sim.lastSkillTime = now;
              const res = addSkillXp(sim.progression, 'driving', handbrake ? 12 : 5);
              sim.progression = res.progression;
              setProgression(res.progression);
            }

            soundEngine.updateEngine(veh.state.speed, customConfig.maxSpeed, throttle > 0);
            if (handbrake && Math.abs(veh.state.speed) > 10) {
              soundEngine.playTireSkid();
            }

            veh.mesh.position.set(veh.state.x, 0, veh.state.z);
            veh.mesh.rotation.y = veh.state.yaw;

            const wheels = veh.mesh.userData.wheels;
            if (wheels) {
              if (wheels.fl?.steerGroup) {
                wheels.fl.steerGroup.rotation.y = veh.state.steerAngle;
                wheels.fr.steerGroup.rotation.y = veh.state.steerAngle;

                const spin = veh.state.speed * dt * 2.5;
                wheels.fl.spinGroup.rotation.x -= spin;
                wheels.fr.spinGroup.rotation.x -= spin;
                wheels.rl.spinGroup.rotation.x -= spin;
                wheels.rr.spinGroup.rotation.x -= spin;
              } else if (wheels.fl?.rotation) {
                wheels.fl.rotation.y = veh.state.steerAngle;
                wheels.fr.rotation.y = veh.state.steerAngle;

                const spin = veh.state.speed * dt * 2.5;
                wheels.fl.rotation.x -= spin;
                wheels.fr.rotation.x -= spin;
                wheels.rl.rotation.x -= spin;
                wheels.rr.rotation.x -= spin;
              }
            }

            if (veh.mesh.userData.sirens) {
              const sirenTime = now * 0.008;
              veh.mesh.userData.sirens.blue.material.emissiveIntensity =
                Math.sin(sirenTime) > 0 ? 3.0 : 0.2;
              veh.mesh.userData.sirens.red.material.emissiveIntensity =
                Math.sin(sirenTime + Math.PI) > 0 ? 3.0 : 0.2;
            }

            sim.player.x = veh.state.x;
            sim.player.z = veh.state.z;
            sim.player.yaw = veh.state.yaw;

            // Collision check
            for (const box of sim.collisionBoxes) {
              if (
                veh.state.x > box.min.x - 2.0 &&
                veh.state.x < box.max.x + 2.0 &&
                veh.state.z > box.min.z - 2.0 &&
                veh.state.z < box.max.z + 2.0
              ) {
                veh.state.speed = -veh.state.speed * 0.4;
                soundEngine.playCrash(0.8);
                veh.state.health = Math.max(0, veh.state.health - 8);
                break;
              }
            }

            const targetCamDist = 7.0 + Math.abs(veh.state.speed) * 0.08;
            const camX = veh.state.x + Math.sin(veh.state.yaw) * targetCamDist;
            const camZ = veh.state.z + Math.cos(veh.state.yaw) * targetCamDist;
            const camY = 3.2 + Math.abs(veh.state.speed) * 0.02;

            _vec3A.set(camX, camY, camZ);
            camera.position.lerp(_vec3A, 1 - Math.exp(-12 * dt));
            _vec3CamTarget.set(veh.state.x, 1.2, veh.state.z);
            camera.lookAt(_vec3CamTarget);
          }
        } else {
          // --------------------------------------------
          // ON-FOOT CHARACTER PHYSICS
          // --------------------------------------------
          soundEngine.stopEngine();

          sim.player = stepPlayer(
            sim.player,
            {
              moveForward: inputs.moveForward,
              moveRight: inputs.moveRight,
              sprint: inputs.sprint,
              jump: inputs.jump,
              cameraYaw: sim.cameraAngle.yaw
            },
            dt
          );

          // Stamina skill gain on sprinting
          if (inputs.sprint && Math.hypot(inputs.moveForward, inputs.moveRight) > 0.1 && now - sim.lastSkillTime > 2000) {
            sim.lastSkillTime = now;
            const res = addSkillXp(sim.progression, 'stamina', 6);
            sim.progression = res.progression;
            setProgression(res.progression);
          }

          // Resolve collisions with buildings
          for (const box of sim.collisionBoxes) {
            if (
              sim.player.x > box.min.x - 0.5 &&
              sim.player.x < box.max.x + 0.5 &&
              sim.player.z > box.min.z - 0.5 &&
              sim.player.z < box.max.z + 0.5
            ) {
              const dxMin = Math.abs(sim.player.x - box.min.x);
              const dxMax = Math.abs(sim.player.x - box.max.x);
              const dzMin = Math.abs(sim.player.z - box.min.z);
              const dzMax = Math.abs(sim.player.z - box.max.z);
              const minVal = Math.min(dxMin, dxMax, dzMin, dzMax);

              if (minVal === dxMin) sim.player.x = box.min.x - 0.5;
              else if (minVal === dxMax) sim.player.x = box.max.x + 0.5;
              else if (minVal === dzMin) sim.player.z = box.min.z - 0.5;
              else sim.player.z = box.max.z + 0.5;
            }
          }

          if (sim.playerMesh) {
            sim.playerMesh.position.set(sim.player.x, sim.player.y, sim.player.z);
            sim.playerMesh.rotation.y = sim.player.yaw;

            const isMoving = Math.abs(inputs.moveForward) > 0.1 || Math.abs(inputs.moveRight) > 0.1;
            if (isMoving && sim.player.isGrounded) {
              const speedMult = inputs.sprint ? 14 : 8;
              sim.playerMesh.userData.walkTime =
                (sim.playerMesh.userData.walkTime || 0) + dt * speedMult;
              const legAngle = Math.sin(sim.playerMesh.userData.walkTime) * 0.65;
              if (sim.playerMesh.userData.leftLeg) sim.playerMesh.userData.leftLeg.rotation.x = legAngle;
              if (sim.playerMesh.userData.rightLeg) sim.playerMesh.userData.rightLeg.rotation.x = -legAngle;
              if (sim.playerMesh.userData.leftArm) sim.playerMesh.userData.leftArm.rotation.x = -legAngle * 0.8;
              if (sim.playerMesh.userData.rightArm) sim.playerMesh.userData.rightArm.rotation.x = legAngle * 0.5;
            } else {
              if (sim.playerMesh.userData.leftLeg) sim.playerMesh.userData.leftLeg.rotation.x = 0;
              if (sim.playerMesh.userData.rightLeg) sim.playerMesh.userData.rightLeg.rotation.x = 0;
              if (sim.playerMesh.userData.leftArm) sim.playerMesh.userData.leftArm.rotation.x = 0;
              if (sim.playerMesh.userData.rightArm) sim.playerMesh.userData.rightArm.rotation.x = 0;
            }
          }

          const targetDist = inputs.aim ? 2.5 : sim.cameraAngle.dist;
          const camOffsetZ = Math.cos(sim.cameraAngle.yaw) * Math.cos(sim.cameraAngle.pitch) * targetDist;
          const camOffsetX = Math.sin(sim.cameraAngle.yaw) * Math.cos(sim.cameraAngle.pitch) * targetDist;
          const camOffsetY = Math.sin(sim.cameraAngle.pitch) * targetDist + 1.8;

          _vec3A.set(
            sim.player.x + camOffsetX,
            sim.player.y + camOffsetY,
            sim.player.z + camOffsetZ
          );
          camera.position.lerp(_vec3A, 1 - Math.exp(-15 * dt));
          _vec3CamTarget.set(sim.player.x, sim.player.y + 1.4, sim.player.z);
          camera.lookAt(_vec3CamTarget);
        }

        // --------------------------------------------
        // WEAPONS & COMBAT
        // --------------------------------------------
        const activeWeapon = WEAPON_REGISTRY[sim.currentWeaponKey] || WEAPON_REGISTRY.fists;
        const shootingLvl = sim.progression.skills.shooting.level;
        const canShoot = now - sim.lastShotTime >= (1000 / activeWeapon.fireRate) * (1 - shootingLvl * 0.03);

        if (inputs.fireHeld && canShoot) {
          const currentStock = sim.weapons[sim.currentWeaponKey]?.ammo ?? Infinity;
          if (currentStock > 0) {
            sim.lastShotTime = now;
            if (activeWeapon.type !== 'melee') {
              sim.weapons[sim.currentWeaponKey].ammo -= 1;
            }

            soundEngine.playGunshot(sim.currentWeaponKey);

            // Shooting skill XP
            const sRes = addSkillXp(sim.progression, 'shooting', 4);
            sim.progression = sRes.progression;
            setProgression(sRes.progression);

            if (sim.playerMesh?.userData.flash) {
              sim.playerMesh.userData.flash.material.opacity = 1.0;
              setTimeout(() => {
                if (sim.playerMesh?.userData.flash) {
                  sim.playerMesh.userData.flash.material.opacity = 0;
                }
              }, 50);
            }

            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            mpClient.sendShoot(
              [sim.player.x, sim.player.y + 1.4, sim.player.z],
              [camDir.x, camDir.y, camDir.z],
              sim.currentWeaponKey
            );

            if (activeWeapon.type !== 'melee' && sim.wanted.level === 0) {
              sim.wanted = addCrime(sim.wanted, 'minor');
            }
          }
        }

        // --------------------------------------------
        // DYNAMIC MISSIONS TICK & OBJECTIVE REACHED CHECK
        // --------------------------------------------
        if (sim.activeMission) {
          sim.activeMission.timeRemaining -= dt;

          // Check if player reached mission target waypoint (within 5.5m)
          const reachedTarget = isNear(
            sim.player.x,
            sim.player.z,
            sim.activeMission.targetPos.x,
            sim.activeMission.targetPos.z,
            6.0
          );

          if (reachedTarget) {
            // Mission Complete!
            soundEngine.playCash();
            const reward = sim.activeMission.rewardCash;
            const updatedProg = {
              ...sim.progression,
              cash: sim.progression.cash + reward,
              reputation: sim.progression.reputation + 1
            };
            sim.progression = updatedProg;
            setProgression(updatedProg);

            // Hide beacon
            if (sim.waypointBeacon) sim.waypointBeacon.visible = false;
            sim.activeMission = null;
            setActiveMission(null);

            // Generate fresh set of contracts
            const nextContracts = [
              generateDynamicMission(updatedProg.reputation, sim.player.x, sim.player.z),
              generateDynamicMission(updatedProg.reputation, sim.player.x, sim.player.z),
              generateDynamicMission(updatedProg.reputation, sim.player.x, sim.player.z)
            ];
            setAvailableMissions(nextContracts);
          } else if (sim.activeMission.timeRemaining <= 0) {
            // Mission Failed on timeout
            if (sim.waypointBeacon) sim.waypointBeacon.visible = false;
            sim.activeMission = null;
            setActiveMission(null);
          }
        }

        // Passive Property Revenue Tick (every 60s)
        if (now - sim.lastPropertyIncomeTime > 60000) {
          sim.lastPropertyIncomeTime = now;
          const passiveSum = sim.progression.properties
            .filter((p) => p.owned)
            .reduce((s, p) => s + p.incomePerMinute, 0);

          if (passiveSum > 0) {
            sim.progression = {
              ...sim.progression,
              cash: sim.progression.cash + passiveSum
            };
            setProgression(sim.progression);
          }
        }

        sim.wanted = updateWantedDecay(sim.wanted, dt, false);

        // Pickups
        if (isNear(sim.player.x, sim.player.z, 0, 88, 3.0)) {
          sim.progression.cash += 500;
          setProgression({ ...sim.progression });
          soundEngine.playCash();
        }
        if (isNear(sim.player.x, sim.player.z, -10, 20, 3.0) && sim.player.health < 100) {
          sim.player.health = Math.min(100, sim.player.health + 30);
          soundEngine.playCash();
        }

        // Defeat
        if (sim.player.health <= 0) {
          sim.state = 'gameover';
          setGameOverReason('wasted');
          setCashLost(1000);
          sim.progression.cash = Math.max(0, sim.progression.cash - 1000);
          setProgression({ ...sim.progression });
          setGameState('gameover');
          document.body.dataset.state = 'gameover';
          document.exitPointerLock?.();
          soundEngine.stopEngine();
        }

        // Multiplayer Sync
        const animState = sim.inVehicle
          ? 'driving'
          : Math.hypot(inputs.moveForward, inputs.moveRight) > 0.1
          ? inputs.sprint
            ? 'run'
            : 'walk'
          : 'idle';

        mpClient.sendUpdate({
          x: sim.player.x,
          y: sim.player.y,
          z: sim.player.z,
          yaw: sim.player.yaw,
          inVehicle: sim.inVehicle,
          vehicleType: sim.inVehicle ? sim.vehicles[sim.currentVehicleIndex]?.state.type : undefined,
          vehicleSpeed: sim.inVehicle ? sim.vehicles[sim.currentVehicleIndex]?.state.speed : undefined,
          anim: animState,
          health: sim.player.health,
          wantedLevel: sim.wanted.level
        });

        mpClient.update(dt);
      } else if (sim.state === 'title') {
        sim.titleTourAngle += dt * 0.18;
        const tourRadius = 85;
        camera.position.x = Math.sin(sim.titleTourAngle) * tourRadius;
        camera.position.z = Math.cos(sim.titleTourAngle) * tourRadius + 20;
        camera.position.y = 22 + Math.sin(sim.titleTourAngle * 2) * 5;
        camera.lookAt(0, 8, 40);

        if (sim.playerMesh) {
          sim.playerMesh.position.set(0, 0, 70);
          sim.playerMesh.rotation.y = sim.titleTourAngle;
        }
      }

      renderer.render(scene, camera);

      // Throttled HUD update
      if (now - sim.lastHudSync > 100) {
        sim.lastHudSync = now;
        const currentCar = sim.inVehicle ? sim.vehicles[sim.currentVehicleIndex]?.state : null;

        setHudState({
          health: sim.player.health,
          armor: sim.player.armor,
          stamina: sim.player.stamina,
          cash: sim.progression.cash,
          wantedLevel: sim.wanted.level,
          weapon: sim.currentWeaponKey,
          ammo: sim.weapons[sim.currentWeaponKey]?.ammo ?? Infinity,
          inVehicle: sim.inVehicle,
          vehicleSpeed: currentCar?.speed || 0,
          vehicleHealth: currentCar?.health || 100,
          gear: currentCar ? (currentCar.speed < -0.1 ? -1 : Math.max(1, Math.min(5, Math.floor(Math.abs(currentCar.speed) / 7) + 1))) : 1,
          nearVehicle: sim.vehicles.some((v) => isNear(sim.player.x, sim.player.z, v.state.x, v.state.z, 5.5)),
          isGamepadActive: inputs.isGamepadActive,
          playerPos: { x: Math.round(sim.player.x), z: Math.round(sim.player.z), yaw: sim.player.yaw }
        });

        setRemotePlayersMap(new Map(mpClient.remotePlayers));
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        animFrameId = requestAnimationFrame(tick);
      }
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      animFrameId = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animFrameId);
      clearTimeout(animFrameId);
      renderer.dispose();
      mpClient.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [handlePauseToggle, handleReset, handleStartGame, handleTogglePhone]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        data-testid="webgl-canvas-container"
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          onOpenCustomizer={() => setShowAvatarCustomizer(true)}
          isGamepadActive={hudState.isGamepadActive}
        />
      )}

      {/* Gameplay In-World HUD */}
      {gameState === 'playing' && (
        <>
          <HUD
            health={hudState.health}
            armor={hudState.armor}
            stamina={hudState.stamina}
            cash={hudState.cash}
            wantedLevel={hudState.wantedLevel}
            weapon={hudState.weapon}
            ammo={hudState.ammo}
            inVehicle={hudState.inVehicle}
            vehicleSpeed={hudState.vehicleSpeed}
            vehicleHealth={hudState.vehicleHealth}
            gear={hudState.gear}
            nearVehicle={hudState.nearVehicle}
            isGamepadActive={hudState.isGamepadActive}
            remotePlayers={remotePlayersMap}
            onRadioToggle={handleRadioToggle}
            onPauseClick={handlePauseToggle}
            onTogglePhone={handleTogglePhone}
            onOpenWardrobe={() => {
              document.exitPointerLock?.();
              setShowAvatarCustomizer(true);
            }}
            activeMission={activeMission}
            playerPos={hudState.playerPos}
          />

          {inputManagerRef.current && (
            <TouchOverlay
              inputManager={inputManagerRef.current}
              inVehicle={hudState.inVehicle}
              nearVehicle={hudState.nearVehicle}
            />
          )}
        </>
      )}

      {/* 3D Avatar Customizer Modal */}
      {showAvatarCustomizer && (
        <AvatarCustomizer
          initialConfig={avatarConfig}
          onSave={handleSaveAvatar}
          onClose={() => setShowAvatarCustomizer(false)}
        />
      )}

      {/* In-Game GTA Smartphone / Dashboard Menu */}
      {showPhoneMenu && (
        <PhoneMenu
          progression={progression}
          onUpdateProgression={setProgression}
          activeMission={activeMission}
          availableMissions={availableMissions}
          onAcceptMission={handleAcceptMission}
          onAbandonMission={handleAbandonMission}
          onSpawnGarageVehicle={handleSpawnGarageVehicle}
          onOpenWardrobe={() => {
            setShowPhoneMenu(false);
            setShowAvatarCustomizer(true);
          }}
          onClose={() => setShowPhoneMenu(false)}
        />
      )}

      {/* Paused Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handlePauseToggle}
          onReset={handleReset}
          isGamepadActive={hudState.isGamepadActive}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          reason={gameOverReason}
          cashLost={cashLost}
          wantedLevel={hudState.wantedLevel}
          onRespawn={handleRespawn}
        />
      )}
    </main>
  );
}

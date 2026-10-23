/**
 * Real-Time Multiplayer Client for Vice City Web:
 * - WebSocket connection with automatic exponential reconnect
 * - Remote player interpolation & state hydration
 * - Shoot, vehicle theft, and chat broadcast
 */

import * as THREE from 'three';
import { createCharacterMesh, createVehicleMesh } from './models';

export interface RemotePlayer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  yaw: number;
  targetYaw: number;
  inVehicle: boolean;
  vehicleType?: string;
  vehicleSpeed?: number;
  anim: string;
  health: number;
  wantedLevel: number;
  mesh?: THREE.Group;
  carMesh?: THREE.Group;
  nameTag?: HTMLDivElement;
}

export interface ChatMessage {
  id: string;
  name: string;
  text: string;
  time: number;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  public myId: string = '';
  public myName: string = 'Tommy V.';
  public myColor: string = '#0ea5e9';
  public isConnected: boolean = false;
  public remotePlayers = new Map<string, RemotePlayer>();
  public chatLog: ChatMessage[] = [];

  private scene: THREE.Scene | null = null;
  private lastSendTime = 0;
  private reconnectAttempts = 0;

  constructor(scene?: THREE.Scene) {
    if (scene) this.scene = scene;
    this.connect();
  }

  public setScene(scene: THREE.Scene) {
    this.scene = scene;
  }

  public connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.addChat('SYSTEM', 'Conectado al servidor multijugador en tiempo real');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // safe parse ignore
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts > 8) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(msg: {
    type: string;
    id?: string;
    name?: string;
    color?: string;
    players?: Array<RemotePlayer>;
    player?: RemotePlayer;
    origin?: [number, number, number];
    direction?: [number, number, number];
    weapon?: string;
    text?: string;
    time?: number;
    x?: number;
    y?: number;
    z?: number;
    yaw?: number;
    inVehicle?: boolean;
    vehicleType?: string;
    vehicleSpeed?: number;
    anim?: string;
    health?: number;
    wantedLevel?: number;
  }) {
    if (msg.type === 'init') {
      if (msg.id) this.myId = msg.id;
      if (msg.name) this.myName = msg.name;
      if (msg.color) this.myColor = msg.color;

      // Hydrate existing players in room
      if (msg.players) {
        msg.players.forEach((p) => {
          if (p.id !== this.myId) {
            this.addRemotePlayer(p);
          }
        });
      }
    } else if (msg.type === 'player:joined') {
      if (msg.player && msg.player.id !== this.myId) {
        this.addRemotePlayer(msg.player);
        this.addChat('LOBBY', `${msg.player.name} entró a la ciudad`);
      }
    } else if (msg.type === 'player:left') {
      if (msg.id) {
        const p = this.remotePlayers.get(msg.id);
        if (p) {
          this.removeRemotePlayer(msg.id);
          this.addChat('LOBBY', `${p.name} salió de la ciudad`);
        }
      }
    } else if (msg.type === 'player:update') {
      if (msg.id && msg.id !== this.myId) {
        let p = this.remotePlayers.get(msg.id);
        if (!p) {
          p = {
            id: msg.id,
            name: 'Player',
            color: '#3b82f6',
            x: msg.x || 0,
            y: msg.y || 0,
            z: msg.z || 0,
            targetX: msg.x || 0,
            targetY: msg.y || 0,
            targetZ: msg.z || 0,
            yaw: msg.yaw || 0,
            targetYaw: msg.yaw || 0,
            inVehicle: !!msg.inVehicle,
            vehicleType: msg.vehicleType,
            vehicleSpeed: msg.vehicleSpeed,
            anim: msg.anim || 'idle',
            health: msg.health || 100,
            wantedLevel: msg.wantedLevel || 0
          };
          this.addRemotePlayer(p);
        } else {
          // Update targets for smooth interpolation
          if (msg.x !== undefined) p.targetX = msg.x;
          if (msg.y !== undefined) p.targetY = msg.y;
          if (msg.z !== undefined) p.targetZ = msg.z;
          if (msg.yaw !== undefined) p.targetYaw = msg.yaw;
          if (msg.inVehicle !== undefined) {
            if (p.inVehicle !== msg.inVehicle) {
              p.inVehicle = msg.inVehicle;
              this.togglePlayerVehicle(p);
            }
          }
          if (msg.anim) p.anim = msg.anim;
          if (msg.health !== undefined) p.health = msg.health;
          if (msg.wantedLevel !== undefined) p.wantedLevel = msg.wantedLevel;
        }
      }
    } else if (msg.type === 'player:shot') {
      // Trigger muzzle flash on remote player
      if (msg.id && msg.id !== this.myId) {
        const p = this.remotePlayers.get(msg.id);
        if (p && p.mesh && p.mesh.userData.flash) {
          p.mesh.userData.flash.material.opacity = 1.0;
          setTimeout(() => {
            if (p.mesh && p.mesh.userData.flash) {
              p.mesh.userData.flash.material.opacity = 0;
            }
          }, 60);
        }
      }
    } else if (msg.type === 'chat:message') {
      if (msg.name && msg.text) {
        this.addChat(msg.name, msg.text);
      }
    }
  }

  private addRemotePlayer(p: RemotePlayer) {
    if (this.remotePlayers.has(p.id)) return;

    p.targetX = p.x;
    p.targetY = p.y;
    p.targetZ = p.z;
    p.targetYaw = p.yaw;

    if (this.scene) {
      const colorNum = parseInt(p.color.replace('#', '0x'), 16) || 0x0ea5e9;
      const mesh = createCharacterMesh(colorNum);
      mesh.position.set(p.x, p.y, p.z);
      this.scene.add(mesh);
      p.mesh = mesh;

      if (p.inVehicle) {
        const car = createVehicleMesh(p.vehicleType || 'sport', colorNum);
        car.position.set(p.x, p.y, p.z);
        this.scene.add(car);
        p.carMesh = car;
        mesh.visible = false;
      }
    }

    this.remotePlayers.set(p.id, p);
  }

  private removeRemotePlayer(id: string) {
    const p = this.remotePlayers.get(id);
    if (!p) return;
    if (p.mesh && this.scene) this.scene.remove(p.mesh);
    if (p.carMesh && this.scene) this.scene.remove(p.carMesh);
    this.remotePlayers.delete(id);
  }

  private togglePlayerVehicle(p: RemotePlayer) {
    if (!this.scene) return;
    if (p.inVehicle) {
      if (!p.carMesh) {
        const colorNum = parseInt(p.color.replace('#', '0x'), 16) || 0x0ea5e9;
        p.carMesh = createVehicleMesh(p.vehicleType || 'sport', colorNum);
        this.scene.add(p.carMesh);
      }
      p.carMesh.visible = true;
      if (p.mesh) p.mesh.visible = false;
    } else {
      if (p.carMesh) p.carMesh.visible = false;
      if (p.mesh) p.mesh.visible = true;
    }
  }

  public addChat(sender: string, text: string) {
    this.chatLog.push({
      id: Math.random().toString(36).substring(2),
      name: sender,
      text,
      time: Date.now()
    });
    if (this.chatLog.length > 25) this.chatLog.shift();
  }

  public sendChat(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'chat',
      text
    }));
  }

  public sendShoot(origin: [number, number, number], direction: [number, number, number], weapon: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'shoot',
      origin,
      direction,
      weapon
    }));
  }

  public sendUpdate(data: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    inVehicle: boolean;
    vehicleType?: string;
    vehicleSpeed?: number;
    anim: string;
    health: number;
    wantedLevel: number;
  }) {
    const now = performance.now();
    // Throttle socket outbound to 20Hz (~50ms)
    if (now - this.lastSendTime < 50) return;
    this.lastSendTime = now;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'update',
      ...data
    }));
  }

  /**
   * Smoothly interpolate all remote entities in the 3D loop
   */
  public update(dt: number) {
    const clampedDt = Math.min(dt, 0.05);
    const lerpRate = 1 - Math.exp(-14 * clampedDt);

    for (const [, p] of this.remotePlayers.entries()) {
      p.x += (p.targetX - p.x) * lerpRate;
      p.y += (p.targetY - p.y) * lerpRate;
      p.z += (p.targetZ - p.z) * lerpRate;
      p.yaw += (p.targetYaw - p.yaw) * lerpRate;

      if (p.mesh && !p.inVehicle) {
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.rotation.y = p.yaw;

        // Animate walk gait
        if (p.anim === 'run' || p.anim === 'walk') {
          const walkSpeed = p.anim === 'run' ? 14 : 8;
          p.mesh.userData.walkTime = (p.mesh.userData.walkTime || 0) + clampedDt * walkSpeed;
          const legAngle = Math.sin(p.mesh.userData.walkTime) * 0.6;
          p.mesh.userData.leftLeg.rotation.x = legAngle;
          p.mesh.userData.rightLeg.rotation.x = -legAngle;
          p.mesh.userData.leftArm.rotation.x = -legAngle;
          p.mesh.userData.rightArm.rotation.x = legAngle * 0.5;
        } else {
          p.mesh.userData.leftLeg.rotation.x = 0;
          p.mesh.userData.rightLeg.rotation.x = 0;
          p.mesh.userData.leftArm.rotation.x = 0;
          p.mesh.userData.rightArm.rotation.x = 0;
        }
      }

      if (p.carMesh && p.inVehicle) {
        p.carMesh.position.set(p.x, p.y, p.z);
        p.carMesh.rotation.y = p.yaw;

        // Roll wheels if car is moving
        if (p.carMesh.userData.wheels && p.vehicleSpeed) {
          const wheelTurn = p.vehicleSpeed * clampedDt * 2.5;
          p.carMesh.userData.wheels.fl.rotation.x += wheelTurn;
          p.carMesh.userData.wheels.fr.rotation.x += wheelTurn;
          p.carMesh.userData.wheels.rl.rotation.x += wheelTurn;
          p.carMesh.userData.wheels.rr.rotation.x += wheelTurn;
        }
      }
    }
  }

  public dispose() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

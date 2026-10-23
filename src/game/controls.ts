/**
 * Unified Input Manager for Vice City Web:
 * Seamlessly aggregates Keyboard, Mouse, Touch Screen, and Bluetooth Gamepads.
 */

export interface InputSnapshot {
  moveForward: number; // -1 to 1
  moveRight: number;   // -1 to 1
  lookDeltaX: number;  // yaw offset
  lookDeltaY: number;  // pitch offset
  sprint: boolean;
  jump: boolean;
  enterVehicle: boolean; // edge triggered
  fire: boolean;
  fireHeld: boolean;
  aim: boolean;
  weaponSlot: number | null; // 1 to 4
  horn: boolean;
  resetVehicle: boolean;
  pause: boolean;
  isGamepadActive: boolean;
}

export class InputManager {
  private keysHeld = new Set<string>();
  private keysJustPressed = new Set<string>();

  // Mouse look accumulator
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private isMouseDown = false;
  private isMouseRightDown = false;
  private mouseJustClicked = false;

  // Touch virtual inputs
  public touchMoveX = 0; // -1 to 1
  public touchMoveY = 0; // -1 to 1
  public touchLookX = 0;
  public touchLookY = 0;
  public touchButtons = {
    sprint: false,
    jump: false,
    enterVehicle: false,
    fire: false,
    fireHeld: false,
    nextWeapon: false,
    horn: false
  };

  // Gamepad state tracking
  private prevGamepadButtons: boolean[] = [];
  private hasGamepad = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keysHeld.has(code)) {
        this.keysJustPressed.add(code);
      }
      this.keysHeld.add(code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.keysJustPressed.clear();
      this.isMouseDown = false;
      this.isMouseRightDown = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keysHeld.clear();
        this.keysJustPressed.clear();
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.mouseJustClicked = true;
      } else if (e.button === 2) {
        this.isMouseRightDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isMouseRightDown = false;
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      // Accumulate mouse movement when pointer is locked or mouse dragging
      if (document.pointerLockElement) {
        this.mouseDeltaX += e.movementX;
        this.mouseDeltaY += e.movementY;
      }
    });

    // Gamepad connection events
    window.addEventListener('gamepadconnected', () => {
      this.hasGamepad = true;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.hasGamepad = false;
    });
  }

  /**
   * Poll Gamepad API if available
   */
  private pollGamepad(): {
    moveX: number;
    moveY: number;
    lookX: number;
    lookY: number;
    sprint: boolean;
    jump: boolean;
    enterVehicle: boolean;
    fire: boolean;
    fireHeld: boolean;
    aim: boolean;
    nextWeapon: boolean;
    horn: boolean;
    pause: boolean;
    active: boolean;
  } {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0] || gamepads[1] || null;

    if (!gp) {
      return {
        moveX: 0,
        moveY: 0,
        lookX: 0,
        lookY: 0,
        sprint: false,
        jump: false,
        enterVehicle: false,
        fire: false,
        fireHeld: false,
        aim: false,
        nextWeapon: false,
        horn: false,
        pause: false,
        active: false
      };
    }

    const deadzone = 0.15;
    const filter = (v: number) => (Math.abs(v) > deadzone ? v : 0);

    const moveX = filter(gp.axes[0] || 0);
    const moveY = -filter(gp.axes[1] || 0); // push forward = negative axis
    const lookX = filter(gp.axes[2] || 0) * 12;
    const lookY = filter(gp.axes[3] || 0) * 12;

    const btn = (idx: number) => !!gp.buttons[idx]?.pressed;
    const justBtn = (idx: number) => {
      const isDown = !!gp.buttons[idx]?.pressed;
      const wasDown = !!this.prevGamepadButtons[idx];
      return isDown && !wasDown;
    };

    const enterVehicle = justBtn(3); // Y / Triangle
    const jump = justBtn(2);         // X / Square
    const sprint = btn(0);           // A / Cross
    const horn = justBtn(1);         // B / Circle
    const fire = justBtn(7) || btn(7); // RT
    const fireHeld = btn(7);
    const aim = btn(6);              // LT
    const nextWeapon = justBtn(5);   // RB
    const pause = justBtn(9);        // Start

    // Save state for edge detection
    this.prevGamepadButtons = gp.buttons.map(b => b.pressed);

    return {
      moveX,
      moveY,
      lookX,
      lookY,
      sprint,
      jump,
      enterVehicle,
      fire,
      fireHeld,
      aim,
      nextWeapon,
      horn,
      pause,
      active: true
    };
  }

  /**
   * Consume and return a snapshot of current inputs
   */
  public poll(): InputSnapshot {
    const gp = this.pollGamepad();

    // 1. Movement axes (Keyboard + Touch + Gamepad)
    let moveFwd = 0;
    let moveRt = 0;

    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveFwd += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveFwd -= 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveRt -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveRt += 1;

    // Blend in touch joystick
    if (Math.abs(this.touchMoveY) > 0.1) moveFwd += this.touchMoveY;
    if (Math.abs(this.touchMoveX) > 0.1) moveRt += this.touchMoveX;

    // Blend in gamepad stick
    if (Math.abs(gp.moveY) > 0.1) moveFwd += gp.moveY;
    if (Math.abs(gp.moveX) > 0.1) moveRt += gp.moveX;

    // Clamp between -1 and 1
    moveFwd = Math.max(-1, Math.min(1, moveFwd));
    moveRt = Math.max(-1, Math.min(1, moveRt));

    // 2. Look deltas
    const lookX = this.mouseDeltaX + this.touchLookX + gp.lookX;
    const lookY = this.mouseDeltaY + this.touchLookY + gp.lookY;

    // Reset mouse and touch delta accumulators
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.touchLookX = 0;
    this.touchLookY = 0;

    // 3. Actions
    const sprint = this.keysHeld.has('ShiftLeft') || this.keysHeld.has('ShiftRight') || this.touchButtons.sprint || gp.sprint;
    const jump = this.keysJustPressed.has('Space') || this.touchButtons.jump || gp.jump;
    const enterVehicle = this.keysJustPressed.has('KeyF') || this.keysJustPressed.has('Enter') || this.touchButtons.enterVehicle || gp.enterVehicle;

    const fire = this.mouseJustClicked || this.touchButtons.fire || gp.fire;
    const fireHeld = this.isMouseDown || this.touchButtons.fireHeld || gp.fireHeld;
    const aim = this.isMouseRightDown || gp.aim;

    // Weapon slot selection
    let weaponSlot: number | null = null;
    if (this.keysJustPressed.has('Digit1')) weaponSlot = 1;
    else if (this.keysJustPressed.has('Digit2')) weaponSlot = 2;
    else if (this.keysJustPressed.has('Digit3')) weaponSlot = 3;
    else if (this.keysJustPressed.has('Digit4')) weaponSlot = 4;
    else if (this.touchButtons.nextWeapon || gp.nextWeapon || this.keysJustPressed.has('KeyE')) weaponSlot = 99; // cycle next

    const horn = this.keysJustPressed.has('KeyH') || this.touchButtons.horn || gp.horn;
    const resetVehicle = this.keysJustPressed.has('KeyR');
    const pause = this.keysJustPressed.has('Escape') || this.keysJustPressed.has('KeyP') || gp.pause;

    // Clear edge-triggered keys & clicks
    this.keysJustPressed.clear();
    this.mouseJustClicked = false;
    this.touchButtons.enterVehicle = false;
    this.touchButtons.jump = false;
    this.touchButtons.fire = false;
    this.touchButtons.nextWeapon = false;
    this.touchButtons.horn = false;

    return {
      moveForward: moveFwd,
      moveRight: moveRt,
      lookDeltaX: lookX,
      lookDeltaY: lookY,
      sprint,
      jump,
      enterVehicle,
      fire,
      fireHeld,
      aim,
      weaponSlot,
      horn,
      resetVehicle,
      pause,
      isGamepadActive: gp.active
    };
  }
}

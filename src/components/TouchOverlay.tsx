import React, { useRef, useState, useEffect } from 'react';
import { Car, Crosshair, Zap, Compass, RefreshCw, Volume2 } from 'lucide-react';
import { InputManager } from '../game/controls';

interface TouchOverlayProps {
  inputManager: InputManager;
  inVehicle: boolean;
  nearVehicle: boolean;
}

export const TouchOverlay: React.FC<TouchOverlayProps> = ({ inputManager, inVehicle, nearVehicle }) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const leftStickRef = useRef<HTMLDivElement>(null);
  const stickKnobRef = useRef<HTMLDivElement>(null);

  // Left joystick tracking
  const activePointerId = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Right zone swipe camera tracking
  const lookPointerId = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const check = () => {
      const isTouch =
        'ontouchstart' in window ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
        window.innerWidth <= 1024;
      setIsTouchDevice(isTouch);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!isTouchDevice) return null;

  // Joystick pointer handlers
  const handleJoystickDown = (e: React.PointerEvent) => {
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const rect = leftStickRef.current?.getBoundingClientRect();
    if (!rect) return;

    touchStartPos.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };

  const handleJoystickMove = (e: React.PointerEvent) => {
    if (e.pointerId === activePointerId.current) {
      const dx = e.clientX - touchStartPos.current.x;
      const dy = e.clientY - touchStartPos.current.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = 42;

      const clampedDist = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);

      const knobX = Math.cos(angle) * clampedDist;
      const knobY = Math.sin(angle) * clampedDist;

      if (stickKnobRef.current) {
        stickKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
      }

      // Normalize axes
      inputManager.touchMoveX = knobX / maxDist;
      inputManager.touchMoveY = -knobY / maxDist; // Up is forward
    }
  };

  const handleJoystickUp = (e: React.PointerEvent) => {
    if (e.pointerId === activePointerId.current) {
      activePointerId.current = null;
      if (stickKnobRef.current) {
        stickKnobRef.current.style.transform = 'translate(0px, 0px)';
      }
      inputManager.touchMoveX = 0;
      inputManager.touchMoveY = 0;
    }
  };

  // Right zone swipe camera handlers
  const handleLookDown = (e: React.PointerEvent) => {
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleLookMove = (e: React.PointerEvent) => {
    if (e.pointerId === lookPointerId.current) {
      const dx = e.clientX - lastLookPos.current.x;
      const dy = e.clientY - lastLookPos.current.y;
      lastLookPos.current = { x: e.clientX, y: e.clientY };

      inputManager.touchLookX += dx * 2.5;
      inputManager.touchLookY += dy * 2.5;
    }
  };

  const handleLookUp = (e: React.PointerEvent) => {
    if (e.pointerId === lookPointerId.current) {
      lookPointerId.current = null;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-40 overflow-hidden">
      {/* Right side touch surface for camera look */}
      <div
        className="absolute top-16 right-0 w-1/2 h-3/5 pointer-events-auto touch-none"
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
      />

      {/* Left Virtual Joystick */}
      <div
        ref={leftStickRef}
        onPointerDown={handleJoystickDown}
        onPointerMove={handleJoystickMove}
        onPointerUp={handleJoystickUp}
        onPointerCancel={handleJoystickUp}
        className="absolute bottom-6 left-4 sm:left-8 w-28 h-28 rounded-full border-2 border-white/30 bg-black/50 pointer-events-auto flex items-center justify-center shadow-2xl backdrop-blur-none touch-none cursor-grab active:cursor-grabbing"
      >
        <div
          ref={stickKnobRef}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 border border-white/70 shadow-lg transition-transform duration-75 flex items-center justify-center text-white"
        >
          <Compass className="w-5 h-5" />
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="absolute bottom-6 right-4 sm:right-8 flex flex-col items-end gap-2.5 pointer-events-auto">
        {/* Row 1: Vehicle Enter / Exit + Fire */}
        <div className="flex items-center gap-2.5">
          {/* Enter / Exit Car Button */}
          {(nearVehicle || inVehicle) && (
            <button
              onPointerDown={() => {
                inputManager.touchButtons.enterVehicle = true;
              }}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold shadow-xl border-2 transition-transform active:scale-90 ${
                inVehicle
                  ? 'bg-amber-600 border-amber-300 text-white'
                  : 'bg-pink-600 border-pink-300 text-white animate-pulse'
              }`}
              aria-label="Entrar o Salir del Vehículo"
            >
              <Car className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          )}

          {/* Fire / Attack Button */}
          <button
            onPointerDown={() => {
              inputManager.touchButtons.fire = true;
              inputManager.touchButtons.fireHeld = true;
            }}
            onPointerUp={() => {
              inputManager.touchButtons.fireHeld = false;
            }}
            onPointerCancel={() => {
              inputManager.touchButtons.fireHeld = false;
            }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 border-2 border-rose-300 text-white flex items-center justify-center shadow-xl active:scale-90 cursor-pointer"
            aria-label="Disparar o Golpear"
          >
            <Crosshair className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>
        </div>

        {/* Row 2: Weapon Switch + Horn + Drift/Jump + Sprint */}
        <div className="flex items-center gap-2">
          {/* Cycle Weapon */}
          <button
            onPointerDown={() => {
              inputManager.touchButtons.nextWeapon = true;
            }}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 border border-slate-600 text-amber-400 flex items-center justify-center shadow active:scale-90 cursor-pointer"
            aria-label="Cambiar Arma"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Horn */}
          {inVehicle && (
            <button
              onPointerDown={() => {
                inputManager.touchButtons.horn = true;
              }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-800 border border-slate-600 text-cyan-400 flex items-center justify-center shadow active:scale-90 cursor-pointer"
              aria-label="Bocina"
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Jump / Handbrake Drift */}
          <button
            onPointerDown={() => {
              inputManager.touchButtons.jump = true;
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-600 border border-indigo-400 text-white flex items-center justify-center font-bold text-[10px] sm:text-xs shadow active:scale-90 cursor-pointer"
            aria-label={inVehicle ? 'Freno de Mano Drift' : 'Saltar'}
          >
            {inVehicle ? 'DRIFT' : 'SALTO'}
          </button>

          {/* Sprint / Turbo */}
          <button
            onPointerDown={() => {
              inputManager.touchButtons.sprint = true;
            }}
            onPointerUp={() => {
              inputManager.touchButtons.sprint = false;
            }}
            onPointerCancel={() => {
              inputManager.touchButtons.sprint = false;
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500 border-2 border-amber-200 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-lg active:scale-90 cursor-pointer"
            aria-label={inVehicle ? 'Turbo' : 'Correr'}
          >
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};

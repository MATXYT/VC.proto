import React, { useState } from 'react';
import { Shield, Heart, Radio, Crosshair, ChevronDown, ChevronUp, Gamepad2, Users, Volume2, VolumeX, Car, Smartphone, Navigation, Clock, User } from 'lucide-react';
import { WEAPON_REGISTRY } from '../game/physics';
import { soundEngine } from '../game/audio';
import { RemotePlayer } from '../game/multiplayer';
import { Mission } from '../game/missions';

interface HUDProps {
  health: number;
  armor: number;
  stamina: number;
  cash: number;
  wantedLevel: number;
  weapon: string;
  ammo: number;
  inVehicle: boolean;
  vehicleSpeed: number;
  vehicleHealth: number;
  gear: number;
  nearVehicle: boolean;
  isGamepadActive: boolean;
  remotePlayers: Map<string, RemotePlayer>;
  onRadioToggle: () => boolean;
  onPauseClick: () => void;
  onTogglePhone: () => void;
  onOpenWardrobe?: () => void;
  activeMission: Mission | null;
  playerPos: { x: number; z: number; yaw: number };
}

export const HUD: React.FC<HUDProps> = ({
  health,
  armor,
  stamina,
  cash,
  wantedLevel,
  weapon,
  ammo,
  inVehicle,
  vehicleSpeed,
  vehicleHealth,
  gear,
  nearVehicle,
  isGamepadActive,
  remotePlayers,
  onRadioToggle,
  onPauseClick,
  onTogglePhone,
  onOpenWardrobe,
  activeMission,
  playerPos
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isRadioOn, setIsRadioOn] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());

  const currentWeapon = WEAPON_REGISTRY[weapon] || WEAPON_REGISTRY.fists;
  const speedKmh = Math.round(Math.abs(vehicleSpeed) * 3.6);

  const handleRadioClick = () => {
    const active = onRadioToggle();
    setIsRadioOn(active);
  };

  const handleMuteClick = () => {
    const next = !isMuted;
    soundEngine.setMuted(next);
    setIsMuted(next);
  };

  // Determine current street/district name based on player coordinates
  const streetName = (() => {
    if (playerPos.z > 50) return 'OCEAN DRIVE BOULEVARD';
    if (playerPos.z > -20) return 'MALIBU STRIP AVENUE';
    if (playerPos.z > -80) return 'FINANCIAL DOWNTOWN';
    return 'INDUSTRIAL DOCKS';
  })();

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-3 sm:p-5 font-sans overflow-hidden">
      {/* TOP HEADER CLUSTER */}
      <div className="flex items-start justify-between">
        {/* Top-Left: Street & Mission Banner + Mobile Minimap */}
        <div className="space-y-1.5 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/75 border-l-4 border-pink-500 rounded-r text-xs font-mono text-pink-300 shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
            {streetName}
          </div>
          <div className="px-3 py-0.5 bg-black/60 rounded text-[11px] font-mono text-slate-300">
            MISIÓN: LIBRE / MULTIJUGADOR VIVO
          </div>

          {/* Minimap on mobile (tucked neatly top-left so bottom is free for thumbstick) */}
          <div className="sm:hidden relative w-24 h-24 rounded-full border-2 border-slate-900 bg-slate-950/90 shadow-xl overflow-hidden flex items-center justify-center mt-1 pointer-events-auto">
            <div className="absolute inset-0 border border-slate-800 rounded-full" />
            <div className="absolute top-0.5 font-mono text-[8px] text-pink-500 font-black">N</div>
            <div
              className="absolute w-48 h-48 transition-transform duration-75"
              style={{
                transform: `translate(${-playerPos.x * 0.45}px, ${playerPos.z * 0.45}px) rotate(${playerPos.yaw}rad)`
              }}
            >
              <div className="absolute top-1/2 left-0 w-full h-3 -translate-y-1/2 bg-slate-700/60" />
              <div className="absolute left-1/2 top-0 h-full w-3 -translate-x-1/2 bg-slate-700/60" />
            </div>
            <div className="relative z-10 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[10px] border-b-cyan-400 drop-shadow" />
          </div>

          {/* Active Mission Badge (Mobile) */}
          {activeMission && (
            <div className="md:hidden inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/90 border border-amber-500 rounded text-[10px] font-mono text-amber-300 shadow">
              <Clock className="w-3 h-3 text-amber-400" />
              <span className="truncate max-w-[140px] font-bold">{activeMission.title}</span>
              <span className="font-black tabular-nums">({Math.ceil(activeMission.timeRemaining)}s)</span>
            </div>
          )}
        </div>

        {/* Top-Center: Active Mission Tracker Banner (Desktop) */}
        {activeMission && (
          <div className="hidden md:flex flex-col items-center bg-black/85 border-2 border-amber-500/80 rounded-xl px-4 py-2 shadow-2xl space-y-0.5 text-center pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono text-xs font-black text-amber-300 uppercase tracking-wider">
                {activeMission.title}
              </span>
              <span className="text-xs font-mono font-bold text-white bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/60 tabular-nums">
                {Math.ceil(activeMission.timeRemaining)}s
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-300 max-w-sm truncate">
              {activeMission.description}
            </p>
          </div>
        )}

        {/* Top-Right: GTA Classic Status Cluster (Cash, Wanted, HP, Armor, Weapon) */}
        <div className="flex flex-col items-end gap-2">
          {/* Top Utility Controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={onTogglePhone}
              aria-label="Abrir Teléfono y Contratos [TAB]"
              className="px-2.5 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white border border-pink-400 rounded font-mono text-xs flex items-center gap-1 shadow transition-transform active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>MÓVIL [TAB]</span>
            </button>

            {onOpenWardrobe && (
              <button
                onClick={onOpenWardrobe}
                aria-label="Personalizar Avatar / Ropero"
                className="px-2.5 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400 rounded font-mono text-xs flex items-center gap-1 shadow transition-transform active:scale-95"
              >
                <User className="w-3.5 h-3.5" />
                <span>ROPERO</span>
              </button>
            )}

            <button
              onClick={handleRadioClick}
              aria-label="Alternar Radio Vice City FM"
              className={`p-2 rounded border transition-colors ${
                isRadioOn
                  ? 'bg-pink-600 border-pink-400 text-white'
                  : 'bg-black/60 hover:bg-black/80 border-slate-700 text-slate-300'
              }`}
            >
              <Radio className="w-4 h-4" />
            </button>

            <button
              onClick={handleMuteClick}
              aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
              className="p-2 bg-black/60 hover:bg-black/80 border border-slate-700 rounded text-slate-300 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={onPauseClick}
              aria-label="Pausar juego"
              className="px-3 py-1.5 bg-black/60 hover:bg-black/80 border border-slate-700 rounded font-mono text-xs text-slate-300 hover:text-white transition-colors"
            >
              PAUSA [ESC]
            </button>
          </div>

          {/* Cash Counter */}
          <div className="px-3.5 py-1.5 bg-black/80 border-2 border-emerald-500/80 rounded shadow-lg text-right">
            <span className="font-mono text-2xl font-black text-emerald-400 tracking-wider tabular-nums">
              ${cash.toLocaleString('en-US')}
            </span>
          </div>

          {/* Wanted Level 5-Star Badges */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-black/75 rounded border border-slate-800">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                viewBox="0 0 24 24"
                className={`w-5 h-5 transition-transform ${
                  star <= wantedLevel
                    ? 'fill-amber-400 text-amber-500 animate-pulse'
                    : 'fill-slate-800 text-slate-700'
                }`}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>

          {/* Health & Armor Bars */}
          <div className="w-48 space-y-1.5 bg-black/80 p-2.5 rounded border border-slate-800 shadow-md">
            {/* Health Bar */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-rose-400">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> SALUD
                </span>
                <span className="tabular-nums">{Math.max(0, health)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-sm overflow-hidden border border-rose-950">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
                />
              </div>
            </div>

            {/* Armor Bar */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-sky-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 fill-sky-500 text-sky-500" /> BLINDAJE
                </span>
                <span className="tabular-nums">{Math.max(0, armor)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden border border-sky-950">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, armor))}%` }}
                />
              </div>
            </div>

            {/* Stamina Bar */}
            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, stamina))}%` }}
              />
            </div>
          </div>

          {/* Weapon Slot & Ammo */}
          <div className="flex items-center gap-3 px-3 py-2 bg-black/80 border border-slate-700 rounded shadow">
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-white uppercase">{currentWeapon.name}</div>
              <div className="text-sm font-mono font-black text-amber-400 tabular-nums">
                {currentWeapon.type === 'melee' ? '∞' : `${ammo} / ${currentWeapon.ammoCap}`}
              </div>
            </div>
            <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center border border-slate-600 text-pink-400 font-bold">
              <Crosshair className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* CENTER INTERACTION RETICLE / NOTIFICATIONS */}
      <div className="my-auto text-center space-y-2 pointer-events-none">
        {/* Center Crosshair */}
        {!inVehicle && (
          <div className="w-4 h-4 mx-auto border-2 border-white/60 rounded-full flex items-center justify-center">
            <div className="w-1 h-1 bg-pink-500 rounded-full" />
          </div>
        )}

        {/* Near Vehicle Notification */}
        {nearVehicle && !inVehicle && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/85 border border-pink-500 text-pink-300 font-mono text-xs rounded-full shadow-lg animate-bounce">
            <Car className="w-4 h-4 text-pink-400" />
            PRESIONA [F] O BOTÓN COCHE PARA CONDUCIR
          </div>
        )}

        {/* In-Vehicle Speedometer HUD */}
        {inVehicle && (
          <div className="inline-flex items-center gap-4 px-6 py-3 bg-black/85 border-2 border-cyan-500/70 rounded-xl shadow-2xl text-white">
            <div className="text-left">
              <div className="text-[10px] font-mono text-cyan-400">VELOCÍMETRO</div>
              <div className="font-mono text-3xl font-black tracking-tight tabular-nums text-white">
                {speedKmh} <span className="text-xs font-normal text-slate-400">KM/H</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700" />

            <div className="text-left">
              <div className="text-[10px] font-mono text-amber-400">MARCHA</div>
              <div className="font-mono text-2xl font-black text-amber-300">
                {gear < 0 ? 'R' : gear === 0 ? 'N' : gear}
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700" />

            <div className="space-y-1 w-24">
              <div className="text-[10px] font-mono text-slate-400 flex justify-between">
                <span>ESTADO</span>
                <span className="tabular-nums text-emerald-400">{vehicleHealth}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(0, vehicleHealth)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM PERIMETER: GTA MINIMAP & COLLAPSIBLE DOCK */}
      <div className="flex items-end justify-between gap-4">
        {/* GTA Circular Radar / Minimap (Desktop) */}
        <div className="hidden sm:flex relative w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 border-slate-900 bg-slate-950/90 shadow-2xl overflow-hidden items-center justify-center pointer-events-auto">
          {/* Compass grid lines */}
          <div className="absolute inset-0 border border-slate-800 rounded-full" />
          <div className="absolute w-full h-px bg-slate-800" />
          <div className="absolute h-full w-px bg-slate-800" />

          {/* North indicator */}
          <div className="absolute top-1 font-mono text-[9px] text-pink-500 font-black">N</div>

          {/* Minimap roads representation relative to player */}
          <div
            className="absolute w-80 h-80 transition-transform duration-75"
            style={{
              transform: `translate(${-playerPos.x * 0.7}px, ${playerPos.z * 0.7}px) rotate(${playerPos.yaw}rad)`
            }}
          >
            {/* Main roads in minimap */}
            <div className="absolute top-1/2 left-0 w-full h-4 -translate-y-1/2 bg-slate-700/60" />
            <div className="absolute left-1/2 top-0 h-full w-4 -translate-x-1/2 bg-slate-700/60" />

            {/* Ocean shore on east */}
            <div className="absolute top-0 right-0 w-28 h-full bg-sky-900/40" />

            {/* Remote Players Blips */}
            {Array.from(remotePlayers.values()).map((p) => {
              const relX = p.x * 0.7;
              const relZ = -p.z * 0.7;
              return (
                <div
                  key={p.id}
                  className="absolute w-2.5 h-2.5 rounded-full border border-black shadow"
                  style={{
                    backgroundColor: p.color,
                    left: `calc(50% + ${relX}px)`,
                    top: `calc(50% + ${relZ}px)`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={p.name}
                />
              );
            })}
          </div>

          {/* Player Direction Arrow at Center */}
          <div className="relative z-10 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[14px] border-b-cyan-400 drop-shadow" />
        </div>

        {/* Unified Sleek Collapsible Bottom Dock */}
        <div className="pointer-events-auto flex flex-col items-center">
          {/* Collapse/Expand Toggle Tab */}
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            aria-label={isDockCollapsed ? 'Mostrar panel multijugador' : 'Minimizar panel'}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border-t border-x border-slate-700 rounded-t text-[11px] font-mono text-slate-300 flex items-center gap-1 transition-colors"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-pink-400" /> MULTIJUGADOR ({remotePlayers.size + 1})
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-pink-400" /> OCULTAR PANEL
              </>
            )}
          </button>

          {!isDockCollapsed && (
            <div className="bg-black/85 border border-slate-800 rounded-b p-3 flex flex-wrap items-center justify-center gap-3 sm:gap-6 shadow-2xl text-xs font-mono text-slate-300 max-w-xl">
              {/* Connected Players */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-pink-400" />
                <span>ONLINE: <strong className="text-white tabular-nums">{remotePlayers.size + 1}</strong> JUGADORES</span>
              </div>

              {/* Gamepad Status */}
              <div className="flex items-center gap-2">
                <Gamepad2 className={`w-4 h-4 ${isGamepadActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className={isGamepadActive ? 'text-emerald-300' : 'text-slate-400'}>
                  {isGamepadActive ? 'MANDO ACTIVO' : 'TECLADO / TOUCH'}
                </span>
              </div>

              {/* Quick controls hint */}
              <div className="text-[11px] text-slate-400 hidden sm:block">
                [H] Bocina · [Espacio] Drift · [1-4] Armas
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

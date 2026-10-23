import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Gamepad2, Play, Users } from 'lucide-react';
import { soundEngine } from '../game/audio';

interface TitleScreenProps {
  onStart: (playerName: string) => void;
  onOpenCustomizer: () => void;
  isGamepadActive: boolean;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onOpenCustomizer, isGamepadActive }) => {
  const [playerName, setPlayerName] = useState('Tommy');
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundEngine.init();
        onStart(playerName.trim() || 'Tommy');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStart, playerName]);

  const toggleSound = () => {
    soundEngine.init();
    const next = !isMuted;
    soundEngine.setMuted(next);
    setIsMuted(next);
  };

  const handleStartClick = () => {
    soundEngine.init();
    onStart(playerName.trim() || 'Tommy');
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between p-6 sm:p-12 pointer-events-none select-none text-white font-sans bg-radial from-transparent via-slate-950/40 to-slate-950/85">
      {/* Top Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-pink-500/30 rounded-md backdrop-blur-none text-xs font-mono tracking-wider text-pink-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          ONLINE SERVERS LIVE · 3D WEBGL
        </div>

        <div className="flex items-center gap-3">
          {isGamepadActive && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-md text-xs font-mono text-emerald-300">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              MANDO CONECTADO
            </div>
          )}

          <button
            onClick={toggleSound}
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            className="p-2.5 bg-black/60 hover:bg-black/80 border border-slate-700 hover:border-slate-500 rounded-md transition-colors text-slate-300 hover:text-white"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Center Hero Lockup & SVG Title */}
      <div className="max-w-xl pointer-events-auto my-auto space-y-6">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="relative">
          <svg className="w-full max-w-lg h-auto overflow-visible" viewBox="0 0 520 120">
            <defs>
              <linearGradient id="viceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Sub-header text */}
            <text x="6" y="24" fill="#38bdf8" fontFamily="sans-serif" fontSize="14" fontWeight="800" letterSpacing="6">
              GRAND THEFT ACTION
            </text>

            {/* Main stylized title text */}
            <text
              x="4"
              y="85"
              fill="url(#viceGradient)"
              stroke="#09090b"
              strokeWidth="3"
              fontFamily="Impact, sans-serif"
              fontSize="68"
              fontStyle="italic"
              letterSpacing="2"
              filter="url(#neonGlow)"
            >
              VICE CITY
            </text>

            <text
              x="330"
              y="85"
              fill="#fbbf24"
              stroke="#09090b"
              strokeWidth="2"
              fontFamily="Impact, sans-serif"
              fontSize="48"
              letterSpacing="3"
            >
              WEB 3D
            </text>

            <text x="6" y="112" fill="#94a3b8" fontFamily="monospace" fontSize="12" letterSpacing="4">
              OPEN WORLD · FISICA VEHICULAR · MULTIJUGADOR
            </text>
          </svg>
        </div>

        {/* Player Name Form & Start CTA */}
        <div className="bg-black/75 border border-slate-800 p-5 rounded-lg space-y-4 shadow-2xl">
          <div className="space-y-1.5">
            <label htmlFor="player-name-input" className="block text-xs font-mono uppercase tracking-widest text-slate-400">
              Apodo de Jugador / Nickname
            </label>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded px-3 py-2 focus-within:border-pink-500">
              <Users className="w-4 h-4 text-pink-400" />
              <input
                id="player-name-input"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                placeholder="Tommy"
                className="bg-transparent text-white outline-none w-full font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <button
              data-start="true"
              onClick={handleStartClick}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-gradient-to-r from-pink-600 via-rose-600 to-amber-500 hover:from-pink-500 hover:to-amber-400 active:scale-98 text-white font-black text-base tracking-wider uppercase rounded shadow-lg shadow-pink-600/30 transition-all cursor-pointer border border-pink-400/40"
            >
              <Play className="w-5 h-5 fill-current" />
              ENTRAR A LA CIUDAD · JUGAR
            </button>

            <button
              type="button"
              onClick={onOpenCustomizer}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-pink-500/80 rounded text-slate-200 font-mono text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>🎨</span> PERSONALIZAR RASGOS & VESTIMENTA (AVATAR 3D)
            </button>
          </div>
        </div>
      </div>

      {/* Flat Control Hints in Bottom Margin */}
      <div className="text-center pointer-events-auto">
        <p className="inline-block px-4 py-2 bg-black/70 border border-slate-800 rounded text-xs font-mono text-slate-300">
          WASD / Flechas Moverse · F / Entrar Conducir · Espacio Salto/Drift · Click/RT Disparar · 1-4 Armas · Esc Pausa
        </p>
      </div>
    </div>
  );
};

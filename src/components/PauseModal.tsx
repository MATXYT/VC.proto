import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Gamepad2, Smartphone, Keyboard } from 'lucide-react';
import { soundEngine } from '../game/audio';

interface PauseModalProps {
  onResume: () => void;
  onReset: () => void;
  isGamepadActive: boolean;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onReset, isGamepadActive }) => {
  const [isMuted, setIsMuted] = React.useState(soundEngine.getMuted());

  const toggleSound = () => {
    const next = !isMuted;
    soundEngine.setMuted(next);
    setIsMuted(next);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-none text-white font-sans select-none pointer-events-auto">
      <div className="w-full max-w-lg bg-black/90 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black italic tracking-wider text-pink-500 font-mono">
            JUEGO PAUSADO
          </h2>
          <p className="text-xs font-mono text-slate-400">METROPOLIS VICE · 3D GTA</p>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3.5 px-6 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
          >
            <Play className="w-5 h-5 fill-current" />
            CONTINUAR JUGANDO
          </button>

          <button
            onClick={onReset}
            className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            REINICIAR POSICIÓN / COCHE
          </button>

          <button
            onClick={toggleSound}
            className="w-full py-3 px-6 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            {isMuted ? 'ACTIVAR SONIDO' : 'SILENCIAR AUDIO'}
          </button>
        </div>

        {/* Controls Reference Grid */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Keyboard className="w-4 h-4 text-cyan-400" /> TECLADO / PC
            </span>
            <span>WASD · F · Espacio · 1-4</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Smartphone className="w-4 h-4 text-pink-400" /> TÁCTIL / MÓVIL
            </span>
            <span>Joystick Virtual + Botones HUD</span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Gamepad2 className="w-4 h-4 text-emerald-400" /> MANDO BLUETOOTH
            </span>
            <span className={isGamepadActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {isGamepadActive ? 'CONECTADO Y LISTO' : 'STICKS · RT ACELERAR · Y ENTRAR'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

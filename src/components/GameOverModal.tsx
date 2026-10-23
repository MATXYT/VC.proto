import React from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface GameOverModalProps {
  reason: 'wasted' | 'busted';
  cashLost: number;
  wantedLevel: number;
  onRespawn: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  reason,
  cashLost,
  wantedLevel,
  onRespawn
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/70 backdrop-blur-none text-white font-sans select-none pointer-events-auto">
      <div className="w-full max-w-md bg-black/95 border-2 border-rose-600/80 rounded-xl p-8 space-y-6 shadow-2xl text-center">
        {/* Title Badge */}
        <div className="space-y-2">
          <div className="inline-flex p-3 rounded-full bg-rose-950 border border-rose-500/50 text-rose-500">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-black italic tracking-widest text-rose-500 font-mono">
            {reason === 'wasted' ? 'ELIMINADO' : 'ARRESTADO'}
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            {reason === 'wasted' ? 'WASTED · AMBULANCIA EN CAMINO' : 'BUSTED · TRASLADADO A COMISARÍA'}
          </p>
        </div>

        {/* Stats */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>MULTA / FACTURA MÉDICA:</span>
            <span className="text-rose-400 font-bold tabular-nums">-${cashLost}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>NIVEL DE BÚSQUEDA ALCANZADO:</span>
            <span className="text-amber-400 font-bold tabular-nums">{wantedLevel} ESTRELLAS</span>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          data-start="true"
          onClick={onRespawn}
          className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-base rounded shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <RotateCcw className="w-5 h-5" />
          REVIVIR Y REANUDAR
        </button>
      </div>
    </div>
  );
};

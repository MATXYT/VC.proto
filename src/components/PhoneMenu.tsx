import React, { useState } from 'react';
import {
  X,
  ClipboardList,
  Award,
  Building,
  Car,
  Shield,
  Palette,
  DollarSign,
  Clock,
  MapPin,
  CheckCircle2,
  Navigation,
  Sparkles
} from 'lucide-react';
import { Mission } from '../game/missions';
import { PlayerProgression, purchaseProperty, purchaseVehicle } from '../game/progression';
import { soundEngine } from '../game/audio';

interface PhoneMenuProps {
  progression: PlayerProgression;
  onUpdateProgression: (p: PlayerProgression) => void;
  activeMission: Mission | null;
  availableMissions: Mission[];
  onAcceptMission: (m: Mission) => void;
  onAbandonMission: () => void;
  onSpawnGarageVehicle: (type: 'sport' | 'muscle' | 'police' | 'truck') => void;
  onOpenWardrobe: () => void;
  onClose: () => void;
}

export const PhoneMenu: React.FC<PhoneMenuProps> = ({
  progression,
  onUpdateProgression,
  activeMission,
  availableMissions,
  onAcceptMission,
  onAbandonMission,
  onSpawnGarageVehicle,
  onOpenWardrobe,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'skills' | 'properties' | 'garage' | 'ammu'>('missions');
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBuyProperty = (propId: string) => {
    const res = purchaseProperty(progression, propId);
    showToast(res.message);
    if (res.success) {
      soundEngine.playCash();
      onUpdateProgression(res.progression);
    }
  };

  const handleBuyVehicle = (vehId: string) => {
    const res = purchaseVehicle(progression, vehId);
    showToast(res.message);
    if (res.success) {
      soundEngine.playCash();
      onUpdateProgression(res.progression);
    }
  };

  const handleCollectRents = () => {
    const totalIncome = progression.properties
      .filter((p) => p.owned)
      .reduce((sum, p) => sum + p.incomePerMinute * 2, 0);

    if (totalIncome <= 0) {
      showToast('Aún no tienes propiedades rentables. ¡Compra una en Bienes Raíces!');
      return;
    }

    soundEngine.playCash();
    onUpdateProgression({
      ...progression,
      cash: progression.cash + totalIncome
    });
    showToast(`¡Has cobrado $${totalIncome.toLocaleString()} en rentas comerciales!`);
  };

  const handleBuyAmmu = (item: 'armor' | 'ammo_pistol' | 'ammo_smg' | 'ammo_shotgun', cost: number) => {
    if (progression.cash < cost) {
      showToast('Fondos insuficientes para esta compra.');
      return;
    }
    soundEngine.playCash();
    onUpdateProgression({
      ...progression,
      cash: progression.cash - cost
    });
    showToast('¡Compra realizada con éxito en Ammu-Nation!');
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-none text-white font-sans select-none pointer-events-auto">
      {/* Smartphone Outer Chassis */}
      <div className="w-full max-w-sm sm:max-w-md h-[90vh] max-h-[680px] bg-black border-4 border-slate-800 rounded-[36px] overflow-hidden shadow-2xl flex flex-col justify-between relative ring-1 ring-pink-500/30">
        {/* Smartphone Camera Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700" />
        </div>

        {/* Top Phone Status Bar */}
        <div className="pt-3 px-5 pb-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-900/80 z-10 bg-slate-950">
          <span>21:45</span>
          <span className="font-bold text-emerald-400 tabular-nums">${progression.cash.toLocaleString()}</span>
          <div className="flex items-center gap-2">
            <span>5G</span>
            <button
              onClick={onClose}
              aria-label="Cerrar teléfono"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="absolute top-12 left-4 right-4 z-30 bg-pink-600 text-white font-mono text-xs px-3 py-2 rounded-lg shadow-lg animate-bounce text-center border border-pink-400">
            {notification}
          </div>
        )}

        {/* Phone Content Screen */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs bg-gradient-to-b from-slate-950 to-slate-900">
          {/* TAB 1: MISSIONS */}
          {activeTab === 'missions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-pink-400 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4" /> ENCARGOS Y MISIONES
                </span>
                <span className="text-[10px] text-slate-400">REP: NVL {progression.reputation}</span>
              </div>

              {/* Active Mission Card */}
              {activeMission ? (
                <div className="bg-pink-950/40 border-2 border-pink-500 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-pink-600 text-white font-bold rounded text-[10px] uppercase">
                      MISIÓN EN CURSO
                    </span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {Math.ceil(activeMission.timeRemaining)}s
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-sm">{activeMission.title}</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">{activeMission.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-pink-900 text-[11px]">
                    <span className="text-slate-400">CONTACTO: <strong className="text-white">{activeMission.giver}</strong></span>
                    <span className="text-emerald-400 font-bold tabular-nums">+${activeMission.rewardCash.toLocaleString()}</span>
                  </div>

                  <button
                    onClick={onAbandonMission}
                    className="w-full py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded font-bold text-[11px] transition-colors"
                  >
                    ABANDONAR MISIÓN
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-400 text-center">
                  No tienes misiones activas en este momento. Elige un contrato abajo para comenzar.
                </div>
              )}

              {/* Available Missions List */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Contratos Disponibles en la Ciudad</div>
                {availableMissions.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-pink-500/50 rounded-xl space-y-2 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{m.title}</span>
                      <span className="text-emerald-400 font-bold tabular-nums">+${m.rewardCash.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{m.description}</p>
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                      <span>CLIENTE: {m.giver}</span>
                      <button
                        onClick={() => {
                          onAcceptMission(m);
                          showToast(`¡Aceptaste "${m.title}"! Sigue el haz de luz dorado.`);
                        }}
                        className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" /> ACEPTAR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SKILLS */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> HABILIDADES & PROGRESO
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Mejora tus destrezas jugando o entrenando</p>
              </div>

              {[
                {
                  id: 'driving' as const,
                  name: 'Conducción Deportiva',
                  desc: 'Aumenta aceleración, velocidad punta y control de derrape.',
                  data: progression.skills.driving,
                  color: 'bg-cyan-500'
                },
                {
                  id: 'shooting' as const,
                  name: 'Puntería & Cadencia',
                  desc: 'Reduce el retroceso de armas y amplía el daño.',
                  data: progression.skills.shooting,
                  color: 'bg-rose-500'
                },
                {
                  id: 'stamina' as const,
                  name: 'Resistencia Física',
                  desc: 'Permite sprints prolongados y recuperación rápida.',
                  data: progression.skills.stamina,
                  color: 'bg-amber-500'
                },
                {
                  id: 'strength' as const,
                  name: 'Fuerza & Blindaje',
                  desc: 'Incrementa vida máxima y potencia de golpes.',
                  data: progression.skills.strength,
                  color: 'bg-emerald-500'
                }
              ].map((s) => (
                <div key={s.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">{s.name}</span>
                    <span className="font-bold text-amber-400">NIVEL {s.data.level} / 10</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{s.desc}</p>
                  <div className="space-y-0.5 pt-1">
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>XP: {s.data.xp} / {s.data.maxXp}</span>
                      <span>{Math.round((s.data.xp / s.data.maxXp) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color} transition-all`}
                        style={{ width: `${Math.min(100, (s.data.xp / s.data.maxXp) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: PROPERTIES */}
          {activeTab === 'properties' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
                  <Building className="w-4 h-4" /> BIENES RAÍCES DE VICE
                </span>
                <button
                  onClick={handleCollectRents}
                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] flex items-center gap-1 transition-colors"
                >
                  <DollarSign className="w-3 h-3" /> COBRAR RENTAS
                </button>
              </div>

              <div className="space-y-2.5">
                {progression.properties.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border space-y-2 transition-colors ${
                      p.owned
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-pink-400" /> {p.district}
                        </div>
                      </div>
                      {p.owned ? (
                        <span className="px-2 py-0.5 bg-emerald-600/80 text-white rounded text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> EN PROPIEDAD
                        </span>
                      ) : (
                        <span className="font-bold text-amber-400 tabular-nums">${p.price.toLocaleString()}</span>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[10px] pt-1 border-t border-slate-800 text-slate-400">
                      <span>Renta: <strong className="text-emerald-400">+${p.incomePerMinute}/min</strong></span>
                      {!p.owned && (
                        <button
                          onClick={() => handleBuyProperty(p.id)}
                          className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded transition-colors"
                        >
                          COMPRAR
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: GARAGE */}
          {activeTab === 'garage' && (
            <div className="space-y-3.5">
              <div className="border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-cyan-400 flex items-center gap-1.5">
                  <Car className="w-4 h-4" /> CONCESIONARIO & GARAJE
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Compra bólidos o solicita entrega exprés a tu ubicación</p>
              </div>

              <div className="space-y-2.5">
                {progression.garage.map((v) => (
                  <div
                    key={v.id}
                    className={`p-3 rounded-xl border space-y-2 transition-colors ${
                      v.owned
                        ? 'bg-cyan-950/30 border-cyan-500/50'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-xs">{v.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {v.topSpeedKmh} KM/H · Acel: {v.acceleration}/10
                        </div>
                      </div>
                      {v.owned ? (
                        <span className="px-2 py-0.5 bg-cyan-600 text-white rounded text-[10px] font-bold">
                          EN GARAJE
                        </span>
                      ) : (
                        <span className="font-bold text-amber-400 tabular-nums">${v.price.toLocaleString()}</span>
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-800 flex justify-end">
                      {v.owned ? (
                        <button
                          onClick={() => {
                            onSpawnGarageVehicle(v.type);
                            showToast(`¡Tu ${v.name} ha sido entregado a tu lado!`);
                            onClose();
                          }}
                          className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" /> SOLICITAR ENTREGA AQUÍ
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyVehicle(v.id)}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded transition-colors"
                        >
                          COMPRAR VEHÍCULO
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AMMU-NATION */}
          {activeTab === 'ammu' && (
            <div className="space-y-3.5">
              <div className="border-b border-slate-800 pb-2">
                <span className="font-bold text-sm text-rose-400 flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> AMMU-NATION VICE
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Suministros tácticos y munición oficial</p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'armor' as const, name: 'Chaleco Antibalas Kevlar (100%)', price: 800 },
                  { id: 'ammo_pistol' as const, name: 'Caja Munición 9mm (50 balas)', price: 350 },
                  { id: 'ammo_smg' as const, name: 'Cargador Micro SMG (150 balas)', price: 850 },
                  { id: 'ammo_shotgun' as const, name: 'Cartuchos Escopeta (30 uds)', price: 1200 }
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{item.name}</div>
                      <div className="text-[10px] text-amber-400 tabular-nums">${item.price}</div>
                    </div>
                    <button
                      onClick={() => handleBuyAmmu(item.id, item.price)}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded transition-colors"
                    >
                      COMPRAR
                    </button>
                  </div>
                ))}
              </div>

              {/* Wardrobe launch button */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    onOpenWardrobe();
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
                >
                  <Palette className="w-4 h-4" /> ABRIR PROBADOR DE ROPA
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Phone Dock Apps */}
        <div className="p-2 bg-slate-950 border-t border-slate-900 grid grid-cols-5 gap-1 text-[9px] font-mono text-center">
          <button
            onClick={() => setActiveTab('missions')}
            className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'missions' ? 'text-pink-400 font-bold bg-pink-950/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" /> Misiones
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'skills' ? 'text-amber-400 font-bold bg-amber-950/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" /> Habilidades
          </button>

          <button
            onClick={() => setActiveTab('properties')}
            className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'properties' ? 'text-emerald-400 font-bold bg-emerald-950/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-4 h-4" /> Negocios
          </button>

          <button
            onClick={() => setActiveTab('garage')}
            className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'garage' ? 'text-cyan-400 font-bold bg-cyan-950/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" /> Garaje
          </button>

          <button
            onClick={() => setActiveTab('ammu')}
            className={`p-1.5 rounded flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === 'ammu' ? 'text-rose-400 font-bold bg-rose-950/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" /> Tienda
          </button>
        </div>
      </div>
    </div>
  );
};

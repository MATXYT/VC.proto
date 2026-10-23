import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Check, RotateCw, X, Sparkles, User, Palette, Shirt, Glasses } from 'lucide-react';
import {
  AvatarConfig,
  DEFAULT_AVATAR,
  AVATAR_PRESETS,
  SKIN_TONES,
  HAIR_COLORS,
  TOP_COLORS,
  PANTS_COLORS,
  buildCustomAvatarMesh
} from '../game/avatar';

interface AvatarCustomizerProps {
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  initialConfig,
  onSave,
  onClose
}) => {
  const [cfg, setCfg] = useState<AvatarConfig>({ ...initialConfig });
  const [activeTab, setActiveTab] = useState<'skin' | 'hair' | 'clothes' | 'accessories' | 'presets'>('skin');
  const previewRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rotationY = useRef(0);

  // Setup 3D preview turntable scene
  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    camera.position.set(0, 1.25, 3.2);
    camera.lookAt(0, 1.05, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Soft Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.0);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-2, 3, -2);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xf472b6, 0x1e293b, 1.0);
    scene.add(hemiLight);

    // Initial avatar mesh
    const avatar = buildCustomAvatarMesh(cfg);
    scene.add(avatar);
    avatarGroupRef.current = avatar;

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (avatarGroupRef.current) {
        avatarGroupRef.current.rotation.y = rotationY.current;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update 3D avatar when config changes
  useEffect(() => {
    if (!sceneRef.current) return;
    if (avatarGroupRef.current) {
      sceneRef.current.remove(avatarGroupRef.current);
    }
    const newAvatar = buildCustomAvatarMesh(cfg);
    newAvatar.rotation.y = rotationY.current;
    sceneRef.current.add(newAvatar);
    avatarGroupRef.current = newAvatar;
  }, [cfg]);

  const handleRotate = (dir: number) => {
    rotationY.current += dir * 0.45;
  };

  const applyPreset = (presetKey: string) => {
    if (AVATAR_PRESETS[presetKey]) {
      setCfg({ ...AVATAR_PRESETS[presetKey] });
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-none text-white font-sans select-none pointer-events-auto">
      <div className="w-full max-w-4xl h-[92vh] max-h-[720px] bg-black/95 border border-pink-500/40 rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* LEFT: 3D Turntable Preview */}
        <div className="relative w-full md:w-5/12 h-64 md:h-full bg-gradient-to-b from-slate-900 to-black border-b md:border-b-0 md:border-r border-slate-800 flex items-center justify-center overflow-hidden">
          <div ref={previewRef} className="w-full h-full" />

          {/* Turntable rotation buttons */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 border border-slate-700 px-3 py-1.5 rounded-full shadow">
            <button
              onClick={() => handleRotate(1)}
              aria-label="Girar izquierda"
              className="p-1 hover:text-pink-400 text-slate-300 transition-colors"
            >
              <RotateCw className="w-4 h-4 scale-x-[-1]" />
            </button>
            <span className="text-[10px] font-mono text-slate-400">GIRAR 360°</span>
            <button
              onClick={() => handleRotate(-1)}
              aria-label="Girar derecha"
              className="p-1 hover:text-pink-400 text-slate-300 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 bg-black/80 border border-pink-500/30 rounded text-[11px] font-mono text-pink-300">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" /> VISTA PREVIA 3D
          </div>
        </div>

        {/* RIGHT: Customization Controls */}
        <div className="w-full md:w-7/12 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-xl font-black italic tracking-wide font-mono text-pink-500">
                PROBADOR DE AVATAR
              </h2>
              <p className="text-xs font-mono text-slate-400">PERSONALIZACIÓN DE PERSONAJE 3D</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar personalizador"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto border-b border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('skin')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'skin'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <User className="w-3.5 h-3.5" /> Piel & Rostro
            </button>
            <button
              onClick={() => setActiveTab('hair')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'hair'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Palette className="w-3.5 h-3.5" /> Cabello
            </button>
            <button
              onClick={() => setActiveTab('clothes')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'clothes'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Shirt className="w-3.5 h-3.5" /> Ropa
            </button>
            <button
              onClick={() => setActiveTab('accessories')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'accessories'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Glasses className="w-3.5 h-3.5" /> Accesorios
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'presets'
                  ? 'bg-pink-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Estilos
            </button>
          </div>

          {/* Option Panels */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-xs font-mono">
            {/* TAB: SKIN & FACE */}
            {activeTab === 'skin' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-2 uppercase">Tono de Piel</label>
                  <div className="grid grid-cols-5 gap-2">
                    {SKIN_TONES.map((t) => (
                      <button
                        key={t.color}
                        onClick={() => setCfg({ ...cfg, skinTone: t.color })}
                        className={`h-11 rounded-lg border-2 flex items-center justify-center transition-transform ${
                          cfg.skinTone === t.color
                            ? 'border-pink-500 scale-105 shadow-md'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: t.color }}
                        title={t.name}
                      >
                        {cfg.skinTone === t.color && <Check className="w-4 h-4 text-black drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-2 uppercase">Vello Facial / Barba</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'clean', label: 'Afeitado Limpio' },
                      { id: 'stubble', label: 'Barba de 3 Días' },
                      { id: 'mustache', label: 'Bigote Miami 80s' },
                      { id: 'beard', label: 'Barba Completa' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setCfg({ ...cfg, facialHair: f.id as AvatarConfig['facialHair'] })}
                        className={`p-2.5 rounded border text-left transition-colors ${
                          cfg.facialHair === f.id
                            ? 'bg-pink-950/80 border-pink-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HAIR */}
            {activeTab === 'hair' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-2 uppercase">Estilo de Cabello</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'slick', label: 'Engominado Hacia Atrás' },
                      { id: 'fade', label: 'Degradado Fade' },
                      { id: 'afro', label: 'Afro Redondo' },
                      { id: 'buzz', label: 'Corte Militar Buzz' },
                      { id: 'cap', label: 'Gorra de Béisbol' },
                      { id: 'bandana', label: 'Bandana Biker' }
                    ].map((h) => (
                      <button
                        key={h.id}
                        onClick={() => setCfg({ ...cfg, hairStyle: h.id as AvatarConfig['hairStyle'] })}
                        className={`p-2.5 rounded border text-left transition-colors ${
                          cfg.hairStyle === h.id
                            ? 'bg-pink-950/80 border-pink-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-2 uppercase">Color de Pelo</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {HAIR_COLORS.map((c) => (
                      <button
                        key={c.color}
                        onClick={() => setCfg({ ...cfg, hairColor: c.color })}
                        className={`h-9 rounded border-2 flex items-center justify-center transition-transform ${
                          cfg.hairColor === c.color
                            ? 'border-pink-500 scale-105'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      >
                        {cfg.hairColor === c.color && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CLOTHES */}
            {activeTab === 'clothes' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase">Ropa Superior</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'hawaiian', label: 'Camisa Hawaiana' },
                      { id: 'suit', label: 'Traje & Corbata' },
                      { id: 'tank', label: 'Camiseta Tirantes' },
                      { id: 'leather', label: 'Chaqueta de Cuero' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setCfg({ ...cfg, topType: t.id as AvatarConfig['topType'] })}
                        className={`p-2 rounded border text-left transition-colors ${
                          cfg.topType === t.id
                            ? 'bg-pink-950/80 border-pink-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase">Color de Camisa / Traje</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {TOP_COLORS.map((c) => (
                      <button
                        key={c.color}
                        onClick={() => setCfg({ ...cfg, topColor: c.color })}
                        className={`h-8 rounded border-2 flex items-center justify-center transition-transform ${
                          cfg.topColor === c.color
                            ? 'border-pink-500 scale-105'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      >
                        {cfg.topColor === c.color && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase">Pantalones</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'jeans', label: 'Vaqueros' },
                      { id: 'chinos', label: 'Chinos' },
                      { id: 'shorts', label: 'Bermudas' },
                      { id: 'track', label: 'Chándal' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setCfg({ ...cfg, pantsType: p.id as AvatarConfig['pantsType'] })}
                        className={`p-2 rounded border text-left transition-colors ${
                          cfg.pantsType === p.id
                            ? 'bg-pink-950/80 border-pink-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1.5 uppercase">Color de Pantalón</label>
                  <div className="grid grid-cols-5 gap-2">
                    {PANTS_COLORS.map((c) => (
                      <button
                        key={c.color}
                        onClick={() => setCfg({ ...cfg, pantsColor: c.color })}
                        className={`h-8 rounded border-2 flex items-center justify-center transition-transform ${
                          cfg.pantsColor === c.color
                            ? 'border-pink-500 scale-105'
                            : 'border-slate-700 hover:border-slate-500'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      >
                        {cfg.pantsColor === c.color && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ACCESSORIES */}
            {activeTab === 'accessories' && (
              <div className="space-y-3">
                <label className="block text-slate-400 font-bold mb-1.5 uppercase">Accesorios Distintivos</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'aviators', label: 'Gafas de Aviador Negras' },
                    { id: 'gold_chain', label: 'Cadena de Oro Cubana 24k' },
                    { id: 'watch', label: 'Reloj de Lujo Oro' },
                    { id: 'none', label: 'Sin Accesorios' }
                  ].map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setCfg({ ...cfg, accessory: a.id as AvatarConfig['accessory'] })}
                      className={`p-3 rounded border text-left transition-colors ${
                        cfg.accessory === a.id
                          ? 'bg-pink-950/80 border-pink-500 text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-3">
                <label className="block text-slate-400 font-bold mb-1.5 uppercase">Estilos Predefinidos</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'tommy', name: 'Tommy Vice Clásico', desc: 'Camisa azul hawaiana, gafas aviador y vaqueros' },
                    { id: 'detective', name: 'Detective Miami', desc: 'Traje blanco lino con corbata roja y mocasines' },
                    { id: 'cartel', name: 'Don Ricardo', desc: 'Chaqueta de cuero, barba tupida y cadena de oro' },
                    { id: 'racer', name: 'Street Racer', desc: 'Camiseta de tirantes roja neón, chándal y reloj' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-pink-500 rounded text-left space-y-1 transition-colors"
                    >
                      <div className="font-bold text-white text-sm">{p.name}</div>
                      <div className="text-[11px] text-slate-400 leading-tight">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={() => setCfg({ ...DEFAULT_AVATAR })}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300 transition-colors"
            >
              Restablecer Tommy
            </button>
            <button
              onClick={() => {
                onSave(cfg);
                onClose();
              }}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm tracking-wide uppercase rounded shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              GUARDAR Y APLICAR AL JUEGO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

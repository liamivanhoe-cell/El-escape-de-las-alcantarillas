import React, { useState, useEffect } from 'react';
import { Character, Screen, Player, LevelData, Mission, Inventory } from './types';
import { CHARACTERS, INITIAL_MISSIONS } from './constants';
import { CharacterIcon } from './components/CharacterIcon';
import { GameBoard } from './components/GameBoard';
import { generateLevel } from './services/geminiService';
import { Lock, Trophy, Users, Play, Gift, ArrowRight, Skull, Save, ShoppingCart, Coins, BriefcaseMedical, CircleOff, Info } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.INTRO);
  const [characters, setCharacters] = useState<Character[]>(CHARACTERS);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxReachedLevel, setMaxReachedLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [showMissions, setShowMissions] = useState(false);
  
  // Economy State
  const [gold, setGold] = useState(0);
  const [inventory, setInventory] = useState<Inventory>({ ratPoison: 0, raratuiCheese: 0 });

  // Multiplayer State
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Jugador 1', character: CHARACTERS[0], controls: 'Flechas' }
  ]);

  // --- Persistence ---
  useEffect(() => {
      const loadSave = () => {
          const saveStr = localStorage.getItem('sewerEscapeSave');
          if (saveStr) {
              const save = JSON.parse(saveStr);
              if (save.maxReachedLevel) setMaxReachedLevel(save.maxReachedLevel);
              if (save.currentLevel) setCurrentLevel(save.currentLevel); 
              
              if (save.unlockedIds) {
                  setCharacters(prev => prev.map(c => 
                      save.unlockedIds.includes(c.id) ? { ...c, isLocked: false } : c
                  ));
              }
              if (save.completedMissions) {
                  setMissions(prev => prev.map(m => 
                     save.completedMissions.includes(m.id) ? { ...m, completed: true } : m
                  ));
              }
              if (save.gold !== undefined) setGold(save.gold);
              if (save.inventory) setInventory({ ...save.inventory, raratuiCheese: save.inventory.raratuiCheese || 0 });
          }
      };
      loadSave();
  }, []);

  const saveGame = () => {
      const saveData = {
          maxReachedLevel,
          currentLevel,
          unlockedIds: characters.filter(c => !c.isLocked).map(c => c.id),
          completedMissions: missions.filter(m => m.completed).map(m => m.id),
          gold,
          inventory
      };
      localStorage.setItem('sewerEscapeSave', JSON.stringify(saveData));
  };

  useEffect(() => {
      saveGame();
  }, [maxReachedLevel, characters, missions, gold, inventory]);

  // --- Logic Helpers ---

  const addPlayer = () => {
      if (players.length >= 4) return;
      const newId = players.length + 1;
      // Default to next available unlocked character roughly
      const availableChar = characters.find(c => !c.isLocked && !players.some(p => p.character.id === c.id)) || characters[0];
      
      let controls = 'Flechas';
      if (newId === 2) controls = 'WASD';
      if (newId === 3) controls = 'IJKL';
      if (newId === 4) controls = 'NumPad (8,2,4,6)';

      setPlayers([...players, { id: newId, name: `Jugador ${newId}`, character: availableChar, controls }]);
  };

  const removePlayer = (id: number) => {
      if (players.length > 1) {
          setPlayers(players.filter(p => p.id !== id));
      }
  };

  const changePlayerCharacter = (playerId: number, char: Character) => {
      setPlayers(players.map(p => p.id === playerId ? { ...p, character: char } : p));
  };

  const renamePlayer = (playerId: number, newName: string) => {
      setPlayers(players.map(p => p.id === playerId ? { ...p, name: newName } : p));
  };

  const unlockCharacter = (charId: string) => {
    setCharacters(prev => prev.map(c => c.id === charId ? { ...c, isLocked: false } : c));
  };

  const checkMissions = (trigger: 'level_complete' | 'level_start') => {
    let newMissions = [...missions];
    let changed = false;

    if (trigger === 'level_start') {
        const m1 = newMissions.find(m => m.id === 'm1');
        if (m1 && !m1.completed && currentLevel === 1) {
            m1.completed = true;
            changed = true;
        }
    } else if (trigger === 'level_complete') {
        const m3 = newMissions.find(m => m.id === 'm3');
        if (m3 && !m3.completed && currentLevel >= 5) {
            m3.completed = true;
            if (m3.rewardId) unlockCharacter(m3.rewardId);
            changed = true;
        }
    }
    
    // Check level-based unlocks for new bills
    if (trigger === 'level_complete') {
        if (currentLevel + 1 >= 6) { unlockCharacter('b50'); }
        if (currentLevel + 1 >= 9) { unlockCharacter('b100'); }
        if (currentLevel + 1 >= 12) { unlockCharacter('b200'); }
    }
    
    // Simulate mission 2 randomly
    const m2 = newMissions.find(m => m.id === 'm2');
    if (m2 && !m2.completed && Math.random() > 0.7) {
        m2.completed = true;
        if (m2.rewardId) unlockCharacter(m2.rewardId);
        changed = true;
    }

    if (changed) setMissions(newMissions);
  };

  const startGame = async (level: number) => {
    setLoading(true);
    setCurrentLevel(level);
    checkMissions('level_start');
    
    const data = await generateLevel(level);
    setLevelData(data);
    setLoading(false);
    setScreen(Screen.GAME);
  };

  const handleLevelComplete = () => {
    checkMissions('level_complete');
    
    // Award Gold (Modified to 30)
    setGold(g => g + 30);

    if (currentLevel >= maxReachedLevel) {
        setMaxReachedLevel(currentLevel + 1);
    }
    
    if (currentLevel === 12) {
        setScreen(Screen.ENDING);
    } else {
        setScreen(Screen.VICTORY);
    }
  };

  const buyItem = (itemKey: keyof Inventory, cost: number) => {
      if (gold >= cost) {
          setGold(g => g - cost);
          setInventory(prev => ({ ...prev, [itemKey]: prev[itemKey] + 1 }));
      }
  };

  const useItem = (itemKey: string) => {
      if (itemKey === 'ratPoison' && inventory.ratPoison > 0) {
          setInventory(prev => ({ ...prev, ratPoison: prev.ratPoison - 1 }));
      }
      if (itemKey === 'raratuiCheese' && inventory.raratuiCheese > 0) {
          setInventory(prev => ({ ...prev, raratuiCheese: prev.raratuiCheese - 1 }));
      }
  };

  // --- Renders ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mb-4"></div>
        <p className="pixel-font text-green-400 animate-pulse">GENERANDO ALCANTARILLA...</p>
      </div>
    );
  }

  // --- INTRO STORY ---
  if (screen === Screen.INTRO) {
      return (
          <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="max-w-2xl animate-fade-in-up space-y-6">
                  <h1 className="text-4xl text-yellow-500 pixel-font mb-8">LA CAÍDA</h1>
                  <p className="text-xl leading-relaxed">
                      Era un día soleado en Lima. Una transacción rápida en un kiosco... una mano resbaladiza... y el desastre.
                  </p>
                  <p className="text-xl leading-relaxed text-slate-300">
                      Un grupo de monedas cayó por la rejilla del alcantarillado. Ahora, en la oscuridad, rodeadas de agua sucia y ratas gigantes, deben encontrar el camino de regreso.
                  </p>
                  <p className="text-xl leading-relaxed text-green-400 font-bold">
                      Su destino: El Gran Duelo en el centro de la ciudad.
                  </p>
              </div>
              <button 
                  onClick={() => setScreen(Screen.MENU)}
                  className="mt-12 bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 px-8 rounded animate-bounce pixel-font"
              >
                  COMENZAR AVENTURA
              </button>
          </div>
      )
  }

  // --- ENDING STORY ---
  if (screen === Screen.ENDING) {
      return (
          <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-8 flex flex-col items-center justify-center text-center">
              <div className="max-w-2xl space-y-6">
                  <div className="text-6xl mb-6">🏙️ ✨</div>
                  <h1 className="text-4xl text-yellow-400 pixel-font mb-8">¡LIBERTAD!</h1>
                  <p className="text-xl leading-relaxed">
                      Tras sortear laberintos interminables y burlar a las ratas, las monedas ven una luz brillante.
                  </p>
                  <p className="text-2xl font-bold text-green-400 mt-6">
                      ¡Has llegado a la Ciudad!
                  </p>
                  <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-500 mt-4">
                      <p className="font-bold text-yellow-300">¡Ganaste +30 Monedas de Oro!</p>
                  </div>
              </div>
              <button 
                  onClick={() => {
                      setCurrentLevel(1);
                      setScreen(Screen.MENU);
                  }}
                  className="mt-12 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded pixel-font"
              >
                  VOLVER AL MENÚ
              </button>
          </div>
      )
  }

  // --- COLLECTION SCREEN ---
  if (screen === Screen.COLLECTION) {
      return (
          <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center">
              <div className="flex justify-between w-full max-w-4xl mb-6">
                  <button onClick={() => setScreen(Screen.MENU)} className="text-slate-400 hover:text-white font-bold">← Volver</button>
                  <h2 className="text-2xl font-bold text-yellow-400 pixel-font">COLECCIÓN</h2>
                  <div className="w-16"></div> 
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
                  {characters.map(char => (
                      <div key={char.id} className={`bg-slate-800 p-4 rounded-xl border-2 ${char.isLocked ? 'border-red-900 opacity-70' : 'border-green-600'} flex flex-col items-center text-center`}>
                          <div className="mb-4 transform scale-75">
                              <CharacterIcon character={char} size="md" />
                          </div>
                          <h3 className="font-bold text-white text-sm mb-1">{char.name}</h3>
                          {char.isLocked ? (
                              <div className="text-xs text-red-400 mt-2 bg-black/40 p-2 rounded w-full">
                                  <Lock size={12} className="inline mr-1"/>
                                  {char.unlockCondition || 'Bloqueado'}
                              </div>
                          ) : (
                              <div className="text-xs text-green-400 mt-2">¡Desbloqueado!</div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  // --- MAIN MENU ---
  if (screen === Screen.MENU) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1594956894087-9e7932c52e8d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent"></div>
        
        {/* Top Left Corner Info Button */}
        <button 
            onClick={() => setScreen(Screen.COLLECTION)}
            className="absolute top-4 left-4 z-20 bg-slate-800 text-yellow-400 p-2 rounded-full border border-yellow-600 shadow hover:scale-110 transition-transform"
            title="Ver Colección y Desbloqueos"
        >
            <Info size={24} />
        </button>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h1 className="pixel-font text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-[0_4px_0_rgba(0,0,0,1)]">
              ESCAPE DE LA ALCANTARILLA
            </h1>
            
            <div className="flex gap-4 mb-8">
                 <div className="flex gap-2 items-center text-green-400 bg-slate-800 px-4 py-2 rounded-full border border-green-700">
                    <Save size={16} /> <span>Nivel {maxReachedLevel}</span>
                </div>
                <div className="flex gap-2 items-center text-yellow-400 bg-slate-800 px-4 py-2 rounded-full border border-yellow-700">
                    <Coins size={16} /> <span>{gold} Oro</span>
                </div>
            </div>

            <div className="space-y-4 w-full max-w-xs">
              <button 
                onClick={() => setScreen(Screen.LOBBY)}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_0_#14532d] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Play className="fill-current" /> JUGAR
              </button>
              
               <button 
                onClick={() => setScreen(Screen.SHOP)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_#581c87] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart /> TIENDA
              </button>
              
              <button 
                onClick={() => setShowMissions(true)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_#1e293b] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Gift /> MISIONES
              </button>
            </div>
        </div>

        {showMissions && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 border-2 border-slate-600 p-6 rounded-2xl w-full max-w-md">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2"><Trophy /> Misiones</h2>
              <ul className="space-y-3">
                {missions.map(m => (
                  <li key={m.id} className="bg-slate-700 p-3 rounded-lg flex items-center justify-between">
                    <span className={m.completed ? 'line-through text-slate-400' : 'text-white'}>{m.description}</span>
                    {m.completed ? <CheckCircle className="text-green-500" /> : <div className="w-4 h-4 rounded-full border border-slate-500"></div>}
                  </li>
                ))}
              </ul>
              <button onClick={() => setShowMissions(false)} className="mt-6 w-full bg-slate-600 hover:bg-slate-500 py-2 rounded-lg font-bold">CERRAR</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- SHOP SCREEN ---
  if (screen === Screen.SHOP) {
      return (
        <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center">
            <div className="flex justify-between w-full max-w-2xl mb-8 items-center">
                <button onClick={() => setScreen(Screen.MENU)} className="text-slate-400 hover:text-white font-bold">← Volver</button>
                <h2 className="text-2xl font-bold text-yellow-400 pixel-font flex items-center gap-2"><ShoppingCart /> TIENDA</h2>
                <div className="bg-slate-800 px-4 py-2 rounded-full border border-yellow-600 text-yellow-400 font-bold flex gap-2">
                    <Coins /> {gold}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full">
                {/* ITEM: Rat Poison */}
                <div className="bg-slate-800 p-6 rounded-xl border-2 border-purple-500 flex flex-col items-center shadow-lg relative overflow-hidden">
                    <BriefcaseMedical size={48} className="text-purple-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Veneno para Ratas</h3>
                    <p className="text-slate-400 text-sm text-center mb-4 min-h-[40px]">
                        Elimina ratas en un radio de 4 casillas.
                    </p>
                    <div className="text-slate-500 text-xs mb-4 font-bold">Tienes: {inventory.ratPoison}</div>
                    
                    <button 
                        onClick={() => buyItem('ratPoison', 100)}
                        disabled={gold < 100}
                        className={`
                            px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all
                            ${gold >= 100 
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg hover:scale-105' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        Comprar <span className="bg-black/20 px-2 rounded text-sm">100 🪙</span>
                    </button>
                </div>

                {/* ITEM: Raratui Cheese */}
                <div className="bg-slate-800 p-6 rounded-xl border-2 border-yellow-500 flex flex-col items-center shadow-lg relative overflow-hidden">
                    <CircleOff size={48} className="text-yellow-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Queso de RARATUi</h3>
                    <p className="text-slate-400 text-sm text-center mb-4 min-h-[40px]">
                        Aturde a todas las ratas por 10 segundos.
                    </p>
                    <div className="text-slate-500 text-xs mb-4 font-bold">Tienes: {inventory.raratuiCheese}</div>
                    
                    <button 
                        onClick={() => buyItem('raratuiCheese', 50)}
                        disabled={gold < 50}
                        className={`
                            px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all
                            ${gold >= 50 
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg hover:scale-105' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        Comprar <span className="bg-black/20 px-2 rounded text-sm">50 🪙</span>
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- LOBBY (Multiplayer Setup) ---
  if (screen === Screen.LOBBY) {
    return (
        <div className="min-h-screen bg-slate-900 p-4 md:p-6 flex flex-col items-center justify-center">
            
            {/* Top Left Corner Info Button in Lobby as well */}
            <button 
                onClick={() => setScreen(Screen.COLLECTION)}
                className="absolute top-4 left-4 z-20 bg-slate-800 text-yellow-400 p-2 rounded-full border border-yellow-600 shadow hover:scale-110 transition-transform"
                title="Ver Colección"
            >
                <Info size={24} />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2 pixel-font">SALA DE JUGADORES</h2>
            <p className="text-slate-400 mb-8 text-sm">Multijugador Local - Hasta 4 Jugadores</p>
            
            <div className="flex flex-wrap justify-center gap-6 mb-12">
                {[1, 2, 3, 4].map(slotId => {
                    const player = players.find(p => p.id === slotId);
                    
                    if (player) {
                        return (
                            <div key={slotId} className="bg-slate-800 p-4 rounded-xl border-2 border-green-500 w-64 flex flex-col items-center shadow-lg transition-transform hover:-translate-y-1">
                                <div className="flex justify-between w-full mb-2">
                                     <input 
                                        className="bg-transparent text-green-400 text-xs font-bold border-b border-transparent hover:border-green-400 focus:border-green-400 outline-none w-24 text-center"
                                        value={player.name}
                                        onChange={(e) => renamePlayer(slotId, e.target.value)}
                                        maxLength={10}
                                    />
                                    {slotId > 1 && (
                                        <button onClick={() => removePlayer(slotId)} className="text-red-500 text-xs hover:text-red-300 font-bold">X</button>
                                    )}
                                </div>
                                
                                <div className="my-2 scale-110">
                                    <CharacterIcon character={player.character} size="lg" />
                                </div>
                                
                                {/* Character Cycler */}
                                <div className="flex items-center gap-2 mt-4 w-full justify-between px-2">
                                    <button 
                                        className="text-slate-400 hover:text-white bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center"
                                        onClick={() => {
                                            const unlocked = characters.filter(c => !c.isLocked);
                                            const currIdx = unlocked.findIndex(c => c.id === player.character.id);
                                            const nextIdx = (currIdx - 1 + unlocked.length) % unlocked.length;
                                            changePlayerCharacter(slotId, unlocked[nextIdx]);
                                        }}
                                    >◀</button>
                                    <span className="text-sm font-bold truncate text-center flex-1">{player.character.name}</span>
                                    <button 
                                        className="text-slate-400 hover:text-white bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center"
                                        onClick={() => {
                                            const unlocked = characters.filter(c => !c.isLocked);
                                            const currIdx = unlocked.findIndex(c => c.id === player.character.id);
                                            const nextIdx = (currIdx + 1) % unlocked.length;
                                            changePlayerCharacter(slotId, unlocked[nextIdx]);
                                        }}
                                    >▶</button>
                                </div>
                                
                                <div className="mt-4 bg-black/40 px-3 py-1 rounded text-xs text-slate-300 border border-slate-700 w-full text-center">
                                    {player.controls}
                                </div>
                            </div>
                        );
                    } else {
                        return (
                             <div key={slotId} className="bg-slate-800/50 p-4 rounded-xl border-2 border-slate-700 border-dashed w-64 flex flex-col items-center justify-center min-h-[250px]">
                                <button onClick={addPlayer} className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                                     <div className="bg-slate-700 p-4 rounded-full"><Users size={32} /></div>
                                     <span className="text-sm font-bold">Añadir Jugador {slotId}</span>
                                </button>
                             </div>
                        );
                    }
                })}
            </div>

            <div className="flex gap-4">
                <button onClick={() => setScreen(Screen.MENU)} className="text-slate-400 hover:text-white font-bold">Volver</button>
                <button 
                onClick={() => setScreen(Screen.LEVEL_SELECT)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-12 rounded-full text-lg shadow-lg flex items-center gap-2"
                >
                CONFIRMAR EQUIPO <ArrowRight size={20} />
                </button>
            </div>
        </div>
    )
  }

  // --- LEVEL SELECT ---
  if (screen === Screen.LEVEL_SELECT) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-6 pixel-font">MAPA DEL DESAGÜE</h2>
        
        <div className="relative w-full max-w-md bg-slate-800 rounded-2xl p-6 border-4 border-slate-700 shadow-2xl overflow-y-auto max-h-[80vh]">
            <div className="absolute left-1/2 top-10 bottom-10 w-2 bg-slate-600 -translate-x-1/2 z-0"></div>

            <div className="relative z-10 flex flex-col gap-8 items-center py-8">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((level) => {
                    const isLocked = level > maxReachedLevel;
                    const isCurrent = level === currentLevel;
                    const isCompleted = level < maxReachedLevel;
                    return (
                        <button
                            key={level}
                            disabled={isLocked}
                            onClick={() => startGame(level)}
                            className={`
                                w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border-4 transition-all
                                ${isCurrent ? 'bg-yellow-500 border-yellow-300 text-slate-900 scale-125 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : ''}
                                ${isCompleted ? 'bg-green-600 border-green-400 text-white' : ''}
                                ${isLocked ? 'bg-slate-700 border-slate-600 text-slate-500' : ''}
                            `}
                        >
                            {isLocked ? <Lock size={18}/> : level}
                        </button>
                    );
                })}
                
                <div className="bg-blue-500 text-white p-3 rounded-lg z-10 mt-4 text-center border-4 border-blue-300 shadow-lg">
                    <div className="font-bold text-xs uppercase mb-1">Destino</div>
                    <div className="text-lg font-bold">LA CIUDAD</div>
                </div>
            </div>
        </div>
        
        <button onClick={() => setScreen(Screen.LOBBY)} className="mt-4 text-slate-400 hover:text-white underline">Volver a Selección</button>
      </div>
    );
  }

  // --- GAME ---
  if (screen === Screen.GAME && levelData) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <GameBoard 
          levelData={levelData} 
          players={players}
          inventory={inventory}
          onUseItem={useItem} 
          onWin={handleLevelComplete}
          onExit={() => setScreen(Screen.LEVEL_SELECT)}
          onGameOver={() => setScreen(Screen.GAME_OVER)}
        />
      </div>
    );
  }

  // --- GAME OVER ---
  if (screen === Screen.GAME_OVER) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-red-900/10 pointer-events-none"></div>
            
            <div className="relative z-10">
                <Skull size={80} className="text-red-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-4xl text-red-500 font-bold pixel-font mb-4">¡GAME OVER!</h2>
                <p className="text-slate-300 mb-8 max-w-sm mx-auto">
                    Tu equipo se quedó sin vidas.
                </p>
                
                <div className="flex gap-4 justify-center">
                    <button 
                      onClick={() => setScreen(Screen.LEVEL_SELECT)}
                      className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-bold"
                    >
                        MAPA
                    </button>
                    <button 
                      onClick={() => startGame(currentLevel)}
                      className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg"
                    >
                        REINTENTAR
                    </button>
                </div>
            </div>
        </div>
    )
  }

  // --- VICTORY ---
  if (screen === Screen.VICTORY) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-4xl text-yellow-400 font-bold pixel-font mb-4">¡NIVEL COMPLETADO!</h2>
              <p className="text-slate-300 mb-2">¡Todos han escapado a salvo!</p>
              <div className="bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500 inline-block mb-8">
                  <span className="font-bold text-yellow-300 flex items-center gap-2"><Coins /> +30 Oro</span>
              </div>
              
              <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setScreen(Screen.LEVEL_SELECT)}
                    className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-bold"
                  >
                      MAPA
                  </button>
                  <button 
                    onClick={() => {
                        if(currentLevel < 12) {
                            startGame(currentLevel + 1);
                        } else {
                            setScreen(Screen.ENDING); // Should be caught by logic above, but fallback
                        }
                    }}
                    className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold shadow-lg"
                  >
                      SIGUIENTE NIVEL
                  </button>
              </div>
          </div>
      )
  }

  return <div>Error de estado</div>;
}

function CheckCircle(props: {className?: string}) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    )
}
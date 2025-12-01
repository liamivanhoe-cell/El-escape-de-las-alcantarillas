
import React, { useState, useEffect } from 'react';
import { Character, Screen, Player, LevelData, Mission, Inventory, GameMode, Language } from './types';
import { CHARACTERS, INITIAL_MISSIONS, TRANSLATIONS } from './constants';
import { CharacterIcon } from './components/CharacterIcon';
import { GameBoard } from './components/GameBoard';
import { generateLevel } from './services/geminiService';
import { audioManager } from './services/audioService';
import { Lock, Trophy, Users, Play, Gift, ArrowRight, Skull, Save, ShoppingCart, Coins, BriefcaseMedical, CircleOff, Info, Hammer, Sword, Music, Swords, Star, Globe, Volume2, VolumeX, Flame, Droplets, Clock, Zap } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<Screen>(Screen.INTRO);
  const [characters, setCharacters] = useState<Character[]>(CHARACTERS);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [maxReachedLevel, setMaxReachedLevel] = useState(1);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [showMissions, setShowMissions] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.COOP);
  const [language, setLanguage] = useState<Language>(Language.ES_ES);
  
  // Audio State
  const [volume, setVolume] = useState(30);

  // Hardcore Mode State
  const [isHardcore, setIsHardcore] = useState(false);

  // Economy State
  const [gold, setGold] = useState(0);
  const [inventory, setInventory] = useState<Inventory>({ 
      ratPoison: 0, 
      raratuiCheese: 0, 
      hammer: false,
      knife: 0,
      flute: 0,
      waterBucket: 0,
      magicStar: 0,
      starStock: 4,
      starRestockTime: 0,
      ammoFire: false,
      ammoCheese: false
  });

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
              if (save.inventory) {
                  setInventory({ 
                      ratPoison: save.inventory.ratPoison || 0,
                      raratuiCheese: save.inventory.raratuiCheese || 0,
                      hammer: save.inventory.hammer || false,
                      knife: save.inventory.knife || 0,
                      flute: save.inventory.flute || 0,
                      waterBucket: save.inventory.waterBucket || 0,
                      magicStar: save.inventory.magicStar || 0,
                      starStock: save.inventory.starStock !== undefined ? save.inventory.starStock : 4,
                      starRestockTime: save.inventory.starRestockTime || 0,
                      ammoFire: save.inventory.ammoFire || false,
                      ammoCheese: save.inventory.ammoCheese || false
                  });
              }
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

  // Check Restock Timer on Mount and Interval
  useEffect(() => {
     const checkRestock = () => {
         if (inventory.starRestockTime > 0 && Date.now() > inventory.starRestockTime) {
             setInventory(prev => ({...prev, starStock: 4, starRestockTime: 0}));
         }
     };
     checkRestock();
     const interval = setInterval(checkRestock, 60000); // Check every minute
     return () => clearInterval(interval);
  }, [inventory.starRestockTime]);


  // --- Audio Management ---
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      setVolume(val);
      audioManager.init(); // Ensure context is ready
      audioManager.setVolume(val / 100);
  };

  const initAudio = () => {
      audioManager.init();
      audioManager.setVolume(volume / 100);
      audioManager.playTheme('MENU');
  };

  useEffect(() => {
     // Music switching based on Screen
     if (screen === Screen.INTRO || screen === Screen.MENU || screen === Screen.LEVEL_SELECT || screen === Screen.COLLECTION) {
         audioManager.playTheme('MENU');
     } else if (screen === Screen.SHOP) {
         audioManager.playTheme('SHOP');
     } else if (screen === Screen.LOBBY && gameMode === GameMode.COMPETITIVE) {
         audioManager.playTheme('COMPETITIVE');
     } else if (screen === Screen.LOBBY) {
         audioManager.playTheme('MENU');
     } else if (screen === Screen.GAME) {
         if (gameMode === GameMode.COMPETITIVE) {
             audioManager.playTheme('COMPETITIVE');
         } else if (currentLevel === 12 || currentLevel === 22) {
             audioManager.playTheme('BOSS');
         } else if (currentLevel > 12) {
             audioManager.playTheme('CITY');
         } else {
             audioManager.playTheme('SEWER');
         }
     } else if (screen === Screen.VICTORY || screen === Screen.ENDING || screen === Screen.CINEMATIC) {
         audioManager.playTheme('VICTORY');
     } else if (screen === Screen.GAME_OVER) {
         audioManager.playTheme('GAME_OVER');
     }
  }, [screen, currentLevel, gameMode]);

  // --- Logic Helpers ---

  const addPlayer = () => {
      if (players.length >= 4) return;
      const newId = players.length + 1;
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
    
    if (trigger === 'level_complete') {
        if (currentLevel + 1 >= 6) { unlockCharacter('b50'); }
        if (currentLevel + 1 >= 9) { unlockCharacter('b100'); }
        if (currentLevel + 1 >= 12) { unlockCharacter('b200'); }
        
        // Give Fire Ammo for the Giant Rat / City
        if (currentLevel >= 11) {
             setInventory(prev => ({ ...prev, ammoFire: true }));
        }
        // Give Cheese Ammo after defeating Giant Rat (Level 12)
        if (currentLevel === 12) {
             setInventory(prev => ({ ...prev, ammoCheese: true }));
        }
    }
    
    const m2 = newMissions.find(m => m.id === 'm2');
    if (m2 && !m2.completed && Math.random() > 0.7) {
        m2.completed = true;
        if (m2.rewardId) unlockCharacter(m2.rewardId);
        changed = true;
    }

    if (changed) setMissions(newMissions);
  };

  const startGame = async (level: number) => {
    setCurrentLevel(level);
    checkMissions('level_start');
    const data = await generateLevel(level, isHardcore);
    setLevelData(data);
    setScreen(Screen.GAME);
  };

  const handleLevelComplete = (winnerId?: number) => {
    if (gameMode === GameMode.COMPETITIVE && winnerId) {
        alert(`¡JUGADOR ${winnerId} HA GANADO!`);
    }

    checkMissions('level_complete');
    setGold(g => g + 30);

    if (currentLevel >= maxReachedLevel) {
        setMaxReachedLevel(currentLevel + 1);
    }
    
    if (currentLevel === 22) {
        setScreen(Screen.CINEMATIC);
    } else {
        setScreen(Screen.VICTORY);
    }
  };

  const buyItem = (itemKey: keyof Inventory, cost: number) => {
      if (gold >= cost) {
          
          if (itemKey === 'magicStar') {
             if (inventory.starStock <= 0) return;
             
             setInventory(prev => {
                 const newStock = prev.starStock - 1;
                 const newState = { 
                     ...prev, 
                     magicStar: prev.magicStar + 1,
                     starStock: newStock
                 };
                 if (newStock === 0) {
                     newState.starRestockTime = Date.now() + 3600000; // 1 hour
                 }
                 return newState;
             });
          } else {
              setInventory(prev => ({ ...prev, [itemKey]: (prev[itemKey] as number) + 1 }));
          }

          setGold(g => g - cost);
          audioManager.playSFX('buy');
      }
  };

  const useItem = (itemKey: string) => {
      if (itemKey === 'ratPoison' && inventory.ratPoison > 0) {
          setInventory(prev => ({ ...prev, ratPoison: prev.ratPoison - 1 }));
      }
      if (itemKey === 'raratuiCheese' && inventory.raratuiCheese > 0) {
          setInventory(prev => ({ ...prev, raratuiCheese: prev.raratuiCheese - 1 }));
      }
      if (itemKey === 'knife' && inventory.knife > 0) {
          setInventory(prev => ({ ...prev, knife: prev.knife - 1 }));
      }
      if (itemKey === 'flute' && inventory.flute > 0) {
          setInventory(prev => ({ ...prev, flute: prev.flute - 1 }));
      }
      if (itemKey === 'waterBucket' && inventory.waterBucket > 0) {
          setInventory(prev => ({ ...prev, waterBucket: prev.waterBucket - 1 }));
      }
      if (itemKey === 'magicStar' && inventory.magicStar > 0) {
          setInventory(prev => ({ ...prev, magicStar: prev.magicStar - 1 }));
      }
  };

  const getItem = (itemKey: keyof Inventory) => {
      audioManager.playSFX('collect');
      if (itemKey === 'hammer') {
          setInventory(prev => ({ ...prev, hammer: true }));
      }
      if (itemKey === 'magicStar') {
          setInventory(prev => ({ ...prev, magicStar: prev.magicStar + 1 }));
      }
  };

  // --- Renders ---
  
  // --- CINEMATIC ENDING ---
  if (screen === Screen.CINEMATIC) {
      return (
          <div className="min-h-screen bg-gradient-to-t from-orange-500 via-purple-900 to-black text-white p-8 flex flex-col items-center justify-end text-center relative overflow-hidden">
              <div className="absolute top-20 right-20 w-32 h-32 bg-yellow-100 rounded-full blur-xl opacity-50"></div> {/* Sun/Moon */}
              
              <div className="mb-24 flex flex-col items-center animate-fade-in-up">
                   <div className="scale-[2] mb-8 drop-shadow-2xl">
                       <CharacterIcon character={players[0].character} size="xl" />
                   </div>
                   
                   <div className="bg-black/80 border-2 border-white p-6 rounded-xl max-w-2xl">
                       <p className="text-xl md:text-2xl font-bold italic text-yellow-100">"Lo logramos... La ciudad es nuestra."</p>
                   </div>
              </div>
              
              <button 
                  onClick={() => setScreen(Screen.ENDING)}
                  className="mb-8 text-white/50 hover:text-white"
              >
                  Continuar...
              </button>
          </div>
      )
  }

  // --- INTRO STORY ---
  if (screen === Screen.INTRO) {
      return (
          <div className={`min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center text-center relative overflow-hidden ${isHardcore ? 'border-8 border-red-900 shadow-[inset_0_0_100px_rgba(255,0,0,0.2)]' : ''}`}>
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

              {/* Controls */}
              <div className="mt-8 flex gap-8 items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-4">
                      <Volume2 size={24} className={volume === 0 ? 'text-slate-500' : 'text-yellow-400'} />
                      <div className="flex flex-col items-start">
                        <label className="text-xs text-slate-400 uppercase font-bold mb-1">Volumen Música</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={volume} 
                            onChange={handleVolumeChange} 
                            className="w-32 accent-yellow-500 cursor-pointer"
                        />
                      </div>
                  </div>

                  <div className="w-[1px] h-10 bg-slate-700"></div>

                  <button 
                    onClick={() => setIsHardcore(!isHardcore)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all border-2 ${isHardcore ? 'bg-red-900 border-red-500 text-red-200 animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                  >
                      <Zap size={20} className={isHardcore ? "text-red-500" : ""} />
                      {isHardcore ? "HARDCORE ACTIVADO" : "Modo Hardcore"}
                  </button>
              </div>

              <button 
                  onClick={() => {
                      initAudio();
                      setScreen(Screen.MENU);
                  }}
                  className={`mt-8 font-bold py-3 px-8 rounded animate-bounce pixel-font transition-colors ${isHardcore ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-yellow-600 hover:bg-yellow-500 text-black'}`}
              >
                  COMENZAR AVENTURA
              </button>
          </div>
      )
  }

  // --- ENDING SCREEN ---
  if (screen === Screen.ENDING) {
      return (
          <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white p-8 flex flex-col items-center justify-center text-center">
              <div className="max-w-2xl space-y-6">
                  <div className="text-6xl mb-6">🏙️ ✨</div>
                  <h1 className="text-4xl text-yellow-400 pixel-font mb-8">¡{TRANSLATIONS[language].VICTORY}</h1>
                  <p className="text-xl leading-relaxed">
                      Las monedas han superado las alcantarillas y las peligrosas calles de la ciudad.
                  </p>
                  <p className="text-xl leading-relaxed">
                      Fernanfloo ha sido derrotado.
                  </p>
                  <p className="text-2xl font-bold text-green-400 mt-6">
                      ¡Felicidades, Héroes Peruanos!
                  </p>
                  <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-500 mt-4">
                      <p className="font-bold text-yellow-300">¡Ganaste +100 {TRANSLATIONS[language].GOLD}!</p>
                  </div>
              </div>
              <button 
                  onClick={() => {
                      setCurrentLevel(1);
                      setScreen(Screen.MENU);
                  }}
                  className="mt-12 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded pixel-font"
              >
                  {TRANSLATIONS[language].BACK}
              </button>
          </div>
      )
  }

  // --- COLLECTION SCREEN ---
  if (screen === Screen.COLLECTION) {
      return (
          <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center">
              <div className="flex justify-between w-full max-w-4xl mb-6">
                  <button onClick={() => setScreen(Screen.MENU)} className="text-slate-400 hover:text-white font-bold">← {TRANSLATIONS[language].BACK}</button>
                  <h2 className="text-2xl font-bold text-yellow-400 pixel-font">{TRANSLATIONS[language].COLLECTION}</h2>
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
      <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-500 ${isHardcore ? 'bg-red-950' : ''}`}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1594956894087-9e7932c52e8d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className={`absolute inset-0 bg-gradient-to-t ${isHardcore ? 'from-red-900 via-red-900/90' : 'from-slate-900 via-slate-900/90'} to-transparent`}></div>
        
        {/* Top Right Controls */}
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 items-end">
             {/* Language */}
             <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-600">
                <Globe size={16} className="text-slate-400"/>
                <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                >
                    <option value={Language.ES_ES}>Español (ES)</option>
                    <option value={Language.ES_LATAM}>Español (LATAM)</option>
                    <option value={Language.EN}>English</option>
                    <option value={Language.PT}>Português</option>
                </select>
             </div>
             {/* Volume */}
             <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-600">
                {volume === 0 ? <VolumeX size={16} className="text-red-400"/> : <Volume2 size={16} className="text-yellow-400"/>}
                <input 
                    type="range" min="0" max="100" value={volume} 
                    onChange={handleVolumeChange}
                    className="w-24 accent-yellow-500 h-1"
                />
             </div>
             {/* Hardcore Toggle */}
             <button 
                onClick={() => setIsHardcore(!isHardcore)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${isHardcore ? 'bg-red-900/80 border-red-500 text-red-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
             >
                 <Zap size={12} /> {isHardcore ? "HARDCORE ON" : "Hardcore Off"}
             </button>
        </div>

        <button 
            onClick={() => setScreen(Screen.COLLECTION)}
            className="absolute top-4 left-4 z-20 bg-slate-800 text-yellow-400 p-2 rounded-full border border-yellow-600 shadow hover:scale-110 transition-transform"
            title="Ver Colección y Desbloqueos"
        >
            <Info size={24} />
        </button>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h1 className={`pixel-font text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b ${isHardcore ? 'from-red-500 to-red-800' : 'from-yellow-300 to-yellow-600'} mb-4 drop-shadow-[0_4px_0_rgba(0,0,0,1)]`}>
              {TRANSLATIONS[language].TITLE} {isHardcore && <span className="text-white text-sm block mt-2 tracking-widest bg-red-800 p-1">MODO INFERNAL</span>}
            </h1>
            
            <div className="flex gap-4 mb-8">
                 <div className="flex gap-2 items-center text-green-400 bg-slate-800 px-4 py-2 rounded-full border border-green-700">
                    <Save size={16} /> <span>{TRANSLATIONS[language].LEVEL} {maxReachedLevel}</span>
                </div>
                <div className="flex gap-2 items-center text-yellow-400 bg-slate-800 px-4 py-2 rounded-full border border-yellow-700">
                    <Coins size={16} /> <span>{gold} {TRANSLATIONS[language].GOLD}</span>
                </div>
                {inventory.hammer && (
                    <div className="flex gap-2 items-center text-yellow-200 bg-slate-800 px-4 py-2 rounded-full border border-yellow-800">
                        <Hammer size={16} /> <span>Martillo</span>
                    </div>
                )}
                 {inventory.magicStar > 0 && (
                    <div className="flex gap-2 items-center text-orange-200 bg-slate-800 px-4 py-2 rounded-full border border-orange-500">
                        <Star size={16} className="fill-current text-yellow-500" /> <span>x{inventory.magicStar}</span>
                    </div>
                )}
            </div>

            <div className="space-y-4 w-full max-w-xs">
              <button 
                onClick={() => {
                    setGameMode(GameMode.COOP);
                    setScreen(Screen.LOBBY);
                }}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-[0_4px_0_#14532d] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Play className="fill-current" /> {TRANSLATIONS[language].PLAY_COOP}
              </button>

              <button 
                onClick={() => {
                    setGameMode(GameMode.COMPETITIVE);
                    setScreen(Screen.LOBBY);
                }}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_#991b1b] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Swords size={20} /> {TRANSLATIONS[language].PLAY_COMP}
              </button>
              
               <button 
                onClick={() => setScreen(Screen.SHOP)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_#581c87] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart /> {TRANSLATIONS[language].SHOP}
              </button>
              
              <button 
                onClick={() => setShowMissions(true)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl shadow-[0_4px_0_#1e293b] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
              >
                <Gift /> {TRANSLATIONS[language].MISSIONS}
              </button>
            </div>
        </div>

        {showMissions && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-800 border-2 border-slate-600 p-6 rounded-2xl w-full max-w-md">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2"><Trophy /> {TRANSLATIONS[language].MISSIONS}</h2>
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
        <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center overflow-auto">
            <div className="flex justify-between w-full max-w-2xl mb-8 items-center">
                <button onClick={() => setScreen(Screen.MENU)} className="text-slate-400 hover:text-white font-bold">← {TRANSLATIONS[language].BACK}</button>
                <h2 className="text-2xl font-bold text-yellow-400 pixel-font flex items-center gap-2"><ShoppingCart /> {TRANSLATIONS[language].SHOP}</h2>
                <div className="bg-slate-800 px-4 py-2 rounded-full border border-yellow-600 text-yellow-400 font-bold flex gap-2">
                    <Coins /> {gold}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl w-full pb-8">
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

                {/* ITEM: Knife */}
                <div className="bg-slate-800 p-6 rounded-xl border-2 border-red-600 flex flex-col items-center shadow-lg relative overflow-hidden">
                    <Sword size={48} className="text-red-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Cuchillo</h3>
                    <p className="text-slate-400 text-sm text-center mb-4 min-h-[40px]">
                        Elimina humanos cercanos (Radio 3).
                    </p>
                    <div className="text-slate-500 text-xs mb-4 font-bold">Tienes: {inventory.knife}</div>
                    
                    <button 
                        onClick={() => buyItem('knife', 75)}
                        disabled={gold < 75}
                        className={`
                            px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all
                            ${gold >= 75 
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg hover:scale-105' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        Comprar <span className="bg-black/20 px-2 rounded text-sm">75 🪙</span>
                    </button>
                </div>

                {/* ITEM: Flute */}
                <div className="bg-slate-800 p-6 rounded-xl border-2 border-blue-500 flex flex-col items-center shadow-lg relative overflow-hidden">
                    <Music size={48} className="text-blue-400 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Flauta Mágica</h3>
                    <p className="text-slate-400 text-sm text-center mb-4 min-h-[40px]">
                        Aturde a todos los humanos por 10 segundos.
                    </p>
                    <div className="text-slate-500 text-xs mb-4 font-bold">Tienes: {inventory.flute}</div>
                    
                    <button 
                        onClick={() => buyItem('flute', 100)}
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

                 {/* ITEM: Water Bucket */}
                 <div className="bg-slate-800 p-6 rounded-xl border-2 border-blue-400 flex flex-col items-center shadow-lg relative overflow-hidden">
                    <Droplets size={48} className="text-blue-300 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Cubeta de Agua</h3>
                    <p className="text-slate-400 text-sm text-center mb-4 min-h-[40px]">
                        Destruye animatrónicos en pizzerías.
                    </p>
                    <div className="text-slate-500 text-xs mb-4 font-bold">Tienes: {inventory.waterBucket}</div>
                    
                    <button 
                        onClick={() => buyItem('waterBucket', 79)}
                        disabled={gold < 79}
                        className={`
                            px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all
                            ${gold >= 79 
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg hover:scale-105' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        Comprar <span className="bg-black/20 px-2 rounded text-sm">79 🪙</span>
                    </button>
                </div>

                {/* ITEM: Magic Star (Limited) */}
                <div className="bg-slate-800 p-6 rounded-xl border-2 border-orange-400 flex flex-col items-center shadow-lg relative overflow-hidden">
                    <Star size={48} className="text-yellow-400 fill-yellow-400 animate-pulse mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Estrella Mágica</h3>
                    <p className="text-slate-400 text-sm text-center mb-4 min-h-[40px]">
                        Invencibilidad por {isHardcore ? "30" : "60"} segundos.
                    </p>
                    <div className="flex gap-4 w-full justify-between items-center text-xs mb-4">
                        <span className="text-slate-500 font-bold">Tienes: {inventory.magicStar}</span>
                        <span className={`font-bold ${inventory.starStock > 0 ? 'text-green-400' : 'text-red-400'}`}>Stock: {inventory.starStock}/4</span>
                    </div>

                    {inventory.starRestockTime > 0 && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-orange-400 bg-black/50 px-2 py-1 rounded">
                             <Clock size={10} /> 
                             {Math.ceil((inventory.starRestockTime - Date.now()) / 60000)}m
                        </div>
                    )}
                    
                    <button 
                        onClick={() => buyItem('magicStar', 999)}
                        disabled={gold < 999 || inventory.starStock <= 0}
                        className={`
                            px-6 py-2 rounded-full font-bold flex items-center gap-2 transition-all
                            ${gold >= 999 && inventory.starStock > 0
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg hover:scale-105' 
                                : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                        `}
                    >
                        Comprar <span className="bg-black/20 px-2 rounded text-sm">999 🪙</span>
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
            
            <button 
                onClick={() => setScreen(Screen.COLLECTION)}
                className="absolute top-4 left-4 z-20 bg-slate-800 text-yellow-400 p-2 rounded-full border border-yellow-600 shadow hover:scale-110 transition-transform"
                title="Ver Colección"
            >
                <Info size={24} />
            </button>
            
            <div className="text-center mb-4">
                 <h2 className="text-2xl font-bold text-white mb-1 pixel-font">{TRANSLATIONS[language].LOBBY_TITLE}</h2>
                 <span className={`px-3 py-1 rounded text-xs font-bold ${gameMode === GameMode.COMPETITIVE ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>
                     MODO: {gameMode === GameMode.COMPETITIVE ? TRANSLATIONS[language].PLAY_COMP : TRANSLATIONS[language].PLAY_COOP}
                 </span>
            </div>
            
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
                                     <span className="text-sm font-bold">{TRANSLATIONS[language].ADD_PLAYER} {slotId}</span>
                                </button>
                             </div>
                        );
                    }
                })}
            </div>

            <div className="flex gap-4">
                <button onClick={() => setScreen(Screen.MENU)} className="text-slate-400 hover:text-white font-bold">{TRANSLATIONS[language].BACK}</button>
                <button 
                onClick={() => setScreen(Screen.LEVEL_SELECT)}
                className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-12 rounded-full text-lg shadow-lg flex items-center gap-2"
                >
                {TRANSLATIONS[language].CONFIRM} <ArrowRight size={20} />
                </button>
            </div>
        </div>
    )
  }

  // --- LEVEL SELECT ---
  if (screen === Screen.LEVEL_SELECT) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-6 pixel-font">{TRANSLATIONS[language].MAP}</h2>
        
        <div className="relative w-full max-w-md bg-slate-800 rounded-2xl p-6 border-4 border-slate-700 shadow-2xl overflow-y-auto max-h-[80vh]">
            <div className="absolute left-1/2 top-10 bottom-10 w-2 bg-slate-600 -translate-x-1/2 z-0"></div>

            <div className="relative z-10 flex flex-col gap-8 items-center py-8">
                {Array.from({ length: 22 }, (_, i) => i + 1).map((level) => {
                    const isLocked = level > maxReachedLevel;
                    const isCurrent = level === currentLevel;
                    const isCompleted = level < maxReachedLevel;
                    const isCity = level > 12;
                    
                    // Separator for City
                    const separator = level === 13 ? (
                        <div key="sep" className="bg-blue-900 text-blue-200 px-4 py-1 rounded-full text-xs font-bold z-10 border-2 border-blue-500 my-4">
                            ↑ LA CIUDAD ↑
                        </div>
                    ) : null;

                    return (
                        <React.Fragment key={level}>
                            {separator}
                            <button
                                disabled={isLocked}
                                onClick={() => startGame(level)}
                                className={`
                                    w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border-4 transition-all
                                    ${isCurrent ? 'bg-yellow-500 border-yellow-300 text-slate-900 scale-125 shadow-[0_0_20px_rgba(234,179,8,0.5)]' : ''}
                                    ${isCompleted ? 'bg-green-600 border-green-400 text-white' : ''}
                                    ${isLocked ? 'bg-slate-700 border-slate-600 text-slate-500' : ''}
                                    ${isCity && !isLocked && !isCurrent && !isCompleted ? 'bg-slate-500' : ''} 
                                `}
                            >
                                {isLocked ? <Lock size={18}/> : level}
                            </button>
                        </React.Fragment>
                    );
                })}
                
                <div className="bg-blue-500 text-white p-3 rounded-lg z-10 mt-4 text-center border-4 border-blue-300 shadow-lg">
                    <div className="font-bold text-xs uppercase mb-1">Destino Final</div>
                    <div className="text-lg font-bold">EL GRAN DUELO</div>
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
          gameMode={gameMode}
          language={language}
          isHardcore={isHardcore}
          onUseItem={useItem} 
          onGetItem={getItem}
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
                <h2 className="text-4xl text-red-500 font-bold pixel-font mb-4">{TRANSLATIONS[language].GAME_OVER}</h2>
                <p className="text-slate-300 mb-8 max-w-sm mx-auto">
                    Todos los jugadores han caído.
                </p>
                
                <div className="flex gap-4 justify-center">
                    <button 
                      onClick={() => setScreen(Screen.LEVEL_SELECT)}
                      className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-bold"
                    >
                        {TRANSLATIONS[language].MAP}
                    </button>
                    <button 
                      onClick={() => startGame(currentLevel)}
                      className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg"
                    >
                        {TRANSLATIONS[language].RETRY}
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
              <h2 className="text-4xl text-yellow-400 font-bold pixel-font mb-4">{TRANSLATIONS[language].VICTORY}</h2>
              <p className="text-slate-300 mb-2">¡Sobrevivientes han escapado!</p>
              <div className="bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500 inline-block mb-8">
                  <span className="font-bold text-yellow-300 flex items-center gap-2"><Coins /> +30 {TRANSLATIONS[language].GOLD}</span>
              </div>
              
              <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => setScreen(Screen.LEVEL_SELECT)}
                    className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg font-bold"
                  >
                      {TRANSLATIONS[language].MAP}
                  </button>
                  <button 
                    onClick={() => {
                        if(currentLevel < 22) {
                            startGame(currentLevel + 1);
                        } else {
                            setScreen(Screen.CINEMATIC); 
                        }
                    }}
                    className="bg-green-600 hover:bg-green-500 px-6 py-3 rounded-lg font-bold shadow-lg"
                  >
                      {TRANSLATIONS[language].NEXT_LEVEL}
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

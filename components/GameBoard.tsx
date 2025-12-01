
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LevelData, Player, Enemy, Inventory, Tile, GameMode, Lightning, Language, Projectile, AmmoType, Box as GameBox } from '../types';
import { CharacterIcon } from './CharacterIcon';
import { Heart, BriefcaseMedical, CircleOff, Skull, Box, Hammer, ShieldAlert, Lock, FileText, KeyRound, X, Check, Music, Sword, Star, HelpCircle, AlertTriangle, Zap, Crosshair, Flame, MousePointer2, Bot, Droplets } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { audioManager } from '../services/audioService';

interface GameBoardProps {
  levelData: LevelData;
  players: Player[];
  inventory: Inventory;
  gameMode: GameMode;
  language: Language;
  isHardcore: boolean;
  onWin: (winnerId?: number) => void;
  onExit: () => void;
  onGameOver: () => void;
  onUseItem: (item: string) => void;
  onGetItem: (item: keyof Inventory) => void;
}

interface ActivePlayerState {
  id: number;
  x: number;
  y: number;
  lives: number;
  escaped: boolean;
  dead: boolean;
  isDucking: boolean;
  lastDir: { x: number, y: number };
}

export const GameBoard: React.FC<GameBoardProps> = ({ levelData, players, inventory, gameMode, language, isHardcore, onWin, onExit, onGameOver, onUseItem, onGetItem }) => {
  // Main Level State
  const [localTiles, setLocalTiles] = useState<Tile[]>(levelData.tiles);
  const [activePlayers, setActivePlayers] = useState<ActivePlayerState[]>(
    players.map(p => ({ 
        id: p.id, 
        x: levelData.startPos.x, 
        y: levelData.startPos.y, 
        lives: isHardcore ? 1 : 3, 
        escaped: false, 
        dead: false,
        isDucking: false,
        lastDir: { x: 0, y: 1 }
    }))
  );
  const [enemies, setEnemies] = useState<Enemy[]>(levelData.enemies);
  const [lightnings, setLightnings] = useState<Lightning[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  
  // Interaction State
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [message, setMessage] = useState<{text: string, color: string} | null>(null);
  
  // Stun/Buff Timers
  const [ratStunUntil, setRatStunUntil] = useState<number>(0); 
  const [humanStunUntil, setHumanStunUntil] = useState<number>(0);
  const [invincibleUntil, setInvincibleUntil] = useState<number>(0);

  // Ammo & Weapons
  const [selectedAmmo, setSelectedAmmo] = useState<AmmoType>(AmmoType.NORMAL);
  const [targetBoxes, setTargetBoxes] = useState<GameBox[]>([]);

  // Level 17 Mechanics (Kill Thieves)
  const [killedCount, setKilledCount] = useState(0);

  // Chest Interaction
  const [chestProgress, setChestProgress] = useState(0);
  const [interactingChestPos, setInteractingChestPos] = useState<{x: number, y: number} | null>(null);

  // Level 8/20 Puzzle & Secret Door State
  const [securityCode, setSecurityCode] = useState<string>("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState("");
  const [interactingDoorPos, setInteractingDoorPos] = useState<{x: number, y: number} | null>(null);
  const [interactingSecretDoor, setInteractingSecretDoor] = useState(false);

  // Boss Mode State (Pepe / Fernanfloo / Giant Rat)
  const [isBossMode, setIsBossMode] = useState(false);
  const [bossHp, setBossHp] = useState(100);
  const [bossDizzy, setBossDizzy] = useState(false);
  const [bossAmmo, setBossAmmo] = useState(50);
  const savedLevelState = useRef<{tiles: Tile[], enemies: Enemy[], players: ActivePlayerState[]} | null>(null);
  
  // Intervals
  const bossMoveInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const bossCycleInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const bossLightningInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fernanflooBoxInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCityLevel = levelData.levelNumber > 12;
  const isPizzeria = levelData.levelNumber === 21;
  const isSewerBoss = levelData.levelNumber === 12;
  const isFinalBoss = levelData.levelNumber === 22;
  const isShootingEnabled = isBossMode || levelData.levelNumber === 17 || isSewerBoss || isFinalBoss;

  useEffect(() => {
      // Init Level
      setLocalTiles(levelData.tiles);
      setEnemies(levelData.enemies);
      setChestProgress(0);
      setInteractingChestPos(null);
      setShowKeypad(false);
      setKeypadInput("");
      setInteractingDoorPos(null);
      setInteractingSecretDoor(false);
      setKilledCount(0);
      setIsBossMode(false);
      setBossDizzy(false);
      setInvincibleUntil(0);
      setLightnings([]);
      setProjectiles([]);
      setTargetBoxes([]);
      setBossHp(100);
      savedLevelState.current = null;
      
      setActivePlayers(players.map(p => ({ 
        id: p.id, 
        x: levelData.startPos.x, 
        y: levelData.startPos.y, 
        lives: isHardcore ? 1 : 3, 
        escaped: false, 
        dead: false,
        isDucking: false,
        lastDir: { x: 0, y: 1 }
      })));

      // Generate Random Code for Level 8 and 20
      if (levelData.levelNumber === 8 || levelData.levelNumber === 20) {
          const code = Math.floor(1000 + Math.random() * 9000).toString();
          setSecurityCode(code);
      }

      // Initialize Shooting for specific levels
      if (levelData.levelNumber === 17 || isSewerBoss || isFinalBoss) {
          setBossAmmo(999); // Infinite normal ammo for main bosses / level 17
          showMessage("¡PISTOLA EQUIPADA! SHIFT para disparar", "text-yellow-400");
      }
      
      if (isFinalBoss) {
           showMessage("¡FERNANFLOO! Destruye las cajas con el color correcto.", "text-green-400");
      }
      
      if (isPizzeria) {
          showMessage("¡LA PIZZERÍA! Usa la CUBETA de agua.", "text-blue-300");
      }

  }, [levelData, players, gameMode, isHardcore]);

  const getTileAt = useCallback((x: number, y: number) => localTiles.find(t => t.x === x && t.y === y), [localTiles]);

  const showMessage = (text: string, color: string) => {
      setMessage({ text, color });
      setTimeout(() => setMessage(null), 2000);
  };

  // --- ITEM USAGE ---
  const useRatPoison = () => {
      if (inventory.ratPoison <= 0) { showMessage("¡No tienes veneno!", "text-red-400"); return; }
      onUseItem('ratPoison');
      setEnemies(prev => prev.filter(e => {
             if (e.type !== 'rat') return true;
             const isCloseToAnyPlayer = activePlayers.some(p => !p.escaped && !p.dead && (Math.abs(p.x - e.x) + Math.abs(p.y - e.y)) <= 4);
             return !isCloseToAnyPlayer;
      }));
      showMessage("¡Ratas eliminadas!", "text-purple-400");
  };

  const useWaterBucket = () => {
      if (inventory.waterBucket <= 0) { showMessage("¡No tienes cubeta!", "text-red-400"); return; }
      onUseItem('waterBucket');
      audioManager.playSFX('collect'); // Splash sound replacement
      setEnemies(prev => prev.filter(e => {
             if (e.type !== 'animatronic') return true;
             const isCloseToAnyPlayer = activePlayers.some(p => !p.escaped && !p.dead && (Math.abs(p.x - e.x) + Math.abs(p.y - e.y)) <= 3);
             return !isCloseToAnyPlayer;
      }));
      showMessage("¡AGUA DERRAMADA! Animatrónicos destruidos.", "text-blue-400");
  };

  const spawnBossRats = () => {
       const newRats: Enemy[] = [];
       const timestamp = Date.now();
       const count = isHardcore ? 4 : 2; // Double rats in hardcore
       for (let i = 0; i < count; i++) {
            const floors = localTiles.filter(t => t.type === 'floor');
            if (floors.length > 0) {
                const pick = floors[Math.floor(Math.random() * floors.length)];
                newRats.push({ id: `boss-rat-${timestamp}-${i}`, x: pick.x, y: pick.y, type: 'rat' });
            }
       }
       setEnemies(prev => [...prev, ...newRats]);
       showMessage("¡PEPE LLAMA A SUS RATAS!", "text-red-400");
       setTimeout(() => {
           setEnemies(prev => prev.filter(e => !newRats.some(nr => nr.id === e.id)));
       }, 10000);
  };

  const handleBossDamage = (amount: number, source: string) => {
      setBossHp(prev => {
          // Hardcore: Boss takes half damage (Equivalent to 200% HP)
          const effectiveDmg = isHardcore ? amount / 2 : amount;
          const newHp = prev - effectiveDmg;
          if (newHp <= 0) {
              if (isBossMode) setTimeout(() => endBossMode(true), 1000);
              // Main Level Bosses (L12, L22) handled in projectiles
              return 0;
          }
          return newHp;
      });
      audioManager.playSFX('hit');
      
      if (isBossMode) { // Pepe
          setBossDizzy(false); 
          spawnBossRats(); 
      }
      showMessage(`¡${source}! -${isHardcore ? amount/2 : amount}`, "text-yellow-300");
  };

  const useKnife = () => {
      if (inventory.knife <= 0) { showMessage("¡No tienes cuchillos!", "text-red-400"); return; }
      onUseItem('knife');
      setEnemies(prev => prev.filter(e => {
             if (e.type !== 'human' || e.isHugged) return true;
             const isCloseToAnyPlayer = activePlayers.some(p => !p.escaped && !p.dead && (Math.abs(p.x - e.x) + Math.abs(p.y - e.y)) <= 3);
             return !isCloseToAnyPlayer;
      }));
      showMessage("¡Ladrón eliminado!", "text-red-600");
  };

  const useCheese = () => {
      if (inventory.raratuiCheese <= 0) { showMessage("¡No tienes queso!", "text-red-400"); return; }
      onUseItem('raratuiCheese');
      setRatStunUntil(Date.now() + 10000); 
      showMessage("¡Ratas aturdidas (10s)!", "text-yellow-400");
  };

  const useFlute = () => {
      if (inventory.flute <= 0) { showMessage("¡No tienes flauta!", "text-red-400"); return; }
      onUseItem('flute');
      setHumanStunUntil(Date.now() + 10000); 
      showMessage("¡Humanos aturdidos (10s)!", "text-blue-400");
  };

  const useMagicStar = () => {
     if (inventory.magicStar <= 0) { showMessage("¡No tienes estrella!", "text-red-400"); return; }
     onUseItem('magicStar');
     // Hardcore: 30s instead of 60s
     const duration = isHardcore ? 30000 : 60000;
     setInvincibleUntil(Date.now() + duration); 
     showMessage(`¡INVENCIBLE (${duration/1000}s)!`, "text-yellow-300");
  };

  const shootPistol = (playerId: number) => {
      if (!isShootingEnabled) return;
      if (bossAmmo <= 0) { showMessage("¡SIN MUNICIÓN!", "text-red-500"); return; }
      
      const player = activePlayers.find(p => p.id === playerId);
      if (!player) return;

      // Special ammo check
      if (selectedAmmo === AmmoType.FIRE && !inventory.ammoFire) {
           showMessage("¡NO TIENES BALAS DE FUEGO!", "text-red-500"); return;
      }
      if (selectedAmmo === AmmoType.CHEESE && !inventory.ammoCheese) {
           showMessage("¡NO TIENES BALAS DE QUESO!", "text-red-500"); return;
      }

      setBossAmmo(prev => prev - 1);
      audioManager.playSFX('shoot');
      
      // Start slightly ahead to avoid immediate collision
      setProjectiles(prev => [...prev, {
          id: `bullet-${Date.now()}-${Math.random()}`,
          x: player.x + player.lastDir.x,
          y: player.y + player.lastDir.y,
          dx: player.lastDir.x,
          dy: player.lastDir.y,
          ownerId: playerId,
          ammoType: selectedAmmo
      }]);
  };

  // --- DAMAGE LOGIC ---
  const handlePlayerDamage = useCallback((playerId: number, reason: string, damage: number = 1) => {
    if (Date.now() < invincibleUntil) return;

    setActivePlayers(prev => {
        const next = [...prev];
        const idx = next.findIndex(p => p.id === playerId);
        if (idx === -1) return prev;
        const player = { ...next[idx] };
        if (player.dead || player.escaped) return prev;

        player.lives -= damage;
        audioManager.playSFX('hit');
        
        if (player.lives <= 0) {
            audioManager.playSFX('evil_laugh'); // Boss laugh on death
            if (gameMode === GameMode.COMPETITIVE) {
                player.dead = true;
                player.lives = isHardcore ? 1 : 3;
                showMessage(`P${player.id} eliminado. Reapareciendo...`, "text-red-600");
                setTimeout(() => {
                    setActivePlayers(curr => curr.map(p => p.id === playerId ? { ...p, dead: false, x: levelData.startPos.x, y: levelData.startPos.y } : p));
                }, 3000);
            } else {
                player.dead = true;
                player.lives = 0;
                showMessage(`P${player.id} ha caído: ${reason}`, "text-red-600");
            }
        } else {
            if (damage >= 1) {
                if (isBossMode) {
                    player.x = 0; player.y = 0;
                } else {
                    player.x = levelData.startPos.x;
                    player.y = levelData.startPos.y;
                }
            }
            showMessage(`P${player.id}: ${reason} (-${damage} Vida)`, "text-red-400");
        }
        next[idx] = player;
        return next;
    });
  }, [levelData.startPos, activePlayers, gameMode, invincibleUntil, isBossMode, isHardcore]); 

  // --- ENEMY MOVEMENT (Main Game) ---
  const moveEnemies = useCallback(() => {
    setEnemies(prevEnemies => {
        return prevEnemies.map(enemy => {
            if (enemy.isHugged || enemy.type === 'pepe' || enemy.type === 'giant_rat' || enemy.type === 'fernanfloo') return enemy;
            
            if (enemy.type === 'rat' && Date.now() < ratStunUntil) return enemy;
            if (enemy.type === 'human' && Date.now() < humanStunUntil) return enemy;

            const targets = activePlayers.filter(p => !p.escaped && !p.dead);
            if (targets.length === 0) return enemy;

            const closest = targets.reduce((prev, curr) => {
                const distPrev = Math.abs(prev.x - enemy.x) + Math.abs(prev.y - enemy.y);
                const distCurr = Math.abs(curr.x - enemy.x) + Math.abs(curr.y - enemy.y);
                return distCurr < distPrev ? curr : prev;
            });

            const dx = closest.x - enemy.x;
            const dy = closest.y - enemy.y;
            let nextX = enemy.x;
            let nextY = enemy.y;

            if (Math.abs(dx) > Math.abs(dy)) nextX += Math.sign(dx);
            else nextY += Math.sign(dy);

            const tile = getTileAt(nextX, nextY);
            if (!tile || tile.type !== 'floor') { 
                nextX = enemy.x;
                nextY = enemy.y;
            }
            return { ...enemy, x: nextX, y: nextY };
        });
    });
  }, [getTileAt, activePlayers, ratStunUntil, humanStunUntil]);

  // --- BOSS LOGIC (PEPE / SECRET ROOM) ---
  const initBossMode = () => {
      audioManager.playTheme('BOSS'); 
      savedLevelState.current = {
          tiles: localTiles,
          enemies: enemies,
          players: activePlayers
      };

      const arenaSize = 10;
      const arenaTiles: Tile[] = [];
      for(let y=0; y<arenaSize; y++) {
          for(let x=0; x<arenaSize; x++) {
              arenaTiles.push({x, y, type: 'floor'});
          }
      }

      setLocalTiles(arenaTiles);
      setEnemies([{id: 'pepe', x: 5, y: 5, type: 'pepe'}]);
      setLightnings([]);
      setProjectiles([]);
      setBossHp(100);
      setBossAmmo(50);
      setIsBossMode(true);
      setBossDizzy(false);
      setShowKeypad(false);

      setActivePlayers(prev => prev.map(p => ({...p, x: 0, y: 0, lastDir: {x: 0, y: 1}})));
      showMessage("¡PISTOLA EQUIPADA! (SHIFT para disparar)", "text-yellow-400");
  };

  const endBossMode = (victory: boolean) => {
      if (!savedLevelState.current) return;
      if (levelData.levelNumber > 12) audioManager.playTheme('CITY'); else audioManager.playTheme('SEWER');
      
      const { tiles, enemies: savedEnemies, players: savedPlayers } = savedLevelState.current;
      setLocalTiles(tiles);
      if (victory) {
           setLocalTiles(prev => prev.filter(t => t.type !== 'secret_door'));
           setActivePlayers(curr => curr.map(p => {
                const saved = savedPlayers.find(sp => sp.id === p.id);
                return { ...p, x: saved ? saved.x : levelData.startPos.x, y: saved ? saved.y : levelData.startPos.y, isDucking: false };
           }));
           onGetItem('magicStar');
           showMessage("¡PEPE DERROTADO! +1 Estrella Mágica", "text-yellow-300");
      } else {
           setActivePlayers(curr => curr.map(p => {
                const saved = savedPlayers.find(sp => sp.id === p.id);
                return { ...p, x: saved ? saved.x : levelData.startPos.x, y: saved ? saved.y : levelData.startPos.y, isDucking: false };
           }));
      }

      setEnemies(savedEnemies);
      setLightnings([]);
      setProjectiles([]);
      setIsBossMode(false);
  };

  useEffect(() => {
      // Logic for Pepe Boss Mode
      if (!isBossMode) {
          if (bossMoveInterval.current) clearInterval(bossMoveInterval.current);
          if (bossCycleInterval.current) clearInterval(bossCycleInterval.current);
          if (bossLightningInterval.current) clearInterval(bossLightningInterval.current);
          return;
      }

      let isActive = true;
      bossCycleInterval.current = setInterval(() => {
          isActive = !isActive;
          setBossDizzy(!isActive);
          if (!isActive) {
              showMessage("¡PEPE ESTÁ MAREADO!", "text-green-300");
              setLightnings([]);
          } else {
              showMessage("¡PEPE SE RECUPERÓ!", "text-red-400");
          }
      }, isActive ? 20000 : 5000); 

      bossMoveInterval.current = setInterval(() => {
          if (bossDizzy) return;
          setEnemies(prev => prev.map(e => {
              if (e.type !== 'pepe') {
                  if (e.type === 'rat') {
                      const target = activePlayers.find(p => !p.dead && !p.escaped);
                      if (!target) return e;
                      const dx = target.x - e.x;
                      const dy = target.y - e.y;
                      let nx = e.x, ny = e.y;
                      if (Math.abs(dx) > Math.abs(dy)) nx += Math.sign(dx); else ny += Math.sign(dy);
                      if (nx >=0 && nx < 10 && ny >= 0 && ny < 10) return {...e, x: nx, y: ny};
                  }
                  return e;
              }
              const moves = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
              const move = moves[Math.floor(Math.random()*moves.length)];
              const nx = Math.max(0, Math.min(9, e.x + move.x));
              const ny = Math.max(0, Math.min(9, e.y + move.y));
              return { ...e, x: nx, y: ny };
          }));
      }, 800);

      bossLightningInterval.current = setInterval(() => {
          if (bossDizzy) return;
          const pepe = enemies.find(e => e.type === 'pepe');
          const target = activePlayers.find(p => !p.dead && !p.escaped);
          if (pepe && target) {
              setLightnings(prev => [...prev, {
                  id: `lightning-${Date.now()}`,
                  x: pepe.x,
                  y: pepe.y,
                  targetId: target.id
              }]);
          }
      }, 2500);

      return () => {
          if (bossMoveInterval.current) clearInterval(bossMoveInterval.current);
          if (bossCycleInterval.current) clearInterval(bossCycleInterval.current);
          if (bossLightningInterval.current) clearInterval(bossLightningInterval.current);
      };
  }, [isBossMode, bossDizzy, activePlayers, localTiles, enemies]);

  // --- MAIN BOSSES AI (Level 12 / 22) ---
  useEffect(() => {
     if (fernanflooBoxInterval.current) clearInterval(fernanflooBoxInterval.current);
     if (levelData.levelNumber !== 12 && levelData.levelNumber !== 22) return;

     // Giant Rat AI (Level 12)
     if (levelData.levelNumber === 12) {
          const moveInterval = setInterval(() => {
              if (Date.now() < ratStunUntil) return;
              setEnemies(prev => prev.map(e => {
                  if (e.type !== 'giant_rat') return e;
                  const target = activePlayers.find(p => !p.dead && !p.escaped);
                  if (!target) return e;
                  const dx = target.x - e.x;
                  const dy = target.y - e.y;
                  let nx = e.x, ny = e.y;
                  // Fast movement
                  if (Math.random() > 0.2) {
                      if (Math.abs(dx) > Math.abs(dy)) nx += Math.sign(dx); else ny += Math.sign(dy);
                  }
                  const tile = getTileAt(nx, ny);
                  if (tile?.type === 'wall') return e;
                  return { ...e, x: nx, y: ny };
              }));
          }, 400); // Very fast
          return () => clearInterval(moveInterval);
     }

     // Fernanfloo AI (Level 22)
     if (levelData.levelNumber === 22) {
         // Spawns boxes every 2s
         fernanflooBoxInterval.current = setInterval(() => {
             const floors = localTiles.filter(t => t.type === 'floor');
             if (floors.length === 0) return;
             const spot = floors[Math.floor(Math.random() * floors.length)];
             const types = [AmmoType.NORMAL, AmmoType.FIRE, AmmoType.CHEESE];
             const type = types[Math.floor(Math.random() * types.length)];
             
             setTargetBoxes(prev => {
                 if (prev.length > 5) return prev; // Max boxes
                 return [...prev, { id: `box-${Date.now()}`, x: spot.x, y: spot.y, requiredAmmo: type }];
             });
         }, 2000);

         // Boss Move
         const moveInterval = setInterval(() => {
              setEnemies(prev => prev.map(e => {
                  if (e.type !== 'fernanfloo') return e;
                  const moves = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}, {x:1,y:1}, {x:-1,y:-1}];
                  const move = moves[Math.floor(Math.random()*moves.length)];
                  const nx = Math.max(0, Math.min(levelData.gridSize-1, e.x + move.x));
                  const ny = Math.max(0, Math.min(levelData.gridSize-1, e.y + move.y));
                  const tile = getTileAt(nx, ny);
                  if (tile?.type === 'wall') return e;
                  return { ...e, x: nx, y: ny };
              }));
         }, 1000);

         return () => {
             clearInterval(fernanflooBoxInterval.current!);
             clearInterval(moveInterval);
         }
     }
  }, [levelData, activePlayers, ratStunUntil, localTiles, getTileAt]);


  // Projectile Logic (Pistol)
  useEffect(() => {
      if (!isShootingEnabled) return;
      
      const interval = setInterval(() => {
          setProjectiles(prev => {
              if (prev.length === 0) return prev;
              const next: Projectile[] = [];
              prev.forEach(p => {
                  const nx = p.x + p.dx;
                  const ny = p.y + p.dy;
                  
                  // Out of bounds or wall
                  if (nx < 0 || nx >= levelData.gridSize || ny < 0 || ny >= levelData.gridSize) return;
                  const tile = getTileAt(nx, ny);
                  if (tile?.type === 'wall') return;

                  // Collision Check
                  
                  // 1. Fernanfloo Boxes (Level 22)
                  if (isFinalBoss) {
                      const boxHit = targetBoxes.find(b => b.x === nx && b.y === ny);
                      if (boxHit) {
                          if (boxHit.requiredAmmo === p.ammoType) {
                              // Correct ammo
                              setTargetBoxes(curr => curr.filter(b => b.id !== boxHit.id));
                              handleBossDamage(10, "CAJA DESTRUIDA");
                              audioManager.playSFX('collect'); // Explosion sound replacement
                              return; // Destroy bullet
                          } else {
                              // Wrong ammo - bullet blocked but no damage
                              return; 
                          }
                      }
                  }

                  // 2. Enemies / Bosses
                  const hitEnemy = enemies.find(e => e.x === nx && e.y === ny);
                  if (hitEnemy) {
                      let damage = p.ammoType === AmmoType.CHEESE ? 60 : (p.ammoType === AmmoType.FIRE ? 40 : 20);
                      
                      // Hardcore Nerf (-5 Damage)
                      if (isHardcore) damage = Math.max(1, damage - 5);

                      if (hitEnemy.type === 'pepe') {
                           handleBossDamage(20, "DISPARO"); // Pepe always 20
                           return; 
                      }
                      
                      if (hitEnemy.type === 'giant_rat') {
                          handleBossDamage(damage, "DISPARO");
                          if (p.ammoType === AmmoType.CHEESE) {
                              setRatStunUntil(Date.now() + 20000); // 20s Stun
                              showMessage("¡JEFE ATURDIDO!", "text-yellow-400");
                          }
                          return;
                      }

                      if (hitEnemy.type === 'fernanfloo') {
                          // Invulnerable to direct shots
                          audioManager.playSFX('hit'); // Metal sound
                          return; // Bullet destroys but no damage
                      }
                      
                      // Level 17 Kill Mechanic
                      if (levelData.levelNumber === 17 && hitEnemy.type === 'human') {
                           setEnemies(curr => curr.filter(e => e.id !== hitEnemy.id));
                           setKilledCount(c => c + 1);
                           showMessage("¡Ladrón eliminado!", "text-red-500");
                           audioManager.playSFX('hit');
                           return; 
                      }

                      if (isBossMode && hitEnemy.type === 'rat') {
                           setEnemies(curr => curr.filter(e => e.id !== hitEnemy.id));
                           return;
                      }
                  }

                  next.push({ ...p, x: nx, y: ny });
              });
              return next;
          });
      }, 100); // Speed up bullets

      return () => clearInterval(interval);
  }, [isShootingEnabled, getTileAt, enemies, levelData, isBossMode, isFinalBoss, targetBoxes, isHardcore, handleBossDamage]);


  // Lightning Logic
  useEffect(() => {
      if (!isBossMode || lightnings.length === 0) return;

      const interval = setInterval(() => {
          setLightnings(prev => {
              const next: Lightning[] = [];
              prev.forEach(l => {
                   const target = activePlayers.find(p => p.id === l.targetId);
                   if (!target) return; 

                   const dx = target.x - l.x;
                   const dy = target.y - l.y;
                   let nx = l.x;
                   let ny = l.y;
                   
                   if (Math.abs(dx) > Math.abs(dy)) nx += Math.sign(dx);
                   else ny += Math.sign(dy);
                   
                   const hitPlayer = activePlayers.find(p => p.x === nx && p.y === ny);
                   if (hitPlayer) {
                       if (hitPlayer.isDucking) {
                           // Dodged
                       } else {
                           handlePlayerDamage(hitPlayer.id, "¡Rayo Azul!", 1);
                       }
                   } else {
                       if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
                           next.push({ ...l, x: nx, y: ny });
                       }
                   }
              });
              return next;
          });
      }, 400); 

      return () => clearInterval(interval);
  }, [isBossMode, lightnings, activePlayers, handlePlayerDamage]);


  // --- KEYPAD & MODAL LOGIC ---
  const handleKeypadPress = (digit: number) => {
      if (keypadInput.length < 4) setKeypadInput(prev => prev + digit.toString());
      audioManager.playSFX('collect'); 
  };

  const handleKeypadClear = () => setKeypadInput("");

  const handleKeypadSubmit = () => {
      if (interactingSecretDoor) {
           if (keypadInput === levelData.secretCode) {
               showMessage("¡CÓDIGO CORRECTO!", "text-purple-400");
               audioManager.playSFX('collect');
               initBossMode();
           } else {
               showMessage("¡CÓDIGO INCORRECTO!", "text-red-500");
               setKeypadInput("");
           }
      } else {
           if (keypadInput === securityCode && interactingDoorPos) {
               setLocalTiles(prev => prev.map(t => (t.x === interactingDoorPos.x && t.y === interactingDoorPos.y) ? { ...t, type: 'floor' } : t));
               showMessage("¡ACCESO CONCEDIDO!", "text-green-400");
               audioManager.playSFX('collect');
               setShowKeypad(false);
               setInteractingDoorPos(null);
           } else {
               showMessage("¡CÓDIGO INCORRECTO!", "text-red-500");
               setKeypadInput("");
           }
      }
  };


  const handlePlayerMove = useCallback(async (playerId: number, dx: number, dy: number) => {
    if (isProcessingTurn || showKeypad) return;

    const pIndex = activePlayers.findIndex(p => p.id === playerId);
    if (pIndex === -1) return;
    const player = activePlayers[pIndex];

    if (player.escaped || player.dead || player.isDucking) return;

    const targetX = player.x + dx;
    const targetY = player.y + dy;
    const targetTile = getTileAt(targetX, targetY);

    if (!targetTile || targetTile.type === 'wall') {
        setActivePlayers(prev => {
            const next = [...prev];
            next[pIndex] = { ...next[pIndex], lastDir: { x: dx, y: dy } };
            return next;
        });
        return;
    }

    // --- Interaction Logic ---
    if (targetTile.type === 'breakable_wall') {
        if (inventory.hammer) {
            setLocalTiles(prev => prev.map(t => (t.x === targetX && t.y === targetY) ? { ...t, type: 'floor' } : t));
            showMessage("¡Bloque roto!", "text-yellow-400");
            audioManager.playSFX('hit');
        } else {
            showMessage("Necesitas el Martillo", "text-slate-400");
            return;
        }
    }
    
    if (targetTile.type === 'chest') {
        showMessage("Mantén ESPACIO para abrir", "text-yellow-400");
        return;
    }

    if (targetTile.type === 'locked_door') {
        setInteractingDoorPos({ x: targetX, y: targetY });
        setInteractingSecretDoor(false);
        setKeypadInput("");
        setShowKeypad(true);
        return;
    }

    if (targetTile.type === 'secret_door') {
        setInteractingSecretDoor(true);
        setKeypadInput("");
        setShowKeypad(true);
        return;
    }

    if (targetTile.type === 'end') {
        if (levelData.levelNumber === 6) {
            const remainingBlocks = localTiles.filter(t => t.type === 'breakable_wall').length;
            if (remainingBlocks > 0) {
                showMessage(`¡Rompe ${remainingBlocks} bloques más!`, "text-red-400");
                return;
            }
        }
        if (levelData.levelNumber === 17) {
            if (killedCount < 2) { 
                showMessage(`¡Elimina ladrones! (${killedCount}/2)`, "text-red-400");
                return;
            }
        }
        if (levelData.levelNumber === 20) {
            // Door check handles blockage, but if they glitch through door...
        }
        // Boss Level Checks
        if (isSewerBoss || isFinalBoss) {
            if (bossHp > 0) {
                showMessage("¡DERROTA AL JEFE PRIMERO!", "text-red-500");
                return;
            }
        }
    }

    setIsProcessingTurn(true);

    const contactEnemy = enemies.find(e => e.x === targetX && e.y === targetY);
    if (contactEnemy && (contactEnemy.type === 'pepe' || contactEnemy.type === 'giant_rat' || contactEnemy.type === 'fernanfloo' || contactEnemy.type === 'animatronic')) {
        if (contactEnemy.type === 'pepe' && bossDizzy) {
             // Safe
        } else if (contactEnemy.type === 'animatronic') {
             handlePlayerDamage(playerId, "¡Jumpscare!", 1);
        } else {
             handlePlayerDamage(playerId, "¡JEFE!", 1);
        }
        setActivePlayers(prev => {
            const next = [...prev];
            next[pIndex] = { ...next[pIndex], lastDir: { x: dx, y: dy } };
            return next;
        });
        setIsProcessingTurn(false);
        return;
    }

    setActivePlayers(prev => {
        const next = [...prev];
        next[pIndex] = { ...next[pIndex], x: targetX, y: targetY, lastDir: { x: dx, y: dy } };
        return next;
    });

    if (targetTile.type === 'code_clue') {
        showMessage(`CÓDIGO SECRETO: ${securityCode}`, "text-cyan-400");
        audioManager.playSFX('collect');
    }
    
    if (targetTile.type === 'secret_clue') {
        showMessage(`CLAVE CUARTO SECRETO: ${levelData.secretCode}`, "text-purple-400");
        audioManager.playSFX('collect');
    }

    if (targetTile.type === 'end') {
        setActivePlayers(prev => {
            const next = [...prev];
            next[pIndex].escaped = true;
            return next;
        });
        
        if (gameMode === GameMode.COMPETITIVE) {
            onWin(playerId);
        } else {
            showMessage(`¡Jugador ${playerId} escapó!`, "text-green-400");
        }

        audioManager.playSFX('collect');
        setIsProcessingTurn(false);
        return;
    }

    if (targetTile.type === 'water') {
        await new Promise(r => setTimeout(r, 200));
        const roll = Math.random();
        if (roll > 0.507) {
            handlePlayerDamage(playerId, "¡Se ahogó!");
            setIsProcessingTurn(false);
            return;
        } else {
            showMessage("¡Salvado del agua!", "text-blue-400");
        }
    }

    if (activePlayers.some(p => !p.escaped && !p.dead)) {
        await new Promise(r => setTimeout(r, 100));
        moveEnemies();
    }
    setIsProcessingTurn(false);

  }, [activePlayers, isProcessingTurn, showKeypad, getTileAt, handlePlayerDamage, moveEnemies, inventory.hammer, localTiles, levelData.levelNumber, levelData.secretCode, securityCode, gameMode, onWin, killedCount, interactingSecretDoor, bossDizzy, enemies, isSewerBoss, isFinalBoss, bossHp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (showKeypad) return; 

        // Ducking
        if (e.key === 'Control') setActivePlayers(prev => prev.map(p => ({ ...p, isDucking: true })));

        // Ammo Switch
        if (e.key === '1') { setSelectedAmmo(AmmoType.NORMAL); showMessage("Bala NORMAL", "text-white"); }
        if (e.key === '2') { setSelectedAmmo(AmmoType.FIRE); showMessage("Bala FUEGO", "text-red-400"); }
        if (e.key === '3') { setSelectedAmmo(AmmoType.CHEESE); showMessage("Bala QUESO", "text-yellow-400"); }

        // Shooting
        if (e.key === 'Shift' && isShootingEnabled) {
            activePlayers.forEach(p => { if(!p.dead) shootPistol(p.id); });
        }

        if (e.code === 'Space') {
            e.preventDefault();
            const chestNearby = activePlayers.some(p => {
                if (p.dead || p.escaped) return false;
                const neighbors = [{x: p.x+1, y: p.y}, {x: p.x-1, y: p.y}, {x: p.x, y: p.y+1}, {x: p.x, y: p.y-1}];
                const chest = neighbors.find(n => getTileAt(n.x, n.y)?.type === 'chest');
                if (chest) {
                    setInteractingChestPos(chest);
                    return true;
                }
                return false;
            });

            if (chestNearby) {
                setChestProgress(prev => {
                    const newProgress = Math.min(prev + 10, 100);
                    if (newProgress === 100) {
                        if (Math.random() < 0.10) {
                            handlePlayerDamage(1, "¡Martillo defectuoso!", 0.5); 
                            showMessage("¡BOOM! ¡Era defectuoso!", "text-red-500");
                        } else {
                            onGetItem('hammer');
                            showMessage("¡OBTUVISTE EL MARTILLO!", "text-yellow-300");
                        }
                        
                        setLocalTiles(tiles => tiles.map(t => (t.x === interactingChestPos?.x && t.y === interactingChestPos?.y) ? { ...t, type: 'floor' } : t));
                        return 0; 
                    }
                    return newProgress;
                });
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Control') {
            setActivePlayers(prev => prev.map(p => ({ ...p, isDucking: false })));
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activePlayers, getTileAt, interactingChestPos, onGetItem, showKeypad, levelData.levelNumber, handlePlayerDamage, isShootingEnabled, bossAmmo, selectedAmmo, inventory]);

  useEffect(() => {
      if (isProcessingTurn) return;
      activePlayers.forEach(p => {
          if (!p.escaped && !p.dead) {
              const hitByEnemy = enemies.find(e => e.x === p.x && e.y === p.y);
              if (hitByEnemy && !hitByEnemy.isHugged) {
                  if (hitByEnemy.type === 'pepe') {
                     if (!bossDizzy) handlePlayerDamage(p.id, "¡Payaso Pepe!", 1);
                  } else if (hitByEnemy.type === 'giant_rat') {
                      handlePlayerDamage(p.id, "¡Rata Gigante!", 1);
                  } else if (hitByEnemy.type === 'fernanfloo') {
                      handlePlayerDamage(p.id, "¡Fernanfloo!", 1);
                  } else if (hitByEnemy.type === 'animatronic') {
                      handlePlayerDamage(p.id, "¡Jumpscare!", 1);
                  } else {
                      const msg = hitByEnemy.type === 'human' ? "¡Te atraparon!" : "¡Rata!";
                      handlePlayerDamage(p.id, msg);
                  }
              }
          }
      });
  }, [enemies, activePlayers, handlePlayerDamage, isProcessingTurn, bossDizzy]);

  useEffect(() => {
      if (gameMode === GameMode.COMPETITIVE) return; 
      if (isBossMode) return; 

      const alivePlayers = activePlayers.filter(p => !p.dead);
      const allDead = activePlayers.length > 0 && alivePlayers.length === 0;
      if (allDead) setTimeout(onGameOver, 1000);
      const allAccountingFor = activePlayers.every(p => p.escaped || p.dead);
      const someoneEscaped = activePlayers.some(p => p.escaped);
      if (allAccountingFor && someoneEscaped) setTimeout(() => onWin(), 1000);
  }, [activePlayers, onWin, onGameOver, gameMode, isBossMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessingTurn || showKeypad) return;
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.code) > -1) e.preventDefault();

      if (players.find(p => p.id === 1)) {
          if (e.key === 'ArrowUp') handlePlayerMove(1, 0, -1);
          else if (e.key === 'ArrowDown') handlePlayerMove(1, 0, 1);
          else if (e.key === 'ArrowLeft') handlePlayerMove(1, -1, 0);
          else if (e.key === 'ArrowRight') handlePlayerMove(1, 1, 0);
      }
      if (players.find(p => p.id === 2)) {
          if (e.key.toLowerCase() === 'w') handlePlayerMove(2, 0, -1);
          else if (e.key.toLowerCase() === 's') handlePlayerMove(2, 0, 1);
          else if (e.key.toLowerCase() === 'a') handlePlayerMove(2, -1, 0);
          else if (e.key.toLowerCase() === 'd') handlePlayerMove(2, 1, 0);
      }
      if (players.find(p => p.id === 3)) {
          if (e.key.toLowerCase() === 'i') handlePlayerMove(3, 0, -1);
          else if (e.key.toLowerCase() === 'k') handlePlayerMove(3, 0, 1);
          else if (e.key.toLowerCase() === 'j') handlePlayerMove(3, -1, 0);
          else if (e.key.toLowerCase() === 'l') handlePlayerMove(3, 1, 0);
      }
      if (players.find(p => p.id === 4)) {
          if (e.key === '8') handlePlayerMove(4, 0, -1);
          else if (e.key === '2') handlePlayerMove(4, 0, 1); 
          else if (e.key === '4') handlePlayerMove(4, -1, 0);
          else if (e.key === '6') handlePlayerMove(4, 1, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayerMove, players, isProcessingTurn, showKeypad]);

  const tileSize = 50; 
  const getTileStyle = (tile: Tile) => {
      const isWall = tile.type === 'wall';
      const isFloor = tile.type === 'floor' || tile.type === 'start';
      
      if (isPizzeria) {
          if (isWall) return 'bg-red-900 border-2 border-red-950 shadow-md';
          // Checkered floor logic based on x+y parity
          if (isFloor) return (tile.x + tile.y) % 2 === 0 ? 'bg-white border border-gray-300' : 'bg-black border border-gray-800';
      } else if (isCityLevel) {
           if (isWall) return 'bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-stone-400 via-stone-500 to-stone-600 border-2 border-stone-700 shadow-md'; 
           if (isFloor) return 'bg-neutral-800 border border-neutral-700'; 
      } else {
           if (isWall) return 'bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-slate-700 via-slate-600 to-slate-800 border-2 border-slate-900 shadow-inner';
           if (isFloor) return 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-900 border border-slate-800';
      }

      if (tile.type === 'water') return 'bg-[linear-gradient(45deg,#1e3a8a_25%,#172554_25%,#172554_50%,#1e3a8a_50%,#1e3a8a_75%,#172554_75%,#172554_100%)] bg-[length:10px_10px] animate-pulse';
      if (tile.type === 'breakable_wall') return 'bg-[conic-gradient(at_bottom_right,_var(--tw-gradient-stops))] from-stone-600 via-stone-500 to-stone-700 border-2 border-stone-800';
      if (tile.type === 'boss_block') return 'bg-red-600 border-2 border-red-800 animate-pulse';
      if (tile.type === 'chest') return 'bg-yellow-700 border-2 border-yellow-500 shadow-lg';
      if (tile.type === 'end') return 'bg-black border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]';
      if (tile.type === 'code_clue') return 'bg-cyan-900 border-2 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]';
      if (tile.type === 'secret_clue') return 'bg-purple-900 border-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]';
      if (tile.type === 'locked_door') return 'bg-slate-300 border-4 border-slate-500 shadow-2xl';
      if (tile.type === 'secret_door') return 'bg-purple-900 border-4 border-purple-600 shadow-2xl animate-pulse';
      return 'bg-slate-800';
  };

  const renderGameView = (focusedPlayerId?: number) => {
      const focusPlayer = activePlayers.find(p => p.id === focusedPlayerId);
      
      const viewStyle: React.CSSProperties = focusedPlayerId && focusPlayer 
        ? { 
            transform: `translate(calc(50% - ${focusPlayer.x * 50 + 25}px), calc(50% - ${focusPlayer.y * 50 + 25}px))`,
            transition: 'transform 0.3s ease-out'
          }
        : {};

      const finalViewStyle = isBossMode ? {} : viewStyle;
      // Hardcore mode might double the grid size in width, make sure we use correct column count
      const finalGridSize = isBossMode ? 10 : levelData.gridSize;

      return (
        <div className="relative" style={{ width: focusedPlayerId ? '100%' : 'auto', height: focusedPlayerId ? '100%' : 'auto' }}>
            <div 
                className="grid gap-[2px] transition-transform duration-300"
                style={{
                    gridTemplateColumns: `repeat(${finalGridSize}, minmax(0, 1fr))`,
                    width: `${finalGridSize * tileSize}px`,
                    ...finalViewStyle
                }}
            >
            {localTiles.map((tile, i) => {
                // Key needs to be unique if map was duplicated. Use index if x,y duplicate (they shouldn't if generated correctly)
                // But duplicate map changes x,y in levelData generation, so key `${tile.x}-${tile.y}` is safe.
                
                let content = null;
                if (tile.type === 'breakable_wall') content = <ShieldAlert size={16} className="text-stone-300 opacity-60" />;
                if (tile.type === 'end') content = <div className="text-[8px] text-yellow-300 font-bold text-center">SALIDA</div>;
                if (tile.type === 'chest') {
                    content = (
                        <div className="flex flex-col items-center">
                            <Box size={20} className="text-yellow-200 fill-yellow-900" />
                            {chestProgress > 0 && interactingChestPos?.x === tile.x && interactingChestPos?.y === tile.y && (
                                <div className="absolute -top-3 w-8 h-1 bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{width: `${chestProgress}%`}}></div>
                                </div>
                            )}
                        </div>
                    );
                }
                if (tile.type === 'code_clue') content = <FileText size={20} className="text-cyan-200 animate-pulse" />;
                if (tile.type === 'secret_clue') content = <AlertTriangle size={20} className="text-purple-200 animate-pulse" />;
                if (tile.type === 'locked_door') content = <div className="flex flex-col items-center"><KeyRound size={20} className="text-slate-600 mb-1" /><Lock size={14} className="text-red-600" /></div>;
                if (tile.type === 'secret_door') content = <HelpCircle size={24} className="text-purple-300" />;

                const playersHere = activePlayers.filter(p => p.x === tile.x && p.y === tile.y && !p.escaped && !p.dead);
                const enemyHere = enemies.find(r => r.x === tile.x && r.y === tile.y);
                const lightningHere = lightnings.find(l => l.x === tile.x && l.y === tile.y);
                const projectileHere = projectiles.find(p => p.x === tile.x && p.y === tile.y);
                const boxHere = targetBoxes.find(b => b.x === tile.x && b.y === tile.y);

                return (
                <div key={`${tile.x}-${tile.y}-${i}`} className={`aspect-square relative flex items-center justify-center rounded-sm ${getTileStyle(tile)}`}>
                    {content}
                    
                    {enemyHere && playersHere.length === 0 && (
                        <div className={`absolute inset-0 flex items-center justify-center z-10 transition-transform duration-200 filter drop-shadow-lg ${bossDizzy && enemyHere.type === 'pepe' ? 'animate-spin' : ''}`}>
                            {enemyHere.type === 'pepe'
                                ? <span className={`text-4xl transition-transform duration-500 ${bossDizzy ? 'animate-spin opacity-50 grayscale' : 'animate-bounce'}`}>{bossDizzy ? '😵' : '🤡'}</span>
                                : enemyHere.type === 'giant_rat'
                                    ? <span className="text-5xl animate-bounce drop-shadow-[0_0_5px_#84cc16]">🐀</span>
                                    : enemyHere.type === 'fernanfloo'
                                        ? <span className="text-5xl animate-pulse drop-shadow-[0_0_5px_#22c55e]">🧟</span>
                                        : enemyHere.type === 'animatronic'
                                            ? <Bot size={32} className="text-purple-500 animate-bounce" />
                                            : enemyHere.type === 'rat' 
                                                ? <span className={`text-2xl filter drop-shadow-[0_0_2px_#84cc16] ${Date.now() < ratStunUntil ? 'animate-spin grayscale' : 'animate-pulse'}`}>🐀</span>
                                                : <span className={`text-2xl filter drop-shadow-[0_0_2px_#ef4444] ${Date.now() < humanStunUntil ? 'animate-spin grayscale' : 'animate-bounce'}`}>🦹</span>
                            }
                        </div>
                    )}

                    {boxHere && (
                        <div className={`absolute inset-0 flex items-center justify-center z-15 animate-bounce rounded border-2 ${
                            boxHere.requiredAmmo === AmmoType.FIRE ? 'bg-red-800 border-red-500 text-red-300' :
                            boxHere.requiredAmmo === AmmoType.CHEESE ? 'bg-yellow-800 border-yellow-500 text-yellow-300' :
                            'bg-gray-700 border-gray-400 text-gray-300'
                        }`}>
                           <Box size={24} />
                        </div>
                    )}

                    {lightningHere && (
                        <div className="absolute inset-0 flex items-center justify-center z-15 animate-pulse">
                            <Zap size={24} className="text-blue-400 fill-blue-200" />
                        </div>
                    )}

                    {projectileHere && (
                        <div className="absolute inset-0 flex items-center justify-center z-15">
                            <div className={`w-3 h-3 rounded-full shadow-[0_0_5px_rgba(250,204,21,1)] ${
                                projectileHere.ammoType === AmmoType.FIRE ? 'bg-red-500' : 
                                projectileHere.ammoType === AmmoType.CHEESE ? 'bg-yellow-400' : 'bg-white'
                            }`}></div>
                        </div>
                    )}

                    {playersHere.map((p, idx) => {
                        const char = players.find(pl => pl.id === p.id)?.character;
                        if (!char) return null;
                        const isInvincible = Date.now() < invincibleUntil;
                        return (
                            <div key={p.id} className={`absolute z-20 transition-all duration-150 ease-linear ${idx > 0 ? 'translate-x-1 -translate-y-1' : ''} filter drop-shadow-md ${p.isDucking ? 'scale-y-[0.6] opacity-90' : ''}`}>
                                <CharacterIcon 
                                    character={char} 
                                    size="sm" 
                                    className={`w-6 h-6 md:w-8 md:h-8 ${isInvincible ? 'ring-2 ring-yellow-400 ring-offset-2 animate-pulse' : ''}`} 
                                />
                            </div>
                        )
                    })}
                </div>
                );
            })}
            </div>
        </div>
      );
  };

  const isSplitScreen = gameMode === GameMode.COMPETITIVE && players.length === 2 && !isBossMode;

  return (
    <div className={`flex flex-col items-center justify-center w-full h-full p-2 relative ${isCityLevel ? 'bg-neutral-900' : ''} ${isPizzeria ? 'bg-red-950' : ''}`}>
      
      {/* KEYPAD MODAL */}
      {showKeypad && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="bg-slate-800 p-6 rounded-xl border-4 border-slate-600 shadow-2xl w-64">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-cyan-400 font-bold pixel-font text-xs">TERMINAL</h3>
                      <button onClick={() => setShowKeypad(false)} className="text-red-500 hover:text-red-300"><X size={16}/></button>
                  </div>
                  <div className="bg-black border-2 border-slate-600 p-3 mb-4 rounded font-mono text-center text-xl tracking-[0.5em] text-green-500 h-12 flex items-center justify-center shadow-inner">
                      {keypadInput.padEnd(4, '_')}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                          <button key={num} onClick={() => handleKeypadPress(num)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded shadow active:scale-95 transition-transform">{num}</button>
                      ))}
                      <button onClick={handleKeypadClear} className="bg-red-900/50 hover:bg-red-800/50 text-red-200 font-bold py-3 rounded shadow active:scale-95 transition-transform flex items-center justify-center">C</button>
                      <button onClick={() => handleKeypadPress(0)} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded shadow active:scale-95 transition-transform">0</button>
                      <button onClick={handleKeypadSubmit} className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded shadow active:scale-95 transition-transform flex items-center justify-center"><Check size={16} /></button>
                  </div>
              </div>
          </div>
      )}

      {/* BOSS HEALTH BAR */}
      {(isBossMode || isSewerBoss || isFinalBoss) && (
          <div className="absolute top-4 z-50 w-full max-w-lg px-4 flex flex-col items-center">
              <div className="flex justify-between w-full text-red-400 font-bold mb-1">
                  <span>
                      {isSewerBoss ? 'RATA GIGANTE' : isFinalBoss ? 'FERNANFLOO' : 'PAYASO PEPE'} 
                      {bossDizzy ? ' (ATURDIDO)' : ''}
                  </span>
                  <span>{bossHp}%</span>
              </div>
              <div className="w-full h-4 bg-red-900 rounded-full overflow-hidden border border-red-500">
                  <div className="h-full bg-red-500 transition-all duration-300" style={{width: `${bossHp}%`}}></div>
              </div>
              <div className="flex gap-4 mt-2 justify-center">
                  <div className="text-yellow-300 text-xs font-bold bg-black/50 px-2 py-1 rounded border border-yellow-500 flex items-center gap-1">
                       <Crosshair size={12}/> BALA: {selectedAmmo} 
                  </div>
              </div>
          </div>
      )}

      {/* HUD Left */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-2 max-h-[90vh] overflow-y-auto">
         <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-600 shadow-xl min-w-[160px]">
            <div className={`${isCityLevel ? 'text-blue-400' : 'text-green-400'} font-bold pixel-font text-xs md:text-sm mb-2 text-center`}>
                {levelData.levelNumber}. {isCityLevel ? (isPizzeria ? 'PIZZERÍA' : 'CIUDAD') : 'ALCANTARILLA'} {isHardcore && <span className="text-red-600 text-[10px] ml-1">HC</span>}
            </div>
            
            <div className="space-y-2">
                {players.map(p => {
                    const state = activePlayers.find(ap => ap.id === p.id);
                    if (!state) return null;
                    return (
                        <div key={p.id} className={`flex items-center gap-2 p-1 rounded ${state.dead ? 'bg-red-900/30' : 'bg-black/20'}`}>
                            <div className="relative">
                                <CharacterIcon character={p.character} size="sm" className="w-6 h-6" />
                                {state.dead && <Skull size={16} className="absolute inset-0 m-auto text-red-500" />}
                                {state.escaped && <div className="absolute inset-0 m-auto text-green-500 font-bold text-lg">✓</div>}
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[10px] font-bold ${state.dead ? 'text-red-400 line-through' : 'text-white'}`}>
                                    {p.name}
                                </span>
                                <div className="flex">
                                    {[...Array(isHardcore ? 1 : 3)].map((_, i) => {
                                        let fill = "fill-slate-700 text-slate-700";
                                        if (!state.dead) {
                                            if (state.lives >= i + 1) fill = "fill-red-500 text-red-500";
                                            else if (state.lives > i) fill = "fill-red-500/50 text-red-500";
                                        }
                                        return <Heart key={i} size={10} className={fill} />;
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Weapon Selector */}
            {isShootingEnabled && (
                <div className="mt-2 pt-2 border-t border-slate-600">
                    <div className="text-[10px] text-slate-400 font-bold mb-1 text-center">MUNICIÓN (1, 2, 3)</div>
                    <div className="flex gap-1 justify-center">
                        <button onClick={() => setSelectedAmmo(AmmoType.NORMAL)} className={`w-6 h-6 rounded flex items-center justify-center border ${selectedAmmo === AmmoType.NORMAL ? 'bg-slate-200 border-white' : 'bg-slate-700 border-slate-600'}`}>
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                        </button>
                        <button disabled={!inventory.ammoFire} onClick={() => setSelectedAmmo(AmmoType.FIRE)} className={`w-6 h-6 rounded flex items-center justify-center border ${selectedAmmo === AmmoType.FIRE ? 'bg-red-600 border-red-300' : 'bg-slate-700 border-slate-600 opacity-50'}`}>
                            <Flame size={12} className="text-yellow-300 fill-current" />
                        </button>
                        <button disabled={!inventory.ammoCheese} onClick={() => setSelectedAmmo(AmmoType.CHEESE)} className={`w-6 h-6 rounded flex items-center justify-center border ${selectedAmmo === AmmoType.CHEESE ? 'bg-yellow-500 border-yellow-200' : 'bg-slate-700 border-slate-600 opacity-50'}`}>
                            <CircleOff size={12} className="text-white fill-current" />
                        </button>
                    </div>
                </div>
            )}

             <div className="border-t border-slate-600 pt-2 mt-2 space-y-2">
                 <button onClick={useRatPoison} className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50" disabled={inventory.ratPoison <= 0}>
                     <BriefcaseMedical size={12} />
                     <span>Veneno ({inventory.ratPoison})</span>
                 </button>
                 <button onClick={useCheese} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={inventory.raratuiCheese <= 0 || Date.now() < ratStunUntil}>
                     <CircleOff size={12} />
                     <span>Queso ({inventory.raratuiCheese})</span>
                 </button>
                 
                 {isCityLevel || isBossMode ? (
                     <>
                        <button onClick={useKnife} className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50" disabled={inventory.knife <= 0}>
                            <Sword size={12} />
                            <span>Cuchillo ({inventory.knife})</span>
                        </button>
                        <button onClick={useFlute} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={inventory.flute <= 0 || Date.now() < humanStunUntil}>
                            <Music size={12} />
                            <span>Flauta ({inventory.flute})</span>
                        </button>
                     </>
                 ) : null}

                 {isPizzeria && (
                    <button onClick={useWaterBucket} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50" disabled={inventory.waterBucket <= 0}>
                        <Droplets size={12} />
                        <span>Agua ({inventory.waterBucket})</span>
                    </button>
                 )}

                 <button onClick={useMagicStar} className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:to-orange-400 text-black font-bold text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={inventory.magicStar <= 0 || Date.now() < invincibleUntil}>
                    <Star size={12} fill="currentColor" />
                    <span>Estrella ({inventory.magicStar})</span>
                 </button>
             </div>
             {inventory.hammer && (
                 <div className="mt-2 bg-yellow-900/40 p-1 rounded border border-yellow-600 flex items-center justify-center gap-2">
                     <Hammer size={12} className="text-yellow-400" />
                     <span className="text-[10px] text-yellow-200 font-bold">Martillo</span>
                 </div>
             )}
         </div>
      </div>

      <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
           {gameMode === GameMode.COMPETITIVE && !isBossMode && (
               <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-xs animate-pulse border-2 border-red-400">
                   MODO COMPETITIVO
               </div>
           )}
           <button onClick={onExit} className="bg-red-600 text-white p-2 rounded text-xs font-bold shadow hover:bg-red-700">{TRANSLATIONS[language].BACK}</button>
      </div>
      
      {message && (
          <div className={`absolute top-20 z-50 bg-black/80 px-4 py-2 rounded-lg font-bold animate-bounce border-2 border-white ${message.color}`}>
              {message.text}
          </div>
      )}

      {/* RENDER VIEWPORT(S) */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        {isSplitScreen ? (
            <div className="flex w-full h-full border-4 border-slate-700 bg-black">
                <div className="w-1/2 h-full border-r-4 border-black relative overflow-hidden flex items-center justify-center bg-slate-900">
                    {renderGameView(1)}
                    <div className="absolute top-2 left-2 text-white font-bold bg-black/50 px-2 rounded">P1</div>
                </div>
                <div className="w-1/2 h-full border-l-4 border-black relative overflow-hidden flex items-center justify-center bg-slate-900">
                    {renderGameView(2)}
                     <div className="absolute top-2 right-2 text-white font-bold bg-black/50 px-2 rounded">P2</div>
                </div>
            </div>
        ) : (
             <div className="overflow-auto max-w-full max-h-[85vh] bg-slate-950 p-4 rounded-xl border-4 border-slate-700 shadow-2xl relative">
                 {renderGameView()}
             </div>
        )}
      </div>

    </div>
  );
};

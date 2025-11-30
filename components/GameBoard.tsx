import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LevelData, Player, Enemy, Inventory } from '../types';
import { CharacterIcon } from './CharacterIcon';
import { Heart, Droplets, BriefcaseMedical, CircleOff } from 'lucide-react';

interface GameBoardProps {
  levelData: LevelData;
  players: Player[];
  inventory: Inventory;
  onWin: () => void;
  onExit: () => void;
  onGameOver: () => void;
  onUseItem: (item: string) => void;
}

interface ActivePlayerState {
  id: number;
  x: number;
  y: number;
  escaped: boolean;
  dead: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ levelData, players, inventory, onWin, onExit, onGameOver, onUseItem }) => {
  // Initialize all players at start position
  const [activePlayers, setActivePlayers] = useState<ActivePlayerState[]>(
    players.map(p => ({ id: p.id, x: levelData.startPos.x, y: levelData.startPos.y, escaped: false, dead: false }))
  );
  
  const [enemies, setEnemies] = useState<Enemy[]>(levelData.enemies);
  const [lives, setLives] = useState(3);
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);
  const [message, setMessage] = useState<{text: string, color: string} | null>(null);
  const [stunUntil, setStunUntil] = useState<number>(0); // Timestamp when stun ends

  // Refs for tracking time intervals
  const stunTimerRef = useRef<NodeJS.Timeout>(undefined);

  const getTileAt = useCallback((x: number, y: number) => levelData.tiles.find(t => t.x === x && t.y === y), [levelData.tiles]);

  const showMessage = (text: string, color: string) => {
      setMessage({ text, color });
      setTimeout(() => setMessage(null), 2000);
  };

  const useRatPoison = () => {
      if (inventory.ratPoison <= 0) {
          showMessage("¡No tienes veneno!", "text-red-400");
          return;
      }
      
      onUseItem('ratPoison');
      
      // Remove rats within radius 4 of ANY active player
      setEnemies(prev => {
          const newEnemies = prev.filter(rat => {
             const isCloseToAnyPlayer = activePlayers.some(p => {
                 if (p.escaped || p.dead) return false;
                 const dist = Math.abs(p.x - rat.x) + Math.abs(p.y - rat.y);
                 return dist <= 4;
             });
             return !isCloseToAnyPlayer; // Keep if NOT close
          });
          
          if (newEnemies.length < prev.length) {
              showMessage("¡Ratas eliminadas!", "text-purple-400");
          } else {
              showMessage("Ninguna rata cerca...", "text-slate-400");
          }
          return newEnemies;
      });
  };

  const useCheese = () => {
      if (inventory.raratuiCheese <= 0) {
          showMessage("¡No tienes queso!", "text-red-400");
          return;
      }

      onUseItem('raratuiCheese');
      setStunUntil(Date.now() + 10000); // 10 seconds
      showMessage("¡Ratas aturdidas (10s)!", "text-yellow-400");
  };

  const resetRound = useCallback(() => {
    setActivePlayers(prev => prev.map(p => ({
        ...p,
        x: levelData.startPos.x,
        y: levelData.startPos.y,
        escaped: false,
        dead: false
    })));
    setEnemies(JSON.parse(JSON.stringify(levelData.enemies))); // Deep copy reset
    setStunUntil(0);
  }, [levelData]);

  const handleTeamDeath = useCallback((reason: string) => {
    if (lives > 1) {
        setLives(l => l - 1);
        showMessage(`${reason} -1 Vida`, 'text-red-500');
        resetRound();
    } else {
        setLives(0);
        onGameOver();
    }
  }, [lives, onGameOver, resetRound]);

  const moveEnemies = useCallback(() => {
    if (Date.now() < stunUntil) return; // Rats are stunned

    setEnemies(prevEnemies => {
        return prevEnemies.map(rat => {
            // Find closest non-escaped player
            const targets = activePlayers.filter(p => !p.escaped && !p.dead);
            if (targets.length === 0) return rat;

            // Simple distance check
            const closest = targets.reduce((prev, curr) => {
                const distPrev = Math.abs(prev.x - rat.x) + Math.abs(prev.y - rat.y);
                const distCurr = Math.abs(curr.x - rat.x) + Math.abs(curr.y - rat.y);
                return distCurr < distPrev ? curr : prev;
            });

            const dx = closest.x - rat.x;
            const dy = closest.y - rat.y;

            let nextX = rat.x;
            let nextY = rat.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                nextX += Math.sign(dx);
            } else {
                nextY += Math.sign(dy);
            }

            const tile = getTileAt(nextX, nextY);
            if (!tile || tile.type === 'wall' || tile.type === 'water' || tile.type === 'end') {
                if (nextX !== rat.x) {
                    nextX = rat.x;
                    nextY += Math.sign(dy);
                } else {
                    nextY = rat.y;
                    nextX += Math.sign(dx);
                }
                const fallbackTile = getTileAt(nextX, nextY);
                if (!fallbackTile || fallbackTile.type === 'wall' || fallbackTile.type === 'water') {
                    return rat;
                }
            }

            return { ...rat, x: nextX, y: nextY };
        });
    });
  }, [getTileAt, activePlayers, stunUntil]);

  const handlePlayerMove = useCallback(async (playerId: number, dx: number, dy: number) => {
    if (isProcessingTurn) return;

    // Find player state
    const pIndex = activePlayers.findIndex(p => p.id === playerId);
    if (pIndex === -1) return;
    const player = activePlayers[pIndex];

    if (player.escaped || player.dead) return;

    const targetX = player.x + dx;
    const targetY = player.y + dy;
    const targetTile = getTileAt(targetX, targetY);

    if (!targetTile || targetTile.type === 'wall') return;

    setIsProcessingTurn(true);

    // Update Player Position
    const newPlayers = [...activePlayers];
    newPlayers[pIndex] = { ...player, x: targetX, y: targetY };
    
    // Check Escape
    if (targetTile.type === 'end') {
        newPlayers[pIndex].escaped = true;
        showMessage(`¡Jugador ${playerId} escapó!`, "text-green-400");
    }

    setActivePlayers(newPlayers);
    
    // Water Logic
    if (targetTile.type === 'water' && !newPlayers[pIndex].escaped) {
        const roll = Math.random();
        if (roll > 0.507) {
            await new Promise(r => setTimeout(r, 200));
            handleTeamDeath("¡Se ahogó!");
            setIsProcessingTurn(false);
            return;
        } else {
            showMessage("¡Salvado del agua!", "text-blue-400");
        }
    }

    // Wait a tick for visual
    await new Promise(r => setTimeout(r, 100));

    // Enemy Move
    // Only move enemies if there are still players on the board
    if (newPlayers.some(p => !p.escaped)) {
        moveEnemies();
    }
    
    setIsProcessingTurn(false);

  }, [activePlayers, isProcessingTurn, getTileAt, handleTeamDeath, moveEnemies]);


  // Check Collisions (Rats catch Players)
  useEffect(() => {
      if (isProcessingTurn) return;

      const collision = activePlayers.find(p => !p.escaped && enemies.some(r => r.x === p.x && r.y === p.y));
      if (collision) {
          handleTeamDeath("¡Atrapado por una rata!");
      }
  }, [enemies, activePlayers, handleTeamDeath, isProcessingTurn]);

  // Check Win Condition (All players escaped)
  useEffect(() => {
      const allEscaped = activePlayers.length > 0 && activePlayers.every(p => p.escaped);
      if (allEscaped) {
          setTimeout(onWin, 500);
      }
  }, [activePlayers, onWin]);

  // Force re-render periodically if stunned to update UI countdown (optional) or just rely on state
  useEffect(() => {
      if (stunUntil > Date.now()) {
          const interval = setInterval(() => {
              // Trigger re-render to update stun visuals if needed, or just let logic handle it
              if (Date.now() > stunUntil) setStunUntil(0);
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [stunUntil]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessingTurn) return; // Prevent spamming/diagonal confusion

      // Player 1: Arrows
      if (players.find(p => p.id === 1)) {
          if (e.key === 'ArrowUp') handlePlayerMove(1, 0, -1);
          if (e.key === 'ArrowDown') handlePlayerMove(1, 0, 1);
          if (e.key === 'ArrowLeft') handlePlayerMove(1, -1, 0);
          if (e.key === 'ArrowRight') handlePlayerMove(1, 1, 0);
      }
      
      // Player 2: WASD
      if (players.find(p => p.id === 2)) {
          if (e.key.toLowerCase() === 'w') handlePlayerMove(2, 0, -1);
          if (e.key.toLowerCase() === 's') handlePlayerMove(2, 0, 1);
          if (e.key.toLowerCase() === 'a') handlePlayerMove(2, -1, 0);
          if (e.key.toLowerCase() === 'd') handlePlayerMove(2, 1, 0);
      }

      // Player 3: IJKL
      if (players.find(p => p.id === 3)) {
          if (e.key.toLowerCase() === 'i') handlePlayerMove(3, 0, -1);
          if (e.key.toLowerCase() === 'k') handlePlayerMove(3, 0, 1);
          if (e.key.toLowerCase() === 'j') handlePlayerMove(3, -1, 0);
          if (e.key.toLowerCase() === 'l') handlePlayerMove(3, 1, 0);
      }

      // Player 4: Numpad (Fixed: 8 Up, 2 Down, 4 Left, 6 Right)
      if (players.find(p => p.id === 4)) {
          if (e.key === '8') handlePlayerMove(4, 0, -1);
          if (e.key === '2') handlePlayerMove(4, 0, 1); // Changed from 5 to 2
          if (e.key === '4') handlePlayerMove(4, -1, 0);
          if (e.key === '6') handlePlayerMove(4, 1, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayerMove, players, isProcessingTurn]);

  // Render
  const tileSize = 50; 
  const gridStyle = {
    gridTemplateColumns: `repeat(${levelData.gridSize}, minmax(0, 1fr))`,
    width: `${levelData.gridSize * tileSize}px`
  };

  const isStunned = stunUntil > Date.now();

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-2 relative">
      
      {/* HUD */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-2">
         <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-600 shadow-xl min-w-[140px]">
            <div className="text-green-400 font-bold pixel-font text-xs md:text-sm mb-1">NIVEL {levelData.levelNumber}</div>
            <div className="text-white text-xs mb-1">Vidas de Equipo:</div>
             <div className="flex gap-1 mb-2">
                {[...Array(3)].map((_, i) => (
                    <Heart key={i} size={16} className={i < lives ? "fill-red-600 text-red-600" : "fill-slate-700 text-slate-700"} />
                ))}
             </div>
             
             <div className="border-t border-slate-600 pt-2 mt-1 space-y-2">
                 <button 
                    onClick={useRatPoison}
                    className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={inventory.ratPoison <= 0}
                 >
                     <BriefcaseMedical size={12} />
                     <span>Veneno ({inventory.ratPoison})</span>
                 </button>
                 <button 
                    onClick={useCheese}
                    className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] py-1 px-2 rounded w-full justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={inventory.raratuiCheese <= 0 || isStunned}
                 >
                     <CircleOff size={12} />
                     <span>Queso ({inventory.raratuiCheese})</span>
                 </button>
             </div>
         </div>
      </div>

      <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
           <button onClick={onExit} className="bg-red-600 text-white p-2 rounded text-xs font-bold shadow hover:bg-red-700">SALIR</button>
           <div className="bg-black/50 p-2 rounded text-[10px] text-white">
               {players.map(p => (
                   <div key={p.id} className="flex items-center gap-1 mb-1">
                       <div className={`w-2 h-2 rounded-full ${p.character.color.replace('bg-', 'bg-')}`}></div>
                       <span className="font-bold">{p.name}</span>
                       <span className="text-slate-400 text-[8px]">({p.controls})</span>
                       {activePlayers.find(ap => ap.id === p.id)?.escaped && <span className="text-green-400 ml-auto">✓</span>}
                   </div>
               ))}
           </div>
      </div>
      
      {message && (
          <div className={`absolute top-20 z-50 bg-black/80 px-4 py-2 rounded-lg font-bold animate-bounce ${message.color}`}>
              {message.text}
          </div>
      )}

      {/* Grid Container */}
      <div className="overflow-auto max-w-full max-h-[85vh] bg-slate-950 p-4 rounded-xl border-4 border-slate-700 shadow-2xl relative">
        <div className="grid gap-1" style={gridStyle}>
          {levelData.tiles.map((tile) => {
            let bgClass = 'bg-slate-800'; 
            let content = null;

            if (tile.type === 'wall') bgClass = 'bg-slate-600 border border-slate-500';
            if (tile.type === 'water') {
                bgClass = 'bg-blue-900/60 border border-blue-800';
                content = <Droplets size={12} className="text-blue-400 opacity-50" />;
            } 
            if (tile.type === 'start') bgClass = 'bg-green-900/40 border border-green-500';
            if (tile.type === 'end') {
                bgClass = 'bg-yellow-900/40 border border-yellow-500 ring-2 ring-yellow-500/20';
                content = <div className="text-[8px] text-yellow-300 font-bold text-center">SALIDA</div>;
            }

            // Find entities on this tile
            const playersHere = activePlayers.filter(p => p.x === tile.x && p.y === tile.y && !p.escaped);
            const ratHere = enemies.find(r => r.x === tile.x && r.y === tile.y);

            return (
              <div 
                key={`${tile.x}-${tile.y}`} 
                className={`aspect-square relative flex items-center justify-center rounded-sm ${bgClass}`}
              >
                {content}
                
                {ratHere && playersHere.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 text-xl">
                        {isStunned ? '💫' : '🐀'}
                    </div>
                )}

                {playersHere.map((p, idx) => {
                     const char = players.find(pl => pl.id === p.id)?.character;
                     if (!char) return null;
                     return (
                         <div 
                            key={p.id} 
                            className={`absolute z-20 transition-all duration-100 ${idx > 0 ? 'translate-x-1' : ''}`}
                            style={idx > 0 ? { marginLeft: '4px' } : {}}
                        >
                             <CharacterIcon character={char} size="sm" className="w-6 h-6 md:w-8 md:h-8" />
                             <div className="absolute -top-2 -right-1 bg-black text-white text-[8px] px-1 rounded-full">P{p.id}</div>
                         </div>
                     )
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
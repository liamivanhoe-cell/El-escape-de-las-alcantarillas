
import { LevelData, Tile, Enemy } from "../types";

// Hardcoded maps for levels 1-22
// Legend: #=Wall, .=Floor, S=Start, E=End, W=Water, R=Rat, B=Breakable Wall, C=Chest
// I=Code Clue, D=Locked Door, H=Human (City Enemy), ?=Secret Door, !=Secret Clue
// G=Giant Rat (Boss 1), F=Fernanfloo (Boss 2), A=Animatronic (Level 21)
const PREMADE_LEVELS: Record<number, string[]> = {
  // --- SEWER LEVELS (1-12) ---
  1: [
    "########",
    "S......#",
    "#.####.#",
    "#.R....E",
    "########"
  ],
  2: [
    "#########",
    "S.......#",
    "#######B#", 
    "#.....#.#",
    "#.###.#.E",
    "#...R...#",
    "#########"
  ],
  3: [
    "##########",
    "S..R.....#",
    "####.###.#",
    "#....#...#",
    "#.####.###",
    "#......R.E",
    "##########"
  ],
  4: [
    "###########",
    "S...W.....#",
    "###.#####.#",
    "#...#...#.#",
    "#.###.###.#",
    "#.....R...E",
    "###########"
  ],
  5: [
    "############",
    "S....#.....#",
    "####.#.###.#",
    "#..R...#...#",
    "#.####.#.###",
    "#....W.#...#",
    "####B#####.#",
    "#....R....xE", 
    "############"
  ],
  6: [
    "#############",
    "S.....R....C#", 
    "#######B#####", 
    "#.....#.#...#", 
    "#.###B#B#.#.#", 
    "#.#.......#.#",
    "#B#...E...#B#", 
    "#.#########.#",
    "#...........#",
    "#############"
  ],
  7: [
    "#############",
    "S...W...W...#", 
    "###.###.###.#",
    "#.W.#...#...#",
    "#.###.###.###",
    "#...W...W...#",
    "#####.#######",
    "#...B...R...E", 
    "#############"
  ],
  8: [
    "###############",
    "S......R.....I#", 
    "#######.#######",
    "#.....#D#.....#", 
    "#.###.#.#.###.#",
    "#R..#..E..#..R#", 
    "###############"
  ],
  9: [
    "##############",
    "S#...#...#...#",
    ".#.B.#.#.#.#.#",
    ".#...#.#...#.#",
    ".#####.#####.#",
    ".............#",
    "####.#######.#",
    "#....R...W...E",
    "##############"
  ],
  10: [
    "###############",
    "S.............#",
    "#######.#####.#",
    "#.....#.#...#.#",
    "#.###.#.#.#.#.#",
    "#.#...#...#...#",
    "#.#.#######.###",
    "#W..R.....#...E",
    "###############"
  ],
  11: [
    "###############",
    "S...W...W...W.#", 
    "#####.###.###.#",
    "#R....#R....#.#",
    "#####.#####.#.#",
    "#...B...B...#.#", 
    "#.###########.#",
    "#.............E",
    "###############"
  ],
  12: [
    "#################",
    "S...............#",
    "#...............#",
    "#...............#",
    "#.......G.......#",
    "#...............#",
    "#...............#",
    "#...............E",
    "#################"
  ],

  // --- CITY LEVELS (13-22) ---
  13: [
    "################",
    "S..............#",
    "#.############.#",
    "#......H.......#", 
    "#.############.#",
    "#..............E",
    "################"
  ],
  14: [
    "################",
    "S....H.....#...#",
    "##########.#.#.#",
    "#..........#.#.#",
    "#.########.#.#.#",
    "#.#......#.#.#.#",
    "#.#.####.#.#.#.#",
    "#H..#..H.#...#.E",
    "################"
  ],
  15: [
    "#################",
    "S.......#.......#",
    "#######.#.#####.#",
    "#...H...#.#...#.#",
    "#.#####.#.#.#.#.#",
    "#.#.....#...#...#",
    "#.#.#########.###",
    "#...H.......H...E",
    "#################"
  ],
  16: [
    "#################",
    "S...#.......#...#",
    "###.#.#####.#.#.#",
    "#...#.#...#.#.#.#",
    "#.###.###.#.#.#.#",
    "#...H...#.#...#.#",
    "#######.#.#####.#",
    "#.......#...H...E",
    "#################"
  ],
  17: [
    "###################",
    "S...H.......H.....#", 
    "#####.#####.#####.#",
    "#.....#...#.......#", 
    "#.###.#.H.#.#######",
    "#.#...#...#.......#",
    "#.#.#########.###.#", 
    "#...H.........H...E", 
    "###################"
  ],
  18: [
    "###################",
    "S.......H.......H.#",
    "#########.#######.#",
    "#.......#.#.......#",
    "#.#######.#######.#",
    "#...H...#.#...H...#",
    "#######.#.#######.#",
    "#.......#.........E",
    "###################"
  ],
  19: [
    "###################",
    "S..#..#..#..#..#..#",
    "##.#.##.##.##.##.##",
    "#..#..#..#..#..#..#",
    "#.##.##.##.##.##.##",
    "#..#..#..#..#..#..#",
    "##.#.##.##.##.##.##",
    "#H....H....H.....E#",
    "###################"
  ],
  20: [
    "#######################",
    "#S........#..........I#", 
    "#######.#####.#######.#", 
    "#.......#...#.........#", 
    "#.#######.###.#######.#",
    "#.#.................#.#",
    "#.#.###############.#.#",
    "#.#.#.............#D#.#", 
    "#.#.#############.###.#",
    "#.................#..E#", 
    "#######################"
  ],
  21: [
    "#####################",
    "#S........#.........#", // Pizzeria Layout
    "#.........#....A....#", // Party Room 1
    "#####.#########.#####",
    "#...................#", // Main Hall
    "#.###.#########.###.#", 
    "#.#A..#.......#..A#.#", // Party Room 2 & 3
    "#.#...#.......#...#.#",
    "#.#.###.......###.#.#",
    "#.........A.........E", // Stage Area
    "#####################"
  ],
  22: [
    "#######################",
    "S.....................#",
    "#.###################.#",
    "#.#.................#.#",
    "#.#........F........#.#",
    "#.#.................#.#",
    "#.###################.#",
    "#.....................E",
    "#######################"
  ]
};

export const generateLevel = async (levelNumber: number, isHardcore: boolean): Promise<LevelData> => {
  return new Promise((resolve) => {
    // Determine map source
    let rawMap = PREMADE_LEVELS[levelNumber];
    
    // Fallback if level > 22
    if (!rawMap) {
        const baseLevel = ((levelNumber - 1) % 22) + 1;
        rawMap = PREMADE_LEVELS[baseLevel]; 
    }

    // Hardcore: Map Redesign (Mirroring & Expansion)
    // We do not double boss levels to avoid breaking boss scripts
    if (isHardcore && levelNumber !== 12 && levelNumber !== 22 && levelNumber !== 17) {
        const leftMap = rawMap.map(row => row.replace('E', '.')); // Remove Exit from original
        const rightMap = rawMap.map(row => {
            // Remove Start from mirror source
            let r = row.replace('S', '.').split('').reverse().join('');
            
            // HARDCORE REDESIGN: 
            // Replace some empty floors with Hazards in the mirrored section
            // 10% Water, 5% Rats
            return r.split('').map(char => {
                if (char === '.') {
                    const roll = Math.random();
                    if (roll < 0.10) return 'W'; // Add Water hazard
                    if (roll < 0.15) return 'R'; // Add Rat hazard (if generic level)
                }
                return char;
            }).join('');
        });
        
        // Stitch them together
        rawMap = leftMap.map((row, i) => row + rightMap[i]);
    }

    const size = rawMap.length > 0 ? rawMap[0].length : 10;
    
    // 60% Chance to spawn a Chest if one isn't manually placed
    const spawnRandomChest = Math.random() < 0.60;
    
    // 37% Chance to spawn Secret Room Access
    const spawnSecretRoom = Math.random() < 0.37;
    const secretCode = Math.floor(1000 + Math.random() * 9000).toString();

    const tiles: Tile[] = [];
    const enemies: Enemy[] = [];
    let startPos = { x: 0, y: 0 };
    let endPos = { x: size - 1, y: size - 1 };
    const floorTiles: {x: number, y: number}[] = [];

    rawMap.forEach((row, y) => {
      row.split('').forEach((char, x) => {
        let type: Tile['type'] = 'floor';
        
        switch (char.toUpperCase()) {
          case '#': type = 'wall'; break;
          case 'S': type = 'start'; startPos = { x, y }; break;
          case 'E': type = 'end'; endPos = { x, y }; break;
          case 'W': type = 'water'; break;
          case 'B': type = 'breakable_wall'; break;
          case 'C': type = 'chest'; break;
          case 'I': type = 'code_clue'; break;
          case 'D': type = 'locked_door'; break;
          case 'R': 
            type = 'floor'; 
            enemies.push({ id: `rat-${x}-${y}`, x, y, type: 'rat' });
            break;
          case 'H':
            type = 'floor';
            enemies.push({ id: `human-${x}-${y}`, x, y, type: 'human' });
            break;
          case 'G':
            type = 'floor';
            enemies.push({ id: `giant_rat`, x, y, type: 'giant_rat' });
            break;
          case 'F':
            type = 'floor';
            enemies.push({ id: `fernanfloo`, x, y, type: 'fernanfloo' });
            break;
          case 'A':
            type = 'floor';
            enemies.push({ id: `animatronic-${x}-${y}`, x, y, type: 'animatronic' });
            break;
          default: type = 'floor';
        }

        if (type === 'floor') {
            floorTiles.push({x, y});
        }

        tiles.push({ x, y, type });
      });
    });

    // Hardcore: Enemy Duplication (for Boss levels or any level really, double the array if we didn't expand map)
    // If we expanded map, enemies are already naturally doubled/increased by processing the string.
    // However, Boss levels (12, 17, 22) weren't expanded. So we force duplicate enemies there to ensure difficulty.
    if (isHardcore && (levelNumber === 12 || levelNumber === 22 || levelNumber === 17)) {
        // Duplicate non-boss enemies
        const extraEnemies: Enemy[] = [];
        enemies.forEach(e => {
            if (e.type !== 'giant_rat' && e.type !== 'fernanfloo' && e.type !== 'pepe') {
                 // Try to place near original
                 extraEnemies.push({ ...e, id: `${e.id}-dup`, x: Math.max(0, e.x - 1) });
            }
        });
        enemies.push(...extraEnemies);
    }

    // Random Chest Injection (Not in level 22 or 12 or 21)
    if (spawnRandomChest && levelNumber !== 22 && levelNumber !== 12 && levelNumber !== 21) {
        const hasChest = tiles.some(t => t.type === 'chest');
        if (!hasChest && floorTiles.length > 5) {
            const randIndex = Math.floor(Math.random() * floorTiles.length);
            const spot = floorTiles[randIndex];
            const dist = Math.abs(spot.x - startPos.x) + Math.abs(spot.y - startPos.y);
            
            if (dist > 3) {
                const tileRef = tiles.find(t => t.x === spot.x && t.y === spot.y);
                if (tileRef && !['code_clue', 'locked_door', 'start', 'end'].includes(tileRef.type)) {
                    tileRef.type = 'chest';
                }
            }
        }
    }
    
    // Secret Room Injection
    if (spawnSecretRoom && levelNumber !== 22 && levelNumber !== 12 && levelNumber !== 20 && levelNumber !== 21) {
        const availableFloors = tiles.filter(t => t.type === 'floor');
        if (availableFloors.length > 10) {
             // 1. Place Door (?)
             const doorIdx = Math.floor(Math.random() * availableFloors.length);
             const doorTile = availableFloors[doorIdx];
             const tileInArray = tiles.find(t => t.x === doorTile.x && t.y === doorTile.y);
             if (tileInArray) tileInArray.type = 'secret_door';
             
             // 2. Place Clue (!)
             // Re-filter to avoid overwriting door
             const clueCandidates = tiles.filter(t => t.type === 'floor');
             if (clueCandidates.length > 0) {
                 const clueIdx = Math.floor(Math.random() * clueCandidates.length);
                 const clueTile = clueCandidates[clueIdx];
                 clueTile.type = 'secret_clue';
             }
        }
    }

    resolve({
      levelNumber,
      gridSize: size, 
      difficulty: isHardcore ? "HARDCORE" : (levelNumber <= 4 ? "Fácil" : levelNumber <= 12 ? "Medio" : "Experto"),
      tiles,
      enemies,
      startPos,
      endPos,
      secretCode
    });
  });
};

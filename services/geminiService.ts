import { GoogleGenAI, Type } from "@google/genai";
import { LevelData, Tile, Enemy } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLevel = async (levelNumber: number): Promise<LevelData> => {
  const size = Math.min(7 + Math.floor(levelNumber / 2), 14); // Grid grows slightly larger for 4 players
  const difficulty = levelNumber <= 4 ? "Easy" : levelNumber <= 8 ? "Medium" : "Hard";
  
  const systemInstruction = `
    You are a game level designer for a multiplayer puzzle game set in a sewer. 
    The grid represents a maze for up to 4 players.
    
    Legend:
    '#' is a Wall (impassable).
    '.' is Floor (walkable).
    'S' is Start (Top Left area).
    'E' is End (Bottom Right area).
    'W' is Water (Hazard).
    'R' is a Rat Enemy.
    
    Rules:
    1. There MUST be a clear, wide path (at least 2 tiles wide in some places) from S to E so players don't block each other.
    2. Start 'S' area must be open (3x3 space of '.') so 4 players can spawn safely.
    3. Do NOT block the immediate exit of 'S' with Walls or Water.
    4. Rats 'R' must be placed at least 4 tiles away from 'S' to prevent instant death.
    5. Create "rooms" or open areas, not just narrow corridors.
    
    Return ONLY a JSON object.
  `;

  const prompt = `Generate a ${size}x${size} grid for Level ${levelNumber} (${difficulty} difficulty). Ensure the maze is solvable for 4 players.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: `A string representing a row of the grid. Use characters: #, ., S, E, W, R. Length must be ${size}.`
              }
            }
          },
          required: ["grid"]
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    const rawGrid: string[] = json.grid || [];

    // Parse raw strings into Tile objects and Enemies
    const tiles: Tile[] = [];
    const enemies: Enemy[] = [];
    let startPos = { x: 0, y: 0 };
    let endPos = { x: size - 1, y: size - 1 };

    rawGrid.forEach((rowStr, y) => {
      rowStr.split('').forEach((char, x) => {
        let type = mapCharToType(char);
        
        // If char is Rat, it's a floor tile with an enemy on it
        if (char.toUpperCase() === 'R') {
            type = 'floor';
            // Safety check: Don't spawn rat too close to 0,0
            if (x + y > 4) {
                enemies.push({ id: `rat-${x}-${y}`, x, y, type: 'rat' });
            }
        }

        if (type === 'start') startPos = { x, y };
        if (type === 'end') endPos = { x, y };
        tiles.push({ x, y, type });
      });
    });

    // Fallback/Safety: Ensure Start and End exist
    const hasStart = tiles.some(t => t.type === 'start');
    if (!hasStart) {
        const t = tiles.find(t => t.x === 0 && t.y === 0);
        if (t) { t.type = 'start'; startPos = { x: 0, y: 0 }; }
    }

    const hasEnd = tiles.some(t => t.type === 'end');
    if (!hasEnd) {
        const t = tiles.find(t => t.x === size-1 && t.y === size-1);
        if (t) { t.type = 'end'; endPos = { x: size-1, y: size-1 }; }
    }

    return {
      levelNumber,
      gridSize: size,
      difficulty,
      tiles,
      enemies,
      startPos,
      endPos
    };

  } catch (error) {
    console.error("Gemini Level Gen Error:", error);
    return createFallbackLevel(levelNumber);
  }
};

const mapCharToType = (char: string): Tile['type'] => {
  switch (char.toUpperCase()) {
    case '#': return 'wall';
    case 'S': return 'start';
    case 'E': return 'end';
    case 'W': return 'water';
    case 'R': return 'floor'; // Rats stand on floor
    default: return 'floor';
  }
};

const createFallbackLevel = (level: number): LevelData => {
  const size = 6 + Math.floor(level/3);
  const tiles: Tile[] = [];
  const enemies: Enemy[] = [];
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let type: Tile['type'] = 'floor';
      if (x === 0 && y === 0) type = 'start';
      else if (x === size - 1 && y === size - 1) type = 'end';
      else if (Math.random() > 0.8) type = 'wall';
      else if (Math.random() > 0.9) type = 'water';
      
      // Random rat placement
      if (type === 'floor' && Math.random() > 0.92 && (x+y > 4)) {
          enemies.push({ id: `rat-${x}-${y}`, x, y, type: 'rat' });
      }

      tiles.push({ x, y, type });
    }
  }
  return {
    levelNumber: level,
    gridSize: size,
    difficulty: 'Offline Mode',
    tiles,
    enemies,
    startPos: { x: 0, y: 0 },
    endPos: { x: size - 1, y: size - 1 }
  };
};
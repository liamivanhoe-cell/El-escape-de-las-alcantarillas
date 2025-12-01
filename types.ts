
export enum Screen {
  INTRO = 'INTRO',
  MENU = 'MENU',
  CHARACTER_SELECT = 'CHARACTER_SELECT',
  LEVEL_SELECT = 'LEVEL_SELECT',
  LOBBY = 'LOBBY',
  GAME = 'GAME',
  VICTORY = 'VICTORY',
  GAME_OVER = 'GAME_OVER',
  ENDING = 'ENDING',
  SHOP = 'SHOP',
  COLLECTION = 'COLLECTION',
  CINEMATIC = 'CINEMATIC'
}

export enum GameMode {
  COOP = 'COOP',
  COMPETITIVE = 'COMPETITIVE'
}

export enum Language {
  ES_ES = 'es-ES',
  ES_LATAM = 'es-LATAM',
  EN = 'en',
  PT = 'pt'
}

export enum AmmoType {
  NORMAL = 'NORMAL',
  FIRE = 'FIRE',
  CHEESE = 'CHEESE'
}

export enum CharacterType {
  COIN_10 = '10 céntimos',
  COIN_20 = '20 céntimos',
  COIN_50 = '50 céntimos',
  COIN_1 = '1 Sol',
  COIN_2 = '2 Soles',
  COIN_5 = '5 Soles',
  BILL_10 = '10 Soles',
  BILL_20 = '20 Soles',
  BILL_50 = '50 Soles',
  BILL_100 = '100 Soles',
  BILL_200 = '200 Soles'
}

export interface Character {
  id: string;
  name: CharacterType;
  type: 'coin' | 'bill';
  value: number; // For sorting or logic
  color: string;
  borderColor?: string; // For bimetallic coins
  textColor: string;
  isLocked: boolean;
  unlockCondition?: string;
}

export interface Player {
  id: number; // 1, 2, 3, 4
  name: string;
  character: Character;
  controls: string; // "Arrows", "WASD", "IJKL", "Numpad"
}

export interface Tile {
  x: number;
  y: number;
  type: 'wall' | 'floor' | 'start' | 'end' | 'water' | 'mud' | 'chest' | 'breakable_wall' | 'code_clue' | 'locked_door' | 'secret_door' | 'secret_clue' | 'boss_block';
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  type: 'rat' | 'human' | 'pepe' | 'giant_rat' | 'fernanfloo' | 'animatronic';
  isHugged?: boolean; // For Level 17
}

export interface Box {
  id: string;
  x: number;
  y: number;
  requiredAmmo: AmmoType;
}

export interface Lightning {
  id: string;
  x: number;
  y: number;
  targetId: number; // Player ID it is seeking
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  ownerId: number;
  ammoType: AmmoType;
}

export interface LevelData {
  levelNumber: number;
  gridSize: number;
  difficulty: string;
  tiles: Tile[];
  enemies: Enemy[];
  startPos: { x: number, y: number };
  endPos: { x: number, y: number };
  secretCode?: string; // Code for secret room
}

export interface Mission {
  id: string;
  description: string;
  completed: boolean;
  rewardId?: string; // ID of character to unlock
}

export interface Inventory {
    ratPoison: number;
    raratuiCheese: number;
    knife: number;
    flute: number;
    waterBucket: number;
    hammer: boolean;
    magicStar: number;
    starStock: number; // Max 4
    starRestockTime: number; // Timestamp for restocking
    ammoFire: boolean;
    ammoCheese: boolean;
}

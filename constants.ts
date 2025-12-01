
import { Character, CharacterType, Mission, Language } from './types';

export const CHARACTERS: Character[] = [
  {
    id: 'c10',
    name: CharacterType.COIN_10,
    type: 'coin',
    value: 0.10,
    color: 'bg-yellow-400',
    textColor: 'text-yellow-900',
    isLocked: false
  },
  {
    id: 'c20',
    name: CharacterType.COIN_20,
    type: 'coin',
    value: 0.20,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-900',
    isLocked: false
  },
  {
    id: 'c50',
    name: CharacterType.COIN_50,
    type: 'coin',
    value: 0.50,
    color: 'bg-yellow-600',
    textColor: 'text-white',
    isLocked: false
  },
  {
    id: 's1',
    name: CharacterType.COIN_1,
    type: 'coin',
    value: 1,
    color: 'bg-gray-200',
    borderColor: 'border-yellow-500',
    textColor: 'text-gray-800',
    isLocked: false
  },
  {
    id: 's2',
    name: CharacterType.COIN_2,
    type: 'coin',
    value: 2,
    color: 'bg-gray-200',
    borderColor: 'border-purple-600', // Newer 2 soles often have unique ring patterns, keeping distinct
    textColor: 'text-gray-800',
    isLocked: false
  },
  {
    id: 's5',
    name: CharacterType.COIN_5,
    type: 'coin',
    value: 5,
    color: 'bg-gray-200',
    borderColor: 'border-yellow-600',
    textColor: 'text-gray-800',
    isLocked: false
  },
  {
    id: 'b10',
    name: CharacterType.BILL_10,
    type: 'bill',
    value: 10,
    color: 'bg-green-600',
    textColor: 'text-white',
    isLocked: true,
    unlockCondition: "Completa la misión: 'Primeros Pasos'"
  },
  {
    id: 'b20',
    name: CharacterType.BILL_20,
    type: 'bill',
    value: 20,
    color: 'bg-orange-700',
    textColor: 'text-white',
    isLocked: true,
    unlockCondition: "Completa la misión: 'Maestro del Desagüe'"
  },
  {
    id: 'b50',
    name: CharacterType.BILL_50,
    type: 'bill',
    value: 50,
    color: 'bg-rose-500', // Santa Rosa pinkish
    textColor: 'text-white',
    isLocked: true,
    unlockCondition: "Alcanza el Nivel 6"
  },
  {
    id: 'b100',
    name: CharacterType.BILL_100,
    type: 'bill',
    value: 100,
    color: 'bg-blue-600', // Jorge Basadre blue
    textColor: 'text-white',
    isLocked: true,
    unlockCondition: "Alcanza el Nivel 9"
  },
  {
    id: 'b200',
    name: CharacterType.BILL_200,
    type: 'bill',
    value: 200,
    color: 'bg-slate-400', // Santa Rosa gray/lavender
    textColor: 'text-gray-900',
    isLocked: true,
    unlockCondition: "Alcanza el Nivel 12"
  }
];

export const INITIAL_MISSIONS: Mission[] = [
  { id: 'm1', description: 'Juega el Nivel 1', completed: false },
  { id: 'm2', description: 'Resuelve un puzle en menos de 1 minuto', completed: false, rewardId: 'b10' },
  { id: 'm3', description: 'Completa 5 niveles', completed: false, rewardId: 'b20' }
];

export const TRANSLATIONS = {
  [Language.ES_ES]: {
    TITLE: "ESCAPE DE LA ALCANTARILLA",
    PLAY_COOP: "JUGAR COOPERATIVO",
    PLAY_COMP: "MODO COMPETITIVO",
    SHOP: "TIENDA",
    MISSIONS: "MISIONES",
    LEVEL: "NIVEL",
    GOLD: "Oro",
    BACK: "Volver",
    CONFIRM: "CONFIRMAR EQUIPO",
    LOBBY_TITLE: "SALA DE JUGADORES",
    ADD_PLAYER: "Añadir Jugador",
    COLLECTION: "COLECCIÓN",
    GAME_OVER: "¡GAME OVER!",
    VICTORY: "¡VICTORIA!",
    RETRY: "REINTENTAR",
    NEXT_LEVEL: "SIGUIENTE NIVEL",
    MAP: "MAPA",
    DUCK_HINT: "¡Usa CTRL para agacharte!"
  },
  [Language.ES_LATAM]: {
    TITLE: "EL GRAN ESCAPE",
    PLAY_COOP: "JUGAR COOP",
    PLAY_COMP: "MODO VERSUS",
    SHOP: "TIENDITA",
    MISSIONS: "TAREAS",
    LEVEL: "NIVEL",
    GOLD: "Plata",
    BACK: "Regresar",
    CONFIRM: "LISTO",
    LOBBY_TITLE: "LOBBY",
    ADD_PLAYER: "Sumar Jugador",
    COLLECTION: "ALBUM",
    GAME_OVER: "¡PERDISTE!",
    VICTORY: "¡GANASTE!",
    RETRY: "OTRA VEZ",
    NEXT_LEVEL: "SIGUIENTE",
    MAP: "MAPA",
    DUCK_HINT: "¡Usa CTRL para agacharte!"
  },
  [Language.EN]: {
    TITLE: "SEWER ESCAPE",
    PLAY_COOP: "PLAY CO-OP",
    PLAY_COMP: "COMPETITIVE MODE",
    SHOP: "SHOP",
    MISSIONS: "MISSIONS",
    LEVEL: "LEVEL",
    GOLD: "Gold",
    BACK: "Back",
    CONFIRM: "CONFIRM TEAM",
    LOBBY_TITLE: "PLAYER LOBBY",
    ADD_PLAYER: "Add Player",
    COLLECTION: "COLLECTION",
    GAME_OVER: "GAME OVER!",
    VICTORY: "VICTORY!",
    RETRY: "RETRY",
    NEXT_LEVEL: "NEXT LEVEL",
    MAP: "MAP",
    DUCK_HINT: "Use CTRL to Duck!"
  },
  [Language.PT]: {
    TITLE: "FUGA DO ESGOTO",
    PLAY_COOP: "JOGAR COOPERATIVO",
    PLAY_COMP: "MODO COMPETITIVO",
    SHOP: "LOJA",
    MISSIONS: "MISSÕES",
    LEVEL: "NÍVEL",
    GOLD: "Ouro",
    BACK: "Voltar",
    CONFIRM: "CONFIRMAR EQUIPE",
    LOBBY_TITLE: "SALA DE JOGADORES",
    ADD_PLAYER: "Adicionar Jogador",
    COLLECTION: "COLEÇÃO",
    GAME_OVER: "FIM DE JOGO!",
    VICTORY: "VITÓRIA!",
    RETRY: "TENTAR DE NOVO",
    NEXT_LEVEL: "PRÓXIMO NÍVEL",
    MAP: "MAPA",
    DUCK_HINT: "Use CTRL para agachar!"
  }
};

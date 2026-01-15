
export type TerrainType = 'fog' | 'street' | 'park' | 'building';
export type StaticObject = 'none' | 'lamp' | 'bench' | 'hydrant';

export interface GridCell {
  row: number;
  col: number;
  terrain: TerrainType;
  staticObject: StaticObject;
}

export interface Item {
  id: string; 
  label: string; 
  emoji: string; 
}

// Full suite of relations matching Einstein Island mechanics
export type ClueRelation = 
  // Direct Assignment ( [Item] = [Terrain/Number] )
  | 'ON' 
  // Negative Assignment ( [Item] != [Terrain] )
  | 'NOT_ON'
  // Coordinates ( [Item] = 4, [Item] = C )
  | 'ROW' | 'COL'
  // Adjacency
  | 'ADJ_HORIZONTAL'   // Left/Right
  | 'ADJ_VERTICAL'     // Top/Bottom
  | 'ADJ_DIAGONAL'     // Corners
  | 'ADJ_ORTHOGONAL'   // Top/Bottom/Left/Right (The "+" clue)
  | 'ADJ_ANY'          // All 8 neighbors
  | 'NOT_ADJACENT'     // Not touching (Red Grid)
  | 'NOT_ADJ_ORTHOGONAL' // Not touching orthogonally (but could be diagonal)
  | 'NOT_ADJ_DIAGONAL'   // Not touching diagonally (but could be orthogonal)
  // Alignment / Direction (Strict - Same Row/Col implied)
  | 'SAME_ROW'         // ... (Same row, gap allowed)
  | 'SAME_COL'         // |...| (Same col, gap allowed)
  | 'LEFT_OF'          // [Item1] ... [Item2] (Same Row)
  | 'ABOVE'            // [Item1] : [Item2] (Same Col)
  // Direction (General - Any Row/Col)
  | 'LEFT_OF_ANY_ROW'  // [Item1] < [Item2] (Col1 < Col2)
  | 'ABOVE_ANY_COL';   // [Item1] ^ [Item2] (Row1 < Row2)

export interface Clue {
  id: string;
  type: 'TERRAIN' | 'COORDINATE' | 'ADJACENCY' | 'ALIGNMENT' | 'DIRECTION';
  text: string; 
  // Visual Data
  item1: string; // Item ID
  icon1: string; // Emoji
  relation: ClueRelation;
  item2: string; // Target Item ID, Terrain Name, Static Object Name, or Number/Letter
  icon2: string; // Emoji or Text (e.g. "3", "C", "🌲")
}

export interface PuzzleConfig {
  story: string;
  gridSize: number;
  grid: GridCell[][];
  items: Item[];
  solution: Record<string, {row: number, col: number}>;
  clues: Clue[];
}

export type Difficulty = 'TRAINEE' | 'EASY' | 'MEDIUM' | 'HARD' | 'MASTER';

export interface HistoryState {
    placedItems: Record<string, {row: number, col: number}>;
    candidates: Record<string, string[]>;
}

export interface GameState {
  status: 'MENU' | 'LOADING' | 'PLAYING' | 'WON';
  difficulty: Difficulty;
  puzzle: PuzzleConfig | null;
  placedItems: Record<string, {row: number, col: number}>; // ItemID -> Coords (Final Placement)
  candidates: Record<string, string[]>; // "row-col" -> [ItemID, ItemID...] (Pencil marks)
  history: HistoryState[];
  mistakes: number;
  startTime: number;
  endTime: number;
}


import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PuzzleConfig, Difficulty, GridCell, Clue, Item, ClueRelation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const WORLD_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    story: { type: Type.STRING, description: "A noir mystery title, MAXIMUM 5 WORDS." },
    gridRaw: { 
      type: Type.ARRAY, 
      items: { type: Type.ARRAY, items: { type: Type.STRING } },
      description: "Grid codes: X=Fog/Void, S=Street, P=Park, B=Building, L=Lamp, H=Bench, Y=Hydrant"
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          emoji: { type: Type.STRING }
        }
      }
    }
  },
  required: ["story", "gridRaw", "items"]
};

// --- ALGORITHMIC LOGIC ---

const placeItemsAlgorithmic = (
  grid: GridCell[][], 
  items: Item[]
): Record<string, {row: number, col: number}> | null => {
  const size = grid.length;
  const placement: Record<string, {row: number, col: number}> = {};
  const occupiedRows = new Set<number>();
  const occupiedCols = new Set<number>();
  
  const allCells: {r: number, c: number}[] = [];
  for(let r=0; r<size; r++) {
    for(let c=0; c<size; c++) {
      allCells.push({r, c});
    }
  }

  // Fisher-Yates shuffle
  for (let i = allCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
  }

  const solve = (itemIndex: number): boolean => {
    if (itemIndex >= items.length) return true; 

    const item = items[itemIndex];
    
    for (const {r, c} of allCells) {
      if (occupiedRows.has(r)) continue;
      if (occupiedCols.has(c)) continue;
      
      const cell = grid[r][c];
      if (cell.terrain === 'fog') continue;
      if (cell.staticObject !== 'none') continue;

      placement[item.id] = { row: r, col: c };
      occupiedRows.add(r);
      occupiedCols.add(c);

      if (solve(itemIndex + 1)) return true;

      delete placement[item.id];
      occupiedRows.delete(r);
      occupiedCols.delete(c);
    }

    return false;
  };

  if (solve(0)) return placement;
  return null;
};

const generateCluesAlgorithmic = (
  grid: GridCell[][], 
  solution: Record<string, {row: number, col: number}>, 
  items: Item[]
): Clue[] => {
  const colLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const size = grid.length;
  let clueCount = 0;
  const nextId = () => `clue-${clueCount++}`;
  const getIcon = (id: string) => items.find(i => i.id === id)?.emoji || '?';

  const possibleClues: Clue[] = [];
  const itemIds = Object.keys(solution);

  itemIds.forEach(itemId => {
    const { row, col } = solution[itemId];
    const itemIcon = getIcon(itemId);
    const cell = grid[row][col];

    let terrainIcon = '🌫️';
    let terrainName = 'Fog';
    if (cell.terrain === 'street') { terrainIcon = '🛣️'; terrainName = 'Street'; }
    if (cell.terrain === 'park') { terrainIcon = '🌳'; terrainName = 'Park'; }
    if (cell.terrain === 'building') { terrainIcon = '🏢'; terrainName = 'Building'; }

    if (cell.terrain !== 'fog') {
        possibleClues.push({
            id: '', type: 'TERRAIN', text: '',
            item1: itemId, icon1: itemIcon,
            relation: 'ON',
            item2: terrainName, icon2: terrainIcon
        });
    }

    const terrains = [
        { name: 'Street', icon: '🛣️', type: 'street' },
        { name: 'Park', icon: '🌳', type: 'park' },
        { name: 'Building', icon: '🏢', type: 'building' }
    ];
    const notOn = terrains.find(t => t.type !== cell.terrain);
    if (notOn) {
        possibleClues.push({
            id: '', type: 'TERRAIN', text: '',
            item1: itemId, icon1: itemIcon,
            relation: 'NOT_ON',
            item2: notOn.name, icon2: notOn.icon
        });
    }

    possibleClues.push({
        id: '', type: 'COORDINATE', text: '',
        item1: itemId, icon1: itemIcon,
        relation: 'ROW',
        item2: (row + 1).toString(), icon2: (row + 1).toString()
    });
    possibleClues.push({
        id: '', type: 'COORDINATE', text: '',
        item1: itemId, icon1: itemIcon,
        relation: 'COL',
        item2: colLabels[col], icon2: colLabels[col]
    });

    const neighbors = [
        { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
    ];

    neighbors.forEach(({dr, dc}) => {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            const neighborCell = grid[nr][nc];
            let objName = '';
            let objIcon = '';

            if (neighborCell.staticObject === 'lamp') { objName='Lamp'; objIcon='💡'; }
            else if (neighborCell.staticObject === 'bench') { objName='Bench'; objIcon='🪑'; }
            else if (neighborCell.staticObject === 'hydrant') { objName='Hydrant'; objIcon='🚒'; }
            else if (neighborCell.terrain === 'fog') { objName='Fog'; objIcon='🌫️'; }

            if (objName) {
                 if (Math.abs(dr) + Math.abs(dc) === 1) {
                     possibleClues.push({
                        id: '', type: 'ADJACENCY', text: '',
                        item1: itemId, icon1: itemIcon,
                        relation: 'ADJ_ORTHOGONAL',
                        item2: objName, icon2: objIcon
                     });
                 }
                 possibleClues.push({
                    id: '', type: 'ADJACENCY', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: 'ADJ_ANY',
                    item2: objName, icon2: objIcon
                 });
            }
        }
    });

    itemIds.forEach(otherId => {
        if (itemId === otherId) return;
        const isCanonicalPair = itemId < otherId;
        const otherPos = solution[otherId];
        const p1 = { r: row, c: col };
        const p2 = { r: otherPos.row, c: otherPos.col };

        const dRow = p2.r - p1.r;
        const dCol = p2.c - p1.c;
        const absRow = Math.abs(dRow);
        const absCol = Math.abs(dCol);
        
        const isOrthogonal = (absRow + absCol === 1);
        const isDiagonal = (absRow === 1 && absCol === 1);
        const isAdjacent = (absRow <= 1 && absCol <= 1 && !(absRow === 0 && absCol === 0));

        if (isAdjacent) {
             let rel: ClueRelation = 'ADJ_ANY';
             if (absRow === 0) rel = 'ADJ_HORIZONTAL';
             else if (absCol === 0) rel = 'ADJ_VERTICAL';
             else rel = 'ADJ_DIAGONAL';

             if (isCanonicalPair) {
                possibleClues.push({
                    id: '', type: 'ADJACENCY', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: rel,
                    item2: otherId, icon2: getIcon(otherId)
                });
             }

             if (isOrthogonal) {
                 if (isCanonicalPair) {
                    possibleClues.push({
                        id: '', type: 'ADJACENCY', text: '',
                        item1: itemId, icon1: itemIcon,
                        relation: 'ADJ_ORTHOGONAL',
                        item2: otherId, icon2: getIcon(otherId)
                    });
                 }
             }
        } else {
             if (Math.random() < 0.25) { 
                 if (isCanonicalPair) {
                    possibleClues.push({
                        id: '', type: 'ADJACENCY', text: '',
                        item1: itemId, icon1: itemIcon,
                        relation: 'NOT_ADJACENT',
                        item2: otherId, icon2: getIcon(otherId)
                    });
                 }
             }
        }

        if (isCanonicalPair) {
            if (!isOrthogonal) {
                 possibleClues.push({
                    id: '', type: 'ADJACENCY', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: 'NOT_ADJ_ORTHOGONAL',
                    item2: otherId, icon2: getIcon(otherId)
                 });
            }
            if (!isDiagonal) {
                 possibleClues.push({
                    id: '', type: 'ADJACENCY', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: 'NOT_ADJ_DIAGONAL',
                    item2: otherId, icon2: getIcon(otherId)
                 });
            }
        }

        if (p1.r === p2.r && absCol > 1) { 
             if (isCanonicalPair) {
                possibleClues.push({
                    id: '', type: 'ALIGNMENT', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: 'SAME_ROW',
                    item2: otherId, icon2: getIcon(otherId)
                });
             }
             if (p1.c < p2.c) {
                 possibleClues.push({
                    id: '', type: 'DIRECTION', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: 'LEFT_OF',
                    item2: otherId, icon2: getIcon(otherId)
                 });
             }
        }

        if (p1.c === p2.c && absRow > 1) {
             if (isCanonicalPair) {
                possibleClues.push({
                    id: '', type: 'ALIGNMENT', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: 'SAME_COL',
                    item2: otherId, icon2: getIcon(otherId)
                });
             }
             if (p1.r < p2.r) {
                 possibleClues.push({
                    id: '', type: 'DIRECTION', text: '',
                    item1: itemId, icon1: itemIcon,
                    relation: 'ABOVE',
                    item2: otherId, icon2: getIcon(otherId)
                 });
             }
        }

        if (p1.c < p2.c) {
             possibleClues.push({
                id: '', type: 'DIRECTION', text: '',
                item1: itemId, icon1: itemIcon,
                relation: 'LEFT_OF_ANY_ROW',
                item2: otherId, icon2: getIcon(otherId)
             });
        }

        if (p1.r < p2.r) {
             possibleClues.push({
                id: '', type: 'DIRECTION', text: '',
                item1: itemId, icon1: itemIcon,
                relation: 'ABOVE_ANY_COL',
                item2: otherId, icon2: getIcon(otherId)
             });
        }
    });
  });
  
  const cluesByRelation: Record<string, Clue[]> = {};
  possibleClues.forEach(clue => {
      if (!cluesByRelation[clue.relation]) {
          cluesByRelation[clue.relation] = [];
      }
      cluesByRelation[clue.relation].push(clue);
  });

  const selectedClues: Clue[] = [];
  const selectedKeys = new Set<string>();
  const targetCount = size + Math.floor(size/2) + 2; 

  while (selectedClues.length < targetCount) {
      const availableRelations = Object.keys(cluesByRelation).filter(
          rel => cluesByRelation[rel].length > 0
      );
      if (availableRelations.length === 0) break;
      const chosenRelation = availableRelations[Math.floor(Math.random() * availableRelations.length)];
      const cluesInRel = cluesByRelation[chosenRelation];
      const randomClueIndex = Math.floor(Math.random() * cluesInRel.length);
      const clue = cluesInRel[randomClueIndex];

      const uniqueKey = clue.item1 + clue.relation + clue.item2;
      if (!selectedKeys.has(uniqueKey)) {
          clue.id = nextId();
          selectedClues.push(clue);
          selectedKeys.add(uniqueKey);
      }
      cluesInRel.splice(randomClueIndex, 1);
  }
  return selectedClues;
};

const cleanGrid = (grid: GridCell[][]) => {
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
            const cell = grid[r][c];
            if (!['fog','street','park','building'].includes(cell.terrain)) cell.terrain = 'street';
            if (!['none','lamp','bench','hydrant'].includes(cell.staticObject)) cell.staticObject = 'none';
        }
    }
};

export const generatePuzzle = async (difficulty: Difficulty): Promise<PuzzleConfig> => {
  let gridSize = 6;
  let shapeInstruction = "Layout: RECTANGULAR. NO FOG."; 

  if (difficulty === 'TRAINEE') {
    gridSize = 5;
    shapeInstruction = "Layout: 5x5 City Grid. NO FOG ('X'). Fill with S (Street), P (Park), B (Building).";
  } else if (difficulty === 'EASY') {
    gridSize = 6;
    shapeInstruction = "Layout: 6x6 City Grid. NO FOG ('X'). Fill with S (Street), P (Park), B (Building).";
  } else if (difficulty === 'MEDIUM') {
    gridSize = 7;
    shapeInstruction = "Layout: Rectangular city block. Max 4 Fog cells ('X') at edges.";
  } else if (difficulty === 'HARD') {
    gridSize = 8;
    shapeInstruction = "Layout: Complex city district. Use Fog ('X') to shape it, but ensure connected streets.";
  } else if (difficulty === 'MASTER') {
    gridSize = 9;
    shapeInstruction = "Layout: Large city district. Use Fog ('X') and obstacles strategically.";
  }

  const prompt = `
    Generate the visual assets for a Noir Detective Logic Puzzle (${gridSize}x${gridSize}).
    
    1. **Grid**:
       - Characters: X (Fog/Void), S (Street/Pavement), P (Park/Grass), B (Building/Brick).
       - Static Objects: L (Street Lamp), H (Bench/Seat), Y (Fire Hydrant).
       - ${shapeInstruction}
       - Most cells should be 'S' or 'B'.
    
    2. **Items**:
       - Generate EXACTLY ${gridSize} distinct noir detective items (e.g. Magnifying Glass, Revolver, Fedora, Lipstick, Badge, Cigarette).
       - Provide ID, Label, and Emoji for each.
    
    3. **Story**: A noir mystery title, MAXIMUM 5 WORDS (e.g. "The Red Lipstick Case").

    Return strictly valid JSON matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: WORLD_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const rawData = JSON.parse(response.text!);
    
    const grid: GridCell[][] = [];
    const rawGrid = rawData.gridRaw;
    
    for (let r = 0; r < gridSize; r++) {
        const rowCells: GridCell[] = [];
        const rawRow = rawGrid[r] || [];
        for (let c = 0; c < gridSize; c++) {
            let code = (rawRow[c] || 'S').toUpperCase();
            if (!['X','S','P','B','L','H','Y'].includes(code)) code = 'S';
            
            if ((difficulty === 'EASY' || difficulty === 'TRAINEE') && code === 'X') code = 'S';

            let terrain: any = 'street';
            let staticObject: any = 'none';

            if (code === 'X') terrain = 'fog';
            else if (code === 'P') terrain = 'park';
            else if (code === 'B') terrain = 'building';
            else if (code === 'L') { terrain = 'street'; staticObject = 'lamp'; }
            else if (code === 'H') { terrain = 'street'; staticObject = 'bench'; }
            else if (code === 'Y') { terrain = 'street'; staticObject = 'hydrant'; }
            else terrain = 'street';

            rowCells.push({ row: r, col: c, terrain, staticObject });
        }
        grid.push(rowCells);
    }

    cleanGrid(grid);

    const items: Item[] = rawData.items.slice(0, gridSize).map((i: any) => ({
        id: i.id || i.label,
        label: i.label,
        emoji: i.emoji
    }));
    
    const fallbackEmojis = ['🕵️', '🔫', '🔦', '💼', '🚬', '💊', '📜', '🗝️', '👞', '🍸'];
    while (items.length < gridSize) {
        const nextId = items.length;
        items.push({ id: `item-${nextId}`, label: `Item ${nextId}`, emoji: fallbackEmojis[nextId % fallbackEmojis.length] });
    }

    let solution: Record<string, {row: number, col: number}> | null = null;
    
    for(let i=0; i<5; i++) {
        solution = placeItemsAlgorithmic(grid, items);
        if (solution) break;
    }

    if (!solution) {
         for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                grid[r][c].staticObject = 'none';
                if (grid[r][c].terrain === 'fog' && (difficulty === 'EASY' || difficulty === 'TRAINEE')) grid[r][c].terrain = 'street';
            }
         }
         solution = placeItemsAlgorithmic(grid, items);
    }

    if (!solution) {
         throw new Error("Could not generate valid puzzle solution. Grid too constrained.");
    }

    const clues = generateCluesAlgorithmic(grid, solution!, items);

    return {
      story: rawData.story || "Noir Mystery",
      gridSize,
      grid,
      items,
      solution: solution!,
      clues
    };

  } catch (error) {
    console.error("Hybrid Gen Error:", error);
    throw error;
  }
};

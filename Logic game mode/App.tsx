
import React, { useState, useEffect } from 'react';
import { generatePuzzle } from './services/geminiService';
import { GameState, Difficulty, Clue, Item, HistoryState, PuzzleConfig } from './types';
import IslandGrid from './components/IslandGrid';
import GameControls from './components/GameControls';
import { Loader2, RotateCcw, AlertCircle, Search, Undo2 } from 'lucide-react';
import confetti from 'canvas-confetti';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'MENU',
    difficulty: 'EASY',
    puzzle: null,
    placedItems: {},
    candidates: {},
    history: [],
    mistakes: 0,
    startTime: 0,
    endTime: 0
  });

  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isPencilMode, setIsPencilMode] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [violatedClueId, setViolatedClueId] = useState<string | null>(null);

  const startGame = async (difficulty: Difficulty) => {
    setGameState(prev => ({ ...prev, status: 'LOADING', difficulty }));
    setErrorMsg(null);
    setViolatedClueId(null);
    try {
      const puzzle = await generatePuzzle(difficulty);
      setGameState({
        status: 'PLAYING',
        difficulty,
        puzzle,
        placedItems: {},
        candidates: {},
        history: [],
        mistakes: 0,
        startTime: Date.now(),
        endTime: 0
      });
      setActiveItemId(null);
      setIsPencilMode(false);
    } catch (e) {
      console.error(e);
      setGameState(prev => ({ ...prev, status: 'MENU' }));
      setErrorMsg("Failed to open case file. Try again.");
    }
  };

  const pushHistory = (prevState: GameState) => {
      const historyEntry: HistoryState = {
          placedItems: { ...prevState.placedItems },
          candidates: { ...prevState.candidates }
      };
      return [...prevState.history, historyEntry];
  };

  const performUndo = () => {
      setGameState(prev => {
          if (prev.history.length === 0) return prev;
          const newHistory = [...prev.history];
          const lastState = newHistory.pop();
          if (!lastState) return prev;

          return {
              ...prev,
              placedItems: lastState.placedItems,
              candidates: lastState.candidates,
              history: newHistory
          };
      });
      setViolatedClueId(null);
  };

  const performPlacement = (row: number, col: number, itemId: string) => {
     setViolatedClueId(null);
     setGameState(prev => {
        const newHistory = pushHistory(prev);

        const newPlaced = { ...prev.placedItems };
        Object.keys(newPlaced).forEach(k => {
            if (k === itemId) delete newPlaced[k];
        });
        const existingAtTarget = Object.keys(newPlaced).find(k => newPlaced[k].row === row && newPlaced[k].col === col);
        if (existingAtTarget) delete newPlaced[existingAtTarget];
        newPlaced[itemId] = { row, col };

        const newCandidates = { ...prev.candidates };
        Object.keys(newCandidates).forEach(key => {
            const [rStr, cStr] = key.split('-');
            const r = parseInt(rStr);
            const c = parseInt(cStr);
            if (r === row || c === col) {
                delete newCandidates[key];
                return;
            }
            const list = newCandidates[key];
            if (list.includes(itemId)) {
                const filteredList = list.filter(id => id !== itemId);
                if (filteredList.length === 0) {
                    delete newCandidates[key];
                } else {
                    newCandidates[key] = filteredList;
                }
            }
        });

        return { ...prev, placedItems: newPlaced, candidates: newCandidates, history: newHistory };
    });
  };

  const performRemoval = (itemId: string) => {
      setViolatedClueId(null);
      setGameState(prev => {
          const newHistory = pushHistory(prev);
          const newPlaced = { ...prev.placedItems };
          delete newPlaced[itemId];
          return { ...prev, placedItems: newPlaced, history: newHistory };
      });
  };

  const performNote = (row: number, col: number, itemId: string, forceAction?: 'add' | 'remove') => {
      setGameState(prev => {
         const cell = prev.puzzle?.grid?.[row]?.[col];
         if (!cell || cell.terrain === 'fog' || cell.staticObject !== 'none') return prev;

         const key = `${row}-${col}`;
         const currentCandidates = prev.candidates[key] || [];
         
         let shouldAdd = false;
         if (forceAction === 'add') shouldAdd = true;
         else if (forceAction === 'remove') shouldAdd = false;
         else shouldAdd = !currentCandidates.includes(itemId);

         // Check if actually changed to prevent history spam on drag
         const alreadyHas = currentCandidates.includes(itemId);
         if (shouldAdd && alreadyHas) return prev;
         if (!shouldAdd && !alreadyHas) return prev;

         // Only push history if this is a distinct action start
         const newHistory = pushHistory(prev);

         if (shouldAdd) {
             const newCandidatesList = [...currentCandidates, itemId];
             const newCandidates = { ...prev.candidates, [key]: newCandidatesList };
             return { ...prev, candidates: newCandidates, history: newHistory };
         } else {
             const newCandidatesList = currentCandidates.filter(id => id !== itemId);
             const newCandidates = { ...prev.candidates, [key]: newCandidatesList };
             if (newCandidatesList.length === 0) delete newCandidates[key];
             return { ...prev, candidates: newCandidates, history: newHistory };
         }
      });
  };

  const handlePencilAction = (row: number, col: number, action: 'add' | 'remove') => {
      if (activeItemId) {
          performNote(row, col, activeItemId, action);
      }
  };

  const handleCellTap = (row: number, col: number) => {
    if (gameState.status !== 'PLAYING' || !gameState.puzzle) return;
    const cell = gameState.puzzle.grid[row][col];
    if (cell.terrain === 'fog' || cell.staticObject !== 'none') return;

    if (isPencilMode) {
        if (activeItemId) performNote(row, col, activeItemId);
    } else {
        // Placement Mode
        const existingPlacedId = Object.keys(gameState.placedItems).find(
            id => gameState.placedItems[id].row === row && gameState.placedItems[id].col === col
        );

        if (existingPlacedId) {
            // If tapping an item that is already there
            if (activeItemId === existingPlacedId) {
                // Tapping with same item -> Remove
                performRemoval(existingPlacedId);
            } else if (activeItemId) {
                // Tapping with different item -> Replace
                performPlacement(row, col, activeItemId);
            }
        } else {
            // Empty cell
            if (activeItemId) {
                performPlacement(row, col, activeItemId);
            }
        }
    }
  };

  const handleItemDrop = (row: number, col: number, itemId: string) => {
      performPlacement(row, col, itemId);
  };

  // Reusable check function
  const checkClue = (clue: Clue, placedItems: Record<string, {row: number, col: number}>, grid: any[][]): 'neutral' | 'satisfied' | 'violated' => {
        const p1 = placedItems[clue.item1];
        if (!p1) return 'neutral'; 

        const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
        const isStatic = ['Lamp', 'Bench', 'Hydrant', 'Fog', 'Street', 'Park', 'Building'].includes(clue.item2) || !isNaN(parseInt(clue.item2)) || COL_LABELS.includes(clue.item2);
        
        let p2: {row: number, col: number} | null = null;
        if (!isStatic) {
            p2 = placedItems[clue.item2];
            if (!p2) return 'neutral'; // Both items needed for inter-item clues
        }

        let satisfied = false;

        switch (clue.relation) {
            case 'ON': {
                const cell = grid[p1.row][p1.col];
                if (clue.item2 === 'Street') satisfied = (cell.terrain === 'street'); 
                else if (clue.item2 === 'Park') satisfied = (cell.terrain === 'park');
                else if (clue.item2 === 'Building') satisfied = (cell.terrain === 'building');
                else if (clue.item2 === 'Lamp') satisfied = (cell.staticObject === 'lamp');
                else if (clue.item2 === 'Bench') satisfied = (cell.staticObject === 'bench');
                else if (clue.item2 === 'Hydrant') satisfied = (cell.staticObject === 'hydrant');
                break;
            }
            case 'NOT_ON': {
                const cell = grid[p1.row][p1.col];
                let isOn = false;
                if (clue.item2 === 'Street') isOn = (cell.terrain === 'street');
                else if (clue.item2 === 'Park') isOn = (cell.terrain === 'park');
                else if (clue.item2 === 'Building') isOn = (cell.terrain === 'building');
                satisfied = !isOn;
                break;
            }
            case 'ROW':
                satisfied = (p1.row + 1).toString() === clue.item2;
                break;
            case 'COL':
                satisfied = COL_LABELS[p1.col] === clue.item2;
                break;
            case 'SAME_ROW':
                if (p2) satisfied = (p1.row === p2.row);
                break;
            case 'SAME_COL':
                if (p2) satisfied = (p1.col === p2.col);
                break;
            case 'LEFT_OF': // Same Row, Left Of
                if (p2) satisfied = (p1.row === p2.row && p1.col < p2.col);
                break;
            case 'LEFT_OF_ANY_ROW': // Any Row, Left Of
                if (p2) satisfied = (p1.col < p2.col);
                break;
            case 'ABOVE': // Same Col, Above
                if (p2) satisfied = (p1.col === p2.col && p1.row < p2.row);
                break;
            case 'ABOVE_ANY_COL': // Any Col, Above
                if (p2) satisfied = (p1.row < p2.row);
                break;
            case 'ADJ_HORIZONTAL':
                if (p2) satisfied = (p1.row === p2.row && Math.abs(p1.col - p2.col) === 1);
                break;
            case 'ADJ_VERTICAL': 
                if (p2) satisfied = (p1.col === p2.col && Math.abs(p1.row - p2.row) === 1);
                break;
            case 'ADJ_DIAGONAL': 
                if (p2) satisfied = (Math.abs(p1.row - p2.row) === 1 && Math.abs(p1.col - p2.col) === 1);
                break;
            case 'ADJ_ORTHOGONAL':
                if (p2) {
                   satisfied = ( (p1.row === p2.row && Math.abs(p1.col - p2.col) === 1) || (p1.col === p2.col && Math.abs(p1.row - p2.row) === 1) );
                } else if (isStatic) {
                   const neighbors = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
                   let found = false;
                   for(const n of neighbors) {
                      const nr = p1.row+n.r, nc = p1.col+n.c;
                      if(nr>=0 && nr<grid.length && nc>=0 && nc<grid[0].length) {
                         const nCell = grid[nr][nc];
                         if (clue.item2 === 'Lamp' && nCell.staticObject === 'lamp') found = true;
                         if (clue.item2 === 'Bench' && nCell.staticObject === 'bench') found = true;
                         if (clue.item2 === 'Hydrant' && nCell.staticObject === 'hydrant') found = true;
                         if (clue.item2 === 'Fog' && nCell.terrain === 'fog') found = true;
                      }
                   }
                   satisfied = found;
                }
                break;
            case 'NOT_ADJACENT':
                 if (p2) {
                     // Check if touching
                     const isTouching = (Math.abs(p1.row - p2.row) <= 1 && Math.abs(p1.col - p2.col) <= 1);
                     satisfied = !isTouching;
                 } else if (isStatic) {
                     satisfied = true; 
                 }
                 break;
            case 'NOT_ADJ_ORTHOGONAL':
                if (p2) {
                     const isOrthogonal = ( (p1.row === p2.row && Math.abs(p1.col - p2.col) === 1) || (p1.col === p2.col && Math.abs(p1.row - p2.row) === 1) );
                     satisfied = !isOrthogonal;
                }
                break;
            case 'NOT_ADJ_DIAGONAL':
                if (p2) {
                    const isDiagonal = (Math.abs(p1.row - p2.row) === 1 && Math.abs(p1.col - p2.col) === 1);
                    satisfied = !isDiagonal;
                }
                break;
            case 'ADJ_ANY': 
            default: {
                 if (p2) {
                     satisfied = (Math.abs(p1.row - p2.row) <= 1 && Math.abs(p1.col - p2.col) <= 1 && !(p1.row === p2.row && p1.col === p2.col));
                 } else if (isStatic) {
                     const neighbors = [
                        {r:-1,c:-1},{r:-1,c:0},{r:-1,c:1},
                        {r:0,c:-1},          {r:0,c:1},
                        {r:1,c:-1},{r:1,c:0},{r:1,c:1}
                     ];
                     let found = false;
                     for(const n of neighbors) {
                        const nr = p1.row+n.r, nc = p1.col+n.c;
                        if(nr>=0 && nr<grid.length && nc>=0 && nc<grid[0].length) {
                           const nCell = grid[nr][nc];
                           if (clue.item2 === 'Lamp' && nCell.staticObject === 'lamp') found = true;
                           if (clue.item2 === 'Bench' && nCell.staticObject === 'bench') found = true;
                           if (clue.item2 === 'Hydrant' && nCell.staticObject === 'hydrant') found = true;
                           if (clue.item2 === 'Fog' && nCell.terrain === 'fog') found = true;
                        }
                     }
                     satisfied = found;
                 }
                 break;
            }
        }

        return satisfied ? 'satisfied' : 'violated';
  };

  const getClueStatuses = () => {
      const statuses: Record<string, 'neutral' | 'satisfied' | 'violated'> = {};
      if (!gameState.puzzle) return statuses;
      
      gameState.puzzle.clues.forEach(clue => {
          statuses[clue.id] = checkClue(clue, gameState.placedItems, gameState.puzzle!.grid);
      });
      return statuses;
  };

  const clueStatuses = getClueStatuses();

  const checkSolution = () => {
    if (!gameState.puzzle) return;
    
    // Check if full
    const { items } = gameState.puzzle;
    if (Object.keys(gameState.placedItems).length !== items.length) {
        setErrorMsg(`Place all ${items.length} items.`);
        return;
    }

    // Check violations
    const violations = Object.keys(clueStatuses).filter(id => clueStatuses[id] === 'violated');
    
    // Also check unique rows/cols manually as that's a global constraint not in Clues
    const placedIds = Object.keys(gameState.placedItems);
    const rows = new Set<number>();
    const cols = new Set<number>();
    let gridViolation = false;
    for (const id of placedIds) {
        const { row, col } = gameState.placedItems[id];
        if (rows.has(row) || cols.has(col)) gridViolation = true;
        rows.add(row);
        cols.add(col);
    }

    if (violations.length > 0) {
        setGameState(prev => ({ ...prev, mistakes: prev.mistakes + 1 }));
        setViolatedClueId(violations[0]);
        setErrorMsg("Evidence contradicts logic.");
        setTimeout(() => { setErrorMsg(null); setViolatedClueId(null); }, 3000);
    } else if (gridViolation) {
        setGameState(prev => ({ ...prev, mistakes: prev.mistakes + 1 }));
        setErrorMsg("Items cannot share Row/Column.");
        setTimeout(() => setErrorMsg(null), 3000);
    } else {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#fff', '#999', '#333']
        });
        setGameState(prev => ({ ...prev, status: 'WON', endTime: Date.now() }));
    }
  };

  const placedCounts: Record<string, number> = {};
  if (gameState.puzzle) {
      gameState.puzzle.items.forEach(i => placedCounts[i.id] = 0);
      Object.keys(gameState.placedItems).forEach(id => {
          if (placedCounts[id] !== undefined) placedCounts[id]++;
      });
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative text-[#e0e0e0]">
       {/* MENU OVERLAY */}
       {gameState.status === 'MENU' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#333] p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                <div className="mb-8">
                    <Search className="w-16 h-16 mx-auto text-[#e0e0e0] mb-4 opacity-80" strokeWidth={1} />
                    <h1 className="text-4xl font-bold tracking-[0.2em] text-[#e0e0e0] uppercase border-b-2 border-[#e0e0e0] pb-2 inline-block">NOIR LOGIC</h1>
                    <p className="mt-4 text-[#888] italic text-sm">"The city has secrets. Can you find them?"</p>
                </div>
                
                {errorMsg && (
                    <div className="mb-4 p-2 bg-red-900/20 border border-red-800 text-red-400 text-xs">
                    {errorMsg}
                    </div>
                )}
                
                <div className="space-y-4">
                    <button onClick={() => startGame('TRAINEE')} className="w-full py-3 bg-[#263238] hover:bg-[#37474f] border border-[#455a64] text-[#eceff1] tracking-widest uppercase text-sm transition-colors">Trainee (5x5)</button>
                    <button onClick={() => startGame('EASY')} className="w-full py-3 bg-[#263238] hover:bg-[#37474f] border border-[#455a64] text-[#eceff1] tracking-widest uppercase text-sm transition-colors">Private Eye (6x6)</button>
                    <button onClick={() => startGame('MEDIUM')} className="w-full py-3 bg-[#263238] hover:bg-[#37474f] border border-[#455a64] text-[#eceff1] tracking-widest uppercase text-sm transition-colors">Detective (7x7)</button>
                    <button onClick={() => startGame('HARD')} className="w-full py-3 bg-[#263238] hover:bg-[#37474f] border border-[#455a64] text-[#eceff1] tracking-widest uppercase text-sm transition-colors">Inspector (8x8)</button>
                    <button onClick={() => startGame('MASTER')} className="w-full py-3 bg-[#263238] hover:bg-[#37474f] border border-[#455a64] text-[#eceff1] tracking-widest uppercase text-sm transition-colors">Master (9x9)</button>
                </div>
            </div>
        </div>
       )}

       {gameState.status === 'LOADING' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#111] text-[#888]">
            <Loader2 className="animate-spin text-[#e0e0e0]" size={48} strokeWidth={1} />
            <p className="mt-6 text-sm tracking-[0.3em] uppercase animate-pulse">Gathering Evidence...</p>
        </div>
       )}

       {/* HEADER */}
       <header className="h-16 shrink-0 px-6 flex items-center justify-between z-30 bg-[#111] border-b border-[#333] shadow-lg">
          <div className="flex items-center gap-4">
            <button onClick={() => setGameState(prev => ({...prev, status: 'MENU'}))} className="opacity-50 hover:opacity-100 transition-opacity">
              <RotateCcw size={20} />
            </button>
            <div>
                <span className="block text-[10px] text-[#666] uppercase tracking-widest">Case File</span>
                <span className="block text-[#e0e0e0] text-lg leading-none">{gameState.puzzle?.story || 'Unsolved Mystery'}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <span className="block text-[10px] text-[#666] uppercase tracking-widest">Mistakes</span>
                <span className="block text-[#e0e0e0] text-lg leading-none font-bold text-red-500">{gameState.mistakes}</span>
             </div>
             <button onClick={checkSolution} className="bg-[#e0e0e0] hover:bg-white text-black px-6 py-2 uppercase tracking-widest text-xs font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform active:scale-95">
                 Solve Case
             </button>
          </div>
       </header>

       {/* Error Toast */}
       {errorMsg && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#212121] border border-red-800 text-red-400 px-6 py-3 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in">
                <AlertCircle size={18} />
                <span className="text-sm tracking-wide">{errorMsg}</span>
            </div>
       )}

       {/* Map Area */}
       <div className="flex-1 overflow-hidden relative w-full h-full flex items-center justify-center bg-[#1a1a1a]">
          {/* Spotlight Effect Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none"></div>
          
          {/* Undo Button - Floating Top Left */}
          {gameState.status === 'PLAYING' && (
              <div className="absolute top-4 left-4 z-40">
                <button
                    onClick={performUndo}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-[#263238] border border-[#37474f] text-[#eceff1] hover:bg-[#37474f] hover:border-[#455a64] active:scale-95 transition-all shadow-lg"
                    title="Undo"
                >
                    <Undo2 size={20} />
                </button>
              </div>
          )}

          {gameState.puzzle && (
            <div className="w-full h-full flex items-center justify-center p-4 pb-[40vh] md:pb-12 relative z-10"> 
                <IslandGrid 
                  grid={gameState.puzzle.grid}
                  placedItems={gameState.placedItems}
                  candidates={gameState.candidates}
                  itemsConfig={gameState.puzzle.items}
                  onCellTap={handleCellTap}
                  onItemDrop={handleItemDrop}
                  onPencilAction={handlePencilAction}
                  activeItemId={activeItemId}
                  isPencilMode={isPencilMode}
                />
            </div>
          )}
       </div>

       {/* Floating Controls at bottom */}
       <div className="absolute bottom-0 left-0 right-0 z-40">
          {gameState.puzzle && (
             <GameControls 
               items={gameState.puzzle.items}
               clues={gameState.puzzle.clues}
               activeItemId={activeItemId}
               isPencilMode={isPencilMode}
               onItemSelect={setActiveItemId}
               onToggleMode={() => setIsPencilMode(!isPencilMode)}
               onUndo={performUndo}
               placedItemsCount={placedCounts}
               violatedClueId={violatedClueId}
               clueStatuses={clueStatuses}
             />
          )}
       </div>

       {gameState.status === 'WON' && (
         <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
             <div className="bg-[#fcf6e5] p-10 max-w-md w-full text-center shadow-[0_0_50px_rgba(255,255,255,0.1)] relative rotate-1 border-8 border-double border-[#5d4037]">
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-800 text-white px-4 py-1 text-xs uppercase tracking-widest font-bold rotate-[-2deg] shadow-lg">Case Closed</div>
                 <div className="text-6xl mb-6 opacity-80 text-black">🕵️</div>
                 <h2 className="text-3xl font-bold text-[#3e2723] mb-2 uppercase tracking-widest">Solved!</h2>
                 <p className="text-[#5d4037] mb-6 italic font-serif">"Excellent work, detective. The city is safer tonight."</p>
                 <div className="w-full h-px bg-[#8d6e63] mb-6"></div>
                 <p className="text-[#8d6e63] mb-8 text-xs uppercase tracking-widest">Mistakes made: {gameState.mistakes}</p>
                 <button onClick={() => startGame(gameState.difficulty)} className="w-full py-4 bg-[#3e2723] text-[#fcf6e5] font-bold uppercase tracking-[0.2em] text-sm hover:bg-[#4e342e] transition-colors shadow-lg">Next Case</button>
             </div>
         </div>
       )}
    </div>
  );
};

export default App;

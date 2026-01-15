
import React, { useState, useEffect } from 'react';
import { GridCell, Item } from '../types';

interface IslandGridProps {
  grid: GridCell[][];
  placedItems: Record<string, {row: number, col: number}>;
  candidates: Record<string, string[]>; // "row-col" -> [itemIds]
  itemsConfig: Item[];
  onCellTap: (row: number, col: number) => void;
  onItemDrop: (row: number, col: number, itemId: string) => void;
  onPencilAction?: (row: number, col: number, action: 'add' | 'remove') => void;
  activeItemId: string | null;
  isPencilMode: boolean;
}

const IslandGrid: React.FC<IslandGridProps> = ({ 
  grid, 
  placedItems, 
  candidates,
  itemsConfig,
  onCellTap,
  onPencilAction,
  activeItemId,
  isPencilMode
}) => {
  const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const [dragAction, setDragAction] = useState<'add' | 'remove' | null>(null);

  useEffect(() => {
    const handleGlobalUp = () => setDragAction(null);
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    return () => {
        window.removeEventListener('pointerup', handleGlobalUp);
        window.removeEventListener('pointercancel', handleGlobalUp);
    };
  }, []);

  const handlePointerDown = (r: number, c: number, e: React.PointerEvent) => {
      if (isPencilMode && activeItemId) {
          e.preventDefault();
      }

      const cell = grid[r][c];
      const isVoid = cell.terrain === 'fog';
      const isBlocked = cell.staticObject !== 'none';
      if (isVoid || isBlocked) return;

      if (isPencilMode && activeItemId && onPencilAction) {
          const key = `${r}-${c}`;
          const currentCandidates = candidates[key] || [];
          const hasItem = currentCandidates.includes(activeItemId);
          const action = hasItem ? 'remove' : 'add';
          
          setDragAction(action);
          onPencilAction(r, c, action);

          if (e.target instanceof HTMLElement) {
             e.target.releasePointerCapture(e.pointerId);
          }
      } else {
          onCellTap(r, c);
      }
  };

  const handlePointerEnter = (r: number, c: number) => {
      if (dragAction && isPencilMode && activeItemId && onPencilAction) {
          const cell = grid[r][c];
          if (cell.terrain === 'fog' || cell.staticObject !== 'none') return;
          
          onPencilAction(r, c, dragAction);
      }
  };

  const getCellContent = (r: number, c: number) => {
    const placedId = Object.keys(placedItems).find(id => placedItems[id].row === r && placedItems[id].col === c);
    if (placedId) {
      const item = itemsConfig.find(i => i.id === placedId);
      return { type: 'placed', content: item?.emoji || '?' };
    }
    
    const key = `${r}-${c}`;
    const cellCandidates = candidates[key];
    if (cellCandidates && cellCandidates.length > 0) {
      return { type: 'candidates', content: cellCandidates };
    }

    return null;
  };

  return (
    <div className="inline-block p-1 select-none touch-none bg-[#111] rounded-sm backdrop-blur-sm border-2 border-[#444] shadow-2xl relative">
       {/* Paper Texture overlay */}
       <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] pointer-events-none"></div>

      <div 
        className="grid gap-px relative z-10"
        style={{ 
          gridTemplateColumns: `auto repeat(${grid[0].length}, minmax(36px, 48px))` 
        }}
      >
        {/* Header Row */}
        <div className="h-4"></div>
        {grid[0].map((_, i) => (
          <div key={i} className="flex items-center justify-center font-bold text-[#888] text-xs md:text-sm drop-shadow-md">
            {COL_LABELS[i]}
          </div>
        ))}

        {/* Grid Body */}
        {grid.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {/* Row Number */}
            <div className="flex items-center justify-end pr-2 h-10 md:h-12">
               <span className="font-bold text-[#888] text-xs md:text-sm">{rowIndex + 1}</span>
            </div>

            {/* Cells */}
            {row.map((cell) => {
              const isVoid = cell.terrain === 'fog';
              const isBlocked = cell.staticObject !== 'none';
              const content = getCellContent(cell.row, cell.col);

              // --- Styling Logic ---
              let bgClass = '';
              let staticIcon = null;
              let terrainIcon = null;

              if (isVoid) {
                bgClass = 'opacity-0 pointer-events-none';
              } else {
                if (cell.terrain === 'park') {
                    // Park: More vivid green
                    bgClass = isBlocked 
                        ? 'bg-[#1b5e20] border-[#0d3311]' 
                        : 'bg-[#388e3c] border-[#2e7d32]'; 
                    terrainIcon = '🌳';
                } else if (cell.terrain === 'building') {
                    // Building: Richer brown/brick
                    bgClass = isBlocked 
                        ? 'bg-[#3e2723] border-[#271c19]' 
                        : 'bg-[#8d6e63] border-[#6d4c41]'; 
                    terrainIcon = '🏢';
                } else {
                    // Street: Blue-Grey but lighter than before for contrast
                    bgClass = isBlocked 
                        ? 'bg-[#263238] border-[#101518]' 
                        : 'bg-[#607d8b] border-[#455a64]'; 
                    terrainIcon = '🛣️';
                }

                if (!isBlocked) {
                    bgClass += ' shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]';
                }
              }

              if (cell.staticObject === 'lamp') staticIcon = '💡';
              if (cell.staticObject === 'bench') staticIcon = '🪑';
              if (cell.staticObject === 'hydrant') staticIcon = '🚒';

              // Visual distinction for blocked/static cells
              const blockedPattern = isBlocked 
                ? "bg-[linear-gradient(45deg,rgba(0,0,0,0.3)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3)_75%,transparent_75%,transparent)] bg-[length:4px_4px]" 
                : "";

              const isActionable = !isBlocked && !isVoid && activeItemId;
              const activeClass = isActionable 
                ? `cursor-pointer active:scale-95 ${isPencilMode ? 'hover:ring-2 hover:ring-yellow-600' : 'hover:ring-2 hover:ring-blue-400'}` 
                : '';

              if (isVoid) {
                  return (
                    <div key={`${cell.row}-${cell.col}`} className="w-full h-full rounded border border-white/5 relative overflow-hidden bg-[#0a0a0a]">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#111,#111_5px,#000_5px,#000_10px)] opacity-50"></div>
                    </div>
                  );
              }

              return (
                <div
                  key={`${cell.row}-${cell.col}`}
                  onPointerDown={(e) => handlePointerDown(cell.row, cell.col, e)}
                  onPointerEnter={() => handlePointerEnter(cell.row, cell.col)}
                  className={`
                    w-full h-10 md:h-12 rounded-sm relative transition-all duration-100 overflow-hidden
                    border-b-[2px]
                    ${bgClass}
                    ${blockedPattern}
                    ${activeClass}
                    ${isBlocked ? 'cursor-not-allowed opacity-100 grayscale-[0.2]' : 'grayscale-[0.1]'}
                  `}
                >
                  {/* Terrain Watermark (Bottom Right) */}
                  {!isBlocked && (
                      <div className="absolute bottom-0.5 right-0.5 text-[10px] opacity-40 pointer-events-none filter grayscale">
                          {terrainIcon}
                      </div>
                  )}

                  {/* 1. Static Object Layer (Center, Low Opacity if blocked) */}
                  {staticIcon && (
                     <div className="absolute inset-0 flex items-center justify-center text-xl md:text-2xl pointer-events-none drop-shadow-sm opacity-90">
                        {staticIcon}
                     </div>
                  )}

                  {/* 2. Placed Item Layer (High Prominence) */}
                  {content?.type === 'placed' && (
                    <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-200 z-20 pointer-events-none">
                      <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] text-xl md:text-3xl filter brightness-110 saturate-125">{content.content}</span>
                    </div>
                  )}

                  {/* 3. Candidates (Pencil Marks) Layer */}
                  {content?.type === 'candidates' && (
                    <div className="absolute inset-0 p-1 grid grid-cols-2 grid-rows-2 gap-[1px] z-10 pointer-events-none overflow-hidden">
                        {(content.content as string[]).slice(0, 4).map(cId => {
                            const emoji = itemsConfig.find(i => i.id === cId)?.emoji;
                            return (
                                <div key={cId} className="flex items-center justify-center text-[8px] md:text-[12px] leading-none text-white/90 shadow-sm rounded-sm backdrop-blur-[0px]">
                                    <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{emoji}</span>
                                </div>
                            );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default IslandGrid;

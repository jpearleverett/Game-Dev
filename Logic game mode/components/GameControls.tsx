
import React, { useState, useEffect, useRef } from 'react';
import { Item, Clue } from '../types';
import { ChevronUp, Pencil, Stamp, Check } from 'lucide-react';

interface GameControlsProps {
  items: Item[];
  clues: Clue[];
  activeItemId: string | null;
  isPencilMode: boolean;
  onItemSelect: (itemId: string | null) => void;
  onToggleMode: () => void;
  onUndo: () => void;
  placedItemsCount: Record<string, number>;
  violatedClueId: string | null;
  clueStatuses: Record<string, 'neutral' | 'satisfied' | 'violated'>;
}

const ClueVisual: React.FC<{ 
    clue: Clue; 
    status: 'neutral' | 'satisfied' | 'violated';
    isChecked: boolean;
    onToggleCheck: () => void;
}> = ({ clue, status, isChecked, onToggleCheck }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
      // Don't prevent default here to allow scrolling to start normally
      startPos.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
          onToggleCheck();
          if (navigator.vibrate) navigator.vibrate(50);
          timerRef.current = null;
      }, 600); // 600ms for long press
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (startPos.current) {
          const moveX = Math.abs(e.clientX - startPos.current.x);
          const moveY = Math.abs(e.clientY - startPos.current.y);
          // If moved more than 10px, it's likely a scroll/drag, so cancel long press
          if (moveX > 10 || moveY > 10) {
              if (timerRef.current) {
                  clearTimeout(timerRef.current);
                  timerRef.current = null;
              }
              startPos.current = null;
          }
      }
  };

  const handlePointerUp = () => {
      if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
      }
      startPos.current = null;
  };

  const renderIcon = () => {
      const wrapperClass = "w-5 h-5 min-[400px]:w-6 min-[400px]:h-6 shrink-0 flex items-center justify-center text-base min-[400px]:text-lg font-black";

      // 1. Text-based Relations
      if (clue.relation === 'ON') return <div className={`${wrapperClass} text-current`}>=</div>;
      if (clue.relation === 'ROW') return <div className={`${wrapperClass} text-current`}>=</div>;
      if (clue.relation === 'COL') return <div className={`${wrapperClass} text-current`}>=</div>;
      
      // Adjusted size for NOT_ON (Scaled down slightly from 2.0 to 1.6)
      if (clue.relation === 'NOT_ON') return <div className={`${wrapperClass} text-red-600 font-sans text-4xl min-[400px]:text-5xl scale-[1.6] font-bold`}>≠</div>;

      // Common styling for "Boxed" clues (Adjacency & Directional)
      const boxBaseClass = `w-5 h-5 min-[400px]:w-6 min-[400px]:h-6 shrink-0 rounded-sm shadow-sm border ${status === 'satisfied' ? 'bg-green-200 border-green-400' : 'bg-[#cfd8dc] border-[#546e7a]'}`;

      // 2. Custom Shape Relations (Left of Any / Above Any) - BOXED & THICKER BARS
      if (clue.relation === 'LEFT_OF_ANY_ROW') {
          return (
             <div className={`${boxBaseClass} flex items-center justify-center p-[2px]`}>
                 <div className="flex items-center justify-center gap-[1px] w-full h-full">
                    <div className="w-1.5 h-full bg-[#455a64] rounded-[1px]"></div>
                    <span className="text-[9px] font-bold leading-none -mt-[1px] text-[#263238]">&lt;</span>
                    <div className="w-1.5 h-full bg-[#455a64] rounded-[1px]"></div>
                 </div>
             </div>
          );
      }
      if (clue.relation === 'ABOVE_ANY_COL') {
          return (
             <div className={`${boxBaseClass} flex items-center justify-center p-[2px]`}>
                 <div className="flex flex-col items-center justify-center gap-[1px] w-full h-full">
                    <div className="h-1.5 w-full bg-[#455a64] rounded-[1px]"></div>
                    <span className="text-[9px] font-bold leading-none my-[0px] text-[#263238]">^</span> 
                    <div className="h-1.5 w-full bg-[#455a64] rounded-[1px]"></div>
                 </div>
             </div>
          );
      }

      // 3. Grid-based Relations
      return (
         <div className={`${boxBaseClass} grid grid-cols-3 grid-rows-3 gap-[1px] p-[1px]`}>
             {[...Array(9)].map((_, i) => {
                 const r = Math.floor(i / 3);
                 const c = i % 3;
                 const isCenter = (r === 1 && c === 1);
                 
                 let bg = status === 'satisfied' ? 'bg-green-100' : 'bg-[#eceff1]'; 
                 
                 if (isCenter) {
                     // Center Logic
                     bg = status === 'satisfied' ? 'bg-green-600' : 'bg-[#455a64]';
                 } else {
                     let isActive = false;
                     let isRed = false;

                     switch (clue.relation) {
                         case 'ADJ_HORIZONTAL': if (r===1) isActive=true; break;
                         case 'ADJ_VERTICAL': if (c===1) isActive=true; break;
                         case 'ADJ_DIAGONAL': if (r!==1 && c!==1) isActive=true; break;
                         case 'ADJ_ORTHOGONAL': if ((r===1)!==(c===1)) isActive=true; break;
                         case 'ADJ_ANY': isActive=true; break;
                         
                         case 'NOT_ADJACENT': isRed=true; break;
                         case 'NOT_ADJ_ORTHOGONAL': if ((r===1)!==(c===1)) isRed=true; break;
                         case 'NOT_ADJ_DIAGONAL': if (r!==1 && c!==1) isRed=true; break;

                         case 'SAME_ROW': if (r===1) isActive=true; break;
                         case 'SAME_COL': if (c===1) isActive=true; break;
                         case 'LEFT_OF': if (r===1 && c===2) isActive=true; break; // Item1 (Center) Left Of Item2 (Right)
                         case 'ABOVE': if (c===1 && r===2) isActive=true; break; // Item1 (Center) Above Item2 (Bottom)
                     }

                     if (isActive) bg = status === 'satisfied' ? 'bg-green-400' : 'bg-[#90a4ae]';
                     if (isRed) bg = status === 'violated' ? 'bg-red-400' : 'bg-[#d32f2f]';
                 }

                 return <div key={i} className={`${bg} rounded-[0.5px]`}></div>
             })}
         </div>
      );
  };

  let containerClass = "bg-[#fcf6e5] border-[#bcaaa4] hover:border-[#795548]"; // Neutral
  let badge = null;

  if (status === 'satisfied') {
      containerClass = "bg-green-100 border-green-500 shadow-[inset_0_0_10px_rgba(76,175,80,0.2)]";
      badge = <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-bl-lg shadow-sm"></div>;
  } else if (status === 'violated') {
      containerClass = "bg-red-100 border-red-500 animate-pulse";
  } else if (isChecked) {
      // Manual Check Style: Dimmed/Greyed out with checkmark
      containerClass = "bg-[#d7ccc8] border-[#8d6e63] opacity-60 grayscale"; 
      badge = (
        <div className="absolute top-0 right-0 w-5 h-5 bg-[#5d4037] rounded-bl-lg flex items-center justify-center shadow-sm z-20">
            <Check size={12} className="text-white" strokeWidth={4} />
        </div>
      );
  }

  return (
    <div 
        id={`clue-${clue.id}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`
            flex flex-col items-center justify-center px-3 py-2 h-14 rounded shadow-sm transition-all duration-300 relative overflow-hidden border select-none touch-manipulation cursor-pointer
            ${containerClass}
        `}
    >
        {/* Paper Texture */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-30 pointer-events-none"></div>

        <div className="flex items-center justify-between w-full gap-0.5 relative z-10 text-[#3e2723]">
            <span className="text-xl min-[400px]:text-2xl leading-none drop-shadow-sm filter grayscale-[0.2] shrink-0 pt-[2px]">{clue.icon1}</span>
            {renderIcon()}
            <span className="text-xl min-[400px]:text-2xl leading-none drop-shadow-sm filter grayscale-[0.2] shrink-0 pt-[2px]">{clue.icon2}</span>
        </div>
        
        {badge}
    </div>
  );
};

const GameControls: React.FC<GameControlsProps> = ({ 
  items, 
  clues, 
  activeItemId, 
  isPencilMode,
  onItemSelect,
  onToggleMode,
  onUndo,
  placedItemsCount,
  violatedClueId,
  clueStatuses
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkedClues, setCheckedClues] = useState<Set<string>>(new Set());

  useEffect(() => {
      if (violatedClueId && isExpanded) {
          const el = document.getElementById(`clue-${violatedClueId}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
      } else if (violatedClueId && !isExpanded) {
          setIsExpanded(true); 
      }
  }, [violatedClueId, isExpanded]);

  const toggleClueCheck = (id: string) => {
      const next = new Set(checkedClues);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setCheckedClues(next);
  };

  return (
    <div className="flex flex-col w-full shadow-[0_-10px_40px_rgba(0,0,0,1)] z-40">
      
      {/* 1. CLUE DRAWER */}
      <div 
        className={`
            bg-[#d7ccc8] border-t-8 border-[#5d4037] transition-all duration-500 ease-in-out flex flex-col relative shadow-[inset_0_10px_20px_rgba(0,0,0,0.1)]
            ${isExpanded ? 'h-[30vh]' : 'h-10'}
        `}
      >
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 bg-[#f5f5dc] opacity-90 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] pointer-events-none"></div>

          {/* Handle */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full h-8 shrink-0 flex items-center justify-center text-[#5d4037] hover:bg-black/5 active:bg-black/10 transition-colors absolute top-0 left-0 z-20 cursor-pointer"
          >
             {isExpanded ? (
                 <div className="w-12 h-1 bg-[#8d6e63] rounded-full mt-2 opacity-50" />
             ) : (
                 <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-[12px] mt-1 text-[#3e2723]">
                    <ChevronUp size={14} /> CLUE FILE <ChevronUp size={14} />
                 </div>
             )}
          </button>

          {/* Clues Grid */}
          <div className="px-2 pt-8 pb-4 overflow-y-auto overflow-x-hidden scrollbar-hide flex-1 w-full relative z-10">
            <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {clues.map(clue => (
                    <ClueVisual 
                        key={clue.id} 
                        clue={clue} 
                        status={violatedClueId === clue.id ? 'violated' : clueStatuses[clue.id] || 'neutral'} 
                        isChecked={checkedClues.has(clue.id)}
                        onToggleCheck={() => toggleClueCheck(clue.id)}
                    />
                ))}
            </div>
          </div>
      </div>

      {/* 2. MAIN TOOLBAR */}
      <div className="bg-[#212121] p-2 md:p-3 flex gap-2 items-center relative shadow-2xl z-50 border-t border-[#424242]">
         
         {/* Left: Tools */}
         <div className="flex flex-col gap-2 shrink-0 border-r border-white/10 pr-3">
             <div className="flex gap-1">
                {/* Mode Toggle */}
                <button
                    onClick={onToggleMode}
                    className={`
                        w-12 h-12 rounded flex flex-col items-center justify-center transition-all border-b-2 active:border-b-0 active:translate-y-1
                        ${!isPencilMode 
                            ? 'bg-[#3e2723] border-[#1b0000] text-[#d7ccc8] shadow-lg ring-1 ring-[#5d4037]' 
                            : 'bg-[#1a1a1a] border-[#000] text-[#555]'
                        }
                    `}
                >
                    <Stamp size={20} strokeWidth={2} />
                    <span className="text-[9px] font-bold uppercase mt-0.5 tracking-wide">Place</span>
                </button>

                <button
                    onClick={onToggleMode}
                    className={`
                        w-12 h-12 rounded flex flex-col items-center justify-center transition-all border-b-2 active:border-b-0 active:translate-y-1
                        ${isPencilMode 
                            ? 'bg-[#fdd835] border-[#fbc02d] text-black shadow-lg ring-1 ring-[#fbc02d]' 
                            : 'bg-[#1a1a1a] border-[#000] text-[#555]'
                        }
                    `}
                >
                    <Pencil size={20} strokeWidth={2} />
                    <span className="text-[9px] font-bold uppercase mt-0.5 tracking-wide">Note</span>
                </button>
             </div>
         </div>

         {/* Right: Item Selector */}
         <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 min-w-max pb-2 pt-4 px-1 items-center">
                 {/* Items */}
                 {items.map((item) => {
                     const isPlaced = placedItemsCount[item.id] > 0;
                     const isSelected = activeItemId === item.id;
                     return (
                         <button
                            key={item.id}
                            onClick={() => onItemSelect(isSelected ? null : item.id)}
                            className={`
                                w-14 h-14 md:w-16 md:h-16 rounded flex items-center justify-center text-3xl relative transition-all duration-200 border-b-2 active:border-b-0 active:translate-y-1 pt-1
                                ${isSelected 
                                    ? 'bg-[#d7ccc8] border-[#8d6e63] -translate-y-1 shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-10 scale-105' 
                                    : 'bg-[#424242] border-[#212121] hover:bg-[#616161]'
                                }
                            `}
                         >
                            <span className={`filter ${isPlaced && !isSelected ? 'grayscale opacity-30 blur-[1px]' : 'drop-shadow-md grayscale-[0.2] contrast-125'}`}>
                                {item.emoji}
                            </span>
                            
                            {isPlaced && (
                                <div className="absolute top-1 right-1 w-3 h-3 bg-[#66bb6a] rounded-full border border-black shadow-sm scale-in"></div>
                            )}
                         </button>
                     )
                 })}
            </div>
         </div>

      </div>
    </div>
  );
};

export default GameControls;

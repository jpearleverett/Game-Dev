import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect, Circle, Line, Defs, RadialGradient, Stop, G } from 'react-native-svg';

/**
 * GenerativePolaroid
 * 
 * Renders an abstract SVG image based on "noir" themes and specific visual parameters.
 * This runs entirely on the client without external APIs.
 * 
 * @param {Object} visuals - { style, primaryColor, complexity }
 * @param {string} seed - A string seed (usually title or caption) to ensure determinism
 * @param {number} width
 * @param {number} height
 */
export default function GenerativePolaroid({ visuals, seed = "default", width = 100, height = 100 }) {
  const { style = 'abstract', primaryColor = '#8B0000', complexity = 0.5 } = visuals || {};

  // Simple pseudo-random number generator seeded by string
  const getPRNG = (str) => {
    let h = 0xdeadbeef;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h >>> 0) / 4294967296);
    };
  };

  // Generate deterministic elements based on seed
  const elements = useMemo(() => {
    const random = getPRNG(seed + style);
    const count = Math.floor(complexity * 10) + 5;
    const items = [];
    
    // Background base color variation
    const bgHsl = `hsl(${Math.floor(random() * 360)}, 10%, ${Math.floor(random() * 20) + 10}%)`;
    
    // Generate shapes based on style
    for (let i = 0; i < count; i++) {
      const type = random();
      const x = random() * width;
      const y = random() * height;
      const size = random() * (width / 2) + 10;
      const opacity = random() * 0.6 + 0.1;
      const rotation = random() * 360;
      const color = random() > 0.7 ? primaryColor : '#000000';
      
      items.push({ type, x, y, size, opacity, rotation, color, id: i });
    }
    
    return { bgHsl, items };
  }, [seed, style, primaryColor, complexity, width, height]);

  // Render different archetypes
  const renderContent = () => {
    const random = getPRNG(seed);
    
    switch (style) {
      case 'document':
        // Redacted text lines
        return (
          <G>
            {Array.from({ length: 12 }).map((_, i) => {
               if (random() > 0.7) return null; // Gap
               const w = random() * (width * 0.8) + 10;
               const isRedacted = random() > 0.5;
               return (
                 <Rect
                   key={i}
                   x={10}
                   y={15 + i * (height / 15)}
                   width={w}
                   height={height / 25}
                   fill={isRedacted ? "#000" : "#d0d0d0"}
                   opacity={isRedacted ? 0.9 : 0.4}
                 />
               );
            })}
            <Circle cx={width - 20} cy={height - 20} r={15} stroke={primaryColor} strokeWidth={2} fill="none" opacity={0.6} />
            <Rect x={width - 28} y={height - 22} width={16} height={4} fill={primaryColor} opacity={0.6} transform={`rotate(-15, ${width-20}, ${height-20})`} />
          </G>
        );
        
      case 'evidence':
        // Scattered objects / shapes
        return (
           <G>
             {elements.items.map((item) => {
               if (item.type > 0.5) return null; // Fewer items
               return (
                 <Path
                   key={item.id}
                   d={`M ${item.x} ${item.y} L ${item.x + item.size} ${item.y + item.size/2} L ${item.x - item.size/2} ${item.y + item.size} Z`}
                   fill="none"
                   stroke={item.color}
                   strokeWidth={1.5}
                   opacity={item.opacity}
                   transform={`rotate(${item.rotation}, ${item.x}, ${item.y})`}
                 />
               );
             })}
             <Circle cx={width/2} cy={height/2} r={width * 0.3} stroke="white" strokeWidth={1} opacity={0.2} />
           </G>
        );

      case 'map':
        // Lines and nodes
        return (
          <G>
             {elements.items.map((item, i) => {
               if (i === 0) return null;
               const prev = elements.items[i-1];
               return (
                 <Line
                   key={item.id}
                   x1={prev.x}
                   y1={prev.y}
                   x2={item.x}
                   y2={item.y}
                   stroke={primaryColor}
                   strokeWidth={1}
                   opacity={0.5}
                 />
               );
             })}
             {elements.items.map((item) => (
                <Circle key={`c-${item.id}`} cx={item.x} cy={item.y} r={3} fill="#fff" opacity={0.8} />
             ))}
          </G>
        );

      case 'shadow':
        // Moody gradients and blobs
        return (
          <G>
            <Defs>
              <RadialGradient id="grad" cx="50%" cy="50%" rx="50%" ry="50%" fx="50%" fy="50%" gradientUnits="userSpaceOnUse">
                <Stop offset="0%" stopColor="#000" stopOpacity="0.8" />
                <Stop offset="100%" stopColor={primaryColor} stopOpacity="0.2" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={height} fill="url(#grad)" />
            <Path
               d={`M 0 ${height} Q ${width/2} ${height/2} ${width} ${height} Z`}
               fill="#000"
               opacity={0.8}
            />
             <Circle cx={width * 0.7} cy={height * 0.3} r={10} fill="#fff" opacity={0.1} />
          </G>
        );

      case 'pattern':
      default:
        // Abstract noise
        return (
          <G>
            {elements.items.map((item) => (
              <Rect
                key={item.id}
                x={item.x}
                y={item.y}
                width={item.size}
                height={item.size}
                fill={item.color}
                opacity={item.opacity}
                transform={`rotate(${item.rotation}, ${item.x}, ${item.y})`}
              />
            ))}
          </G>
        );
    }
  };

  return (
    <View style={{ width, height, backgroundColor: '#111', overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Rect x="0" y="0" width={width} height={height} fill={elements.bgHsl} />
        {renderContent()}
        {/* Grain overlay */}
        <Rect x="0" y="0" width={width} height={height} fill="#000" opacity={0.15} />
      </Svg>
    </View>
  );
}

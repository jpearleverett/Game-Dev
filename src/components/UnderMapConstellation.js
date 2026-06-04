import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Ellipse } from 'react-native-svg';
import { computeConstellationLayout } from '../utils/underMapLayout';
import { FRAGMENT_KIND } from '../data/underMap';
import { COLORS } from '../constants/colors';

/**
 * The Under-Map as a growing constellation (Move 4, docs §7). Fragments are
 * stars clustered by the chapter they first surfaced in; drawn connections are
 * glowing lines (amber = arc-level truth, dotted grey = an unread/blurred link).
 * Purely additive over the working deduction UI — tapping a star loads it into
 * the connection bench (same as tapping its card), so the list remains a
 * reduced-motion / accessibility fallback.
 */
const KIND_COLOR = {
  [FRAGMENT_KIND.SYMBOL]: COLORS.accentSecondary,
  [FRAGMENT_KIND.PLACE]: COLORS.accentCyan,
  [FRAGMENT_KIND.PERSON]: COLORS.bloodRed,
  [FRAGMENT_KIND.PHENOMENON]: COLORS.accentViolet,
};
const colorFor = (k) => KIND_COLOR[k] || COLORS.accentViolet;

export default function UnderMapConstellation({ map, height = 200, selectedIds = [], onTapNode }) {
  const [width, setWidth] = useState(0);
  const padding = 26;
  const layout = useMemo(
    () => computeConstellationLayout(map, { width, height, padding }),
    [map, width, height],
  );

  const onLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);

  const selected = useMemo(() => new Set(selectedIds.filter(Boolean)), [selectedIds]);

  // Faint concentric "territory" rings, one per chapter present, so the
  // constellation reads as a structured map (a core with chapters fanning out).
  const rings = useMemo(() => {
    if (width <= 0 || !layout.nodes.length) return [];
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const chapters = [...new Set(layout.nodes.map((n) => n.chapter))].sort((a, b) => a - b);
    return chapters.map((c) => {
      const ringBase = Math.min(0.42, 0.12 + (Math.max(1, c) - 1) * 0.045);
      return { c, rx: ringBase * innerW, ry: ringBase * innerH };
    });
  }, [layout.nodes, width, height]);

  return (
    <View onLayout={onLayout} style={[styles.wrap, { height }]}>
      {width > 0 && layout.nodes.length > 0 ? (
        <Svg width={width} height={height}>
          {/* Chapter territory rings (faint) */}
          {rings.map((r) => (
            <Ellipse
              key={`ring_${r.c}`}
              cx={width / 2}
              cy={height / 2}
              rx={r.rx}
              ry={r.ry}
              stroke="rgba(157,150,141,0.16)"
              strokeWidth={1}
              fill="none"
            />
          ))}
          {layout.links.map((l) => (
            <Line
              key={l.id}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={
                l.unresolvedReading
                  ? 'rgba(157,150,141,0.5)'
                  : l.scope === 'arc'
                    ? 'rgba(241,197,114,0.95)'
                    : COLORS.underGlow
              }
              strokeWidth={l.scope === 'arc' ? 2.5 : 1.5}
              strokeDasharray={l.unresolvedReading ? '4,4' : undefined}
            />
          ))}
          {layout.nodes.map((n) => {
            const isSel = selected.has(n.id);
            const r = isSel ? 9 : n.seen > 1 ? 7 : 5;
            return (
              <Circle
                key={n.id}
                cx={n.x}
                cy={n.y}
                r={r}
                fill={colorFor(n.kind)}
                opacity={isSel ? 1 : 0.85}
                stroke={isSel ? COLORS.offWhite : 'rgba(0,0,0,0.45)'}
                strokeWidth={isSel ? 2 : 1}
                onPress={onTapNode ? () => onTapNode(n.id) : undefined}
              />
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
});

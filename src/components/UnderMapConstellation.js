import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
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
  const layout = useMemo(
    () => computeConstellationLayout(map, { width, height, padding: 26 }),
    [map, width, height],
  );

  const onLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
  }, []);

  const selected = useMemo(() => new Set(selectedIds.filter(Boolean)), [selectedIds]);

  return (
    <View onLayout={onLayout} style={[styles.wrap, { height }]}>
      {width > 0 && layout.nodes.length > 0 ? (
        <Svg width={width} height={height}>
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
                    ? 'rgba(241,197,114,0.9)'
                    : 'rgba(196,62,96,0.7)'
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

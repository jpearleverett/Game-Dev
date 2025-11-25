import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import Svg, { 
  G, 
  Line, 
  Circle, 
  Text as SvgText, 
  Path,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { ENDINGS_LIST } from '../data/endingsData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Story tree structure - represents all branching paths
 * Each node has: id, label, children, isEnding, pathKey
 */
const STORY_TREE = {
  id: 'root',
  label: 'Ch.1',
  chapter: 1,
  children: [
    {
      id: 'ch2-a',
      label: 'Ch.2A',
      chapter: 2,
      children: [
        {
          id: 'ch3-aa',
          label: 'Ch.3',
          chapter: 3,
          children: [
            {
              id: 'ch4-aggressive',
              label: 'Ch.4',
              chapter: 4,
              pathType: 'aggressive',
              children: generateAggressiveBranch(),
            },
          ],
        },
        {
          id: 'ch3-ab',
          label: 'Ch.3',
          chapter: 3,
          children: [
            {
              id: 'ch4-methodical',
              label: 'Ch.4',
              chapter: 4,
              pathType: 'methodical',
              children: generateMethodicalBranch(),
            },
          ],
        },
      ],
    },
    {
      id: 'ch2-b',
      label: 'Ch.2B',
      chapter: 2,
      children: [
        {
          id: 'ch3-ba',
          label: 'Ch.3',
          chapter: 3,
          children: [
            {
              id: 'ch4-aggressive-b',
              label: 'Ch.4',
              chapter: 4,
              pathType: 'aggressive',
              children: generateAggressiveBranch('b'),
            },
          ],
        },
        {
          id: 'ch3-bb',
          label: 'Ch.3',
          chapter: 3,
          children: [
            {
              id: 'ch4-methodical-b',
              label: 'Ch.4',
              chapter: 4,
              pathType: 'methodical',
              children: generateMethodicalBranch('b'),
            },
          ],
        },
      ],
    },
  ],
};

// Generate simplified branch representation for aggressive path endings
function generateAggressiveBranch(variant = 'a') {
  return [
    {
      id: `ending-tyrant-${variant}`,
      label: '👑',
      isEnding: true,
      endingId: 'TYRANT',
      pathKey: 'AACP',
    },
    {
      id: `ending-exile-${variant}`,
      label: '🌅',
      isEnding: true,
      endingId: 'EXILE',
      pathKey: 'AAER',
    },
    {
      id: `ending-reformer-a-${variant}`,
      label: '⚖️',
      isEnding: true,
      endingId: 'REFORMER_A',
      pathKey: 'AACS',
    },
    {
      id: `ending-overseer-a-${variant}`,
      label: '🎭',
      isEnding: true,
      endingId: 'OVERSEER_A',
      pathKey: 'APEF',
    },
    {
      id: `ending-ghost-${variant}`,
      label: '👻',
      isEnding: true,
      endingId: 'WANDERING_GHOST',
      pathKey: 'APLR',
    },
    {
      id: `ending-redeemed-${variant}`,
      label: '🕊️',
      isEnding: true,
      endingId: 'REDEEMED',
      pathKey: 'AAE',
    },
    {
      id: `ending-martyr-a-${variant}`,
      label: '✝️',
      isEnding: true,
      endingId: 'MARTYR_A',
      pathKey: 'APE',
    },
    {
      id: `ending-hermit-${variant}`,
      label: '🏔️',
      isEnding: true,
      endingId: 'HERMIT',
      pathKey: 'MAF',
    },
  ];
}

// Generate simplified branch representation for methodical path endings
function generateMethodicalBranch(variant = 'a') {
  return [
    {
      id: `ending-reformer-m-${variant}`,
      label: '⚖️',
      isEnding: true,
      endingId: 'REFORMER_M',
      pathKey: 'MAER',
    },
    {
      id: `ending-overseer-m-${variant}`,
      label: '🎭',
      isEnding: true,
      endingId: 'OVERSEER_M',
      pathKey: 'MAES',
    },
    {
      id: `ending-tyrant-m-${variant}`,
      label: '👑',
      isEnding: true,
      endingId: 'TYRANT_M',
      pathKey: 'MAFP',
    },
    {
      id: `ending-exile-m-${variant}`,
      label: '🌅',
      isEnding: true,
      endingId: 'EXILE_M',
      pathKey: 'MAFS',
    },
    {
      id: `ending-quiet-${variant}`,
      label: '🤫',
      isEnding: true,
      endingId: 'QUIET_MAN',
      pathKey: 'MPJD',
    },
    {
      id: `ending-architect-${variant}`,
      label: '🏛️',
      isEnding: true,
      endingId: 'ARCHITECT',
      pathKey: 'MPJR',
    },
    {
      id: `ending-isolate-${variant}`,
      label: '🏝️',
      isEnding: true,
      endingId: 'ISOLATE',
      pathKey: 'MPLF',
    },
    {
      id: `ending-martyr-m-${variant}`,
      label: '✝️',
      isEnding: true,
      endingId: 'MARTYR_M',
      pathKey: 'MPLJ',
    },
  ];
}

/**
 * Calculate tree layout positions
 */
function calculateTreeLayout(tree, startX, startY, levelHeight, nodeSpacing, discovered = []) {
  const nodes = [];
  const edges = [];
  
  function processNode(node, x, y, parentNode = null, siblingIndex = 0, siblingCount = 1) {
    const isDiscovered = node.isEnding 
      ? discovered.includes(node.endingId)
      : true; // Non-ending nodes are always "discovered" for visualization
    
    const nodeData = {
      ...node,
      x,
      y,
      isDiscovered,
    };
    nodes.push(nodeData);
    
    if (parentNode) {
      edges.push({
        from: parentNode,
        to: nodeData,
        isDiscovered: parentNode.isDiscovered && nodeData.isDiscovered,
        pathType: node.pathType || parentNode.pathType,
      });
    }
    
    if (node.children && node.children.length > 0) {
      const childCount = node.children.length;
      const totalWidth = (childCount - 1) * nodeSpacing;
      const startChildX = x - totalWidth / 2;
      
      node.children.forEach((child, index) => {
        const childX = startChildX + index * nodeSpacing;
        const childY = y + levelHeight;
        processNode(child, childX, childY, nodeData, index, childCount);
      });
    }
  }
  
  processNode(tree, startX, startY);
  
  return { nodes, edges };
}

/**
 * SVG Tree Node Component
 */
function TreeNode({ node, nodeSize, discovered }) {
  const { x, y, label, isEnding, isDiscovered, pathType, endingId } = node;
  
  const fillColor = !isDiscovered
    ? 'rgba(157, 150, 141, 0.2)'
    : isEnding
      ? pathType === 'aggressive' || endingId?.includes('_A') || !endingId?.includes('_M')
        ? COLORS.accentPrimary + '60'
        : COLORS.rainBlue + '60'
      : 'rgba(241, 197, 114, 0.3)';
  
  const strokeColor = !isDiscovered
    ? 'rgba(157, 150, 141, 0.4)'
    : isEnding
      ? pathType === 'aggressive' 
        ? COLORS.accentPrimary
        : COLORS.rainBlue
      : COLORS.amberLight;

  return (
    <G>
      {isEnding ? (
        // Ending nodes are larger circles with emoji
        <G>
          <Circle
            cx={x}
            cy={y}
            r={nodeSize * 0.8}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
          />
          <SvgText
            x={x}
            y={y + 5}
            fontSize={nodeSize * 0.8}
            textAnchor="middle"
            fill={isDiscovered ? '#fff' : 'rgba(157, 150, 141, 0.4)'}
          >
            {isDiscovered ? label : '?'}
          </SvgText>
        </G>
      ) : (
        // Regular chapter nodes
        <G>
          <Circle
            cx={x}
            cy={y}
            r={nodeSize * 0.5}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
          />
          <SvgText
            x={x}
            y={y + 4}
            fontSize={10}
            fontWeight="bold"
            textAnchor="middle"
            fill={COLORS.textPrimary}
          >
            {node.chapter || ''}
          </SvgText>
        </G>
      )}
    </G>
  );
}

/**
 * SVG Tree Edge Component
 */
function TreeEdge({ edge, discovered }) {
  const { from, to, isDiscovered, pathType } = edge;
  
  const strokeColor = !isDiscovered
    ? 'rgba(157, 150, 141, 0.2)'
    : pathType === 'aggressive'
      ? COLORS.accentPrimary + '60'
      : pathType === 'methodical'
        ? COLORS.rainBlue + '60'
        : 'rgba(241, 197, 114, 0.4)';
  
  const strokeDasharray = isDiscovered ? 'none' : '4,4';

  return (
    <Line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={strokeColor}
      strokeWidth={isDiscovered ? 2 : 1}
      strokeDasharray={strokeDasharray}
    />
  );
}

/**
 * PathVisualizationTree Component
 * 
 * Displays a visual branching tree diagram of all story paths
 * with endings as terminal nodes. Discovered paths are highlighted.
 */
export default function PathVisualizationTree({
  discoveredEndingIds = [],
  takenPathKey = null,
  compact = false,
}) {
  const { width, sizeClass } = useResponsiveLayout();
  const isCompact = compact || sizeClass === 'xsmall' || sizeClass === 'small';

  // Tree layout configuration
  const svgWidth = Math.min(width - SPACING.lg * 2, 600);
  const svgHeight = isCompact ? 400 : 500;
  const nodeSize = isCompact ? 16 : 22;
  const levelHeight = isCompact ? 60 : 80;
  const nodeSpacing = isCompact ? 35 : 50;

  // Calculate layout
  const { nodes, edges } = useMemo(() => {
    return calculateTreeLayout(
      STORY_TREE,
      svgWidth / 2,
      nodeSize + 20,
      levelHeight,
      nodeSpacing,
      discoveredEndingIds
    );
  }, [svgWidth, nodeSize, levelHeight, nodeSpacing, discoveredEndingIds]);

  // Stats
  const totalEndings = ENDINGS_LIST.length;
  const discoveredCount = discoveredEndingIds.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Story Path Tree</Text>
        <Text style={styles.subtitle}>
          {discoveredCount}/{totalEndings} Endings Discovered
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Svg width={svgWidth} height={svgHeight}>
          <Defs>
            <LinearGradient id="aggressiveGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.accentPrimary} stopOpacity="0.6" />
              <Stop offset="1" stopColor={COLORS.accentPrimary} stopOpacity="0.2" />
            </LinearGradient>
            <LinearGradient id="methodicalGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={COLORS.rainBlue} stopOpacity="0.6" />
              <Stop offset="1" stopColor={COLORS.rainBlue} stopOpacity="0.2" />
            </LinearGradient>
          </Defs>

          {/* Background labels */}
          <SvgText
            x={svgWidth * 0.25}
            y={svgHeight - 20}
            fontSize={10}
            fill={COLORS.accentPrimary + '60'}
            textAnchor="middle"
          >
            Aggressive Path
          </SvgText>
          <SvgText
            x={svgWidth * 0.75}
            y={svgHeight - 20}
            fontSize={10}
            fill={COLORS.rainBlue + '60'}
            textAnchor="middle"
          >
            Methodical Path
          </SvgText>

          {/* Render edges first (behind nodes) */}
          {edges.map((edge, index) => (
            <TreeEdge
              key={`edge-${index}`}
              edge={edge}
              discovered={discoveredEndingIds}
            />
          ))}

          {/* Render nodes */}
          {nodes.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              nodeSize={nodeSize}
              discovered={discoveredEndingIds}
            />
          ))}
        </Svg>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.amberLight }]} />
          <Text style={styles.legendText}>Chapter</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.accentPrimary }]} />
          <Text style={styles.legendText}>Aggressive</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.rainBlue }]} />
          <Text style={styles.legendText}>Methodical</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotDashed]} />
          <Text style={styles.legendText}>Undiscovered</Text>
        </View>
      </View>

      <Text style={styles.hint}>
        Each branch represents a decision point. Terminal nodes are endings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  header: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendDotDashed: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(157, 150, 141, 0.4)',
    borderStyle: 'dashed',
  },
  legendText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  hint: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: SPACING.lg,
  },
});

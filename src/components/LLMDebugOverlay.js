/**
 * LLMDebugOverlay
 *
 * A real-time debug overlay that shows LLM generation status when verbose mode is enabled.
 * Displays at the top of the screen with scrolling log entries.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from 'react-native';
import { subscribeToLogs, clearLogBuffer, setVerboseMode } from '../utils/llmTrace';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';

const MAX_VISIBLE_LOGS = 50;

export default function LLMDebugOverlay({ visible, onClose }) {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [activeGenerations, setActiveGenerations] = useState(new Map());
  const scrollViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Track active generations for status display
  const updateActiveGenerations = useCallback((entry) => {
    if (entry.type === 'clear') {
      setActiveGenerations(new Map());
      return;
    }

    setActiveGenerations(prev => {
      const next = new Map(prev);
      const key = entry.data?.generationKey || entry.data?.caseNumber || entry.traceId;

      if (entry.event.includes('generation.start') || entry.event.includes('prefetch.branch.start')) {
        next.set(key, {
          status: 'generating',
          startTime: Date.now(),
          caseNumber: entry.data?.caseNumber || entry.data?.nextCaseNumber,
          event: entry.event,
        });
      } else if (entry.event.includes('generation.complete') || entry.event.includes('prefetch.branch.complete')) {
        next.delete(key);
      } else if (entry.event.includes('generation.error') || entry.event.includes('timeout')) {
        next.set(key, {
          status: 'error',
          error: entry.data?.error || 'Failed',
          caseNumber: entry.data?.caseNumber,
        });
        // Auto-remove errors after 5s
        setTimeout(() => {
          setActiveGenerations(current => {
            const updated = new Map(current);
            updated.delete(key);
            return updated;
          });
        }, 5000);
      } else if (entry.event.includes('llm.request') || entry.event.includes('llm.proxy')) {
        if (entry.event.includes('start')) {
          next.set(`llm_${entry.traceId}`, {
            status: 'llm_request',
            startTime: Date.now(),
            model: entry.data?.model,
          });
        } else if (entry.event.includes('complete') || entry.event.includes('success')) {
          next.delete(`llm_${entry.traceId}`);
        }
      }

      return next;
    });
  }, []);

  // Subscribe to log events
  useEffect(() => {
    if (!visible) return;

    setVerboseMode(true);

    const unsubscribe = subscribeToLogs((entry) => {
      if (entry.type === 'clear') {
        setLogs([]);
        updateActiveGenerations(entry);
        return;
      }

      setLogs(prev => {
        const next = [...prev, entry];
        // Keep only recent logs
        while (next.length > MAX_VISIBLE_LOGS) {
          next.shift();
        }
        return next;
      });

      updateActiveGenerations(entry);
    });

    return () => {
      unsubscribe();
      setVerboseMode(false);
    };
  }, [visible, updateActiveGenerations]);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (expanded && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [logs, expanded]);

  // Animate expansion
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded, slideAnim]);

  if (!visible) return null;

  const expandedHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 300],
  });

  // Get current status summary
  const getStatusSummary = () => {
    const active = Array.from(activeGenerations.values());
    const generating = active.filter(g => g.status === 'generating' || g.status === 'llm_request');
    const errors = active.filter(g => g.status === 'error');

    if (errors.length > 0) {
      return { text: `ERROR: ${errors[0].error}`, color: COLORS.failure };
    }
    if (generating.length > 0) {
      const gen = generating[0];
      const elapsed = Math.round((Date.now() - gen.startTime) / 1000);
      if (gen.status === 'llm_request') {
        return { text: `LLM request... ${elapsed}s`, color: COLORS.accentSecondary };
      }
      return { text: `Generating ${gen.caseNumber || ''}... ${elapsed}s`, color: COLORS.accentPrimary };
    }
    if (logs.length === 0) {
      return { text: 'Waiting for LLM activity...', color: COLORS.textSecondary };
    }
    return { text: 'Idle', color: COLORS.success };
  };

  const status = getStatusSummary();
  const lastLog = logs[logs.length - 1];

  return (
    <Animated.View style={[styles.container, { height: expandedHeight }]}>
      {/* Header bar - always visible */}
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={styles.statusText} numberOfLines={1}>
            {status.text}
          </Text>
          <Text style={styles.logCount}>{logs.length} logs</Text>
          <Text style={styles.expandIcon}>{expanded ? '▼' : '▲'}</Text>
        </View>
        {!expanded && lastLog && (
          <Text style={styles.lastLogPreview} numberOfLines={1}>
            {lastLog.summary}
          </Text>
        )}
      </Pressable>

      {/* Expanded log view */}
      {expanded && (
        <View style={styles.logContainer}>
          <View style={styles.toolbar}>
            <Pressable style={styles.toolButton} onPress={() => { clearLogBuffer(); setLogs([]); }}>
              <Text style={styles.toolButtonText}>Clear</Text>
            </Pressable>
            <Pressable style={styles.toolButton} onPress={onClose}>
              <Text style={styles.toolButtonText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No LLM activity yet. Play the game to see generation logs.</Text>
            ) : (
              logs.map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
              ))
            )}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

function LogEntry({ entry }) {
  const levelColor = {
    error: COLORS.failure,
    warn: COLORS.warning || '#FFA500',
    info: COLORS.textPrimary,
    debug: COLORS.textSecondary,
  }[entry.level] || COLORS.textSecondary;

  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <View style={styles.logEntry}>
      <Text style={styles.logTime}>{time}</Text>
      <Text style={[styles.logSummary, { color: levelColor }]} numberOfLines={2}>
        {entry.summary}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 12, 18, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accentPrimary,
    zIndex: 9999,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 60,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.small,
    color: COLORS.textPrimary,
  },
  logCount: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.tiny,
    color: COLORS.textSecondary,
  },
  expandIcon: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  lastLogPreview: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.tiny,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  logContainer: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 4,
    gap: 12,
  },
  toolButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toolButtonText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.tiny,
    color: COLORS.accentPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  emptyText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.small,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  logEntry: {
    flexDirection: 'row',
    paddingVertical: 3,
    gap: 8,
  },
  logTime: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.tiny,
    color: COLORS.textSecondary,
    width: 60,
  },
  logSummary: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.tiny,
  },
});

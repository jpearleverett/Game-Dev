import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import PrimaryButton from './PrimaryButton';
import * as Updates from 'expo-updates';
import { recordError } from '../services/ErrorReporting';
import { clearStoredProgress } from '../storage/progressStorage';
import { clearGeneratedStory } from '../storage/generatedStoryStorage';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Persist for post-hoc diagnosis (see src/services/ErrorReporting.js).
    recordError(error, { fatal: true, source: 'error-boundary' });
  }

  handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      // Fallback if Updates is not available (e.g. in dev client sometimes)
      this.setState({ hasError: false, error: null });
    }
  };

  // A reload was the ONLY recovery, so any crash originating in the persisted
  // save became an unbreakable loop: reload, rehydrate the same bad state,
  // crash, with no way out but deleting the app. This is the escape hatch.
  handleResetCaseFiles = () => {
    Alert.alert(
      'Reset Case Files',
      'This erases your saved progress and every generated chapter, then restarts. '
      + 'Use it only if reloading keeps landing here.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase and restart',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearStoredProgress();
            } catch (e) {
              console.warn('[ErrorBoundary] Failed to clear progress:', e?.message || e);
            }
            try {
              await clearGeneratedStory();
            } catch (e) {
              console.warn('[ErrorBoundary] Failed to clear generated story:', e?.message || e);
            }
            this.handleRestart();
          },
        },
      ],
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>CASE FILE CORRUPTED</Text>
            <Text style={styles.message}>
              The investigation hit a dead end. We need to reset the board.
            </Text>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error?.toString()}
              </Text>
            </View>
            <PrimaryButton 
              label="RELOAD SYSTEM" 
              onPress={this.handleRestart} 
            />
            <Pressable onPress={this.handleResetCaseFiles} style={styles.resetLink}>
              <Text style={styles.resetLinkText}>Still landing here? Reset case files</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  resetLink: { marginTop: 18, paddingVertical: 8, paddingHorizontal: 12 },
  resetLinkText: { color: COLORS.textSecondary, fontSize: 13, textDecorationLine: 'underline', textAlign: 'center' },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.accentPrimary,
    marginBottom: 16,
    letterSpacing: 2,
    textAlign: 'center',
  },
  message: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    width: '100%',
  },
  errorText: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES } from '../constants/typography';
import PrimaryButton from './PrimaryButton';
import * as Updates from 'expo-updates';

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
    // In a real app, you would log this to your analytics service
    // analytics.logError(error);
  }

  handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      // Fallback if Updates is not available (e.g. in dev client sometimes)
      this.setState({ hasError: false, error: null });
    }
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
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
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

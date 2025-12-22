import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import ScreenSurface from '../components/ScreenSurface';
import SecondaryButton from '../components/SecondaryButton';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

export default function SettingsScreen({
  settings,
  premiumUnlocked,
  onUpdateSettings,
  onResetProgress,
  onReplayTutorial,
  onPurchasePremium,
  onRestorePremium,
  onBack,
  // LLM Configuration props (auto-configured via environment)
  llmConfigured = false,
}) {
    const handleVolumeChange = (key) => (rawValue) => {
      const normalized = formatVolumeValue(rawValue);
      const currentValue = typeof settings?.[key] === 'number' ? settings[key] : 0;
      if (Math.abs(normalized - currentValue) < 0.001) {
        return;
      }
      onUpdateSettings?.({ [key]: normalized });
    };

  const handleToggle = (key) => () => {
    onUpdateSettings?.({ [key]: !settings[key] });
  };

  return (
    <ScreenSurface variant="default" accentColor={COLORS.accentPrimary} contentStyle={styles.surface}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.container}>
            <SecondaryButton label="Back" arrow onPress={onBack} />
            <Text style={styles.title}>Settings</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Audio</Text>
              <SettingStepper
                label="Sound Effects"
                value={settings.sfxVolume}
                onValueChange={handleVolumeChange('sfxVolume')}
              />
              <SettingStepper
                label="Music"
                value={settings.musicVolume}
                onValueChange={handleVolumeChange('musicVolume')}
              />
              <SettingStepper
                label="Rain Ambience"
                value={settings.ambienceVolume}
                onValueChange={handleVolumeChange('ambienceVolume')}
              />
            </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gameplay</Text>
            <SettingToggle
              label="Hints Enabled"
              value={settings.hintsEnabled}
              onToggle={handleToggle('hintsEnabled')}
              disabled={!premiumUnlocked}
            />
            <SecondaryButton label="Replay Tutorial" onPress={onReplayTutorial} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accessibility</Text>
            <SettingToggle
              label="Reduced Motion"
              value={settings.reducedMotion}
              onToggle={handleToggle('reducedMotion')}
            />
            <SettingToggle
              label="Colorblind Mode"
              value={settings.colorBlindMode}
              onToggle={handleToggle('colorBlindMode')}
            />
            <SettingToggle
              label="High Contrast"
              value={settings.highContrast}
              onToggle={handleToggle('highContrast')}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium</Text>
            <Text style={styles.metaText}>
              {premiumUnlocked
                ? 'Archive Key active. Seasons 2 and 3 will unlock automatically when released.'
                : 'Unlock the Archive Key to access past seasons and premium cases.'}
            </Text>
            {premiumUnlocked ? (
              <PrimaryButton label="Premium Active" disabled arrow={false} />
            ) : (
              <PrimaryButton label="Purchase Archive Key ($6.99)" onPress={onPurchasePremium} />
            )}
            <SecondaryButton label="Restore Purchase" onPress={onRestorePremium} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Story Generation</Text>
            <Text style={styles.metaText}>
              {llmConfigured
                ? 'Gemini 3 Flash is configured and ready to generate dynamic story content for chapters 2-12.'
                : 'AI story generation is not configured. Please check your build configuration.'}
            </Text>
            <View style={[styles.llmStatus, !llmConfigured && styles.llmStatusError]}>
              <Text style={[styles.llmStatusText, !llmConfigured && styles.llmStatusTextError]}>
                {llmConfigured ? 'Gemini 3 Flash Ready' : 'Not Configured'}
              </Text>
            </View>
            <SettingToggle
              label="Verbose Mode"
              value={settings.verboseMode}
              onToggle={handleToggle('verboseMode')}
            />
            <Text style={styles.metaText}>
              {settings.verboseMode
                ? 'Debug overlay active. Shows real-time LLM generation status.'
                : 'Enable to see detailed LLM generation logs.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data</Text>
            <PrimaryButton label="Reset Progress" onPress={onResetProgress} icon="🗑️" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.metaText}>Dead Letters v1.0.0</Text>
            <Text style={styles.metaText}>Built for iOS, Android, and web via Expo.</Text>
            <Text style={styles.metaText}>Support: support@deadletters.app</Text>
          </View>
        </View>
      </ScrollView>
    </ScreenSurface>
  );
}

function clampToUnitInterval(raw) {
  const candidate =
    raw && typeof raw === 'object' && 'nativeEvent' in raw && typeof raw.nativeEvent?.value === 'number'
      ? raw.nativeEvent.value
      : raw;
  const numeric = typeof candidate === 'number' ? candidate : Number(candidate);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric <= 0) {
    return 0;
  }
  if (numeric >= 1) {
    return 1;
  }
  return numeric;
}

function formatVolumeValue(raw) {
  const clamped = clampToUnitInterval(raw);
  return Number(clamped.toFixed(2));
}

const VOLUME_STEP = 0.05;

function SettingStepper({ label, value, onValueChange }) {
  const [internalValue, setInternalValue] = useState(() => clampToUnitInterval(value));

  useEffect(() => {
    const clamped = clampToUnitInterval(value);
    setInternalValue((previous) => (Math.abs(previous - clamped) < 0.0005 ? previous : clamped));
  }, [value]);

  const applyDelta = (delta) => {
    setInternalValue((previous) => {
      const next = formatVolumeValue(previous + delta);
      if (Math.abs(next - previous) < 0.0005) {
        return previous;
      }
      onValueChange?.(next);
      return next;
    });
  };

  const handleDecrease = () => applyDelta(-VOLUME_STEP);
  const handleIncrease = () => applyDelta(VOLUME_STEP);

  const isAtMinimum = internalValue <= 0.001;
  const isAtMaximum = internalValue >= 0.999;

  return (
    <View style={styles.controlRow}>
      <Text style={styles.controlLabel}>{label}</Text>
      <View style={styles.stepper}>
        <AdjustButton
          label="−"
          onPress={handleDecrease}
          disabled={isAtMinimum}
          accessibilityLabel={`Decrease ${label}`}
          position="left"
        />
        <View style={styles.stepperValueContainer}>
          <Text style={styles.stepperValue}>{Math.round(internalValue * 100)}%</Text>
        </View>
        <AdjustButton
          label="+"
          onPress={handleIncrease}
          disabled={isAtMaximum}
          accessibilityLabel={`Increase ${label}`}
          position="right"
        />
      </View>
    </View>
  );
}

function AdjustButton({ label, onPress, disabled, accessibilityLabel, position }) {
  const handlePress = () => {
    if (disabled) {
      return;
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.adjustButton,
        position === 'left' && styles.adjustButtonLeft,
        position === 'right' && styles.adjustButtonRight,
        pressed && !disabled && styles.adjustButtonPressed,
        disabled && styles.adjustButtonDisabled,
      ]}
    >
      <Text style={[styles.adjustLabel, disabled && styles.adjustLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

function SettingToggle({ label, value, onToggle, disabled = false }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      {disabled ? (
        <Text style={styles.toggleDisabled}>Locked</Text>
      ) : (
        <SecondaryButton label={value ? 'On' : 'Off'} onPress={onToggle} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    paddingHorizontal: SPACING.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  container: {
    flexGrow: 1,
    gap: SPACING.xl,
  },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.display,
    color: COLORS.textPrimary,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  section: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  controlLabel: {
    flexBasis: 120,
    flexShrink: 1,
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.panelOutline,
    overflow: 'hidden',
    backgroundColor: 'rgba(21, 24, 32, 0.82)',
  },
  stepperValueContainer: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(246, 236, 219, 0.1)',
    minWidth: 72,
  },
  stepperValue: {
    fontFamily: FONTS.primarySemiBold,
    fontSize: FONT_SIZES.sm,
    color: COLORS.accentSecondary,
    letterSpacing: 1.4,
  },
  adjustButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  adjustButtonLeft: {
    borderTopLeftRadius: RADIUS.md,
    borderBottomLeftRadius: RADIUS.md,
  },
  adjustButtonRight: {
    borderTopRightRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
  },
  adjustButtonPressed: {
    backgroundColor: 'rgba(30, 33, 42, 0.9)',
  },
  adjustButtonDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.45,
  },
  adjustLabel: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  adjustLabelDisabled: {
    color: COLORS.textMuted,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  toggleDisabled: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metaText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: LINE_HEIGHTS.relaxed,
  },
  // LLM Configuration Styles
  llmStatus: {
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.5)',
    alignItems: 'center',
  },
  llmStatusError: {
    backgroundColor: 'rgba(181, 28, 28, 0.2)',
    borderColor: 'rgba(181, 28, 28, 0.5)',
  },
  llmStatusText: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.md,
    color: '#4CAF50',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  llmStatusTextError: {
    color: '#ef5350',
  },
});

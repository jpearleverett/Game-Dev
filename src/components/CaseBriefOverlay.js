import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FONTS, FONT_SIZES } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import PrimaryButton from './PrimaryButton';

export default function CaseBriefOverlay({
  visible,
  caseData,
  onDismiss,
  reducedMotion = false,
}) {
  const [shouldRender, setShouldRender] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(visible ? 0 : 20)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: reducedMotion ? 0 : 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: reducedMotion ? 0 : 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: reducedMotion ? 0 : 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: reducedMotion ? 0 : 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShouldRender(false));
    }
  }, [visible, reducedMotion]);

  const { moderateScale, scaleSpacing } = useResponsiveLayout();

  const content = useMemo(() => {
    if (!caseData) return null;
    
    // Recap logic
    const recapText = caseData.dailyIntro || '';
    const cleanRecap = recapText
        .replace(/PREVIOUSLY:/i, '')
        .trim()
        .split('\n')
        .slice(0, 3) // Keep it short
        .join('\n');

    // Objectives
    const objectives = caseData.briefing?.objectives || [];
    const summary = caseData.briefing?.summary || 'Review the evidence board. Identify the outliers.';

    return {
      caseNumber: caseData.caseNumber || '---',
      title: caseData.title || 'Classified',
      recap: cleanRecap,
      summary,
      objectives,
    };
  }, [caseData]);

  if (!shouldRender || !content) return null;

  return (
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      
      <Animated.View 
        style={[
          styles.container, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}
      >
        <View style={styles.paperSheet}>
          {/* Decorative Tape/Stamp */}
          <View style={styles.stampContainer}>
            <Text style={styles.stampText}>CONFIDENTIAL</Text>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.paperContent}
          >
            {/* Header */}
            <View style={styles.headerBlock}>
              <Text style={styles.label}>CASE FILE:</Text>
              <Text style={styles.headerTitle}>{content.caseNumber} — {content.title.toUpperCase()}</Text>
            </View>

            <View style={styles.divider} />

            {/* Recap (Optional) */}
            {content.recap ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PRIOR EVENTS</Text>
                <Text style={styles.bodyText}>{content.recap}</Text>
              </View>
            ) : null}

            {/* Mission Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CURRENT OBJECTIVE</Text>
              <Text style={styles.bodyTextHighlight}>{content.summary}</Text>
            </View>

            {/* Directives List */}
            {content.objectives.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DIRECTIVES</Text>
                {content.objectives.map((obj, index) => (
                  <View key={index} style={styles.objectiveRow}>
                    <Text style={styles.objectiveBullet}>{index + 1}.</Text>
                    <Text style={styles.objectiveText}>{obj}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer Signature */}
            <View style={styles.footerSection}>
              <Text style={styles.signatureLabel}>APPROVED FOR INVESTIGATION</Text>
              <Text style={styles.signature}>Jack Halloway</Text>
            </View>
          </ScrollView>

          {/* Action Button */}
          <View style={styles.actionContainer}>
            <PrimaryButton 
              label="ACCEPT ASSIGNMENT" 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDismiss();
              }} 
              fullWidth
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 5, 2, 0.85)',
  },
  container: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  paperSheet: {
    backgroundColor: '#F4F1EA', // Cream paper color
    borderRadius: 2,
    overflow: 'hidden',
    flex: 1,
  },
  paperContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl * 2,
  },
  stampContainer: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    borderWidth: 2,
    borderColor: '#C0392B', // Stamp Red
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.8,
    zIndex: 10,
  },
  stampText: {
    fontFamily: FONTS.monoBold,
    color: '#C0392B',
    fontSize: FONT_SIZES.xs,
    letterSpacing: 2,
  },
  headerBlock: {
    marginBottom: SPACING.md,
  },
  label: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.xs,
    color: '#888',
    marginBottom: 4,
    letterSpacing: 1,
  },
  headerTitle: {
    fontFamily: FONTS.monoBold, // Typewriter style header
    fontSize: FONT_SIZES.lg,
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#D3CFC6',
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontFamily: FONTS.monoBold,
    fontSize: FONT_SIZES.xs,
    color: '#555',
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E0DDD5',
    paddingBottom: 4,
    alignSelf: 'flex-start',
  },
  bodyText: {
    fontFamily: FONTS.primary, // Serif/Playfair
    fontSize: FONT_SIZES.md,
    color: '#333',
    lineHeight: 24,
  },
  bodyTextHighlight: {
    fontFamily: FONTS.primaryMedium,
    fontSize: FONT_SIZES.md + 1,
    color: '#111',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  objectiveRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'flex-start',
  },
  objectiveBullet: {
    fontFamily: FONTS.mono,
    fontSize: FONT_SIZES.md,
    color: '#555',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  objectiveText: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: '#222',
    flex: 1,
    lineHeight: 22,
  },
  footerSection: {
    marginTop: SPACING.lg,
    alignItems: 'flex-end',
    opacity: 0.7,
  },
  signatureLabel: {
    fontFamily: FONTS.mono,
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  signature: {
    fontFamily: FONTS.handwriting || FONTS.secondary, // Fallback if handwriting not loaded
    fontSize: 24,
    color: '#000080', // Blue ink
    transform: [{ rotate: '-5deg' }],
  },
  actionContainer: {
    padding: SPACING.lg,
    backgroundColor: '#F4F1EA',
    borderTopWidth: 1,
    borderTopColor: '#E5E0D6',
  },
});

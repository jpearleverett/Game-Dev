import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenSurface from '../components/ScreenSurface';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING } from '../constants/layout';

const MESSAGE = [
  "You don't remember me, Detective? That's okay. I remember you.",
  "Let's play a game. I'll send you cases from your past.",
  "Cases you solved... and one you didn't.",
  "Let's start with your first case.",
];

const TYPE_DELAY = 28;
const PARAGRAPH_DELAY = 260;

export default function PrologueScreen({ onBegin, reducedMotion = false }) {
  const timersRef = useRef([]);
  const [displayedParagraphs, setDisplayedParagraphs] = useState(() => (reducedMotion ? MESSAGE : MESSAGE.map(() => '')));

  useEffect(() => {
    setDisplayedParagraphs(reducedMotion ? MESSAGE : MESSAGE.map(() => ''));
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    let paragraphIndex = 0;
    let charIndex = 0;

    const schedule = (cb, delay) => {
      const id = setTimeout(cb, delay);
      timersRef.current.push(id);
    };

    const typeNext = () => {
      if (paragraphIndex >= MESSAGE.length) {
        return;
      }

      const target = MESSAGE[paragraphIndex];
      const nextSlice = target.slice(0, charIndex + 1);
      setDisplayedParagraphs((prev) => prev.map((paragraph, idx) => (idx === paragraphIndex ? nextSlice : prev[idx])));

      charIndex += 1;

      if (charIndex <= target.length) {
        schedule(typeNext, TYPE_DELAY);
      }

      if (charIndex > target.length) {
        paragraphIndex += 1;
        charIndex = 0;
        if (paragraphIndex < MESSAGE.length) {
          schedule(typeNext, PARAGRAPH_DELAY);
        }
      }
    };

    schedule(typeNext, 400);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [reducedMotion]);

  const paragraphs = useMemo(() => displayedParagraphs, [displayedParagraphs]);

  return (
    <ScreenSurface variant="default">
      <View style={styles.header}>
        <View style={styles.headerRow}>
            <MaterialCommunityIcons name="email-alert-outline" size={24} color={COLORS.cigaretteSmoke} />
            <Text style={styles.envelope}>NEW MESSAGE</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.meta}>From: Unknown</Text>
        <Text style={styles.meta}>Subject: Remember?</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton 
            label="Begin Investigation" 
            onPress={onBegin} 
            icon={<MaterialCommunityIcons name="arrow-right" size={20} color={COLORS.textSecondary} />} 
        />
      </View>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  envelope: {
    fontFamily: FONTS.primaryBold,
    fontSize: FONT_SIZES.lg,
    color: COLORS.cigaretteSmoke,
    letterSpacing: 3,
  },
  divider: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    height: 1,
    backgroundColor: COLORS.fogGray,
  },
  meta: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.sm,
    letterSpacing: 2,
    color: COLORS.fogGrayLight,
  },
  body: {
    flexGrow: 1,
    paddingVertical: SPACING.lg,
  },
  paragraph: {
    fontFamily: FONTS.secondary,
    fontSize: FONT_SIZES.md,
    lineHeight: LINE_HEIGHTS.relaxed,
    color: COLORS.offWhite,
    marginBottom: SPACING.md,
  },
  footer: {
    marginTop: SPACING.lg,
  },
});

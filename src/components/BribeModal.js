import React, { useEffect, useRef } from 'react';
import { Modal, StyleSheet, Text, View, Image, Animated, Pressable } from 'react-native';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';
import { COLORS } from '../constants/colors';
import { FONTS, FONT_SIZES, LINE_HEIGHTS } from '../constants/typography';
import { SPACING, RADIUS } from '../constants/layout';

const SUSPECT_IMAGE = require('../../assets/images/characters/portraits/default.png'); // Fallback

export default function BribeModal({ visible, onClose, onBribe }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContainer}>
            <View style={styles.imageContainer}>
                <Image 
                    source={SUSPECT_IMAGE} 
                    style={styles.suspectImage} 
                    blurRadius={10} 
                />
                <View style={styles.scrim} />
            </View>
            
            <View style={styles.content}>
                <Text style={styles.title}>CLERK IS CLOSING UP</Text>
                <Text style={styles.body}>
                    "Shift's over, detective. Come back tomorrow... or slide me a dollar and I might leave the file out."
                </Text>
                
                <View style={styles.actions}>
                    <PrimaryButton 
                        label="Slide a Dollar ($0.99)" 
                        onPress={onBribe}
                        icon="💵"
                        fullWidth 
                    />
                    <SecondaryButton 
                        label="Come Back Tomorrow" 
                        onPress={onClose}
                        fullWidth 
                    />
                </View>
            </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1614',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#5a3c26',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  imageContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  suspectImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.8,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 22, 20, 0.4)',
    // gradient could be better here
  },
  content: {
    padding: SPACING.xl,
    gap: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    fontFamily: FONTS.secondaryBold,
    fontSize: FONT_SIZES.xl,
    color: COLORS.offWhite,
    letterSpacing: 2,
    textAlign: 'center',
  },
  body: {
    fontFamily: FONTS.primary,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    lineHeight: LINE_HEIGHTS.relaxed,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    gap: SPACING.md,
  }
});

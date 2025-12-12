import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { FONTS, FONT_SIZES } from '../../constants/typography';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function InteractivePolaroid({ 
  entry, 
  size, 
  onLayoutEntry, 
  onOpen,
  onClose 
}) {
  const [expanded, setExpanded] = useState(false);
  const [flipped, setFlipped] = useState(false);
  
  // Animation values - lazy initialization to prevent object creation on every render
  const expandAnim = useState(() => new Animated.Value(0))[0];
  const flipAnim = useState(() => new Animated.Value(0))[0];
  
  const polaroidWidth = size;
  const polaroidHeight = size * 1.18;

  // Styles for animations
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });
  
  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  const tapeAngle = useRef(Math.random() * 6 - 3).current; // Random tape angle +/- 3deg
  const paperTexture = useRef(Math.random() > 0.5 ? 'coarse' : 'fine').current;

  const handlePress = () => {
    if (expanded) return; 
    setExpanded(true);
    onOpen?.();
    Haptics.selectionAsync();
    
    Animated.spring(expandAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 40
    }).start();
  };

  const handleClose = () => {
    // Flip back first if flipped
    if (flipped) {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setFlipped(false));
    }

    Animated.timing(expandAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setExpanded(false);
      onClose?.();
    });
  };

  const handleFlip = () => {
    if (!expanded) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = flipped ? 0 : 180;
    
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start(() => setFlipped(!flipped));
  };

  return (
    <>
      <View
        onLayout={onLayoutEntry ? ({ nativeEvent: { layout } }) => onLayoutEntry(entry.id)(layout) : undefined}
        style={[styles.wrapper, entry.style, { width: polaroidWidth, height: polaroidHeight }]}
      >
        <Pressable onPress={handlePress} style={{ flex: 1 }}>
          <View style={[styles.polaroid, { transform: [{ rotate: `${entry.rotation}deg` }] }]}>
            <View style={[styles.tapeTop, { transform: [{ rotate: `${tapeAngle}deg` }] }]} />
            <View style={styles.imageWrapper}>
              <Image 
                source={entry.image} 
                style={styles.image} 
                contentFit="cover"
                transition={200}
              />
              {/* Gloss Sheen Overlay */}
              <View style={styles.glossOverlay} />
            </View>
            <Text style={[styles.label, { fontSize: size * 0.075 }]} numberOfLines={2}>
              {entry.label}
            </Text>
          </View>
        </Pressable>
      </View>
      
      <Modal transparent visible={expanded} onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          
          <Animated.View style={[styles.modalContent, {
            transform: [{ scale: expandAnim }]
          }]}>
            <Pressable onPress={handleFlip} style={styles.modalCardContainer}>
              {/* Front Face */}
              <Animated.View style={[styles.modalCard, styles.modalCardFront, { 
                transform: [{ rotateY: frontInterpolate }],
                opacity: frontOpacity
              }]}>
                <View style={styles.tapeTopModal} />
                <View style={styles.imageWrapperModal}>
                  <Image 
                    source={entry.image} 
                    style={styles.imageModal} 
                    contentFit="cover"
                    transition={200}
                  />
                </View>
                <Text style={styles.labelModal}>{entry.label}</Text>
                <Text style={styles.hintText}>Tap to Flip</Text>
              </Animated.View>

              {/* Back Face */}
              <Animated.View style={[styles.modalCard, styles.modalCardBack, { 
                transform: [{ rotateY: backInterpolate }],
                opacity: backOpacity
              }]}>
                <Text style={styles.backTitle}>ARCHIVE NOTES</Text>
                <View style={styles.divider} />
                <Text style={styles.backText}>{entry.detail || "No additional intel available."}</Text>
                <Text style={styles.hintText}>Tap to Return</Text>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 30,
    elevation: 30,
  },
  polaroid: {
    flex: 1,
    backgroundColor: '#f4f1ea', // Slightly warmer/aged paper
    borderRadius: 2, // Sharper corners for realism
    padding: 6,
    justifyContent: 'flex-start',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 5,
    shadowOffset: { width: 1, height: 3 },
    elevation: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tapeTop: {
    position: 'absolute',
    top: -10,
    left: '28%',
    right: '28%',
    height: 18,
    backgroundColor: 'rgba(240, 230, 190, 0.6)', // More translucent
    borderRadius: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 10,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0a0a0a',
    marginBottom: 8,
    overflow: 'hidden',
  },
  glossOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  image: {
    width: '100%',
    height: '100%',
    opacity: 0.95, // Slight fade for age
  },
  label: {
    fontFamily: 'CourierPrime_700Bold', // Handwriting feel if possible, otherwise Bold Mono
    color: '#2a1a0a',
    textAlign: 'center',
    lineHeight: 14,
    opacity: 0.85,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCardContainer: {
    width: '100%',
    height: '100%',
  },
  modalCard: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#fef9f0',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  modalCardFront: {
    justifyContent: 'flex-start',
  },
  modalCardBack: {
    justifyContent: 'center',
    backgroundColor: '#f0e6d2',
    borderWidth: 10,
    borderColor: '#fef9f0',
  },
  tapeTopModal: {
    position: 'absolute',
    top: -25,
    width: 120,
    height: 40,
    backgroundColor: 'rgba(250, 236, 180, 0.9)',
    transform: [{ rotate: '-3deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  imageWrapperModal: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imageModal: {
    width: '100%',
    height: '100%',
  },
  labelModal: {
    fontFamily: FONTS.monoBold,
    fontSize: 28,
    color: '#2a1a0a',
    textAlign: 'center',
    marginBottom: 10,
  },
  hintText: {
    position: 'absolute',
    bottom: 15,
    fontFamily: FONTS.primary,
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  backTitle: {
    fontFamily: FONTS.secondaryBold,
    fontSize: 24,
    color: '#3c2414',
    marginBottom: 10,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#3c2414',
    marginBottom: 20,
    opacity: 0.3,
  },
  backText: {
    fontFamily: FONTS.mono,
    fontSize: 16,
    color: '#4a3b2a',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '90%',
  },
});

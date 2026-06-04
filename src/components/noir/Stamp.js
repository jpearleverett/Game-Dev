import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { FONTS } from '../../constants/typography';

/**
 * Stamp — an angled "rubber-stamp / redaction" label (Inkbleed Noir / Persona-5
 * editorial energy). Use for status, CLASSIFIED, EVIDENCE, etc. Deliberately
 * tilted and heavy to break the flat web-card grid.
 */
export default function Stamp({
  label,
  color = COLORS.bloodRed,
  angle = -7,
  size = 12,
  filled = true,
  style,
}) {
  return (
    <View
      style={[
        styles.stamp,
        {
          borderColor: color,
          backgroundColor: filled ? `${color}1f` : 'transparent',
          transform: [{ rotate: `${angle}deg` }],
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color, fontSize: size, letterSpacing: size * 0.18 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontFamily: FONTS.monoBold,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
});

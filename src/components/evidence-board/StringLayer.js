import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

function StringLayer({
  connectors,
  stringThickness,
  reducedMotion,
  activeConnectionCount,
  stringOpacityActive,
  stringOpacityIdle,
}) {
  if (!connectors || !connectors.length) return null;

  const containerOpacity = reducedMotion
    ? 0.32
    : activeConnectionCount > 0
    ? stringOpacityActive
    : stringOpacityIdle;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.stringLayer,
        { opacity: containerOpacity },
      ]}
    >
      {connectors.map((connector) => {
        const dx = connector.to.x - connector.from.x;
        const dy = connector.to.y - connector.from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (!length || length === 0) {
          return null;
        }
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const centerX = (connector.from.x + connector.to.x) / 2;
        const centerY = (connector.from.y + connector.to.y) / 2;
        const toneStyle =
          connector.tone === "active"
            ? styles.stringLineActive
            : connector.tone === "confirmed"
            ? styles.stringLineConfirmed
            : styles.stringLineDecor;
        
        return (
          <View
            key={connector.id}
            style={[
              styles.stringLineBase,
              toneStyle,
              {
                width: length,
                left: centerX - length / 2,
                top: centerY - stringThickness / 2,
                transform: [{ rotate: `${angle}deg` }],
                height: stringThickness,
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stringLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  stringLineBase: {
    position: "absolute",
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  stringLineActive: {
    backgroundColor: "rgba(204, 36, 52, 0.9)",
    },
  stringLineConfirmed: {
    backgroundColor: "rgba(241, 182, 88, 0.9)",
  },
  stringLineDecor: {
    backgroundColor: "rgba(188, 62, 96, 0.6)",
  },
});

export default React.memo(StringLayer);

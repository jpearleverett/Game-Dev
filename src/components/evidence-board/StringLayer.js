import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Line } from 'react-native-svg';

const AnimatedLine = Animated.createAnimatedComponent(Line);

const StringLine = React.memo(({ connector, thickness, delay = 0 }) => {
  const length = Math.sqrt(
    Math.pow(connector.to.x - connector.from.x, 2) + 
    Math.pow(connector.to.y - connector.from.y, 2)
  );
  
  // Lazy initialization to avoid creating Animated.Value on every render
  const animatedValue = React.useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    const animation = Animated.timing(animatedValue, {
      toValue: 0,
      duration: 600,
      delay,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    
    animation.start();
    return () => animation.stop();
  }, [delay]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, length]
  });
  
  let color = "rgba(188, 62, 96, 0.6)";
  if (connector.tone === "active") color = "rgba(204, 36, 52, 0.9)";
  else if (connector.tone === "confirmed") color = "rgba(241, 182, 88, 0.9)";

  return (
    <AnimatedLine
      x1={connector.from.x}
      y1={connector.from.y}
      x2={connector.to.x}
      y2={connector.to.y}
      stroke={color}
      strokeWidth={thickness}
      strokeDasharray={[length, length]}
      strokeDashoffset={strokeDashoffset}
      strokeLinecap="round"
    />
  );
});

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
      <Svg style={StyleSheet.absoluteFill}>
        {connectors.map((connector, index) => (
           <StringLine
             key={connector.id}
             connector={connector}
             thickness={stringThickness}
             delay={index * 30}
           />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stringLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
});

export default React.memo(StringLayer);

import React, { useEffect } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Line, Circle, G } from 'react-native-svg';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const StringLine = React.memo(({ connector, thickness, delay = 0 }) => {
  const length = Math.sqrt(
    Math.pow(connector.to.x - connector.from.x, 2) + 
    Math.pow(connector.to.y - connector.from.y, 2)
  );
  
  const animatedValue = React.useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    const animation = Animated.timing(animatedValue, {
      toValue: 0,
      duration: 800, // Slower, more deliberate draw
      delay,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    
    animation.start();
    return () => animation.stop();
  }, []);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, length]
  });
  
  // Dynamic colors based on tone
  let mainColor = "rgba(180, 50, 80, 0.85)"; // Deep red default
  let shadowColor = "rgba(0,0,0,0.3)";
  
  if (connector.tone === "active") {
      mainColor = "rgba(220, 40, 60, 0.95)";
  } else if (connector.tone === "confirmed") {
      mainColor = "rgba(240, 190, 100, 0.9)"; // Gold
  }

  return (
    <G>
      {/* Shadow Line for Depth */}
      <AnimatedLine
        x1={connector.from.x}
        y1={connector.from.y + 1} // Slight offset
        x2={connector.to.x}
        y2={connector.to.y + 1}
        stroke={shadowColor}
        strokeWidth={thickness + 1}
        strokeDasharray={[length, length]}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        opacity={0.5}
      />
      
      {/* Main String */}
      <AnimatedLine
        x1={connector.from.x}
        y1={connector.from.y}
        x2={connector.to.x}
        y2={connector.to.y}
        stroke={mainColor}
        strokeWidth={thickness}
        strokeDasharray={[length, length]}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
      
      {/* Pins at endpoints */}
      <Circle cx={connector.from.x} cy={connector.from.y} r={thickness * 1.5} fill="#4a3b2a" opacity={0.8} />
      <Circle cx={connector.to.x} cy={connector.to.y} r={thickness * 1.5} fill="#4a3b2a" opacity={0.8} />
      {/* Pin Highlights */}
      <Circle cx={connector.from.x - 1} cy={connector.from.y - 1} r={thickness * 0.5} fill="#ffffff" opacity={0.3} />
      <Circle cx={connector.to.x - 1} cy={connector.to.y - 1} r={thickness * 0.5} fill="#ffffff" opacity={0.3} />
    </G>
  );
}, (prevProps, nextProps) => {
  const pC = prevProps.connector;
  const nC = nextProps.connector;
  
  return (
    pC.id === nC.id &&
    pC.tone === nC.tone &&
    Math.abs(pC.from.x - nC.from.x) < 0.1 &&
    Math.abs(pC.from.y - nC.from.y) < 0.1 &&
    Math.abs(pC.to.x - nC.to.x) < 0.1 &&
    Math.abs(pC.to.y - nC.to.y) < 0.1 &&
    prevProps.thickness === nextProps.thickness
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

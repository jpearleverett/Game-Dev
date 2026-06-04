import React from 'react';
import Reveal from './Reveal';

/**
 * Stagger — wrap a set of siblings to make them cascade in one after another.
 * Each non-null child is wrapped in a <Reveal> with an incrementing index.
 * Keeps screens declarative: <Stagger reducedMotion={rm}>{...sections}</Stagger>.
 */
export default function Stagger({ children, reducedMotion = false, delay = 0, distance = 10, childStyle }) {
  let i = 0;
  return React.Children.map(children, (child) => {
    if (child == null || child === false) return child;
    const index = i;
    i += 1;
    return (
      <Reveal index={index} delay={delay} distance={distance} reducedMotion={reducedMotion} style={childStyle}>
        {child}
      </Reveal>
    );
  });
}

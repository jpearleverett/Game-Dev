import React, { useState } from 'react';
import { View } from 'react-native';
import InteractivePolaroid from './InteractivePolaroid';

export default function PolaroidStack({ entries, size, onLayoutEntry }) {
  const [activePolaroidId, setActivePolaroidId] = useState(null);

  if (!entries || !entries.length) return null;

  return (
    <View pointerEvents="box-none" style={{ zIndex: activePolaroidId ? 100 : 30 }}>
      {entries.map((entry) => (
        <InteractivePolaroid
          key={entry.id}
          entry={entry}
          size={size}
          onLayoutEntry={onLayoutEntry}
          onOpen={() => setActivePolaroidId(entry.id)}
          onClose={() => setActivePolaroidId(null)}
        />
      ))}
    </View>
  );
}
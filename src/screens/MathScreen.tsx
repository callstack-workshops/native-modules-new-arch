import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import NativeMath from '../specs/NativeMath';

export function MathScreen() {
  const { pi } = NativeMath.getConstants();
  const [sum, setSum] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>pi from native = {pi.toFixed(6)}</Text>
      <Text style={styles.label}>
        add(2, 3) = {sum === null ? 'press the button' : sum}
      </Text>
      <Pressable
        style={styles.button}
        onPress={() => setSum(NativeMath.add(2, 3))}
      >
        <Text style={styles.buttonLabel}>Compute add(2, 3)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  label: { fontSize: 18 },
  button: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

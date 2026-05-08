import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function MathScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Math</Text>
      <Text style={styles.hint}>
        Native module exercises land here in later steps.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 14, opacity: 0.6, textAlign: 'center' },
});

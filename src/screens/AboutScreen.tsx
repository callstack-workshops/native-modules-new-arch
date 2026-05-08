import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About</Text>
      <Text style={styles.hint}>
        Workshop links and resources will go here.
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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Pi, Plus, Activity, Bell } from 'lucide-react-native';
import NativeMath from '../specs/NativeMath';
import { Card } from '../components/Card';

export function MathScreen() {
  const { pi } = NativeMath.getConstants();
  const [sum, setSum] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestEmitted, setLatestEmitted] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const subscription = NativeMath.onValueChanged(value => {
      setLatestEmitted(value);
      setEventCount(prev => prev + 1);
    });
    return () => subscription.remove();
  }, []);

  const handleFetchScore = async () => {
    setLoading(true);
    try {
      const result = await NativeMath.fetchScore('user-123');
      setScore(result);
    } catch (err) {
      console.error('fetchScore failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Math</Text>
        <Text style={styles.subtitle}>
          Turbo Module on the New Architecture
        </Text>
      </View>

      <Card icon={Pi} label="Constant" kind="getConstants()">
        <Text style={styles.value}>{pi.toFixed(6)}</Text>
        <Text style={styles.caption}>Read once when the module loads.</Text>
      </Card>

      <Card icon={Plus} label="Sync method" kind="add(a, b)">
        <Text style={styles.value}>
          {sum === null ? 'press Run to compute' : `add(2, 3) = ${sum}`}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => setSum(NativeMath.add(2, 3))}
        >
          <Text style={styles.buttonLabel}>Run</Text>
        </Pressable>
      </Card>

      <Card icon={Activity} label="Async method" kind="fetchScore(userId)">
        <Text style={styles.value}>
          {loading
            ? 'loading...'
            : score === null
            ? 'press Fetch'
            : `score = ${score}`}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleFetchScore}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonLabel}>Fetch</Text>
          )}
        </Pressable>
      </Card>

      <Card icon={Bell} label="Event" kind="onValueChanged">
        <Text style={styles.value}>
          {latestEmitted === null
            ? 'no events yet'
            : `last value: ${latestEmitted}`}
        </Text>
        <Text style={styles.caption}>
          {eventCount} event{eventCount === 1 ? '' : 's'} received
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  caption: {
    fontSize: 13,
    color: '#8E8E93',
  },
  button: {
    backgroundColor: '#0A84FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    alignSelf: 'flex-start',
    minWidth: 100,
  },
  buttonPressed: {
    backgroundColor: '#0066CC',
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A5',
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

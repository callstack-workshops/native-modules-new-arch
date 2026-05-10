import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Pi, Plus, Activity, Hourglass } from 'lucide-react-native';
import { Math as NitroMath } from 'nitro-math';
import { Card } from '../components/Card';

export function NitroMathScreen() {
  const pi = NitroMath.pi;
  const [sum, setSum] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [working, setWorking] = useState(false);

  const handleFetchScore = async () => {
    setLoading(true);
    try {
      const result = await NitroMath.fetchScore('user-123');
      setScore(result);
    } catch (err) {
      console.error('fetchScore failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = () => {
    setWorking(true);
    setProgress(0);
    NitroMath.startWork(p => {
      setProgress(p);
      if (p >= 1) {
        setWorking(false);
      }
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Math (Nitro)</Text>
        <Text style={styles.subtitle}>HybridObject via Nitro Modules</Text>
      </View>

      <Card icon={Pi} label="Property" kind="Math.pi">
        <Text style={styles.value}>{pi.toFixed(6)}</Text>
        <Text style={styles.caption}>
          Direct property access, no getter call.
        </Text>
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
          onPress={() => setSum(NitroMath.add(2, 3))}
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

      <Card icon={Hourglass} label="Callback" kind="startWork(onProgress)">
        <Text style={styles.value}>
          {progress === null
            ? 'press Start'
            : `progress = ${(progress * 100).toFixed(0)}%`}
        </Text>
        <Text style={styles.caption}>
          Progress callback, no EventEmitter needed.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            working && styles.buttonDisabled,
          ]}
          onPress={handleStartWork}
          disabled={working}
        >
          {working ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonLabel}>Start</Text>
          )}
        </Pressable>
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

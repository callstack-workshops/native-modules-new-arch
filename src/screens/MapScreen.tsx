import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { type Region } from '../specs/MapViewNativeComponent';

const initialRegion: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export function MapScreen() {
  const [region, setRegion] = useState<Region>(initialRegion);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Map</Text>
        <Text style={styles.subtitle}>
          Fabric Component on the New Architecture
        </Text>
      </View>

      <MapView
        style={{ flex: 1 }}
        region={region}
        onRegionChange={e => setRegion(e.nativeEvent)}
      />
      <View style={styles.regionStrip}>
        <View style={styles.regionRow}>
          <Text style={styles.regionLabel}>lat</Text>
          <Text style={styles.regionValue}>{region.latitude.toFixed(4)}</Text>
          <Text style={styles.regionLabel}>lng</Text>
          <Text style={styles.regionValue}>{region.longitude.toFixed(4)}</Text>
        </View>
        <View style={styles.regionRow}>
          <Text style={styles.regionLabel}>latDelta</Text>
          <Text style={styles.regionValue}>
            {region.latitudeDelta.toFixed(4)}
          </Text>
          <Text style={styles.regionLabel}>lngDelta</Text>
          <Text style={styles.regionValue}>
            {region.longitudeDelta.toFixed(4)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16, gap: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#8E8E93' },
  regionStrip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    gap: 4,
  },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regionLabel: { fontSize: 12, color: '#8E8E93', minWidth: 56 },
  regionValue: {
    fontSize: 13,
    color: '#1C1C1E',
    fontVariant: ['tabular-nums'],
    minWidth: 80,
  },
});

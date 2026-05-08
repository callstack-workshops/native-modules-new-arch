import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';

type CardProps = {
  icon: LucideIcon;
  label: string;
  kind: string;
  children: React.ReactNode;
};

export function Card({ icon: Icon, label, kind, children }: CardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon size={16} color="#666" strokeWidth={2} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.kind}>{kind}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3A3A3C',
  },
  kind: {
    fontSize: 12,
    fontFamily: 'Menlo',
    color: '#8E8E93',
  },
});

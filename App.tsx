import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Calculator,
  Map as MapIcon,
  Sigma,
  MapPin,
} from 'lucide-react-native';

import { MathScreen } from './src/screens/MathScreen';
import { MapScreen } from './src/screens/MapScreen';
import { NitroMathScreen } from './src/screens/NitroMathScreen';
import { NitroMapScreen } from './src/screens/NitroMapScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#0A84FF',
            tabBarInactiveTintColor: '#8E8E93',
          }}
        >
          <Tab.Screen
            name="Math"
            component={MathScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Calculator color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Math (Nitro)"
            component={NitroMathScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <Sigma color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Map"
            component={MapScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MapIcon color={color} size={size} />
              ),
            }}
          />
          <Tab.Screen
            name="Map (Nitro)"
            component={NitroMapScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MapPin color={color} size={size} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

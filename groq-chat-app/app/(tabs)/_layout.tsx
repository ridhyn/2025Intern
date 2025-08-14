import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const tabScreens = [
    {
      name: 'index',
      title: 'Home',
      icon: 'house.fill',
    },
    {
      name: 'explore',
      title: 'Explore',
      icon: 'paperplane.fill',
    },
  ] as const;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' }, // Transparent background for iOS blur effect
          default: {},
        }),
      }}>
      {tabScreens.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name={icon} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

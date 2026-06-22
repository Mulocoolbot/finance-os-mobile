import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useThemeColors } from '../../src/hooks/useThemeColors';

type IconName = keyof typeof Ionicons.glyphMap;

function getTabIcon(routeName: string): IconName {
  switch (routeName) {
    case 'index':
      return 'home-outline';
    case 'transactions':
      return 'swap-horizontal-outline';
    case 'budget':
      return 'wallet-outline';
    case 'reports':
      return 'bar-chart-outline';
    case 'more':
      return 'grid-outline';
    default:
      return 'ellipse-outline';
  }
}

function getTabTitle(routeName: string) {
  switch (routeName) {
    case 'index':
      return 'Home';
    case 'transactions':
      return 'Transactions';
    case 'budget':
      return 'Budget';
    case 'reports':
      return 'Reports';
    case 'more':
      return 'More';
    default:
      return routeName;
  }
}

const tabTransitionOptions = {
  animation: 'fade' as const,
};

export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        ...tabTransitionOptions,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={getTabIcon(route.name)} size={size} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: getTabTitle('index') }} />
      <Tabs.Screen name="transactions" options={{ title: getTabTitle('transactions') }} />
      <Tabs.Screen name="budget" options={{ title: getTabTitle('budget') }} />
      <Tabs.Screen name="reports" options={{ title: getTabTitle('reports') }} />
      <Tabs.Screen name="more" options={{ title: getTabTitle('more') }} />
    </Tabs>
  );
}

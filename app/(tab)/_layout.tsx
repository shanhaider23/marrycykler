import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Design tokens (mirrors HomeScreen / BookScreen) ───────
const C = {
    bg: '#0C0F0A',
    surface: '#111408',
    border: '#1E2218',
    accent: '#8DBF5B',
    white: '#F0EDE6',
    faint: '#5A5A52',
};

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: C.accent,
                tabBarInactiveTintColor: C.faint,
                tabBarStyle: {
                    backgroundColor: C.surface,
                    borderTopWidth: 1,
                    borderTopColor: C.border,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom + 8,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '500',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="bikes"
                options={{
                    title: 'Bikes',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="bicycle-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="book"
                options={{
                    title: 'Book',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="faq"
                options={{
                    title: 'FAQ',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="help-circle-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="contact"
                options={{
                    title: 'Contact',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="call-outline" size={size} color={color} />
                    ),
                }}
            />

        </Tabs>
    );
}
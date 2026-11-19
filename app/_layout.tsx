import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: '#0C0F0A' },
                    headerTintColor: '#F0EDE6',
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: '#0C0F0A' },
                }}
            >
                <Stack.Screen name="(tab)" options={{ headerShown: false }} />
                <Stack.Screen name="booking-confirm" options={{ title: 'Booking sent' }} />
            </Stack>
        </>
    );
}

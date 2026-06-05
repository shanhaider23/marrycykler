import { Stack } from 'expo-router';

export default function RootLayout() {
    return (
        <Stack>
            <Stack.Screen name="(tab)" options={{ headerShown: false }} />
            <Stack.Screen name="booking-confirm" options={{ title: 'Booking Confirmation' }} />
        </Stack>
    );
}

import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, GRADIENTS, RADIUS, SPACING } from '../constants/theme';

export default function BookingConfirmScreen() {
    return (
        <LinearGradient colors={GRADIENTS.page as [string, string, string]} style={styles.page}>
            <View style={styles.container}>
                <Text style={styles.kicker}>Success</Text>
                <Text style={styles.title}>Booking Request Sent</Text>
                <Text style={styles.text}>We will confirm availability shortly by phone, email, or WhatsApp.</Text>
                <Link href="/(tab)/book" style={styles.link}>
                    Create Another Booking
                </Link>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        margin: SPACING.lg,
        marginTop: 100,
        marginBottom: 100,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    kicker: {
        color: COLORS.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '800',
        fontSize: 12,
        marginBottom: 8,
    },
    title: {
        color: COLORS.white,
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
    },
    text: {
        color: COLORS.muted,
        marginTop: 10,
        marginBottom: 22,
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
    },
    link: {
        color: COLORS.dark,
        backgroundColor: COLORS.accent,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: RADIUS.full,
        fontSize: 16,
        fontWeight: '700',
    },
});

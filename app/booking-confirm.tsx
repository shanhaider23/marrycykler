import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PageBackground from '../components/pageBackground';
import { useSettings } from '../hooks/useSettings';
import { RADIUS, SPACING } from '../constants/theme';

const C = {
    bg: '#0C0F0A',
    surface2: '#0E1A08',
    borderGlow: '#2A3A1A',
    accent: '#8DBF5B',
    white: '#F0EDE6',
    muted: '#9A9A8E',
};

type Params = {
    id?: string;
    bike?: string;
    quantity?: string;
    start?: string;
    end?: string;
    name?: string;
    notes?: string;
    whatsapp?: string;
};

export default function BookingConfirmScreen() {
    const router = useRouter();
    const p = useLocalSearchParams<Params>();
    const { settings } = useSettings();

    const whatsappText = [
        `Hello, I sent booking request #${p.id ?? ''} in your app.`,
        '',
        `Name: ${p.name ?? ''}`,
        `Bike: ${p.quantity ?? '1'} x ${p.bike ?? ''}`,
        `From: ${p.start ?? ''}`,
        `To: ${p.end ?? ''}`,
        `Notes: ${p.notes || '-'}`,
    ].join('\n');

    return (
        <PageBackground>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <View style={styles.icon}>
                        <Ionicons name="checkmark" size={30} color={C.bg} />
                    </View>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>Request sent</Text>
                    </View>
                    <Text style={styles.title}>Thank you, we got it.</Text>
                    <Text style={styles.text}>
                        Your booking request <Text style={styles.strong}>#{p.id}</Text> has been received. We will contact you
                        shortly to confirm{settings?.payments_online ? ' and send you a link to pay online' : ''}. A copy is on its
                        way to your email.
                    </Text>

                    {!!p.bike && (
                        <View style={styles.summary}>
                            <Row label="Bike" value={`${p.quantity ?? '1'} × ${p.bike}`} />
                            <Row label="From" value={p.start ?? ''} />
                            <Row label="To" value={p.end ?? ''} />
                        </View>
                    )}

                    <Pressable
                        style={[styles.btn, styles.btnPrimary]}
                        onPress={() => Linking.openURL(`https://wa.me/${p.whatsapp ?? '4531131165'}?text=${encodeURIComponent(whatsappText)}`)}
                    >
                        <Text style={styles.btnPrimaryText}>Also send on WhatsApp</Text>
                    </Pressable>
                    <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => router.replace('/(tab)')}>
                        <Text style={styles.btnGhostText}>Back to home</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </PageBackground>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    card: {
        backgroundColor: C.surface2,
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: RADIUS.lg,
        padding: 24,
        gap: 14,
    },
    icon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: C.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    eyebrowLine: {
        width: 24,
        height: 1,
        backgroundColor: C.accent,
    },
    eyebrow: {
        color: C.accent,
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 3,
        textTransform: 'uppercase',
    },
    title: {
        color: C.white,
        fontSize: 30,
        fontWeight: '900',
        lineHeight: 34,
        letterSpacing: -0.5,
    },
    text: {
        color: C.muted,
        fontSize: 15,
        lineHeight: 23,
    },
    strong: {
        color: C.white,
        fontWeight: '700',
    },
    summary: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: C.borderGlow,
        paddingVertical: 12,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    rowLabel: {
        color: C.muted,
        fontSize: 14,
    },
    rowValue: {
        color: C.white,
        fontSize: 14,
        fontWeight: '600',
    },
    btn: {
        minHeight: 52,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    btnPrimary: {
        backgroundColor: C.accent,
        marginTop: 6,
    },
    btnPrimaryText: {
        color: C.bg,
        fontSize: 15,
        fontWeight: '700',
    },
    btnGhost: {
        borderColor: C.borderGlow,
    },
    btnGhostText: {
        color: C.white,
        fontSize: 15,
        fontWeight: '700',
    },
});

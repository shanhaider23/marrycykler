import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import OpenBadge from '../../components/OpenBadge';
import PageBackground from '../../components/pageBackground';
import { RADIUS, SPACING } from '../../constants/theme';
import { useSettings } from '../../hooks/useSettings';
import { OpeningHour } from '../../types';
import { capitalize, getOpenStatus } from '../../utils/shop';

// ── Design tokens (same as the website) ──────────────────
const C = {
    bg: '#0C0F0A',
    surface: '#111408',
    surface2: '#0E1A08',
    border: '#1E2218',
    borderGlow: '#2A3A1A',
    accent: '#8DBF5B',
    white: '#F0EDE6',
    muted: '#9A9A8E',
    faint: '#6E6E64',
};

const FALLBACK_HOURS: Record<string, OpeningHour> = {
    monday: { closed: false, open: '09:00', close: '17:00' },
    tuesday: { closed: false, open: '09:00', close: '17:00' },
    wednesday: { closed: false, open: '09:00', close: '17:00' },
    thursday: { closed: false, open: '09:00', close: '17:00' },
    friday: { closed: false, open: '09:00', close: '17:00' },
    saturday: { closed: false, open: '09:00', close: '15:00' },
    sunday: { closed: true, open: '09:00', close: '13:00' },
};

export default function ContactScreen() {
    const router = useRouter();
    const { settings } = useSettings();

    const name = settings?.business_name ?? 'Marry Cykler';
    const address = settings?.address ?? 'Frederiksborgvej 50c, 2400 København';
    const whatsapp = settings?.whatsapp ?? '4531131165';
    const phone = settings?.phone ?? '+45 31 13 11 65';
    const email = settings?.email ?? 'mc@rentbike.nu';
    const hours = settings?.opening_hours ?? FALLBACK_HOURS;
    const today = getOpenStatus(hours)?.today;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`;

    const actions = [
        { icon: 'logo-whatsapp' as const, label: 'WhatsApp', value: `+${whatsapp}`, url: `https://wa.me/${whatsapp}` },
        { icon: 'call-outline' as const, label: 'Call', value: phone, url: `tel:${phone.replace(/[^\d+]/g, '')}` },
        { icon: 'mail-outline' as const, label: 'Email', value: email, url: `mailto:${email}` },
    ];

    return (
        <PageBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>Find us</Text>
                    </View>
                    <Text style={styles.title}>Ready to ride?</Text>
                    <OpenBadge hours={hours} />
                </View>

                {/* ── Shop ── */}
                <View style={styles.card}>
                    <Text style={styles.head}>SHOP</Text>
                    <Text style={styles.address}>{address}</Text>
                    {!!settings?.location_note && <Text style={styles.note}>{settings.location_note}</Text>}
                    <Pressable style={styles.ghostBtn} onPress={() => Linking.openURL(mapUrl)}>
                        <Ionicons name="location-outline" size={16} color={C.accent} />
                        <Text style={styles.ghostBtnText}>Open in Google Maps</Text>
                    </Pressable>
                </View>

                {/* ── Contact ── */}
                <View style={styles.panel}>
                    {actions.map((action, i) => (
                        <Pressable
                            key={action.label}
                            style={[styles.actionRow, i > 0 && styles.rowBorder]}
                            onPress={() => Linking.openURL(action.url)}
                        >
                            <View style={styles.actionIcon}>
                                <Ionicons name={action.icon} size={18} color={C.accent} />
                            </View>
                            <View style={styles.actionInfo}>
                                <Text style={styles.head}>{action.label.toUpperCase()}</Text>
                                <Text style={styles.actionValue}>{action.value}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={C.faint} />
                        </Pressable>
                    ))}
                </View>

                {/* ── Opening hours ── */}
                <View style={styles.card}>
                    <Text style={styles.head}>OPENING HOURS</Text>
                    {Object.entries(hours).map(([day, info], i) => {
                        const isToday = day === today;
                        return (
                            <View key={day} style={[styles.hoursRow, i > 0 && styles.rowBorder]}>
                                <Text style={[styles.hoursDay, isToday && styles.today]}>{capitalize(day)}</Text>
                                <Text style={[styles.hoursValue, isToday && styles.today]}>
                                    {info.closed ? 'Closed' : `${info.open} – ${info.close}`}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* ── Book CTA ── */}
                <Pressable style={styles.primaryBtn} onPress={() => router.push('/(tab)/book')}>
                    <Text style={styles.primaryBtnText}>Book a bike</Text>
                </Pressable>

                {/* ── Footer ── */}
                <View style={styles.footer}>
                    <Text
                        style={styles.footerLink}
                        onPress={() => Linking.openURL('https://www.rentbike.nu/privacy-policy/')}
                    >
                        Privacy policy
                    </Text>
                    <Text style={styles.credit}>
                        © {new Date().getFullYear()} {name}
                    </Text>
                    <Text style={styles.credit}>
                        Designed & developed by <Text style={styles.creditName}>Shan-e-Haider Bukhari</Text>
                    </Text>
                </View>

            </ScrollView>
        </PageBackground>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: SPACING.xl,
        gap: SPACING.md,
    },
    hero: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 32,
        paddingBottom: SPACING.sm,
        gap: 14,
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
        fontSize: 40,
        fontWeight: '900',
        lineHeight: 44,
        letterSpacing: -1,
    },
    card: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        padding: 20,
        gap: 10,
    },
    panel: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        overflow: 'hidden',
    },
    head: {
        color: C.faint,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
    },
    address: {
        color: C.white,
        fontSize: 16,
        fontWeight: '500',
    },
    note: {
        color: C.muted,
        fontSize: 14,
        marginTop: -4,
    },
    ghostBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: 100,
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginTop: 4,
    },
    ghostBtnText: {
        color: C.white,
        fontSize: 14,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    rowBorder: {
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    actionIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(141, 191, 91, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionInfo: {
        flex: 1,
        gap: 3,
    },
    actionValue: {
        color: C.white,
        fontSize: 15,
        fontWeight: '500',
    },
    hoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
    },
    hoursDay: {
        color: C.muted,
        fontSize: 15,
    },
    hoursValue: {
        color: C.muted,
        fontSize: 15,
        fontVariant: ['tabular-nums'],
    },
    today: {
        color: C.accent,
        fontWeight: '600',
    },
    primaryBtn: {
        backgroundColor: C.accent,
        borderRadius: 100,
        minHeight: 54,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.sm,
    },
    primaryBtnText: {
        color: C.bg,
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: C.border,
        marginHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        marginTop: SPACING.md,
    },
    footerLink: {
        color: C.muted,
        fontSize: 13,
        textDecorationLine: 'underline',
    },
    credit: {
        color: C.faint,
        fontSize: 12,
        textAlign: 'center',
    },
    creditName: {
        color: C.white,
        fontWeight: '600',
    },
});

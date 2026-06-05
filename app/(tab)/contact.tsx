import PageBackground from '../../components/pageBackground';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../../hooks/useSettings';
import { RADIUS, SPACING } from '../../constants/theme';

// ── Design tokens (mirrors HomeScreen / BookScreen) ───────
const C = {
    bg: '#0C0F0A',
    surface: '#111408',
    border: '#1E2218',
    borderGlow: '#2A3A1A',
    accent: '#8DBF5B',
    white: '#F0EDE6',
    muted: '#8A8A80',
    faint: '#5A5A52',
};

const FALLBACK_HOURS: [string, string][] = [
    ['Monday', '09:00 – 17:00'],
    ['Tuesday', '09:00 – 17:00'],
    ['Wednesday', '09:00 – 17:00'],
    ['Thursday', '09:00 – 17:00'],
    ['Friday', '09:00 – 17:00'],
    ['Saturday', '09:00 – 15:00'],
    ['Sunday', '09:00 – 13:00'],
];

const CONTACT_ACTIONS = (settings: any) => [
    {
        label: 'WhatsApp',
        value: settings?.whatsapp ?? '+45 31 13 11 65',
        url: `https://wa.me/${settings?.whatsapp ?? '4531131165'}`,
    },
    {
        label: 'Call',
        value: settings?.phone ?? '+45 31 13 11 65',
        url: `tel:${settings?.phone ?? '+4531131165'}`,
    },
    {
        label: 'Email',
        value: settings?.email ?? 'asimemi@gmail.com',
        url: `mailto:${settings?.email ?? 'asimemi@gmail.com'}`,
    },
];

const ABOUT_POINTS = [
    'Bike rental from EUR 10 per day',
    'No deposit for normal rentals',
    'Lock, lights, and mobile holder included',
    'Cargo bikes and electric bikes available',
];

export default function ContactScreen() {
    const { settings } = useSettings();

    const hours: [string, string][] = settings?.opening_hours
        ? Object.entries(settings.opening_hours).map(([day, info]: [string, any]) => [
            day,
            info.closed ? 'Closed' : `${info.open} – ${info.close}`,
        ])
        : FALLBACK_HOURS;

    const actions = CONTACT_ACTIONS(settings);

    return (
        <PageBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>Marry Cykler</Text>
                    </View>
                    <Text style={styles.title}>
                        {'Get in\n'}
                        <Text style={styles.titleAccent}>touch.</Text>
                    </Text>
                    <Text style={styles.subtitle}>
                        {settings?.business_name ?? 'Marry Cykler'}
                        {'\n'}
                        {settings?.address ?? 'Frederiksborgvej 50C, 2400 København'}
                    </Text>
                </View>

                {/* ── Contact actions ── */}
                <View style={styles.panel}>
                    {actions.map((action, i) => (
                        <TouchableOpacity
                            key={action.label}
                            style={[styles.actionRow, i > 0 && styles.actionRowBorder]}
                            onPress={() => Linking.openURL(action.url)}
                        >
                            <View style={styles.actionRowInner}>
                                <View style={styles.whyDot} />
                                <View style={styles.actionInfo}>
                                    <Text style={styles.actionLabel}>{action.label.toUpperCase()}</Text>
                                    <Text style={styles.actionValue}>{action.value}</Text>
                                </View>
                                <Text style={styles.actionChevron}>›</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Opening hours ── */}


                <View style={styles.hoursCard}>
                    <View style={styles.noticeTagRow}>
                        <Text style={styles.noticeTag}>Opening hours</Text>
                        <View style={styles.noticeTagLine} />
                    </View>
                    {hours.map(([day, value], i) => (
                        <View key={day} style={[styles.hoursRow, i > 0 && styles.hoursRowBorder]}>
                            <Text style={styles.hoursDay}>{day.toUpperCase()}</Text>
                            <Text style={[styles.hoursValue, value === 'Closed' && styles.hoursValueClosed]}>
                                {value}
                            </Text>
                        </View>
                    ))}
                </View>
                <View style={styles.aboutCard}>
                    <View style={styles.noticeTagRow}>
                        <Text style={styles.noticeTag}>About us</Text>
                        <View style={styles.noticeTagLine} />
                    </View>
                    <Text style={styles.aboutTitle}>Local bike rental in Copenhagen.</Text>
                    <Text style={styles.aboutText}>
                        Marry Cykler helps visitors, students, families, and groups rent practical city bikes from
                        Frederiksborgvej 50C. We keep booking simple with WhatsApp support, fair daily prices, and
                        bikes ready for easy pickup.
                    </Text>
                    <View style={styles.aboutList}>
                        {ABOUT_POINTS.map((point) => (
                            <View key={point} style={styles.aboutPoint}>
                                <View style={styles.whyDot} />
                                <Text style={styles.aboutPointText}>{point}</Text>
                            </View>
                        ))}
                    </View>
                </View>
                <View style={styles.footerBanner}>
                    <Text style={styles.footerLabel}>App made by</Text>
                    <Text style={styles.footerName}>Shan-e-Haider Bukhari</Text>
                </View>

            </ScrollView>
        </PageBackground>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    content: {
        paddingBottom: SPACING.lg,
        gap: SPACING.lg,
    },

    // ── Hero
    hero: {
        padding: SPACING.lg,
        paddingTop: 32,
    },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
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
        fontSize: 46,
        fontWeight: '900',
        lineHeight: 48,
        letterSpacing: -1,
        marginBottom: 10,
    },
    titleAccent: {
        color: C.accent,
        fontStyle: 'italic',
    },
    subtitle: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
        lineHeight: 22,
        maxWidth: 280,
    },

    // ── Contact panel (mirrors BookScreen panel / whyCard)
    panel: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        overflow: 'hidden',
    },
    actionRow: {
        paddingVertical: 18,
        paddingHorizontal: SPACING.lg,
    },
    actionRowBorder: {
        borderTopWidth: 1,
        borderTopColor: '#1A1E14',
    },
    actionRowInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    actionInfo: {
        flex: 1,
    },
    actionLabel: {
        color: C.faint,
        fontSize: 9,
        fontWeight: '500',
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    actionValue: {
        color: C.white,
        fontSize: 15,
        fontWeight: '500',
    },
    actionChevron: {
        color: C.accent,
        fontSize: 22,
        fontWeight: '300',
    },

    // ── Shared dot (mirrors whyDot)
    whyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.accent,
        flexShrink: 0,
    },

    // ── Hours card (mirrors summaryCard / noticeCard)
    aboutCard: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        padding: SPACING.lg,
        gap: 12,
    },
    aboutTitle: {
        color: C.white,
        fontSize: 20,
        fontWeight: '800',
        lineHeight: 26,
    },
    aboutText: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
        lineHeight: 21,
    },
    aboutList: {
        gap: 10,
        paddingTop: 4,
    },
    aboutPoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    aboutPointText: {
        color: C.white,
        flex: 1,
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 19,
    },

    hoursCard: {
        backgroundColor: '#0E1A08',
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        padding: SPACING.lg,
        gap: 12,
    },
    noticeTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    noticeTag: {
        color: C.accent,
        fontSize: 9,
        fontWeight: '500',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    noticeTagLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.borderGlow,
    },
    hoursRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    hoursRowBorder: {
        paddingTop: 10,
        marginTop: 2,
        borderTopWidth: 1,
        borderTopColor: '#1A1E14',
    },
    hoursDay: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
    },
    hoursValue: {
        color: C.white,
        fontSize: 13,
        fontWeight: '500',
    },
    hoursValueClosed: {
        color: C.faint,
        fontWeight: '300',
    },
    footerBanner: {
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        gap: 4,
    },
    footerLabel: {
        color: C.faint,
        fontSize: 9,
        fontWeight: '500',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    footerName: {
        color: C.accent,
        fontSize: 12,
        fontWeight: '800',
        textAlign: 'center',
    },
});

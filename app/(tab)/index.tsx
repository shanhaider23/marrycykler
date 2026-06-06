import PageBackground from '../../components/pageBackground';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBikes } from '../../hooks/useBikes';
import { useSettings } from '../../hooks/useSettings';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

const HOME_GALLERY = [
    {
        uri: 'https://usercontent.one/wp/www.rentbike.nu/wp-content/uploads/2024/04/WhatsApp-Image-2024-04-27-at-08.58.58.jpeg',
        label: 'City Bikes',
        num: '01',
    },
    {
        uri: 'https://usercontent.one/wp/www.rentbike.nu/wp-content/uploads/2024/05/image0-rotated.jpeg',
        label: 'Cargo Bikes',
        num: '02',
    },
    {
        uri: 'https://usercontent.one/wp/www.rentbike.nu/wp-content/uploads/2024/05/b1.2.jpg',
        label: 'Classic Style',
        num: '03',
    },
    {
        uri: 'https://usercontent.one/wp/www.rentbike.nu/wp-content/uploads/2025/05/CHILD-SEAT.jpg',
        label: 'Family Add-ons',
        num: '04',
    },
    {
        uri: 'https://usercontent.one/wp/www.rentbike.nu/wp-content/uploads/2026/01/ladcykel.jpg',
        label: 'Group Friendly',
        num: '05',
    },
];

const WHY_ITEMS = [
    'Lock and lights always included',
    'Cargo bikes and e-bikes available',
    'Large group rentals on request',
    'Easy booking via WhatsApp',
];

export default function HomeScreen() {
    const { settings } = useSettings();
    const { bikes } = useBikes();
    const features = settings?.features?.length ? settings.features : WHY_ITEMS;
    const bikeCount = bikes.reduce((total, bike) => total + (Number(bike.quantity) || 0), 0);
    const firstBike = bikes[0];

    return (
        <PageBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>{settings?.business_name ?? 'Marry Cykler'}</Text>
                    </View>

                    <Text style={styles.title}>
                        {settings?.hero_title ?? (
                            <>
                                {'Rent a\nbike for\nthe '}
                                <Text style={styles.titleAccent}>city.</Text>
                            </>
                        )}
                    </Text>

                    <Text style={styles.subtitle}>
                        {settings?.hero_subtitle ?? 'Fast pickup, easy return, and WhatsApp support all day.'}
                    </Text>

                    <View style={styles.metricsBar}>
                        <View style={[styles.metricCell, styles.metricCellFirst]}>
                            <Text style={[styles.metricValue, styles.metricValueAccent]}>
                                {firstBike?.price_per_day ?? '10'} {settings?.currency ?? 'EUR'}
                            </Text>
                            <Text style={styles.metricLabel}>PER DAY</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricCell}>
                            <Text style={styles.metricValue}>{bikeCount || 38}</Text>
                            <Text style={styles.metricLabel}>BIKES NOW</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={[styles.metricCell, styles.metricCellLast]}>
                            <Text style={styles.metricValue}>0 {settings?.currency ?? 'EUR'}</Text>
                            <Text style={styles.metricLabel}>DEPOSIT</Text>
                        </View>
                    </View>
                </View>

                {/* ── Actions ── */}
                <View style={styles.actionsRow}>
                    <Link href="/(tab)/book" style={[styles.action, styles.actionPrimary]}>
                        Book Now
                    </Link>
                    <Link href="/(tab)/contact" style={[styles.action, styles.actionGhost]}>
                        Contact Us
                    </Link>
                </View>

                {/* ── Gallery ── */}
                <View style={styles.galleryBlock}>
                    <Text style={styles.sectionTitle}>Bike Gallery</Text>
                    <Text style={styles.sectionSubtitle}>Real bikes and cargo options ready for pickup</Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.galleryRow}
                    >
                        {HOME_GALLERY.map((item) => (
                            <ImageBackground
                                key={item.num}
                                source={{ uri: item.uri }}
                                imageStyle={styles.galleryImage}
                                style={styles.galleryCard}
                            >
                                <LinearGradient
                                    colors={['transparent', 'rgba(12,15,10,0.92)']}
                                    style={styles.galleryOverlay}
                                >
                                    <Text style={styles.galleryNum}>{item.num}</Text>
                                    <Text style={styles.galleryCaption}>{item.label}</Text>
                                </LinearGradient>
                            </ImageBackground>
                        ))}
                    </ScrollView>
                </View>

                {/* ── Why us ── */}
                <View style={styles.whyCard}>
                    <Text style={styles.whyTitle}>Why riders choose us</Text>
                    {features.map((item, i) => (
                        <View key={i} style={[styles.whyRow, i > 0 && styles.whyRowBorder]}>
                            <View style={styles.whyDot} />
                            <Text style={styles.whyText}>{item}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Notice ── */}
                <View style={styles.noticeCard}>
                    <View style={styles.noticeTagRow}>
                        <Text style={styles.noticeTag}>Group bookings</Text>
                        <View style={styles.noticeTagLine} />
                    </View>
                    <Text style={styles.noticeTitle}>
                        {settings?.show_banner && settings.notice_banner ? settings.notice_banner : 'Need 10+ bikes?'}
                    </Text>
                    <Text style={styles.noticeText}>
                        Contact us directly on WhatsApp or phone for a faster setup and group pricing.
                    </Text>
                </View>

            </ScrollView>
        </PageBackground>
    );
}

// ── Design tokens ────────────────────────────────────────
const C = {
    bg: '#0C0F0A',
    surface: '#111408',
    border: '#1E2218',
    borderGlow: '#2A3A1A',
    accent: '#8DBF5B',
    accentDim: '#2A4A1A',
    white: '#F0EDE6',
    muted: '#8A8A80',
    faint: '#5A5A52',
};

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
        marginBottom: 24,
        maxWidth: 280,
    },

    // ── Metrics bar
    metricsBar: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
    },
    metricCell: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    metricCellFirst: {},
    metricCellLast: {},
    metricDivider: {
        width: 1,
        backgroundColor: C.border,
        marginVertical: 10,
    },
    metricValue: {
        color: C.white,
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 30,
    },
    metricValueAccent: {
        color: C.accent,
    },
    metricLabel: {
        color: C.faint,
        fontSize: 9,
        fontWeight: '500',
        letterSpacing: 1.5,
        marginTop: 3,
    },

    // ── Actions
    actionsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
    },
    action: {
        flex: 1,
        textAlign: 'center',
        paddingVertical: 14,
        borderRadius: 100,
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 0.5,
        overflow: 'hidden',
    },
    actionPrimary: {
        backgroundColor: C.accent,
        color: C.bg,
    },
    actionGhost: {
        backgroundColor: 'transparent',
        color: C.white,
        borderWidth: 1,
        borderColor: C.border,
    },

    // ── Gallery
    galleryBlock: {
        gap: 8,
        paddingHorizontal: SPACING.lg,
    },
    sectionTitle: {
        color: C.white,
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
    },
    sectionSubtitle: {
        color: C.faint,
        fontSize: 12,
        fontWeight: '300',
    },
    galleryRow: {
        gap: SPACING.sm,
        paddingTop: 12,
    },
    galleryCard: {
        width: 180,
        height: 240,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
    },
    galleryImage: {
        borderRadius: 14,
        opacity: 0.85,
    },
    galleryOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 14,
    },
    galleryNum: {
        color: 'rgba(141,191,91,0.15)',
        fontSize: 36,
        fontWeight: '900',
        lineHeight: 36,
        marginBottom: 4,
    },
    galleryCaption: {
        color: C.white,
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.5,
    },

    // ── Why card
    whyCard: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        overflow: 'hidden',
    },
    whyTitle: {
        color: C.white,
        fontSize: 20,
        fontWeight: '800',
        padding: SPACING.lg,
        paddingBottom: 0,
        marginBottom: 4,
    },
    whyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: SPACING.lg,
    },
    whyRowBorder: {
        borderTopWidth: 1,
        borderTopColor: '#1A1E14',
    },
    whyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.accent,
        flexShrink: 0,
    },
    whyText: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
    },

    // ── Notice card
    noticeCard: {
        backgroundColor: '#0E1A08',
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        padding: SPACING.lg,
        gap: 8,
    },
    noticeTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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
    noticeTitle: {
        color: C.white,
        fontSize: 20,
        fontWeight: '800',
    },
    noticeText: {
        color: '#5A6A52',
        fontSize: 12,
        fontWeight: '300',
        lineHeight: 20,
    },
});

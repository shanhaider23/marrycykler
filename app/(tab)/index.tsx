import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import BikeArt from '../../components/BikeArt';
import OpenBadge from '../../components/OpenBadge';
import PageBackground from '../../components/pageBackground';
import PhotoCarousel from '../../components/PhotoCarousel';
import { RADIUS, SPACING } from '../../constants/theme';
import { useBikes } from '../../hooks/useBikes';
import { useSettings } from '../../hooks/useSettings';
import { formatPrice } from '../../utils/shop';

// Used until the settings arrive, and with plugin versions that have no gallery yet.
const UPLOADS = 'https://www.rentbike.nu/wp-content/uploads/';
const FALLBACK_GALLERY = [
    `${UPLOADS}2024/04/WhatsApp-Image-2024-04-27-at-08.58.58.jpeg`,
    `${UPLOADS}2024/05/image0-rotated.jpeg`,
    `${UPLOADS}2024/05/b1.2.jpg`,
    `${UPLOADS}2025/05/CHILD-SEAT.jpg`,
    `${UPLOADS}2026/01/ladcykel.jpg`,
];

const FALLBACK_FEATURES = [
    'Lock and lights always included',
    'Cargo bikes available',
    'Large group rentals on request',
    'Easy booking via WhatsApp',
];

export default function HomeScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { settings } = useSettings();
    const { bikes } = useBikes();

    const currency = settings?.currency ?? '€';
    const features = settings?.features?.length ? settings.features : FALLBACK_FEATURES;
    const gallery = settings?.gallery?.length ? settings.gallery : FALLBACK_GALLERY;
    const whatsappUrl = `https://wa.me/${settings?.whatsapp ?? '4531131165'}`;

    const prices = bikes.map((bike) => parseFloat(bike.price_per_day)).filter((price) => Number.isFinite(price));
    const fromPrice = prices.length ? formatPrice(Math.min(...prices), currency) : '';
    const bikeCount = bikes.reduce((total, bike) => total + (Number(bike.quantity) || 0), 0);
    const pricedBikes = bikes.filter((bike) => formatPrice(bike.price_per_day, currency)).slice(0, 4);
    const artWidth = Math.min(width - SPACING.lg * 2, 460);

    return (
        <PageBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>{settings?.tagline ?? 'Discover Copenhagen by bike'}</Text>
                    </View>

                    <Text style={styles.title}>{settings?.hero_title ?? 'Rent a bike in Copenhagen'}</Text>

                    <Text style={styles.subtitle}>
                        {settings?.hero_subtitle ?? 'Simple, affordable and friendly bike rental.'}
                    </Text>

                    <View style={styles.actionsRow}>
                        <Pressable style={[styles.action, styles.actionPrimary]} onPress={() => router.push('/(tab)/book')}>
                            <Text style={styles.actionPrimaryText}>Book a bike</Text>
                        </Pressable>
                        <Pressable style={[styles.action, styles.actionGhost]} onPress={() => Linking.openURL(whatsappUrl)}>
                            <Text style={styles.actionGhostText}>WhatsApp us</Text>
                        </Pressable>
                    </View>

                    <OpenBadge hours={settings?.opening_hours} />

                    <View style={styles.metricsBar}>
                        {!!fromPrice && (
                            <View style={styles.metricCell}>
                                <Text style={[styles.metricValue, styles.metricValueAccent]}>{fromPrice}</Text>
                                <Text style={styles.metricLabel}>FROM / DAY</Text>
                            </View>
                        )}
                        {!!fromPrice && bikeCount > 0 && <View style={styles.metricDivider} />}
                        {bikeCount > 0 && (
                            <View style={styles.metricCell}>
                                <Text style={styles.metricValue}>{bikeCount}</Text>
                                <Text style={styles.metricLabel}>BIKES</Text>
                            </View>
                        )}
                        {(!!fromPrice || bikeCount > 0) && <View style={styles.metricDivider} />}
                        <View style={styles.metricCell}>
                            <Text style={styles.metricValue}>{bikes.length}</Text>
                            <Text style={styles.metricLabel}>BIKE TYPES</Text>
                        </View>
                    </View>
                </View>

                {/* ── Illustration with floating cards ── */}
                <View style={[styles.art, { width: artWidth }]}>
                    <BikeArt width={artWidth} />

                    <View style={[styles.float, styles.floatPlace]}>
                        <Ionicons name="location-outline" size={15} color={C.accent} />
                        <Text style={styles.floatPlaceText} numberOfLines={2}>
                            {settings?.address ?? 'Frederiksborgvej 50c, 2400 København'}
                        </Text>
                    </View>

                    {pricedBikes.length > 0 && (
                        <View style={[styles.float, styles.floatPrices]}>
                            <Text style={styles.floatLabel}>PRICE PER DAY</Text>
                            {pricedBikes.map((bike) => (
                                <View key={bike.id} style={styles.floatRow}>
                                    <Text style={styles.floatName}>{bike.name}</Text>
                                    <Text style={styles.floatPrice}>{formatPrice(bike.price_per_day, currency)}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Selling points ── */}
                <View style={styles.whyCard}>
                    {features.map((item, i) => (
                        <View key={i} style={[styles.whyRow, i > 0 && styles.whyRowBorder]}>
                            <View style={styles.whyDot} />
                            <Text style={styles.whyText}>{item}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Photo slideshow ── */}
                <PhotoCarousel images={gallery} />

                {/* ── About ── */}
                <View style={styles.aboutBlock}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>About us</Text>
                    </View>
                    <Text style={styles.sectionTitle}>{settings?.business_name ?? 'Marry Cykler'}</Text>
                    <Text style={styles.aboutText}>
                        {settings?.about_text ??
                            'Marry Cykler is a local bike rental shop in Copenhagen, helping visitors, students, families and groups explore the city in an easy and affordable way.'}
                    </Text>
                </View>

                {/* ── Ready to ride ── */}
                <View style={styles.noticeCard}>
                    <View style={styles.noticeTagRow}>
                        <Text style={styles.noticeTag}>Find us</Text>
                        <View style={styles.noticeTagLine} />
                    </View>
                    <Text style={styles.noticeTitle}>Ready to ride?</Text>
                    <Text style={styles.noticeText}>
                        Need more than 10 bikes? Message us on WhatsApp or call for group pricing.
                    </Text>
                    <View style={styles.actionsRowInCard}>
                        <Pressable style={[styles.action, styles.actionPrimary]} onPress={() => router.push('/(tab)/book')}>
                            <Text style={styles.actionPrimaryText}>Book a bike</Text>
                        </Pressable>
                        <Pressable style={[styles.action, styles.actionGhost]} onPress={() => router.push('/(tab)/contact')}>
                            <Text style={styles.actionGhostText}>Contact</Text>
                        </Pressable>
                    </View>
                </View>

                {/* ── Credit ── */}
                <Text style={styles.credit}>
                    Designed & developed by <Text style={styles.creditName}>Shan-e-Haider Bukhari</Text>
                </Text>

            </ScrollView>
        </PageBackground>
    );
}

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

const styles = StyleSheet.create({
    content: {
        paddingBottom: SPACING.xl,
        gap: SPACING.xl,
    },

    // ── Hero
    hero: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 32,
        gap: 18,
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
        fontSize: 46,
        fontWeight: '900',
        lineHeight: 48,
        letterSpacing: -1,
    },
    subtitle: {
        color: C.muted,
        fontSize: 16,
        fontWeight: '300',
        lineHeight: 24,
    },

    // ── Buttons
    actionsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: 4,
    },
    actionsRowInCard: {
        flexDirection: 'row',
        gap: SPACING.sm,
        marginTop: 8,
    },
    action: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        paddingHorizontal: 16,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    actionPrimary: {
        backgroundColor: C.accent,
    },
    actionPrimaryText: {
        color: C.bg,
        fontSize: 15,
        fontWeight: '700',
    },
    actionGhost: {
        borderColor: C.borderGlow,
    },
    actionGhostText: {
        color: C.white,
        fontSize: 15,
        fontWeight: '700',
    },

    // ── Metrics bar
    metricsBar: {
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: C.border,
        overflow: 'hidden',
        marginTop: 6,
    },
    metricCell: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
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
        fontWeight: '600',
        letterSpacing: 1.5,
        marginTop: 3,
    },

    // ── Illustration
    art: {
        alignSelf: 'center',
        marginVertical: -SPACING.sm,
    },
    float: {
        position: 'absolute',
        backgroundColor: 'rgba(17, 20, 8, 0.92)',
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: 16,
        paddingVertical: 11,
        paddingHorizontal: 14,
    },
    floatPlace: {
        top: 0,
        right: 0,
        maxWidth: '72%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    floatPlaceText: {
        color: C.white,
        fontSize: 12,
        fontWeight: '500',
        flexShrink: 1,
    },
    floatPrices: {
        left: 0,
        bottom: 0,
        minWidth: 176,
        gap: 6,
    },
    floatLabel: {
        color: C.faint,
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 1.6,
    },
    floatRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 22,
    },
    floatName: {
        color: C.muted,
        fontSize: 13,
    },
    floatPrice: {
        color: C.accent,
        fontSize: 15,
        fontWeight: '800',
    },

    // ── Selling points
    whyCard: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        overflow: 'hidden',
    },
    whyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 15,
        paddingHorizontal: SPACING.lg,
    },
    whyRowBorder: {
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    whyDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: C.accent,
        flexShrink: 0,
    },
    whyText: {
        color: C.muted,
        fontSize: 14,
        fontWeight: '400',
        flex: 1,
    },

    // ── About
    aboutBlock: {
        paddingHorizontal: SPACING.lg,
        gap: 12,
    },
    sectionTitle: {
        color: C.white,
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
    },
    aboutText: {
        color: C.muted,
        fontSize: 15,
        fontWeight: '300',
        lineHeight: 24,
    },

    // ── Ready to ride card
    noticeCard: {
        backgroundColor: C.surface2,
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
        fontWeight: '600',
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
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    noticeText: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
        lineHeight: 20,
    },

    // ── Credit
    credit: {
        color: C.faint,
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: SPACING.lg,
    },
    creditName: {
        color: C.white,
        fontWeight: '600',
    },
});

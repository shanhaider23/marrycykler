import PageBackground from '../../components/pageBackground';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useBikes } from '../../hooks/useBikes';
import { RADIUS, SPACING } from '../../constants/theme';

// ── Design tokens (mirrors all other screens) ─────────────
const C = {
    bg: '#0C0F0A',
    surface: '#111408',
    border: '#1E2218',
    accent: '#8DBF5B',
    white: '#F0EDE6',
    muted: '#8A8A80',
    faint: '#5A5A52',
    info: '#5B9ABF',
};

function Header() {
    return (
        <PageBackground>
            <View style={styles.hero}>
                <View style={styles.eyebrowRow}>
                    <View style={styles.eyebrowLine} />
                    <Text style={styles.eyebrow}>Inventory</Text>
                </View>
                <Text style={styles.title}>
                    {'Our\n'}
                    <Text style={styles.titleAccent}>bikes.</Text>
                </Text>
                <Text style={styles.subtitle}>
                    Choose your style and continue in the Book tab.

                </Text>
            </View>
        </PageBackground>
    );
}

export default function BikesScreen() {
    const { bikes, loading } = useBikes();
    const content = useMemo(() => bikes, [bikes]);

    if (loading) {
        return (
            <PageBackground>
                <Header />
                <View style={styles.loadingRow}>
                    <ActivityIndicator color={C.accent} size="small" />
                    <Text style={styles.loadingText}>Loading bikes…</Text>
                </View>
            </PageBackground>
        );
    }

    return (
        <PageBackground>
            <FlatList
                style={styles.list}
                contentContainerStyle={styles.content}
                data={content}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={<Header />}
                renderItem={({ item, index }) => (
                    <View style={[styles.bikeRow, index > 0 && styles.bikeRowBorder]}>
                        <View style={styles.bikeRowTop}>
                            <View style={styles.whyDot} />
                            <View style={styles.bikeInfo}>
                                <Text style={styles.bikeName}>{item.name}</Text>
                                <Text style={styles.bikePrice}>€{item.price_per_day} / day</Text>
                            </View>
                            <Text style={styles.stockBadge}>Qty {item.quantity}</Text>
                        </View>
                        {!!item.description && (
                            <Text style={styles.bikeDesc}>{item.description}</Text>
                        )}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyRow}>
                        <View style={styles.whyDot} />
                        <Text style={styles.emptyText}>No bikes available right now.</Text>
                    </View>
                }
                // Wrap all bike rows in a single panel card
                ListFooterComponent={<View style={styles.panelFooter} />}
            />
        </PageBackground>
    );
}

// Panel wrapper injected via ListHeaderComponent spacing + renderItem containment
// We achieve the "single panel" look by rendering items inside a pseudo-panel
// created by matching the first/last item border radius via the FlatList wrapper.

const styles = StyleSheet.create({
    list: {
        flex: 1,
    },
    loadingPage: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingBottom: SPACING.lg,
    },

    // ── Hero (identical to all other screens)
    hero: {
        padding: SPACING.lg,
        paddingTop: 32,
        paddingBottom: SPACING.lg,
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

    // ── Bike rows (whyCard pattern, but via FlatList)
    bikeRow: {
        backgroundColor: C.surface,
        paddingVertical: 18,
        paddingHorizontal: SPACING.lg,
        marginHorizontal: SPACING.lg,
    },
    bikeRowBorder: {
        borderTopWidth: 1,
        borderTopColor: '#1A1E14',
    },
    bikeRowTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    whyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.accent,
        flexShrink: 0,
        marginTop: 2,
        alignSelf: 'flex-start',
    },
    bikeInfo: {
        flex: 1,
    },
    bikeName: {
        color: C.white,
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 3,
    },
    bikePrice: {
        color: C.accent,
        fontSize: 12,
        fontWeight: '400',
    },
    stockBadge: {
        color: C.info,
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    bikeDesc: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
        lineHeight: 20,
        marginTop: 10,
        marginLeft: 20,
        paddingLeft: 14,
        borderLeftWidth: 1,
        borderLeftColor: '#1E2218',
    },

    // ── Panel border shell (top + bottom rounded edges via first/last wrapper)
    panelFooter: {
        height: 0,
        marginHorizontal: SPACING.lg,
    },

    // ── Loading
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: SPACING.lg,
        marginTop: 8,
    },
    loadingText: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
    },

    // ── Empty
    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 18,
        paddingHorizontal: SPACING.lg,
        marginHorizontal: SPACING.lg,
        backgroundColor: C.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: C.border,
    },
    emptyText: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
    },
});

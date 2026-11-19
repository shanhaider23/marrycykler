import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import PageBackground from '../../components/pageBackground';
import { RADIUS, SPACING } from '../../constants/theme';
import { useBikes } from '../../hooks/useBikes';
import { useSettings } from '../../hooks/useSettings';
import { formatPrice } from '../../utils/shop';

// ── Design tokens (same as the website) ──────────────────
const C = {
    bg: '#0C0F0A',
    surface: '#111408',
    border: '#1E2218',
    borderGlow: '#2A3A1A',
    accent: '#8DBF5B',
    white: '#F0EDE6',
    muted: '#9A9A8E',
    faint: '#6E6E64',
};

function Header() {
    return (
        <View style={styles.hero}>
            <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowLine} />
                <Text style={styles.eyebrow}>Our bikes</Text>
            </View>
            <Text style={styles.title}>Pick your ride</Text>
            <Text style={styles.subtitle}>Lock and lights included with every bike.</Text>
        </View>
    );
}

export default function BikesScreen() {
    const router = useRouter();
    const { bikes, loading } = useBikes();
    const { settings } = useSettings();
    const currency = settings?.currency ?? '€';

    return (
        <PageBackground>
            <FlatList
                contentContainerStyle={styles.content}
                data={bikes}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={<Header />}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={C.accent} size="small" />
                            <Text style={styles.muted}>Loading bikes…</Text>
                        </View>
                    ) : (
                        <View style={styles.card}>
                            <Text style={styles.muted}>Message us on WhatsApp for current bikes and prices.</Text>
                        </View>
                    )
                }
                renderItem={({ item }) => {
                    const imageUri = typeof item.image === 'string' && item.image ? item.image : null;
                    const price = formatPrice(item.price_per_day, currency);
                    return (
                        <View style={styles.card}>
                            {imageUri && <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />}
                            <View style={styles.body}>
                                <View style={styles.head}>
                                    <Text style={styles.name}>{item.name}</Text>
                                    {!!price && (
                                        <Text style={styles.price}>
                                            {price}
                                            <Text style={styles.perDay}> / day</Text>
                                        </Text>
                                    )}
                                </View>
                                {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
                                <Pressable
                                    style={styles.bookBtn}
                                    onPress={() => router.push({ pathname: '/(tab)/book', params: { bike: item.name } })}
                                >
                                    <Text style={styles.bookBtnText}>Book this bike</Text>
                                </Pressable>
                            </View>
                        </View>
                    );
                }}
            />
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
    subtitle: {
        color: C.muted,
        fontSize: 15,
        fontWeight: '300',
        lineHeight: 22,
    },
    card: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        aspectRatio: 3 / 2,
        backgroundColor: C.bg,
    },
    body: {
        padding: 20,
        gap: 12,
        alignItems: 'flex-start',
    },
    head: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        alignSelf: 'stretch',
    },
    name: {
        color: C.white,
        fontSize: 20,
        fontWeight: '800',
        flexShrink: 1,
    },
    price: {
        color: C.accent,
        fontSize: 22,
        fontWeight: '800',
    },
    perDay: {
        color: C.faint,
        fontSize: 13,
        fontWeight: '400',
    },
    desc: {
        color: C.muted,
        fontSize: 15,
        lineHeight: 22,
    },
    bookBtn: {
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: 100,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginTop: 2,
    },
    bookBtnText: {
        color: C.white,
        fontSize: 14,
        fontWeight: '700',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: SPACING.lg,
    },
    muted: {
        color: C.muted,
        fontSize: 14,
        padding: 4,
    },
});

import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    FlatList,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const C = {
    surface: '#111408',
    border: '#1E2218',
    borderGlow: '#2A3A1A',
    accent: '#8DBF5B',
    white: '#F0EDE6',
    muted: '#9A9A8E',
};

const GAP = 14;
const AUTOPLAY_MS = 4500;

/**
 * The website's photo slideshow: the centre photo is large, its neighbours are
 * smaller and dimmed. Swipe, use the arrows, or let it advance on its own.
 */
export default function PhotoCarousel({ images }: { images: string[] }) {
    const { width } = useWindowDimensions();
    const itemWidth = Math.round(Math.min(width * 0.64, 320));
    const itemHeight = Math.round(itemWidth * 1.25);
    const snap = itemWidth + GAP;
    const sidePadding = (width - itemWidth) / 2;

    const scrollX = useRef(new Animated.Value(0)).current;
    const listRef = useRef<FlatList<string>>(null);
    const indexRef = useRef(0);
    const touching = useRef(false);
    const [index, setIndex] = useState(0);
    const total = images.length;

    function goTo(next: number) {
        const target = ((next % total) + total) % total;
        indexRef.current = target;
        setIndex(target);
        listRef.current?.scrollToOffset({ offset: target * snap, animated: true });
    }

    useEffect(() => {
        if (total < 2) return;
        const timer = setInterval(() => {
            if (!touching.current) goTo(indexRef.current + 1);
        }, AUTOPLAY_MS);
        return () => clearInterval(timer);
        // goTo only reads refs and the values listed here
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [total, snap]);

    function onSettle(event: NativeSyntheticEvent<NativeScrollEvent>) {
        const settled = Math.max(0, Math.min(total - 1, Math.round(event.nativeEvent.contentOffset.x / snap)));
        indexRef.current = settled;
        setIndex(settled);
        touching.current = false;
    }

    if (total === 0) return null;

    const pad = (n: number) => String(n).padStart(2, '0');

    return (
        <View>
            <View style={styles.head}>
                <View style={styles.headText}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>Gallery</Text>
                    </View>
                    <Text style={styles.title}>Out on the road</Text>
                </View>
                {total > 1 && (
                    <View style={styles.nav}>
                        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(index - 1)} accessibilityLabel="Previous photo">
                            <Ionicons name="chevron-back" size={18} color={C.white} />
                        </TouchableOpacity>
                        <Text style={styles.count}>
                            {pad(index + 1)} / {pad(total)}
                        </Text>
                        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(index + 1)} accessibilityLabel="Next photo">
                            <Ionicons name="chevron-forward" size={18} color={C.white} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <Animated.FlatList
                ref={listRef}
                data={images}
                keyExtractor={(uri, i) => `${i}-${uri}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={snap}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: sidePadding, paddingVertical: 8 }}
                ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                getItemLayout={(_, i) => ({ length: snap, offset: snap * i, index: i })}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                    touching.current = true;
                }}
                onMomentumScrollEnd={onSettle}
                renderItem={({ item, index: i }) => {
                    const inputRange = [(i - 1) * snap, i * snap, (i + 1) * snap];
                    const scale = scrollX.interpolate({ inputRange, outputRange: [0.84, 1, 0.84], extrapolate: 'clamp' });
                    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
                    return (
                        <Animated.View
                            style={[
                                styles.slide,
                                { width: itemWidth, height: itemHeight, opacity, transform: [{ scale }] },
                                i === index && styles.slideActive,
                            ]}
                        >
                            <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
                        </Animated.View>
                    );
                }}
            />

            {total > 1 && (
                <View style={styles.dots}>
                    {images.map((uri, i) => (
                        <TouchableOpacity key={`${i}-${uri}`} onPress={() => goTo(i)} hitSlop={8} accessibilityLabel={`Show photo ${i + 1}`}>
                            <View style={[styles.dot, i === index && styles.dotActive]} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    head: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        paddingHorizontal: 24,
        marginBottom: 14,
    },
    headText: {
        flex: 1,
    },
    eyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
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
        fontSize: 24,
        fontWeight: '800',
        lineHeight: 28,
    },
    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    navBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        borderColor: C.borderGlow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    count: {
        color: C.muted,
        fontSize: 12,
        minWidth: 46,
        textAlign: 'center',
    },
    slide: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        overflow: 'hidden',
    },
    slideActive: {
        borderColor: C.accent,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.borderGlow,
    },
    dotActive: {
        width: 26,
        backgroundColor: C.accent,
    },
});

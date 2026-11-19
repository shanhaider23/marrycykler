import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import PageBackground from '../../components/pageBackground';
import { RADIUS, SPACING } from '../../constants/theme';
import { useBikes } from '../../hooks/useBikes';
import { useSettings } from '../../hooks/useSettings';
import { api } from '../../services/api';
import { formatPrice, toIsoDate } from '../../utils/shop';

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
    red: '#F08A7A',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function startOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(start: Date, end: Date) {
    const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.round((b - a) / 86400000) + 1;
}

function fmt(date: Date) {
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ bike?: string }>();
    const { settings } = useSettings();
    const { bikes, loading: bikesLoading } = useBikes();
    const currency = settings?.currency ?? '€';

    const [bikeType, setBikeType] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [startDate, setStartDate] = useState(startOfToday);
    const [endDate, setEndDate] = useState(startOfToday);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [picker, setPicker] = useState<'start' | 'end' | null>(null);
    const [available, setAvailable] = useState<Record<string, number | null>>({});
    const [error, setError] = useState('');
    const [sending, setSending] = useState(false);

    // Preselect the bike chosen on the Bikes tab, otherwise the first one.
    useEffect(() => {
        if (params.bike && bikes.some((bike) => bike.name === params.bike)) {
            setBikeType(params.bike);
        } else if (!bikeType && bikes.length) {
            setBikeType(bikes[0].name);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.bike, bikes]);

    // Bikes left for the chosen dates (needs website plugin 2.0 or newer).
    const startIso = toIsoDate(startDate);
    const endIso = toIsoDate(endDate);
    useEffect(() => {
        let cancelled = false;
        api.getAvailability(startIso, endIso)
            .then((list) => {
                if (cancelled) return;
                const map: Record<string, number | null> = {};
                list.forEach((item) => {
                    map[item.name] = item.available;
                });
                setAvailable(map);
            })
            .catch(() => {
                if (!cancelled) setAvailable({}); // the server checks again when sending
            });
        return () => {
            cancelled = true;
        };
    }, [startIso, endIso]);

    const selectedBike = useMemo(() => bikes.find((bike) => bike.name === bikeType), [bikes, bikeType]);
    const days = daysBetween(startDate, endDate);
    const price = selectedBike ? parseFloat(selectedBike.price_per_day) : NaN;
    const total = Number.isFinite(price) ? formatPrice(price * quantity * days, currency) : '';
    const left = available[bikeType];

    function changeStart(date: Date) {
        const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        setStartDate(day);
        if (endDate < day) setEndDate(day);
    }

    async function submit() {
        setError('');
        const payload = {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            bike_type: bikeType,
            quantity,
            start_date: startIso,
            end_date: endIso,
            notes: notes.trim(),
            source: 'app' as const,
        };

        if (!payload.bike_type) return setError('Please choose a bike.');
        if (!payload.name) return setError('Please add your full name.');
        if (!EMAIL.test(payload.email)) return setError('Please add a valid email address so we can confirm your booking.');
        if (typeof left === 'number' && quantity > left) {
            return setError(
                left > 0
                    ? `Only ${left} × ${bikeType} left for these dates.`
                    : `${bikeType} is fully booked for these dates. Try other dates or message us on WhatsApp.`
            );
        }

        try {
            setSending(true);
            const result = await api.createBooking(payload);
            router.push({
                pathname: '/booking-confirm',
                params: {
                    id: String(result.booking_id),
                    bike: bikeType,
                    quantity: String(quantity),
                    start: startIso,
                    end: endIso,
                    name: payload.name,
                    notes: payload.notes,
                    whatsapp: settings?.whatsapp ?? '4531131165',
                },
            });
            setNotes('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not send the booking. Please try again or message us on WhatsApp.');
        } finally {
            setSending(false);
        }
    }

    return (
        <PageBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>Online booking</Text>
                    </View>
                    <Text style={styles.title}>Reserve your ride</Text>
                    <Text style={styles.subtitle}>Send a request in under a minute. We confirm by email or phone.</Text>
                </View>

                {/* ── 1. Bike ── */}
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>1. Bike</Text>
                    {bikesLoading ? (
                        <ActivityIndicator color={C.accent} />
                    ) : bikes.length === 0 ? (
                        <Text style={styles.muted}>No bikes loaded. Message us on WhatsApp for availability.</Text>
                    ) : (
                        <View style={styles.options}>
                            {bikes.map((bike) => {
                                const active = bike.name === bikeType;
                                const bikeLeft = available[bike.name];
                                const priceText = formatPrice(bike.price_per_day, currency);
                                return (
                                    <Pressable
                                        key={bike.id}
                                        style={[styles.option, active && styles.optionActive]}
                                        onPress={() => setBikeType(bike.name)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected: active }}
                                    >
                                        <Text style={styles.optionName}>{bike.name}</Text>
                                        {!!priceText && <Text style={styles.optionPrice}>{priceText} / day</Text>}
                                        {typeof bikeLeft === 'number' && (
                                            <Text style={[styles.optionLeft, bikeLeft === 0 && styles.optionOut]}>
                                                {bikeLeft > 0 ? `${bikeLeft} available for your dates` : 'Fully booked for your dates'}
                                            </Text>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.stepperRow}>
                        <Text style={styles.muted}>Number of bikes</Text>
                        <View style={styles.stepper}>
                            <Pressable style={styles.stepBtn} onPress={() => setQuantity((q) => Math.max(1, q - 1))} accessibilityLabel="Fewer bikes">
                                <Text style={styles.stepBtnText}>−</Text>
                            </Pressable>
                            <Text style={styles.stepValue}>{quantity}</Text>
                            <Pressable style={styles.stepBtn} onPress={() => setQuantity((q) => Math.min(50, q + 1))} accessibilityLabel="More bikes">
                                <Text style={styles.stepBtnText}>+</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* ── 2. Dates ── */}
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>2. Dates</Text>
                    <Pressable style={styles.field} onPress={() => setPicker('start')}>
                        <Text style={styles.fieldLabel}>Pick-up day</Text>
                        <Text style={styles.fieldValue}>{fmt(startDate)}</Text>
                    </Pressable>
                    <Pressable style={styles.field} onPress={() => setPicker('end')}>
                        <Text style={styles.fieldLabel}>Return day</Text>
                        <Text style={styles.fieldValue}>{fmt(endDate)}</Text>
                    </Pressable>
                    {picker && (
                        <DateTimePicker
                            value={picker === 'start' ? startDate : endDate}
                            mode="date"
                            minimumDate={picker === 'start' ? startOfToday() : startDate}
                            onDismiss={() => setPicker(null)}
                            onValueChange={(_, date) => {
                                const which = picker;
                                setPicker(null);
                                if (!date) return;
                                if (which === 'start') changeStart(date);
                                else setEndDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
                            }}
                        />
                    )}
                </View>

                {/* ── 3. Your details ── */}
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>3. Your details</Text>
                    <Text style={styles.fieldLabel}>Full name</Text>
                    <TextInput style={styles.input} value={name} onChangeText={setName} autoComplete="name" textContentType="name" placeholderTextColor={C.faint} />
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
                    <Text style={styles.fieldLabel}>Phone (optional)</Text>
                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" />
                    <Text style={styles.fieldLabel}>Notes (optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        placeholder="Pick-up time, child seat, cargo preference…"
                        placeholderTextColor={C.faint}
                    />
                </View>

                {/* ── Summary ── */}
                <View style={styles.summary}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>Booking summary</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Bike</Text>
                        <Text style={styles.summaryValue}>{bikeType || '—'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Quantity</Text>
                        <Text style={styles.summaryValue}>{quantity}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Duration</Text>
                        <Text style={styles.summaryValue}>{days} {days === 1 ? 'day' : 'days'}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalKey}>Estimated total</Text>
                        <Text style={styles.totalValue}>{total || '—'}</Text>
                    </View>
                    <Text style={styles.small}>
                        Need more than 10 bikes?{' '}
                        <Text style={styles.link} onPress={() => Linking.openURL(`https://wa.me/${settings?.whatsapp ?? '4531131165'}`)}>
                            Message us
                        </Text>{' '}
                        for group pricing.
                    </Text>
                </View>

                {!!error && (
                    <View style={styles.error} accessibilityRole="alert">
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                <View style={styles.submitWrap}>
                    <Pressable style={[styles.submit, sending && styles.submitDisabled]} onPress={submit} disabled={sending}>
                        {sending ? <ActivityIndicator color={C.bg} /> : <Text style={styles.submitText}>Send booking request</Text>}
                    </Pressable>
                    <Text style={styles.small}>
                        By sending you accept our{' '}
                        <Text style={styles.link} onPress={() => Linking.openURL('https://www.rentbike.nu/privacy-policy/')}>
                            privacy policy
                        </Text>
                        . You pay in the shop at pick-up.
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

    // ── Hero
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

    // ── Panels
    panel: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        padding: 20,
        gap: 12,
    },
    panelTitle: {
        color: C.white,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    muted: {
        color: C.muted,
        fontSize: 14,
    },

    // ── Bike options
    options: {
        gap: 10,
    },
    option: {
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: 16,
        padding: 16,
        gap: 2,
    },
    optionActive: {
        borderColor: C.accent,
        backgroundColor: 'rgba(141, 191, 91, 0.08)',
    },
    optionName: {
        color: C.white,
        fontSize: 16,
        fontWeight: '700',
    },
    optionPrice: {
        color: C.accent,
        fontSize: 14,
    },
    optionLeft: {
        color: C.faint,
        fontSize: 12,
    },
    optionOut: {
        color: C.red,
    },

    // ── Stepper
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    stepBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderGlow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBtnText: {
        color: C.white,
        fontSize: 22,
        lineHeight: 24,
    },
    stepValue: {
        color: C.white,
        fontSize: 22,
        fontWeight: '800',
        minWidth: 28,
        textAlign: 'center',
    },

    // ── Fields
    field: {
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 3,
    },
    fieldLabel: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '500',
    },
    fieldValue: {
        color: C.white,
        fontSize: 16,
        fontWeight: '500',
    },
    input: {
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: 14,
        color: C.white,
        fontSize: 16,
        minHeight: 50,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginTop: -4,
    },
    textArea: {
        minHeight: 96,
        textAlignVertical: 'top',
    },

    // ── Summary
    summary: {
        backgroundColor: C.surface2,
        borderWidth: 1,
        borderColor: C.borderGlow,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        padding: 20,
        gap: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    summaryKey: {
        color: C.muted,
        fontSize: 15,
    },
    summaryValue: {
        color: C.white,
        fontSize: 15,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: C.borderGlow,
        paddingTop: 12,
        marginTop: 4,
    },
    totalKey: {
        color: C.white,
        fontSize: 15,
        fontWeight: '700',
    },
    totalValue: {
        color: C.accent,
        fontSize: 30,
        fontWeight: '800',
    },
    small: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 18,
    },
    link: {
        color: C.accent,
    },

    // ── Error
    error: {
        marginHorizontal: SPACING.lg,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(240, 138, 122, 0.4)',
        backgroundColor: 'rgba(240, 138, 122, 0.08)',
    },
    errorText: {
        color: C.red,
        fontSize: 14,
        lineHeight: 20,
    },

    // ── Submit
    submitWrap: {
        paddingHorizontal: SPACING.lg,
        gap: 12,
    },
    submit: {
        backgroundColor: C.accent,
        borderRadius: 100,
        minHeight: 54,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitDisabled: {
        opacity: 0.6,
    },
    submitText: {
        color: C.bg,
        fontSize: 15,
        fontWeight: '700',
    },
});

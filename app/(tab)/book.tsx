import PageBackground from '../../components/pageBackground';
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Linking,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { openWhatsApp, createWhatsAppBookingText } from '../../services/whatsappService';
import { useSettings } from '../../hooks/useSettings';
import { useBikes } from '../../hooks/useBikes';
import { RADIUS, SPACING } from '../../constants/theme';

// ── Design tokens (mirrors HomeScreen) ───────────────────
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
    info: '#5B9ABF',
};

function getDurationDays(startDate: Date, endDate: Date) {
    const msPerDay = 1000 * 60 * 60 * 24;
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
    return Math.max(1, Math.ceil((end - start) / msPerDay) + 1);
}

function parsePrice(value: string) {
    const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
    return Number(normalized) || 0;
}

function fmt(date: Date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookScreen() {
    const { settings } = useSettings();
    const { bikes } = useBikes();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [bikeType, setBikeType] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000));
    const [notes, setNotes] = useState('');
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [loading, setLoading] = useState(false);

    const selectedBike = useMemo(
        () => bikes.find((bike) => bike.name === bikeType),
        [bikes, bikeType]
    );
    const durationDays = getDurationDays(startDate, endDate);
    const estimatedTotal = (selectedBike ? parsePrice(selectedBike.price_per_day) : 0) * quantity * durationDays;

    async function submitBooking() {
        if (!settings) return;
        if (!name || !email || !bikeType) {
            Alert.alert('Missing information', 'Please add your name, email and bike type.');
            return;
        }
        const payload = {
            name, email, phone,
            bike_type: bikeType,
            quantity,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            notes,
        };
        try {
            setLoading(true);
            const result = await api.createBooking(payload);
            Alert.alert(
                'Booking received',
                `Thank you. Your booking request #${result.booking_id} has been received.`,
                [
                    { text: 'OK' },
                    {
                        text: 'Send on WhatsApp also',
                        onPress: () => openWhatsApp(settings.whatsapp, createWhatsAppBookingText(payload)),
                    },
                ]
            );
        } catch {
            Alert.alert('Booking failed', 'Please try again or contact us on WhatsApp.');
        } finally {
            setLoading(false);
        }
    }

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
                        {'Reserve\nyour '}
                        <Text style={styles.titleAccent}>ride.</Text>
                    </Text>
                    <Text style={styles.subtitle}>
                        Quick form, instant request, WhatsApp backup.
                    </Text>

                    <View style={styles.metricsBar}>
                        <View style={styles.metricCell}>
                            <Text style={[styles.metricValue, styles.metricValueAccent]}>€0</Text>
                            <Text style={styles.metricLabel}>DEPOSIT</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricCell}>
                            <Text style={styles.metricValue}>€10</Text>
                            <Text style={styles.metricLabel}>FROM/DAY</Text>
                        </View>
                        <View style={styles.metricDivider} />
                        <View style={styles.metricCell}>
                            <Text style={styles.metricValue}>38</Text>
                            <Text style={styles.metricLabel}>BIKES NOW</Text>
                        </View>
                    </View>
                </View>

                {/* ── Quick contact ── */}
                <View style={styles.quickRow}>
                    <TouchableOpacity
                        style={styles.quickCard}
                        onPress={() => Linking.openURL(`https://wa.me/${settings?.whatsapp ?? '4531131165'}`)}
                    >
                        <View style={styles.eyebrowRow}>
                            <View style={styles.eyebrowLine} />
                            <Text style={styles.eyebrow}>WhatsApp</Text>
                        </View>
                        <Text style={styles.quickValue}>Fast booking help</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickCard}
                        onPress={() => Linking.openURL(`tel:${settings?.phone ?? '+4531131165'}`)}
                    >
                        <View style={styles.eyebrowRow}>
                            <View style={styles.eyebrowLine} />
                            <Text style={styles.eyebrow}>Call us</Text>
                        </View>
                        <Text style={styles.quickValue}>{settings?.phone ?? '+45 31 13 11 65'}</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Your details ── */}
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Your details</Text>
                    <View style={styles.panelDivider} />
                    <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={C.faint} value={name} onChangeText={setName} />
                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor={C.faint} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                    <TextInput style={[styles.input, styles.inputLast]} placeholder="Phone" placeholderTextColor={C.faint} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </View>

                {/* ── Bike type ── */}
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Bike type</Text>
                    <View style={styles.panelDivider} />
                    {bikes.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <View style={styles.whyDot} />
                            <Text style={styles.emptyText}>No bikes loaded. Use WhatsApp for instant availability.</Text>
                        </View>
                    ) : (
                        bikes.map((bike, i) => (
                            <TouchableOpacity
                                key={bike.id}
                                style={[
                                    styles.bikeRow,
                                    i > 0 && styles.bikeRowBorder,
                                    bikeType === bike.name && styles.bikeRowActive,
                                ]}
                                onPress={() => setBikeType(bike.name)}
                            >
                                <View style={styles.bikeRowInner}>
                                    <View style={[styles.whyDot, bikeType === bike.name && styles.whyDotActive]} />
                                    <View style={styles.bikeInfo}>
                                        <Text style={styles.bikeName}>{bike.name}</Text>
                                        <Text style={styles.bikePrice}>
                                            {settings?.currency ?? 'EUR'} {bike.price_per_day} / day
                                        </Text>
                                    </View>
                                    <Text style={styles.stockText}>Qty {bike.quantity}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* ── Quantity & dates ── */}
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Quantity & dates</Text>
                    <View style={styles.panelDivider} />

                    {/* Quantity stepper */}
                    <View style={styles.stepperRow}>
                        <Text style={styles.stepperLabel}>Bikes</Text>
                        <View style={styles.stepper}>
                            <TouchableOpacity style={styles.stepBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                                <Text style={styles.stepBtnText}>−</Text>
                            </TouchableOpacity>
                            <Text style={styles.stepValue}>{quantity}</Text>
                            <TouchableOpacity style={styles.stepBtn} onPress={() => setQuantity(quantity + 1)}>
                                <Text style={styles.stepBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.panelDivider} />

                    {/* Start date */}
                    <TouchableOpacity style={styles.dateRow} onPress={() => setShowStartPicker(true)}>
                        <View style={styles.dateRowInner}>
                            <View style={styles.whyDot} />
                            <View>
                                <Text style={styles.dateLabel}>START DATE</Text>
                                <Text style={styles.dateValue}>{fmt(startDate)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            minimumDate={new Date()}
                            onDismiss={() => setShowStartPicker(false)}
                            onValueChange={(_, date) => { setShowStartPicker(false); if (date) setStartDate(date); }}
                        />
                    )}

                    <View style={styles.panelDivider} />

                    {/* End date */}
                    <TouchableOpacity style={styles.dateRow} onPress={() => setShowEndPicker(true)}>
                        <View style={styles.dateRowInner}>
                            <View style={styles.whyDot} />
                            <View>
                                <Text style={styles.dateLabel}>END DATE</Text>
                                <Text style={styles.dateValue}>{fmt(endDate)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    {showEndPicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            minimumDate={startDate}
                            onDismiss={() => setShowEndPicker(false)}
                            onValueChange={(_, date) => { setShowEndPicker(false); if (date) setEndDate(date); }}
                        />
                    )}
                </View>

                {/* ── Extra notes ── */}
                <View style={styles.panel}>
                    <Text style={styles.panelTitle}>Extra notes</Text>
                    <View style={styles.panelDivider} />
                    <TextInput
                        style={[styles.input, styles.textArea, styles.inputLast]}
                        placeholder="Pickup time, child seat, cargo preference…"
                        placeholderTextColor={C.faint}
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                    />
                </View>

                {/* ── Summary ── */}
                <View style={styles.summaryCard}>
                    <View style={styles.noticeTagRow}>
                        <Text style={styles.noticeTag}>Booking summary</Text>
                        <View style={styles.noticeTagLine} />
                    </View>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Bike</Text>
                        <Text style={styles.summaryValue}>{bikeType || '—'}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryRowBorder]}>
                        <Text style={styles.summaryKey}>Duration</Text>
                        <Text style={styles.summaryValue}>{durationDays} day{durationDays !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryRowBorder]}>
                        <Text style={styles.summaryKey}>Quantity</Text>
                        <Text style={styles.summaryValue}>{quantity}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryTotalKey}>Estimated total</Text>
                        <Text style={styles.summaryTotalValue}>
                            {settings?.currency ?? 'EUR'} {estimatedTotal > 0 ? estimatedTotal.toFixed(0) : '—'}
                        </Text>
                    </View>
                </View>

                {/* ── Submit ── */}
                <TouchableOpacity onPress={submitBooking} disabled={loading} style={styles.submitWrap}>
                    <View style={[styles.submitBtn, loading && styles.submitBtnDisabled]}>
                        {loading
                            ? <ActivityIndicator color={C.bg} />
                            : <Text style={styles.submitText}>Send Booking Request</Text>
                        }
                    </View>
                </TouchableOpacity>

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

    // ── Quick contact
    quickRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        paddingHorizontal: SPACING.lg,
    },
    quickCard: {
        flex: 1,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
    },
    quickValue: {
        color: C.white,
        fontSize: 13,
        fontWeight: '700',
    },

    // ── Panels
    panel: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        overflow: 'hidden',
    },
    panelTitle: {
        color: C.white,
        fontSize: 20,
        fontWeight: '800',
        padding: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    panelDivider: {
        height: 1,
        backgroundColor: C.border,
    },

    // ── Inputs
    input: {
        color: C.white,
        fontSize: 14,
        fontWeight: '300',
        paddingVertical: 16,
        paddingHorizontal: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    inputLast: {
        borderBottomWidth: 0,
    },
    textArea: {
        minHeight: 90,
        textAlignVertical: 'top',
    },

    // ── Bike options (mirrors whyRow)
    bikeRow: {
        paddingVertical: 14,
        paddingHorizontal: SPACING.lg,
    },
    bikeRowBorder: {
        borderTopWidth: 1,
        borderTopColor: '#1A1E14',
    },
    bikeRowActive: {
        backgroundColor: '#8DBF5B0D',
    },
    bikeRowInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    bikeInfo: {
        flex: 1,
    },
    bikeName: {
        color: C.white,
        fontSize: 14,
        fontWeight: '500',
    },
    bikePrice: {
        color: C.accent,
        fontSize: 12,
        fontWeight: '400',
        marginTop: 2,
    },
    stockText: {
        color: C.info,
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: SPACING.lg,
    },
    emptyText: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
        flex: 1,
    },

    // ── Quantity stepper
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: SPACING.lg,
    },
    stepperLabel: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    stepBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: C.bg,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBtnText: {
        color: C.white,
        fontSize: 20,
        lineHeight: 22,
    },
    stepValue: {
        color: C.white,
        fontSize: 22,
        fontWeight: '800',
        minWidth: 28,
        textAlign: 'center',
    },

    // ── Date rows (mirrors whyRow)
    dateRow: {
        paddingVertical: 16,
        paddingHorizontal: SPACING.lg,
    },
    dateRowInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    dateLabel: {
        color: C.faint,
        fontSize: 9,
        fontWeight: '500',
        letterSpacing: 1.5,
        marginBottom: 3,
    },
    dateValue: {
        color: C.white,
        fontSize: 14,
        fontWeight: '500',
    },

    // ── Why dot (shared)
    whyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: C.border,
        flexShrink: 0,
    },
    whyDotActive: {
        backgroundColor: C.accent,
    },

    // ── Summary card (mirrors noticeCard)
    summaryCard: {
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
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    summaryRowBorder: {
        paddingTop: 10,
        marginTop: 2,
    },
    summaryKey: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
    },
    summaryValue: {
        color: C.white,
        fontSize: 13,
        fontWeight: '500',
    },
    summaryDivider: {
        height: 1,
        backgroundColor: C.borderGlow,
        marginVertical: 4,
    },
    summaryTotalKey: {
        color: C.white,
        fontSize: 14,
        fontWeight: '700',
    },
    summaryTotalValue: {
        color: C.accent,
        fontSize: 24,
        fontWeight: '800',
    },

    // ── Submit button (mirrors actionPrimary pill)
    submitWrap: {
        paddingHorizontal: SPACING.lg,
        marginBottom: 20,
    },
    submitBtn: {
        backgroundColor: C.accent,
        borderRadius: 100,
        paddingVertical: 16,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.6,
    },
    submitText: {
        color: C.bg,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

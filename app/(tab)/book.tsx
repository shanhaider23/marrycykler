import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../services/api';
import { openWhatsApp, createWhatsAppBookingText } from '../services/whatsappService';
import { useSettings } from '../hooks/useSettings';
import { useBikes } from '../hooks/useBikes';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

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

    async function submitBooking() {
        if (!settings) return;

        if (!name || !email || !bikeType) {
            Alert.alert('Missing information', 'Please add your name, email and bike type.');
            return;
        }

        const payload = {
            name,
            email,
            phone,
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
        } catch (error) {
            Alert.alert('Booking failed', 'Please try again or contact us on WhatsApp.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Book a Bike</Text>
            <Text style={styles.subtitle}>Send your booking request in less than one minute.</Text>

            <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={COLORS.muted} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={COLORS.muted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            <Text style={styles.label}>Bike Type</Text>
            {bikes.map((bike) => (
                <TouchableOpacity
                    key={bike.id}
                    style={[styles.bikeOption, bikeType === bike.name && styles.bikeOptionActive]}
                    onPress={() => setBikeType(bike.name)}
                >
                    <Text style={styles.bikeName}>{bike.name}</Text>
                    <Text style={styles.bikePrice}>{settings?.currency} {bike.price_per_day} / day</Text>
                </TouchableOpacity>
            ))}

            <Text style={styles.label}>Quantity</Text>
            <View style={styles.quantityRow}>
                <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <TouchableOpacity style={styles.quantityButton} onPress={() => setQuantity(quantity + 1)}>
                    <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.label}>Dates</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateText}>Start: {startDate.toDateString()}</Text>
            </TouchableOpacity>
            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(_, date) => {
                        setShowStartPicker(false);
                        if (date) setStartDate(date);
                    }}
                />
            )}

            <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateText}>End: {endDate.toDateString()}</Text>
            </TouchableOpacity>
            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    minimumDate={startDate}
                    onChange={(_, date) => {
                        setShowEndPicker(false);
                        if (date) setEndDate(date);
                    }}
                />
            )}

            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes, pickup time, special request"
                placeholderTextColor={COLORS.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
            />

            <TouchableOpacity style={styles.submitButton} onPress={submitBooking} disabled={loading}>
                <LinearGradient colors={[COLORS.accent, COLORS.accentDark]} style={styles.submitGradient}>
                    {loading ? <ActivityIndicator color={COLORS.dark} /> : <Text style={styles.submitText}>Confirm Booking</Text>}
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.dark,
    },
    content: {
        padding: SPACING.lg,
        paddingTop: 64,
    },
    title: {
        color: COLORS.white,
        fontSize: 34,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        color: COLORS.muted,
        fontSize: 15,
        marginBottom: 24,
    },
    label: {
        color: COLORS.muted,
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: RADIUS.md,
        padding: 16,
        color: COLORS.white,
        marginBottom: 12,
    },
    textArea: {
        minHeight: 90,
        textAlignVertical: 'top',
    },
    bikeOption: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: RADIUS.md,
        padding: 16,
        marginBottom: 10,
    },
    bikeOptionActive: {
        borderColor: COLORS.accent,
        backgroundColor: '#F5A62315',
    },
    bikeName: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '700',
    },
    bikePrice: {
        color: COLORS.accent,
        marginTop: 4,
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
        marginBottom: 12,
    },
    quantityButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonText: {
        color: COLORS.white,
        fontSize: 24,
    },
    quantityValue: {
        color: COLORS.white,
        fontSize: 24,
        fontWeight: '800',
    },
    dateButton: {
        backgroundColor: COLORS.card,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: RADIUS.md,
        padding: 16,
        marginBottom: 12,
    },
    dateText: {
        color: COLORS.white,
    },
    submitButton: {
        borderRadius: RADIUS.md,
        overflow: 'hidden',
        marginTop: 20,
        marginBottom: 40,
    },
    submitGradient: {
        padding: 18,
        alignItems: 'center',
    },
    submitText: {
        color: COLORS.dark,
        fontSize: 16,
        fontWeight: '800',
    },
});
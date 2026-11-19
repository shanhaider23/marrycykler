import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OpeningHour } from '../types';
import { getOpenStatus } from '../utils/shop';

/** "Open now until 17:00" / "Closed now, opens tomorrow at 09:00", refreshed every minute. */
export default function OpenBadge({ hours }: { hours?: Record<string, OpeningHour> }) {
    const [, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTick((n) => n + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    const status = getOpenStatus(hours);
    if (!status) return null;

    return (
        <View style={styles.row}>
            <View style={[styles.dot, !status.open && styles.dotClosed]} />
            <Text style={styles.text}>{status.text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#8DBF5B',
    },
    dotClosed: {
        backgroundColor: '#F08A7A',
    },
    text: {
        color: '#9A9A8E',
        fontSize: 13,
        fontWeight: '400',
    },
});

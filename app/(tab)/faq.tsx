import PageBackground from '../../components/pageBackground';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFaq } from '../../hooks/useFaq';
import { RADIUS, SPACING } from '../../constants/theme';

// ── Design tokens (mirrors HomeScreen / BookScreen / ContactScreen) ───
const C = {
    bg:         '#0C0F0A',
    surface:    '#111408',
    border:     '#1E2218',
    borderGlow: '#2A3A1A',
    accent:     '#8DBF5B',
    accentDim:  '#8DBF5B0D',
    white:      '#F0EDE6',
    muted:      '#8A8A80',
    faint:      '#5A5A52',
};

const FAQ_ITEMS = [
    {
        question: 'How much does bike rental cost?',
        answer: 'Standard bikes are typically around €10 per day. Cargo and electric bikes have different pricing.',
    },
    {
        question: 'Do I need a deposit?',
        answer: 'No deposit is required for normal rentals.',
    },
    {
        question: 'What is included in the rental?',
        answer: 'Lock and lights are included, and many rentals include a free mobile holder.',
    },
    {
        question: 'Can I book for a large group?',
        answer: 'Yes. For more than 10 bikes, contact us directly by WhatsApp or phone for fast coordination.',
    },
];

export default function FaqScreen() {
    const [openItem, setOpenItem] = useState<number>(0);
    const { faq } = useFaq();
    const items = faq.length > 0 ? faq : FAQ_ITEMS;

    return (
        <PageBackground>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ── Hero ── */}
                <View style={styles.hero}>
                    <View style={styles.eyebrowRow}>
                        <View style={styles.eyebrowLine} />
                        <Text style={styles.eyebrow}>Help Center</Text>
                    </View>
                    <Text style={styles.title}>
                        {'Common\n'}
                        <Text style={styles.titleAccent}>questions.</Text>
                    </Text>
                    <Text style={styles.subtitle}>
                        Everything you need to know before you ride.
                    </Text>
                </View>

                {/* ── FAQ accordion (single panel, whyCard pattern) ── */}
                <View style={styles.panel}>
                    {items.map((item, index) => {
                        const isOpen = openItem === index;
                        const isLast = index === items.length - 1;
                        return (
                            <Pressable
                                key={item.question}
                                style={[
                                    styles.faqRow,
                                    !isLast && styles.faqRowBorder,
                                    isOpen && styles.faqRowOpen,
                                ]}
                                onPress={() => setOpenItem(isOpen ? -1 : index)}
                            >
                                <View style={styles.faqHeader}>
                                    <View style={[styles.whyDot, isOpen && styles.whyDotActive]} />
                                    <Text style={[styles.question, isOpen && styles.questionOpen]}>
                                        {item.question}
                                    </Text>
                                    <Text style={[styles.toggle, isOpen && styles.toggleOpen]}>
                                        {isOpen ? '−' : '+'}
                                    </Text>
                                </View>
                                {isOpen && (
                                    <Text style={styles.answer}>{item.answer}</Text>
                                )}
                            </Pressable>
                        );
                    })}
                </View>

                {/* ── Still have questions notice (mirrors noticeCard) ── */}
                <View style={styles.noticeCard}>
                    <View style={styles.noticeTagRow}>
                        <Text style={styles.noticeTag}>Still have questions?</Text>
                        <View style={styles.noticeTagLine} />
                    </View>
                    <Text style={styles.noticeTitle}>We're here to help.</Text>
                    <Text style={styles.noticeText}>
                        Reach us on WhatsApp or by phone — we reply fast and can handle large group bookings directly.
                    </Text>
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

    // ── Hero (identical to all other screens)
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

    // ── FAQ panel (mirrors whyCard)
    panel: {
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.lg,
        overflow: 'hidden',
    },
    faqRow: {
        paddingVertical: 18,
        paddingHorizontal: SPACING.lg,
    },
    faqRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#1A1E14',
    },
    faqRowOpen: {
        backgroundColor: C.accentDim,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
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
    question: {
        flex: 1,
        color: C.muted,
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    },
    questionOpen: {
        color: C.white,
        fontWeight: '500',
    },
    toggle: {
        color: C.faint,
        fontSize: 20,
        fontWeight: '300',
        lineHeight: 22,
        width: 20,
        textAlign: 'center',
    },
    toggleOpen: {
        color: C.accent,
    },
    answer: {
        color: C.muted,
        fontSize: 13,
        fontWeight: '300',
        lineHeight: 21,
        marginTop: 12,
        marginLeft: 20,
        paddingLeft: 14,
        borderLeftWidth: 1,
        borderLeftColor: C.borderGlow,
    },

    // ── Notice card (identical to ContactScreen / HomeScreen)
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

import { StyleSheet, View, ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * PageBackground
 * Drop-in replacement for the plain <View style={styles.page}> on every screen.
 * Renders the dark base + two radial-ish green glows that mirror the home screen hero.
 *
 * Usage:
 *   <PageBackground>
 *       <ScrollView>...</ScrollView>
 *   </PageBackground>
 */
export default function PageBackground({ children, style }: ViewProps) {
    return (
        <View style={[styles.root, style]}>
            {/* Top-right glow */}
            <LinearGradient
                colors={['#2A4A1A', '#0C0F0A00']}
                start={{ x: 0.8, y: 0 }}
                end={{ x: 0.46, y: 0.2 }}
                style={styles.glowTopRight}
                pointerEvents="none"
            />
            {/* Bottom-left glow */}
            <LinearGradient
                colors={['#1A2A0F', '#0C0F0A00']}
                start={{ x: 0, y: 1 }}
                end={{ x: 0.4, y: 0.7 }}
                style={styles.glowBottomLeft}
                pointerEvents="none"
            />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#0C0F0A',
    },
    glowTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: '85%',
        height: '45%',
        opacity: 0.85,
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '65%',
        height: '55%',
        opacity: 0.6,
    },
});

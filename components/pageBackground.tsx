import { StyleSheet, useWindowDimensions, View, ViewProps } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const ACCENT = '#8DBF5B';

/** Soft round glow, like the radial gradients on the website. */
function Glow({ id, size, strength, style }: { id: string; size: number; strength: number; style: object }) {
    return (
        <Svg width={size} height={size} style={[styles.glow, style]} pointerEvents="none">
            <Defs>
                <RadialGradient id={id} cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={ACCENT} stopOpacity={strength} />
                    <Stop offset="0.45" stopColor={ACCENT} stopOpacity={strength * 0.35} />
                    <Stop offset="1" stopColor={ACCENT} stopOpacity={0} />
                </RadialGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
        </Svg>
    );
}

/**
 * Dark page with a green glow top right and a fainter one bottom left.
 * Wrap every screen in it:  <PageBackground><ScrollView>…</ScrollView></PageBackground>
 */
export default function PageBackground({ children, style }: ViewProps) {
    const { width } = useWindowDimensions();
    const top = Math.round(width * 1.5);
    const bottom = Math.round(width * 1.2);

    return (
        <View style={[styles.root, style]}>
            <Glow id="glowTop" size={top} strength={0.2} style={{ top: -top * 0.45, right: -top * 0.4 }} />
            <Glow id="glowBottom" size={bottom} strength={0.1} style={{ bottom: -bottom * 0.5, left: -bottom * 0.5 }} />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#0C0F0A',
        overflow: 'hidden',
    },
    glow: {
        position: 'absolute',
    },
});

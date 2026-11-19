import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

const ACCENT = '#8DBF5B';
const WHITE = '#F0EDE6';

/** The line-art bike with glow and rings from the website hero. */
export default function BikeArt({ width }: { width: number }) {
    return (
        <Svg width={width} height={Math.round(width * 0.86)} viewBox="0 0 640 550">
            <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={ACCENT} stopOpacity={0.3} />
                    <Stop offset="0.55" stopColor={ACCENT} stopOpacity={0.09} />
                    <Stop offset="1" stopColor={ACCENT} stopOpacity={0} />
                </RadialGradient>
            </Defs>

            <Circle cx="320" cy="275" r="272" fill="url(#glow)" />
            <Circle cx="320" cy="275" r="268" stroke={ACCENT} strokeOpacity={0.16} strokeWidth={1.5} fill="none" />
            <Circle cx="320" cy="275" r="206" stroke={ACCENT} strokeOpacity={0.32} strokeWidth={1.5} strokeDasharray="4 9" fill="none" />

            <G transform="translate(51 76) scale(0.84)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 384h600" stroke={ACCENT} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="2 14" />

                {/* Wheels */}
                <Path d="M150 164v212M44 270h212M75 195l150 150M75 345l150-150" stroke={WHITE} strokeOpacity={0.28} strokeWidth={2} />
                <Path d="M490 164v212M384 270h212M415 195l150 150M415 345l150-150" stroke={WHITE} strokeOpacity={0.28} strokeWidth={2} />
                <Circle cx="150" cy="270" r="108" stroke={WHITE} strokeWidth={9} />
                <Circle cx="490" cy="270" r="108" stroke={WHITE} strokeWidth={9} />

                {/* Frame, fork and handlebar */}
                <Path d="M150 270h140L252 138 150 270" stroke={ACCENT} strokeWidth={9} />
                <Path d="M252 138l181-10M290 270l157-108" stroke={ACCENT} strokeWidth={9} />
                <Path d="M424 104l66 166" stroke={ACCENT} strokeWidth={9} />
                <Path d="M246 116l6 22" stroke={ACCENT} strokeWidth={9} />
                <Path d="M424 104l-6-14h34c14 0 20 8 18 18" stroke={ACCENT} strokeWidth={9} />

                {/* Saddle, crank and hubs */}
                <Path d="M216 112h56" stroke={WHITE} strokeWidth={14} />
                <Circle cx="290" cy="270" r="20" stroke={WHITE} strokeWidth={7} fill="#0C0F0A" />
                <Path d="M290 270l26 30M304 300h24" stroke={ACCENT} strokeWidth={9} />
                <Circle cx="150" cy="270" r="7" fill={ACCENT} />
                <Circle cx="490" cy="270" r="7" fill={ACCENT} />
            </G>
        </Svg>
    );
}

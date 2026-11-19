import { OpeningHour } from '../types';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "€10" for symbols, "10 DKK" for currency codes. Same rule as the website. */
export function formatPrice(price: string | number | undefined | null, currency = '€') {
    const amount = typeof price === 'number' ? price : parseFloat(String(price ?? '').replace(',', '.'));
    if (!Number.isFinite(amount)) return '';
    const text = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
    return /^[^\w\s]+$/.test(currency) ? `${currency}${text}` : `${text} ${currency}`;
}

/** Calendar date as the user picked it (YYYY-MM-DD), not shifted to UTC. */
export function toIsoDate(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Day and time at the shop in Copenhagen, whatever time zone the phone is in. */
function shopNow() {
    try {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/Copenhagen',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(new Date());
        const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
        const day = get('weekday').toLowerCase();
        const hour = get('hour') === '24' ? '00' : get('hour');
        if (DAYS.includes(day) && hour && get('minute')) {
            return { day, time: `${hour}:${get('minute')}` };
        }
    } catch {
        // Older JavaScript engines without time zone data: use the phone's clock.
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return { day: DAYS[now.getDay()], time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

export type OpenStatus = { open: boolean; text: string; today: string };

export function getOpenStatus(hours?: Record<string, OpeningHour>): OpenStatus | null {
    const now = shopNow();
    const today = hours?.[now.day];
    if (!hours || !today) return null;

    if (!today.closed && now.time >= today.open && now.time < today.close) {
        return { open: true, text: `Open now until ${today.close}`, today: now.day };
    }
    if (!today.closed && now.time < today.open) {
        return { open: false, text: `Closed now, opens today at ${today.open}`, today: now.day };
    }
    const start = DAYS.indexOf(now.day);
    for (let i = 1; i <= 7; i++) {
        const name = DAYS[(start + i) % 7];
        const next = hours[name];
        if (next && !next.closed) {
            const when = i === 1 ? 'tomorrow' : capitalize(name);
            return { open: false, text: `Closed now, opens ${when} at ${next.open}`, today: now.day };
        }
    }
    return { open: false, text: 'Closed now', today: now.day };
}

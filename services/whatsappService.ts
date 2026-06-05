import * as Linking from 'expo-linking';
import { BookingPayload } from '../types';

export function createWhatsAppBookingText(booking: BookingPayload) {
  return [
    'Hello, I want to book a bike.',
    '',
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone || '-'}`,
    `Bike Type: ${booking.bike_type}`,
    `Quantity: ${booking.quantity}`,
    `Start Date: ${booking.start_date}`,
    `End Date: ${booking.end_date}`,
    `Notes: ${booking.notes || '-'}`,
  ].join('\n');
}

export async function openWhatsApp(phoneWithoutPlus: string, message: string) {
  const url = `https://wa.me/${phoneWithoutPlus}?text=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
}
// services/api.ts
import { AppSettings, Availability, Bike, BookingPayload, BookingResult, FaqItem } from '../types';

const BASE_URL = 'https://www.rentbike.nu/wp-json/rentbike/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    // WordPress answers errors as JSON: { code, message, data }. Show only the message.
    const errorText = await response.text();
    let message = errorText;
    try {
      message = JSON.parse(errorText)?.message || errorText;
    } catch {
      // not JSON, keep the raw text
    }
    throw new Error(message || 'Something went wrong. Please try again.');
  }

  return response.json();
}

export const api = {
  getSettings: () => request<AppSettings>('/settings'),
  getBikes: () => request<Bike[]>('/bikes'),
  getFaq: () => request<FaqItem[]>('/faq'),
  getAvailability: (startDate: string, endDate: string) =>
    request<Availability[]>(`/availability?start_date=${startDate}&end_date=${endDate}`),
  createBooking: (payload: BookingPayload) =>
    request<BookingResult>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
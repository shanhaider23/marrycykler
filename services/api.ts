// services/api.ts
import { AppSettings, Bike, BookingPayload, FaqItem } from '../types';

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
    const errorText = await response.text();
    throw new Error(errorText || 'API request failed');
  }

  return response.json();
}

export const api = {
  getSettings: () => request<AppSettings>('/settings'),
  getBikes: () => request<Bike[]>('/bikes'),
  getFaq: () => request<FaqItem[]>('/faq'),
  createBooking: (payload: BookingPayload) =>
    request<{ success: boolean; booking_id: number; message: string }>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
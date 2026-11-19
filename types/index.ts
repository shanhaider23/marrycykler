// types/index.ts
export type OpeningHour = {
  closed?: boolean;
  open: string;
  close: string;
};

export type AppSettings = {
  business_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  phone: string;
  whatsapp: string;
  email: string;
  booking_email: string;
  address: string;
  currency: string;
  notice_banner: string;
  show_banner: boolean;
  features: string[];
  opening_hours: Record<string, OpeningHour>;
  // Added by the website plugin (version 2). Missing on older plugin versions.
  about_text?: string;
  location_note?: string;
  gallery?: string[];
  play_url?: string;
  reviews_url?: string;
  /** True when the shop takes online payment (link sent after confirmation). */
  payments_online?: boolean;
};

export type Bike = {
  id: number;
  name: string;
  description: string;
  price_per_day: string;
  quantity: string;
  image?: string | false;
  active: boolean;
};

export type FaqItem = {
  id: number;
  question: string;
  answer: string;
};

export type Availability = {
  name: string;
  /** Bikes left for the chosen dates. null means no stock limit is set. */
  available: number | null;
};

export type BookingResult = {
  success: boolean;
  booking_id: number;
  message: string;
  days?: number;
  total?: string;
};

export type BookingPayload = {
  name: string;
  email: string;
  phone?: string;
  bike_type: string;
  quantity: number;
  start_date: string;
  end_date: string;
  notes?: string;
  source?: 'app' | 'website';
};

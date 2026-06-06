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

export type BookingPayload = {
  name: string;
  email: string;
  phone?: string;
  bike_type: string;
  quantity: number;
  start_date: string;
  end_date: string;
  notes?: string;
};

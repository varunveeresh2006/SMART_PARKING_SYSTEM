import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ParkingStatus = 'available' | 'occupied' | 'reserved' | 'not_available';
export type SlotType = 'regular' | 'vip' | 'handicapped' | 'ev';
export type BookingStatus = 'reserved' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type NotificationType = 'info' | 'warning' | 'penalty' | 'success' | 'alert';

export interface ParkingFloor {
  id: string;
  floor_code: string;
  floor_name: string;
  total_slots: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ParkingSlot {
  id: string;
  floor_id: string;
  slot_number: string;
  slot_type: SlotType;
  status: ParkingStatus;
  is_active: boolean;
  created_at: string;
  parking_floors?: ParkingFloor;
}

export interface Vehicle {
  id: string;
  user_id: string;
  vehicle_number: string;
  vehicle_type: string;
  brand: string;
  model: string;
  color: string;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  slot_id: string;
  vehicle_id: string | null;
  vehicle_number: string;
  status: BookingStatus;
  booked_duration_hours: number;
  entry_time: string | null;
  exit_time: string | null;
  expected_exit_time: string | null;
  base_rate: number;
  created_at: string;
  updated_at: string;
  parking_slots?: ParkingSlot & { parking_floors?: ParkingFloor };
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  base_amount: number;
  extra_time_amount: number;
  penalty_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  transaction_id: string;
  paid_at: string | null;
  created_at: string;
  bookings?: Booking;
}

export interface Notification {
  id: string;
  user_id: string;
  booking_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface Penalty {
  id: string;
  booking_id: string;
  user_id: string;
  overstay_minutes: number;
  penalty_amount: number;
  reason: string;
  is_paid: boolean;
  created_at: string;
  bookings?: Booking;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  created_at: string;
  updated_at: string;
}

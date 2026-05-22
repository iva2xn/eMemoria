/**
 * Hand-written database types matching the migration schema.
 * Replace with generated types from `supabase gen types typescript` once
 * the project is linked to a Supabase project.
 */

export type UserRole = 'client' | 'admin'
export type SlotStatus = 'available' | 'reserved' | 'occupied'
export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'gcash' | 'bdo_bank' | 'bpi_bank' | 'cash'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface ColumbariumSlot {
  id: string
  row_number: number
  col_number: number
  slot_code: string
  price: number
  status: SlotStatus
  // Occupant details — only present when status = 'occupied'
  occupant_name: string | null
  occupant_birth_date: string | null
  occupant_death_date: string | null
  occupant_age: number | null
  occupant_photo_url: string | null
  occupant_notes: string | null
  // Reservation
  reserved_by_user_id: string | null
  reserved_at: string | null
  created_at: string
  updated_at: string
}

export interface Inquiry {
  id: string
  name: string
  email: string
  subject: string
  message: string
  is_read: boolean
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  package_name: string
  price: number
  status: BookingStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string
  booking_id: string | null
  product_type: string
  product_ref: string | null
  method: PaymentMethod
  reference_number: string | null
  amount: number
  receipt_file_path: string | null
  status: PaymentStatus
  notes: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface Obituary {
  id: string
  full_name: string
  birth_date: string | null
  death_date: string | null
  age: number | null
  image_path: string
  is_published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// Convenience type for the full DB shape (used by createClient generics)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      columbarium_slots: { Row: ColumbariumSlot; Insert: Omit<ColumbariumSlot, 'id' | 'created_at' | 'updated_at'>; Update: Partial<ColumbariumSlot> }
      inquiries: { Row: Inquiry; Insert: Omit<Inquiry, 'id' | 'is_read' | 'created_at'>; Update: Partial<Inquiry> }
      bookings: { Row: Booking; Insert: Omit<Booking, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Booking> }
      payments: { Row: Payment; Insert: Omit<Payment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Payment> }
      obituaries: { Row: Obituary; Insert: Omit<Obituary, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Obituary> }
    }
    Enums: {
      user_role: UserRole
      slot_status: SlotStatus
      booking_status: BookingStatus
      payment_status: PaymentStatus
      payment_method: PaymentMethod
    }
  }
}

export type UserRole = 'client' | 'admin' | 'staff'
export type SlotStatus = 'available' | 'reserved' | 'occupied'
export type BookingStatus = 'pending' | 'active' | 'completed' | 'cancelled'
export type PaymentStatus = 'pending' | 'approved' | 'rejected'
export type PaymentMethod = 'gcash' | 'bdo_bank' | 'bpi_bank' | 'cash'
export type DocumentSubmissionStatus = 'pending_review' | 'approved' | 'rejected'

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
  user_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  package_name: string
  price: number
  status: BookingStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  user_id: string | null
  booking_id: string | null
  document_submission_id: string | null
  // Guest fields (when user_id is null)
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
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
  venue_address: string | null
  contact_number: string | null
  submitter_name: string | null
  submitter_email: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DocumentSubmission {
  id: string
  user_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  product_type: string
  product_ref: string | null
  product_label: string | null
  product_price: number | null
  doc_death_certificate: string | null
  doc_barangay_indigency: string | null
  doc_valid_id: string | null
  doc_medico_legal: string | null
  status: DocumentSubmissionStatus
  rejection_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  notified_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentInfo {
  id: 1
  gcash_name: string
  gcash_number: string
  gcash_qr_path: string | null
  bank1_name: string
  bank1_account_name: string
  bank1_account_number: string
  bank2_name: string
  bank2_account_name: string
  bank2_account_number: string
  bank3_name: string
  bank3_account_name: string
  bank3_account_number: string
  bank4_name: string
  bank4_account_name: string
  bank4_account_number: string
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
      document_submissions: { Row: DocumentSubmission; Insert: Omit<DocumentSubmission, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DocumentSubmission> }
      payment_info: { Row: PaymentInfo; Insert: never; Update: Partial<Omit<PaymentInfo, 'id' | 'updated_at'>> }
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

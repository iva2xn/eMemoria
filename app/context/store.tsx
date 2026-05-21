'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface User {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
}

export interface ColumbariumSlot {
  id: string // e.g., 'A-101'
  level: number // 1 to 5
  status: 'available' | 'reserved' | 'occupied'
  deceasedName?: string
  bornDate?: string
  diedDate?: string
  reservedBy?: string // User ID
  reservedAt?: string
  price: number
}

export interface Booking {
  id: string
  userId: string
  userName: string
  slotId?: string
  packageName: string
  price: number
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  createdAt: string
}

export interface Payment {
  id: string
  bookingId?: string
  userId: string
  userName: string
  amount: number
  method: 'GCash' | 'Bank Transfer' | 'Cash'
  referenceNumber?: string
  receiptFileName?: string
  status: 'pending' | 'approved'
  createdAt: string
  notes?: string
}

export interface Inquiry {
  id: string
  name: string
  email: string
  subject: string
  message: string
  createdAt: string
  status: 'unread' | 'replied'
}

interface StoreContextType {
  user: User | null
  usersList: User[]
  slots: ColumbariumSlot[]
  bookings: Booking[]
  payments: Payment[]
  inquiries: Inquiry[]
  login: (email: string, password: string) => { success: boolean; message: string }
  register: (name: string, email: string, password: string) => { success: boolean; message: string }
  logout: () => void
  recoverPassword: (email: string) => { success: boolean; message: string }
  reserveSlot: (slotId: string, packageName: string) => { success: boolean; message: string }
  submitPayment: (bookingId: string, amount: number, method: 'GCash' | 'Bank Transfer', refNum: string, fileName?: string) => { success: boolean; message: string }
  recordCashPayment: (userId: string, amount: number, notes?: string) => { success: boolean; message: string }
  approvePayment: (paymentId: string) => void
  submitInquiry: (name: string, email: string, subject: string, message: string) => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

const INITIAL_SLOTS: ColumbariumSlot[] = []

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usersList, setUsersList] = useState<User[]>([])
  const [slots, setSlots] = useState<ColumbariumSlot[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('gfs_user')
      const storedUsersList = localStorage.getItem('gfs_users_list')
      const storedSlots = localStorage.getItem('gfs_slots')
      const storedBookings = localStorage.getItem('gfs_bookings')
      const storedPayments = localStorage.getItem('gfs_payments')
      const storedInquiries = localStorage.getItem('gfs_inquiries')

      if (storedUser) setUser(JSON.parse(storedUser))
      
      // Seed default accounts if empty
      if (storedUsersList) {
        setUsersList(JSON.parse(storedUsersList))
      } else {
        const defaultUsers: User[] = [
          { id: 'usr-1', name: 'Demo Client', email: 'client@gfs.com', role: 'user' },
          { id: 'usr-2', name: 'Admin Staff', email: 'admin@gfs.com', role: 'admin' },
        ]
        setUsersList(defaultUsers)
        localStorage.setItem('gfs_users_list', JSON.stringify(defaultUsers))
      }

      if (storedSlots) {
        setSlots(JSON.parse(storedSlots))
      } else {
        setSlots(INITIAL_SLOTS)
        localStorage.setItem('gfs_slots', JSON.stringify(INITIAL_SLOTS))
      }

      if (storedBookings) {
        setBookings(JSON.parse(storedBookings))
      } else {
        // Initial mock bookings
        const defaultBookings: Booking[] = [
          {
            id: 'bk-101',
            userId: 'usr-1',
            userName: 'Demo Client',
            packageName: 'Standard Package',
            price: 0,
            status: 'active',
            createdAt: '2026-05-10T09:30:00Z',
          }
        ]
        setBookings(defaultBookings)
        localStorage.setItem('gfs_bookings', JSON.stringify(defaultBookings))
      }

      if (storedPayments) {
        setPayments(JSON.parse(storedPayments))
      } else {
        const defaultPayments: Payment[] = [
          {
            id: 'pay-201',
            bookingId: 'bk-101',
            userId: 'usr-1',
            userName: 'Demo Client',
            amount: 0,
            method: 'GCash',
            referenceNumber: '8810294819',
            receiptFileName: 'gcash_receipt.png',
            status: 'approved',
            createdAt: '2026-05-10T10:00:00Z',
          }
        ]
        setPayments(defaultPayments)
        localStorage.setItem('gfs_payments', JSON.stringify(defaultPayments))
      }

      if (storedInquiries) {
        setInquiries(JSON.parse(storedInquiries))
      } else {
        const defaultInquiries: Inquiry[] = [
          {
            id: 'inq-1',
            name: 'Juan Perez',
            email: 'juan@example.com',
            subject: 'Standard Package Viewing Inquiry',
            message: 'Good day! I would like to inquire about the standard funeral package inclusions and casket viewing setup options at the Sariaya Main Branch. Thank you!',
            createdAt: '2026-05-20T15:30:00Z',
            status: 'unread',
          }
        ]
        setInquiries(defaultInquiries)
        localStorage.setItem('gfs_inquiries', JSON.stringify(defaultInquiries))
      }
    } catch (e) {
      console.error('Error seeding localStorage database', e)
    }
    setIsLoaded(true)
  }, [])

  // Save triggers
  const saveUser = (u: User | null) => {
    setUser(u)
    if (u) localStorage.setItem('gfs_user', JSON.stringify(u))
    else localStorage.removeItem('gfs_user')
  }

  const saveSlots = (newSlots: ColumbariumSlot[]) => {
    setSlots(newSlots)
    localStorage.setItem('gfs_slots', JSON.stringify(newSlots))
  }

  const saveBookings = (newBookings: Booking[]) => {
    setBookings(newBookings)
    localStorage.setItem('gfs_bookings', JSON.stringify(newBookings))
  }

  const savePayments = (newPayments: Payment[]) => {
    setPayments(newPayments)
    localStorage.setItem('gfs_payments', JSON.stringify(newPayments))
  }

  const saveInquiries = (newInq: Inquiry[]) => {
    setInquiries(newInq)
    localStorage.setItem('gfs_inquiries', JSON.stringify(newInq))
  }

  const login = (email: string, password: string) => {
    // Simple email matching for mock logins
    const foundUser = usersList.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (foundUser) {
      saveUser(foundUser)
      return { success: true, message: `Welcome back, ${foundUser.name}!` }
    }
    return { success: false, message: 'Invalid credentials. Use client@gfs.com or admin@gfs.com for the demo!' }
  }

  const register = (name: string, email: string, password: string) => {
    if (usersList.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'Email address already registered.' }
    }
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role: 'user'
    }
    const newList = [...usersList, newUser]
    setUsersList(newList)
    localStorage.setItem('gfs_users_list', JSON.stringify(newList))
    saveUser(newUser)
    return { success: true, message: 'Registration successful!' }
  }

  const logout = () => {
    saveUser(null)
  }

  const recoverPassword = (email: string) => {
    if (usersList.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: true, message: 'Reset instruction email has been sent to your registered address!' }
    }
    return { success: false, message: 'Email not found in our records.' }
  }

  const reserveSlot = (slotId: string, packageName: string) => {
    return { success: false, message: 'Columbarium reservations are suspended.' }
  }

  const submitPayment = (
    bookingId: string,
    amount: number,
    method: 'GCash' | 'Bank Transfer',
    refNum: string,
    fileName?: string
  ) => {
    if (!user) return { success: false, message: 'Not authenticated.' }

    // Verify booking
    const bk = bookings.find(b => b.id === bookingId)
    if (!bk) return { success: false, message: 'Booking not found.' }

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      bookingId,
      userId: user.id,
      userName: user.name,
      amount,
      method,
      referenceNumber: refNum,
      receiptFileName: fileName || 'payment_proof.jpg',
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    savePayments([...payments, newPayment])

    return { success: true, message: 'Payment proof submitted successfully! Waiting for staff approval.' }
  }

  const recordCashPayment = (userId: string, amount: number, notes?: string) => {
    const targetUser = usersList.find(u => u.id === userId)
    if (!targetUser) return { success: false, message: 'User not found.' }

    // Find the user's pending booking
    const userBooking = bookings.find(b => b.userId === userId && b.status === 'pending')

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      bookingId: userBooking?.id,
      userId,
      userName: targetUser.name,
      amount,
      method: 'Cash',
      status: 'approved',
      createdAt: new Date().toISOString(),
      notes: notes || 'Direct cash payment recorded by admin.'
    }

    savePayments([...payments, newPayment])

    // Automatically activate booking if total matches
    if (userBooking) {
      const updatedBookings = bookings.map(b => 
        b.id === userBooking.id ? { ...b, status: 'active' as const } : b
      )
      saveBookings(updatedBookings)

      if (userBooking.slotId) {
        const updatedSlots = slots.map(s => 
          s.id === userBooking.slotId ? { ...s, status: 'occupied' as const, deceasedName: 'Awaiting Registration' } : s
        )
        saveSlots(updatedSlots)
      }
    }

    return { success: true, message: 'Cash payment recorded successfully!' }
  }

  const approvePayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId)
    if (!payment) return

    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, status: 'approved' as const } : p
    )
    savePayments(updatedPayments)

    // Activate the booking
    if (payment.bookingId) {
      const updatedBookings = bookings.map(b => 
        b.id === payment.bookingId ? { ...b, status: 'active' as const } : b
      )
      saveBookings(updatedBookings)

      const bk = bookings.find(b => b.id === payment.bookingId)
      if (bk && bk.slotId) {
        const updatedSlots = slots.map(s => 
          s.id === bk.slotId ? { ...s, status: 'occupied' as const, deceasedName: 'Awaiting Registration' } : s
        )
        saveSlots(updatedSlots)
      }
    }
  }

  const submitInquiry = (name: string, email: string, subject: string, message: string) => {
    const newInq: Inquiry = {
      id: `inq-${Date.now()}`,
      name,
      email,
      subject,
      message,
      createdAt: new Date().toISOString(),
      status: 'unread'
    }
    saveInquiries([...inquiries, newInq])
  }

  return (
    <StoreContext.Provider
      value={{
        user,
        usersList,
        slots,
        bookings,
        payments,
        inquiries,
        login,
        register,
        logout,
        recoverPassword,
        reserveSlot,
        submitPayment,
        recordCashPayment,
        approvePayment,
        submitInquiry
      }}
    >
      {isLoaded && children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}

import { createContext } from 'react'
import type {
  Course,
  Enrollment,
  Location,
  Payment,
  RecentActivity,
  Student,
  StudentStatus,
  EnrollmentStatus,
  PaymentStatus,
} from '../services/mockData'

export type ColgoState = {
  students: Student[]
  payments: Payment[]
  enrollments: Enrollment[]
  recentActivity: RecentActivity[]
}

export type ColgoActions = {
  createStudent: (student: Student) => void
  setStudentStatus: (studentId: string, status: StudentStatus) => void
  setPaymentStatus: (paymentId: string, status: PaymentStatus) => void
  setEnrollmentStatus: (enrollmentId: string, status: EnrollmentStatus) => void
}

export type ColgoStore = ColgoState & {
  courses: Course[]
  locations: Location[]
  actions: ColgoActions
}

export const ColgoContext = createContext<ColgoStore | null>(null)


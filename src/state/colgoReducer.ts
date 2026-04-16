import type {
  Enrollment,
  EnrollmentStatus,
  Payment,
  PaymentStatus,
  RecentActivity,
  Student,
  StudentStatus,
} from '../services/mockData'
import { mockDB } from '../services/mockData'

type State = {
  students: Student[]
  payments: Payment[]
  enrollments: Enrollment[]
  recentActivity: RecentActivity[]
}

type Action =
  | { type: 'STUDENT/SET_STATUS'; payload: { studentId: string; status: StudentStatus } }
  | { type: 'STUDENT/CREATE'; payload: { student: Student } }
  | { type: 'PAYMENT/SET_STATUS'; payload: { paymentId: string; status: PaymentStatus } }
  | { type: 'ENROLLMENT/SET_STATUS'; payload: { enrollmentId: string; status: EnrollmentStatus } }
  | { type: 'ACTIVITY/PUSH'; payload: { activity: RecentActivity } }

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function nowISO() {
  return new Date().toISOString()
}

function findEnrollment(enrollments: Enrollment[], studentName: string, courseTitle: string) {
  return enrollments.find((e) => e.studentName === studentName && e.courseTitle === courseTitle) || null
}

export const initialColgoState: State = {
  students: mockDB.students.map((s) => ({ ...s })),
  payments: mockDB.payments.map((p) => ({ ...p })),
  enrollments: mockDB.enrollments.map((e) => ({ ...e })),
  recentActivity: mockDB.recentActivity.map((a) => ({ ...a })),
}

export function colgoReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'STUDENT/SET_STATUS': {
      const { studentId, status } = action.payload
      const nextStudents = state.students.map((s) => (s.id === studentId ? { ...s, status } : s))

      // Simulación de sincronía: si un estudiante queda "Inactivo", cancelamos sus matrículas activas.
      const inactiveStudentName = state.students.find((s) => s.id === studentId)?.name
      const nextEnrollments =
        inactiveStudentName && status === 'Inactivo'
          ? state.enrollments.map((e) =>
              e.studentName === inactiveStudentName ? { ...e, status: 'Cancelada' as EnrollmentStatus } : e,
            )
          : state.enrollments

      const student = nextStudents.find((s) => s.id === studentId)
      const activity: RecentActivity = {
        id: uid('act'),
        kind: 'Matrícula',
        title: 'Actualización de estado',
        detail: `${student?.name ?? 'Estudiante'} cambió a ${status}.`,
        createdAt: nowISO(),
      }

      return { ...state, students: nextStudents, enrollments: nextEnrollments, recentActivity: [activity, ...state.recentActivity] }
    }

    case 'PAYMENT/SET_STATUS': {
      const { paymentId, status } = action.payload
      const payment = state.payments.find((p) => p.id === paymentId)
      if (!payment) return state

      const nextPayments = state.payments.map((p) => (p.id === paymentId ? { ...p, status } : p))

      // Sincronía: al aprobar un pago, marcamos la matrícula como Activa (si estaba Pendiente).
      // Al rechazar, cancelamos la matrícula (si estaba Pendiente o Activa).
      const relatedEnrollment = findEnrollment(state.enrollments, payment.studentName, payment.courseTitle)
      const nextEnrollments = relatedEnrollment
        ? state.enrollments.map((e) => {
            if (e.id !== relatedEnrollment.id) return e
            if (status === 'Aprobado') {
              return e.status === 'Pendiente' ? { ...e, status: 'Activa' as EnrollmentStatus } : e
            }
            if (status === 'Rechazado') {
              return e.status === 'Pendiente' || e.status === 'Activa' ? { ...e, status: 'Cancelada' as EnrollmentStatus } : e
            }
            if (status === 'Pendiente') {
              return e.status === 'Activa' ? { ...e, status: 'Pendiente' as EnrollmentStatus } : e
            }
            return e
          })
        : state.enrollments

      const activity: RecentActivity = {
        id: uid('act'),
        kind: 'Pago',
        title: `Pago ${status === 'Aprobado' ? 'aprobado' : status === 'Rechazado' ? 'rechazado' : 'marcado como pendiente'}`,
        detail: `${payment.studentName} · ${payment.courseTitle}.`,
        createdAt: nowISO(),
      }

      return { ...state, payments: nextPayments, enrollments: nextEnrollments, recentActivity: [activity, ...state.recentActivity] }
    }

    case 'ENROLLMENT/SET_STATUS': {
      const { enrollmentId, status } = action.payload
      const relatedEnrollment = state.enrollments.find((e) => e.id === enrollmentId)
      if (!relatedEnrollment) return state

      const nextEnrollments = state.enrollments.map((e) => (e.id === enrollmentId ? { ...e, status } : e))

      // Sincronía simulada: cambiar matrícula a "Activa" sugiere que el pago está "Aprobado".
      // Si se cancela, el pago pasa a "Rechazado" (si estaba pendiente/aprobado).
      const nextPayments = state.payments.map((p) => {
        if (p.studentName !== relatedEnrollment.studentName || p.courseTitle !== relatedEnrollment.courseTitle) return p
        if (status === 'Activa') {
          return p.status === 'Pendiente' ? { ...p, status: 'Aprobado' as PaymentStatus } : p
        }
        if (status === 'Pendiente') {
          return p.status === 'Aprobado' || p.status === 'Rechazado' ? { ...p, status: 'Pendiente' as PaymentStatus } : p
        }
        if (status === 'Cancelada') {
          return p.status === 'Pendiente' || p.status === 'Aprobado' ? { ...p, status: 'Rechazado' as PaymentStatus } : p
        }
        return p
      })

      const activity: RecentActivity = {
        id: uid('act'),
        kind: 'Matrícula',
        title: 'Estado de matrícula actualizado',
        detail: `${relatedEnrollment.studentName} · ${relatedEnrollment.courseTitle} => ${status}.`,
        createdAt: nowISO(),
      }

      return { ...state, enrollments: nextEnrollments, payments: nextPayments, recentActivity: [activity, ...state.recentActivity] }
    }

    case 'ACTIVITY/PUSH': {
      return { ...state, recentActivity: [action.payload.activity, ...state.recentActivity] }
    }

    case 'STUDENT/CREATE': {
      const newStudent = action.payload.student
      const activity: RecentActivity = {
        id: uid('act'),
        kind: 'Estudiante',
        title: 'Nuevo estudiante registrado',
        detail: `${newStudent.name} ha sido registrado.`,
        createdAt: nowISO(),
      }
      return { ...state, students: [newStudent, ...state.students], recentActivity: [activity, ...state.recentActivity] }
    }

    default:
      return state
  }
}


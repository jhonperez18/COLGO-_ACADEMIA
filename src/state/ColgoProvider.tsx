import { useMemo, useReducer, type ReactNode } from 'react'
import { colgoReducer, initialColgoState } from './colgoReducer'
import { mockDB } from '../services/mockData'
import { ColgoContext, type ColgoActions, type ColgoStore } from './colgoContext'
import type { Student } from '../services/mockData'

export function ColgoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(colgoReducer, initialColgoState)

  const actions: ColgoActions = useMemo(
    () => ({
      createStudent: (student: Student) =>
        dispatch({ type: 'STUDENT/CREATE', payload: { student } }),
      setStudentStatus: (studentId, status) =>
        dispatch({ type: 'STUDENT/SET_STATUS', payload: { studentId, status } }),
      setPaymentStatus: (paymentId, status) =>
        dispatch({ type: 'PAYMENT/SET_STATUS', payload: { paymentId, status } }),
      setEnrollmentStatus: (enrollmentId, status) =>
        dispatch({ type: 'ENROLLMENT/SET_STATUS', payload: { enrollmentId, status } }),
    }),
    [],
  )

  const value: ColgoStore = useMemo(
    () => ({
      ...state,
      courses: mockDB.courses,
      locations: mockDB.locations,
      actions,
    }),
    [actions, state],
  )

  return <ColgoContext.Provider value={value}>{children}</ColgoContext.Provider>
}


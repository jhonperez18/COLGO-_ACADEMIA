import { useContext } from 'react'
import { ColgoContext } from './colgoContext'

export function useColgo() {
  const ctx = useContext(ColgoContext)
  if (!ctx) throw new Error('useColgo debe usarse dentro de ColgoProvider')
  return ctx
}


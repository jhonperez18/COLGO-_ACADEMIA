export type StudentStatus = 'Activo' | 'Pendiente' | 'Inactivo'
export type PaymentStatus = 'Pendiente' | 'Aprobado' | 'Rechazado'
export type EnrollmentStatus = 'Activa' | 'Pendiente' | 'Cancelada'
export type CourseModality = 'Presencial' | 'Virtual'

export type Student = {
  id: string
  name: string
  document: string
  courseTitle: string
  sede: 'Medellín' | 'Bogotá' | 'Virtual'
  status: StudentStatus
}

export type Course = {
  id: string
  title: string
  modality: CourseModality
  level: 'Básico' | 'Intermedio' | 'Avanzado'
  durationWeeks: number
  weeklyHours: number
  description: string
  color: string
}

export type Payment = {
  id: string
  studentName: string
  courseTitle: string
  paymentDate: string // ISO
  amount: number
  status: PaymentStatus
}

export type Enrollment = {
  id: string
  studentName: string
  courseTitle: string
  startDate: string // ISO
  status: EnrollmentStatus
}

export type Location = {
  id: string
  city: 'Medellín' | 'Bogotá' | 'Virtual'
  address: string
  phone: string
  activeCourses: number
  students: number
  color: string
}

export type RecentActivity = {
  id: string
  kind: 'Matrícula' | 'Pago' | 'Curso' | 'Sede'
  title: string
  detail: string
  createdAt: string // ISO
}

export type SearchSuggestion = {
  id: string
  label: string
  description: string
  to: string
  tag: 'Estudiante' | 'Curso' | 'Pago' | 'Sede'
}

const toISO = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString()

const students: Student[] = [
  {
    id: 'stu_001',
    name: 'Mariana Gómez',
    document: '1.045.238.771',
    courseTitle: 'Corte y Confección Básico',
    sede: 'Medellín',
    status: 'Activo',
  },
  {
    id: 'stu_002',
    name: 'Sofía Ríos',
    document: '1.109.882.314',
    courseTitle: 'Patronaje para Iniciantes',
    sede: 'Bogotá',
    status: 'Pendiente',
  },
  {
    id: 'stu_003',
    name: 'Daniela Herrera',
    document: '1.021.773.509',
    courseTitle: 'Moda Sostenible',
    sede: 'Virtual',
    status: 'Activo',
  },
  {
    id: 'stu_004',
    name: 'Valentina Vargas',
    document: '1.096.341.018',
    courseTitle: 'Confección de Blusas',
    sede: 'Medellín',
    status: 'Inactivo',
  },
  {
    id: 'stu_005',
    name: 'Paola Martínez',
    document: '1.145.992.660',
    courseTitle: 'Costura para Niños',
    sede: 'Bogotá',
    status: 'Activo',
  },
  {
    id: 'stu_006',
    name: 'Camila Álvarez',
    document: '1.018.244.991',
    courseTitle: 'Transformación de Ropa',
    sede: 'Virtual',
    status: 'Pendiente',
  },
  {
    id: 'stu_007',
    name: 'Andrea Molina',
    document: '1.082.990.122',
    courseTitle: 'Confección de Pantalones',
    sede: 'Medellín',
    status: 'Activo',
  },
  {
    id: 'stu_008',
    name: 'Laura Duarte',
    document: '1.061.332.778',
    courseTitle: 'Patronaje Avanzado',
    sede: 'Bogotá',
    status: 'Inactivo',
  },
]

const courses: Course[] = [
  {
    id: 'crs_001',
    title: 'Corte y Confección Básico',
    modality: 'Presencial',
    level: 'Básico',
    durationWeeks: 8,
    weeklyHours: 6,
    description: 'Domina el proceso completo: patrones, costura y acabado con acompañamiento experto.',
    color: '#fbbf24',
  },
  {
    id: 'crs_002',
    title: 'Patronaje para Iniciantes',
    modality: 'Virtual',
    level: 'Básico',
    durationWeeks: 6,
    weeklyHours: 4,
    description: 'Aprende a construir patrones base y ajustarlos con técnicas claras y ejercicios guiados.',
    color: '#f59e0b',
  },
  {
    id: 'crs_003',
    title: 'Confección de Blusas',
    modality: 'Presencial',
    level: 'Intermedio',
    durationWeeks: 7,
    weeklyHours: 5,
    description: 'De la medida al resultado: frunces, cierres, cuellos y acabados profesionales.',
    color: '#fbbf24',
  },
  {
    id: 'crs_004',
    title: 'Moda Sostenible',
    modality: 'Virtual',
    level: 'Intermedio',
    durationWeeks: 5,
    weeklyHours: 3,
    description: 'Transforma prendas con enfoque en materiales y técnicas de bajo impacto.',
    color: '#f59e0b',
  },
  {
    id: 'crs_005',
    title: 'Patronaje Avanzado',
    modality: 'Presencial',
    level: 'Avanzado',
    durationWeeks: 9,
    weeklyHours: 6,
    description: 'Modelaje avanzado, tallaje y ajustes para lograr fit perfecto en cada proyecto.',
    color: '#fbbf24',
  },
  {
    id: 'crs_006',
    title: 'Confección de Pantalones',
    modality: 'Virtual',
    level: 'Avanzado',
    durationWeeks: 8,
    weeklyHours: 4,
    description: 'Construcción de patrones, vistas, pretinas y terminaciones con alta precisión.',
    color: '#f59e0b',
  },
]

const payments: Payment[] = [
  {
    id: 'pay_001',
    studentName: 'Mariana Gómez',
    courseTitle: 'Corte y Confección Básico',
    paymentDate: toISO(2026, 3, 7),
    amount: 320000,
    status: 'Aprobado',
  },
  {
    id: 'pay_002',
    studentName: 'Sofía Ríos',
    courseTitle: 'Patronaje para Iniciantes',
    paymentDate: toISO(2026, 3, 9),
    amount: 240000,
    status: 'Pendiente',
  },
  {
    id: 'pay_003',
    studentName: 'Daniela Herrera',
    courseTitle: 'Moda Sostenible',
    paymentDate: toISO(2026, 3, 10),
    amount: 210000,
    status: 'Rechazado',
  },
  {
    id: 'pay_004',
    studentName: 'Paola Martínez',
    courseTitle: 'Costura para Niños',
    paymentDate: toISO(2026, 3, 13),
    amount: 180000,
    status: 'Pendiente',
  },
  {
    id: 'pay_005',
    studentName: 'Camila Álvarez',
    courseTitle: 'Transformación de Ropa',
    paymentDate: toISO(2026, 3, 14),
    amount: 260000,
    status: 'Aprobado',
  },
]

const enrollments: Enrollment[] = [
  {
    id: 'enr_001',
    studentName: 'Mariana Gómez',
    courseTitle: 'Corte y Confección Básico',
    startDate: toISO(2026, 2, 18),
    status: 'Activa',
  },
  {
    id: 'enr_002',
    studentName: 'Sofía Ríos',
    courseTitle: 'Patronaje para Iniciantes',
    startDate: toISO(2026, 3, 1),
    status: 'Pendiente',
  },
  {
    id: 'enr_003',
    studentName: 'Daniela Herrera',
    courseTitle: 'Moda Sostenible',
    startDate: toISO(2026, 3, 2),
    status: 'Activa',
  },
  {
    id: 'enr_004',
    studentName: 'Valentina Vargas',
    courseTitle: 'Confección de Blusas',
    startDate: toISO(2026, 1, 25),
    status: 'Cancelada',
  },
  {
    id: 'enr_005',
    studentName: 'Andrea Molina',
    courseTitle: 'Confección de Pantalones',
    startDate: toISO(2026, 3, 6),
    status: 'Activa',
  },
]

const locations: Location[] = [
  {
    id: 'loc_001',
    city: 'Medellín',
    address: 'Cra. 45 # 12-18, Centro',
    phone: '+57 4 300 1000',
    activeCourses: 7,
    students: 540,
    color: '#fbbf24',
  },
  {
    id: 'loc_002',
    city: 'Bogotá',
    address: 'Cl. 76 # 9-32, Zona Norte',
    phone: '+57 1 310 2200',
    activeCourses: 6,
    students: 465,
    color: '#f59e0b',
  },
  {
    id: 'loc_003',
    city: 'Virtual',
    address: 'Plataforma COLGO Online',
    phone: 'soporte@colgo-academi.co',
    activeCourses: 4,
    students: 280,
    color: '#fbbf24',
  },
]

const recentActivity: RecentActivity[] = [
  {
    id: 'act_001',
    kind: 'Pago',
    title: 'Pago aprobado',
    detail: 'Mariana Gómez pagó el curso Corte y Confección Básico.',
    createdAt: toISO(2026, 3, 14),
  },
  {
    id: 'act_002',
    kind: 'Matrícula',
    title: 'Matrícula activa',
    detail: 'Andrea Molina quedó inscrita en Confección de Pantalones.',
    createdAt: toISO(2026, 3, 13),
  },
  {
    id: 'act_003',
    kind: 'Curso',
    title: 'Nuevo curso en agenda',
    detail: 'Moda Sostenible abrió cupos para la próxima cohorte.',
    createdAt: toISO(2026, 3, 11),
  },
  {
    id: 'act_004',
    kind: 'Sede',
    title: 'Sede con alta demanda',
    detail: 'Medellín superó el 80% de ocupación en el último mes.',
    createdAt: toISO(2026, 3, 10),
  },
]

export const mockDB = {
  kpis: {
    students: 1240,
    revenue: 587500000,
    courses: 18,
    locations: 3,
  },
  students,
  courses,
  payments,
  enrollments,
  locations,
  recentActivity,
}

export function getSearchSuggestionsFromData(data: {
  students: Student[]
  courses: Course[]
  payments: Payment[]
  locations: Location[]
}): SearchSuggestion[] {
  const studentSuggestions: SearchSuggestion[] = data.students.map((s) => ({
    id: `sugg_stu_${s.id}`,
    label: s.name,
    description: `${s.courseTitle} · ${s.sede}`,
    to: '/estudiantes',
    tag: 'Estudiante',
  }))

  const courseSuggestions: SearchSuggestion[] = data.courses.map((c) => ({
    id: `sugg_crs_${c.id}`,
    label: c.title,
    description: `${c.modality} · ${c.level}`,
    to: '/cursos',
    tag: 'Curso',
  }))

  const paymentSuggestions: SearchSuggestion[] = data.payments.slice(0, 3).map((p) => ({
    id: `sugg_pay_${p.id}`,
    label: `Pago de ${p.studentName}`,
    description: `${p.courseTitle} · ${p.status}`,
    to: '/pagos',
    tag: 'Pago',
  }))

  const locationSuggestions: SearchSuggestion[] = data.locations.map((l) => ({
    id: `sugg_loc_${l.id}`,
    label: l.city,
    description: `${l.activeCourses} cursos activos · ${l.students} estudiantes`,
    to: '/sedes',
    tag: 'Sede',
  }))

  return [...studentSuggestions, ...courseSuggestions, ...paymentSuggestions, ...locationSuggestions]
}

export function getSearchSuggestions(): SearchSuggestion[] {
  return getSearchSuggestionsFromData({ students, courses, payments, locations })
}

export function formatCOP(amount: number): string {
  // Mantener el mock consistente sin depender del locale del sistema.
  return `$${amount.toLocaleString('es-CO')}`
}

export function formatDate(dateISO: string): string {
  const d = new Date(dateISO)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}


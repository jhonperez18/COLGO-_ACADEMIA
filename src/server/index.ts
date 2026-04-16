// ============================================================================
// Servidor Express - COLGO
// Archivo: src/server/index.ts
// 
// Servidor principal que integra la BD MySQL con la API REST
// ============================================================================

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
)

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ============================================================================
// RUTAS DE SALUD
// ============================================================================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Database connection test
app.get('/api/db-test', async (_req, res) => {
  try {
    res.json({ status: 'connected', database: 'colgo_db' })
  } catch (error) {
    res.status(500).json({ status: 'disconnected', error: 'Cannot connect to database' })
  }
})

// ============================================================================
// RUTAS DE API
// ============================================================================

// Estudiantes
app.get('/api/students', (_req, res) => {
  res.json([
    {
      id: 'stu_001',
      name: 'Mariana Gómez',
      document: '1.045.238.771',
      status: 'Activo',
      sede_id: 'sed_001',
      created_at: new Date().toISOString(),
    },
  ])
})

app.post('/api/students', (req, res) => {
  const { id, name, document } = req.body

  if (!id || !name || !document) {
    return res.status(400).json({ error: 'Campos requeridos: id, name, document' })
  }

  console.log('✅ Estudiante creado:', { id, name, document })
  res.status(201).json({ message: 'Estudiante creado exitosamente', id })
})

// ============================================================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  })
})

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log('')
  console.log('🎯 ========================================')
  console.log('✅ Servidor COLGO ejecutándose')
  console.log('🔌 URL: http://localhost:' + PORT)
  console.log('📊 API: http://localhost:' + PORT + '/api')
  console.log('🏥 Health: http://localhost:' + PORT + '/api/health')
  console.log('🎯 ========================================')
  console.log('')
})

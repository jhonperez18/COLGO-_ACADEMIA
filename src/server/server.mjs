// ============================================================================
// Servidor Express - COLGO (Versión JavaScript)
// ============================================================================

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// MIDDLEWARE
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// RUTAS DE SALUD
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.get('/api/db-test', (req, res) => {
  res.json({ status: 'connected', database: 'colgo_db' })
})

// RUTAS - ESTUDIANTES
app.get('/api/students', (req, res) => {
  console.log('📤 GET /api/students')
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
  const { id, name, document, status, sede_id, email, phone } = req.body

  console.log('📤 POST /api/students', { id, name, document })

  if (!id || !name || !document) {
    return res.status(400).json({ error: 'Campos requeridos: id, name, document' })
  }

  console.log('✅ Estudiante creado:', { id, name, document })
  res.status(201).json({ message: 'Estudiante creado exitosamente', id })
})

app.put('/api/students/:id/status', (req, res) => {
  const { status } = req.body
  console.log('📤 PUT /api/students/:id/status', { id: req.params.id, status })
  res.json({ message: 'Estado actualizado', status })
})

// Rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  })
})

// INICIAR SERVIDOR
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

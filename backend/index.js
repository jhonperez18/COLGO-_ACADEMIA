import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import studentRoutes from './routes/student.js';
import teacherRoutes from './routes/teacher.js';
import matriculasRoutes from './routes/matriculas.js';
import usuariosRoutes from './routes/usuarios.js';
import academicoRoutes from './routes/academico.js';
import { authenticateJWT, authorizeRole } from './middleware/auth.js';
import { errorHandler, notFoundHandler, requestLogger } from './middleware/errorHandler.js';
import { logSmtpStatus } from './utils/emailService.js';
import jwt from 'jsonwebtoken';
import { addSseClient, removeSseClient, startSseHeartbeat } from './realtime/sseHub.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

// Configurar CORS para múltiples orígenes
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** Preview de Vercel: orígenes tipo https://proyecto-xxx-usuario.vercel.app (cambia en cada deploy). */
function isVercelAppPreviewOrigin(origin) {
  const on = ['1', 'true', 'yes'].includes(String(process.env.CORS_ALLOW_VERCEL || '').trim().toLowerCase());
  if (!on) return false;
  try {
    const host = new URL(origin).hostname;
    return host === 'vercel.app' || host.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

// Middlewares globales
app.use(requestLogger);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin) || isVercelAppPreviewOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json());

startSseHeartbeat();

// Rutas públicas
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend COLGO API',
    version: '1.0.0',
    instructions: 'El frontend está en http://localhost:5174',
    endpoints: {
      health: '/api/health',
      login: '/api/auth/login'
    }
  });
});


app.use('/api/auth', authRoutes);
app.use('/api/usuarios', authenticateJWT, authorizeRole('admin', 'staff'), usuariosRoutes);

// Rutas privadas (protegidas)
app.use('/api/admin', authenticateJWT, adminRoutes);
app.use('/api/student', authenticateJWT, studentRoutes);
app.use('/api/teacher', authenticateJWT, teacherRoutes);
app.use('/api/matriculas', authenticateJWT, matriculasRoutes);
app.use('/api/academico', authenticateJWT, academicoRoutes);

// Ruta de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend COLGO funcionando' });
});

app.get('/api/realtime/stream', (req, res) => {
  const token = String(req.query?.token || '').trim();
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui',
    );

    const user = {
      id: Number(decoded?.id || 0),
      rol: String(decoded?.rol || ''),
      email: String(decoded?.email || ''),
    };
    if (!user.id || !user.rol) return res.status(401).json({ error: 'Token inválido' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const clientId = addSseClient({ res, user });
    req.on('close', () => removeSseClient(clientId));
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
});

// Rutas no encontradas
app.use(notFoundHandler);

// Manejo de errores global
app.use(errorHandler);

app.listen(port, () => {
  console.log(`✓ Backend COLGO corriendo en puerto ${port}`);
  console.log(`✓ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ BD: ${process.env.DB_NAME} en ${process.env.DB_HOST}`);
  logSmtpStatus();
});


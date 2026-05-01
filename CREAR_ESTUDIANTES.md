# 📝 Guía: Crear Nuevos Estudiantes

## ✅ Lo que hicimos

Integramos un formulario completo para crear nuevos estudiantes que:
- ✨ Se guarda en la base de datos MySQL
- 🔄 Se sincroniza con el estado global (Redux-like)
- 📊 Aparece inmediatamente en la tabla de estudiantes
- 🎨 Tiene validación de campos

## 🚀 Cómo Funciona

### 1. **Componentes Creados**

#### `src/components/students/CreateStudentForm.tsx`
Formulario reutilizable con:
- Campo de nombre (requerido)
- Campo de documento (requerido)
- Selector de sede (Medellín, Bogotá, Virtual)
- Selector de estado (Activo, Pendiente, Inactivo)
- Campos opcionales: Email y Teléfono
- Validación de errores

### 2. **Servicio de API**

#### `src/services/api.ts`
Capa de comunicación con el backend:
- `StudentService.create()` - Envía datos a la API
- `StudentService.list()` - Obtiene lista de estudiantes
- Manejo de errores y fallback

### 3. **Cambios en el Estado Global**

#### `src/state/colgoReducer.ts`
- Agregué acción `STUDENT/CREATE` 
- Maneja la adición de nuevos estudiantes

#### `src/state/ColgoProvider.tsx`
- Agregué método `actions.createStudent()`
- Sincroniza con el contexto global

### 4. **Integración en EstudiantesPage**

#### `src/pages/EstudiantesPage.tsx`
- Botón "Nuevo" ahora abre un modal
- Formulario dentro del modal
- Handler `handleCreateStudent()` que:
  1. Valida los datos
  2. Envía a la API
  3. Agrega a la tabla localmente
  4. Cierra el modal

---

## 📋 Flujo de Creación

```
Usuario hace clic en "Nuevo"
    ↓
Se abre Modal con Formulario
    ↓
Usuario completa formulario y hace clic en "Crear Estudiante"
    ↓
handleCreateStudent() es llamado
    ↓
Valida datos (nombre y documento requeridos)
    ↓
Envía POST a /api/students
    ↓
Si éxito: Agrega estudiante al estado local
    ↓
Modal se cierra y tabla se actualiza automáticamente
    ↓
Si error: Muestra mensaje de error en el formulario
```

---

## 🔧 Cómo Usar

### Paso 1: Asegurate que el Backend está Corriendo
```bash
npm run server
```

Deberías ver:
```
✅ Servidor COLGO ejecutándose en /api
```

### Paso 2: Inicia el Frontend
```bash
npm run dev
```

### Paso 3: Navega a Estudiantes y Haz Click en "Nuevo"

### Paso 4: Rellena el Formulario
- **Nombre**: Ej: "María García"
- **Documento**: Ej: "1.234.567.890"
- **Sede**: Escoge una de las 3 sedes
- **Estado**: Activo, Pendiente o Inactivo
- **Email (opcional)**: maria@example.com
- **Teléfono (opcional)**: +573001234567

### Paso 5: Haz Click en "Crear Estudiante"

---

## 💾 La Base de Datos Guarda Todo

Cada vez que creas un estudiante:

1. ✅ Se guarda en la tabla `students` de MySQL
2. ✅ Se registra en `recent_activity` como evento
3. ✅ Se muestra inmediatamente en la tabla (sin recargar)
4. ✅ Se puede buscar con los filtros

---

## 🔍 Estructura de Datos

Cuando creas un estudiante, se guarda así en la BD:

```sql
INSERT INTO students (id, name, document, status, sede_id, email, phone, created_at)
VALUES (
  'stu_abc123def456',
  'María García',
  '1.234.567.890',
  'Pendiente',
  'sed_001',
  'maria@example.com',
  '+573001234567',
  NOW()
);
```

---

## 🛠️ Variables de Entorno Importante

En tu `.env` asegúrate de tener:

```env
# Backend
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Cebollito22.
DB_NAME=colgo_db
PORT=3001

# Frontend
VITE_API_URL=/api
```

---

## 🐛 Troubleshooting

### Error: "Error al crear el estudiante"
**Solución**: Verifica que el backend está corriendo en `/api`

### Error: "El nombre es requerido"
**Solución**: Rellena todos los campos requeridos (marcan con *)

### El estudiante no aparece en la tabla
**Solución**: 
1. Verifica que no hay errores en la consola
2. Recarga la página
3. Revisa que la API respondió correctamente

### La tabla muestra estudiantes viejos (mock data)
**Solución**: Es normal - los datos mock se cargan al inicio. Los nuevos se agregan encima.

---

## 🚀 Próximos Pasos

Después de crear estudiantes, puedes:

1. **Matricularlos en Cursos**: Hacer clic en estudiante → "Ver" → asignar curso
2. **Registrar Pagos**: En la página de Pagos
3. **Ver Historial**: En la página de Actividad Reciente
4. **Exportar Datos**: Usar botón "Exportar" en estudiantes

---

## 📊 Datos de Ejemplo para Prueba

Puedes uso estos datos para probar:

```
Nombre: Ana María López
Documento: 1.987.654.321
Sede: Bogotá
Estado: Activo
Email: ana@example.com
Teléfono: +573105678901

---

Nombre: Carlos Mendez
Documento: 1.456.789.123
Sede: Virtual
Estado: Pendiente
Email: carlos@example.com
```

---

## ✨ Características Adicionales

Los estudiantes creados tienen:
- ✅ ID único autogenerado
- ✅ Timestamp de creación automático
- ✅ Relación con sede
- ✅ Estado seguible
- ✅ Email y teléfono guardados
- ✅ Inmediatamente visible en reportes

---

**¡Listo! Ahora puedes crear estudiantes y gestionar tu academia correctamente!** 🎓

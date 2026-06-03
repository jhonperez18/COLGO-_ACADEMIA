# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

COLGO Academia is a SaaS academic management system (React 19 + Vite frontend, Express backend, MySQL database). See `README.md` and `QUICK_START.md` for general docs.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Frontend (Vite) | `npm run dev` | 5173 | Run from repo root |
| Backend (Express) | `npm run server` | 3001 | Run from repo root; uses `backend/index.js` |
| MySQL 8.0 | `mysqld` | 3306 | Must be started with TCP networking enabled |

### Key startup caveats

- **MySQL networking**: Ubuntu's default MySQL installation starts with `skip_networking=ON`. You must start `mysqld` with `--port=3306 --bind-address=127.0.0.1` for the backend to connect via TCP.
- **Two `npm install` runs**: Root `/workspace` (frontend + shared deps) and `/workspace/backend/` (backend deps) each have their own `package.json` and `package-lock.json`.
- **Database schemas**: Load `database/schema.sql` first (creates `colgo_db` with seed data for sedes, courses, students, etc.), then `backend/schema.sql` (creates `usuarios`, `estudiantes`, `docentes`, `cursos`, etc. for the auth/admin system). The `backend/schema.sql` has `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements that fail on MySQL 8.0; the `CREATE TABLE IF NOT EXISTS` statements succeed and are sufficient.
- **Admin test user**: The `usuarios` table needs at least one admin user with a bcrypt-hashed password. Create one with: `INSERT INTO usuarios (email, password_hash, rol, activo) VALUES ('admin@colgo.com', '<bcrypt_hash>', 'admin', TRUE);`
- **Login credentials**: Use `admin@colgo.com` / `Admin123!` (or whatever password you hash) at `http://localhost:5173/login`.
- **Environment**: The `.env` file in the repo root is pre-committed with DB credentials (`root`/`Cebollito22.`, database `colgo_db`). The backend loads `.env` from both `../` and its own directory.

### Lint / Test / Build

- **Lint**: `npm run lint` (ESLint 9, flat config). Pre-existing lint errors exist in the codebase (4 errors, 2 warnings as of this writing).
- **Tests**: No automated tests are configured yet (Playwright is a devDependency but no test files or config exist).
- **Build**: `npm run build` (runs `tsc -b && vite build`).

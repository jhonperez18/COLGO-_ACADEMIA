#!/usr/bin/env node
/** Diagnóstico rápido de producción: API Vercel + login MARIO */
const API = process.env.API_URL || 'https://project-bm9ko.vercel.app/api';

async function main() {
  console.log('API:', API);

  const healthRes = await fetch(`${API}/health`).catch((e) => {
    console.error('❌ No se alcanza el backend:', e.message);
    process.exit(1);
  });
  const health = await healthRes.json().catch(() => ({}));
  console.log('Health', healthRes.status, health);

  if (health.db === 'error') {
    console.error('\n❌ PROBLEMA: la API no está conectada a MySQL (Aiven).');
    console.error('   Ejecuta: npm run deploy:production');
    console.error('   O revisa en Vercel → project-bm9ko → Environment: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL=true\n');
    process.exit(1);
  }

  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'MARIO', password: '123' }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  console.log('Login', loginRes.status, loginBody.error || loginBody.success || loginBody);

  if (loginRes.ok && loginBody.token) {
    console.log('\n✅ Login OK — MARIO / 123 funciona en producción.');
    return;
  }
  console.error('\n❌ Login falló. Revisa logs en Vercel (Functions) o ejecuta deploy:production.');
  process.exit(1);
}

main();

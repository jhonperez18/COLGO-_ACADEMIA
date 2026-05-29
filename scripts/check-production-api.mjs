#!/usr/bin/env node
/** Diagnóstico rápido de producción: API Render + login MARIO */
const API = process.env.API_URL || 'https://colgo-academi-saas.onrender.com/api';

async function main() {
  console.log('API:', API);

  const healthRes = await fetch(`${API}/health`).catch((e) => {
    console.error('❌ No se alcanza el backend:', e.message);
    process.exit(1);
  });
  const health = await healthRes.json().catch(() => ({}));
  console.log('Health', healthRes.status, health);

  if (health.db === 'error') {
    console.error('\n❌ PROBLEMA: Render NO está conectado a MySQL.');
    console.error('   Ve a dashboard.render.com → servicio colgo-academi-saas → Environment');
    console.error('   Configura: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL=true');
    console.error('   (credenciales de Aiven / MySQL en la nube)\n');
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
  console.error('\n❌ Login falló. Revisa logs en Render.');
  process.exit(1);
}

main();

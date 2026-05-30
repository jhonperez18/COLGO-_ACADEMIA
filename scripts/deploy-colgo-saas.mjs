/** Despliega Aiven + env en el proyecto Vercel colgo-academi-saas (URL pública habitual). */
process.env.VERCEL_PROJECT = 'colgo-academi-saas'
process.env.PRODUCTION_ORIGIN = 'https://colgo-academi-saas.vercel.app'
await import('./deploy-production.mjs')

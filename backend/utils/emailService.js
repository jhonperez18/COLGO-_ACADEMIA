import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

export function smtpHostIsExplicit() {
  return Boolean(String(process.env.SMTP_HOST || process.env.EMAIL_HOST || '').trim())
}

function defaultHostForUser(user) {
  const u = String(user || '').toLowerCase()
  if (!u.includes('@')) return 'smtp.gmail.com'
  if (u.endsWith('@ymail.com') || /@yahoo\./i.test(u)) return 'smtp.mail.yahoo.com'
  if (u.endsWith('@gmail.com') || u.endsWith('@googlemail.com')) return 'smtp.gmail.com'
  if (/@(hotmail|outlook|live)\./i.test(u)) return 'smtp.office365.com'
  return 'smtp.gmail.com'
}

function defaultPortForHost(host) {
  const h = String(host || '').toLowerCase()
  if (h.includes('yahoo')) return 465
  if (h.includes('office365')) return 587
  return 587
}

/**
 * Lee variables SMTP con alias habituales (.env mal nombrado).
 * Si no defines SMTP_HOST, el host se infiere del dominio de SMTP_USER (Yahoo ≠ Gmail: evita error 535).
 */
export function readSmtpEnv() {
  const user = String(process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER || '').trim()
  const pass = String(
    process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || process.env.MAIL_PASSWORD || '',
  ).trim()
  let host = String(process.env.SMTP_HOST || process.env.EMAIL_HOST || '').trim()
  if (!host) host = defaultHostForUser(user)

  const portRaw = String(process.env.SMTP_PORT || process.env.EMAIL_PORT || '').trim()
  let port = parseInt(portRaw, 10)
  if (!Number.isFinite(port) || port <= 0) port = defaultPortForHost(host)

  const fromRaw = String(process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.MAIL_FROM || '').trim()
  const fromName = String(process.env.SMTP_FROM_NAME || 'COLGO ACADEMIA').trim() || 'COLGO ACADEMIA'
  return { user, pass, host, port, fromRaw, fromName }
}

export function isSmtpConfigured() {
  const { user, pass } = readSmtpEnv()
  return Boolean(user && pass)
}

/**
 * Remitente: con Gmail el sobre debe ser la cuenta autenticada (evita 535 / mensaje rechazado).
 */
export function resolveMailFrom() {
  const { user, fromRaw, fromName } = readSmtpEnv()
  const u = user.toLowerCase()
  const isGmailMailbox = u.endsWith('@gmail.com') || u.endsWith('@googlemail.com')
  const isYahooMailbox = u.endsWith('@ymail.com') || /@yahoo\./i.test(user)

  if (fromRaw) {
    if (fromRaw.includes('<') && fromRaw.includes('>')) return fromRaw
    if (fromRaw.includes('@')) {
      const mustMatchAccount = isGmailMailbox || isYahooMailbox
      if (mustMatchAccount && !fromRaw.toLowerCase().includes(u)) {
        return `"${fromName}" <${user}>`
      }
      return `"${fromName}" <${fromRaw}>`
    }
  }
  if (user && user.includes('@')) return `"${fromName}" <${user}>`
  return fromRaw || 'noreply@colgo.local'
}

/** Preset para transporte: cuenta Yahoo no debe usar servidor Gmail (535). */
function getMailPreset() {
  const { user, host } = readSmtpEnv()
  const u = (user || '').toLowerCase()
  const h = (host || '').toLowerCase()

  if (u.endsWith('@ymail.com') || /@yahoo\./i.test(user || '')) return 'yahoo'
  if (u.endsWith('@gmail.com') || u.endsWith('@googlemail.com') || h.includes('gmail')) return 'gmail'
  if (/@(hotmail|outlook|live)\./i.test(user || '') || h.includes('office365')) return 'outlook'
  return 'custom'
}

let cachedTransport = null
let cachedKey = ''

/**
 * Transport nodemailer (recreado si cambian user/host en proceso).
 */
export function getMailTransport() {
  const { user, pass, host, port } = readSmtpEnv()
  if (!user || !pass) return null

  const preset = getMailPreset()
  const key = `${preset}|${user}|${host}|${port}`
  if (cachedTransport && cachedKey === key) return cachedTransport
  cachedTransport = null
  cachedKey = key

  if (preset === 'yahoo' && String(process.env.SMTP_USE_YAHOO_SERVICE || '').toLowerCase() !== 'false') {
    cachedTransport = nodemailer.createTransport({
      service: 'Yahoo',
      auth: { user, pass },
    })
  } else if (preset === 'gmail' && String(process.env.SMTP_USE_GMAIL_SERVICE || '').toLowerCase() !== 'false') {
    cachedTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
  } else if (preset === 'outlook') {
    cachedTransport = nodemailer.createTransport({
      service: 'Outlook365',
      auth: { user, pass },
    })
  } else {
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      requireTLS: port === 587,
      tls: { minVersion: 'TLSv1.2' },
      connectionTimeout: parseInt(process.env.SMTP_TIMEOUT || '15000', 10),
    })
  }
  return cachedTransport
}

export function logSmtpStatus() {
  const { user, pass, host, port } = readSmtpEnv()
  if (!user || !pass) {
    console.warn(
      '[SMTP] Sin credenciales: define SMTP_USER y SMTP_PASSWORD en backend/.env (Gmail/Yahoo: contraseña de aplicación).',
    )
    return
  }
  const preset = getMailPreset()
  const inferred = !smtpHostIsExplicit() ? ' (host inferido desde SMTP_USER)' : ''
  console.log(`[SMTP] ${user} → preset ${preset}${inferred} · ${host}:${port}`)
}

function resolveFrontBaseFromLogin(loginUrl) {
  try {
    const parsed = new URL(String(loginUrl || '').trim())
    return parsed.origin
  } catch {
    return 'http://localhost:5173'
  }
}

function withForcedLoginQuery(loginUrl) {
  try {
    const u = new URL(String(loginUrl || '').trim())
    u.searchParams.set('force_login', '1')
    return u.toString()
  } catch {
    const base = String(loginUrl || '').trim() || 'http://localhost:5173/login'
    return base.includes('?') ? `${base}&force_login=1` : `${base}?force_login=1`
  }
}

/**
 * Producción por defecto en enlaces de correo si no hay FRONTEND_URL en el servidor.
 * Debe coincidir con el dominio .vercel.app real (Vercel usa "project-", no "proyecto-").
 * En producción define siempre FRONTEND_URL en .env del backend.
 */
const DEFAULT_EMAIL_PUBLIC_APP_URL = 'https://project-bm9ko.vercel.app'

function resolveEmailPublicAppBase() {
  const fromEnv = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return DEFAULT_EMAIL_PUBLIC_APP_URL.replace(/\/$/, '')
}

/** Botón «Ir a iniciar sesión»: siempre /login con force_login sobre la URL pública configurada. */
function buildForcedLoginUrlForEmail() {
  return withForcedLoginQuery(`${resolveEmailPublicAppBase()}/login`)
}

function getWelcomePanelCopy(roleLabel) {
  const isDocente = /docent/i.test(String(roleLabel || ''))
  const isStaff = /staff/i.test(String(roleLabel || ''))
  const variant = String(process.env.WELCOME_LINK_COPY_VARIANT || '').trim().toLowerCase()
  if (variant === 'bienvenida') {
    if (isDocente || isStaff) {
      return {
        html: 'COLGO ACEDEMIA le da la bienvenida a nuestro equipo de trabajo. Ingresa al siguiente link:',
        text: 'COLGO ACEDEMIA le da la bienvenida a nuestro equipo de trabajo. Ingresa al siguiente link:',
      }
    }
    return {
      html: 'Nos alegra tenerte en COLGO ACEDEMIA. Entra al siguiente enlace y comienza a aprender con nosotros:',
      text: 'Nos alegra tenerte en COLGO ACEDEMIA. Entra al siguiente enlace y comienza a aprender con nosotros:',
    }
  }
  if (variant === 'comienza') {
    return {
      html: 'Ingresa al siguiente enlace y comienza tu proceso de aprendizaje con nosotros:',
      text: 'Ingresa al siguiente enlace y comienza tu proceso de aprendizaje con nosotros:',
    }
  }
  if (variant === 'crece') {
    if (isDocente) {
      return {
        html: 'Accede a tu panel en el siguiente enlace y acompana a tus estudiantes con nosotros:',
        text: 'Accede a tu panel en el siguiente enlace y acompana a tus estudiantes con nosotros:',
      }
    }
    return {
      html: 'Accede a tu panel en el siguiente enlace y crece con nosotros:',
      text: 'Accede a tu panel en el siguiente enlace y crece con nosotros:',
    }
  }
  if (isDocente) {
    return {
      html: 'Bienvenido(a) a COLGO ACEDEMIA. Entra al siguiente enlace y comienza tu experiencia docente con nosotros:',
      text: 'Bienvenido(a) a COLGO ACEDEMIA. Entra al siguiente enlace y comienza tu experiencia docente con nosotros:',
    }
  }
  return {
    html: 'Bienvenido(a) a COLGO ACEDEMIA. Entra al siguiente enlace y aprende con nosotros:',
    text: 'Bienvenido(a) a COLGO ACEDEMIA. Entra al siguiente enlace y aprende con nosotros:',
  }
}

/**
 * Enviar email de credenciales a nuevo estudiante
 */
export async function sendCredentialsEmail(
  email,
  nombre,
  username,
  password,
  loginUrl = 'http://localhost:5173/login',
  panelUrl,
) {
  if (!isSmtpConfigured()) {
    console.warn('[SMTP] sendCredentialsEmail omitido: falta SMTP_USER / SMTP_PASSWORD')
    return { success: false, skipped: true, error: 'SMTP no configurado' }
  }

  const transporter = getMailTransport()
  if (!transporter) {
    return { success: false, skipped: true, error: 'SMTP no configurado' }
  }

  try {
    const baseFront = resolveFrontBaseFromLogin(loginUrl)
    const studentPanelUrl = panelUrl || `${baseFront}/estudiante/dashboard`
    const welcomeCopy = getWelcomePanelCopy('estudiante')
    const forcedLoginUrl = buildForcedLoginUrlForEmail()
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .credentials-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
            .credentials-box strong { display: block; color: #667eea; }
            .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; color: #999; font-size: 12px; padding: 20px; }
            .warning { color: #d32f2f; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenido a COLGO ACEDEMIA</h1>
              <p>Tu cuenta ha sido creada exitosamente</p>
            </div>
            <div class="content">
              <p>Hola <strong>${nombre}</strong>,</p>
              <p>Tu cuenta de estudiante ha sido creada en el sistema COLGO ACADEMIA. Aquí están tus credenciales de acceso:</p>
              <div class="credentials-box">
                <strong>Usuario (Email):</strong>
                ${email}
              </div>
              <div class="credentials-box">
                <strong>Contraseña Temporal:</strong>
                ${password}
                <div class="warning">⚠️ Por favor, cambia esta contraseña en tu primer acceso</div>
              </div>
              <p><strong>¿Cómo acceder?</strong></p>
              <ol>
                <li>Haz clic en el botón de abajo</li>
                <li>Ingresa tu email y contraseña temporal</li>
                <li>Crea una nueva contraseña segura</li>
              </ol>
              <p style="margin-top: 16px; color: #111827; font-size: 15px; line-height: 1.45;">
                <strong style="display:block; font-size: 18px; font-weight: 800; color: #92400e; margin-bottom: 6px;">${welcomeCopy.html}</strong>
                Presiona el botón de acceso para entrar a tu panel.
              </p>
              <a href="${forcedLoginUrl}" class="button">Acceder a COLGO ACADEMIA</a>
              <p style="margin-top:14px;font-size:13px;color:#4b5563;line-height:1.5;">
                <strong>Si el botón no funciona,</strong> copia y pega esta dirección en tu navegador:<br/>
                <a href="${forcedLoginUrl}" style="color:#4338ca;word-break:break-all;">${forcedLoginUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>© COLGO ACADEMIA - Sistema Académico</p>
            </div>
          </div>
        </body>
      </html>
    `

    const from = resolveMailFrom()
    const info = await transporter.sendMail({
      from,
      to: email,
      subject: 'Credenciales de acceso - COLGO ACADEMIA',
      html: htmlContent,
      text:
        `Hola ${nombre}, tus credenciales son:\n` +
        `Usuario: ${email}\n` +
        `Contraseña: ${password}\n` +
        `Inicio de sesión: ${forcedLoginUrl}\n` +
        `${welcomeCopy.text}`,
    })
    console.log('✓ Email enviado:', info.messageId || info.response)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('✗ Error enviando email:', error)
    return { success: false, error: formatSmtpError(error) }
  }
}

function formatSmtpError(error) {
  const msg = error && error.message ? String(error.message) : 'Error SMTP'
  const { user } = readSmtpEnv()
  const u = (user || '').toLowerCase()
  const yahooUser = u.endsWith('@ymail.com') || /@yahoo\./i.test(user || '')

  if (/535|BadCredentials|Invalid login/i.test(msg)) {
    let extra =
      'Revisa SMTP_USER y SMTP_PASSWORD: debe ser una contraseña de aplicación (no la clave normal de la cuenta).'
    if (yahooUser) {
      extra +=
        ' Yahoo: genera clave en https://login.yahoo.com/account/security — y no uses servidor Gmail para una cuenta @yahoo.'
    } else {
      extra += ' Gmail: https://myaccount.google.com/apppasswords'
    }
    return `${msg} — ${extra}`
  }
  if (/Greeting never received|ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    return `${msg} — Revisa firewall, SMTP_HOST y SMTP_PORT.`
  }
  return msg
}

/**
 * Enviar notificación de matrícula
 */
export async function sendEnrollmentNotificationEmail(email, nombre, curso, instructor) {
  if (!isSmtpConfigured()) {
    return { success: false, skipped: true, error: 'SMTP no configurado' }
  }
  const transporter = getMailTransport()
  if (!transporter) return { success: false, skipped: true, error: 'SMTP no configurado' }

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"></head>
        <body style="font-family: Arial, sans-serif;">
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Tu matrícula ha sido procesada.</p>
          <p><strong>Curso:</strong> ${curso}<br/><strong>Instructor:</strong> ${instructor || 'Por definir'}</p>
        </body>
      </html>
    `

    await transporter.sendMail({
      from: resolveMailFrom(),
      to: email,
      subject: `Matrícula confirmada: ${curso}`,
      html: htmlContent,
    })
    console.log('✓ Notificación de matrícula enviada a:', email)
    return { success: true }
  } catch (error) {
    console.error('✗ Error enviando notificación:', error)
    return { success: false, error: formatSmtpError(error) }
  }
}

/**
 * Invitación al panel COLGO: usuario = cédula, contraseña = cédula.
 */
export async function sendColgoUsuarioInvitacion({
  to,
  nombreCompleto,
  cedula,
  rolEtiqueta,
  loginUrl,
  panelUrl,
}) {
  if (!String(to || '').trim()) {
    return { success: false, skipped: true, error: 'Destinatario de correo vacío' }
  }
  if (!isSmtpConfigured()) {
    console.warn('[SMTP] Invitación no enviada: SMTP_USER / SMTP_PASSWORD no configurados')
    return { success: false, skipped: true, error: 'SMTP no configurado' }
  }

  const transporter = getMailTransport()
  if (!transporter) {
    return { success: false, skipped: true, error: 'SMTP no configurado' }
  }

  const welcomeCopy = getWelcomePanelCopy(rolEtiqueta)
  const forcedLoginUrl = buildForcedLoginUrlForEmail()
  const htmlContent = `
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"></head>
      <body style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#111827;background:#f9fafb;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#0f172a 0%, #1e293b 60%, #78350f 100%);padding:20px;">
              <h2 style="margin:0;color:#f59e0b;">COLGO ACADEMIA</h2>
              <p style="margin:6px 0 0;color:#e2e8f0;font-size:13px;">Notificación de acceso al sistema</p>
            </div>
            <div style="padding:20px;">
          <p>Hola <strong>${nombreCompleto}</strong>,</p>
          <p style="margin-top:16px;color:#111827;font-size:15px;line-height:1.45;">
            <strong style="display:block;font-size:18px;font-weight:800;color:#92400e;margin-bottom:6px;">${welcomeCopy.html}</strong>
            Presiona el botón de acceso para entrar a tu panel.
          </p>
          <p><a href="${forcedLoginUrl}" style="display:inline-block;background:#f59e0b;color:#111;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Ir a iniciar sesión</a></p>
          <p style="margin-top:10px;font-size:13px;color:#4b5563;line-height:1.5;">
            <strong>Si el botón no funciona,</strong> copia y pega esta dirección en tu navegador:<br/>
            <a href="${forcedLoginUrl}" style="color:#2563eb;word-break:break-all;">${forcedLoginUrl}</a>
          </p>
          <p style="margin-top:16px;"><strong>Recuerda tus datos de acceso:</strong></p>
          <table style="border-collapse:collapse;margin:10px 0 14px;width:100%;">
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Usuario</strong> (cédula)</td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace;">${cedula}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e5e7eb;"><strong>Contraseña</strong></td>
                <td style="padding:8px;border:1px solid #e5e7eb;font-family:monospace;">${cedula}</td></tr>
          </table>
          <p>En el inicio de sesión puedes usar tu <strong>cédula</strong> como usuario (con o sin puntos, según la registrada) o tu <strong>correo</strong> <code>${to}</code> con la misma contraseña.</p>
          <p style="font-size:12px;color:#6b7280;">Correo automático. Si no solicitaste esta cuenta, ignora este mensaje.</p>
            </div>
          </div>
        </div>
      </body></html>
    `

  const text =
    `Hola ${nombreCompleto}, tu cuenta COLGO (${rolEtiqueta}). ` +
    `Usuario (cédula): ${cedula}. Contraseña: ${cedula}. También puedes entrar con el correo ${to}. ` +
    `Inicio de sesión: ${forcedLoginUrl}. ` +
    `${welcomeCopy.text}`

  try {
    const info = await transporter.sendMail({
      from: resolveMailFrom(),
      to,
      subject: 'Tu acceso a COLGO ACADEMIA',
      html: htmlContent,
      text,
    })
    console.log('✓ Invitación COLGO enviada:', info.messageId || info.response)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('✗ Error enviando invitación COLGO:', error)
    return { success: false, error: formatSmtpError(error) }
  }
}

/**
 * Enviar contraseña temporal por reset administrativo.
 */
export async function sendAdminPasswordResetEmail({
  to,
  nombreCompleto,
  passwordTemporal,
  loginUrl,
}) {
  if (!isSmtpConfigured()) {
    return { success: false, skipped: true, error: 'SMTP no configurado' }
  }
  const transporter = getMailTransport()
  if (!transporter) return { success: false, skipped: true, error: 'SMTP no configurado' }

  const resetLoginUrl = buildForcedLoginUrlForEmail()
  const html = `
    <div style="max-width:560px;margin:0 auto;padding:20px;font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="color:#b45309">COLGO ACADEMIA</h2>
      <p>Hola <strong>${nombreCompleto}</strong>,</p>
      <p>Un administrador restableció tu acceso. Usa esta contraseña temporal:</p>
      <div style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;font-family:monospace;font-size:16px;">
        ${passwordTemporal}
      </div>
      <p style="margin-top:12px;">Por seguridad, deberás cambiarla en tu próximo inicio de sesión.</p>
      <p><a href="${resetLoginUrl}" style="display:inline-block;background:#f59e0b;color:#111;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">Ir a iniciar sesión</a></p>
      <p style="margin-top:10px;font-size:13px;color:#4b5563;line-height:1.5;">
        <strong>Si el botón no funciona,</strong> copia y pega esta dirección en tu navegador:<br/>
        <a href="${resetLoginUrl}" style="color:#2563eb;word-break:break-all;">${resetLoginUrl}</a>
      </p>
    </div>
  `
  const text = `Hola ${nombreCompleto}, tu contraseña temporal de COLGO es: ${passwordTemporal}. Debes cambiarla al iniciar sesión. Acceso: ${resetLoginUrl}`

  try {
    const info = await transporter.sendMail({
      from: resolveMailFrom(),
      to,
      subject: 'Restablecimiento de contraseña - COLGO ACADEMIA',
      html,
      text,
    })
    return { success: true, messageId: info.messageId }
  } catch (error) {
    return { success: false, error: formatSmtpError(error) }
  }
}

/**
 * Verificar conexión con servidor SMTP
 */
export async function verifyEmailConnection() {
  if (!isSmtpConfigured()) {
    return { success: false, error: 'SMTP_USER / SMTP_PASSWORD no definidos' }
  }
  const transporter = getMailTransport()
  if (!transporter) return { success: false, error: 'No se pudo crear el transportador' }
  try {
    await transporter.verify()
    console.log('✓ Conexión SMTP verificada correctamente')
    return { success: true }
  } catch (error) {
    console.error('✗ Error de conexión SMTP:', error)
    return { success: false, error: formatSmtpError(error) }
  }
}

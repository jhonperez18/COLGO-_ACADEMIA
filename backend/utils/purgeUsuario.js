import { query } from '../db.js'

/**
 * Elimina un usuario y todos sus datos relacionados (perfiles, permisos, matrículas, actividad).
 */
export async function purgeUsuarioCompletamente(usuarioId) {
  const id = Number(usuarioId)
  if (!Number.isFinite(id) || id <= 0) return false

  const estRows = await query('SELECT id FROM estudiantes WHERE usuario_id = ?', [id])
  const estudianteIds = (Array.isArray(estRows) ? estRows : []).map((r) => Number(r.id)).filter(Boolean)

  for (const estudianteId of estudianteIds) {
    try {
      await query('DELETE FROM matriculas WHERE estudiante_id = ?', [estudianteId])
    } catch (e) {
      console.warn('[purge] matriculas:', e?.code || e?.message || e)
    }
  }

  const safeDelete = async (sql, params) => {
    try {
      await query(sql, params)
    } catch (e) {
      console.warn('[purge]', sql.slice(0, 40), e?.code || e?.message || e)
    }
  }

  await safeDelete('DELETE FROM estudiantes WHERE usuario_id = ?', [id])
  await safeDelete('DELETE FROM docentes WHERE usuario_id = ?', [id])
  await safeDelete('DELETE FROM staff_perfiles WHERE usuario_id = ?', [id])
  await safeDelete('DELETE FROM admin_perfiles WHERE usuario_id = ?', [id])
  await safeDelete('DELETE FROM usuario_permisos WHERE usuario_id = ?', [id])
  await safeDelete('DELETE FROM notificaciones WHERE usuario_id = ?', [id])
  await safeDelete(
    'DELETE FROM actividad_usuarios WHERE objetivo_usuario_id = ? OR actor_usuario_id = ?',
    [id, id],
  )
  await query('DELETE FROM usuarios WHERE id = ?', [id])
  return true
}

/** Perfiles sin usuario, actividad huérfana y usuarios de prueba / finalizados. */
export async function limpiarUsuariosEHistorial(opts = {}) {
  const {
    purgeFinalizados = true,
    purgeTestAuto = true,
    purgeHistorialHuerfano = true,
    purgeLoginsAntiguos = true,
    diasLogins = 14,
  } = opts

  const resumen = {
    usuariosEliminados: [],
    actividadHuerfana: 0,
    perfilesHuerfanos: 0,
    loginsAntiguos: 0,
  }

  const candidatos = []
  if (purgeTestAuto || purgeFinalizados) {
    const condiciones = []
    if (purgeTestAuto) condiciones.push("email LIKE 'test-auto-%@example.com'")
    if (purgeFinalizados) condiciones.push("estado_acceso IN ('finalizado', 'cancelado')")
    const rows = await query(
      `SELECT id, email, rol, estado_acceso FROM usuarios
       WHERE rol <> 'admin' AND (${condiciones.join(' OR ')})`,
    )
    if (Array.isArray(rows)) candidatos.push(...rows)
  }

  const seen = new Set()
  for (const row of candidatos) {
    const uid = Number(row.id)
    if (!uid || seen.has(uid)) continue
    seen.add(uid)
    await purgeUsuarioCompletamente(uid)
    resumen.usuariosEliminados.push({ id: uid, email: row.email, estado: row.estado_acceso })
  }

  if (purgeHistorialHuerfano) {
    const orphanAct = await query(`
      DELETE a FROM actividad_usuarios a
      LEFT JOIN usuarios u ON u.id = a.objetivo_usuario_id
      WHERE a.objetivo_usuario_id IS NOT NULL AND u.id IS NULL
    `)
    resumen.actividadHuerfana = Number(orphanAct?.affectedRows ?? 0)

    const orphanEst = await query(`
      DELETE e FROM estudiantes e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      WHERE u.id IS NULL
    `).catch(() => null)
    const orphanDoc = await query(`
      DELETE d FROM docentes d
      LEFT JOIN usuarios u ON u.id = d.usuario_id
      WHERE u.id IS NULL
    `).catch(() => null)
    const orphanStaff = await query(`
      DELETE sp FROM staff_perfiles sp
      LEFT JOIN usuarios u ON u.id = sp.usuario_id
      WHERE u.id IS NULL
    `).catch(() => null)
    resumen.perfilesHuerfanos =
      Number(orphanEst?.affectedRows ?? 0) +
      Number(orphanDoc?.affectedRows ?? 0) +
      Number(orphanStaff?.affectedRows ?? 0)
  }

  if (purgeLoginsAntiguos && diasLogins > 0) {
    const oldLogins = await query(
      `DELETE FROM actividad_usuarios
       WHERE accion = 'login_success' AND fecha < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [diasLogins],
    )
    resumen.loginsAntiguos = Number(oldLogins?.affectedRows ?? 0)
  }

  return resumen
}

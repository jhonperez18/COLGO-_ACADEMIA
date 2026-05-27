/**
 * Genera un JPEG en data URL reducido para foto de perfil.
 * Evita payloads enormes (y en dev, el proxy de Vite puede truncar respuestas > ~400 KB).
 */
export async function buildProfilePhotoDataUrl(
  file: File,
  options?: { maxSidePx?: number; jpegQuality?: number },
): Promise<string> {
  const maxSidePx = options?.maxSidePx ?? 360
  const jpegQuality = options?.jpegQuality ?? 0.82

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo leer la imagen.')
  })
  try {
    let w = bitmap.width
    let h = bitmap.height
    if (w < 1 || h < 1) throw new Error('Imagen inválida.')
    const scale = Math.min(1, maxSidePx / w, maxSidePx / h)
    w = Math.max(1, Math.round(w * scale))
    h = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo preparar la vista previa.')
    ctx.drawImage(bitmap, 0, 0, w, h)

    let q = jpegQuality
    let dataUrl = canvas.toDataURL('image/jpeg', q)
    while (dataUrl.length > 220_000 && q > 0.45) {
      q -= 0.07
      dataUrl = canvas.toDataURL('image/jpeg', q)
    }
    return dataUrl
  } finally {
    bitmap.close()
  }
}

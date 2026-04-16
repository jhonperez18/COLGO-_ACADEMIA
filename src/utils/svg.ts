export function svgToDataUri(svg: string): string {
  // encodeURIComponent evita problemas con caracteres especiales.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}


// Tamaños de archivo como se ven en el canvas: "340 KB", "1.2 MB", "38 MB", "1 GB".
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`
  const mb = bytes / 1024 ** 2
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

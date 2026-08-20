/**
 * Client-side background removal using @imgly/background-removal.
 * Runs fully in-browser via WASM — no API key required.
 *
 * Returns a new object URL pointing to a PNG with the background removed.
 * The caller is responsible for revoking the previous object URL if needed.
 */
export async function removeBackground(file: File): Promise<{ url: string; blob: Blob }> {
  // Dynamic import so the heavy WASM bundle is only loaded when needed
  const { removeBackground: imglyRemoveBg } = await import('@imgly/background-removal')

  const resultBlob = await imglyRemoveBg(file, {
    // Use the fastest model (small) — good enough for portrait photos
    model: 'small',
    output: {
      format: 'image/png',
      quality: 0.9,
    },
  })

  const url = URL.createObjectURL(resultBlob)
  return { url, blob: resultBlob }
}

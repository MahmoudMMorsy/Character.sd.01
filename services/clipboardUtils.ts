/**
 * Safe and reliable clipboard utilities for copying images and text.
 * Resolves Chrome/Chromium DOMException:
 * "Failed to read or decode ClipboardItemData for type image/png"
 * and handles iFrame clipboard permissions gracefully.
 */

export async function copyImageToClipboard(imageInput: string | Blob | File): Promise<boolean> {
  let resolvedUrl = '';
  let shouldRevoke = false;

  try {
    if (typeof imageInput === 'string') {
      resolvedUrl = imageInput;
    } else if (imageInput instanceof Blob) {
      resolvedUrl = URL.createObjectURL(imageInput);
      shouldRevoke = true;
    } else {
      return false;
    }

    // 1. Draw onto an in-memory Canvas to guarantee a pristine, canonical PNG blob
    // that Chromium's SkBitmap clipboard decoder can decode without error.
    const cleanPngBlob = await new Promise<Blob | null>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width || 512;
          const height = img.naturalHeight || img.height || 512;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/png');
        } catch (canvasErr) {
          reject(canvasErr);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = resolvedUrl;
    });

    if (cleanPngBlob && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': Promise.resolve(cleanPngBlob) })
        ]);
        return true;
      } catch (writeErr) {
        console.warn('Direct image clipboard write rejected, trying text fallback:', writeErr);
      }
    }

    // Fallback: Copy the image URL/data URL as text
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(resolvedUrl);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Clipboard copy encountered an error:', err);
    // Final fallback: copy text
    try {
      if (resolvedUrl && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(resolvedUrl);
        return true;
      }
    } catch {}
    return false;
  } finally {
    if (shouldRevoke && resolvedUrl) {
      URL.revokeObjectURL(resolvedUrl);
    }
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback using textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}

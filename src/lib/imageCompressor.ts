/**
 * Utility to compress and resize images client-side before uploading or saving.
 * Memory-safe implementation designed to prevent mobile browser crashes and tab reloads
 * when handling high-resolution phone camera photos.
 */
export async function compressImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.72
): Promise<string> {
  // Strategy 1: Use native createImageBitmap with hardware-accelerated downscaling if supported
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    try {
      // First check if createImageBitmap supports resize options
      // This decodes directly at target size, using minimal RAM
      const bitmap = await createImageBitmap(file);
      let width = bitmap.width;
      let height = bitmap.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        return canvas.toDataURL("image/jpeg", quality);
      }
      bitmap.close();
    } catch (bitmapErr) {
      console.warn("createImageBitmap failed, falling back to Blob URL:", bitmapErr);
    }
  }

  // Strategy 2: Use URL.createObjectURL instead of FileReader.readAsDataURL
  // This avoids allocating giant Base64 strings in memory on mobile devices
  return new Promise((resolve, reject) => {
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (urlErr) {
      // If createObjectURL fails, fallback to FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        processImgSrc(e.target?.result as string, resolve, reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    processImgSrc(objectUrl, resolve, reject, () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    });
  });
}

function processImgSrc(
  src: string,
  resolve: (val: string) => void,
  reject: (err: any) => void,
  cleanup?: () => void
) {
  const img = new Image();
  img.onload = () => {
    try {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      const maxWidth = 1024;
      const maxHeight = 1024;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        resolve(src);
        cleanup?.();
        return;
      }

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL("image/jpeg", 0.72);
      resolve(compressed);
    } catch (err) {
      console.error("Error compressing image in canvas:", err);
      resolve(src);
    } finally {
      cleanup?.();
    }
  };

  img.onerror = (err) => {
    cleanup?.();
    console.error("Error loading image for compression:", err);
    resolve(src);
  };

  img.src = src;
}

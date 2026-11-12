// Rasterize an arbitrary image Blob to PNG bytes. Needed because the host's
// clipboard image API accepts PNG only — JPEG/WebP/GIF sources (and SVG) must
// be re-encoded through a canvas first. GIFs yield their first frame; SVGs
// rasterize at natural size.
export function blobToPngBytes(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((out) => {
        if (!out) return reject(new Error("PNG re-encode failed"));
        out.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}

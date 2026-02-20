// moduł gradientu: sqrt(Gx^2 + Gy^2) i mapa 0..255.
// im jaśniejszy piksel, tym mocniejsza krawędź.
function edgeDetect(gray, w, h, type) {
  let gx, gy;

  if (type === "sobel") {
    gx = [-1,0,1,-2,0,2,-1,0,1];
    gy = [-1,-2,-1,0,0,0,1,2,1];
  } else if (type === "prewitt") {
    gx = [-1,0,1,-1,0,1,-1,0,1];
    gy = [-1,-1,-1,0,0,0,1,1,1];
  } else if (type === "roberts") {
    gx = [1,0,0,-1];
    gy = [0,1,-1,0];
  }

  const size = type === "roberts" ? 2 : 3;
  const half = Math.floor(size / 2);
  const out = new Uint8ClampedArray(gray.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sx = 0, sy = 0;

      for (let ky = 0; ky < size; ky++) {
        for (let kx = 0; kx < size; kx++) {
          const xx = clampXY(x + kx - half, 0, w - 1);
          const yy = clampXY(y + ky - half, 0, h - 1);
          const v = gray[idx(xx, yy, w)];

          const k = ky * size + kx;
          sx += gx[k] * v;
          sy += gy[k] * v;
        }
      }

      const mag = Math.sqrt(sx * sx + sy * sy);
      out[idx(x, y, w)] = clamp255(mag);
    }
  }
  return out;
}
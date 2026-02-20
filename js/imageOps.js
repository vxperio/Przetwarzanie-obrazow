/* 
  funkcje pomocnicze dla:
  operacji punktowych w skali szarości 
  obliczania histogramów (gray oraz kanały R/G/B);
  zakres jasności w grayscale: 0..255.
*/

function clamp255(v) {  // ograniczenie wartość piksela do zakresu 0..255 (zabezpieczenie przed przepełnieniem).
  return v < 0 ? 0 : (v > 255 ? 255 : v);
}
// operacja punktowa na buforze grayscale (Uint8ClampedArray).
// każdy piksel jest liczony niezależnie od sąsiadów.
function applyPointOp(grayIn, w, h, op, a, b) {
  const out = new Uint8ClampedArray(grayIn.length);

  switch (op) {
    case "clamp": {
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      for (let i = 0; i < grayIn.length; i++) out[i] = clamp255(Math.min(Math.max(grayIn[i], low), high));
      break;
    }
    case "brightness": {
      const delta = a;
      for (let i = 0; i < grayIn.length; i++) out[i] = clamp255(grayIn[i] + delta);
      break;
    }
    case "contrast": {
      const c = a; // np. 1.2
      for (let i = 0; i < grayIn.length; i++) {
        const v = (grayIn[i] - 128) * c + 128;
        out[i] = clamp255(v);
      }
      break;
    }
    case "negative": {
      for (let i = 0; i < grayIn.length; i++) out[i] = 255 - grayIn[i];
      break;
    }
    case "threshold": {
      const t = a;
      for (let i = 0; i < grayIn.length; i++) out[i] = grayIn[i] >= t ? 255 : 0;
      break;
    }
    case "gamma": {
      const gamma = Math.max(0.01, a);
      // klasycznie: out = 255 * (in/255)^(1/gamma)
      const inv = 1 / gamma;
      for (let i = 0; i < grayIn.length; i++) {
        const n = grayIn[i] / 255;
        out[i] = clamp255(Math.round(255 * Math.pow(n, inv)));
      }
      break;
    }
    default: {
      // fallback: kopia
      out.set(grayIn);
    }
  }

  return out;
}

function histogram256FromGray(gray) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  return hist;
}

function histogram256FromRGB(p5img, channel) /*0=r,1=g,2=b*/ {
  const hist = new Uint32Array(256);
  if (!p5img) return hist;
  p5img.loadPixels();
  const px = p5img.pixels; // [r,g,b,a,...]
  for (let i = 0; i < px.length; i += 4) {
    hist[px[i + channel]]++;
  }
  return hist;
}

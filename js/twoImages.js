/* 
  operacje na dwóch obrazach w skali szarości.
  obrazy muszą mieć ten sam rozmiar (obraz B jest skalowany do wymiarów A).
*/
// wykonywanie operacji piksel-po-pikselu na dwóch buforach grayscale.
// zwraca nowy bufor out (0..255).
function applyTwoImageOp(grayA, grayB, op) {                 
  if (!grayA || !grayB) return null;
  if (grayA.length !== grayB.length) return null;

  const out = new Uint8ClampedArray(grayA.length);

  switch (op) {
    case "add":
      for (let i = 0; i < out.length; i++) out[i] = clamp255(grayA[i] + grayB[i]);
      break;

    case "avg":
      for (let i = 0; i < out.length; i++) out[i] = (grayA[i] + grayB[i]) >> 1;
      break;

    case "diff":
      for (let i = 0; i < out.length; i++) out[i] = Math.abs(grayA[i] - grayB[i]);
      break;

    case "sub":
      for (let i = 0; i < out.length; i++) out[i] = clamp255(grayA[i] - grayB[i]);
      break;

    case "mul":
      for (let i = 0; i < out.length; i++) out[i] = clamp255(Math.round((grayA[i] * grayB[i]) / 255));
      break;

    case "div":
      // A/B w skali 0..255: out = (A * 255) / (B + eps)
      for (let i = 0; i < out.length; i++) {
        const b = grayB[i];
        out[i] = b === 0 ? 255 : clamp255(Math.round((grayA[i] * 255) / b));
      }
      break;

    case "max":
      for (let i = 0; i < out.length; i++) out[i] = Math.max(grayA[i], grayB[i]);
      break;

    case "min":
      for (let i = 0; i < out.length; i++) out[i] = Math.min(grayA[i], grayB[i]);
      break;

    default:
      out.set(grayA);
  }

  return out;
}

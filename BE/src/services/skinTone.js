import sharp from "sharp";

/**
 * Heuristic skin-pixel test (Kovac et al., 2003 — RGB rules).
 * Filters out background, hair, clothing so we average actual skin only.
 */
function isSkinPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    max - min > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b
  );
}

/**
 * Classify skin tone from a downloaded image buffer.
 * Strategy:
 *   1. Resize to 256x256 (fast, consistent sampling).
 *   2. Crop the central 60% (where faces typically sit in selfies/phone shots).
 *   3. Read raw RGB pixels, keep only pixels that pass the skin heuristic.
 *   4. Average those pixels. If too few skin pixels, fall back to whole-region mean.
 *   5. Use BT.709 relative luminance to bucket as light / medium / dark.
 */
export async function detectSkinTone(imageBuffer) {
  const SIZE = 256;
  const CROP_RATIO = 0.6; // central 60%
  const cropSize = Math.round(SIZE * CROP_RATIO);
  const cropOffset = Math.round((SIZE - cropSize) / 2);

  const { data, info } = await sharp(imageBuffer)
    .resize(SIZE, SIZE, { fit: "cover" })
    .extract({
      left: cropOffset,
      top: cropOffset,
      width: cropSize,
      height: cropSize
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // 3 after removeAlpha
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let skinCount = 0;

  let rAll = 0;
  let gAll = 0;
  let bAll = 0;
  const totalPixels = cropSize * cropSize;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    rAll += r;
    gAll += g;
    bAll += b;

    if (isSkinPixel(r, g, b)) {
      rSum += r;
      gSum += g;
      bSum += b;
      skinCount++;
    }
  }

  // Need at least 1% of crop to be classified as skin to trust the filter
  const useSkinFilter = skinCount >= totalPixels * 0.01;

  const avgR = useSkinFilter ? rSum / skinCount : rAll / totalPixels;
  const avgG = useSkinFilter ? gSum / skinCount : gAll / totalPixels;
  const avgB = useSkinFilter ? bSum / skinCount : bAll / totalPixels;

  // BT.709 relative luminance, normalized 0..1
  const luminance =
    (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 255;

  let tone;
  if (luminance < 0.4) tone = "dark";
  else if (luminance < 0.65) tone = "medium";
  else tone = "light";

  const toHex = (n) => Math.round(n).toString(16).padStart(2, "0");
  const hex = `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`.toUpperCase();

  return {
    tone,
    hex,
    rgb: { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) },
    luminance: Number(luminance.toFixed(3)),
    skinPixelRatio: Number((skinCount / totalPixels).toFixed(3)),
    method: useSkinFilter ? "skin-filter" : "central-mean-fallback"
  };
}

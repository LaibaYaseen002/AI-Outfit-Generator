// Hand-tuned prompt template for the AI Fashion Designer.
//
// We deliberately do NOT use an LLM to build the final prompt. LLM-generated
// prompts drift on every regeneration and make it impossible to reproduce a
// result. A deterministic template + structured inputs gives reproducible
// outputs with the only randomness coming from the image model's seed.
//
// The image model receives THIS text + the original reference images as
// vision conditioning (see designGenerate.js). The text describes *what*
// the design should look like; the images preserve *how* it actually looks.

const TAG_LABEL = {
  neck: "Neckline",
  sleeves: "Sleeves",
  back: "Back",
  front: "Front",
  daman: "Daman / hem border",
  trouser: "Trouser / shalwar",
  dupatta: "Dupatta",
  embroidery: "Embroidery",
  fabric: "Fabric",
  other: "Reference"
};

const DEFAULT_NEGATIVE =
  "deformed body, deformed face, asymmetric stitching, warped embroidery, blurry pattern, distorted fabric, extra limbs, extra fingers, cartoon, illustration, plastic-looking, doll-like, lowres, text, watermark, logo, brand markings, signature";

function joinNonEmpty(parts, sep = ". ") {
  return parts.filter(Boolean).join(sep);
}

function describeReference(ref) {
  // ref = the design_references row's analysis + tag
  const label = TAG_LABEL[ref.tag] ?? "Reference";
  const colorPart = ref.dominantColors?.length
    ? ` (palette: ${ref.dominantColors.join(", ")})`
    : "";
  const embroideryPart = ref.embroideryType
    ? `, ${ref.embroideryType}, ${ref.stitchingDensity ?? "medium"} density`
    : "";
  const summary = ref.summary ?? "see reference image";
  return `${label}: ${summary}${embroideryPart}${colorPart}`;
}

function pickGarmentCategory(controls, refs) {
  if (controls?.garmentCategory) return controls.garmentCategory;
  const tags = new Set(refs.map((r) => r.tag));
  if (tags.has("trouser") || tags.has("dupatta")) return "shalwar kameez set";
  if (tags.has("daman")) return "long ethnic maxi";
  return "complete outfit";
}

function pickCulturalStyle(controls, refs) {
  if (controls?.culturalStyle) return controls.culturalStyle;
  // Vote from per-reference analysis.
  const votes = new Map();
  for (const r of refs) {
    if (!r.culturalStyle) continue;
    votes.set(r.culturalStyle, (votes.get(r.culturalStyle) ?? 0) + 1);
  }
  let best = "Pakistani contemporary";
  let bestCount = 0;
  for (const [style, count] of votes) {
    if (count > bestCount) {
      best = style;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Build the final image-generation prompt + negative prompt.
 *
 * @param {object} args
 * @param {string} args.userPrompt — free-text from the user ("elegant black chiffon maxi with silver embroidery")
 * @param {object} args.controls — { color, fabric, sleeveLength, shirtLength, trouserStyle, dupattaStyle, fit, garmentCategory, culturalStyle }
 * @param {Array}  args.references — sanitized analysis rows: [{tag, summary, embroideryType, stitchingDensity, dominantColors, culturalStyle}]
 * @returns {{ prompt: string, negative: string }}
 */
export function buildDesignPrompt({ userPrompt, controls = {}, references = [] }) {
  const garmentCategory = pickGarmentCategory(controls, references);
  const culturalStyle = pickCulturalStyle(controls, references);

  const refLines = references.map(describeReference);

  const controlLines = [];
  if (controls.color) controlLines.push(`Primary color: ${controls.color}`);
  if (controls.fabric) controlLines.push(`Fabric: ${controls.fabric}`);
  if (controls.sleeveLength)
    controlLines.push(`Sleeve length: ${controls.sleeveLength}`);
  if (controls.shirtLength)
    controlLines.push(`Shirt length: ${controls.shirtLength}`);
  if (controls.trouserStyle)
    controlLines.push(`Trouser style: ${controls.trouserStyle}`);
  if (controls.dupattaStyle)
    controlLines.push(`Dupatta style: ${controls.dupattaStyle}`);
  if (controls.fit) controlLines.push(`Fit: ${controls.fit}`);
  if (controls.embroideryDensity)
    controlLines.push(`Embroidery density: ${controls.embroideryDensity}`);

  const header = `A full-body luxury fashion photoshoot of a single elegant ${culturalStyle} ${garmentCategory} on a clean studio mannequin against a neutral light-grey seamless backdrop. Premium couture quality, photorealistic, sharp focus on textile texture, realistic fabric drape, accurate symmetrical stitching, professional softbox studio lighting, head-to-toe framing.`;

  const refSection = refLines.length
    ? `Match these design references precisely (each describes one part of the outfit):\n- ${refLines.join("\n- ")}`
    : "";

  const controlSection = controlLines.length
    ? `User-selected options:\n- ${controlLines.join("\n- ")}`
    : "";

  const userSection = userPrompt
    ? `User description: ${userPrompt.trim()}`
    : "";

  const finishLine =
    "Render the full garment head to toe, no cropping, accurate embroidery placement, no random decorative patches, no text, no watermark, no logos.";

  const prompt = joinNonEmpty(
    [header, refSection, controlSection, userSection, finishLine],
    "\n\n"
  );

  return {
    prompt,
    negative: DEFAULT_NEGATIVE,
    resolvedCulturalStyle: culturalStyle,
    resolvedGarmentCategory: garmentCategory
  };
}

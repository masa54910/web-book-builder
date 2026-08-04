import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outDir = path.join(process.cwd(), "public", "sample-images");

const basePrompt = [
  "cinematic realistic photo",
  "same old european hillside town with church steeple",
  "same japanese woman dark hair gray coat",
  "consistent color grade, blue night and warm amber lights",
  "35mm film look",
  "high detail, natural skin texture",
  "no text, no watermark, no logo",
].join(", ");

const scenes = [
  "wide establishing shot from hilltop overlooking town under milky way, glowing church and warm city lights",
  "back view of the same woman walking alone on wet cobblestone street at night, lamps reflecting on pavement",
  "same woman writing in notebook at wooden desk by window, warm desk lamp, town lights and stars outside",
  "profile view of same woman on stone terrace overlooking the town at blue hour, quiet hopeful mood",
  "same woman walking down old street at night with milky way overhead, cinematic depth and reflections",
  "same woman writing at desk by window with church visible outside, intimate night atmosphere",
];

const targetIndex = Number.parseInt(process.argv[2] || "", 10);
const targets = Number.isInteger(targetIndex) && targetIndex >= 1 && targetIndex <= scenes.length
  ? [targetIndex - 1]
  : scenes.map((_, i) => i);

async function fetchImageBuffer(url, retries = 4) {
  let error;
  for (let i = 1; i <= retries; i += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(url, { redirect: "follow", signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      error = err;
      console.error(`Attempt ${i} failed: ${err?.message ?? err}`);
      await new Promise((resolve) => setTimeout(resolve, i * 1200));
    }
  }
  throw error;
}

await fs.mkdir(outDir, { recursive: true });

for (const i of targets) {
  const index = String(i + 1).padStart(2, "0");
  const prompt = `${basePrompt}, ${scenes[i]}`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1600&height=900&seed=${77100 + i}&nologo=true`;
  console.log(`Generating ${index}: ${url}`);
  const raw = await fetchImageBuffer(url);
  const outPath = path.join(outDir, `hoshifuru-${index}.webp`);
  await sharp(raw)
    .resize(1600, 900, { fit: "cover", position: "attention" })
    .webp({ quality: 90, effort: 5 })
    .toFile(outPath);
  console.log(`Saved ${outPath}`);
}

console.log("Done.");

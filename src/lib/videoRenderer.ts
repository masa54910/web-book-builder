import type { BookProject } from "@/lib/bookProject";
import type { PromotionAsset } from "@/lib/promotion";

export type VideoRenderOptions = {
  width: number;
  height: number;
  fps: number;
  secondsPerScene: number;
};

export type VideoRenderResult = {
  blob: Blob;
  mimeType: string;
  fileName: string;
};

export const DEFAULT_VIDEO_OPTIONS: VideoRenderOptions = {
  width: 1920,
  height: 1080,
  fps: 30,
  secondsPerScene: 2.4,
};

export function preferredVideoMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
}

function drawScene(ctx: CanvasRenderingContext2D, project: BookProject, promotion: PromotionAsset, scene: number, options: VideoRenderOptions) {
  const { width, height } = options;
  const grd = ctx.createLinearGradient(0, 0, width, height);
  grd.addColorStop(0, "#fff8ed");
  grd.addColorStop(0.55, "#f4e4cf");
  grd.addColorStop(1, "#e7c994");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,.72)";
  ctx.roundRect(width * 0.08, height * 0.12, width * 0.84, height * 0.74, 34);
  ctx.fill();

  ctx.fillStyle = "#2b2118";
  ctx.textAlign = "center";
  ctx.font = "700 86px serif";
  const title = scene === 0 ? project.config.title : scene === 1 ? project.chapters[0]?.title || project.config.title : "Webで読める一冊に。";
  ctx.fillText(title, width / 2, height * 0.34, width * 0.72);

  ctx.font = "38px serif";
  ctx.fillStyle = "#6b5846";
  const body =
    scene === 0
      ? project.config.subtitle || project.config.description || project.config.author
      : scene === 1
        ? project.chapters[0]?.body.replace(/\s+/g, " ").slice(0, 96) || project.config.description
        : promotion.shareUrl;
  const lines = body.match(/.{1,36}/g)?.slice(0, 3) ?? [body];
  lines.forEach((line, index) => ctx.fillText(line, width / 2, height * 0.48 + index * 56, width * 0.7));

  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#c98222";
  ctx.fillText("Created with WebBookMaker", width / 2, height * 0.78);
}

export async function renderBookTrailer(
  project: BookProject,
  promotion: PromotionAsset,
  options: VideoRenderOptions = DEFAULT_VIDEO_OPTIONS,
): Promise<VideoRenderResult> {
  if (typeof document === "undefined") throw new Error("動画生成はブラウザ上で実行してください。");
  const mimeType = preferredVideoMimeType();
  if (!mimeType) throw new Error("このブラウザは動画レンダリングに対応していません。");

  const canvas = document.createElement("canvas");
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("動画キャンバスを作成できません。");

  const stream = canvas.captureStream(options.fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("動画生成に失敗しました。"));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start();
  const scenes = 4;
  for (let scene = 0; scene < scenes; scene += 1) {
    drawScene(ctx, project, promotion, scene, options);
    await new Promise((resolve) => window.setTimeout(resolve, options.secondsPerScene * 1000));
  }
  recorder.stop();
  const blob = await done;
  const extension = mimeType.includes("mp4") ? "mp4" : "webm";
  return {
    blob,
    mimeType,
    fileName: `${project.config.bookId}-promo.${extension}`,
  };
}

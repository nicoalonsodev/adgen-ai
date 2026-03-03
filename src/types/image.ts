export type AspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export interface ImageGenerateInput {
  prompt: string;
  aspectRatio?: AspectRatio; // default 1:1
  // En Nano Banana (2.5 Flash Image) la resolución depende del aspectRatio (tabla en docs).
  // Si luego pasás a Gemini 3 Pro Image Preview, ahí existe imageSize (2K/4K).
}

export interface ImageGenerateResponse {
  mimeType: string; // "image/png"
  base64: string;   // listo para <img src="data:image/png;base64,...">
  model: string;    // e.g. "gemini-2.5-flash-image"
}

export type BaseImageItem = {
  angle: string;
  dataUrl: string;
  mimeType: string;
  model: string;
};

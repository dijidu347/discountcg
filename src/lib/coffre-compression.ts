import imageCompression from "browser-image-compression";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/pdf",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const PDF_WARN_SIZE = 10 * 1024 * 1024;  // warn above 10 MB for PDFs

export interface CompressedFile {
  file: File;
  originalSize: number;
  compressedSize: number;
}

export function isAcceptedFileType(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");
}

export function isFileTooLarge(file: File): boolean {
  return file.size > MAX_FILE_SIZE;
}

export function isPdfTooBig(file: File): boolean {
  return file.type === "application/pdf" && file.size > PDF_WARN_SIZE;
}

export async function compressFile(file: File): Promise<CompressedFile> {
  const originalSize = file.size;

  // PDF: pass through (true PDF compression requires server-side tools)
  if (file.type === "application/pdf") {
    return { file, originalSize, compressedSize: file.size };
  }

  let imageFile = file;

  // HEIC conversion
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  ) {
    const heic2any = (await import("heic2any")).default;
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
    const converted = Array.isArray(blob) ? blob[0] : blob;
    imageFile = new File([converted], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
      type: "image/jpeg",
    });
  }

  // Compress image
  const compressed = await imageCompression(imageFile, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.65,
  });

  const compressedFile = new File(
    [compressed],
    imageFile.name.replace(/\.[^.]+$/, ".jpg"),
    { type: "image/jpeg" }
  );

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
  };
}

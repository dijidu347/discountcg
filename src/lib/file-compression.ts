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

/**
 * Forces a ".jpg" extension on the compressed file name.
 *
 * The content is always JPEG once compressed, so the name must say so. Files
 * arriving without any extension (common with Android shares and scanner apps)
 * would otherwise keep a bare name, and callers deriving the storage extension
 * with `name.split(".").pop()` would build a nonsensical path.
 */
function toJpgName(name: string): string {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  return `${withoutExtension || "document"}.jpg`;
}

export function isAcceptedFileType(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  // Some browsers (desktop) report empty or "application/octet-stream" MIME type for HEIC
  if (lowerName.endsWith(".heic") || lowerName.endsWith(".heif")) return true;
  return ACCEPTED_TYPES.includes(file.type);
}

export function isFileTooLarge(file: File): boolean {
  return file.size > MAX_FILE_SIZE;
}

export function isPdfTooBig(file: File): boolean {
  return file.type === "application/pdf" && file.size > PDF_WARN_SIZE;
}

export async function compressFile(file: File): Promise<CompressedFile> {
  const originalSize = file.size;
  const lowerName = file.name.toLowerCase();
  const isHeic = file.type === "image/heic" || file.type === "image/heif" ||
    lowerName.endsWith(".heic") || lowerName.endsWith(".heif");

  // Non-image files (PDF, doc, xls, csv, txt…): pass through untouched.
  // Only images are compressed — anything else would make imageCompression throw.
  // HEIC is tested separately because some browsers report an empty MIME type.
  const isImage = file.type.startsWith("image/") || isHeic;

  if (!isImage) {
    return { file, originalSize, compressedSize: file.size };
  }

  let imageFile = file;

  // HEIC conversion — some browsers report empty MIME type for HEIC files
  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.7 });
      const converted = Array.isArray(blob) ? blob[0] : blob;
      imageFile = new File([converted], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
        type: "image/jpeg",
      });
    } catch (heicErr) {
      console.warn("HEIC conversion failed, uploading original file:", heicErr);
      // Fallback: upload the raw HEIC file without conversion
      return { file, originalSize, compressedSize: file.size };
    }
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
    toJpgName(imageFile.name),
    { type: "image/jpeg" }
  );

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
  };
}

// Pieces des demarches pro qui exigent un PDF de moins de 1 Mo : au lieu de
// refuser la photo ou le scan trop lourd du garage, on le convertit nous-memes.
//
// - Photo (JPEG, PNG, HEIC...) : mise en page dans un PDF d'une page.
// - PDF trop lourd : pages redessinees en JPEG, de plus en plus compressees.
// Chaque palier baisse la definition et la qualite jusqu'a passer sous la
// limite ; au dernier palier le document reste lisible pour un agent.
import { compressFile } from "@/lib/file-compression";
import { canvasEnJpeg, rasteriserPdf } from "@/lib/pdf-compression";

export const LIMITE_PDF = 1024 * 1024; // 1 Mo

const PALIERS = [
  { ppp: 150, qualite: 0.7, coteMax: 2000 },
  { ppp: 120, qualite: 0.6, coteMax: 1700 },
  { ppp: 100, qualite: 0.5, coteMax: 1400 },
  { ppp: 85, qualite: 0.45, coteMax: 1200 },
  { ppp: 72, qualite: 0.4, coteMax: 1000 },
];

const A4 = { largeur: 595.28, hauteur: 841.89 }; // en points

export type ResultatPdf = { fichier: File; converti: boolean } | { erreur: string };

function nomPdf(nom: string): string {
  const base = nom.replace(/\.[^.]+$/, "") || "document";
  return `${base}.pdf`;
}

function estPdf(f: File): boolean {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

function estImage(f: File): boolean {
  return f.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|gif|bmp)$/i.test(f.name);
}

async function chargerImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // l'image est deja decodee : l'URL n'est plus utile
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

// Une photo dans une page A4 (orientee comme la photo), centree avec marge.
async function imageEnPdf(img: HTMLImageElement, coteMax: number, qualite: number): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const echelle = Math.min(1, coteMax / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * echelle));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * echelle));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponible");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const doc = await PDFDocument.create();
  const jpeg = await doc.embedJpg(await canvasEnJpeg(canvas, qualite));
  const paysage = canvas.width > canvas.height;
  const page = doc.addPage(paysage ? [A4.hauteur, A4.largeur] : [A4.largeur, A4.hauteur]);
  const marge = 20;
  const zoneL = page.getWidth() - 2 * marge;
  const zoneH = page.getHeight() - 2 * marge;
  const r = Math.min(zoneL / canvas.width, zoneH / canvas.height);
  const l = canvas.width * r;
  const h = canvas.height * r;
  page.drawImage(jpeg, { x: (page.getWidth() - l) / 2, y: (page.getHeight() - h) / 2, width: l, height: h });
  return new Blob([await doc.save()], { type: "application/pdf" });
}

/** Transforme le fichier depose en PDF de moins de 1 Mo, ou explique pourquoi c'est impossible. */
export async function preparerPdfSousLimite(fichier: File): Promise<ResultatPdf> {
  if (estPdf(fichier)) {
    if (fichier.size <= LIMITE_PDF) return { fichier, converti: false };
    for (const palier of PALIERS) {
      const blob = await rasteriserPdf(fichier, { ...palier, ignorerTexte: true });
      if (!blob) break; // illisible ou trop de pages
      if (blob.size <= LIMITE_PDF) {
        return { fichier: new File([blob], nomPdf(fichier.name), { type: "application/pdf" }), converti: true };
      }
    }
    return { erreur: "Ce PDF reste trop lourd même compressé. Déposez-le en plusieurs parties, ou une photo de chaque page." };
  }

  if (estImage(fichier)) {
    try {
      // HEIC et formats exotiques passent d'abord en JPEG
      const { file: jpeg } = await compressFile(fichier);
      const img = await chargerImage(jpeg);
      for (const palier of PALIERS) {
        const blob = await imageEnPdf(img, palier.coteMax, palier.qualite);
        if (blob.size <= LIMITE_PDF) {
          return { fichier: new File([blob], nomPdf(fichier.name), { type: "application/pdf" }), converti: true };
        }
      }
    } catch (e) {
      console.warn("Conversion de la photo en PDF impossible :", e);
      return { erreur: "Cette photo n'a pas pu être lue. Réessayez avec une photo JPEG ou PNG." };
    }
    return { erreur: "Cette photo reste trop lourde même compressée. Réessayez avec une photo moins grande." };
  }

  return { erreur: "Format non pris en charge : déposez un PDF ou une photo (JPEG, PNG, HEIC)." };
}

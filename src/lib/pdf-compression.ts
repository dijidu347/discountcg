// Compression des PDF scannes, dans le navigateur.
//
// Un PDF de scan n'est qu'une suite de grandes images : chaque page est
// redessinee a 150 ppp puis reenregistree en JPEG, comme les photos. Les PDF qui
// contiennent du texte (documents generes, cartes grises definitives, factures)
// ne sont jamais touches : les rasteriser ferait perdre le texte selectionnable
// pour un gain faible. Le resultat n'est garde que s'il est nettement plus leger.

const TAILLE_MINIMALE = 300 * 1024; // en dessous, le gain ne vaut pas le travail
const PAGES_MAX = 30;
const PPP = 150;
const COTE_MAX = 2000; // pixels, pour les tres grands formats
const QUALITE_JPEG = 0.6;
const GAIN_MINIMUM = 0.25; // garder seulement si au moins 25 % plus leger
const TEXTE_MAX_PAR_PAGE = 40; // au-dela, la page porte du vrai texte

let pdfjsCharge: Promise<typeof import("pdfjs-dist")> | null = null;

function chargerPdfjs() {
  if (!pdfjsCharge) {
    pdfjsCharge = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    });
  }
  return pdfjsCharge;
}

export function canvasEnJpeg(canvas: HTMLCanvasElement, qualite = QUALITE_JPEG): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("rendu JPEG impossible"));
        blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject);
      },
      "image/jpeg",
      qualite,
    );
  });
}

export interface ReglagesRaster {
  ppp: number;
  qualite: number;
  coteMax: number;
  /** Rasteriser meme les pages qui portent du texte (conversion forcee). */
  ignorerTexte?: boolean;
}

/**
 * Redessine chaque page du PDF en JPEG. Renvoie null si le PDF est illisible,
 * a trop de pages, ou (sans ignorerTexte) porte du vrai texte.
 */
export async function rasteriserPdf(source: Blob, reglages: ReglagesRaster): Promise<Blob | null> {
  try {
    const pdfjs = await chargerPdfjs();
    const { PDFDocument } = await import("pdf-lib");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await source.arrayBuffer()) }).promise;

    try {
      if (doc.numPages > PAGES_MAX) return null;

      const sortie = await PDFDocument.create();
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);

        const texte = await page.getTextContent();
        const caracteres = texte.items.reduce(
          (total, item) => total + ("str" in item ? item.str.trim().length : 0),
          0,
        );
        if (caracteres > TEXTE_MAX_PAR_PAGE && !reglages.ignorerTexte) return null;

        const format = page.getViewport({ scale: 1 }); // en points
        const echelle = Math.min(reglages.ppp / 72, reglages.coteMax / Math.max(format.width, format.height));
        const vue = page.getViewport({ scale: echelle });

        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(vue.width);
        canvas.height = Math.ceil(vue.height);
        const contexte = canvas.getContext("2d");
        if (!contexte) return null;
        contexte.fillStyle = "#ffffff";
        contexte.fillRect(0, 0, canvas.width, canvas.height);
        // intent "print" : pdf.js dessine sans attendre le rafraichissement de
        // l'ecran, qui est suspendu quand l'onglet est en arriere-plan.
        await page.render({ canvasContext: contexte, viewport: vue, intent: "print" }).promise;

        const image = await sortie.embedJpg(await canvasEnJpeg(canvas, reglages.qualite));
        const nouvelle = sortie.addPage([format.width, format.height]);
        nouvelle.drawImage(image, { x: 0, y: 0, width: format.width, height: format.height });
        page.cleanup();
      }

      const octets = await sortie.save();
      return new Blob([octets], { type: "application/pdf" });
    } finally {
      await doc.destroy();
    }
  } catch (erreur) {
    console.warn("Compression PDF impossible, original conserve :", erreur);
    return null;
  }
}

/**
 * Renvoie une version compressee du PDF, ou null s'il faut garder l'original
 * (petit fichier, PDF texte, trop de pages, illisible, ou gain insuffisant).
 */
export async function compresserPdf(source: Blob): Promise<Blob | null> {
  if (source.size < TAILLE_MINIMALE) return null;
  const resultat = await rasteriserPdf(source, { ppp: PPP, qualite: QUALITE_JPEG, coteMax: COTE_MAX });
  return resultat && resultat.size <= source.size * (1 - GAIN_MINIMUM) ? resultat : null;
}

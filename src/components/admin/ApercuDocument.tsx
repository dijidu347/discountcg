// Le document affiché dans la page, pas dans une fenêtre.
//
// Jusqu'ici tout passait par DocumentViewer, un dialogue : pour lire une date
// sur un Kbis il fallait l'ouvrir, lire, fermer, puis cliquer sur valider. La
// décision et la pièce n'étaient jamais à l'écran en même temps, et la date
// relevée tenait le temps d'un aller-retour de mémoire.
//
// Même résolution d'URL que le dialogue — bucket privé, lien signé — mais
// rendue en place, pour qu'une colonne puisse la garder sous les yeux.

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download, ExternalLink, Loader2 } from "lucide-react";
import {
  getSignedUrl,
  extractBucketFromUrl,
  extractPathFromUrl,
  type StorageBucket,
} from "@/lib/storage-utils";

interface ApercuDocumentProps {
  /** Bucket et chemin, quand on les connaît. */
  bucket?: StorageBucket;
  path?: string;
  /** Sinon l'URL stockée, dont on déduit les deux. */
  documentUrl?: string;
  nomFichier?: string;
  /** Hauteur du cadre ; la valeur par défaut tient dans un écran de portable. */
  className?: string;
}

export function ApercuDocument({
  bucket: bucketProp,
  path: pathProp,
  documentUrl,
  nomFichier,
  className = "h-[70vh]",
}: ApercuDocumentProps) {
  const [lien, setLien] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const bucketResolu = bucketProp || (documentUrl ? extractBucketFromUrl(documentUrl) : null);
  const cheminResolu = pathProp || (documentUrl ? extractPathFromUrl(documentUrl) : null);

  // Un PDF s'affiche dans un cadre, une photo dans une balise image : le type
  // se lit sur l'extension, que ce soit celle du nom ou celle du chemin.
  const estPdf = [nomFichier, cheminResolu, documentUrl].some((v) =>
    (v || "").toLowerCase().split("?")[0].endsWith(".pdf"),
  );

  const charger = useCallback(async () => {
    if (!bucketResolu || !cheminResolu) {
      setErreur("Chemin du document introuvable");
      return;
    }
    setChargement(true);
    setErreur(null);
    try {
      const url = await getSignedUrl(bucketResolu, cheminResolu);
      if (url) setLien(url);
      else setErreur("Document illisible — le fichier a peut-être été supprimé du stockage");
    } catch {
      setErreur("Chargement impossible");
    } finally {
      setChargement(false);
    }
  }, [bucketResolu, cheminResolu]);

  useEffect(() => {
    setLien(null);
    charger();
  }, [charger]);

  return (
    <div className="space-y-2">
      <div className={`relative overflow-auto rounded-lg border bg-muted/30 ${className}`}>
        {chargement && (
          <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Chargement du document…</span>
          </div>
        )}

        {!chargement && erreur && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium text-foreground">{erreur}</p>
            <Button variant="outline" size="sm" onClick={charger}>
              Réessayer
            </Button>
          </div>
        )}

        {!chargement && !erreur && lien && (
          estPdf ? (
            // #view=FitH : le lecteur du navigateur cadre la largeur de la page,
            // sans quoi un A4 arrive à 100 % et il faut le recadrer à la main.
            <iframe
              src={`${lien}#view=FitH`}
              title={nomFichier || "Document"}
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <img
              src={lien}
              alt={nomFichier || "Document"}
              className="mx-auto h-full w-auto max-w-full object-contain"
              onError={() => setErreur("Image illisible")}
            />
          )
        )}
      </div>

      {lien && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={lien} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Plein écran
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={lien} download={nomFichier}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}

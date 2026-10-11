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
import { AlertCircle, Download, ExternalLink, Loader2, Minus, Plus } from "lucide-react";
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
  /** Hauteur de l'aperçu entier — cadre et barre d'outils comprise. La valeur
   *  par défaut tient dans un écran de portable. */
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
  // Le zoom est à nous. Le lecteur du navigateur ouvrait un A4 à 45 %, avec un
  // rail de miniatures pour un document d'une page : illisible, pour la seule
  // chose qu'on ait à y faire — lire une date et une raison sociale.
  const [zoom, setZoom] = useState(100);
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

  // La hauteur demandée se pose sur l'aperçu entier, et le cadre prend ce qui
  // reste une fois la barre d'outils placée. Auparavant elle se posait sur le
  // cadre seul, dans un conteneur de hauteur libre : deux conséquences.
  //
  // L'aperçu ne s'étirait pas à la hauteur de la colonne voisine — il
  // s'arrêtait net et laissait un grand blanc sous lui.
  //
  // Et surtout, le document n'apparaissait qu'à moitié. Un `height: 100%` ne
  // se résout que contre une hauteur définie ; `min-h-[320px]` n'en est pas
  // une. Le cadre faisait bien ses 320 px, mais l'iframe retombait sur la
  // hauteur par défaut d'un cadre HTML — 150 px — et le bas du Kbis
  // disparaissait sous une bande blanche, sans moyen d'y descendre.
  return (
    <div className={`flex min-h-0 flex-col gap-2 ${className}`}>
      <div className="relative min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30">
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
              // toolbar=0 et navpanes=0 retirent la barre d'outils et le rail
              // de miniatures du navigateur. FitH cadre la largeur de la page ;
              // on ne l'envoie qu'au repos, car donner les deux à la fois —
              // « cadre la largeur » et « affiche à tel pourcentage » — laisse
              // le lecteur choisir, et il ne choisit pas toujours le même.
              src={`${lien}#toolbar=0&navpanes=0&${zoom === 100 ? "view=FitH" : `zoom=${zoom}`}`}
              key={zoom}
              title={nomFichier || "Document"}
              // Positionné sur le cadre plutôt qu'en `h-full` : la hauteur est
              // alors celle du cadre, quoi qu'il arrive, et le lecteur PDF
              // défile à l'intérieur.
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          ) : (
            <img
              src={lien}
              alt={nomFichier || "Document"}
              style={{ width: `${zoom}%` }}
              className="mx-auto max-w-none object-contain"
              onError={() => setErreur("Image illisible")}
            />
          )
        )}
      </div>

      {lien && (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="mr-auto flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Réduire"
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs tabular-nums"
              onClick={() => setZoom(100)}
            >
              {zoom} %
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Agrandir"
              onClick={() => setZoom((z) => Math.min(300, z + 25))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
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

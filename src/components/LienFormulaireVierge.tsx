import { Download } from "lucide-react";

// Formulaires officiels qui ne sont pas des Cerfa numérotés servis depuis
// /cerfas : le quitus fiscal (1993). Le lien pointe vers le PDF vierge publié
// par impots.gouv.fr, pour toujours donner la version officielle.
const FORMULAIRES: { motif: RegExp; nom: string; url: string }[] = [
  {
    motif: /1993-PRO/i,
    nom: "formulaire 1993-PRO-D-SD",
    url: "https://www.impots.gouv.fr/sites/default/files/formulaires/1993-pro-d-sd/2023/1993-pro-d-sd_4506.pdf",
  },
  {
    motif: /1993-PART/i,
    nom: "formulaire 1993-PART-D-SD",
    url: "https://www.impots.gouv.fr/sites/default/files/formulaires/1993-part-d/2023/1993-part-d_4505.pdf",
  },
];

export function formulaireVierge(libelle: string | null | undefined) {
  return FORMULAIRES.find((f) => f.motif.test(libelle ?? "")) ?? null;
}

export function LienFormulaireVierge({ label }: { label: string | null | undefined }) {
  const f = formulaireVierge(label);
  if (!f) return null;
  return (
    <a
      href={f.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary underline hover:text-primary/80"
    >
      <Download className="h-3 w-3" />
      Télécharger le {f.nom} vierge
    </a>
  );
}

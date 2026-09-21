import { Download } from "lucide-react";

// Formulaires officiels qui ne sont pas des Cerfa numérotés servis depuis
// /cerfas : le quitus fiscal (1993). Le lien pointe vers le PDF vierge publié
// par impots.gouv.fr, pour toujours donner la version officielle.
const FORMULAIRES: { motif: RegExp; nom: string; url: string }[] = [
  {
    motif: /\(?1993-PRO[A-Z-]*\)?/i,
    nom: "formulaire 1993-PRO-D-SD",
    url: "https://www.impots.gouv.fr/sites/default/files/formulaires/1993-pro-d-sd/2023/1993-pro-d-sd_4506.pdf",
  },
  {
    motif: /\(?1993-PART[A-Z-]*\)?/i,
    nom: "formulaire 1993-PART-D-SD",
    url: "https://www.impots.gouv.fr/sites/default/files/formulaires/1993-part-d/2023/1993-part-d_4505.pdf",
  },
];

export function formulaireVierge(libelle: string | null | undefined) {
  return FORMULAIRES.find((f) => f.motif.test(libelle ?? "")) ?? null;
}

// Libellé de la pièce avec le nom du formulaire, entre parenthèses, en lien
// vers le PDF vierge : « Demande de quitus fiscal signée (1993-PRO-D-SD) ».
export function LibelleFormulaire({ texte }: { texte: string | null | undefined }) {
  const libelle = texte ?? "";
  const f = formulaireVierge(libelle);
  const m = f ? libelle.match(f.motif) : null;
  if (!f || !m || m.index === undefined) return <>{libelle}</>;
  return (
    <>
      {libelle.slice(0, m.index)}
      <a
        href={f.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-primary hover:text-primary/80 underline font-medium whitespace-nowrap"
      >
        {m[0]}
        <Download className="inline h-3 w-3 ml-1 align-baseline" />
      </a>
      {libelle.slice(m.index + m[0].length)}
    </>
  );
}

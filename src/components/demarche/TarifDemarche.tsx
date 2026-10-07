// Le prix, affiché avant que le client s'engage.
//
// Il ne l'était nulle part : prix_base était chargé sur la page démarche puis
// utilisé uniquement pour créer la commande, si bien que le montant
// n'apparaissait qu'une fois dans le tunnel. C'est le grief que la DGCCRF
// relève le plus souvent ici, et il devient une pratique trompeuse quand la
// page annonce par ailleurs la gratuité de la démarche auprès de
// l'administration — le cas qu'elle cite est un site vantant la vignette
// Crit'Air gratuite sans dire que son service coûtait 60 €.
//
// Le montant vient de la base, donc il ne peut pas diverger de celui facturé.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Info, Loader2 } from "lucide-react";
import { CODE_PRO, formatEuro } from "@/lib/tarifsDemarches";

interface TarifDemarcheProps {
  code: string;
  // Les démarches dont le prix comprend une taxe reversée à l'État : le forfait
  // affiché n'est alors que la part qui nous revient.
  avecTaxe: boolean;
}

export const TarifDemarche = ({ code, avecTaxe }: TarifDemarcheProps) => {
  const [prixParticulier, setPrixParticulier] = useState<number | null>(null);
  const [prixPro, setPrixPro] = useState<number | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      // Les deux politiques de lecture ne rendent que les lignes actives : une
      // démarche retirée du catalogue particulier revient donc vide, et c'est
      // exactement ce qu'on veut afficher.
      const [part, pro] = await Promise.all([
        supabase.from("guest_demarche_types").select("prix_base").eq("code", code).maybeSingle(),
        supabase.from("actions_rapides").select("prix").eq("code", CODE_PRO[code] ?? code).maybeSingle(),
      ]);
      if (!vivant) return;
      setPrixParticulier(part.data?.prix_base != null ? Number(part.data.prix_base) : null);
      setPrixPro(pro.data?.prix != null ? Number(pro.data.prix) : null);
      setCharge(true);
    })();
    return () => {
      vivant = false;
    };
  }, [code]);

  if (!charge) {
    return (
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Tarif en cours de chargement…
      </div>
    );
  }

  if (prixParticulier === null && prixPro === null) return null;

  return (
    <div className="mb-6 rounded-lg border bg-background p-5">
      {prixParticulier !== null ? (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{formatEuro(prixParticulier)}</span>
            <span className="text-muted-foreground">de frais de dossier, TTC</span>
          </div>
          {avecTaxe && (
            <p className="mt-2 text-sm text-muted-foreground">
              Auxquels s'ajoutent les taxes dues à l'État, qui dépendent du véhicule et de votre
              département. Le simulateur en donne le montant exact.
            </p>
          )}
        </>
      ) : (
        <p className="font-medium text-foreground">
          Démarche réservée aux professionnels de l'automobile.
        </p>
      )}

      {prixPro !== null && (
        <p className="mt-3 text-sm text-muted-foreground">
          Tarif professionnel : <strong className="text-foreground">{formatEuro(prixPro)}</strong>{" "}
          par démarche, depuis un compte garage.
        </p>
      )}

      <p className="mt-4 flex gap-2 border-t pt-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Ces frais rémunèrent notre service. Vous pouvez effectuer cette démarche vous-même sur{" "}
          <a
            href="https://immatriculation.ants.gouv.fr/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            immatriculation.ants.gouv.fr
          </a>
          , sans frais de service.
        </span>
      </p>
    </div>
  );
};

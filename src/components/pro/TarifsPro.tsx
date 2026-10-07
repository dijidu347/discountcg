// La grille tarifaire professionnelle, lue dans la base.
//
// Même règle que sur les pages démarche : le prix vient d'actions_rapides, pas
// d'un tableau recopié à la main. C'est la seule façon d'être sûr que la page
// qui démarche un garage annonce ce qui lui sera réellement débité.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { formatEuro } from "@/lib/tarifsDemarches";

interface Ligne {
  code: string;
  titre: string;
  prix: number;
}

export const TarifsPro = () => {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const { data } = await supabase
        .from("actions_rapides")
        .select("code, titre, prix")
        .eq("actif", true)
        .order("prix", { ascending: true });
      if (!vivant) return;
      setLignes(
        (data ?? []).map((l) => ({ code: l.code, titre: l.titre, prix: Number(l.prix) }))
      );
    })();
    return () => {
      vivant = false;
    };
  }, []);

  if (lignes === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de la grille tarifaire…
      </div>
    );
  }

  if (!lignes.length) return null;

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Démarche</TableHead>
                <TableHead className="text-right whitespace-nowrap">Frais de service</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lignes.map((l) => (
                <TableRow key={l.code}>
                  <TableCell className="font-medium">{l.titre}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                    {formatEuro(l.prix)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Prix par démarche, sans abonnement ni engagement. Les taxes dues à l'État — taxe
        régionale, taxe de gestion, redevance d'acheminement — s'ajoutent sur les démarches qui en
        génèrent, et sont reversées intégralement.
      </p>
    </>
  );
};

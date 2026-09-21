import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck } from "lucide-react";

// Démarches reçues (réglées) et traitées (finalisées) par type, sur la période
// choisie en haut de la page. Le calcul se fait en base : les démarches
// dépassent le plafond de 1000 lignes d'une requête.

interface Ligne {
  source: "pro" | "particulier";
  type: string;
  titre: string;
  recues: number;
  traitees: number;
}

type Filtre = "tous" | "pro" | "particulier";

// bind : sans lui, la méthode détachée perd son client et plante au premier appel.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;

export function DemarchesRecuesTraitees({ du, au }: { du: Date; au: Date }) {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tous");

  const debut = du.getTime();
  const fin = au.getTime();
  useEffect(() => {
    let annule = false;
    setChargement(true);
    rpc("stats_demarches_par_type", { p_du: new Date(debut).toISOString(), p_au: new Date(fin).toISOString() }).then(({ data, error }) => {
      if (annule) return;
      if (error) console.error("Statistiques par démarche :", error);
      setLignes((data || []) as Ligne[]);
      setChargement(false);
    });
    return () => { annule = true; };
  }, [debut, fin]);

  const visibles = lignes.filter((l) => filtre === "tous" || l.source === filtre);
  const totalRecues = visibles.reduce((s, l) => s + l.recues, 0);
  const totalTraitees = visibles.reduce((s, l) => s + l.traitees, 0);
  const max = Math.max(1, ...visibles.map((l) => Math.max(l.recues, l.traitees)));

  const ONGLETS: { cle: Filtre; texte: string }[] = [
    { cle: "tous", texte: "Tous" },
    { cle: "pro", texte: "Pros" },
    { cle: "particulier", texte: "Particuliers" },
  ];

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            Démarches reçues et traitées
          </CardTitle>
          <CardDescription>
            Sur la période choisie. Reçues : démarches réglées. Traitées : démarches finalisées.
          </CardDescription>
        </div>
        <div role="tablist" className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {ONGLETS.map((o) => {
            const actif = filtre === o.cle;
            return (
              <button
                key={o.cle}
                type="button"
                role="tab"
                aria-selected={actif}
                onClick={() => setFiltre(o.cle)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  actif ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.texte}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
            <p className="text-2xl font-bold text-blue-600 tabular-nums">{chargement ? "…" : totalRecues}</p>
            <p className="text-xs text-muted-foreground mt-1">Démarches reçues (payées)</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{chargement ? "…" : totalTraitees}</p>
            <p className="text-xs text-muted-foreground mt-1">Démarches traitées (finalisées)</p>
          </div>
        </div>

        {chargement ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune démarche reçue ni traitée sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Démarche</TableHead>
                  <TableHead className="text-right">Reçues</TableHead>
                  <TableHead className="text-right">Traitées</TableHead>
                  <TableHead className="hidden sm:table-cell w-[35%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibles.map((l) => (
                  <TableRow key={`${l.source}-${l.type}`}>
                    <TableCell>
                      <span className="font-medium">{l.titre}</span>
                      {filtre === "tous" && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {l.source === "pro" ? "Pro" : "Particulier"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-blue-600">{l.recues}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-emerald-600">{l.traitees}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="space-y-1" aria-hidden>
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${(l.recues / max) * 100}%` }} />
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${(l.traitees / max) * 100}%` }} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

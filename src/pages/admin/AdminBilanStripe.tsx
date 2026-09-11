import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Ce que les comptes Stripe ont encaisse depuis le 30/06/2026, lu directement
// chez Stripe par la fonction bilan-stripe (lecture seule).

interface Virement {
  montant: number;
  date: string;
  statut: string;
  destination: string;
}

interface BilanCompte {
  compte: string;
  erreur?: string;
  paiements?: { nombre: number; montant: number };
  remboursements?: { nombre: number; montant: number };
  frais_stripe?: number;
  vire_vers_la_banque?: number;
  virements?: Virement[];
  solde_disponible?: number;
  solde_en_attente?: number;
}

interface Bilan {
  depuis: string;
  comptes: BilanCompte[];
}

const eur = (n = 0) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function AdminBilanStripe() {
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [calculeLe, setCalculeLe] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (supabase.from as unknown as (t: string) => ReturnType<typeof supabase.from>)("bilan_stripe")
      .select("resultat, calcule_le")
      .eq("id", "dernier")
      .maybeSingle()
      .then(({ data }: { data: { resultat: Bilan; calcule_le: string } | null }) => {
        if (data) {
          setBilan(data.resultat);
          setCalculeLe(data.calcule_le);
        }
      });
  }, []);

  const interroger = async () => {
    setEnCours(true);
    setErreur(null);
    const { data, error } = await supabase.functions.invoke("bilan-stripe");
    setEnCours(false);
    if (error || data?.error) return setErreur(data?.error || error?.message || "Erreur inconnue");
    setBilan(data as Bilan);
    setCalculeLe(new Date().toISOString());
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Helmet>
        <title>Bilan Stripe</title>
      </Helmet>
      <Card>
        <CardHeader>
          <CardTitle>Encaissements Stripe depuis le 30/06/2026</CardTitle>
          <CardDescription>
            Chiffres lus directement chez Stripe, pour les deux comptes. Lecture seule : rien n'est modifié chez Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Button onClick={interroger} disabled={enCours}>
            {enCours ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Interrogation de Stripe…</> : "Interroger Stripe"}
          </Button>
          {calculeLe && (
            <span className="text-sm text-muted-foreground">
              Dernière lecture : {new Date(calculeLe).toLocaleString("fr-FR")}
            </span>
          )}
          {erreur && <span className="text-sm text-destructive">{erreur}</span>}
        </CardContent>
      </Card>

      {bilan?.comptes.map((c) => (
        <Card key={c.compte}>
          <CardHeader>
            <CardTitle className="text-lg">{c.compte}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {c.erreur ? (
              <p className="text-sm text-destructive">{c.erreur}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm tabular-nums">
                  <div>
                    <p className="text-muted-foreground">Encaissé</p>
                    <p className="text-xl font-bold">{eur(c.paiements?.montant)}</p>
                    <p className="text-xs text-muted-foreground">{c.paiements?.nombre} paiements</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remboursé</p>
                    <p className="text-xl font-bold">{eur(c.remboursements?.montant)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frais Stripe</p>
                    <p className="text-xl font-bold">−{eur(c.frais_stripe)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Viré vers la banque</p>
                    <p className="text-xl font-bold">{eur(c.vire_vers_la_banque)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Solde disponible</p>
                    <p className="text-xl font-bold">{eur(c.solde_disponible)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Solde en attente</p>
                    <p className="text-xl font-bold">{eur(c.solde_en_attente)}</p>
                  </div>
                </div>
                {c.virements && c.virements.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm tabular-nums">
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="py-2 text-left font-normal">Date</th>
                          <th className="py-2 text-right font-normal">Montant</th>
                          <th className="py-2 text-left font-normal pl-4">Vers</th>
                          <th className="py-2 text-left font-normal">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.virements.map((v, i) => (
                          <tr key={i} className="border-t">
                            <td className="py-1.5">{new Date(v.date).toLocaleDateString("fr-FR")}</td>
                            <td className="text-right">{eur(v.montant)}</td>
                            <td className="pl-4">{v.destination}</td>
                            <td>{v.statut}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

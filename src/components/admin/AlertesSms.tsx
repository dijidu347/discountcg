import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EnvoiSms {
  id: string;
  created_at: string;
  contexte: string;
  reference: string | null;
  destinataire: string | null;
  envoye: boolean;
  erreur: string | null;
}

const LIBELLES_CONTEXTE: Record<string, string> = {
  paiement_pro: "Paiement pro",
  paiement_particulier: "Paiement particulier",
  paiement_client: "Paiement client",
  jetons: "Payé en jetons",
  test: "Test",
};

// Alertes SMS des dossiers prioritaires : les derniers envois, réussis ou non.
export function AlertesSms() {
  const [envois, setEnvois] = useState<EnvoiSms[]>([]);

  const charger = async () => {
    const { data } = await supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("sms_envois" as any)
      .select("id, created_at, contexte, reference, destinataire, envoye, erreur")
      .order("created_at", { ascending: false })
      .limit(10);
    setEnvois((data as unknown as EnvoiSms[]) || []);
  };

  useEffect(() => {
    charger();
  }, []);

  return (
    <Card className="mb-8">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Alertes SMS des dossiers prioritaires
          </CardTitle>
          <CardDescription>Chaque SMS envoyé par le site, réussi ou non.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {envois.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun SMS enregistré pour l'instant.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {envois.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                      {new Date(e.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{LIBELLES_CONTEXTE[e.contexte] || e.contexte}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.reference || "—"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.destinataire ? `n° finissant par ${e.destinataire.replace("…", "")}` : ""}</td>
                    <td className="py-2">
                      {e.envoye ? (
                        <Badge className="bg-green-600">Envoyé</Badge>
                      ) : (
                        <span className="flex flex-col gap-1">
                          <Badge variant="destructive" className="w-fit">Échec</Badge>
                          {e.erreur && <span className="text-xs text-muted-foreground">{e.erreur}</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { messageServeur } from "@/lib/erreurServeur";

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

// Alertes SMS des dossiers prioritaires : les derniers envois (réussis ou non)
// et un SMS de test, qui indique aussi le compte SMS Partner utilisé.
export function AlertesSms() {
  const { toast } = useToast();
  const [envois, setEnvois] = useState<EnvoiSms[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [compte, setCompte] = useState<{ email?: string | null; identifiant?: string | null; credits?: unknown } | null>(null);

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

  const envoyerTest = async () => {
    setEnvoiEnCours(true);
    const { data, error } = await supabase.functions.invoke("alerte-sms", { body: { test: true } });
    setEnvoiEnCours(false);
    if (error) {
      toast({ title: "Test impossible", description: await messageServeur(error, "Réessayez dans un instant."), variant: "destructive" });
      return;
    }
    setCompte(data?.compte ?? null);
    toast(
      data?.envoye
        ? { title: "SMS de test envoyé", description: "Vérifiez le téléphone d'alerte." }
        : { title: "SMS de test non envoyé", description: data?.erreur || "SMS Partner a refusé l'envoi.", variant: "destructive" },
    );
    charger();
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Alertes SMS des dossiers prioritaires
          </CardTitle>
          <CardDescription>Chaque SMS envoyé par le site, réussi ou non.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={envoyerTest} disabled={envoiEnCours}>
          <Send className="h-4 w-4 mr-2" />
          {envoiEnCours ? "Envoi..." : "Envoyer un SMS de test"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {compte && (
          <p className="text-sm text-muted-foreground">
            Compte SMS Partner utilisé : <strong>{compte.email || compte.identifiant || "inconnu"}</strong>
            {compte.credits != null && <> · crédit restant : {String(compte.credits)}</>}
          </p>
        )}
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

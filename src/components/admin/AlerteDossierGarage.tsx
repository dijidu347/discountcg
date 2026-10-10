// Le dossier du garage, vu depuis la démarche qu'il vient de déposer.
//
// On ne bloque jamais une démarche : un garage dont le Kbis a six mois et un
// jour continue de travailler. Mais le dossier doit se traiter en sachant ce
// qui manque, et c'est au moment où la démarche arrive qu'on a le prétexte —
// et l'urgence — pour réclamer la pièce.
//
// L'alerte existait déjà, mais pour le seul Kbis périmé. Elle ne disait donc
// rien d'un garage sans carte d'identité, ni d'un garage qui n'a jamais rien
// déposé. Elle couvre maintenant les trois cas, et elle les nomme.
//
// Deux visages :
//   — orange, quand une pièce manque : ce qui manque exactement, et un bouton
//     qui le demande par email avec le lien pour la déposer ;
//   — vert, quand le garage a répondu : la pièce est là, il ne reste qu'à la
//     contrôler, et le bouton mène droit à sa fiche.

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { chargerDossierGarage, type DossierGarage } from "@/lib/etatDossierGarage";

const LIEN_DEPOT = "https://discountcartegrise.fr/garage-settings";

interface Props {
  garage: { id: string; email?: string | null; raison_sociale?: string | null } | null;
  reference?: string | null;
}

export function AlerteDossierGarage({ garage, reference }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dossier, setDossier] = useState<DossierGarage | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);

  const charger = useCallback(async () => {
    if (!garage?.id) return;
    setDossier(await chargerDossierGarage(garage.id));
  }, [garage?.id]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (!garage?.id || !dossier || dossier.etat === "verifie") return null;

  const demander = async () => {
    if (!garage.email) {
      toast({ title: "Pas d'adresse e-mail pour ce garage", variant: "destructive" });
      return;
    }
    setEnvoi(true);

    const liste = dossier.motifs.map((m) => `• ${m}`).join("\n");
    const message =
      `Nous avons bien reçu votre démarche${reference ? ` ${reference}` : ""}.\n\n` +
      `Pour pouvoir la traiter, votre dossier doit être à jour. Il manque :\n${liste}\n\n` +
      `Déposez la ou les pièces depuis votre espace : ${LIEN_DEPOT}\n\n` +
      `Votre vérification est rétablie dès leur contrôle.`;

    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        type: "custom_notification",
        to: garage.email,
        data: {
          customerName: garage.raison_sociale,
          subject: "Pièces à déposer pour traiter votre démarche",
          message,
        },
      },
    });

    // Le même message dans son espace : un garage qui ne lit pas ses mails le
    // retrouve en se connectant.
    await supabase.from("garage_verification_notifications").insert({
      garage_id: garage.id,
      subject: "Pièces à déposer pour traiter votre démarche",
      message,
    });

    setEnvoi(false);
    setEnvoyee(true);
    toast({
      title: error ? "Demande enregistrée, email non parti" : "Demande envoyée",
      description: error ? "Le garage la retrouvera dans son espace." : garage.email,
      variant: error ? "destructive" : undefined,
    });
  };

  // Le garage a répondu : des pièces attendent notre contrôle.
  if (dossier.etat === "a_verifier") {
    return (
      <Card className="border-green-300 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-6 w-6 shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="font-semibold">Le garage a déposé la pièce demandée</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {dossier.motifs.length ? dossier.motifs.join(" · ") : "Elle attend votre contrôle."}
                {dossier.enAttenteDepuis && (
                  <> Déposée le {new Date(dossier.enAttenteDepuis).toLocaleDateString("fr-FR")}.</>
                )}
              </p>
              <Button
                size="sm"
                className="mt-3 bg-green-600 hover:bg-green-700"
                onClick={() => navigate(`/admin/garages/${garage.id}`)}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Vérifier le garage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Il manque quelque chose, et c'est au garage de le fournir.
  return (
    <Card className="border-orange-300 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-orange-500" />
          <div className="flex-1">
            <p className="font-semibold">
              Ce garage n'est pas en règle
              {dossier.etat === "aucun_document" && " — il n'a jamais rien déposé"}
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {dossier.motifs.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              La démarche se traite quand même — mais demandez la pièce, elle sera exigée tôt ou
              tard.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={envoi || envoyee}
                onClick={demander}
              >
                {envoi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {envoyee ? "Demande envoyée" : "Demander les pièces"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/admin/garages/${garage.id}`)}>
                Ouvrir la fiche
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

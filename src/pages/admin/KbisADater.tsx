// La file des Kbis dont la lecture automatique n'a pas trouvé la date.
//
// Environ un Kbis sur sept : l'OCR ouvre bien le fichier mais n'y repère pas la
// date de délivrance — une photo de travers, un scan pâle, ou un document qui
// n'est pas un Kbis. Jusqu'ici ces lignes restaient « en attente » sans
// attendre personne, et un garage pouvait redéposer cinq fois le même fichier
// en quatre jours sans jamais recevoir de réponse.
//
// Le geste à faire est toujours le même et tient en dix secondes : lire une
// date sur un papier, la recopier. Le passage par la liste des garages puis par
// une fiche coûtait trente fois plus que le geste lui-même. D'où cette file :
// le document à gauche, le champ à droite, et on enchaîne.
//
// Deux cas s'y présentent, et ils n'appellent pas le même geste :
//   — le garage n'a aucun Kbis valable : il y a vraiment une date à saisir, et
//     sans elle il reste bloqué ;
//   — le garage a déjà un Kbis approuvé et daté : la ligne non datée est un
//     doublon, ou une pièce déposée au mauvais endroit. Rien à lire dessus,
//     juste à la retirer — sans rien lui dire, puisqu'il n'y a rien à demander.

import { Helmet } from "react-helmet-async";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApercuDocument } from "@/components/admin/ApercuDocument";
import { RefuserDocumentBouton, SupprimerDocumentBouton } from "@/components/admin/DocumentVerificationActions";
import { supprimerDocumentVerification } from "@/lib/supprimerDocumentVerification";
import { refuserDocumentVerification } from "@/lib/refuserDocumentVerification";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Ligne {
  id: string;
  garage_id: string;
  nom_fichier: string;
  url: string;
  created_at: string;
  lu_le: string | null;
  activite: string | null;
  garage: string;
  garageEmail: string | null;
  garageVerifie: boolean;
  /** Le garage a déjà un Kbis approuvé, daté, encore dans ses six mois. */
  doublon: boolean;
}

export default function KbisADater() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [position, setPosition] = useState(0);
  const [date, setDate] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [traites, setTraites] = useState(0);

  const charger = useCallback(async () => {
    setChargement(true);

    const { data: sansDate } = await supabase
      .from("verification_documents")
      .select("id, garage_id, nom_fichier, url, created_at, lu_le, activite")
      .eq("status", "pending")
      .ilike("document_type", "%kbis%")
      .not("lu_le", "is", null)
      .is("date_emission", null)
      .order("created_at", { ascending: false });

    const enAttente = sansDate || [];
    const garageIds = [...new Set(enAttente.map((d) => d.garage_id))];
    if (!garageIds.length) {
      setLignes([]);
      setChargement(false);
      return;
    }

    const [{ data: garages }, { data: valables }] = await Promise.all([
      supabase.from("garages").select("id, raison_sociale, email, is_verified").in("id", garageIds),
      supabase
        .from("verification_documents")
        .select("garage_id, date_emission")
        .eq("status", "approved")
        .ilike("document_type", "%kbis%")
        .not("date_emission", "is", null)
        .in("garage_id", garageIds),
    ]);

    const nomDuGarage = new Map((garages || []).map((g) => [g.id, g]));
    // Un Kbis vaut six mois à compter de sa délivrance.
    const avecKbisValable = new Set(
      (valables || [])
        .filter((d) => {
          const fin = new Date(d.date_emission as string);
          fin.setMonth(fin.getMonth() + 6);
          return fin > new Date();
        })
        .map((d) => d.garage_id),
    );

    const toutes: Ligne[] = enAttente.map((d) => ({
      ...d,
      garage: nomDuGarage.get(d.garage_id)?.raison_sociale || "Garage inconnu",
      garageEmail: nomDuGarage.get(d.garage_id)?.email ?? null,
      garageVerifie: !!nomDuGarage.get(d.garage_id)?.is_verified,
      doublon: avecKbisValable.has(d.garage_id),
    }));

    // Les vraies dates à saisir d'abord : ce sont les seules qui bloquent un
    // garage. Les doublons se nettoient ensuite, d'un bouton.
    toutes.sort((a, b) => Number(a.doublon) - Number(b.doublon));

    setLignes(toutes);
    setPosition(0);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const courant = lignes[position] ?? null;

  // Le champ repart vide à chaque pièce : une date qui traîne d'un document à
  // l'autre serait pire que pas de date du tout.
  useEffect(() => {
    setDate("");
  }, [courant?.id]);

  const restants = useMemo(
    () => ({
      aSaisir: lignes.filter((l) => !l.doublon).length,
      doublons: lignes.filter((l) => l.doublon).length,
    }),
    [lignes],
  );

  const retirerDeLaFile = (id: string) => {
    setLignes((prev) => {
      const suivantes = prev.filter((l) => l.id !== id);
      setPosition((p) => Math.min(p, Math.max(0, suivantes.length - 1)));
      return suivantes;
    });
    setTraites((n) => n + 1);
  };

  const valider = async () => {
    if (!courant || !date) return;
    setEnregistrement(true);
    const { error } = await supabase
      .from("verification_documents")
      // types.ts est généré depuis la base et ne connaît pas encore la colonne.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        date_emission: date,
        status: "approved",
        validated_by: user?.id,
        validated_at: new Date().toISOString(),
        rejection_reason: null,
      } as any)
      .eq("id", courant.id);
    setEnregistrement(false);

    if (error) {
      toast({ title: "Date non enregistrée", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Kbis daté et approuvé", description: courant.garage });
    retirerDeLaFile(courant.id);
  };

  const supprimer = async (doc: { id: string; url?: string | null }) => {
    const { ok, message, fichierRestant } = await supprimerDocumentVerification(doc);
    if (!ok) {
      toast({ title: "Suppression impossible", description: message, variant: "destructive" });
      return;
    }
    toast({
      title: "Document supprimé",
      description: fichierRestant
        ? "Le fichier est resté dans le stockage. Le garage n'a pas été prévenu."
        : "Le garage n'a pas été prévenu.",
    });
    retirerDeLaFile(doc.id);
  };

  const refuser = async (doc: Ligne, raison: string) => {
    const { ok, message, emailEnvoye } = await refuserDocumentVerification({
      doc,
      garage: { id: doc.garage_id, email: doc.garageEmail, raison_sociale: doc.garage },
      parUtilisateur: user?.id,
      raison,
    });
    if (!ok) {
      toast({ title: "Refus impossible", description: message, variant: "destructive" });
      return;
    }
    toast({
      title: "Document refusé",
      description: emailEnvoye
        ? `${doc.garage} a été prévenu par email.`
        : `${doc.garage} retrouvera le message dans son espace — l'email, lui, n'est pas parti.`,
      variant: emailEnvoye ? undefined : "destructive",
    });
    retirerDeLaFile(doc.id);
  };

  const passer = () => setPosition((p) => (p + 1) % Math.max(1, lignes.length));

  const entete = (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" onClick={() => navigate("/admin")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour
      </Button>
      <Button variant="outline" asChild>
        <Link to="/admin/manage-garages" state={{ onglet: "kbis_a_dater" }}>
          Voir la liste des garages
        </Link>
      </Button>
    </div>
  );

  if (chargement) {
    return (
      <div className="container mx-auto px-4 py-8">
        {entete}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement de la file…
        </div>
      </div>
    );
  }

  if (!courant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
          <title>Admin - Dates de Kbis | Discount Carte Grise</title>
        </Helmet>
        <div className="container mx-auto px-4 py-8">
          {entete}
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-lg font-semibold">Plus aucun Kbis n'attend sa date.</p>
              {traites > 0 && (
                <p className="text-sm text-muted-foreground">
                  {traites} pièce{traites > 1 ? "s" : ""} traitée{traites > 1 ? "s" : ""} dans cette session.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin - Dates de Kbis | Discount Carte Grise</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8">
        {entete}

        <div className="mb-4">
          <h1 className="text-3xl font-bold">Dates de Kbis à saisir</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {restants.aSaisir > 0 && (
              <>
                {restants.aSaisir} date{restants.aSaisir > 1 ? "s" : ""} à recopier
                {restants.doublons > 0 && " · "}
              </>
            )}
            {restants.doublons > 0 && (
              <>
                {restants.doublons} doublon{restants.doublons > 1 ? "s" : ""} à retirer
              </>
            )}
            {" · pièce "}
            {position + 1} sur {lignes.length}
          </p>
        </div>

        {/* Le document à gauche, la décision à droite : la date se lit et se
            recopie sans quitter l'écran. */}
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)]">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="truncate text-sm font-medium">{courant.nom_fichier}</p>
              <p className="shrink-0 text-xs text-muted-foreground">
                déposé le {format(new Date(courant.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
              </p>
            </div>
            <ApercuDocument
              key={courant.id}
              documentUrl={courant.url}
              nomFichier={courant.nom_fichier}
              className="h-[72vh]"
            />
          </div>

          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardContent className="space-y-1 py-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{courant.garage}</p>
                  {courant.garageVerifie ? (
                    <Badge className="shrink-0 bg-green-600">Vérifié</Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">Non vérifié</Badge>
                  )}
                </div>
                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                  <Link to={`/admin/garages/${courant.garage_id}`}>
                    Ouvrir la fiche
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {courant.doublon ? (
              <Card className="border-2 border-muted">
                <CardContent className="space-y-3 py-4">
                  <p className="text-sm font-semibold">Rien à saisir ici</p>
                  <p className="text-sm text-muted-foreground">
                    Ce garage a déjà un Kbis approuvé et daté, encore valable. Cette pièce est un
                    doublon, ou un document déposé au mauvais endroit : il n'y a pas de date à en
                    tirer.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <SupprimerDocumentBouton
                      doc={courant}
                      onSupprime={supprimer}
                      libelle="Supprimer et suivant"
                    />
                    <RefuserDocumentBouton doc={courant} onRefuse={refuser} />
                    {lignes.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={passer}>
                        Passer
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-yellow-500">
                <CardContent className="space-y-3 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-kbis">Date de délivrance</Label>
                    <Input
                      id="date-kbis"
                      type="date"
                      autoFocus
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") valider();
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Celle portée sur le document, qui fait courir les six mois. Entrée pour valider.
                    </p>
                  </div>

                  {courant.activite && (
                    <p className="text-xs text-muted-foreground">
                      Activité lue : « {courant.activite} »
                    </p>
                  )}

                  <Button className="w-full" onClick={valider} disabled={!date || enregistrement}>
                    {enregistrement ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Valider et suivant
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    La date est enregistrée et la pièce approuvée. « Refuser » écrit au garage et lui
                    demande une pièce corrigée ; « Supprimer » ne lui dit rien, pour les doublons.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <RefuserDocumentBouton doc={courant} onRefuse={refuser} />
                    <SupprimerDocumentBouton doc={courant} onSupprime={supprimer} />
                    {lignes.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={passer}>
                        Passer
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

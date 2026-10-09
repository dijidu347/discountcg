import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Les mouvements de solde passent par le serveur : le site ne peut plus
// modifier lui-meme token_balance (voir migration 20260915100000).
type AppelServeur = (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const appelServeur = supabase.rpc.bind(supabase) as unknown as AppelServeur;
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, ShieldCheck, Send, Loader2, History, Upload, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ApercuDocument } from "@/components/admin/ApercuDocument";
import { EtatDocument, RefuserDocumentBouton, SupprimerDocumentBouton } from "@/components/admin/DocumentVerificationActions";
import { supprimerDocumentVerification } from "@/lib/supprimerDocumentVerification";
import { refuserDocumentVerification, historiqueDesRefus, type DocumentRefuse } from "@/lib/refuserDocumentVerification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface RequiredDocument {
  id: string;
  code: string;
  nom_document: string;
  description: string;
  obligatoire: boolean;
  ordre: number;
  actif: boolean;
}

interface NotificationRow {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  sent_by: string;
}

interface GarageVerificationPanelProps {
  garage: any;
  /**
   * Appelé après toute écriture qui modifie la ligne `garages`
   * (vérification, refus, don de jetons), avec le patch appliqué.
   */
  onGarageChanged?: (patch: Record<string, any>) => void;
  /**
   * Ouverture du don de jetons pilotée depuis la fiche garage : le bouton vit
   * dans la carte « Solde de jetons » en haut de page, le dialogue reste ici.
   */
  donJetonsOuvert?: boolean;
  onDonJetonsOuvertChange?: (ouvert: boolean) => void;
}

/**
 * Vérification d'un garage : documents requis croisés avec les fichiers déposés,
 * approbation / refus (unitaire et en lot), upload admin, notifications et don
 * de jetons.
 *
 * Ce bloc vivait auparavant dans le dialogue "Documents" de ManageGarages. Il a
 * été extrait tel quel pour être rendu en pleine page dans la fiche garage,
 * quand les deux boutons de la liste ont été remplacés par "Voir la fiche".
 */
export function GarageVerificationPanel({
  garage,
  onGarageChanged,
  donJetonsOuvert,
  onDonJetonsOuvertChange,
}: GarageVerificationPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [verificationDocs, setVerificationDocs] = useState<any[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationRow[]>([]);
  const [viewerDoc, setViewerDoc] = useState<any>(null);
  // La piece affichee dans la colonne de gauche.
  const [idChoisi, setIdChoisi] = useState<string | null>(null);
  const [classeOuvert, setClasseOuvert] = useState(false);
  const [refus, setRefus] = useState<DocumentRefuse[]>([]);
  const [typeAUploader, setTypeAUploader] = useState("kbis");
  const [activeTab, setActiveTab] = useState("documents");

  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectAccountReason, setRejectAccountReason] = useState("");
  const [processingGarage, setProcessingGarage] = useState(false);

  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  const [donJetonsInterne, setDonJetonsInterne] = useState(false);
  const showOfferTokensDialog = donJetonsOuvert ?? donJetonsInterne;
  const setShowOfferTokensDialog = onDonJetonsOuvertChange ?? setDonJetonsInterne;
  const [tokensToOffer, setTokensToOffer] = useState("");
  const [offeringTokens, setOfferingTokens] = useState(false);

  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRequiredDocs();
  }, []);

  useEffect(() => {
    if (garage?.id) {
      loadVerificationDocs(garage.id);
      loadNotificationHistory(garage.id);
      historiqueDesRefus(garage.id).then(setRefus);
    }
  }, [garage?.id]);

  const loadRequiredDocs = async () => {
    const { data } = await supabase
      .from("garage_verification_required_documents")
      .select("*")
      .order("ordre", { ascending: true });
    setRequiredDocs(data || []);
  };

  const loadVerificationDocs = async (garageId: string) => {
    const { data } = await supabase
      .from("verification_documents")
      .select("*")
      .eq("garage_id", garageId)
      .order("created_at", { ascending: false });
    setVerificationDocs(data || []);
  };

  const loadNotificationHistory = async (garageId: string) => {
    const { data } = await supabase
      .from("garage_verification_notifications")
      .select("*")
      .eq("garage_id", garageId)
      .order("created_at", { ascending: false });
    setNotificationHistory(data || []);
  };


  // L'âge du Kbis en clair, pour que l'administration le voie avant d'accorder
  // la vérification plutôt que de le découvrir à la relance, six mois plus tard.
  const ageDuKbis = (emission: string | null | undefined) => {
    if (!emission) return null;
    const fin = new Date(emission);
    fin.setMonth(fin.getMonth() + 6);
    const jours = Math.round((fin.getTime() - Date.now()) / 86400000);
    if (jours < 0) return { alerte: true, texte: `périmé depuis ${-jours} jour${-jours > 1 ? "s" : ""}` };
    if (jours <= 30) return { alerte: true, texte: `expire dans ${jours} jour${jours > 1 ? "s" : ""}` };
    return { alerte: false, texte: `valable encore ${jours} jours` };
  };

  // Kbis dépassé : six mois à compter de sa date de délivrance.
  const kbisPerime = Boolean(
    garage?.kbis_valide_jusqu_au && new Date(garage.kbis_valide_jusqu_au) < new Date(),
  );

  const getDocumentsByType = (docType: string) =>
    verificationDocs.filter((d) => d.document_type === docType);

  const nomDuType = (code: string) =>
    requiredDocs.find((r) => r.code === code)?.nom_document ?? code;

  // Un Kbis approuve, date, et encore dans ses six mois : la preuve que le
  // garage est en regle. Elle decide du sort des autres lignes.
  const kbisValableApprouve = verificationDocs.some((d) => {
    if (d.document_type !== "kbis" || d.status !== "approved" || !d.date_emission) return false;
    const fin = new Date(d.date_emission);
    fin.setMonth(fin.getMonth() + 6);
    return fin > new Date();
  });

  // Trois sorts possibles pour une piece, nommes par le geste qu'ils appellent.
  //
  // « Date a saisir » ne vaut que si le garage n'a pas deja un Kbis valable.
  // Sinon la ligne non datee n'est pas une date a recopier : c'est un doublon,
  // ou une piece deposee au mauvais endroit — PG AUTO SERVICES avait mis ses
  // statuts dans l'emplacement Kbis avant de deposer le bon document vingt
  // minutes plus tard. Il n'y a rien a lire dessus, juste a la retirer.
  const sortDuDocument = (doc: any): "a_dater" | "a_controler" | "classe" => {
    if (doc.status !== "pending") return "classe";
    const sansDate = doc.document_type === "kbis" && doc.lu_le && !doc.date_emission;
    if (sansDate && !kbisValableApprouve) return "a_dater";
    return "a_controler";
  };

  const GROUPES = [
    { cle: "a_dater" as const, titre: "Date à saisir" },
    { cle: "a_controler" as const, titre: "À contrôler" },
    { cle: "classe" as const, titre: "Classé" },
  ];

  const parGroupe = {
    a_dater: verificationDocs.filter((d) => sortDuDocument(d) === "a_dater"),
    a_controler: verificationDocs.filter((d) => sortDuDocument(d) === "a_controler"),
    classe: verificationDocs.filter((d) => sortDuDocument(d) === "classe"),
  };

  // Pieces requises dont rien n'est arrive : ce que le garage doit encore faire.
  const manquants = requiredDocs.filter(
    (r) => r.actif && !verificationDocs.some((d) => d.document_type === r.code),
  );

  const docChoisi = verificationDocs.find((d) => d.id === idChoisi) ?? null;

  // A l'ouverture, la page se place sur la premiere piece qui attend un geste :
  // une date a saisir d'abord, un controle ensuite. Afficher un document ne
  // declenche rien, donc le preselectionner ne coute rien.
  useEffect(() => {
    if (!verificationDocs.length) return;
    if (idChoisi && verificationDocs.some((d) => d.id === idChoisi)) return;
    const premier = parGroupe.a_dater[0] ?? parGroupe.a_controler[0] ?? verificationDocs[0];
    setIdChoisi(premier?.id ?? null);
  }, [verificationDocs]);

  const refuserDoc = async (doc: any, raison: string) => {
    const { ok, message, emailEnvoye } = await refuserDocumentVerification({
      doc,
      garage,
      parUtilisateur: user?.id,
      raison,
    });
    if (!ok) {
      toast({ title: "Refus impossible", description: message, variant: "destructive" });
      return;
    }
    if (doc.id === idChoisi) setIdChoisi(null);
    toast({
      title: "Document refusé",
      description: emailEnvoye
        ? "Le garage a été prévenu par email."
        : "Le garage retrouvera le message dans son espace — l'email, lui, n'est pas parti.",
      variant: emailEnvoye ? undefined : "destructive",
    });
    await loadVerificationDocs(garage.id);
    await loadNotificationHistory(garage.id);
    setRefus(await historiqueDesRefus(garage.id));
  };

  const supprimerDoc = async (doc: any) => {
    const { ok, message, fichierRestant } = await supprimerDocumentVerification(doc);
    if (!ok) {
      toast({ title: "Suppression impossible", description: message, variant: "destructive" });
      return;
    }
    if (doc.id === idChoisi) setIdChoisi(null);
    toast({
      title: "Document supprimé",
      description: fichierRestant
        ? "La ligne est retirée ; le fichier est resté dans le stockage. Le garage n'a pas été prévenu."
        : "Le garage n'a pas été prévenu.",
    });
    await loadVerificationDocs(garage.id);
  };

  const handleBulkApprove = async (aApprouver: string[]) => {
    if (aApprouver.length === 0) return;

    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({
          status: "approved",
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .in("id", aApprouver);

      if (error) throw error;

      await supabase.functions.invoke("send-email", {
        body: {
          type: "custom_notification",
          to: garage.email,
          data: {
            customerName: garage.raison_sociale,
            subject: "Documents approuvés",
            message: `Vos documents de vérification ont été approuvés. ${aApprouver.length} document(s) validé(s).`,
          },
        },
      });

      toast({
        title: "Documents approuvés",
        description: `${aApprouver.length} document(s) validé(s)`,
      });

      await loadVerificationDocs(garage.id);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver les documents",
        variant: "destructive",
      });
    }
  };


  // La date portée sur le Kbis, celle qui fait courir les six mois. Elle se
  // saisit au moment où l'administration regarde le document ; sans elle, la
  // validité repart du dépôt, comme avant.
  const enregistrerDateKbis = async (docId: string, valeur: string) => {
    const { error } = await supabase
      .from("verification_documents")
      // types.ts est généré depuis la base et ne connaît pas encore la colonne.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ date_emission: valeur || null } as any)
      .eq("id", docId);
    if (error) {
      toast({ title: "Date non enregistrée", description: error.message, variant: "destructive" });
      return;
    }
    await loadVerificationDocs(garage.id);
  };

  const handleSingleApprove = async (docId: string) => {
    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({
          status: "approved",
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq("id", docId);

      if (error) throw error;

      toast({ title: "Document approuvé" });
      await loadVerificationDocs(garage.id);
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };


  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !garage || !uploadingDocType) return;

    const extension = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(extension)) {
      toast({
        title: "Format non accepté",
        description: "Déposez un PDF ou une photo (JPG, PNG). Une archive ZIP ne peut pas être lue.",
        variant: "destructive",
      });
      if (adminFileInputRef.current) adminFileInputRef.current.value = "";
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${garage.id}/${uploadingDocType}_admin_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("demarche-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Le bucket est prive : on stocke le chemin, pas une URL brute. Celle
      // qui etait construite ici omettait le mode d'acces, si bien que
      // Supabase lisait « demarche-documents » comme le mode et repondait
      // « Bucket not found » a l'ouverture.
      const fileUrl = `demarche-documents/${fileName}`;

      const { error: dbError } = await supabase.from("verification_documents").insert({
        garage_id: garage.id,
        document_type: uploadingDocType,
        nom_fichier: file.name,
        url: fileUrl,
        status: "approved",
        validated_by: user?.id,
        validated_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      toast({
        title: "Document uploadé",
        description: "Le document a été ajouté et validé automatiquement",
      });

      await loadVerificationDocs(garage.id);
    } catch (error) {
      console.error("Error uploading:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocType(null);
      if (adminFileInputRef.current) adminFileInputRef.current.value = "";
    }
  };

  const handleVerifyGarage = async () => {
    if (!garage) return;

    setProcessingGarage(true);
    try {
      const { error: updateError } = await supabase
        .from("garages")
        .update({ is_verified: true })
        .eq("id", garage.id);

      if (updateError) throw updateError;

      await supabase.functions.invoke("send-email", {
        body: {
          type: "account_verified",
          to: garage.email,
          data: { customerName: garage.raison_sociale },
        },
      });

      toast({
        title: "Garage vérifié",
        description: "Le garage a été vérifié et notifié par email",
      });

      setShowVerifyDialog(false);
      onGarageChanged?.({ is_verified: true });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le garage",
        variant: "destructive",
      });
    } finally {
      setProcessingGarage(false);
    }
  };

  const handleRejectGarage = async () => {
    if (!garage || !rejectAccountReason.trim()) return;

    setProcessingGarage(true);
    try {
      const { error: updateError } = await supabase
        .from("garages")
        .update({ is_verified: false, verification_requested_at: null })
        .eq("id", garage.id);

      if (updateError) throw updateError;

      await supabase.functions.invoke("send-email", {
        body: {
          type: "account_rejected",
          to: garage.email,
          data: {
            customerName: garage.raison_sociale,
            rejectionReason: rejectAccountReason,
          },
        },
      });

      toast({
        title: "Vérification refusée",
        description: "Le garage a été notifié par email",
      });

      setShowRejectDialog(false);
      setRejectAccountReason("");
      onGarageChanged?.({ is_verified: false, verification_requested_at: null });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la vérification",
        variant: "destructive",
      });
    } finally {
      setProcessingGarage(false);
    }
  };

  const handleSendNotification = async () => {
    if (!garage || !notificationSubject.trim() || !notificationMessage.trim()) return;

    setSendingNotification(true);
    try {
      await supabase.from("garage_verification_notifications").insert({
        garage_id: garage.id,
        sent_by: user?.id,
        subject: notificationSubject,
        message: notificationMessage,
      });

      toast({
        title: "Notification envoyée",
        description: "Le garage verra cette notification dans son espace",
      });

      setShowNotificationDialog(false);
      setNotificationSubject("");
      setNotificationMessage("");
      await loadNotificationHistory(garage.id);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const handleOfferTokens = async () => {
    if (!garage) return;

    const nbTokens = Number(tokensToOffer);
    if (!Number.isInteger(nbTokens) || nbTokens < 1) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nombre entier de jetons (minimum 1)",
        variant: "destructive",
      });
      return;
    }

    setOfferingTokens(true);
    try {
      // 1 jeton = 1 € ; token_balance est stocké EN EUROS.
      const creditEuros = nbTokens;

      // Le serveur ajoute le credit et renvoie le nouveau solde : le
      // navigateur ne modifie plus le solde directement.
      const { data: solde, error: updateError } = await appelServeur("crediter_solde_admin", {
        p_garage_id: garage.id,
        p_montant: creditEuros,
      });
      if (updateError) throw new Error(updateError.message);
      const newBalance = Number(solde ?? 0);

      toast({
        title: "Jetons offerts",
        description: `${nbTokens} jeton(s) offert(s) — nouveau solde : ${newBalance} €`,
      });

      setShowOfferTokensDialog(false);
      setTokensToOffer("");
      onGarageChanged?.({ token_balance: newBalance });
    } catch (error) {
      console.error("Error offering tokens:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'offrir les jetons",
        variant: "destructive",
      });
    } finally {
      setOfferingTokens(false);
    }
  };

  if (!garage) return null;

  return (
    <>
      <input
        type="file"
        ref={adminFileInputRef}
        className="hidden"
        onChange={handleAdminUpload}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">Vérification</h2>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => setShowRejectDialog(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              {garage.is_verified ? "Retirer la vérification" : "Refuser"}
            </Button>
            {!garage.is_verified && (
              <Button
                size="sm"
                onClick={() => setShowVerifyDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Vérifier
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              Notifications
              {notificationHistory.length > 0 && (
                <Badge variant="secondary" className="text-xs">{notificationHistory.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-4">
            {/* Deux colonnes : la pièce à gauche, le verdict à droite. Le
                travail consiste à lire un papier puis à en tirer une
                conclusion ; tant que les deux n'étaient pas à l'écran en même
                temps, chaque document coûtait un aller-retour de mémoire. */}
            <div className="grid gap-4 xl:grid-cols-[1fr_minmax(340px,400px)]">
              <div className="xl:sticky xl:top-4 xl:self-start">
                {docChoisi ? (
                  <>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{docChoisi.nom_fichier}</p>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        déposé le {format(new Date(docChoisi.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <ApercuDocument
                      key={docChoisi.id}
                      documentUrl={docChoisi.url}
                      nomFichier={docChoisi.nom_fichier}
                    />
                  </>
                ) : (
                  <div className="flex h-[70vh] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Choisissez une pièce à droite pour l'afficher ici.
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {GROUPES.map((groupe) => {
                  const docs = parGroupe[groupe.cle];
                  if (!docs.length) return null;
                  const replie = groupe.cle === "classe" && !classeOuvert;
                  return (
                    <div key={groupe.cle} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => groupe.cle === "classe" && setClasseOuvert((v) => !v)}
                          className={`text-sm font-semibold ${groupe.cle === "classe" ? "text-muted-foreground hover:text-foreground" : "text-foreground"}`}
                        >
                          {groupe.titre} ({docs.length})
                          {groupe.cle === "classe" && (replie ? " — afficher" : " — masquer")}
                        </button>
                        {groupe.cle === "a_controler" && docs.length > 1 && (
                          <Button size="sm" variant="outline" onClick={() => handleBulkApprove(docs.map((d) => d.id))}>
                            Tout approuver
                          </Button>
                        )}
                      </div>
                      {!replie && docs.map((doc) => {
                        const actif = docChoisi?.id === doc.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setIdChoisi(doc.id)}
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              actif
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{nomDuType(doc.document_type)}</p>
                                <p className="truncate text-xs text-muted-foreground">{doc.nom_fichier}</p>
                              </div>
                              <EtatDocument doc={doc} kbisPerime={kbisPerime} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: fr })}
                              {doc.document_type === "kbis" && doc.date_emission && (
                                <> · délivré le {format(new Date(doc.date_emission), "dd/MM/yyyy", { locale: fr })}</>
                              )}
                            </p>
                            {doc.rejection_reason && (
                              <p className="mt-1 text-xs text-destructive">Refus : {doc.rejection_reason}</p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {manquants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Attendu du garage ({manquants.length})</p>
                    {manquants.map((reqDoc) => (
                      <div key={reqDoc.id} className="rounded-lg border border-dashed p-3">
                        <p className="text-sm font-medium">{reqDoc.nom_document}</p>
                        <p className="text-xs text-muted-foreground">
                          {reqDoc.obligatoire ? "Obligatoire — rien n'a été déposé" : "Optionnel — rien n'a été déposé"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Le verdict de la pièce choisie, sous la liste : les champs
                    relevés par la lecture automatique, puis les trois issues. */}
                {docChoisi && (
                  <Card className="space-y-3 border-primary/40 p-4">
                    <div>
                      <p className="text-sm font-semibold">{nomDuType(docChoisi.document_type)}</p>
                      <p className="text-xs text-muted-foreground">
                        Déposé le {format(new Date(docChoisi.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>

                    {docChoisi.document_type === "kbis" && (
                      <div className="space-y-2">
                        <Label htmlFor="date-kbis" className="text-xs">Date de délivrance</Label>
                        <Input
                          id="date-kbis"
                          type="date"
                          autoFocus={!docChoisi.date_emission}
                          className={!docChoisi.date_emission ? "border-yellow-500 ring-1 ring-yellow-500" : ""}
                          defaultValue={docChoisi.date_emission ?? ""}
                          onChange={(e) => enregistrerDateKbis(docChoisi.id, e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {docChoisi.date_emission
                            ? ageDuKbis(docChoisi.date_emission)?.texte
                            : docChoisi.lu_le
                            ? "La lecture automatique n'a pas trouvé la date : recopiez-la sur le document."
                            : "Pas encore lu automatiquement."}
                        </p>
                        {docChoisi.activite && (
                          <p className="text-xs text-muted-foreground">Activité lue : « {docChoisi.activite} »</p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      {docChoisi.status !== "approved" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={docChoisi.document_type === "kbis" && !docChoisi.date_emission}
                          title={
                            docChoisi.document_type === "kbis" && !docChoisi.date_emission
                              ? "Saisissez d'abord la date de délivrance"
                              : undefined
                          }
                          onClick={() => handleSingleApprove(docChoisi.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Accepter
                        </Button>
                      )}
                      <RefuserDocumentBouton doc={docChoisi} onRefuse={refuserDoc} />
                      <SupprimerDocumentBouton doc={docChoisi} onSupprime={supprimerDoc} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      « Refuser » écrit au garage, retire la pièce du dossier et la conserve dans
                      l'historique ci-dessous. « Supprimer » ne garde rien et ne dit rien : c'est pour
                      les doublons.
                      {docChoisi.document_type === "kbis" && !docChoisi.date_emission && (
                        <>
                          {" "}
                          <span className="font-medium text-foreground">
                            Un Kbis ne peut pas être accepté sans sa date de délivrance :
                          </span>{" "}
                          sans elle, les six mois repartiraient du dépôt et la validité serait
                          surestimée.
                        </>
                      )}
                    </p>
                  </Card>
                )}

                {refus.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Refusés ({refus.length})
                    </p>
                    {refus.map((r) => (
                      <div key={r.id} className="rounded-lg border border-dashed p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium">{r.nom_fichier}</p>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {format(new Date(r.refuse_le), "dd/MM/yyyy", { locale: fr })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {nomDuType(r.document_type)} · déposé le{" "}
                          {format(new Date(r.depose_le), "dd/MM/yyyy", { locale: fr })}
                        </p>
                        <p className="mt-1 text-xs text-destructive">{r.raison}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3">
                  <Label className="text-xs text-muted-foreground">Déposer une pièce à la place du garage</Label>
                  <div className="mt-2 flex gap-2">
                    <select
                      className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                      value={typeAUploader}
                      onChange={(e) => setTypeAUploader(e.target.value)}
                    >
                      {requiredDocs.filter((d) => d.actif).map((d) => (
                        <option key={d.id} value={d.code}>{d.nom_document}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUploadingDocType(typeAUploader);
                        adminFileInputRef.current?.click();
                      }}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Déposer
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Approuvé d'office, sans contrôle.</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <div className="space-y-4">
              <Button onClick={() => setShowNotificationDialog(true)} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Envoyer une notification
              </Button>

              <ScrollArea className="h-[350px] pr-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique des notifications
                </h3>
                {notificationHistory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Aucune notification envoyée</p>
                ) : (
                  <div className="space-y-3">
                    {notificationHistory.map((notif) => (
                      <Card key={notif.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{notif.subject}</h4>
                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                              {notif.message}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notif.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {viewerDoc && (
        <DocumentViewer
          isOpen={!!viewerDoc}
          onClose={() => setViewerDoc(null)}
          documentUrl={viewerDoc.url}
          documentName={viewerDoc.nom_fichier}
          documentType={viewerDoc.document_type}
        />
      )}

      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vérifier ce garage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action marquera le garage "{garage.raison_sociale}" comme vérifié.
              Un email de confirmation sera envoyé au garage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerifyGarage}
              disabled={processingGarage}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingGarage ? "Traitement..." : "Confirmer la vérification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refuser la vérification</AlertDialogTitle>
            <AlertDialogDescription>
              Indiquez la raison du refus. Le garage sera notifié par email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Raison du refus..."
            value={rejectAccountReason}
            onChange={(e) => setRejectAccountReason(e.target.value)}
            rows={4}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectGarage}
              disabled={!rejectAccountReason.trim() || processingGarage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingGarage ? "Traitement..." : "Confirmer le refus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer une notification</DialogTitle>
            <DialogDescription>
              Envoyer un message personnalisé à {garage.raison_sociale}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notif-subject">Objet</Label>
              <Input
                id="notif-subject"
                placeholder="Objet du message..."
                value={notificationSubject}
                onChange={(e) => setNotificationSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notif-message">Message</Label>
              <Textarea
                id="notif-message"
                placeholder="Votre message..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={
                !notificationSubject.trim() || !notificationMessage.trim() || sendingNotification
              }
            >
              {sendingNotification ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Envoyer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOfferTokensDialog} onOpenChange={setShowOfferTokensDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Offrir des jetons</DialogTitle>
            <DialogDescription>
              Créditer le solde de {garage.raison_sociale}. Un jeton vaut 1 €.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tokens">Nombre de jetons à offrir</Label>
              <Input
                id="tokens"
                type="number"
                min={1}
                step={1}
                placeholder="Ex: 3"
                value={tokensToOffer}
                onChange={(e) => setTokensToOffer(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Équivaut à {(parseInt(tokensToOffer, 10) || 0)} €
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOfferTokensDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleOfferTokens}
              disabled={
                !Number.isInteger(Number(tokensToOffer)) ||
                Number(tokensToOffer) < 1 ||
                offeringTokens
              }
            >
              {offeringTokens ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  Offrir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Bulk Reject Dialog Component

// Single Reject Button Component

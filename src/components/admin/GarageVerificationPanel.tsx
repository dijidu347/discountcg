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
import { CheckCircle, XCircle, Eye, ShieldCheck, Send, Loader2, History, Upload, Coins, RefreshCw, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ApercuDocument } from "@/components/admin/ApercuDocument";
import { EtatDocument, RefuserDocumentBouton, SupprimerDocumentBouton } from "@/components/admin/DocumentVerificationActions";
import { supprimerDocumentVerification } from "@/lib/supprimerDocumentVerification";
import { refuserDocumentVerification, historiqueDesRefus, type DocumentRefuse } from "@/lib/refuserDocumentVerification";
import { formeJuridiqueDuGarage, pieceAttendue } from "@/lib/formeJuridique";
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
  // Ce que ce professionnel peut fournir, déduit de son SIRET. Résolu à la
  // première consultation de la fiche et mémorisé : une forme juridique ne
  // change presque jamais, l'API de l'État n'a pas à être rappelée.
  const [attendue, setAttendue] = useState<ReturnType<typeof pieceAttendue>>("indetermine");

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
      formeJuridiqueDuGarage(garage).then((code) => setAttendue(pieceAttendue(code)));
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

  // Depuis combien de temps une pièce attend notre examen. Rien ne distinguait
  // une pièce arrivée hier d'une qui patiente depuis trois mois : cent cinq
  // d'entre elles dépassent trente jours. Au-delà de quinze, on le dit en
  // couleur — c'est le délai au bout duquel un garage relance ou redépose.
  const attenteDepuis = (doc: { status?: string; created_at?: string }) => {
    if (doc.status !== "pending" || !doc.created_at) return null;
    const jours = Math.floor((Date.now() - new Date(doc.created_at).getTime()) / 86400000);
    if (jours < 1) return { texte: "déposé aujourd'hui", alerte: false };
    return {
      texte: `en attente depuis ${jours} jour${jours > 1 ? "s" : ""}`,
      alerte: jours >= 15,
    };
  };

  // Redonner une chance à la lecture automatique.
  //
  // Une fois `lu_le` posé, le document n'était plus jamais repris — même quand
  // la lecture avait échoué, ce qui est le cas de cinquante Kbis sur trois cent
  // trente-neuf. Remettre ce marqueur à zéro suffit : la tâche repasse toutes
  // les quinze minutes et reprend ce qui n'a pas encore été lu.
  const relireDocument = async (doc: { id: string }) => {
    majLocale(doc.id, { lu_le: null });
    const { error } = await supabase
      .from("verification_documents")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ lu_le: null } as any)
      .eq("id", doc.id);
    if (error) {
      toast({ title: "Relecture impossible", description: error.message, variant: "destructive" });
      await loadVerificationDocs(garage.id);
      return;
    }
    toast({
      title: "Relecture demandée",
      description: "La lecture automatique repassera dans les quinze minutes.",
    });
  };

  const nomDuType = (code: string) =>
    requiredDocs.find((r) => r.code === code)?.nom_document ?? code;

  // Une rubrique par pièce exigée, ses dépôts du plus récent au plus ancien.
  // Une rubrique sans dépôt reste affichée : « rien n'a été déposé » est une
  // information, pas une absence d'information.
  const rubriques = requiredDocs
    .filter((r) => r.actif)
    .map((r) => ({
      code: r.code,
      nom: r.nom_document,
      obligatoire: r.obligatoire,
      docs: verificationDocs
        .filter((d) => d.document_type === r.code)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    }));

  // Déposées sous d'anciennes exigences — les mandats d'avant le 21 septembre
  // 2026. Elles ne disparaissent pas, elles cessent d'occuper le premier plan.
  const autresPieces = verificationDocs.filter(
    (d) => !requiredDocs.some((r) => r.actif && r.code === d.document_type),
  );


  const docChoisi = verificationDocs.find((d) => d.id === idChoisi) ?? null;

  // Les pièces obligatoires qui n'ont pas de document approuvé. Rien
  // n'empêchait jusqu'ici d'accorder la vérification sans elles : neuf garages
  // travaillent aujourd'hui sous notre habilitation sans Kbis au dossier, dont
  // un sans aucune pièce. Le bouton « Vérifier » les exige désormais.
  const [filOuvert, setFilOuvert] = useState(false);

  const obligatoiresManquantes = requiredDocs
    .filter((r) => r.actif && r.obligatoire)
    .filter((r) => !verificationDocs.some((d) => d.document_type === r.code && d.status === "approved"))
    .map((r) => r.nom_document);

  // L'état du dossier en une phrase.
  //
  // Le panneau ne disait rien quand tout allait bien, et ne nommait la
  // contradiction que dans un bandeau d'alerte. Or c'est la première question
  // qu'on se pose en ouvrant une fiche, et elle se déduisait jusqu'ici en
  // recoupant deux zones éloignées — c'est ce qui a laissé passer un garage
  // vérifié sans Kbis.
  const verdict = (() => {
    const liste = obligatoiresManquantes.join(", ");
    if (obligatoiresManquantes.length) {
      return garage.is_verified
        ? { phrase: `Vérifié, mais il manque ${liste}`, detail: "Le garage travaille sous notre habilitation sans que son dossier le porte.", alerte: true }
        : { phrase: `Il manque ${liste}`, detail: "La vérification ne peut pas être accordée tant que la pièce n'est pas acceptée.", alerte: false };
    }
    const kbisSansDate = verificationDocs.find(
      (d) => d.document_type === "kbis" && d.status === "pending" && !d.date_emission,
    );
    if (kbisSansDate) {
      return { phrase: "Le Kbis attend sa date de délivrance", detail: "Sans elle, les six mois repartiraient de la date de dépôt.", alerte: false };
    }
    const enAttente = verificationDocs.filter((d) => d.status === "pending");
    if (enAttente.length) {
      return {
        phrase: `${enAttente.length} pièce${enAttente.length > 1 ? "s" : ""} attend${enAttente.length > 1 ? "ent" : ""} votre contrôle`,
        detail: "",
        alerte: false,
      };
    }
    const acceptees = rubriques.filter((r) => r.docs.some((d) => d.status === "approved")).length;
    return {
      phrase: garage.kbis_valide_jusqu_au
        ? `Dossier complet — Kbis valable jusqu'au ${format(new Date(garage.kbis_valide_jusqu_au), "dd/MM/yyyy", { locale: fr })}`
        : "Dossier complet",
      detail: `${acceptees} pièce${acceptees > 1 ? "s" : ""} sur ${rubriques.length} acceptée${acceptees > 1 ? "s" : ""}. Rien n'attend votre contrôle.`,
      alerte: false,
    };
  })();

  // Un seul fil, antéchronologique : dépôts, décisions, messages et relances.
  // Ils vivaient dans trois endroits distincts — un onglet, un bloc et un repli
  // — si bien que « je le lui ai déjà demandé deux fois », qui change la
  // décision, n'était jamais visible au moment de décider.
  type Evenement = { date: string; icone: "depot" | "accepte" | "refuse" | "message" | "relance"; texte: string; note?: string };
  const fil: Evenement[] = [
    ...verificationDocs.map((d) => ({
      date: d.created_at,
      icone: "depot" as const,
      texte: `${nomDuType(d.document_type)} déposé — ${d.nom_fichier}`,
    })),
    ...verificationDocs
      .filter((d) => d.status === "approved" && d.validated_at)
      .map((d) => ({
        date: d.validated_at,
        icone: "accepte" as const,
        texte: `${nomDuType(d.document_type)} accepté`,
        note: d.date_emission
          ? `délivré le ${format(new Date(d.date_emission), "dd/MM/yyyy", { locale: fr })}`
          : undefined,
      })),
    ...refus.map((r) => ({
      date: r.refuse_le,
      icone: "refuse" as const,
      texte: `${nomDuType(r.document_type)} refusé — ${r.nom_fichier}`,
      note: r.raison,
    })),
    ...notificationHistory.map((n) => ({
      date: n.created_at,
      icone: "message" as const,
      texte: n.subject,
      note: n.message,
    })),
    ...(garage.kbis_alerte_envoyee_le
      ? [{
          date: garage.kbis_alerte_envoyee_le,
          icone: "relance" as const,
          texte: "Relance automatique — échéance du Kbis",
        }]
      : []),
  ]
    .filter((e) => e.date)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const filVisible = filOuvert ? fil : fil.slice(0, 5);

  // A l'ouverture, la page se place sur la premiere piece qui attend un geste :
  // une date a saisir d'abord, un controle ensuite. Afficher un document ne
  // declenche rien, donc le preselectionner ne coute rien.
  useEffect(() => {
    if (!verificationDocs.length) return;
    if (idChoisi && verificationDocs.some((d) => d.id === idChoisi)) return;
    // La premiere piece qui attend un geste : une date a saisir d'abord, un
    // controle ensuite, a defaut la plus recente.
    const aDater = verificationDocs.find(
      (d) => d.status === "pending" && d.document_type === "kbis" && d.lu_le && !d.date_emission,
    );
    const aControler = verificationDocs.find((d) => d.status === "pending");
    const premier = aDater ?? aControler ?? verificationDocs[0];
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
    setVerificationDocs((docs) => docs.filter((d) => d.id !== doc.id));
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
    setVerificationDocs((docs) => docs.filter((d) => d.id !== doc.id));
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
    const avant = verificationDocs.find((d) => d.id === docId)?.date_emission ?? null;
    // Immédiat : c'est cette date qui débloque le bouton « Accepter », et
    // attendre le serveur le laissait grisé sous le doigt.
    majLocale(docId, { date_emission: valeur || null });

    const { error } = await supabase
      .from("verification_documents")
      // types.ts est généré depuis la base et ne connaît pas encore la colonne.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ date_emission: valeur || null } as any)
      .eq("id", docId);

    if (error) {
      majLocale(docId, { date_emission: avant });
      toast({ title: "Date non enregistrée", description: error.message, variant: "destructive" });
      return;
    }
    await rafraichirGarage();
  };

  // L'écran change avant le serveur, et revient en arrière si celui-ci refuse.
  //
  // Les écritures rechargeaient la liste entière depuis la base avant de
  // rafraîchir l'affichage : le temps d'un aller-retour, la pièce qu'on venait
  // d'accepter portait encore « En attente », et on cliquait deux fois ou on
  // rechargeait la page. Le résultat est connu d'avance, autant l'afficher.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const majLocale = (docId: string, patch: Record<string, any>) =>
    setVerificationDocs((docs) => docs.map((d) => (d.id === docId ? { ...d, ...patch } : d)));

  // Accepter un Kbis recalcule la validité du garage par déclencheur : l'entête
  // de la fiche doit suivre, sinon elle garde « Kbis expiré » sous les yeux.
  const rafraichirGarage = async () => {
    const { data } = await supabase
      .from("garages")
      .select("is_verified, kbis_valide_jusqu_au")
      .eq("id", garage.id)
      .maybeSingle();
    if (data) onGarageChanged?.(data);
  };

  const handleSingleApprove = async (docId: string) => {
    const avant = verificationDocs.find((d) => d.id === docId);
    majLocale(docId, { status: "approved", rejection_reason: null });

    const { error } = await supabase
      .from("verification_documents")
      .update({
        status: "approved",
        validated_by: user?.id,
        validated_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq("id", docId);

    if (error) {
      if (avant) majLocale(docId, { status: avant.status, rejection_reason: avant.rejection_reason });
      toast({ title: "Approbation impossible", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Pièce acceptée" });
    await Promise.all([loadVerificationDocs(garage.id), rafraichirGarage()]);
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
        {/* Zone 1 — l'état en une phrase, et la seule décision qui a du sens
            à cet instant. Les deux boutons voisinaient avec le même mot que
            l'action sur une pièce : « Refuser » retirait son habilitation à un
            garage en activité, « Refuser » juste en dessous écartait une page
            de PDF. Le mot n'appartient plus qu'aux pièces. */}
        <div
          className={`mb-4 flex flex-wrap items-start justify-between gap-4 rounded-lg border px-4 py-3 ${
            verdict.alerte ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" : "bg-muted/40"
          }`}
        >
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{verdict.phrase}</p>
            {verdict.detail && (
              <p className="mt-0.5 text-sm text-muted-foreground">{verdict.detail}</p>
            )}
          </div>
          {garage.is_verified ? (
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setShowRejectDialog(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Retirer la vérification
            </Button>
          ) : (
            <Button
              size="sm"
              className="shrink-0 bg-green-600 hover:bg-green-700"
              onClick={() => setShowVerifyDialog(true)}
              disabled={obligatoiresManquantes.length > 0}
              title={
                obligatoiresManquantes.length > 0
                  ? `Pièce obligatoire non acceptée : ${obligatoiresManquantes.join(", ")}`
                  : undefined
              }
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Vérifier ce garage
            </Button>
          )}
        </div>
            {/* Une seule liste, un grand lecteur.
                Il y avait trois blocs empilés — les pièces classées, celles
                attendues du garage, puis une carte d'action détachée qui
                répétait le nom du document déjà surligné deux lignes plus haut.
                Désormais : une ligne par pièce obligatoire, présente qu'elle
                soit déposée ou non, et l'action à l'intérieur de la ligne. */}
            <div className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
              <div className="space-y-2">
                {rubriques.map((r) => {
                  const ouverte = r.docs.some((d) => d.id === idChoisi);
                  // La pièce sur laquelle cette carte agit : celle qu'on a
                  // sélectionnée si elle appartient à cette carte, sinon son
                  // dépôt le plus récent.
                  const docActif = r.docs.find((d) => d.id === idChoisi) ?? r.docs[0] ?? null;
                  return (
                    <div
                      key={r.code}
                      className={`rounded-lg border transition-colors ${
                        ouverte ? "border-primary ring-1 ring-primary" : ""
                      } ${r.docs.length === 0 ? "border-dashed bg-muted/30" : ""}`}
                    >
                      <button
                        type="button"
                        disabled={r.docs.length === 0}
                        onClick={() => setIdChoisi(r.docs[0]?.id ?? null)}
                        className="flex w-full items-start gap-3 p-3 text-left disabled:cursor-default"
                      >
                        {/* Une vignette rappelle qu'on juge un document, pas une
                            ligne de liste : enchaîner vingt pièces sans repère
                            visuel fait perdre le fil. L'icône dit déjà
                            l'essentiel — un PDF scanné n'appelle pas la même
                            attention qu'une photo prise de travers. */}
                        <div
                          className={`flex h-[68px] w-[54px] shrink-0 items-center justify-center rounded-md border ${
                            r.docs.length === 0 ? "border-dashed text-muted-foreground/60" : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {r.docs.length === 0
                            ? <FileText className="h-5 w-5" />
                            : /\.(pdf)$/i.test(String(r.docs[0].nom_fichier ?? ""))
                              ? <FileText className="h-5 w-5" />
                              : <ImageIcon className="h-5 w-5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{r.nom}</p>
                            {r.docs.length > 0 && <EtatDocument doc={r.docs[0]} kbisPerime={kbisPerime} />}
                          </div>
                          {r.docs.length === 0 ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {r.obligatoire ? "Obligatoire — rien n'a été déposé" : "Rien n'a été déposé"}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Déposé le {format(new Date(r.docs[0].created_at), "dd/MM/yyyy", { locale: fr })}
                              {attenteDepuis(r.docs[0]) && (
                                <>
                                  {" · "}
                                  <span
                                    className={
                                      attenteDepuis(r.docs[0])!.alerte
                                        ? "font-medium text-orange-600 dark:text-orange-400"
                                        : ""
                                    }
                                  >
                                    {attenteDepuis(r.docs[0])!.texte}
                                  </span>
                                </>
                              )}
                            </p>
                          )}
                          {r.docs.length > 0 && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                              {r.docs[0].nom_fichier}
                            </p>
                          )}
                        </div>
                      </button>
                      {/* Ce que ce professionnel peut produire, lu sur son
                          SIRET. Dit avant même d'ouvrir le document, pour ne
                          plus réclamer un Kbis à qui n'en aura jamais. */}
                      {r.code === "kbis" && attendue === "kbis" && (
                        <p className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                          Société au registre du commerce : un extrait Kbis existe, il est exigible.
                        </p>
                      )}

                      {/* Plusieurs fichiers pour une même pièce, repliés
                          derrière celle qui est ouverte.
                          Deux cas qu'il ne faut pas confondre : une carte
                          d'identité tient souvent en deux photos déposées
                          ensemble — ce sont deux faces, pas un historique —
                          alors qu'un Kbis redéposé des semaines plus tard
                          remplace le précédent. Le même jour les sépare. */}
                      {ouverte && r.docs.length > 1 && (() => {
                        const jour = (d: { created_at: string }) =>
                          new Date(d.created_at).toISOString().slice(0, 10);
                        const memeJour = r.docs.every((d) => jour(d) === jour(r.docs[0]));
                        return (
                        <div className="border-t px-3 py-2">
                          <p className="mb-1 text-xs text-muted-foreground">
                            {memeJour
                              ? `${r.docs.length} fichiers pour cette pièce`
                              : `Dépôts précédents (${r.docs.length - 1})`}
                          </p>
                          {r.docs.slice(1).map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setIdChoisi(d.id)}
                              className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted ${
                                d.id === idChoisi ? "bg-muted font-medium" : ""
                              }`}
                            >
                              <span className="truncate">
                                {format(new Date(d.created_at), "dd/MM/yyyy", { locale: fr })} · {d.nom_fichier}
                              </span>
                              <EtatDocument doc={d} kbisPerime={kbisPerime} />
                            </button>
                          ))}
                        </div>
                        );
                      })()}

                      {/* L'action dans la ligne, jamais ailleurs. */}
                      {/* Les deux pièces restent ouvertes : replier celle qu'on ne
                          regarde pas obligeait à cliquer pour voir qu'il n'y
                          avait rien à y faire. Chaque carte agit sur SA pièce,
                          la sélection ne sert plus qu'à l'aperçu de droite. */}
                      {docActif && (
                        <div className="space-y-3 border-t p-3">
                          {docActif.document_type === "kbis" && (
                            <div className="space-y-1">
                              <Label htmlFor="date-kbis" className="text-xs">Date de délivrance</Label>
                              <Input
                                id="date-kbis"
                                type="date"
                                className={`h-8 ${!docActif.date_emission ? "border-yellow-500 ring-1 ring-yellow-500" : ""}`}
                                defaultValue={docActif.date_emission ?? ""}
                                onChange={(e) => enregistrerDateKbis(docActif.id, e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">
                                {docActif.date_emission
                                  ? ageDuKbis(docActif.date_emission)?.texte
                                  : docActif.lu_le
                                  ? "La lecture automatique n'a pas trouvé la date : recopiez-la."
                                  : "Pas encore lu automatiquement."}
                              </p>
                              {docActif.activite && (
                                <p className="text-xs text-muted-foreground">
                                  Activité lue : « {docActif.activite} »
                                </p>
                              )}

                              {/* Le Kbis reste la règle pour une société ;
                                  l'attestation RNE n'est admise que pour qui ne
                                  peut pas en obtenir. Le document le dit
                                  lui-même : un Kbis mentionne toujours le RCS,
                                  l'attestation d'un artisan jamais. */}
                              {docActif.nature_document === "rne" && (
                                <div
                                  className={`rounded-md border p-2 text-xs ${
                                    docActif.inscrit_rcs
                                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                                      : "border-border bg-muted/50"
                                  }`}
                                >
                                  <p className="font-medium text-foreground">
                                    Attestation RNE
                                    {docActif.forme_juridique ? ` — ${docActif.forme_juridique}` : ""}
                                  </p>
                                  {docActif.inscrit_rcs ? (
                                    <p className="mt-0.5 text-foreground">
                                      Le document mentionne une inscription au RCS : cette entreprise
                                      a donc un extrait Kbis. Demandez-le — l'attestation n'est
                                      admise que pour qui ne peut pas en obtenir.
                                    </p>
                                  ) : docActif.inscrit_rcs === false ? (
                                    <p className="mt-0.5 text-muted-foreground">
                                      Aucune inscription au RCS mentionnée : ce professionnel n'a pas
                                      de Kbis, l'attestation est la pièce qui en tient lieu.
                                    </p>
                                  ) : (
                                    <p className="mt-0.5 text-muted-foreground">
                                      La lecture n'a pas pu dire si l'entreprise est inscrite au RCS.
                                      Vérifiez sur le document : s'il mentionne le registre du
                                      commerce, un Kbis existe et doit être demandé.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Accepter et refuser sont deux décisions également
                              légitimes face à une pièce douteuse : elles pèsent
                              le même poids visuel. La suppression, elle, part à
                              droite — ce n'est pas une décision sur la pièce,
                              c'est un retrait. */}
                          <div className="flex flex-wrap items-center gap-2">
                            {docActif.status !== "approved" && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                disabled={docActif.document_type === "kbis" && !docActif.date_emission}
                                title={
                                  docActif.document_type === "kbis" && !docActif.date_emission
                                    ? "Saisissez d'abord la date de délivrance"
                                    : undefined
                                }
                                onClick={() => handleSingleApprove(docActif.id)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Accepter
                              </Button>
                            )}
                            {docActif.document_type === "kbis" && docActif.lu_le && !docActif.date_emission && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => relireDocument(docActif)}
                                title="La lecture automatique n'a pas trouvé de date : lui redonner une chance"
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Relire
                              </Button>
                            )}
                            <RefuserDocumentBouton doc={docActif} onRefuse={refuserDoc} />
                            <div className="ml-auto">
                              <SupprimerDocumentBouton doc={docActif} onSupprime={supprimerDoc} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Déposer à la place du garage : à l'endroit où la pièce
                          manque, plutôt qu'un bouton répété sous chaque carte. */}
                      {r.docs.length === 0 && (
                        <div className="border-t px-3 py-2">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              setUploadingDocType(r.code);
                              adminFileInputRef.current?.click();
                            }}
                          >
                            Déposer à la place du garage
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {autresPieces.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setClasseOuvert((v) => !v)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Pièces d'anciennes exigences ({autresPieces.length}) — {classeOuvert ? "masquer" : "afficher"}
                    </button>
                    {classeOuvert && (
                      <div className="mt-2 space-y-1">
                        {autresPieces.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setIdChoisi(d.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left text-xs ${
                              d.id === idChoisi ? "border-primary bg-muted" : "hover:bg-muted/50"
                            }`}
                          >
                            <span className="truncate">{nomDuType(d.document_type)} · {d.nom_fichier}</span>
                            <EtatDocument doc={d} kbisPerime={kbisPerime} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}


              {/* L'historique tient dans la colonne des pièces : elle s'arrêtait
                  après la dernière carte et laissait un vide sur toute la
                  hauteur de l'aperçu.

                  Zone 3 — un seul fil. Il absorbe l'onglet « Notifications », le
                  bloc « Refusés » et le repli des anciennes exigences : trois
                  endroits pour une même relation. Le bouton d'écriture est en tête,
                  là où l'on voit ce qu'on a déjà envoyé. */}
              <div className="mt-4 border-t pt-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">Historique</h3>
                  <Button variant="outline" size="sm" onClick={() => setShowNotificationDialog(true)}>
                    <Send className="mr-2 h-4 w-4" />
                    Écrire au garage
                  </Button>
                </div>

                {fil.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun échange pour l'instant.</p>
                ) : (
                  <div className="divide-y">
                    {filVisible.map((e, i) => (
                      <div key={`${e.date}-${i}`} className="flex gap-3 py-2">
                        {e.icone === "accepte" && <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
                        {e.icone === "refuse" && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
                        {e.icone === "depot" && <Upload className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                        {e.icone === "message" && <Send className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                        {e.icone === "relance" && <History className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />}
                        <div className="min-w-0">
                          <p className="text-sm">{e.texte}</p>
                          {e.note && (
                            <p className="whitespace-pre-line text-xs text-muted-foreground">{e.note}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(e.date), "dd/MM/yyyy à HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {fil.length > 5 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1 h-auto p-0"
                    onClick={() => setFilOuvert((v) => !v)}
                  >
                    {filOuvert
                      ? "Réduire"
                      : `Afficher les ${fil.length - 5} événements plus anciens`}
                  </Button>
                )}
              </div>
              </div>

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
                      className="h-[46vh] min-h-[320px]"
                    />
                  </>
                ) : (
                  <div className="flex h-[46vh] min-h-[320px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                    Choisissez une pièce à gauche pour l'afficher ici.
                  </div>
                )}
              </div>
            </div>

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

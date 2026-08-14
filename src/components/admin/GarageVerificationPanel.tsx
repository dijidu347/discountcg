import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Eye, ShieldCheck, Send, Loader2, History, Upload, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentViewer } from "@/components/DocumentViewer";
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
export function GarageVerificationPanel({ garage, onGarageChanged }: GarageVerificationPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [verificationDocs, setVerificationDocs] = useState<any[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationRow[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [viewerDoc, setViewerDoc] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("documents");

  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectAccountReason, setRejectAccountReason] = useState("");
  const [processingGarage, setProcessingGarage] = useState(false);

  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  const [showOfferTokensDialog, setShowOfferTokensDialog] = useState(false);
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
      setSelectedDocs([]);
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

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const getDocumentsByType = (docType: string) =>
    verificationDocs.filter((d) => d.document_type === docType);

  const handleBulkApprove = async () => {
    if (selectedDocs.length === 0) return;

    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({
          status: "approved",
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .in("id", selectedDocs);

      if (error) throw error;

      await supabase.functions.invoke("send-email", {
        body: {
          type: "custom_notification",
          to: garage.email,
          data: {
            customerName: garage.raison_sociale,
            subject: "Documents approuvés",
            message: `Vos documents de vérification ont été approuvés. ${selectedDocs.length} document(s) validé(s).`,
          },
        },
      });

      toast({
        title: "Documents approuvés",
        description: `${selectedDocs.length} document(s) validé(s)`,
      });

      setSelectedDocs([]);
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

  const handleBulkReject = async () => {
    if (selectedDocs.length === 0 || !rejectionReason.trim()) return;

    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
        })
        .in("id", selectedDocs);

      if (error) throw error;

      await supabase.from("garage_verification_notifications").insert({
        garage_id: garage.id,
        sent_by: user?.id,
        subject: "Documents refusés - Action requise",
        message: `${selectedDocs.length} document(s) ont été refusés.\n\nRaison: ${rejectionReason}\n\nVeuillez renvoyer les documents corrigés.`,
      });

      await supabase.functions.invoke("send-email", {
        body: {
          type: "custom_notification",
          to: garage.email,
          data: {
            customerName: garage.raison_sociale,
            subject: "Documents refusés - Action requise",
            message: `${selectedDocs.length} document(s) ont été refusés.\n\nRaison: ${rejectionReason}\n\nVeuillez renvoyer les documents corrigés dans votre espace "Paramètres > Vérification".`,
          },
        },
      });

      toast({
        title: "Documents refusés",
        description: `${selectedDocs.length} document(s) refusé(s) - Email envoyé`,
      });

      setSelectedDocs([]);
      setRejectionReason("");
      await loadVerificationDocs(garage.id);
      await loadNotificationHistory(garage.id);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser les documents",
        variant: "destructive",
      });
    }
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

  const handleSingleReject = async (docId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from("verification_documents")
        .update({
          status: "rejected",
          rejection_reason: reason,
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
        })
        .eq("id", docId);

      if (error) throw error;

      await supabase.from("garage_verification_notifications").insert({
        garage_id: garage.id,
        sent_by: user?.id,
        subject: "Document refusé - Action requise",
        message: `Un document a été refusé.\n\nRaison: ${reason}\n\nVeuillez renvoyer le document corrigé.`,
      });

      await supabase.functions.invoke("send-email", {
        body: {
          type: "custom_notification",
          to: garage.email,
          data: {
            customerName: garage.raison_sociale,
            subject: "Document refusé - Action requise",
            message: `Un document a été refusé.\n\nRaison: ${reason}\n\nVeuillez renvoyer le document corrigé dans votre espace "Paramètres > Vérification".`,
          },
        },
      });

      toast({ title: "Document refusé", description: "Email envoyé au garage" });
      await loadVerificationDocs(garage.id);
      await loadNotificationHistory(garage.id);
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleAdminUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !garage || !uploadingDocType) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${garage.id}/${uploadingDocType}_admin_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("demarche-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/demarche-documents/${fileName}`;

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
      // 1 jeton = 5 € ; token_balance est stocké EN EUROS
      const creditEuros = nbTokens * 5;

      // Relire le solde actuel pour éviter d'écraser une valeur périmée
      const { data: current, error: readError } = await supabase
        .from("garages")
        .select("token_balance")
        .eq("id", garage.id)
        .single();

      if (readError) throw readError;

      const newBalance = (current?.token_balance || 0) + creditEuros;

      const { error: updateError } = await supabase
        .from("garages")
        .update({ token_balance: newBalance })
        .eq("id", garage.id);

      if (updateError) throw updateError;

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
            <div className="space-y-4">
              {selectedDocs.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg sticky top-0 z-10">
                  <Badge variant="secondary">{selectedDocs.length} sélectionné(s)</Badge>
                  <Button size="sm" onClick={handleBulkApprove}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                  <BulkRejectDialog
                    onReject={handleBulkReject}
                    rejectionReason={rejectionReason}
                    setRejectionReason={setRejectionReason}
                    count={selectedDocs.length}
                  />
                </div>
              )}

              <ScrollArea className="h-[500px] pr-4">
                {requiredDocs.filter((d) => d.actif).map((reqDoc) => {
                  const docs = getDocumentsByType(reqDoc.code);
                  const latestDoc = docs[0];

                  return (
                    <Card key={reqDoc.id} className="p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {reqDoc.nom_document}
                            {reqDoc.obligatoire ? (
                              <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Optionnel</Badge>
                            )}
                          </h3>
                          {reqDoc.description && (
                            <p className="text-sm text-muted-foreground">{reqDoc.description}</p>
                          )}
                        </div>
                        {latestDoc && (
                          <Badge
                            variant={
                              latestDoc.status === "approved"
                                ? "default"
                                : latestDoc.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                            className={latestDoc.status === "approved" ? "bg-green-500" : ""}
                          >
                            {latestDoc.status === "pending" && "En attente"}
                            {latestDoc.status === "approved" && "Approuvé"}
                            {latestDoc.status === "rejected" && "Refusé"}
                          </Badge>
                        )}
                      </div>

                      {docs.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Aucun document soumis</p>
                      ) : (
                        <div className="space-y-2">
                          {docs.map((doc) => {
                            const canApprove = doc.status === "pending" || doc.status === "rejected";
                            const canReject = doc.status === "pending" || doc.status === "approved";
                            return (
                              <div
                                key={doc.id}
                                className={`flex items-center justify-between p-2 rounded border ${
                                  doc.status === "rejected"
                                    ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                                    : doc.status === "approved"
                                    ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                                    : "bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {canApprove && (
                                    <Checkbox
                                      checked={selectedDocs.includes(doc.id)}
                                      onCheckedChange={() => toggleDocSelection(doc.id)}
                                    />
                                  )}
                                  <div>
                                    <p className="text-sm font-medium">{doc.nom_fichier}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                                    </p>
                                    {doc.rejection_reason && (
                                      <p className="text-xs text-destructive mt-1">
                                        Refus: {doc.rejection_reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setViewerDoc(doc)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {canApprove && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSingleApprove(doc.id)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {canReject && (
                                    <SingleRejectButton doc={doc} onReject={handleSingleReject} />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setUploadingDocType(reqDoc.code);
                            adminFileInputRef.current?.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Uploader pour ce garage (auto-validé)
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <div className="space-y-4">
              <Card className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Solde actuel</p>
                  <p className="text-lg font-bold">{garage.token_balance || 0} €</p>
                </div>
                <Button variant="outline" onClick={() => setShowOfferTokensDialog(true)}>
                  <Coins className="mr-2 h-4 w-4" />
                  Offrir des jetons
                </Button>
              </Card>

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
              Créditer le solde de {garage.raison_sociale}. Un jeton vaut 5 €.
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
              Équivaut à {(parseInt(tokensToOffer, 10) || 0) * 5} €
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
function BulkRejectDialog({
  onReject,
  rejectionReason,
  setRejectionReason,
  count,
}: {
  onReject: () => void;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  count: number;
}) {
  const [open, setOpen] = useState(false);

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onReject();
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <XCircle className="mr-2 h-4 w-4" />
          Refuser
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refuser {count} document(s)</AlertDialogTitle>
          <AlertDialogDescription>
            Indiquez la raison du refus. Le garage sera notifié par email.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Raison du refus..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          rows={4}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={!rejectionReason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmer le refus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Single Reject Button Component
function SingleRejectButton({
  doc,
  onReject,
}: {
  doc: any;
  onReject: (docId: string, reason: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleReject = () => {
    if (reason.trim()) {
      onReject(doc.id, reason);
      setOpen(false);
      setReason("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <XCircle className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refuser ce document</AlertDialogTitle>
          <AlertDialogDescription>
            Indiquez la raison du refus. Le garage sera notifié par email.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Raison du refus..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={!reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmer le refus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

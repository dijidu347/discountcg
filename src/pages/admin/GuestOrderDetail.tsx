import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpressBadge } from "@/components/admin/ExpressBadge";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, XCircle, FileText, User, Car, MapPin, Mail, Phone, Calendar, Euro, Download, Eye, AlertCircle, Send, FileCheck, Ban, Loader2, Package, CreditCard, Truck, Clock } from "lucide-react";
import { SecureDownloadButton } from "@/components/SecureDownloadButton";
import { getSignedUrl, extractBucketFromUrl, extractPathFromUrl } from "@/lib/storage-utils";
import { getExpressSurcharge } from "@/lib/expressOption";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentViewer } from "@/components/DocumentViewer";
import { GuestOrderChat } from "@/components/GuestOrderChat";
import { cn } from "@/lib/utils";

interface GuestOrder {
  id: string;
  tracking_number: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  date_mec: string | null;
  energie: string | null;
  puiss_fisc: number | null;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  montant_ht: number;
  montant_ttc: number;
  frais_dossier: number;
  status: string;
  express?: boolean;
  paye: boolean;
  documents_complets: boolean;
  commentaire: string | null;
  created_at: string;
  validated_at: string | null;
  validated_by: string | null;
  requires_resubmission_payment: boolean;
  resubmission_payment_amount: number;
  resubmission_paid: boolean;
  sms_notifications: boolean;
  email_notifications: boolean;
  dossier_prioritaire?: boolean;
  certificat_non_gage?: boolean;
  has_cotitulaire?: boolean;
  cotitulaire_nom?: string | null;
  cotitulaire_prenom?: string | null;
  vehicule_pro?: boolean;
  vehicule_leasing?: boolean;
  is_mineur?: boolean;
  is_heberge?: boolean;
  demarche_type?: string;
}

interface Document {
  id: string;
  type_document: string;
  nom_fichier: string;
  url: string;
  created_at: string;
  validation_status: string;
  validated_at: string | null;
  rejection_reason: string | null;
  side: string | null;
}

// Status timeline
const StatusTimeline = ({ status, paye }: { status: string; paye: boolean }) => {
  const steps = [
    { key: "commande", label: "Commande", icon: Package },
    { key: "paiement", label: "Paiement", icon: CreditCard },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "validation", label: "Validation", icon: CheckCircle2 },
    { key: "envoi", label: "Envoi", icon: Truck },
  ];

  const getStepStatus = (key: string) => {
    const statusOrder: Record<string, number> = {
      en_attente: 0, paye: 1, en_traitement: 2, valide: 3, finalise: 4, refuse: -1
    };
    const current = statusOrder[status] ?? 0;
    const stepIndex = steps.findIndex(s => s.key === key);

    if (status === 'refuse') return stepIndex === 0 ? 'completed' : 'failed';
    if (key === 'paiement' && paye) return 'completed';
    if (stepIndex <= current) return 'completed';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, i) => {
        const stepStatus = getStepStatus(step.key);
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                stepStatus === 'completed' ? "bg-green-500 text-white" :
                stepStatus === 'failed' ? "bg-destructive text-destructive-foreground" :
                "bg-muted text-muted-foreground"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs mt-1 font-medium text-center">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-1 mt-[-16px]",
                stepStatus === 'completed' ? "bg-green-500" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// Bulk Reject Dialog
function BulkRejectDialog({ onReject, disabled, count }: { onReject: (reason: string) => void; disabled: boolean; count: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={disabled}>
          <XCircle className="mr-2 h-4 w-4" /> Refuser ({count})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refuser {count} document(s)</AlertDialogTitle>
          <AlertDialogDescription>Indiquez la raison du refus.</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea placeholder="Raison du refus..." value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onReject(reason); setOpen(false); setReason(""); }} disabled={!reason.trim()} className="bg-destructive text-destructive-foreground">Confirmer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Reject with Payment Dialog
function RejectWithPaymentDialog({ onReject, disabled, count, amount = 10 }: { onReject: (reason: string) => void; disabled: boolean; count: number; amount?: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="border-orange-500 text-orange-600 hover:bg-orange-50">
          <Ban className="mr-2 h-4 w-4" /> Refuser + Paiement ({count})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-orange-600">Refuser et demander paiement</AlertDialogTitle>
          <AlertDialogDescription>Le client devra payer <strong>{amount} €</strong> avant de pouvoir renvoyer ses documents.</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea placeholder="Raison du refus..." value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => { onReject(reason); setOpen(false); setReason(""); }} disabled={!reason.trim()} className="bg-orange-500 text-white hover:bg-orange-600">Refuser et exiger {amount} €</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function GuestOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [commentaire, setCommentaire] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [carteGriseUrl, setCarteGriseUrl] = useState("");
  const [isSendingCarteGrise, setIsSendingCarteGrise] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [adminDocFile, setAdminDocFile] = useState<File | null>(null);
  const [adminDocName, setAdminDocName] = useState("");
  const [adminDocDescription, setAdminDocDescription] = useState("");
  const [isSendingAdminDoc, setIsSendingAdminDoc] = useState(false);
  const [sentAdminDocs, setSentAdminDocs] = useState<any[]>([]);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  useEffect(() => {
    if (user) checkAdminAndLoadData();
  }, [user, id]);

  const checkAdminAndLoadData = async () => {
    if (!user) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) { navigate("/dashboard"); return; }
    await loadOrderData();
  };

  const loadOrderData = async () => {
    try {
      const { data: orderData, error: orderError } = await supabase.from("guest_orders").select("*").eq("id", id).single();
      if (orderError) throw orderError;
      setOrder(orderData);
      setCommentaire(orderData.commentaire || "");

      const { data: docsData } = await supabase.from("guest_order_documents").select("*").eq("order_id", id).neq("type_document", "carte_grise_finale").order("created_at", { ascending: false });
      setDocuments(docsData || []);

      // Bucket privé : générer des URLs signées pour les aperçus image
      if (docsData && docsData.length > 0) {
        const previews: Record<string, string> = {};
        await Promise.all(
          docsData
            .filter((d: Document) => d.url && /\.(jpg|jpeg|png|webp|gif)/i.test(d.url))
            .map(async (d: Document) => {
              const bucket = extractBucketFromUrl(d.url);
              const path = extractPathFromUrl(d.url);
              if (bucket && path) {
                const signed = await getSignedUrl(bucket, path, orderData?.tracking_number);
                if (signed) previews[d.id] = signed;
              }
            })
        );
        setDocPreviews(previews);
      } else {
        setDocPreviews({});
      }

      const { data: adminDocs } = await supabase.from("guest_order_admin_documents").select("*").eq("order_id", id).order("created_at", { ascending: false });
      setSentAdminDocs(adminDocs || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendNotificationToClient = async () => {
    if (!notificationMessage || !order) return;
    setIsSendingNotification(true);
    try {
      await supabase.functions.invoke('send-email', {
        body: { type: 'custom_notification', to: order.email, data: { customerName: `${order.prenom} ${order.nom}`, subject: `📬 Information - Commande ${order.tracking_number}`, message: notificationMessage } }
      });
      toast({ title: "Notification envoyée" });
      setNotificationMessage("");
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer", variant: "destructive" });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleValidate = async () => {
    if (!user || !order) return;
    setIsValidating(true);
    try {
      await supabase.from("guest_orders").update({ status: "valide", validated_at: new Date().toISOString(), validated_by: user.id, commentaire }).eq("id", order.id);
      try {
        await supabase.functions.invoke('send-email', { body: { type: 'order_confirmation', to: order.email, data: { tracking_number: order.tracking_number, nom: order.nom, prenom: order.prenom, immatriculation: order.immatriculation, montant_ttc: order.montant_ttc } } });
      } catch (e) { console.error('Email failed:', e); }
      toast({ title: "Commande validée" });
      await loadOrderData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleReject = async () => {
    if (!user || !order) return;
    setIsValidating(true);
    try {
      await supabase.from("guest_orders").update({ status: "refuse", validated_at: new Date().toISOString(), validated_by: user.id, commentaire }).eq("id", order.id);
      try {
        await supabase.functions.invoke('send-email', { body: { type: 'document_rejected', to: order.email, data: { tracking_number: order.tracking_number, nom: order.nom, prenom: order.prenom, rejectedDocuments: [{ nom: 'Commande', raison: commentaire || 'Commande refusée' }] } } });
      } catch (e) { console.error('Email failed:', e); }
      toast({ title: "Commande refusée" });
      await loadOrderData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFinalize = async () => {
    if (!order || !carteGriseUrl.trim()) return;
    setIsSendingCarteGrise(true);
    try {
      await supabase.from('guest_order_documents').insert({ order_id: order.id, type_document: 'carte_grise_finale', nom_fichier: 'carte_grise_finale.pdf', url: carteGriseUrl, validation_status: 'approved' });
      await supabase.functions.invoke('send-email', { body: { type: 'completed', to: order.email, data: { tracking_number: order.tracking_number, nom: order.nom, prenom: order.prenom, immatriculation: order.immatriculation } } });
      await supabase.from("guest_orders").update({ status: "finalise" }).eq("id", order.id);
      toast({ title: "Démarche terminée" });
      await loadOrderData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsSendingCarteGrise(false);
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };

  const handleBulkApprove = async () => {
    if (selectedDocs.length === 0) return;
    setIsValidating(true);
    try {
      await supabase.from("guest_order_documents").update({ validation_status: "approved", validated_at: new Date().toISOString(), validated_by: user?.id, rejection_reason: null }).in("id", selectedDocs);

      // Check all approved
      const { data: allDocs } = await supabase.from("guest_order_documents").select("validation_status").eq("order_id", order!.id).neq("type_document", "carte_grise_finale");
      const allApproved = allDocs?.every(d => d.validation_status === 'approved');
      if (allApproved && order) {
        await supabase.from("guest_orders").update({ status: "en_traitement" }).eq("id", order.id);
        try {
          await supabase.functions.invoke('send-email', { body: { type: 'guest_documents_validated', to: order.email, data: { prenom: order.prenom, nom: order.nom, tracking_number: order.tracking_number, immatriculation: order.immatriculation } } });
          await supabase.functions.invoke('send-email', { body: { type: 'guest_order_processing', to: order.email, data: { prenom: order.prenom, nom: order.nom, tracking_number: order.tracking_number, immatriculation: order.immatriculation } } });
        } catch (e) { console.error('Email failed:', e); }
      }

      toast({ title: `${selectedDocs.length} document(s) validé(s)` });
      setSelectedDocs([]);
      await loadOrderData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedDocs.length === 0 || !order) return;
    setIsValidating(true);
    try {
      await supabase.from("guest_order_documents").update({ validation_status: "rejected", validated_at: new Date().toISOString(), validated_by: user?.id, rejection_reason: reason }).in("id", selectedDocs);
      const { data: rejectedDocs } = await supabase.from("guest_order_documents").select("type_document").in("id", selectedDocs);
      if (rejectedDocs) {
        await supabase.functions.invoke('send-email', { body: { type: 'document_rejected', to: order.email, data: { tracking_number: order.tracking_number, nom: order.nom, prenom: order.prenom, rejectedDocuments: rejectedDocs.map(d => ({ nom: d.type_document, raison: reason })) } } });
      }
      toast({ title: "Documents refusés" });
      setSelectedDocs([]);
      await loadOrderData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkRejectWithPayment = async (reason: string) => {
    if (selectedDocs.length === 0 || !order) return;
    setIsValidating(true);
    try {
      await supabase.from("guest_order_documents").update({ validation_status: "rejected", validated_at: new Date().toISOString(), validated_by: user?.id, rejection_reason: reason }).in("id", selectedDocs);
      await supabase.from("guest_orders").update({ requires_resubmission_payment: true, resubmission_paid: false }).eq("id", order.id);
      await supabase.functions.invoke('send-email', { body: { type: 'resubmission_payment_required', to: order.email, data: { tracking_number: order.tracking_number, nom: order.nom, prenom: order.prenom, amount: order.resubmission_payment_amount || 10, reason } } });
      toast({ title: "Documents refusés avec paiement requis" });
      setSelectedDocs([]);
      await loadOrderData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsValidating(false);
    }
  };

  const toggleDocumentsComplets = async () => {
    if (!order) return;
    try {
      await supabase.from("guest_orders").update({ documents_complets: !order.documents_complets }).eq("id", order.id);
      toast({ title: `Documents marqués comme ${!order.documents_complets ? "complets" : "incomplets"}` });
      await loadOrderData();
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      en_attente: "bg-secondary text-secondary-foreground",
      paye: "bg-blue-500 text-white",
      en_traitement: "bg-orange-500 text-white",
      valide: "bg-blue-700 text-white",
      finalise: "bg-green-600 text-white",
      refuse: "bg-destructive text-destructive-foreground",
    };
    return map[status] || "bg-secondary text-secondary-foreground";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!order) {
    return <div className="min-h-screen flex items-center justify-center"><p>Commande non trouvée</p></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4 md:p-8">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Admin - Commande {order.tracking_number} | Discount Carte Grise</title>
      </Helmet>
      <div className="max-w-7xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/admin/guest-orders")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Commande {order.tracking_number}</h1>
            <p className="text-sm text-muted-foreground">Créée le {new Date(order.created_at).toLocaleDateString("fr-FR")}</p>
          </div>
          <div className="flex items-center gap-2">
            {order.demarche_type && <Badge variant="outline">{order.demarche_type}</Badge>}
            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
            <ExpressBadge express={order.express} />
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timeline */}
            <Card>
              <CardContent className="pt-6">
                <StatusTimeline status={order.status} paye={order.paye} />
              </CardContent>
            </Card>

            {/* Documents */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle>Documents ({documents.length})</CardTitle>
                    {selectedDocs.length > 0 && <Badge variant="secondary">{selectedDocs.length} sélectionné(s)</Badge>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedDocs.length > 0 && (
                      <>
                        <BulkRejectDialog onReject={handleBulkReject} disabled={isValidating} count={selectedDocs.length} />
                        <RejectWithPaymentDialog onReject={handleBulkRejectWithPayment} disabled={isValidating} count={selectedDocs.length} amount={order.resubmission_payment_amount || 10} />
                        <Button onClick={handleBulkApprove} disabled={isValidating} size="sm"><CheckCircle2 className="mr-2 h-4 w-4" /> Valider</Button>
                      </>
                    )}
                    <Button variant={order.documents_complets ? "default" : "outline"} size="sm" onClick={toggleDocumentsComplets}>
                      {order.documents_complets ? <><CheckCircle2 className="mr-2 h-4 w-4" /> Complets</> : <><XCircle className="mr-2 h-4 w-4" /> Incomplets</>}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Aucun document</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 border rounded-xl space-y-2 bg-card">
                        {/* Mini aperçu (URL signée car bucket privé) */}
                        {doc.url && /\.(jpg|jpeg|png|webp|gif)/i.test(doc.url) ? (
                          <div className="w-full h-24 rounded-lg overflow-hidden bg-muted cursor-pointer flex items-center justify-center" onClick={() => setSelectedDoc(doc)}>
                            {docPreviews[doc.id] ? (
                              <img src={docPreviews[doc.id]} alt={doc.type_document} className="w-full h-full object-cover" />
                            ) : (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        ) : doc.url && /\.pdf/i.test(doc.url) ? (
                          <div className="w-full h-24 rounded-lg overflow-hidden bg-muted cursor-pointer flex flex-col items-center justify-center gap-1 text-muted-foreground" onClick={() => setSelectedDoc(doc)}>
                            <FileText className="h-7 w-7" />
                            <span className="text-[10px]">Voir le PDF</span>
                          </div>
                        ) : null}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Checkbox checked={selectedDocs.includes(doc.id)} onCheckedChange={() => toggleDocSelection(doc.id)} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{doc.type_document} {doc.side && `(${doc.side})`}</p>
                              <p className="text-xs text-muted-foreground truncate">{doc.nom_fichier}</p>
                            </div>
                          </div>
                          <Badge className={cn(
                            doc.validation_status === 'approved' ? "bg-green-500" :
                            doc.validation_status === 'rejected' ? "bg-destructive" : ""
                          )} variant={doc.validation_status === 'pending' ? "secondary" : "default"}>
                            {doc.validation_status === 'approved' ? "Validé" : doc.validation_status === 'rejected' ? "Refusé" : "En attente"}
                          </Badge>
                        </div>
                        {doc.rejection_reason && (
                          <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {doc.rejection_reason}
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedDoc(doc)}><Eye className="h-4 w-4" /></Button>
                          <SecureDownloadButton url={doc.url} filename={doc.nom_fichier} trackingNumber={order.tracking_number} variant="ghost" size="sm" />
                          {doc.validation_status === 'pending' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={async () => {
                                await supabase.from("guest_order_documents").update({ validation_status: "approved", validated_at: new Date().toISOString(), validated_by: user?.id, rejection_reason: null }).eq("id", doc.id);
                                const { data: allDocs } = await supabase.from("guest_order_documents").select("validation_status").eq("order_id", order.id).neq("type_document", "carte_grise_finale");
                                if (allDocs?.every(d => d.validation_status === 'approved')) {
                                  await supabase.from("guest_orders").update({ status: "en_traitement" }).eq("id", order.id);
                                  try {
                                    await supabase.functions.invoke('send-email', { body: { type: 'guest_documents_validated', to: order.email, data: { prenom: order.prenom, nom: order.nom, tracking_number: order.tracking_number, immatriculation: order.immatriculation } } });
                                    await supabase.functions.invoke('send-email', { body: { type: 'guest_order_processing', to: order.email, data: { prenom: order.prenom, nom: order.nom, tracking_number: order.tracking_number, immatriculation: order.immatriculation } } });
                                  } catch (e) { console.error(e); }
                                }
                                toast({ title: "Document validé" });
                                loadOrderData();
                              }}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                              <Button variant="ghost" size="sm" onClick={async () => {
                                const reason = prompt("Motif du refus :");
                                if (!reason) return;
                                await supabase.from("guest_order_documents").update({ validation_status: "rejected", validated_at: new Date().toISOString(), validated_by: user?.id, rejection_reason: reason }).eq("id", doc.id);
                                await supabase.functions.invoke('send-email', { body: { type: 'document_rejected', to: order.email, data: { tracking_number: order.tracking_number, nom: order.nom, prenom: order.prenom, rejectedDocuments: [{ nom: doc.type_document, raison: reason }] } } });
                                toast({ title: "Document refusé", description: `${doc.type_document} refusé` });
                                loadOrderData();
                              }}><XCircle className="h-4 w-4 text-red-600" /></Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document viewer */}
            {selectedDoc && order && (
              <DocumentViewer isOpen={!!selectedDoc} onClose={() => setSelectedDoc(null)} documentUrl={selectedDoc.url} documentName={selectedDoc.nom_fichier} documentType={selectedDoc.type_document} trackingNumber={order.tracking_number} />
            )}

            {/* Client info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Informations Client</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Nom</p><p className="font-medium">{order.prenom || order.nom ? `${order.prenom || ''} ${order.nom || ''}`.trim() : <span className="text-orange-500 italic">Non renseigné</span>}</p></div></div>
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{order.email || <span className="text-orange-500 italic">Non renseigné</span>}</p></div></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Téléphone</p><p className="font-medium">{order.telephone || <span className="text-orange-500 italic">Non renseigné</span>}</p></div></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Adresse</p><p className="font-medium">{order.adresse ? `${order.adresse}, ${order.code_postal} ${order.ville}` : <span className="text-orange-500 italic">Non renseigné</span>}</p></div></div>
              </CardContent>
            </Card>

            {/* Vehicle info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-primary" /> Véhicule</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-xs text-muted-foreground">Immatriculation</p><p className="font-mono font-bold">{order.immatriculation}</p></div>
                {order.marque && <div><p className="text-xs text-muted-foreground">Marque</p><p className="font-medium">{order.marque}</p></div>}
                {order.modele && <div><p className="text-xs text-muted-foreground">Modèle</p><p className="font-medium">{order.modele}</p></div>}
                {order.energie && <div><p className="text-xs text-muted-foreground">Énergie</p><p className="font-medium">{order.energie}</p></div>}
                {order.puiss_fisc && <div><p className="text-xs text-muted-foreground">Puissance</p><p className="font-medium">{order.puiss_fisc} CV</p></div>}
                {order.date_mec && <div><p className="text-xs text-muted-foreground">Mise en circulation</p><p className="font-medium">{order.date_mec}</p></div>}
              </CardContent>
            </Card>

            {/* Options & payment details */}
            {(order.express || order.certificat_non_gage || order.sms_notifications) && (
              <Card className="border-orange-300">
                <CardHeader><CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-500" /> Options client</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {order.express && <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-300"><Badge className="bg-orange-500 text-white">PRIORITAIRE</Badge><span className="text-sm font-bold text-orange-600">+{getExpressSurcharge(order.demarche_type).toFixed(2)} €</span></div>}
                  {order.certificat_non_gage && <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-300"><Badge className="bg-blue-500 text-white">NON-GAGE</Badge><span className="text-sm font-bold text-blue-600">+10 €</span></div>}
                  {order.sms_notifications && <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-300"><Badge className="bg-purple-500 text-white">SMS</Badge><span className="text-sm font-bold text-purple-600">+5 €</span></div>}
                </CardContent>
              </Card>
            )}

            {/* Payment */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Euro className="h-5 w-5 text-primary" /> Paiement</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {/* Vraie taxe carte grise : 0 pour DA/DC (aucune taxe véhicule). Pour ces types,
                    montant_ht ne contient pas une taxe mais le cumul des options reclassé par le
                    webhook après paiement (amount − frais_dossier) — on ne l'affiche donc jamais ici. */}
                {(order.demarche_type !== 'DA' && order.demarche_type !== 'DC') && (order.montant_ht || 0) > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Taxe carte grise</span><span className="font-medium">{(order.montant_ht || 0).toFixed(2)} €</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Frais de dossier</span><span className="font-medium">{(order.frais_dossier || 0).toFixed(2)} €</span></div>
                {order.express && <div className="flex justify-between"><span className="text-muted-foreground">Dossier Prioritaire 2h</span><span className="font-medium">{getExpressSurcharge(order.demarche_type).toFixed(2)} €</span></div>}
                {order.certificat_non_gage && <div className="flex justify-between"><span className="text-muted-foreground">Certificat non-gage</span><span className="font-medium">10.00 €</span></div>}
                {order.sms_notifications && <div className="flex justify-between"><span className="text-muted-foreground">SMS</span><span className="font-medium">5.00 €</span></div>}
                {/* Total = vraie taxe carte grise (0 pour DA/DC) + frais_dossier + sms + certificat + express.
                    On repart de la vraie taxe (et non de montant_ht brut) car pour un DA/DC payé le surcoût
                    express est déjà rangé dans montant_ht par le webhook : l'y compter ferait un doublon. */}
                <div className="border-t pt-2 flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">{(
                  ((order.demarche_type !== 'DA' && order.demarche_type !== 'DC') ? (order.montant_ht || 0) : 0) +
                  (order.frais_dossier || 0) +
                  (order.sms_notifications ? 5 : 0) +
                  (order.certificat_non_gage ? 10 : 0) +
                  (order.express ? getExpressSurcharge(order.demarche_type) : 0)
                ).toFixed(2)} €</span></div>
                <div className="pt-2 flex gap-2 flex-wrap">
                  <Badge variant={order.paye ? "default" : "secondary"} className={order.paye ? "bg-green-600" : ""}>{order.paye ? "Payé" : "Non payé"}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Send admin doc */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Envoyer un document</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom du document *</Label>
                  <Input placeholder="Ex: Certificat..." value={adminDocName} onChange={(e) => setAdminDocName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Description..." value={adminDocDescription} onChange={(e) => setAdminDocDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fichier *</Label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setAdminDocFile(f); if (!adminDocName) setAdminDocName(f.name.replace(/\.[^.]+$/, '')); } }} />
                </div>
                <Button onClick={async () => {
                  if (!adminDocFile || !adminDocName.trim() || !order) return;
                  setIsSendingAdminDoc(true);
                  try {
                    const fileName = `${order.id}/admin_${Date.now()}_${adminDocFile.name}`;
                    const { error: uploadError } = await supabase.storage.from('guest-order-documents').upload(fileName, adminDocFile);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from('guest-order-documents').getPublicUrl(fileName);
                    await supabase.from('guest_order_admin_documents').insert({ order_id: order.id, nom_fichier: adminDocName, url: publicUrl, description: adminDocDescription || null, taille_octets: adminDocFile.size, sent_by: user?.id, email_sent: true, email_sent_at: new Date().toISOString() });
                    // Convert file to base64 for email attachment
                    let attachments: any[] = [];
                    try {
                      const reader = new FileReader();
                      const base64 = await new Promise<string>((resolve) => {
                        reader.onload = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(adminDocFile);
                      });
                      attachments = [{ filename: adminDocFile.name, content: base64 }];
                    } catch (e) { console.error('Attachment conversion failed:', e); }
                    await supabase.functions.invoke('send-email', { body: { type: 'admin_document', to: order.email, data: { tracking_number: order.tracking_number, nom: order.nom, prenom: order.prenom, document_name: adminDocName, description: adminDocDescription }, attachments } });
                    toast({ title: "Document envoyé" });
                    setAdminDocFile(null); setAdminDocName(""); setAdminDocDescription("");
                    await loadOrderData();
                  } catch (error) {
                    toast({ title: "Erreur", variant: "destructive" });
                  } finally {
                    setIsSendingAdminDoc(false);
                  }
                }} disabled={isSendingAdminDoc || !adminDocFile || !adminDocName.trim()} className="w-full">
                  {isSendingAdminDoc ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...</> : <><Send className="mr-2 h-4 w-4" /> Envoyer</>}
                </Button>
                {sentAdminDocs.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Documents envoyés:</p>
                    {sentAdminDocs.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                        <div><p className="font-medium">{doc.nom_fichier}</p><p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</p></div>
                        <SecureDownloadButton url={doc.url} filename={doc.nom_fichier} variant="ghost" size="icon" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            {/* Change status */}
            <Card>
              <CardHeader><CardTitle>Statut de la commande</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={order.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    await supabase.from("guest_orders").update({ status: newStatus }).eq("id", order.id);
                    toast({ title: `Statut mis à jour : ${newStatus}` });
                    loadOrderData();
                  }}
                  className="w-full p-2 border rounded-lg bg-background text-sm"
                >
                  <option value="en_attente">En attente</option>
                  <option value="paye">Payé</option>
                  <option value="en_traitement">En cours de traitement</option>
                  <option value="valide">Validé</option>
                  <option value="finalise">Terminé</option>
                  <option value="refuse">Refusé</option>
                </select>
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card>
              <CardHeader><CardTitle>Actions rapides</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {order.status === "en_attente" && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full bg-green-600 hover:bg-green-700" disabled={isValidating}><CheckCircle2 className="mr-2 h-4 w-4" /> Valider</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Valider la commande ?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleValidate}>Confirmer</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full" disabled={isValidating}><XCircle className="mr-2 h-4 w-4" /> Refuser</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Refuser la commande ?</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleReject} className="bg-destructive">Confirmer</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                {(order.status === "valide" || order.status === "en_traitement") && (
                  <div className="space-y-3">
                    <Label>Carte grise finale (PDF)</Label>
                    <Input type="file" accept=".pdf" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !order) return;
                      try {
                        const fileName = `${order.id}/carte_grise_finale_${Date.now()}.pdf`;
                        const { error } = await supabase.storage.from('guest-order-documents').upload(fileName, file);
                        if (error) throw error;
                        const { data: { publicUrl } } = supabase.storage.from('guest-order-documents').getPublicUrl(fileName);
                        setCarteGriseUrl(publicUrl);
                        toast({ title: "Fichier prêt" });
                      } catch (error) {
                        toast({ title: "Erreur", variant: "destructive" });
                      }
                    }} />
                    {carteGriseUrl && <p className="text-sm text-green-600 flex items-center gap-1"><FileCheck className="h-4 w-4" /> Prêt</p>}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSendingCarteGrise || !carteGriseUrl.trim()}>
                          {isSendingCarteGrise ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                          Finaliser
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Finaliser la démarche ?</AlertDialogTitle><AlertDialogDescription>Le client sera notifié.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleFinalize}>Confirmer</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chat */}
            <GuestOrderChat orderId={order.id} isAdmin={true} trackingNumber={order.tracking_number} guestEmail={order.email} guestName={`${order.prenom} ${order.nom}`} />

            {/* Notes */}
            <Card>
              <CardHeader><CardTitle>Notes internes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Notes..." rows={4} />
                <Button variant="outline" className="w-full" onClick={async () => {
                  await supabase.from("guest_orders").update({ commentaire }).eq("id", order.id);
                  toast({ title: "Notes sauvegardées" });
                }}>Sauvegarder</Button>
              </CardContent>
            </Card>

            {/* Notification */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Notification</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} placeholder="Message..." rows={3} />
                <Button onClick={sendNotificationToClient} className="w-full" disabled={!notificationMessage || isSendingNotification}>
                  {isSendingNotification ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Envoyer
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, XCircle, Eye, ShieldCheck, Send, Loader2, Clock, History, Plus, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Textarea } from "@/components/ui/textarea";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface Notification {
  id: string;
  subject: string;
  message: string;
  created_at: string;
  sent_by: string;
}

export default function ManageGarages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garages, setGarages] = useState<any[]>([]);
  const [garagesAVerifier, setGaragesAVerifier] = useState<any[]>([]);
  const [garagesVerifies, setGaragesVerifies] = useState<any[]>([]);
  const [garagesEnAttente, setGaragesEnAttente] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGarage, setSelectedGarage] = useState<any>(null);
  const [verificationDocs, setVerificationDocs] = useState<any[]>([]);
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [showDocsDialog, setShowDocsDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectAccountReason, setRejectAccountReason] = useState("");
  const [processingGarage, setProcessingGarage] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<any>(null);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<Notification[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("documents");
  const [showManageDocsDialog, setShowManageDocsDialog] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ nom_document: "", code: "", description: "", obligatoire: true });
  const [savingDoc, setSavingDoc] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .single();

    if (!roles || roles.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    loadGarages();
    loadRequiredDocs();
  };

  const loadRequiredDocs = async () => {
    const { data } = await supabase
      .from('garage_verification_required_documents')
      .select('*')
      .order('ordre', { ascending: true });
    setRequiredDocs(data || []);
  };

  const loadGarages = async () => {
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading garages:', error);
      setLoading(false);
      return;
    }
    
    const allGarages = data || [];
    
    // Charger les documents de vérification pour tous les garages
    const { data: allDocs } = await supabase
      .from('verification_documents')
      .select('garage_id');
    
    // Set de garages ayant au moins 1 document
    const garagesWithDocs = new Set((allDocs || []).map(d => d.garage_id));
    
    // VÉRIFIÉS: Garages déjà vérifiés
    const verifies = allGarages.filter(g => g.is_verified);
    
    // À VÉRIFIER: Garages avec tous les documents soumis ET pas encore ouverts par admin
    const aVerifier = allGarages.filter(g => 
      g.verification_requested_at && 
      !g.is_verified && 
      !g.verification_admin_viewed
    );
    
    // EN ATTENTE: Garages avec au moins 1 document ET (ouverts par admin OU pas tous les docs)
    // DOIT avoir au moins 1 document pour apparaître
    const enAttente = allGarages.filter(g => 
      !g.is_verified && 
      !aVerifier.some(av => av.id === g.id) && 
      garagesWithDocs.has(g.id) && // OBLIGATOIRE: au moins 1 document
      g.verification_admin_viewed === true // ET doit avoir été ouvert par admin
    );
    
    setGarages(allGarages);
    setGaragesAVerifier(aVerifier);
    setGaragesVerifies(verifies);
    setGaragesEnAttente(enAttente);
    setLoading(false);
  };

  const loadVerificationDocs = async (garageId: string) => {
    const { data } = await supabase
      .from('verification_documents')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });

    setVerificationDocs(data || []);
  };

  const loadNotificationHistory = async (garageId: string) => {
    const { data } = await supabase
      .from('garage_verification_notifications')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
    setNotificationHistory(data || []);
  };

  const handleViewDocs = async (garage: any) => {
    setSelectedGarage(garage);
    await loadVerificationDocs(garage.id);
    await loadNotificationHistory(garage.id);
    
    // Mark as viewed when opening
    if (!garage.verification_admin_viewed && garage.verification_requested_at) {
      await supabase
        .from('garages')
        .update({ verification_admin_viewed: true })
        .eq('id', garage.id);
      
      // Update local state
      setGaragesAVerifier(prev => prev.map(g => 
        g.id === garage.id ? { ...g, verification_admin_viewed: true } : g
      ));
    }
    
    setShowDocsDialog(true);
    setActiveTab("documents");
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleBulkApprove = async () => {
    if (selectedDocs.length === 0) return;

    try {
      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'approved',
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
          rejection_reason: null
        })
        .in('id', selectedDocs);

      if (error) throw error;

      // Send notification email for approval
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom_notification',
          to: selectedGarage.email,
          data: {
            customerName: selectedGarage.raison_sociale,
            subject: 'Documents approuvés',
            message: `Vos documents de vérification ont été approuvés. ${selectedDocs.length} document(s) validé(s).`
          }
        }
      });

      toast({
        title: "Documents approuvés",
        description: `${selectedDocs.length} document(s) validé(s)`,
      });

      setSelectedDocs([]);
      await loadVerificationDocs(selectedGarage.id);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'approuver les documents",
        variant: "destructive"
      });
    }
  };

  const handleBulkReject = async () => {
    if (selectedDocs.length === 0 || !rejectionReason.trim()) return;

    try {
      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          validated_by: user?.id,
          validated_at: new Date().toISOString()
        })
        .in('id', selectedDocs);

      if (error) throw error;

      // Create notification for the garage client to see in their dashboard
      await supabase.from('garage_verification_notifications').insert({
        garage_id: selectedGarage.id,
        sent_by: user?.id,
        subject: 'Documents refusés - Action requise',
        message: `${selectedDocs.length} document(s) ont été refusés.\n\nRaison: ${rejectionReason}\n\nVeuillez renvoyer les documents corrigés.`
      });

      // Send rejection email with reason
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom_notification',
          to: selectedGarage.email,
          data: {
            customerName: selectedGarage.raison_sociale,
            subject: 'Documents refusés - Action requise',
            message: `${selectedDocs.length} document(s) ont été refusés.\n\nRaison: ${rejectionReason}\n\nVeuillez renvoyer les documents corrigés dans votre espace "Paramètres > Vérification".`
          }
        }
      });

      toast({
        title: "Documents refusés",
        description: `${selectedDocs.length} document(s) refusé(s) - Email envoyé`,
      });

      setSelectedDocs([]);
      setRejectionReason("");
      await loadVerificationDocs(selectedGarage.id);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser les documents",
        variant: "destructive"
      });
    }
  };

  const handleSingleApprove = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'approved',
          validated_by: user?.id,
          validated_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', docId);

      if (error) throw error;

      toast({ title: "Document approuvé" });
      await loadVerificationDocs(selectedGarage.id);
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleSingleReject = async (docId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('verification_documents')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          validated_by: user?.id,
          validated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      // Create notification for the garage client to see in their dashboard
      await supabase.from('garage_verification_notifications').insert({
        garage_id: selectedGarage.id,
        sent_by: user?.id,
        subject: 'Document refusé - Action requise',
        message: `Un document a été refusé.\n\nRaison: ${reason}\n\nVeuillez renvoyer le document corrigé.`
      });

      // Send rejection email with reason
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom_notification',
          to: selectedGarage.email,
          data: {
            customerName: selectedGarage.raison_sociale,
            subject: 'Document refusé - Action requise',
            message: `Un document a été refusé.\n\nRaison: ${reason}\n\nVeuillez renvoyer le document corrigé dans votre espace "Paramètres > Vérification".`
          }
        }
      });

      toast({ title: "Document refusé", description: "Email envoyé au garage" });
      await loadVerificationDocs(selectedGarage.id);
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleVerifyGarage = async () => {
    if (!selectedGarage) return;

    setProcessingGarage(true);
    try {
      const { error: updateError } = await supabase
        .from('garages')
        .update({ is_verified: true })
        .eq('id', selectedGarage.id);

      if (updateError) throw updateError;

      const updatedGarage = { ...selectedGarage, is_verified: true };
      setGaragesAVerifier(prev => prev.filter(g => g.id !== selectedGarage.id));
      setGaragesVerifies(prev => [updatedGarage, ...prev]);

      await supabase.functions.invoke('send-email', {
        body: {
          type: 'account_verified',
          to: selectedGarage.email,
          data: {
            customerName: selectedGarage.raison_sociale
          }
        }
      });

      toast({
        title: "Garage vérifié",
        description: "Le garage a été vérifié et notifié par email",
      });

      setShowVerifyDialog(false);
      setShowDocsDialog(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le garage",
        variant: "destructive"
      });
      await loadGarages();
    } finally {
      setProcessingGarage(false);
    }
  };

  const handleRejectGarage = async () => {
    if (!selectedGarage || !rejectAccountReason.trim()) return;

    setProcessingGarage(true);
    try {
      const { error: updateError } = await supabase
        .from('garages')
        .update({ 
          is_verified: false,
          verification_requested_at: null
        })
        .eq('id', selectedGarage.id);

      if (updateError) throw updateError;

      await supabase.functions.invoke('send-email', {
        body: {
          type: 'account_rejected',
          to: selectedGarage.email,
          data: {
            customerName: selectedGarage.raison_sociale,
            rejectionReason: rejectAccountReason
          }
        }
      });

      toast({
        title: "Vérification refusée",
        description: "Le garage a été notifié par email",
      });

      setShowRejectDialog(false);
      setShowDocsDialog(false);
      setRejectAccountReason("");
      await loadGarages();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la vérification",
        variant: "destructive"
      });
    } finally {
      setProcessingGarage(false);
    }
  };

  // Check if all required documents are approved
  const allRequiredDocsApproved = () => {
    const requiredCodes = requiredDocs.filter(d => d.obligatoire && d.actif).map(d => d.code);
    const approvedCodes = verificationDocs
      .filter(d => d.status === 'approved')
      .map(d => d.document_type);
    return requiredCodes.every(code => approvedCodes.includes(code));
  };

  const handleSendNotification = async () => {
    if (!selectedGarage || !notificationSubject.trim() || !notificationMessage.trim()) return;

    setSendingNotification(true);
    try {
      // Save notification to database - will appear on client's notification bell
      await supabase.from('garage_verification_notifications').insert({
        garage_id: selectedGarage.id,
        sent_by: user?.id,
        subject: notificationSubject,
        message: notificationMessage
      });

      toast({
        title: "Notification envoyée",
        description: `Le garage verra cette notification dans son espace`,
      });

      setShowNotificationDialog(false);
      setNotificationSubject("");
      setNotificationMessage("");
      await loadNotificationHistory(selectedGarage.id);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive"
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const handleAddRequiredDoc = async () => {
    if (!newDocForm.nom_document.trim() || !newDocForm.code.trim()) return;
    setSavingDoc(true);
    try {
      const maxOrdre = Math.max(...requiredDocs.map(d => d.ordre), 0);
      const { error } = await supabase.from('garage_verification_required_documents').insert({
        nom_document: newDocForm.nom_document,
        code: newDocForm.code.toLowerCase().replace(/\s+/g, '_'),
        description: newDocForm.description,
        obligatoire: newDocForm.obligatoire,
        ordre: maxOrdre + 1
      });
      if (error) throw error;
      toast({ title: "Document ajouté" });
      setNewDocForm({ nom_document: "", code: "", description: "", obligatoire: true });
      await loadRequiredDocs();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setSavingDoc(false);
    }
  };

  const handleToggleDocActive = async (doc: RequiredDocument) => {
    await supabase.from('garage_verification_required_documents')
      .update({ actif: !doc.actif })
      .eq('id', doc.id);
    await loadRequiredDocs();
  };

  const handleToggleDocRequired = async (doc: RequiredDocument) => {
    await supabase.from('garage_verification_required_documents')
      .update({ obligatoire: !doc.obligatoire })
      .eq('id', doc.id);
    await loadRequiredDocs();
  };

  const getDocumentsByType = (docType: string) => {
    return verificationDocs.filter(d => d.document_type === docType);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          <Button variant="outline" onClick={() => setShowManageDocsDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Gérer les documents requis
          </Button>
        </div>

        {/* Section À VÉRIFIER */}
        <Card className="p-6 mb-8 border-2 border-orange-500/20 bg-orange-50/5">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-6 w-6 text-orange-600" />
            <h1 className="text-2xl font-bold text-orange-700 dark:text-orange-500">Garages à vérifier</h1>
            <Badge variant="outline" className="border-orange-500 text-orange-600">{garagesAVerifier.length}</Badge>
          </div>

          {garagesAVerifier.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun garage en attente de vérification</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Date demande</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garagesAVerifier.map((garage) => (
                  <TableRow key={garage.id} className={!garage.verification_admin_viewed ? "bg-red-50 dark:bg-red-950/20" : "bg-orange-50/50 dark:bg-orange-950/10"}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {garage.raison_sociale}
                        {!garage.verification_admin_viewed && (
                          <Badge variant="destructive" className="animate-pulse">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Nouveau
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{garage.siret}</TableCell>
                    <TableCell>{garage.email}</TableCell>
                    <TableCell>{garage.telephone}</TableCell>
                    <TableCell>
                      {new Date(garage.verification_requested_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleViewDocs(garage)} className="bg-orange-600 hover:bg-orange-700">
                        <Eye className="h-4 w-4 mr-2" />
                        Vérifier
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Section EN ATTENTE (nouveau : vue après ouverture) */}
        <Card className="p-6 mb-8 border-2 border-yellow-500/20 bg-yellow-50/5">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-yellow-600" />
            <h1 className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">En attente de documents</h1>
            <Badge variant="outline" className="border-yellow-500 text-yellow-600">{garagesEnAttente.length}</Badge>
          </div>

          {garagesEnAttente.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun garage en attente</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garagesEnAttente.map((garage) => (
                  <TableRow key={garage.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {garage.raison_sociale}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{garage.siret}</TableCell>
                    <TableCell className="text-muted-foreground">{garage.email}</TableCell>
                    <TableCell className="text-muted-foreground">{garage.telephone}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleViewDocs(garage)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Section VÉRIFIÉS */}
        <Card className="p-6 mb-8 border-2 border-green-500/20 bg-green-50/5">
          <div className="flex items-center gap-3 mb-6">
            <ShieldCheck className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold text-green-700 dark:text-green-500">Garages vérifiés</h1>
            <Badge variant="outline" className="border-green-500 text-green-600">{garagesVerifies.length}</Badge>
          </div>

          {garagesVerifies.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun garage vérifié</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raison sociale</TableHead>
                  <TableHead>SIRET</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garagesVerifies.map((garage) => (
                  <TableRow key={garage.id} className="bg-green-50/50 dark:bg-green-950/10">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {garage.raison_sociale}
                        <Badge className="bg-green-500">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Vérifié
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{garage.siret}</TableCell>
                    <TableCell>{garage.email}</TableCell>
                    <TableCell>{garage.telephone}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleViewDocs(garage)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Documents
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Dialog Documents avec onglets */}
        <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedGarage?.raison_sociale}
                {selectedGarage?.is_verified && (
                  <Badge className="bg-green-500">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Vérifié
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Gérer la vérification et les notifications
              </DialogDescription>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  Notifications
                  {notificationHistory.length > 0 && (
                    <Badge variant="secondary" className="text-xs">{notificationHistory.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="flex-1 overflow-auto mt-4">
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

                  <ScrollArea className="h-[400px] pr-4">
                    {requiredDocs.filter(d => d.actif).map((reqDoc) => {
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
                              <Badge variant={
                                latestDoc.status === 'approved' ? 'default' :
                                latestDoc.status === 'rejected' ? 'destructive' : 'secondary'
                              } className={latestDoc.status === 'approved' ? 'bg-green-500' : ''}>
                                {latestDoc.status === 'pending' && 'En attente'}
                                {latestDoc.status === 'approved' && 'Approuvé'}
                                {latestDoc.status === 'rejected' && 'Refusé'}
                              </Badge>
                            )}
                          </div>

                          {docs.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Aucun document soumis</p>
                          ) : (
                            <div className="space-y-2">
                              {docs.map((doc) => {
                                const canAction = doc.status === 'pending' || doc.status === 'rejected';
                                return (
                                  <div key={doc.id} className={`flex items-center justify-between p-2 rounded border ${
                                    doc.status === 'rejected' ? 'bg-red-50 border-red-200 dark:bg-red-950/20' :
                                    doc.status === 'approved' ? 'bg-green-50 border-green-200 dark:bg-green-950/20' :
                                    'bg-muted/50'
                                  }`}>
                                    <div className="flex items-center gap-3">
                                      {canAction && (
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
                                      {canAction && (
                                        <>
                                          <Button size="sm" onClick={() => handleSingleApprove(doc.id)} className="bg-green-600 hover:bg-green-700">
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                          <SingleRejectButton doc={doc} onReject={handleSingleReject} />
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="flex-1 overflow-auto mt-4">
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
                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{notif.message}</p>
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

            <DialogFooter className="flex gap-2 flex-wrap border-t pt-4">
              {allRequiredDocsApproved() && !selectedGarage?.is_verified && (
                <>
                  <Button variant="destructive" onClick={() => setShowRejectDialog(true)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Refuser la vérification
                  </Button>
                  <Button onClick={() => setShowVerifyDialog(true)}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Vérifier ce garage
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Viewer */}
        {viewerDoc && (
          <DocumentViewer
            isOpen={!!viewerDoc}
            onClose={() => setViewerDoc(null)}
            documentUrl={viewerDoc.url}
            documentName={viewerDoc.nom_fichier}
            documentType={viewerDoc.document_type}
          />
        )}

        {/* Confirm Verify Dialog */}
        <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Vérifier ce garage ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action marquera le garage "{selectedGarage?.raison_sociale}" comme vérifié.
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

        {/* Reject Account Dialog */}
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

        {/* Send Notification Dialog */}
        <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Envoyer une notification</DialogTitle>
              <DialogDescription>
                Envoyer un email personnalisé à {selectedGarage?.raison_sociale}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Objet</Label>
                <Input
                  id="subject"
                  placeholder="Objet de l'email..."
                  value={notificationSubject}
                  onChange={(e) => setNotificationSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
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
                disabled={!notificationSubject.trim() || !notificationMessage.trim() || sendingNotification}
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

        {/* Manage Required Documents Dialog */}
        <Dialog open={showManageDocsDialog} onOpenChange={setShowManageDocsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Documents requis pour la vérification</DialogTitle>
              <DialogDescription>
                Gérer les documents obligatoires et optionnels
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Card className="p-4">
                <h4 className="font-medium mb-3">Ajouter un document</h4>
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nom du document</Label>
                      <Input
                        placeholder="Ex: Attestation d'assurance"
                        value={newDocForm.nom_document}
                        onChange={(e) => setNewDocForm({ ...newDocForm, nom_document: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Code unique</Label>
                      <Input
                        placeholder="Ex: attestation_assurance"
                        value={newDocForm.code}
                        onChange={(e) => setNewDocForm({ ...newDocForm, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description (optionnel)</Label>
                    <Input
                      placeholder="Instructions pour le garage"
                      value={newDocForm.description}
                      onChange={(e) => setNewDocForm({ ...newDocForm, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={newDocForm.obligatoire}
                      onCheckedChange={(checked) => setNewDocForm({ ...newDocForm, obligatoire: !!checked })}
                    />
                    <Label>Document obligatoire</Label>
                  </div>
                  <Button onClick={handleAddRequiredDoc} disabled={savingDoc}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </Card>

              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {requiredDocs.map((doc) => (
                    <Card key={doc.id} className={`p-3 ${!doc.actif ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{doc.nom_document}</h4>
                          <p className="text-sm text-muted-foreground">{doc.code}</p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground">{doc.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={doc.obligatoire ? "default" : "outline"}
                            onClick={() => handleToggleDocRequired(doc)}
                          >
                            {doc.obligatoire ? "Obligatoire" : "Optionnel"}
                          </Button>
                          <Button
                            size="sm"
                            variant={doc.actif ? "outline" : "destructive"}
                            onClick={() => handleToggleDocActive(doc)}
                          >
                            {doc.actif ? "Actif" : "Inactif"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Bulk Reject Dialog Component
function BulkRejectDialog({ 
  onReject, 
  rejectionReason,
  setRejectionReason,
  count 
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
  onReject 
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

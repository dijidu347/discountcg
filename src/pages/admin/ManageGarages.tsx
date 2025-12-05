import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, XCircle, Eye, ShieldCheck, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
  };

  const loadGarages = async () => {
    const { data, error } = await supabase
      .from('garages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading garages:', error);
    } else {
      const allGarages = data || [];
      
      // À VÉRIFIER: Garages qui ont soumis des documents mais pas encore vérifiés
      const aVerifier = allGarages.filter(g => 
        g.verification_requested_at && !g.is_verified
      );
      
      // VÉRIFIÉS: Garages déjà vérifiés
      const verifies = allGarages.filter(g => g.is_verified);
      
      // EN ATTENTE: Garages qui n'ont pas encore soumis de documents
      const enAttente = allGarages.filter(g => 
        !g.verification_requested_at && !g.is_verified
      );
      
      setGarages(allGarages);
      setGaragesAVerifier(aVerifier);
      setGaragesVerifies(verifies);
      setGaragesEnAttente(enAttente);
    }
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

  const handleViewDocs = async (garage: any) => {
    setSelectedGarage(garage);
    await loadVerificationDocs(garage.id);
    setShowDocsDialog(true);
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

      toast({
        title: "Documents refusés",
        description: `${selectedDocs.length} document(s) refusé(s)`,
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

  const handleVerifyGarage = async () => {
    if (!selectedGarage) return;

    setProcessingGarage(true);
    try {
      const { error: updateError } = await supabase
        .from('garages')
        .update({ is_verified: true })
        .eq('id', selectedGarage.id);

      if (updateError) throw updateError;

      // Mise à jour optimiste de l'état local pour feedback immédiat
      const updatedGarage = { ...selectedGarage, is_verified: true };
      setGaragesAVerifier(prev => prev.filter(g => g.id !== selectedGarage.id));
      setGaragesVerifies(prev => [updatedGarage, ...prev]);

      // Envoyer email de vérification
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
      // En cas d'erreur, recharger les données depuis la DB
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

      // Envoyer email de refus
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

  const allDocsApproved = verificationDocs.length >= 3 && 
    verificationDocs.every(doc => doc.status === 'approved');

  const handleSendNotification = async () => {
    if (!selectedGarage || !notificationSubject.trim() || !notificationMessage.trim()) return;

    setSendingNotification(true);
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'custom_notification',
          to: selectedGarage.email,
          data: {
            customerName: selectedGarage.raison_sociale,
            subject: notificationSubject,
            message: notificationMessage
          }
        }
      });

      toast({
        title: "Notification envoyée",
        description: `Email envoyé à ${selectedGarage.email}`,
      });

      setShowNotificationDialog(false);
      setNotificationSubject("");
      setNotificationMessage("");
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

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>

        {/* Section À VÉRIFIER - Garages avec documents soumis */}
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
                  <TableRow key={garage.id} className="bg-orange-50/50 dark:bg-orange-950/10">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {garage.raison_sociale}
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          <Eye className="h-3 w-3 mr-1" />
                          À vérifier
                        </Badge>
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

        {/* Section EN ATTENTE */}
        <Card className="p-6 opacity-70">
          <div className="flex items-center gap-3 mb-6">
            <XCircle className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-xl font-bold text-muted-foreground">En attente de documents</h1>
            <Badge variant="outline">{garagesEnAttente.length}</Badge>
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

        {/* Dialog Documents */}
        <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Documents de vérification - {selectedGarage?.raison_sociale}
                {selectedGarage?.is_verified && (
                  <Badge className="bg-green-500">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Vérifié
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Vérifiez et validez les documents du garage
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedDocs.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Badge variant="secondary">{selectedDocs.length} sélectionné(s)</Badge>
                  <Button size="sm" onClick={handleBulkApprove}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approuver la sélection
                  </Button>
                  <BulkRejectDialog
                    onReject={handleBulkReject}
                    rejectionReason={rejectionReason}
                    setRejectionReason={setRejectionReason}
                    count={selectedDocs.length}
                  />
                </div>
              )}

              {verificationDocs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun document soumis pour vérification
                </p>
              ) : (
                verificationDocs.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedDocs.includes(doc.id)}
                          onCheckedChange={() => toggleDocSelection(doc.id)}
                          disabled={doc.status !== 'pending'}
                        />
                        <div className="flex-1">
                          <h3 className="font-medium mb-2 flex items-center gap-2">
                            {doc.document_type === 'kbis' && 'KBIS'}
                            {doc.document_type === 'carte_identite' && "Carte d'identité"}
                            {doc.document_type === 'mandat' && 'Mandat pré-rempli'}
                            <Badge variant={
                              doc.status === 'approved' ? 'default' :
                              doc.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {doc.status === 'pending' && 'En attente'}
                              {doc.status === 'approved' && 'Approuvé'}
                              {doc.status === 'rejected' && 'Refusé'}
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">{doc.nom_fichier}</p>
                          {doc.rejection_reason && (
                            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                              Raison du refus: {doc.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewerDoc(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <DialogFooter className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setShowNotificationDialog(true)}>
                <Send className="mr-2 h-4 w-4" />
                Envoyer une notification
              </Button>
              {allDocsApproved && !selectedGarage?.is_verified && (
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
          Refuser la sélection
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refuser {count} document(s)</AlertDialogTitle>
          <AlertDialogDescription>
            Indiquez la raison du refus pour tous les documents sélectionnés.
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

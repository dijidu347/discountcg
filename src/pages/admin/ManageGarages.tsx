import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, XCircle, Eye, ShieldCheck } from "lucide-react";
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
      setGarages(data || []);
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

      // Envoyer email de vérification
      await supabase.functions.invoke('send-order-emails', {
        body: {
          type: 'account_verified',
          email: selectedGarage.email,
          customerName: selectedGarage.raison_sociale
        }
      });

      toast({
        title: "Garage vérifié",
        description: "Le garage a été vérifié et notifié par email",
      });

      setShowVerifyDialog(false);
      setShowDocsDialog(false);
      await loadGarages();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le garage",
        variant: "destructive"
      });
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
      await supabase.functions.invoke('send-order-emails', {
        body: {
          type: 'account_rejected',
          email: selectedGarage.email,
          customerName: selectedGarage.raison_sociale,
          rejectionReason: rejectAccountReason
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

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Gestion des garages</h1>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raison sociale</TableHead>
                <TableHead>SIRET</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Statut vérification</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {garages.map((garage) => (
                <TableRow key={garage.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {garage.raison_sociale}
                      {garage.is_verified && (
                        <Badge className="bg-green-500">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Vérifié
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{garage.siret}</TableCell>
                  <TableCell>{garage.email}</TableCell>
                  <TableCell>{garage.telephone}</TableCell>
                  <TableCell>
                    {garage.is_verified ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Vérifié
                      </Badge>
                    ) : garage.verification_requested_at ? (
                      <Badge variant="secondary">
                        <Eye className="h-3 w-3 mr-1" />
                        En attente
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <XCircle className="h-3 w-3 mr-1" />
                        Non demandé
                      </Badge>
                    )}
                  </TableCell>
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

            <DialogFooter className="flex gap-2">
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

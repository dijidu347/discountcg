import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle, XCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
      .select('*, subscriptions(plan_type, status)')
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

  const handleApproveDoc = async (docId: string) => {
    const { error } = await supabase
      .from('verification_documents')
      .update({ 
        status: 'approved',
        validated_by: user?.id,
        validated_at: new Date().toISOString()
      })
      .eq('id', docId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'approuver le document",
        variant: "destructive"
      });
    } else {
      // Check if all docs are approved
      await loadVerificationDocs(selectedGarage.id);
      toast({
        title: "Document approuvé",
        description: "Le document a été validé"
      });
    }
  };

  const handleRejectDoc = async (docId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez indiquer une raison de refus",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('verification_documents')
      .update({ 
        status: 'rejected',
        rejection_reason: rejectionReason,
        validated_by: user?.id,
        validated_at: new Date().toISOString()
      })
      .eq('id', docId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de refuser le document",
        variant: "destructive"
      });
    } else {
      await loadVerificationDocs(selectedGarage.id);
      setRejectionReason("");
      toast({
        title: "Document refusé",
        description: "Le document a été refusé"
      });
    }
  };

  const handleVerifyGarage = async (garageId: string) => {
    const { error } = await supabase
      .from('garages')
      .update({ is_verified: true })
      .eq('id', garageId);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le garage",
        variant: "destructive"
      });
    } else {
      loadGarages();
      setShowDocsDialog(false);
      toast({
        title: "Garage vérifié",
        description: "Le garage a été vérifié avec succès"
      });
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

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-6">Gestion des garages</h1>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raison sociale</TableHead>
                <TableHead>SIRET</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Vérifié</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {garages.map((garage) => (
                <TableRow key={garage.id}>
                  <TableCell className="font-medium">{garage.raison_sociale}</TableCell>
                  <TableCell>{garage.siret}</TableCell>
                  <TableCell>{garage.email}</TableCell>
                  <TableCell>{garage.telephone}</TableCell>
                  <TableCell>
                    {garage.is_verified ? (
                      <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Vérifié</Badge>
                    ) : (
                      <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Non vérifié</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {garage.subscriptions?.[0] ? (
                      <Badge>{garage.subscriptions[0].plan_type}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Aucun</span>
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

        <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documents de vérification - {selectedGarage?.raison_sociale}</DialogTitle>
              <DialogDescription>
                Vérifiez et validez les documents du garage
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {verificationDocs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Aucun document soumis pour vérification
                </p>
              ) : (
                verificationDocs.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium mb-2">
                          {doc.document_type === 'kbis' && 'KBIS'}
                          {doc.document_type === 'carte_identite' && "Carte d'identité"}
                          {doc.document_type === 'mandat' && 'Mandat pré-rempli'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">{doc.nom_fichier}</p>
                        <Badge>
                          {doc.status === 'pending' && 'En attente'}
                          {doc.status === 'approved' && 'Approuvé'}
                          {doc.status === 'rejected' && 'Refusé'}
                        </Badge>
                        {doc.rejection_reason && (
                          <p className="text-sm text-red-600 mt-2">
                            Raison du refus: {doc.rejection_reason}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            Voir
                          </a>
                        </Button>
                        {doc.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApproveDoc(doc.id)}
                            >
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectDoc(doc.id)}
                            >
                              Refuser
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {doc.status === 'pending' && (
                      <div className="mt-4">
                        <Textarea
                          placeholder="Raison du refus (optionnel)"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>

            <DialogFooter>
              {verificationDocs.every(doc => doc.status === 'approved') && 
               verificationDocs.length === 3 &&
               !selectedGarage?.is_verified && (
                <Button onClick={() => handleVerifyGarage(selectedGarage.id)}>
                  Vérifier ce garage
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

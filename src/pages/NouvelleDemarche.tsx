import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileCheck, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function NouvelleDemarche() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [garage, setGarage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [demarcheId, setDemarcheId] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<Set<string>>(new Set());
  const [actionDetails, setActionDetails] = useState<any>(null);
  const [documentsRequis, setDocumentsRequis] = useState<any[]>([]);
  const [actionsRapides, setActionsRapides] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: searchParams.get('type') || "",
    immatriculation: "",
    commentaire: ""
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarage();
      loadActionsRapides();
    }
  }, [user]);

  useEffect(() => {
    if (formData.type) {
      loadActionDetails();
    }
  }, [formData.type]);

  useEffect(() => {
    // Auto-create draft when type is selected
    if (formData.type && !demarcheId && garage && actionDetails) {
      handleAutoCreateDraft();
    }
  }, [formData.type, garage, actionDetails]);

  useEffect(() => {
    // Load existing documents when demarcheId changes
    if (demarcheId) {
      loadExistingDocuments();
    }
  }, [demarcheId]);

  const loadExistingDocuments = async () => {
    if (!demarcheId) return;

    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('demarche_id', demarcheId);

    if (documents && documents.length > 0) {
      const docTypes = new Set(documents.map(doc => doc.type_document));
      setUploadedDocuments(docTypes);
    }
  };

  const loadGarage = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('garages')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setGarage(data);
    }
  };

  const loadActionsRapides = async () => {
    const { data } = await supabase
      .from('actions_rapides')
      .select('*')
      .eq('actif', true)
      .order('ordre');

    if (data) {
      setActionsRapides(data);
    }
  };

  const loadActionDetails = async () => {
    const { data: action } = await supabase
      .from('actions_rapides')
      .select('*')
      .eq('code', formData.type)
      .eq('actif', true)
      .single();

    if (action) {
      setActionDetails(action);

      const { data: docs } = await supabase
        .from('action_documents')
        .select('*')
        .eq('action_id', action.id)
        .order('ordre');

      setDocumentsRequis(docs || []);
    }
  };

  const handleAutoCreateDraft = async () => {
    if (!garage || demarcheId || !actionDetails) return;

    const { data, error } = await supabase
      .from('demarches')
      .insert({
        garage_id: garage.id,
        type: formData.type,
        immatriculation: formData.immatriculation || 'TEMP',
        commentaire: formData.commentaire,
        frais_dossier: actionDetails.prix,
        montant_ttc: actionDetails.prix,
        status: 'en_saisie',
        is_draft: true,
        paye: false
      } as any)
      .select()
      .single();

    if (!error && data) {
      setDemarcheId(data.id);
    }
  };

  const handleSaveDraft = async () => {
    if (!garage || !demarcheId) return;

    setLoading(true);

    const { error } = await supabase
      .from('demarches')
      .update({
        immatriculation: formData.immatriculation,
        commentaire: formData.commentaire
      })
      .eq('id', demarcheId);

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le brouillon",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Brouillon enregistré",
        description: "Vos modifications ont été sauvegardées"
      });
    }
  };

  const getFraisDossier = () => {
    return actionDetails?.prix || 0;
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.immatriculation.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner l'immatriculation",
        variant: "destructive"
      });
      return;
    }

    // Check if all documents are uploaded
    if (uploadedDocuments.size < documentsRequis.length) {
      toast({
        title: "Documents manquants",
        description: `Veuillez télécharger tous les documents requis (${uploadedDocuments.size}/${documentsRequis.length})`,
        variant: "destructive"
      });
      return;
    }

    // Update immatriculation before payment
    if (demarcheId) {
      await supabase
        .from('demarches')
        .update({
          immatriculation: formData.immatriculation,
          commentaire: formData.commentaire
        })
        .eq('id', demarcheId);
    }

    setShowPaymentDialog(true);
  };

  const handlePayment = async () => {
    if (!demarcheId) return;

    setLoading(true);

    // Simulate payment
    const { error: demarcheError } = await supabase
      .from('demarches')
      .update({
        is_draft: false,
        paye: true,
        documents_complets: true,
        status: 'en_attente'
      })
      .eq('id', demarcheId);

    if (demarcheError) {
      toast({
        title: "Erreur",
        description: "Impossible de valider le paiement",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // Create payment record
    const frais_dossier = getFraisDossier();
    
    const { error: paymentError } = await supabase
      .from('paiements')
      .insert({
        garage_id: garage.id,
        demarche_id: demarcheId,
        montant: frais_dossier,
        status: 'valide'
      });

    if (paymentError) {
      console.error(paymentError);
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        garage_id: garage.id,
        demarche_id: demarcheId,
        type: 'payment_confirmed',
        message: `Votre paiement de ${frais_dossier}€ a été validé. Votre démarche est en cours de traitement.`
      });

    setLoading(false);
    setShowPaymentDialog(false);

    toast({
      title: "Paiement validé",
      description: "Votre démarche a été soumise avec succès"
    });

    navigate("/mes-demarches");
  };

  const handleDocumentUploadComplete = (documentType: string) => {
    setUploadedDocuments(prev => new Set(prev).add(documentType));
    // Reload documents to ensure count is accurate
    loadExistingDocuments();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const allDocsUploaded = uploadedDocuments.size >= documentsRequis.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Nouvelle démarche</CardTitle>
            <CardDescription>
              Créez une nouvelle démarche administrative pour un véhicule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPayment} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="type">Type de démarche *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le type" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionsRapides.map((action) => (
                      <SelectItem key={action.id} value={action.code}>
                        {action.titre} - {action.prix}€
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="immatriculation">Immatriculation *</Label>
                <Input
                  id="immatriculation"
                  placeholder="AA-123-BB"
                  value={formData.immatriculation}
                  onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
                <Textarea
                  id="commentaire"
                  placeholder="Informations complémentaires..."
                  value={formData.commentaire}
                  onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
                  rows={4}
                />
              </div>

              {formData.type && demarcheId && documentsRequis.length > 0 && (
                <div className="bg-muted/50 p-6 rounded-lg space-y-4 border-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Documents requis ({uploadedDocuments.size}/{documentsRequis.length})</h3>
                    {allDocsUploaded && (
                      <FileCheck className="h-5 w-5 text-success" />
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {documentsRequis.map((doc, idx) => (
                      <DocumentUpload
                        key={doc.id}
                        demarcheId={demarcheId}
                        documentType={`doc_${idx + 1}`}
                        label={doc.nom_document}
                        onUploadComplete={() => handleDocumentUploadComplete(`doc_${idx + 1}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  type="button"
                  variant="outline" 
                  size="lg" 
                  onClick={handleSaveDraft}
                  disabled={loading || !demarcheId}
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer le brouillon
                </Button>
                <Button 
                  type="submit"
                  size="lg" 
                  disabled={loading || !allDocsUploaded || !formData.immatriculation.trim()}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  Payer {getFraisDossier()}€
                </Button>
              </div>
            </form>

            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer le paiement</DialogTitle>
                  <DialogDescription>
                    Montant à payer : {getFraisDossier()}€
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">
                    Ceci est une simulation de paiement. En production, l'intégration Stripe sera mise en place.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handlePayment} disabled={loading}>
                    {loading ? "Traitement..." : "Confirmer le paiement"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
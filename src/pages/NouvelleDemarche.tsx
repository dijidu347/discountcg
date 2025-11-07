import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function NouvelleDemarche() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [garage, setGarage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [demarcheId, setDemarcheId] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    immatriculation: "",
    commentaire: ""
  });

  const documentsRequis: Record<string, string[]> = {
    DA: [
      "Certificat de cession (cerfa 15776*01)",
      "Certificat déclaration d'achat (cerfa 13751*02)",
      "Carte grise barrée tamponnée recto/verso",
      "Dernière DA enregistrée (si achat à un pro)",
      "Accusé d'enregistrement déclaration de cession"
    ],
    DC: [
      "Certificat de cession (cerfa 15776*01)",
      "Certificat déclaration d'achat (si achat à un pro)",
      "Carte grise barrée tamponnée recto/verso",
      "Carte d'identité du nouveau propriétaire",
      "Dernière DA enregistrée (si achat à un pro)"
    ],
    CG: [
      "Carte d'identité",
      "Permis de conduire",
      "Carte grise barrée et tamponnée recto/verso",
      "Certificat de cession (cerfa 15776*01)",
      "Contrôle technique -6 mois",
      "Justificatif de domicile -3 mois",
      "Attestation d'assurance",
      "Mandat (cerfa 13757*03)",
      "Demande de certificat d'immatriculation (cerfa 13750*05)",
      "Dernière DA (si ancien propriétaire est un pro)"
    ]
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadGarage();
    }
  }, [user]);

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

  const handleSaveDraft = async () => {
    if (!garage) return;

    setLoading(true);

    const frais_dossier = getFraisDossier(formData.type);

    const { data, error } = await supabase
      .from('demarches')
      .insert({
        garage_id: garage.id,
        type: formData.type,
        immatriculation: formData.immatriculation,
        commentaire: formData.commentaire,
        frais_dossier: frais_dossier,
        montant_ttc: frais_dossier,
        status: 'en_saisie',
        is_draft: true,
        paye: false
      } as any)
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le brouillon",
        variant: "destructive"
      });
    } else {
      setDemarcheId(data.id);
      toast({
        title: "Brouillon enregistré",
        description: "Vous pouvez maintenant ajouter vos documents"
      });
    }
  };

  const getFraisDossier = (type: string) => {
    switch (type) {
      case 'DA': return 10;
      case 'DC': return 10;
      case 'CG': return 30;
      case 'CG_DA': return 35;
      case 'DA_DC': return 15;
      case 'CG_IMPORT': return 50;
      default: return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!demarcheId) {
      await handleSaveDraft();
      return;
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
    const frais_dossier = getFraisDossier(formData.type);
    
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Nouvelle démarche</CardTitle>
            <CardDescription>
              Créez une nouvelle démarche administrative pour un véhicule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    <SelectItem value="DA">Déclaration d'achat (10€)</SelectItem>
                    <SelectItem value="DC">Déclaration de cession (10€)</SelectItem>
                    <SelectItem value="CG">Carte grise (30€ + coût CG)</SelectItem>
                    <SelectItem value="CG_DA">Carte grise + DA (35€ + coût CG)</SelectItem>
                    <SelectItem value="DA_DC">DA + DC (15€)</SelectItem>
                    <SelectItem value="CG_IMPORT">Import véhicule étranger (50€ + coût CG)</SelectItem>
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

              {formData.type && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Documents requis pour {formData.type}</h3>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      {documentsRequis[formData.type]?.map((doc, idx) => (
                        <li key={idx}>{doc}</li>
                      ))}
                    </ul>
                  </div>

                  {demarcheId && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold">Télécharger les documents</h3>
                      {documentsRequis[formData.type]?.map((doc, idx) => (
                        <DocumentUpload
                          key={idx}
                          demarcheId={demarcheId}
                          documentType={`doc_${idx + 1}`}
                          label={doc}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                {!demarcheId ? (
                  <>
                    <Button type="submit" size="lg" disabled={loading} className="flex-1">
                      {loading ? "Enregistrement..." : "Enregistrer le brouillon"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => navigate("/dashboard")}
                    >
                      Annuler
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="submit" size="lg" disabled={loading} className="flex-1">
                      Procéder au paiement
                    </Button>
                  </>
                )}
              </div>
            </form>

            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer le paiement</DialogTitle>
                  <DialogDescription>
                    Montant à payer : {getFraisDossier(formData.type)}€
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

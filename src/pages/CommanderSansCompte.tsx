import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileCheck, CreditCard, Loader2, Shield, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const CommanderSansCompte = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File>>({});
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
    sms_notifications: false,
    email_notifications: true,
  });

  useEffect(() => {
    loadOrder();
    loadRequiredDocuments();
  }, [orderId]);

  const loadOrder = async () => {
    if (!orderId) return;

    const { data, error } = await supabase
      .from("guest_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) {
      toast({
        title: "Erreur",
        description: "Commande introuvable",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setOrder(data);
    
    // Pre-fill form if data exists
    if (data.nom) {
      setFormData({
        nom: data.nom || "",
        prenom: data.prenom || "",
        email: data.email || "",
        telephone: data.telephone || "",
        adresse: data.adresse || "",
        code_postal: data.code_postal || "",
        ville: data.ville || "",
        sms_notifications: data.sms_notifications || false,
        email_notifications: data.email_notifications || true,
      });
    }
  };

  const loadRequiredDocuments = async () => {
    // Load documents for guest orders from new table
    const { data: docsData } = await supabase
      .from("guest_order_required_documents")
      .select("*")
      .eq("actif", true)
      .order("ordre");

    setDocuments(docsData || []);
  };

  const handleFileChange = (docIndex: number, file: File | null) => {
    if (file) {
      setUploadedDocs({ ...uploadedDocs, [`doc_${docIndex}`]: file });
    } else {
      const newDocs = { ...uploadedDocs };
      delete newDocs[`doc_${docIndex}`];
      setUploadedDocs(newDocs);
    }
  };

  const handleSubmit = async () => {
    if (!order) return;

    // Validate form
    if (!formData.nom || !formData.prenom || !formData.email || !formData.telephone || 
        !formData.adresse || !formData.code_postal || !formData.ville) {
      toast({
        title: "Formulaire incomplet",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Validate documents
    if (Object.keys(uploadedDocs).length !== documents.length) {
      toast({
        title: "Documents manquants",
        description: "Veuillez télécharger tous les documents requis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Update order with customer info
      const { error: updateError } = await supabase
        .from("guest_orders")
        .update({
          ...formData,
          documents_complets: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Upload documents
      for (const [key, file] of Object.entries(uploadedDocs)) {
        const fileName = `${orderId}/${key}_${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("guest-order-documents")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("guest-order-documents")
          .getPublicUrl(fileName);

        // Save document reference
        await supabase.from("guest_order_documents").insert({
          order_id: orderId,
          type_document: key,
          nom_fichier: file.name,
          url: urlData.publicUrl,
          taille_octets: file.size,
          validation_status: 'pending',
        });
      }

      // Check if Stripe is configured
      const hasStripe = false; // TODO: Check if STRIPE_SECRET_KEY is configured
      
      if (!hasStripe) {
        // Auto-validate payment if no Stripe
        await supabase
          .from("guest_orders")
          .update({ 
            paye: true,
            paid_at: new Date().toISOString(),
            status: "paye"
          })
          .eq("id", orderId);

        // Send confirmation email
        if (formData.email_notifications) {
          await supabase.functions.invoke('send-guest-order-email', {
            body: {
              type: 'payment_confirmed',
              orderData: {
                tracking_number: order.tracking_number,
                email: formData.email,
                nom: formData.nom,
                prenom: formData.prenom,
                immatriculation: order.immatriculation,
                montant_ttc: order.montant_ttc + (formData.sms_notifications ? 5 : 0)
              }
            }
          });
        }

        toast({
          title: "Commande validée",
          description: "Votre commande a été enregistrée avec succès",
        });

        navigate(`/suivi/${order.tracking_number}`);
      } else {
        // Send confirmation email if notifications enabled
        if (formData.email_notifications) {
          await supabase.functions.invoke('send-guest-order-email', {
            body: {
              type: 'order_confirmation',
              orderData: {
                tracking_number: order.tracking_number,
                email: formData.email,
                nom: formData.nom,
                prenom: formData.prenom,
                immatriculation: order.immatriculation,
                montant_ttc: order.montant_ttc + (formData.sms_notifications ? 5 : 0)
              }
            }
          });
        }

        toast({
          title: "Documents envoyés",
          description: "Passons maintenant au paiement",
        });

        // Redirect to payment
        navigate(`/paiement/${orderId}`);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'envoi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Finaliser votre commande</h1>
            <p className="text-xl text-muted-foreground">
              Carte grise pour {order.immatriculation}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">
                Recevez votre carte grise en 24h maximum
              </span>
            </div>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="font-bold">Paiement sécurisé</p>
                <p className="text-sm text-muted-foreground">Cryptage SSL</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <FileCheck className="w-8 h-8 text-primary" />
              <div>
                <p className="font-bold">Service agréé</p>
                <p className="text-sm text-muted-foreground">Habilité par l'État</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
              <Clock className="w-8 h-8 text-primary" />
              <div>
                <p className="font-bold">Traitement rapide</p>
                <p className="text-sm text-muted-foreground">Moins de 24h</p>
              </div>
            </div>
          </div>

          {/* Customer Info Form */}
          <Card>
            <CardHeader>
              <CardTitle>Vos informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse *</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_postal">Code postal *</Label>
                  <Input
                    id="code_postal"
                    value={formData.code_postal}
                    onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Documents requis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map((doc, index) => (
                <div key={doc.id} className="space-y-2">
                  <Label htmlFor={`doc_${index}`}>
                    {doc.nom_document} *
                  </Label>
                  <Input
                    id={`doc_${index}`}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                    required
                  />
                  {uploadedDocs[`doc_${index}`] && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <FileCheck className="w-4 h-4" />
                      {uploadedDocs[`doc_${index}`].name}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notifications Options */}
          <Card>
            <CardHeader>
              <CardTitle>Options de suivi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email_notif"
                  checked={formData.email_notifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, email_notifications: checked as boolean })
                  }
                />
                <Label htmlFor="email_notif" className="cursor-pointer">
                  Recevoir les notifications par email (Gratuit)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sms_notif"
                  checked={formData.sms_notifications}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, sms_notifications: checked as boolean })
                  }
                />
                <Label htmlFor="sms_notif" className="cursor-pointer">
                  Recevoir les notifications par SMS (+5€)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Price Summary */}
          <Card className="border-2 border-primary">
            <CardHeader className="bg-primary/5">
              <CardTitle>Récapitulatif</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-2">
              <div className="flex justify-between text-lg">
                <span>Prix de la carte grise</span>
                <span className="font-bold">{order.montant_ht.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Frais de dossier</span>
                <span className="font-bold">{order.frais_dossier.toFixed(2)}€</span>
              </div>
              {formData.sms_notifications && (
                <div className="flex justify-between text-lg">
                  <span>Notifications SMS</span>
                  <span className="font-bold">5.00€</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between text-xl font-bold">
                <span>Total TTC</span>
                <span className="text-primary">
                  {(order.montant_ttc + (formData.sms_notifications ? 5 : 0)).toFixed(2)}€
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg h-14"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Continuer vers le paiement
              </>
            )}
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CommanderSansCompte;

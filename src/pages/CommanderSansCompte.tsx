import { Helmet } from "react-helmet-async";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileCheck, CreditCard, Loader2, Shield, Clock, User, Mail, MapPin, ChevronLeft, ChevronRight, CheckCircle, Receipt } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { GuestPaymentDetailsSummary, calculateGuestOrderTTC } from "@/components/payment/GuestPaymentDetailsSummary";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Step indicator
const StepIndicator = ({ currentStep, steps }: { currentStep: number; steps: string[] }) => (
  <div className="w-full mb-8">
    <div className="flex items-center justify-between relative">
      {/* Background line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
      <div
        className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
        style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
      />
      {steps.map((label, i) => (
        <div key={i} className="flex flex-col items-center relative z-10">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
              i < currentStep
                ? "bg-primary text-primary-foreground"
                : i === currentStep
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
          </div>
          <span className={cn(
            "text-xs mt-2 font-medium hidden sm:block",
            i <= currentStep ? "text-primary" : "text-muted-foreground"
          )}>
            {label}
          </span>
        </div>
      ))}
    </div>
  </div>
);

// Inline checkout form for step 4
const InlineCheckoutForm = ({ order, formData, onSuccess }: { order: any; formData: any; onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = calculateGuestOrderTTC(
    order.montant_ht || 0,
    order.frais_dossier || 30,
    formData.sms_notifications
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        "create-payment-intent",
        {
          body: {
            amount: Math.round(totalAmount * 100),
            metadata: {
              order_id: order.id,
              tracking_number: order.tracking_number,
              type: "guest_order",
            },
          },
        }
      );

      if (paymentError) throw paymentError;

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        paymentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${formData.prenom} ${formData.nom}`,
              email: formData.email,
              phone: formData.telephone,
            },
          },
        }
      );

      if (error) throw new Error(error.message);

      if (paymentIntent?.status === "succeeded") {
        const finalTTC = calculateGuestOrderTTC(
          order.montant_ht || 0,
          order.frais_dossier || 30,
          formData.sms_notifications
        );

        await supabase
          .from("guest_orders")
          .update({
            paye: true,
            payment_intent_id: paymentIntent.id,
            paid_at: new Date().toISOString(),
            status: "paye",
            montant_ttc: finalTTC,
          })
          .eq("id", order.id);

        toast({
          title: "✅ Paiement accepté !",
          description: "Votre paiement a été validé avec succès.",
          variant: "success" as any,
        });

        onSuccess();
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "❌ Paiement refusé",
        description: error.message || "Votre paiement n'a pas pu être traité.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Informations de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-background">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "hsl(var(--foreground))",
                    "::placeholder": { color: "hsl(var(--muted-foreground))" },
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        size="lg"
        className="w-full text-lg h-14"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Traitement en cours...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Payer {totalAmount.toFixed(2)} €
          </>
        )}
      </Button>
    </form>
  );
};

const CommanderSansCompte = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
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

  const stepLabels = ["Informations", "Documents", "Récapitulatif", "Paiement"];

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (order?.demarche_type) {
      loadRequiredDocuments(order.demarche_type);
    }
  }, [order?.demarche_type]);

  useEffect(() => {
    initializeStripe();
  }, []);

  const initializeStripe = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-stripe-key');
      if (error) throw error;
      if (data?.publishableKey) {
        setStripePromise(loadStripe(data.publishableKey2 || data.publishableKey));
      }
    } catch (error) {
      console.error("Error loading Stripe:", error);
    }
  };

  const loadOrder = async () => {
    if (!orderId) return;
    const { data, error } = await supabase
      .from("guest_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (error) {
      toast({ title: "Erreur", description: "Commande introuvable", variant: "destructive" });
      navigate("/");
      return;
    }
    setOrder(data);
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
        email_notifications: data.email_notifications ?? true,
      });
    }
  };

  const loadRequiredDocuments = async (demarcheType: string) => {
    const { data: docsData } = await supabase
      .from("guest_order_required_documents")
      .select("*")
      .eq("actif", true)
      .eq("demarche_type_code", demarcheType)
      .order("ordre");
    setDocuments(docsData || []);
  };

  const handleFileChange = (documentName: string, file: File | null) => {
    if (file) {
      setUploadedDocs({ ...uploadedDocs, [documentName]: file });
    } else {
      const newDocs = { ...uploadedDocs };
      delete newDocs[documentName];
      setUploadedDocs(newDocs);
    }
  };

  const cleanFileName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[()\/\\]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9.]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  };

  const isStep1Valid = () => {
    return !!(formData.nom && formData.prenom && formData.email && formData.telephone && formData.adresse && formData.code_postal && formData.ville);
  };

  const isStep2Valid = () => {
    const requiredDocs = documents.filter(d => d.obligatoire);
    return requiredDocs.every(doc => uploadedDocs[doc.nom_document]);
  };

  const uploadedCount = Object.keys(uploadedDocs).length;
  const totalDocsCount = documents.length;

  const goNext = () => {
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const goPrev = () => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmitDocs = async () => {
    if (!order) return;
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

      // Delete old docs
      const { data: existingDocs } = await supabase
        .from("guest_order_documents")
        .select("id, url")
        .eq("order_id", orderId);

      if (existingDocs && existingDocs.length > 0) {
        for (const doc of existingDocs) {
          const path = doc.url.split('/').slice(-2).join('/');
          await supabase.storage.from("guest-order-documents").remove([path]);
          await supabase.from("guest_order_documents").delete().eq("id", doc.id);
        }
      }

      // Upload new docs
      for (const [key, file] of Object.entries(uploadedDocs)) {
        const cleanedKey = cleanFileName(key);
        const cleanedFileName = cleanFileName(file.name);
        const fileName = `${orderId}/${cleanedKey}_${Date.now()}_${cleanedFileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from("guest-order-documents")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("guest-order-documents")
          .getPublicUrl(fileName);

        await supabase.from("guest_order_documents").insert({
          order_id: orderId,
          type_document: key,
          nom_fichier: file.name,
          url: urlData.publicUrl,
          taille_octets: file.size,
          validation_status: 'pending',
        });
      }

      // Notify admin of new guest order
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'admin_new_guest_order',
            to: 'contact@discountcartegrise.fr',
            data: {
              client_name: `${formData.prenom} ${formData.nom}`,
              client_email: formData.email,
              client_phone: formData.telephone,
              tracking_number: order.tracking_number,
              immatriculation: order.immatriculation,
              demarche_type: order.demarche_type,
              order_id: order.id,
              documents_count: Object.keys(uploadedDocs).length,
            }
          }
        });
      } catch (e) { console.error('Admin notif failed:', e); }

      // Client email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'guest_order_submitted',
            to: formData.email,
            data: {
              prenom: formData.prenom,
              nom: formData.nom,
              tracking_number: order.tracking_number,
              immatriculation: order.immatriculation,
            }
          }
        });
      } catch (e) { console.error('Client submitted email failed:', e); }

      // Go to payment step
      goNext();
    } catch (error: any) {
      console.error("Error:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue", variant: "destructive" });
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

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            key="step1"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Identité */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  Identité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input id="prenom" value={formData.prenom} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-primary" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone *</Label>
                    <Input id="telephone" type="tel" value={formData.telephone} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adresse */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                  Adresse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse *</Label>
                  <Input id="adresse" value={formData.adresse} onChange={(e) => setFormData({ ...formData, adresse: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code_postal">Code postal *</Label>
                    <Input id="code_postal" value={formData.code_postal} onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville *</Label>
                    <Input id="ville" value={formData.ville} onChange={(e) => setFormData({ ...formData, ville: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Options de suivi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="email_notif" checked={formData.email_notifications} onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked as boolean })} />
                  <Label htmlFor="email_notif" className="cursor-pointer">Notifications par email (Gratuit)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="sms_notif" checked={formData.sms_notifications} onCheckedChange={(checked) => setFormData({ ...formData, sms_notifications: checked as boolean })} />
                  <Label htmlFor="sms_notif" className="cursor-pointer">Notifications par SMS (+5€)</Label>
                </div>
              </CardContent>
            </Card>

            <Button onClick={goNext} disabled={!isStep1Valid()} size="lg" className="w-full">
              Suivant <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            key="step2"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Documents requis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {uploadedCount}/{totalDocsCount} documents envoyés
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-medium">
                        {doc.nom_document} {doc.obligatoire && '*'}
                      </Label>
                      {uploadedDocs[doc.nom_document] ? (
                        <Badge className="bg-green-500 text-white">
                          <FileCheck className="w-3 h-3 mr-1" /> Uploadé
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Manquant</Badge>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,image/*"
                      onChange={(e) => handleFileChange(doc.nom_document, e.target.files?.[0] || null)}
                    />
                    {uploadedDocs[doc.nom_document] && (
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <FileCheck className="w-4 h-4" />
                        {uploadedDocs[doc.nom_document].name}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" onClick={goPrev} size="lg" className="flex-1">
                <ChevronLeft className="w-5 h-5 mr-2" /> Retour
              </Button>
              <Button onClick={goNext} disabled={!isStep2Valid()} size="lg" className="flex-1">
                Suivant <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step3"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Info summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Vos informations
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setDirection(-1); setCurrentStep(0); }}>
                    Modifier
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Nom :</span> {formData.prenom} {formData.nom}</p>
                <p><span className="font-semibold">Email :</span> {formData.email}</p>
                <p><span className="font-semibold">Tél :</span> {formData.telephone}</p>
                <p><span className="font-semibold">Adresse :</span> {formData.adresse}, {formData.code_postal} {formData.ville}</p>
              </CardContent>
            </Card>

            {/* Documents summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Documents ({uploadedCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(uploadedDocs).map(([name, file]) => (
                    <div key={name} className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-sm">{name}</span>
                      <Badge className="bg-green-500 text-white text-xs">
                        <FileCheck className="w-3 h-3 mr-1" /> OK
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Price summary */}
            <GuestPaymentDetailsSummary
              prixCarteGrise={order.montant_ht || 0}
              fraisDossier={order.frais_dossier || 30}
              smsNotifications={formData.sms_notifications}
              emailNotifications={formData.email_notifications}
            />

            <div className="flex gap-4">
              <Button variant="outline" onClick={goPrev} size="lg" className="flex-1">
                <ChevronLeft className="w-5 h-5 mr-2" /> Retour
              </Button>
              <Button onClick={handleSubmitDocs} disabled={isLoading} size="lg" className="flex-1">
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Envoi...</>
                ) : (
                  <>Continuer vers le paiement <ChevronRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step4"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Price recap */}
            <GuestPaymentDetailsSummary
              prixCarteGrise={order.montant_ht || 0}
              fraisDossier={order.frais_dossier || 30}
              smsNotifications={formData.sms_notifications}
              emailNotifications={formData.email_notifications}
            />

            {/* Stripe payment */}
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <InlineCheckoutForm
                  order={order}
                  formData={formData}
                  onSuccess={() => navigate(`/merci/${order.tracking_number}`)}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Commander sans compte | Discount Carte Grise</title>
      </Helmet>
      <Navbar />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold">Finaliser votre commande</h1>
            <p className="text-lg text-muted-foreground">
              Carte grise pour <span className="font-mono font-bold text-primary">{order.immatriculation}</span>
            </p>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 p-3 bg-card rounded-xl border">
              <Shield className="w-7 h-7 text-primary flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Paiement sécurisé</p>
                <p className="text-xs text-muted-foreground">Cryptage SSL</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card rounded-xl border">
              <FileCheck className="w-7 h-7 text-primary flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Service agréé</p>
                <p className="text-xs text-muted-foreground">Habilité par l'État</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-card rounded-xl border">
              <Clock className="w-7 h-7 text-primary flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Traitement rapide</p>
                <p className="text-xs text-muted-foreground">Moins de 24h</p>
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator currentStep={currentStep} steps={stepLabels} />

          {/* Step content */}
          <AnimatePresence mode="wait" custom={direction}>
            {renderStep()}
          </AnimatePresence>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CommanderSansCompte;

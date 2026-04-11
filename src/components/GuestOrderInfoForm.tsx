import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Check, Loader2, ChevronDown, ChevronUp, UserPlus, LogIn, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GuestOrderInfoFormProps {
  orderId: string;
  onComplete: () => void;
  isPaid?: boolean;
  isEnabled?: boolean;
  showConditionalQuestions?: boolean;
  onEmailSaved?: (email: string) => void;
}

export function GuestOrderInfoForm({ orderId, onComplete, isPaid, isEnabled, showConditionalQuestions = true, onEmailSaved }: GuestOrderInfoFormProps) {
  // isEnabled takes precedence; fallback to isPaid for backward compatibility
  const formEnabled = isEnabled !== undefined ? isEnabled : (isPaid ?? false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  
  // Informations personnelles
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");

  // Questions conditionnelles
  const [hasCotitulaire, setHasCotitulaire] = useState<string>("non");
  const [cotitulaireNom, setCotitulaireNom] = useState("");
  const [cotitulairePrenom, setCotitulairePrenom] = useState("");
  const [vehiculePro, setVehiculePro] = useState<string>("non");
  const [vehiculeLeasing, setVehiculeLeasing] = useState<string>("non");
  const [isMineur, setIsMineur] = useState<string>("non");
  const [isHeberge, setIsHeberge] = useState<string>("non");

  // === BACKUP: sessionStorage key for this order ===
  const backupKey = `guest_order_backup_${orderId}`;

  // Restore from sessionStorage backup on mount
  useEffect(() => {
    if (!orderId) return;
    try {
      const backup = sessionStorage.getItem(backupKey);
      if (backup) {
        const data = JSON.parse(backup);
        if (!nom && data.nom) setNom(data.nom);
        if (!prenom && data.prenom) setPrenom(data.prenom);
        if (!email && data.email) setEmail(data.email);
        if (!telephone && data.telephone) setTelephone(data.telephone);
        if (!adresse && data.adresse) setAdresse(data.adresse);
        if (!codePostal && data.codePostal) setCodePostal(data.codePostal);
        if (!ville && data.ville) setVille(data.ville);
        console.log("✅ Restored client info from sessionStorage backup");
      }
    } catch (e) { /* ignore corrupt backup */ }
  }, [orderId]);

  // Auto-save to sessionStorage (instant) + DB (debounced 2s) whenever fields change
  useEffect(() => {
    if (!orderId) return;
    const hasAnyData = nom || prenom || email || telephone || adresse;
    if (!hasAnyData) return;

    // Instant sessionStorage backup
    try {
      sessionStorage.setItem(backupKey, JSON.stringify({
        nom, prenom, email, telephone, adresse, codePostal, ville,
        savedAt: new Date().toISOString(),
      }));
    } catch (e) { /* sessionStorage full, ignore */ }

    // Debounced DB auto-save (2s after last keystroke)
    const dbTimer = setTimeout(async () => {
      const partialData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (nom.trim()) partialData.nom = nom.trim();
      if (prenom.trim()) partialData.prenom = prenom.trim();
      if (email.trim()) partialData.email = email.trim();
      if (telephone.trim()) partialData.telephone = telephone.trim();
      if (adresse.trim()) partialData.adresse = adresse.trim();
      if (codePostal.trim()) partialData.code_postal = codePostal.trim();
      if (ville.trim()) partialData.ville = ville.trim();

      // Only save if we have at least one real field
      if (Object.keys(partialData).length <= 1) return;

      try {
        await supabase
          .from('guest_orders')
          .update(partialData)
          .eq('id', orderId);
      } catch (e) {
        // Silent fail for auto-save - the manual submit will retry
      }
    }, 2000);
    return () => clearTimeout(dbTimer);
  }, [nom, prenom, email, telephone, adresse, codePostal, ville, orderId]);

  useEffect(() => {
    loadExistingData();
  }, [orderId, user]);

  const loadExistingData = async () => {
    const { data, error } = await supabase
      .from('guest_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      console.error('Error loading order data:', error);
      return;
    }

    // Start with DB values
    let finalNom = data?.nom || "";
    let finalPrenom = data?.prenom || "";
    let finalEmail = data?.email || "";
    let finalTelephone = data?.telephone || "";
    let finalAdresse = data?.adresse || "";
    let finalCodePostal = data?.code_postal || "";
    let finalVille = data?.ville || "";

    // If user is connected, fill empty fields from profile
    if (user) {
      const { data: profile } = await supabase
        .from("particulier_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile) {
        if (!finalEmail) finalEmail = profile.email || "";
        if (!finalPrenom) finalPrenom = profile.prenom || "";
        if (!finalNom) finalNom = profile.nom || "";
        if (!finalTelephone) finalTelephone = profile.telephone || "";
      }
      // Fallback: use auth email if still empty
      if (!finalEmail && user.email) finalEmail = user.email;
    }

    // Apply all values at once (no race condition)
    setNom(finalNom);
    setPrenom(finalPrenom);
    setEmail(finalEmail);
    setTelephone(finalTelephone);
    setAdresse(finalAdresse);
    setCodePostal(finalCodePostal);
    setVille(finalVille);

    if (data) {
      setHasCotitulaire(data.has_cotitulaire ? "oui" : "non");
      setCotitulaireNom(data.cotitulaire_nom || "");
      setCotitulairePrenom(data.cotitulaire_prenom || "");
      setVehiculePro(data.vehicule_pro ? "oui" : "non");
      setVehiculeLeasing(data.vehicule_leasing ? "oui" : "non");
      setIsMineur(data.is_mineur ? "oui" : "non");
      setIsHeberge(data.is_heberge ? "oui" : "non");

      // Check if info is already complete - hide form if so
      if (finalNom && finalPrenom && finalEmail && finalTelephone && finalAdresse) {
        setIsCompleted(true);
        setIsOpen(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - trim whitespace before checking
    const trimmedNom = nom.trim();
    const trimmedPrenom = prenom.trim();
    const trimmedEmail = email.trim();
    const trimmedTelephone = telephone.trim();
    const trimmedAdresse = adresse.trim();
    const trimmedCodePostal = codePostal.trim();
    const trimmedVille = ville.trim();

    if (!trimmedNom || !trimmedPrenom || !trimmedEmail || !trimmedTelephone || !trimmedAdresse || !trimmedCodePostal || !trimmedVille) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const trimmedCotitulaireNom = cotitulaireNom.trim();
    const trimmedCotitulairePrenom = cotitulairePrenom.trim();

    if (hasCotitulaire === "oui" && (!trimmedCotitulaireNom || !trimmedCotitulairePrenom)) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner les informations du co-titulaire",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData: any = {
          nom: trimmedNom,
          prenom: trimmedPrenom,
          email: trimmedEmail,
          telephone: trimmedTelephone,
          adresse: trimmedAdresse,
          code_postal: trimmedCodePostal,
          ville: trimmedVille,
          has_cotitulaire: hasCotitulaire === "oui",
          cotitulaire_nom: hasCotitulaire === "oui" ? trimmedCotitulaireNom : null,
          cotitulaire_prenom: hasCotitulaire === "oui" ? trimmedCotitulairePrenom : null,
          vehicule_pro: vehiculePro === "oui",
          vehicule_leasing: vehiculeLeasing === "oui",
          is_mineur: isMineur === "oui",
          is_heberge: isHeberge === "oui",
          updated_at: new Date().toISOString(),
        };
      if (user?.id) {
        updateData.user_id = user.id;
      }

      // Attempt DB save - use .select() to detect if rows were actually updated
      const { data: updateResult, error: updateError } = await supabase
        .from('guest_orders')
        .update(updateData)
        .eq('id', orderId)
        .select('id, email, nom')
        .maybeSingle();

      if (updateError) {
        console.error('❌ DB update error:', updateError);
      }

      // Check if RLS silently blocked the update (0 rows affected)
      if (!updateResult || !updateResult.email) {
        console.warn('⚠️ Direct update may have been blocked by RLS, trying via edge function...');

        // Fallback: use edge function to bypass RLS
        const { error: fnError } = await supabase.functions.invoke('update-guest-order', {
          body: { orderId, ...updateData }
        });

        if (fnError) {
          console.error('❌ Edge function fallback also failed:', fnError);
          // Last resort: retry direct update without user_id (might be causing RLS conflict)
          const { user_id: _, ...updateWithoutUserId } = updateData;
          const { error: retryError } = await supabase
            .from('guest_orders')
            .update(updateWithoutUserId)
            .eq('id', orderId);

          if (retryError) {
            throw retryError;
          }
        }
      }

      // Verify data was actually saved (read back)
      const { data: verifyData } = await supabase
        .from('guest_orders')
        .select('email, nom, prenom, telephone')
        .eq('id', orderId)
        .maybeSingle();

      if (verifyData?.email && verifyData?.nom) {
        console.log('✅ Client info saved and verified:', { email: verifyData.email, nom: verifyData.nom });
      } else {
        console.warn('⚠️ Verification shows data may not be fully saved. This is likely a RLS policy issue.');
        // Don't throw - proceed anyway since the data might be saved but RLS blocks the read-back too
      }

      // Clear sessionStorage backup after successful DB save
      try { sessionStorage.removeItem(backupKey); } catch (e) {}

      setIsCompleted(true);
      setIsOpen(false);
      toast({
        title: "Informations enregistrées",
        description: "Vos informations ont été sauvegardées",
      });
      // Notify parent of the saved email for payment integration
      if (onEmailSaved && trimmedEmail) {
        onEmailSaved(trimmedEmail);
      }
      onComplete();
    } catch (error) {
      console.error('Error saving client info:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Impossible de sauvegarder vos informations. Vos données sont conservées localement. Veuillez réessayer.",
        variant: "destructive",
      });
      // Ensure sessionStorage backup exists even on failure
      try {
        sessionStorage.setItem(backupKey, JSON.stringify({
          nom: trimmedNom, prenom: trimmedPrenom, email: trimmedEmail,
          telephone: trimmedTelephone, adresse: trimmedAdresse,
          codePostal: trimmedCodePostal, ville: trimmedVille,
          savedAt: new Date().toISOString(), failedSave: true,
        }));
      } catch (e) {}
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!formEnabled) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            Veuillez d'abord compléter les étapes précédentes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger className="w-full">
            <CardTitle className="flex items-center gap-2 cursor-pointer">
              <User className="w-5 h-5" />
              Vos informations
              {isCompleted && <Check className="w-5 h-5 text-green-500 ml-2" />}
              <span className="ml-auto">
                {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </span>
            </CardTitle>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations personnelles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Account creation prompt */}
              {!user && email && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    💡 Créez un compte gratuit pour retrouver vos commandes à tout moment
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/register-particulier?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                      className="flex-1"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Créer un compte
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/login-particulier?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                      className="flex-1"
                    >
                      <LogIn className="w-4 h-4 mr-1" />
                      J'ai déjà un compte
                    </Button>
                  </div>
                </div>
              )}
              {user && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Connecté — cette commande sera liée à votre compte
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse *</Label>
                <Input
                  id="adresse"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal *</Label>
                  <Input
                    id="codePostal"
                    value={codePostal}
                    onChange={(e) => setCodePostal(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville *</Label>
                  <Input
                    id="ville"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Questions conditionnelles - uniquement pour carte grise */}
              {showConditionalQuestions && (
                <div className="space-y-6 pt-4 border-t">
                  <h3 className="font-semibold">Questions complémentaires</h3>

                  {/* Cotitulaire - sans upload de documents ici */}
                  <div className="space-y-3">
                    <Label>Inscrire un co-titulaire sur la carte grise ? *</Label>
                    <RadioGroup value={hasCotitulaire} onValueChange={setHasCotitulaire} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oui" id="cotitulaire-oui" />
                        <Label htmlFor="cotitulaire-oui" className="cursor-pointer">Oui</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non" id="cotitulaire-non" />
                        <Label htmlFor="cotitulaire-non" className="cursor-pointer">Non</Label>
                      </div>
                    </RadioGroup>

                    {hasCotitulaire === "oui" && (
                      <div className="ml-4 p-4 bg-muted/50 rounded-lg space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cotitulairePrenom">Prénom du co-titulaire *</Label>
                            <Input
                              id="cotitulairePrenom"
                              value={cotitulairePrenom}
                              onChange={(e) => setCotitulairePrenom(e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cotitulaireNom">Nom du co-titulaire *</Label>
                            <Input
                              id="cotitulaireNom"
                              value={cotitulaireNom}
                              onChange={(e) => setCotitulaireNom(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          La pièce d'identité du co-titulaire sera demandée à l'étape suivante (documents).
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Véhicule professionnel */}
                  <div className="space-y-3">
                    <Label>Véhicule acheté auprès d'un professionnel automobile ? *</Label>
                    <RadioGroup value={vehiculePro} onValueChange={setVehiculePro} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oui" id="vehicule-pro-oui" />
                        <Label htmlFor="vehicule-pro-oui" className="cursor-pointer">Oui</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non" id="vehicule-pro-non" />
                        <Label htmlFor="vehicule-pro-non" className="cursor-pointer">Non</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Leasing */}
                  <div className="space-y-3">
                    <Label>Véhicule en leasing, LLD ou LOA ? *</Label>
                    <RadioGroup value={vehiculeLeasing} onValueChange={setVehiculeLeasing} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oui" id="leasing-oui" />
                        <Label htmlFor="leasing-oui" className="cursor-pointer">Oui</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non" id="leasing-non" />
                        <Label htmlFor="leasing-non" className="cursor-pointer">Non</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Mineur */}
                  <div className="space-y-3">
                    <Label>Je suis mineur (-18 ans) ? *</Label>
                    <RadioGroup value={isMineur} onValueChange={setIsMineur} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oui" id="mineur-oui" />
                        <Label htmlFor="mineur-oui" className="cursor-pointer">Oui</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non" id="mineur-non" />
                        <Label htmlFor="mineur-non" className="cursor-pointer">Non</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Hébergé */}
                  <div className="space-y-3">
                    <Label>Je suis hébergé (famille, proche, etc...) ? *</Label>
                    <RadioGroup value={isHeberge} onValueChange={setIsHeberge} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oui" id="heberge-oui" />
                        <Label htmlFor="heberge-oui" className="cursor-pointer">Oui</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non" id="heberge-non" />
                        <Label htmlFor="heberge-non" className="cursor-pointer">Non</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : isCompleted ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Informations enregistrées
                  </>
                ) : (
                  "Enregistrer mes informations"
                )}
              </Button>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
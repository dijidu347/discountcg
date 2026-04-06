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
  isPaid: boolean;
  showConditionalQuestions?: boolean;
}

export function GuestOrderInfoForm({ orderId, onComplete, isPaid, showConditionalQuestions = true }: GuestOrderInfoFormProps) {
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

  useEffect(() => {
    loadExistingData();
  }, [orderId]);

  const loadExistingData = async () => {
    const { data } = await supabase
      .from('guest_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (data) {
      setNom(data.nom || "");
      setPrenom(data.prenom || "");
      setEmail(data.email || "");
      setTelephone(data.telephone || "");
      setAdresse(data.adresse || "");
      setCodePostal(data.code_postal || "");
      setVille(data.ville || "");
      setHasCotitulaire(data.has_cotitulaire ? "oui" : "non");
      setCotitulaireNom(data.cotitulaire_nom || "");
      setCotitulairePrenom(data.cotitulaire_prenom || "");
      setVehiculePro(data.vehicule_pro ? "oui" : "non");
      setVehiculeLeasing(data.vehicule_leasing ? "oui" : "non");
      setIsMineur(data.is_mineur ? "oui" : "non");
      setIsHeberge(data.is_heberge ? "oui" : "non");
      
      // Check if info is already complete - hide form if so
      if (data.nom && data.prenom && data.email && data.telephone && data.adresse) {
        setIsCompleted(true);
        setIsOpen(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!nom || !prenom || !email || !telephone || !adresse || !codePostal || !ville) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (hasCotitulaire === "oui" && (!cotitulaireNom || !cotitulairePrenom)) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner les informations du co-titulaire",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('guest_orders')
        .update({
          nom,
          prenom,
          email,
          telephone,
          adresse,
          code_postal: codePostal,
          ville,
          has_cotitulaire: hasCotitulaire === "oui",
          cotitulaire_nom: hasCotitulaire === "oui" ? cotitulaireNom : null,
          cotitulaire_prenom: hasCotitulaire === "oui" ? cotitulairePrenom : null,
          vehicule_pro: vehiculePro === "oui",
          vehicule_leasing: vehiculeLeasing === "oui",
          is_mineur: isMineur === "oui",
          is_heberge: isHeberge === "oui",
        })
        .eq('id', orderId);

      if (error) throw error;

      setIsCompleted(true);
      setIsOpen(false);
      toast({
        title: "Informations enregistrées",
        description: "Vos informations ont été sauvegardées",
      });
      onComplete();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les informations",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPaid) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            Veuillez d'abord effectuer le paiement pour accéder à cette étape.
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
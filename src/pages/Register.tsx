import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { getSupabaseErrorMessage } from "@/lib/error-messages";

export default function Register() {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    raisonSociale: "",
    siret: "",
    email: "",
    telephone: "",
    adresse: "",
    codePostal: "",
    ville: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation SIRET : exactement 14 chiffres
    const siretClean = formData.siret.replace(/\s/g, '');
    if (!/^\d{14}$/.test(siretClean)) {
      toast({
        title: "Erreur",
        description: "Le numéro SIRET doit contenir exactement 14 chiffres",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const { error } = await signUp(formData.email, formData.password, {
      raison_sociale: formData.raisonSociale,
      siret: formData.siret,
      adresse: formData.adresse,
      code_postal: formData.codePostal,
      ville: formData.ville,
      email: formData.email,
      telephone: formData.telephone
    });

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: getSupabaseErrorMessage(error),
        variant: "destructive"
      });
    } else {
      toast({
        title: "Compte créé avec succès",
        description: "Redirection vers votre espace..."
      });
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Erreur de connexion Google",
        description: getSupabaseErrorMessage(error),
        variant: "destructive"
      });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/login")}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Button>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Créer un compte professionnel
            </CardTitle>
            <CardDescription className="text-center">
              Rejoignez DiscountCG et simplifiez vos démarches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full mb-6" 
              size="lg" 
              onClick={handleGoogleSignup}
              disabled={loading || googleLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {googleLoading ? "Connexion..." : "S'inscrire avec Google"}
            </Button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou avec email</span>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informations de l'entreprise</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raisonSociale">Raison sociale *</Label>
                    <Input
                      id="raisonSociale"
                      placeholder="Garage Martin SARL"
                      value={formData.raisonSociale}
                      onChange={(e) => handleChange("raisonSociale", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET * (14 chiffres)</Label>
                    <Input
                      id="siret"
                      placeholder="12345678900012"
                      value={formData.siret}
                      onChange={(e) => handleChange("siret", e.target.value.replace(/[^\d\s]/g, ''))}
                      maxLength={17}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse *</Label>
                  <Input
                    id="adresse"
                    placeholder="15 rue de la République"
                    value={formData.adresse}
                    onChange={(e) => handleChange("adresse", e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codePostal">Code postal *</Label>
                    <Input
                      id="codePostal"
                      placeholder="75001"
                      value={formData.codePostal}
                      onChange={(e) => handleChange("codePostal", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville *</Label>
                    <Input
                      id="ville"
                      placeholder="Paris"
                      value={formData.ville}
                      onChange={(e) => handleChange("ville", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Coordonnées de contact</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contact@garage-martin.fr"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone *</Label>
                    <Input
                      id="telephone"
                      type="tel"
                      placeholder="01 23 45 67 89"
                      value={formData.telephone}
                      onChange={(e) => handleChange("telephone", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Sécurité</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      required
                    />
                    <PasswordStrengthIndicator password={formData.password} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading || googleLoading}>
                {loading ? "Création du compte..." : "Créer mon compte professionnel"}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Vous avez déjà un compte ?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold text-primary"
                    onClick={() => navigate("/login")}
                  >
                    Se connecter
                  </Button>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

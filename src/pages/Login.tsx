import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseErrorMessage } from "@/lib/error-messages";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [garageCount, setGarageCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc("get_public_garage_count" as any).then(({ data }) => {
      if (data !== null) setGarageCount(data as number);
    });
  }, []);

  useEffect(() => {
    if (user) {
      // Check if user is a particulier
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .then(({ data }) => {
          const roles = (data || []).map((r) => r.role);
          if (roles.includes("particulier") && !roles.includes("admin") && !roles.includes("garage")) {
            navigate("/mon-espace");
          } else {
            navigate("/dashboard");
          }
        });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    if (!email.trim()) {
      toast({
        title: "Email requis",
        description: "Veuillez saisir votre adresse email.",
        variant: "destructive"
      });
      return;
    }
    
    if (!password) {
      toast({
        title: "Mot de passe requis",
        description: "Veuillez saisir votre mot de passe.",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erreur de connexion",
        description: getSupabaseErrorMessage(error),
        variant: "destructive"
      });
    } else {
      toast({
        title: "Connexion réussie",
        description: "Redirection vers votre espace..."
      });
      navigate("/dashboard");
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Button>

        {/* Compteur garages — bien mis en avant */}
        {garageCount !== null && garageCount > 0 && (
          <div className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-2xl px-6 py-4 flex items-center justify-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-baseline gap-1.5 justify-center sm:justify-start">
                <span className="text-3xl font-extrabold text-primary">{garageCount}</span>
                <span className="text-base font-semibold text-foreground">pros nous font confiance</span>
              </div>
              <p className="text-sm text-muted-foreground">Garages professionnels inscrits sur la plateforme</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bloc Connexion */}
          <Card className="shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Se connecter
              </CardTitle>
              <CardDescription className="text-center">
                Accédez à votre espace professionnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email professionnel</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="garage@exemple.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 font-normal text-xs"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Mot de passe oublié ?
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading || googleLoading}>
                  {loading ? "Connexion..." : "Se connecter"}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  size="lg" 
                  onClick={handleGoogleLogin}
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
                  {googleLoading ? "Connexion..." : "Google"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Bloc Inscription */}
          <Card className="shadow-xl border-2 border-primary/20 bg-primary/5">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-primary">
                S'inscrire
              </CardTitle>
              <CardDescription className="text-center">
                Créez votre compte professionnel gratuitement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    ✓ Première démarche offerte
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ✓ Gestion simplifiée de vos cartes grises
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ✓ Tarifs préférentiels professionnels
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate("/register")} 
                className="w-full" 
                size="lg"
                variant="hero"
              >
                Créer mon compte gratuitement
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-primary/5 px-2 text-muted-foreground">Ou</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                size="lg" 
                onClick={handleGoogleLogin}
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
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Plateforme réservée aux professionnels de l'automobile
        </p>
        <p className="text-center text-sm text-muted-foreground mt-2">
          Vous êtes un particulier ?{" "}
          <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/login-particulier")}>
            Accédez à votre espace ici
          </Button>
        </p>
      </div>
    </div>
  );
}

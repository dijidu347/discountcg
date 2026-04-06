import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseErrorMessage } from "@/lib/error-messages";

export default function LoginParticulier() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    if (user) {
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        navigate("/mon-espace");
      }
    }
  }, [user, navigate, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      toast({ title: "Erreur de connexion", description: getSupabaseErrorMessage(error), variant: "destructive" });
    } else {
      toast({ title: "Connexion réussie", description: "Bienvenue !" });
      if (redirectTo) {
        navigate(redirectTo);
      } else {
        navigate("/mon-espace");
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Button>

        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Mon espace particulier
            </CardTitle>
            <CardDescription className="text-center">
              Connectez-vous pour suivre vos démarches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@email.fr"
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

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Pas encore de compte ?</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => navigate(`/register-particulier${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Créer mon compte gratuit
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Vous êtes un professionnel ?{" "}
          <Button variant="link" className="p-0 h-auto text-primary" onClick={() => navigate("/login")}>
            Espace Pro
          </Button>
        </p>
      </div>
    </div>
  );
}

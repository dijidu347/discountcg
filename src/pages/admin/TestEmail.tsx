import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function TestEmail() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Non authentifié",
          description: "Vous devez être connecté pour accéder à cette page",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }
      setIsAuthenticated(true);
      setCheckingAuth(false);
    };
    checkAuth();
  }, [navigate, toast]);

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const sendTestEmail = async () => {
    if (!email) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un email",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Sending test email to:', email);
      
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'order_confirmation',
          to: email,
          data: {
            tracking_number: 'TEST-2025-001',
            nom: 'Test',
            prenom: 'Utilisateur',
            immatriculation: 'AB-123-CD',
            montant_ttc: 49.99
          }
        }
      });

      console.log('Email response:', { data, error });

      if (error) {
        console.error('Email error:', error);
        toast({
          title: "Erreur",
          description: `Erreur: ${error.message}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email envoyé",
          description: "Email de test envoyé avec succès"
        });
      }
    } catch (err: any) {
      console.error('Catch error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test d'envoi d'email</CardTitle>
          <CardDescription>
            Testez l'envoi d'emails avec les templates configurés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email destinataire</label>
            <Input
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button onClick={sendTestEmail} disabled={loading}>
            {loading ? "Envoi..." : "Envoyer un email de test"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

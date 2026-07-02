import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ContactForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formElement = e.target as HTMLFormElement;
      const formData = new FormData(formElement);
      const data = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        message: formData.get("message") as string
      };

      if (!data.name || !data.email || !data.message) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: data
      });

      if (error) throw error;

      toast({
        title: "Message envoyé !",
        description: "Nous vous répondrons dans les plus brefs délais."
      });
      formElement.reset();
    } catch (error) {
      console.error("Error sending contact email:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Contactez-nous</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Une question ? Besoin d'informations ? Notre équipe est à votre écoute
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Informations de contact */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold mb-4 text-foreground">Nos coordonnées</h3>
              <Card className="p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Email</p>
                    <a 
                      href="mailto:contact@discountcartegrise.fr" 
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      contact@discountcartegrise.fr
                    </a>
                  </div>
                </div>
              </Card>
            </div>

            <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
              <h4 className="font-bold mb-2 text-primary">Réponse rapide garantie</h4>
              <p className="text-sm text-muted-foreground">
                Nous nous engageons à vous répondre sous 24h ouvrées maximum.
              </p>
            </div>
          </div>

          {/* Formulaire de contact */}
          <Card className="p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-foreground">Envoyez-nous un message</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Nom complet <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="name" 
                  name="name" 
                  type="text" 
                  required 
                  placeholder="Votre nom" 
                  className="mt-1.5" 
                />
              </div>

              <div>
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="votre@email.com" 
                  className="mt-1.5" 
                />
              </div>

              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="06 12 34 56 78"
                  className="mt-1.5" 
                />
              </div>

              <div>
                <Label htmlFor="message">
                  Votre message <span className="text-destructive">*</span>
                </Label>
                <Textarea 
                  id="message" 
                  name="message" 
                  required 
                  placeholder="Décrivez votre demande..." 
                  className="mt-1.5 min-h-[120px]" 
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
const ContactForm = () => {
  const {
    toast
  } = useToast();
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

      // Validation simple
      if (!data.name || !data.email || !data.message) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Simulation d'envoi (à remplacer par votre logique d'envoi d'email)
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Message envoyé !",
        description: "Nous vous répondrons dans les plus brefs délais."
      });
      formElement.reset();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <section id="contact" className="py-20 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Contactez-nous</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une question ? Besoin d'informations ? Notre équipe est à votre écoute
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Informations de contact */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-6">Nos coordonnées</h3>
              <div className="space-y-6">
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Email</p>
                      <a href="mailto:contact@jimmy2x.fr" className="text-muted-foreground hover:text-primary transition-colors">
                        contact@jimmy2x.fr
                      </a>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Téléphone</p>
                      <a href="tel:+33123456789" className="text-muted-foreground hover:text-primary transition-colors">
                        01 23 45 67 89
                      </a>
                    </div>
                  </div>
                </Card>

                

                
              </div>
            </div>

            <div className="bg-accent/10 rounded-xl p-6 border border-accent/20">
              <h4 className="font-bold text-lg mb-2 text-accent">Réponse rapide garantie</h4>
              <p className="text-muted-foreground">
                Nous nous engageons à vous répondre sous 24h ouvrées maximum.
              </p>
            </div>
          </div>

          {/* Formulaire de contact */}
          <Card className="p-8 shadow-lg">
            <h3 className="text-2xl font-bold mb-6">Envoyez-nous un message</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-base">
                  Nom complet <span className="text-destructive">*</span>
                </Label>
                <Input id="name" name="name" type="text" required placeholder="Votre nom" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="email" className="text-base">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input id="email" name="email" type="email" required placeholder="votre@email.com" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="phone" className="text-base">
                  Téléphone
                </Label>
                <Input id="phone" name="phone" type="tel" placeholder="06 12 34 56 78" className="mt-2" />
              </div>

              <div>
                <Label htmlFor="message" className="text-base">
                  Votre message <span className="text-destructive">*</span>
                </Label>
                <Textarea id="message" name="message" required placeholder="Décrivez votre demande ou posez-nous vos questions..." className="mt-2 min-h-[150px]" />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </section>;
};
export default ContactForm;
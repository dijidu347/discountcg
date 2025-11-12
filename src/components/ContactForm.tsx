import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Mail, Phone, MapPin } from "lucide-react";
import { contactSchema } from "@/lib/validations";

const ContactForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formElement = e.target as HTMLFormElement;
      const formData = new FormData(formElement);
      
      // Validate form data with Zod
      const validatedData = contactSchema.parse({
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        service: formData.get('service'),
        plate: formData.get('plate') || undefined,
        message: formData.get('message') || undefined,
      });

      // Simulate form submission (in production, send to backend)
      setTimeout(() => {
        toast({
          title: "Message envoyé avec succès !",
          description: "Nous vous répondrons dans les plus brefs délais.",
        });
        setIsSubmitting(false);
        formElement.reset();
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Erreur de validation",
        description: error.errors?.[0]?.message || "Données invalides",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Contactez-nous</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Démarrez vos démarches en quelques clics
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold mb-6">Informations de contact</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Email</p>
                    <a href="mailto:contact@jimmy2x.fr" className="text-primary hover:underline">
                      contact@jimmy2x.fr
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Téléphone</p>
                    <a href="tel:+33123456789" className="text-primary hover:underline">
                      01 23 45 67 89
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Adresse</p>
                    <p className="text-muted-foreground">
                      123 Avenue de la République<br />
                      75011 Paris, France
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 border-2 border-primary/20">
              <h4 className="font-bold text-lg mb-2">⚡ Réponse rapide</h4>
              <p className="text-muted-foreground">
                Nous répondons à toutes les demandes sous 2 heures en moyenne pendant les heures ouvrées.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-xl shadow-xl p-8 border-2 border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input id="name" name="name" placeholder="Jean Dupont" required />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="06 12 34 56 78" required />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="jean.dupont@email.com" required />
              </div>

              <div>
                <Label htmlFor="service">Type de demande *</Label>
                <Select name="service" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="achat">Déclaration d'achat</SelectItem>
                    <SelectItem value="cession">Déclaration de cession</SelectItem>
                    <SelectItem value="carte-grise">Carte grise</SelectItem>
                    <SelectItem value="autre">Autre demande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="plate">Numéro d'immatriculation</Label>
                <Input id="plate" name="plate" placeholder="AB-123-CD" />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Décrivez votre demande..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="files" className="flex items-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Documents (optionnel)</span>
                </Label>
                <Input
                  id="files"
                  name="files"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format acceptés : PDF, JPG, PNG (Max 10 Mo par fichier)
                </p>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;

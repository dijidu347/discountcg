import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, MessageCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Support() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    // Simuler l'envoi (à remplacer par une vraie fonction d'envoi d'email)
    setTimeout(() => {
      toast({
        title: "Message envoyé",
        description: "Nous vous répondrons dans les plus brefs délais"
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
      setSending(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour au tableau de bord
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-primary" />
                Questions fréquentes
              </CardTitle>
              <CardDescription>
                Trouvez rapidement des réponses à vos questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>
                    Quel est le délai de réception de ma déclaration de cession ?
                  </AccordionTrigger>
                  <AccordionContent>
                    Une fois votre dossier complet et validé, vous recevrez votre déclaration de cession 
                    sous 24 à 48 heures ouvrées. Un email de confirmation vous sera envoyé dès que le document 
                    sera disponible.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger>
                    Quels documents dois-je fournir pour une carte grise ?
                  </AccordionTrigger>
                  <AccordionContent>
                    Pour une demande de carte grise, vous devez fournir :
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Certificat de cession ou facture</li>
                      <li>Ancienne carte grise barrée et signée</li>
                      <li>Justificatif d'identité</li>
                      <li>Justificatif de domicile de moins de 6 mois</li>
                      <li>Contrôle technique de moins de 6 mois si véhicule de plus de 4 ans</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger>
                    Combien coûte une déclaration d'achat ?
                  </AccordionTrigger>
                  <AccordionContent>
                    Une déclaration d'achat (DA) coûte 10€ TTC. Ce tarif inclut le traitement de votre dossier 
                    et la génération des documents officiels. Le paiement est sécurisé et se fait directement 
                    sur notre plateforme.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger>
                    Que faire si mon document est refusé ?
                  </AccordionTrigger>
                  <AccordionContent>
                    Si un document est refusé, vous recevrez une notification avec la raison du refus. 
                    Vous pourrez alors télécharger un nouveau document corrigé directement depuis votre espace 
                    dans la fiche de la démarche concernée. Notre équipe vérifiera à nouveau le document dans 
                    les plus brefs délais.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger>
                    Comment modifier les informations de mon entreprise ?
                  </AccordionTrigger>
                  <AccordionContent>
                    Vous pouvez modifier vos coordonnées (email, téléphone, adresse) directement depuis votre 
                    tableau de bord en cliquant sur "Gérer mon entreprise". Les informations légales comme 
                    le SIRET et la raison sociale ne peuvent pas être modifiées en ligne pour des raisons 
                    de sécurité.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-6">
                  <AccordionTrigger>
                    Puis-je suivre l'avancement de mes démarches ?
                  </AccordionTrigger>
                  <AccordionContent>
                    Oui, toutes vos démarches sont visibles dans la section "Mes démarches". Vous pouvez y 
                    consulter le statut en temps réel, les documents associés, et recevoir des notifications 
                    à chaque étape du traitement.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <MessageCircle className="h-6 w-6 text-primary" />
                Contactez-nous
              </CardTitle>
              <CardDescription>
                Vous avez une question ? Notre équipe vous répond rapidement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Jean Dupont"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="jean.dupont@exemple.fr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    placeholder="Sujet de votre demande"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    placeholder="Décrivez votre question ou problème..."
                    rows={6}
                  />
                </div>

                <Button type="submit" disabled={sending} className="w-full">
                  {sending ? "Envoi en cours..." : "Envoyer le message"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Temps de réponse moyen :</strong> 24h ouvrées
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Vous pouvez aussi nous contacter par email : <strong>contact@discountcartegrise.fr</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

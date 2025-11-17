import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Car, CreditCard, Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import { PriceSimulator } from "@/components/PriceSimulator";
import FAQ from "@/components/FAQ";

const IndexV2 = () => {
  const [showSimulator, setShowSimulator] = useState(false);

  const services = [
    {
      icon: "/ants/logo-immat.svg",
      title: "Carte Grise",
      description: "Demande de certificat d'immatriculation",
      types: ["Changement de titulaire", "Changement d'adresse", "Véhicule neuf", "Véhicule importé"]
    },
    {
      icon: "/ants/logo-immat.svg",
      title: "Duplicata",
      description: "Duplicata de carte grise",
      types: ["Perte", "Vol", "Détérioration"]
    },
    {
      icon: "/ants/logo-immat.svg",
      title: "Déclaration d'achat",
      description: "Déclaration d'achat d'un véhicule",
      types: ["Véhicule d'occasion", "Particulier à particulier"]
    },
    {
      icon: "/ants/logo-immat.svg",
      title: "Déclaration de cession",
      description: "Déclaration de cession d'un véhicule",
      types: ["Vente", "Don", "Destruction"]
    }
  ];

  const stats = [
    { number: "10,000+", label: "Démarches traitées" },
    { number: "98%", label: "Taux de satisfaction" },
    { number: "24h", label: "Délai moyen de traitement" },
    { number: "5,000+", label: "Garages partenaires" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header officiel */}
      <header className="bg-[hsl(220,90%,56%)] text-white py-4 border-b-4 border-[hsl(4,90%,58%)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/ants/logo-immat.svg" alt="Logo" className="h-12 w-12 bg-white p-2 rounded" />
              <div>
                <h1 className="text-xl font-bold">Plateforme de Démarches Automobiles</h1>
                <p className="text-sm opacity-90">Service professionnel pour garages et concessionnaires</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white text-[hsl(220,90%,56%)] hover:bg-gray-100" asChild>
                <a href="/login">Connexion</a>
              </Button>
              <Button className="bg-[hsl(4,90%,58%)] hover:bg-[hsl(4,90%,48%)]" asChild>
                <a href="/register">S'inscrire</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Bandeau d'information */}
      <div className="bg-[hsl(220,90%,96%)] border-b border-[hsl(220,90%,86%)] py-3">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-[hsl(220,90%,30%)]">
            <strong>Service professionnel</strong> • Traitement rapide des démarches • Support dédié
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-[hsl(220,90%,96%)] to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Simplifiez vos démarches administratives automobiles
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Plateforme professionnelle dédiée aux garages et concessionnaires pour gérer toutes leurs démarches de carte grise
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-[hsl(220,90%,56%)] hover:bg-[hsl(220,90%,46%)]"
                onClick={() => setShowSimulator(!showSimulator)}
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Simuler un prix
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                asChild
              >
                <a href="/register">
                  <FileText className="mr-2 h-5 w-5" />
                  Créer un compte
                </a>
              </Button>
            </div>
          </div>

          {showSimulator && (
            <div className="max-w-2xl mx-auto">
              <Card className="p-6 shadow-lg border-[hsl(220,90%,56%)]">
                <PriceSimulator />
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Statistiques */}
      <section className="py-12 bg-[hsl(220,90%,56%)] text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-sm opacity-90">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Nos services de démarches automobiles
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-[hsl(220,90%,56%)]">
                <div className="flex flex-col items-center text-center">
                  <img src={service.icon} alt={service.title} className="h-16 w-16 mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-foreground">{service.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                  <div className="w-full">
                    {service.types.map((type, i) => (
                      <div key={i} className="text-xs py-1 px-2 bg-[hsl(220,90%,96%)] rounded mb-1">
                        {type}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Processus */}
      <section className="py-16 bg-[hsl(220,90%,98%)]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Comment ça marche ?
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: "1", title: "Inscription", desc: "Créez votre compte professionnel" },
                { step: "2", title: "Démarche", desc: "Remplissez le formulaire en ligne" },
                { step: "3", title: "Documents", desc: "Uploadez les pièces justificatives" },
                { step: "4", title: "Traitement", desc: "Recevez votre document" }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[hsl(220,90%,56%)] text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-bold mb-2 text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pourquoi nous choisir */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Pourquoi nous choisir ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: FileText, title: "Service Professionnel", desc: "Plateforme dédiée aux professionnels de l'automobile" },
              { icon: Car, title: "Expertise Automobile", desc: "Spécialisés dans les démarches de carte grise" },
              { icon: CreditCard, title: "Tarifs Transparents", desc: "Prix clairs et compétitifs pour chaque démarche" }
            ].map((item, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <item.icon className="h-12 w-12 mx-auto mb-4 text-[hsl(220,90%,56%)]" />
                <h3 className="font-bold mb-2 text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section className="py-16 bg-[hsl(220,90%,98%)]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Tarifs des démarches
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { type: "Carte Grise", price: "À partir de 49€", features: ["Changement de titulaire", "Changement d'adresse", "Véhicule neuf"] },
              { type: "Duplicata", price: "À partir de 39€", features: ["Perte ou vol", "Détérioration", "Traitement rapide"] },
              { type: "Déclarations", price: "À partir de 29€", features: ["Déclaration d'achat", "Déclaration de cession", "Support inclus"] }
            ].map((plan, index) => (
              <Card key={index} className="p-6 border-2 hover:border-[hsl(220,90%,56%)] transition-colors">
                <h3 className="text-xl font-bold mb-4 text-foreground">{plan.type}</h3>
                <div className="text-3xl font-bold mb-6 text-[hsl(220,90%,56%)]">{plan.price}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-sm text-muted-foreground">✓ {feature}</li>
                  ))}
                </ul>
                <Button className="w-full bg-[hsl(220,90%,56%)] hover:bg-[hsl(220,90%,46%)]">
                  Commencer
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Questions fréquentes
          </h2>
          <div className="max-w-3xl mx-auto">
            <FAQ />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-[hsl(220,90%,56%)] text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Besoin d'aide ?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <Phone className="h-8 w-8 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Téléphone</h3>
                <p className="text-sm opacity-90">01 XX XX XX XX</p>
              </div>
              <div>
                <Mail className="h-8 w-8 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Email</h3>
                <p className="text-sm opacity-90">contact@plateforme.fr</p>
              </div>
              <div>
                <MapPin className="h-8 w-8 mx-auto mb-4" />
                <h3 className="font-bold mb-2">Adresse</h3>
                <p className="text-sm opacity-90">Paris, France</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(220,90%,20%)] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">Services</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>Carte grise</li>
                <li>Duplicata</li>
                <li>Déclarations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Informations</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>Qui sommes-nous</li>
                <li>Contact</li>
                <li>FAQ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>Mentions légales</li>
                <li>CGU</li>
                <li>Confidentialité</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-sm opacity-90">
                <li>Centre d'aide</li>
                <li>Documentation</li>
                <li>Support technique</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/20 pt-8 text-center text-sm opacity-90">
            <p>© 2024 Plateforme de Démarches Automobiles. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IndexV2;

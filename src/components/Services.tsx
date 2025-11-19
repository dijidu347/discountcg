import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, FileText, CreditCard } from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: ShoppingCart,
      title: "Déclaration d'achat",
      description: "Vous venez d'acheter un véhicule ? Nous gérons votre déclaration d'achat en ligne rapidement et en toute sécurité.",
      price: "10€",
      features: [
        "Traitement en 24h",
        "100% en ligne",
        "Support dédié"
      ]
    },
    {
      icon: FileText,
      title: "Déclaration de cession",
      description: "Vous vendez votre véhicule ? Effectuez votre déclaration de cession en quelques clics avec notre service professionnel.",
      price: "10€",
      features: [
        "Conforme ANTS",
        "Suivi par email",
        "Documents sécurisés"
      ]
    },
    {
      icon: CreditCard,
      title: "Carte grise",
      description: "Obtenez votre carte grise rapidement. Nous nous occupons de toutes les démarches administratives pour vous.",
      price: "30€ + prix CG",
      features: [
        "Tous types de véhicules",
        "Particuliers & professionnels",
        "Délai garanti"
      ]
    }
  ];

  const scrollToContact = () => {
    const element = document.getElementById("contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="services" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Nos services</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des solutions complètes pour toutes vos démarches d'immatriculation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary"
            >
              <CardHeader>
                <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-4">
                  <service.icon className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl mb-2">{service.title}</CardTitle>
                <CardDescription className="text-base">{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-3xl font-bold text-primary">{service.price}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={scrollToContact}>
                  En savoir plus
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;

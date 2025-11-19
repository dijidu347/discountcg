import { Shield, Zap, Euro, Award } from "lucide-react";

const WhyUs = () => {
  const reasons = [
    {
      icon: Zap,
      title: "Rapidité garantie",
      description: "Traitement de votre dossier en moins de 24h ouvrées"
    },
    {
      icon: Award,
      title: "Expertise professionnelle",
      description: "Équipe formée et agréée par les autorités"
    },
    {
      icon: Euro,
      title: "Tarifs transparents",
      description: "Pas de frais cachés, prix fixes et compétitifs"
    },
    {
      icon: Shield,
      title: "100% sécurisé",
      description: "Vos données et documents protégés par cryptage SSL"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Pourquoi nous choisir ?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            La solution idéale pour vos démarches administratives
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                <reason.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">{reason.title}</h3>
              <p className="text-muted-foreground">{reason.description}</p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-6">Des milliers de clients satisfaits</p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="flex items-center space-x-2">
              <Award className="w-6 h-6 text-accent" />
              <span className="font-semibold">Service agréé</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-accent" />
              <span className="font-semibold">Paiement sécurisé</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-6 h-6 text-accent" />
              <span className="font-semibold">Délai 24h max</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;

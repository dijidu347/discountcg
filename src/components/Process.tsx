import { Upload, Clock, Mail, CheckCircle } from "lucide-react";

const Process = () => {
  const steps = [
    {
      icon: Upload,
      title: "1. Envoyez vos documents",
      description: "Téléchargez facilement vos documents via notre formulaire sécurisé"
    },
    {
      icon: Clock,
      title: "2. Traitement express",
      description: "Nos experts traitent votre dossier en moins de 24h ouvrées"
    },
    {
      icon: Mail,
      title: "3. Suivi en temps réel",
      description: "Recevez des notifications par email et WhatsApp à chaque étape"
    },
    {
      icon: CheckCircle,
      title: "4. Réception des documents",
      description: "Recevez vos documents officiels directement par courrier"
    }
  ];

  return (
    <section id="process" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Comment ça marche ?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Un processus simple et rapide en 4 étapes
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connecting Line - Desktop */}
            <div className="hidden md:block absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary transform translate-y-1/2"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Mobile Connecting Line */}
                  {index < steps.length - 1 && (
                    <div className="md:hidden absolute left-8 top-20 bottom-0 w-1 bg-gradient-to-b from-primary to-accent -translate-x-1/2"></div>
                  )}

                  <div className="text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-6 shadow-lg z-10">
                      <step.icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;

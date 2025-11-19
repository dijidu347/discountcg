import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileCheck, Lightbulb } from "lucide-react";

const Pricing = () => {
  const pricingData = [
    {
      service: "Déclaration d'achat",
      price: "10€",
      documents: ["Carte grise barrée", "Certificat de cession", "Justificatif d'identité", "Justificatif de domicile"]
    },
    {
      service: "Déclaration de cession",
      price: "10€",
      documents: ["Carte grise", "Certificat de cession signé", "Justificatif d'identité", "Contrôle technique (si applicable)"]
    },
    {
      service: "Carte grise standard",
      price: "30€ + prix CG",
      documents: ["Certificat de cession", "Justificatif d'identité", "Justificatif de domicile", "Contrôle technique", "Demande de certificat"]
    },
    {
      service: "Carte grise professionnel",
      price: "30€ + prix CG",
      documents: ["Kbis de moins de 3 mois", "Justificatif d'identité gérant", "Certificat de cession", "Contrôle technique", "Mandat de représentation"]
    }
  ];

  return (
    <section id="tarifs" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Tarifs & documents requis</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transparence totale sur nos prix et pièces justificatives
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-xl shadow-lg overflow-hidden border-2 border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary to-accent hover:from-primary hover:to-accent">
                  <TableHead className="text-white font-bold text-lg">Service</TableHead>
                  <TableHead className="text-white font-bold text-lg">Tarif</TableHead>
                  <TableHead className="text-white font-bold text-lg">Documents requis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricingData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="font-semibold">{item.service}</TableCell>
                    <TableCell className="text-2xl font-bold text-primary">{item.price}</TableCell>
                    <TableCell>
                      <ul className="space-y-1">
                        {item.documents.map((doc, idx) => (
                          <li key={idx} className="flex items-start text-sm">
                            <FileCheck className="w-4 h-4 text-accent mr-2 flex-shrink-0 mt-0.5" />
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-6">
            {pricingData.map((item, index) => (
              <div key={index} className="bg-card rounded-xl shadow-lg p-6 border-2 border-border">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">{item.service}</h3>
                  <span className="text-2xl font-bold text-primary">{item.price}</span>
                </div>
                <div>
                  <p className="font-semibold mb-2 text-muted-foreground">Documents requis :</p>
                  <ul className="space-y-2">
                    {item.documents.map((doc, idx) => (
                      <li key={idx} className="flex items-start text-sm">
                        <FileCheck className="w-4 h-4 text-accent mr-2 flex-shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Lightbulb className="w-5 h-5 text-primary" />
            <p>Le prix de la carte grise varie selon le véhicule et votre région. Nous calculons le montant exact pour vous.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;

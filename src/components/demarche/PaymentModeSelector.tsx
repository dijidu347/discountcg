import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CreditCard, UserCheck, Split, ArrowRight } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

export type PaymentMode = "pro_pays_all" | "client_pays_all" | "split";

interface PaymentModeSelectorProps {
  onSelect: (
    mode: PaymentMode,
    clientEmail?: string,
    clientPhone?: string,
    clientNom?: string,
    clientPrenom?: string,
    clientAdresse?: string,
  ) => void;
  onConfirm: () => void;
  confirmed?: boolean;
  initialMode?: PaymentMode;
  initialClientEmail?: string;
  initialClientPhone?: string;
  initialClientNom?: string;
  initialClientPrenom?: string;
  initialClientAdresse?: string;
}

const PAYMENT_OPTIONS: {
  mode: PaymentMode;
  label: string;
  description: string;
  icon: typeof CreditCard;
}[] = [
  {
    mode: "pro_pays_all",
    label: "Je paie tout",
    description: "Vous payez la carte grise + frais de dossier",
    icon: CreditCard,
  },
  {
    mode: "client_pays_all",
    label: "Mon client paie tout",
    description: "Votre client reçoit un lien de paiement pour le montant total",
    icon: UserCheck,
  },
  {
    mode: "split",
    label: "Paiement partagé",
    description: "Votre client paie la carte grise, vous payez les frais de dossier",
    icon: Split,
  },
];

export function PaymentModeSelector({ onSelect, onConfirm, confirmed, initialMode, initialClientEmail, initialClientPhone, initialClientNom, initialClientPrenom, initialClientAdresse }: PaymentModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<PaymentMode>(initialMode || "pro_pays_all");
  const [clientEmail, setClientEmail] = useState(initialClientEmail || "");
  const [clientPhone, setClientPhone] = useState(initialClientPhone || "");
  const [clientNom, setClientNom] = useState(initialClientNom || "");
  const [clientPrenom, setClientPrenom] = useState(initialClientPrenom || "");
  const [clientAdresse, setClientAdresse] = useState(initialClientAdresse || "");
  const [emailError, setEmailError] = useState("");

  const needsClientInfo = selectedMode === "client_pays_all" || selectedMode === "split";

  const validateEmail = (email: string) => {
    if (!email) return "L'email du client est requis";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return "Adresse email invalide";
    return "";
  };

  // Nom et prénom obligatoires pour un paiement client ; adresse optionnelle (exclue).
  const isValid =
    selectedMode === "pro_pays_all" ||
    (!validateEmail(clientEmail) && !!clientEmail && !!clientNom.trim() && !!clientPrenom.trim());

  // Émet l'état courant vers le parent (la valeur qui vient de changer est passée en override
  // pour éviter le décalage de setState asynchrone).
  const emit = (o: {
    mode?: PaymentMode;
    email?: string;
    phone?: string;
    nom?: string;
    prenom?: string;
    adresse?: string;
  } = {}) => {
    const mode = o.mode ?? selectedMode;
    if (mode === "pro_pays_all") {
      onSelect(mode);
      return;
    }
    onSelect(
      mode,
      (o.email ?? clientEmail) || undefined,
      (o.phone ?? clientPhone) || undefined,
      (o.nom ?? clientNom) || undefined,
      (o.prenom ?? clientPrenom) || undefined,
      (o.adresse ?? clientAdresse) || undefined,
    );
  };

  const handleModeChange = (mode: PaymentMode) => {
    setSelectedMode(mode);
    setEmailError(mode === "pro_pays_all" ? "" : (clientEmail ? validateEmail(clientEmail) : ""));
    emit({ mode });
  };

  const handleEmailChange = (email: string) => {
    setClientEmail(email);
    setEmailError(email ? validateEmail(email) : "");
    emit({ email });
  };

  const handlePhoneChange = (phone: string) => {
    setClientPhone(phone);
    emit({ phone });
  };

  const handleNomChange = (nom: string) => {
    setClientNom(nom);
    emit({ nom });
  };

  const handlePrenomChange = (prenom: string) => {
    setClientPrenom(prenom);
    emit({ prenom });
  };

  const handleAdresseChange = (adresse: string) => {
    setClientAdresse(adresse);
    emit({ adresse });
  };

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm();
  };

  // If already confirmed, show compact summary
  if (confirmed) {
    const option = PAYMENT_OPTIONS.find(o => o.mode === selectedMode);
    const Icon = option?.icon || CreditCard;
    return (
      <div className="border rounded-lg p-4 bg-blue-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-full p-2 bg-blue-600 text-white">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{option?.label}</p>
            {needsClientInfo && clientEmail && (
              <p className="text-xs text-muted-foreground">Client : {clientEmail}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { onConfirm(); /* toggle back */ }}>
          Modifier
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg font-semibold">Mode de paiement</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Choisissez qui prend en charge le paiement de cette démarche
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PAYMENT_OPTIONS.map(({ mode, label, description, icon: Icon }) => {
          const isSelected = selectedMode === mode;
          return (
            <Card
              key={mode}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "border-2 border-blue-600 bg-blue-50 shadow-md"
                  : "border border-gray-200 hover:border-blue-300 hover:shadow-sm"
              }`}
              onClick={() => handleModeChange(mode)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div
                  className={`rounded-full p-3 ${
                    isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className={`font-medium ${isSelected ? "text-blue-600" : "text-gray-900"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {needsClientInfo && (
        <div className="border rounded-lg p-4 bg-blue-50/50 space-y-4">
          <p className="text-sm font-medium text-blue-800">Coordonnées du client</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_prenom">
                Prénom du client <span className="text-red-500">*</span>
              </Label>
              <Input
                id="client_prenom"
                placeholder="Jean"
                value={clientPrenom}
                onChange={(e) => handlePrenomChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_nom">
                Nom du client <span className="text-red-500">*</span>
              </Label>
              <Input
                id="client_nom"
                placeholder="Dupont"
                value={clientNom}
                onChange={(e) => handleNomChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_email">
                Email du client <span className="text-red-500">*</span>
              </Label>
              <Input
                id="client_email"
                type="email"
                placeholder="client@exemple.fr"
                value={clientEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="client_phone">Téléphone du client (optionnel)</Label>
              <Input
                id="client_phone"
                type="tel"
                inputMode="tel"
                placeholder="06 12 34 56 78"
                value={clientPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
            </div>
          </div>
          <AddressAutocomplete
            id="client_adresse"
            label="Adresse du client (optionnelle)"
            value={clientAdresse}
            onChange={handleAdresseChange}
          />
        </div>
      )}

      <Button
        onClick={handleConfirm}
        disabled={!isValid}
        className="w-full bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        Continuer <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

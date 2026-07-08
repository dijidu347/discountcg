// ⚠️ PAGE DE TEST TEMPORAIRE — sert uniquement à vérifier AddressAutocomplete.
// À RETIRER (ce fichier + l'import lazy et la route /test-adresse dans App.tsx)
// avant le branchement réel du composant dans le formulaire de paiement client.
import { useState } from "react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

export default function TestAddress() {
  const [addr, setAddr] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold">Test AddressAutocomplete (temporaire)</h1>
        <p className="text-sm text-muted-foreground">
          Tapez ≥ 3 caractères, sélectionnez une suggestion. Si l'API est bloquée,
          la liste reste vide sans planter.
        </p>

        <AddressAutocomplete
          id="test-address"
          label="Adresse du client (optionnelle)"
          value={addr}
          onChange={setAddr}
        />

        <div className="rounded-md border p-3 text-sm">
          <p className="text-muted-foreground">Adresse retenue (valeur onChange) :</p>
          <p className="font-mono break-all">{addr || "(vide)"}</p>
        </div>
      </div>
    </div>
  );
}

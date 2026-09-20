// Alerte SMS (SMS Partner) vers la personne qui traite les dossiers.
// Chaque tentative est enregistrée dans sms_envois, qu'elle réussisse ou non :
// les journaux des fonctions ne durent que quelques jours.
// Ne lève jamais d'exception : une alerte ratée ne doit pas casser un paiement.

// deno-lint-ignore no-explicit-any
type Client = any;

export interface ResultatSms {
  envoye: boolean;
  erreur?: string;
  reponse?: unknown;
}

export async function envoyerSmsAlerte(
  supabase: Client,
  params: { contexte: string; reference?: string | null; message: string },
): Promise<ResultatSms> {
  const apiKey = Deno.env.get("SMSPARTNER_API_KEY");
  const numero = Deno.env.get("SMS_ALERT_NUMBER");
  const masque = numero ? `…${numero.replace(/\s/g, "").slice(-2)}` : null;

  let resultat: ResultatSms;
  if (!apiKey || !numero) {
    resultat = { envoye: false, erreur: "SMSPARTNER_API_KEY ou SMS_ALERT_NUMBER manquant (secret absent)" };
  } else {
    try {
      const res = await fetch("https://api.smspartner.fr/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, phoneNumbers: numero, message: params.message }),
      });
      const data = await res.json().catch(() => ({}));
      resultat = !res.ok || data?.success === false
        ? { envoye: false, erreur: `SMS Partner a refusé (HTTP ${res.status})`, reponse: data }
        : { envoye: true, reponse: data };
    } catch (e) {
      resultat = { envoye: false, erreur: `Exception lors de l'envoi : ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  try {
    await supabase.from("sms_envois").insert({
      contexte: params.contexte,
      reference: params.reference ?? null,
      message: params.message,
      destinataire: masque,
      envoye: resultat.envoye,
      reponse: resultat.reponse ?? null,
      erreur: resultat.erreur ?? null,
    });
  } catch (e) {
    console.error("Journal SMS non enregistre:", e);
  }

  if (resultat.envoye) console.log("SMS alerte envoye", params.reference ?? "");
  else console.error("SMS alerte non envoye:", resultat.erreur, resultat.reponse ?? "");
  return resultat;
}

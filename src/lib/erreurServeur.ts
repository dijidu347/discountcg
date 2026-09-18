// Motif d'un refus renvoye par une fonction serveur. Le client Supabase ne
// remonte qu'un message technique generique (« non-2xx status code ») : le
// vrai motif, a montrer a l'utilisateur, est dans le corps de la reponse.
export async function messageServeur(error: unknown, parDefaut: string): Promise<string> {
  const contexte = (error as { context?: Response } | null)?.context;
  if (contexte && typeof contexte.json === "function") {
    try {
      const corps = await contexte.clone().json();
      if (corps?.error) return String(corps.error);
    } catch {
      // corps absent ou non JSON : message par defaut
    }
  }
  return parDefaut;
}

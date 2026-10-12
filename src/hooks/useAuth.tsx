import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";

// Le client Supabase est chargé à la demande, et non au démarrage.
//
// Il pèse 167 Ko. Importé ici en tête, il voyageait dans le fichier d'entrée de
// TOUS les visiteurs — soit un tiers du premier chargement pour quelqu'un qui
// lit une page départementale et ne se connectera jamais.
//
// Les pages qui ont besoin de la base l'importent déjà directement : leur
// morceau de code l'embarque, et il se télécharge en parallèle du leur, sans
// aller-retour supplémentaire. Ne restait que ce fournisseur, monté sur toutes
// les pages, à le réclamer d'emblée pour un simple « y a-t-il une session ? ».
//
// `import type` sur la ligne au-dessus compte autant : une importation de types
// en valeur aurait suffi à faire revenir le paquet entier.
let promesseClient: Promise<typeof import("@/integrations/supabase/client")["supabase"]> | null = null;
const client = () =>
  (promesseClient ??= import("@/integrations/supabase/client").then((m) => m.supabase));
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // `demonte` couvre le cas où le composant disparaît pendant que le client
    // se télécharge : on se désabonne alors aussitôt l'écouteur posé.
    let demonte = false;
    let desabonner: (() => void) | null = null;

    client().then((supabase) => {
      if (demonte) return;

      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );
      desabonner = () => subscription.unsubscribe();
      if (demonte) { desabonner(); return; }

      // THEN check for existing session
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (demonte) return;
        if (error) {
          // Clear invalid session (e.g. expired refresh token)
          console.warn("Session recovery failed, clearing auth state:", error.message);
          supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      });
    });

    return () => {
      demonte = true;
      desabonner?.();
    };
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    const redirectUrl = `${window.location.origin}/dashboard`;

    // Validate required fields for particulier
    if (userData.account_type === 'particulier') {
      if (!userData.nom || !userData.prenom || !userData.telephone) {
        return { error: { message: 'Les champs Prénom, Nom et Téléphone sont obligatoires' } };
      }
    }

    const supabase = await client();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          account_type: userData.account_type || 'particulier',
          nom: userData.nom || '',
          prenom: userData.prenom || '',
          telephone: userData.telephone || '',
          referral_source: userData.referral_source || '',
          // Les champs d'entreprise ne sont joints QUE pour une inscription
          // professionnelle.
          //
          // Ils étaient envoyés pour tout le monde, à vide pour un
          // particulier. Or le déclencheur en base crée une fiche garage dès
          // que `raison_sociale` n'est pas NULL — et une chaîne vide n'est pas
          // NULL. Chaque inscription de particulier fabriquait donc un compte
          // garage fantôme, avec le rôle garage par-dessus le marché : la
          // personne pouvait entrer dans l'espace professionnel, où une
          // déclaration de cession coûte 5 € au lieu de 20 €.
          //
          // Quarante-six comptes sont dans ce cas, le dernier du 8 octobre.
          ...(userData.account_type === 'garage'
            ? {
                reseau: userData.reseau || '',
                raison_sociale: userData.raison_sociale || '',
                siret: userData.siret || '',
                adresse: userData.adresse || '',
                code_postal: userData.code_postal || userData.codePostal || '',
                ville: userData.ville || '',
              }
            : {}),
        }
      }
    });

    // Garage profile and role are created automatically via database trigger
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const supabase = await client();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const supabase = await client();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectTo || '/dashboard'}`
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      const supabase = await client();
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore errors (e.g. session_not_found) — clear state anyway
      console.warn("signOut error (ignored):", e);
    }
    setSession(null);
    setUser(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { MajiZoneCheck } from "@/components/maji/concepts/MajiZoneCheck";
import { MajiSimulator } from "@/components/maji/concepts/MajiSimulator";
import { MajiLettre } from "@/components/maji/concepts/MajiLettre";
import { MajiNativeCard } from "@/components/maji/concepts/MajiNativeCard";
import { MajiQuiz } from "@/components/maji/concepts/MajiQuiz";
import { MajiContextHook } from "@/components/maji/concepts/MajiContextHook";

interface ConceptMeta {
  n: number;
  nom: string;
  levier: string;
  effort: "S" | "M" | "L";
  reco?: boolean;
  render: (ville?: string) => JSX.Element;
}

const CONCEPTS: ConceptMeta[] = [
  { n: 1, nom: "« Votre ville est-elle libre ? »", levier: "Rareté + personnalisation", effort: "M", reco: true, render: (v) => <MajiZoneCheck ville={v} /> },
  { n: 2, nom: "Le simulateur de revenus", levier: "Intérêt personnel / ROI", effort: "S", reco: true, render: (v) => <MajiSimulator ville={v} /> },
  { n: 3, nom: "« La Lettre » (feuilleton fondateur)", levier: "Curiosité + relation 1:1", effort: "M", render: (v) => <MajiLettre ville={v} /> },
  { n: 4, nom: "Carte « seconde activité » native", levier: "Anti-pub / confiance", effort: "S", render: (v) => <MajiNativeCard ville={v} /> },
  { n: 5, nom: "Le micro-quiz d'éligibilité", levier: "Micro-engagement", effort: "M", render: (v) => <MajiQuiz ville={v} /> },
  { n: 6, nom: "Hook contextuel post-démarche", levier: "Pertinence contextuelle", effort: "M", render: (v) => <MajiContextHook ville={v} /> },
];

const effortColor: Record<string, string> = {
  S: "bg-emerald-100 text-emerald-700",
  M: "bg-amber-100 text-amber-700",
  L: "bg-red-100 text-red-700",
};

export default function MajiConcepts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ville, setVille] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("garages")
      .select("ville")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setVille(data?.ville || undefined));
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>MaJi Auto — Concepts de mise en avant</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour au dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">
            MaJi Auto — 6 façons de le mettre en avant
          </h1>
          <p className="text-muted-foreground mt-1">
            Tous les concepts sont réels et manipulables.
            {ville ? <> Personnalisés pour votre zone : <span className="font-bold text-emerald-600">{ville}</span>.</> : " Tape une ville dans le concept #1 pour tester la perso."}
          </p>
        </div>

        <div className="space-y-10">
          {CONCEPTS.map((c) => (
            <section key={c.n}>
              <div className="flex items-center flex-wrap gap-2 mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-sm">
                  {c.n}
                </span>
                <h2 className="font-bold text-gray-900">{c.nom}</h2>
                {c.reco && (
                  <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Recommandé
                  </span>
                )}
                <span className="text-[11px] text-gray-500">· {c.levier}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${effortColor[c.effort]}`}>
                  Effort {c.effort}
                </span>
              </div>
              {c.render(ville)}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="font-bold text-gray-900">Lequel on installe dans le vrai dashboard ?</p>
          <p className="text-sm text-gray-600 mt-1">
            Ma reco : combiner <b>#1 (zone)</b> + <b>#2 (simulateur)</b>. Dis-moi ton choix et je câble.
          </p>
        </div>
      </div>
    </div>
  );
}

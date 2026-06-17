import { useState } from "react";
import { CheckCircle2, ArrowRight, Sparkles, PartyPopper } from "lucide-react";
import { isZoneFree, openMajiApply } from "@/components/maji/maji-shared";

/**
 * CONCEPT 5 — Le micro-quiz d'éligibilité.
 * 2-3 questions => barre de progression => "Vous êtes éligible, zone libre"
 * => candidature. Levier = micro-engagement (foot-in-the-door).
 */
const QUESTIONS = [
  {
    q: "Vous êtes…",
    options: ["Garage / carrossier", "Mandataire / négociant VO", "Indépendant auto", "En reconversion"],
  },
  {
    q: "Vous cherchez…",
    options: ["Un complément de revenu", "Une activité principale", "Diversifier mon garage"],
  },
  {
    q: "Vous pouvez démarrer…",
    options: ["Tout de suite", "Sous 1 mois", "Je me renseigne"],
  },
];

export function MajiQuiz({ ville }: { ville?: string }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const done = step >= QUESTIONS.length;
  const free = isZoneFree(ville);

  const choose = (opt: string) => {
    setAnswers((a) => [...a, opt]);
    setStep((s) => s + 1);
  };
  const reset = () => {
    setStep(0);
    setAnswers([]);
  };

  const progress = Math.round((Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-lg shadow-emerald-100/50">
      <div className="absolute top-3 right-3 z-10">
        <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full shadow uppercase tracking-wide">
          <Sparkles className="h-2.5 w-2.5" /> Test 30 sec
        </span>
      </div>

      <div className="p-6">
        <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
          MaJi Auto · Êtes-vous fait pour le dépôt-vente ?
        </p>

        {/* barre de progression */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${done ? 100 : progress}%` }}
          />
        </div>

        {!done ? (
          <div className="mt-5">
            <p className="text-[11px] text-gray-400 font-semibold">
              Question {step + 1}/{QUESTIONS.length}
            </p>
            <h3 className="font-black text-gray-900 text-lg leading-tight mt-1">
              {QUESTIONS[step].q}
            </h3>
            <div className="mt-3 grid gap-2">
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => choose(opt)}
                  className="text-left w-full px-4 h-11 rounded-xl border border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 text-sm font-medium text-gray-700 transition-colors flex items-center justify-between group"
                >
                  {opt}
                  <ArrowRight className="h-4 w-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 mb-3">
              <PartyPopper className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="font-black text-gray-900 text-xl leading-tight">
              ✅ Vous êtes éligible !
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {free
                ? `Bonne nouvelle : ${ville ? ville : "votre secteur"} est encore libre. Il reste 1 place.`
                : "Une zone proche de chez vous est disponible."}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Profil compatible · candidature pré-remplie
            </div>
            <button
              onClick={openMajiApply}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all hover:scale-[1.02]"
            >
              Finaliser ma candidature <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={reset} className="mt-2 text-[11px] text-gray-400 hover:text-gray-600">
              Recommencer le test
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Mail, MailOpen, ArrowRight, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { openMajiApply } from "@/components/maji/maji-shared";

/**
 * CONCEPT 3 — « La Lettre » (feuilleton du fondateur).
 * Bandeau slim "inbox" sous le header. À chaque visite (nouveau jour) un chapitre
 * se débloque, lu dans un panneau latéral. CTA candidature au dernier chapitre.
 * Ici en démo : on peut avancer chapitre par chapitre manuellement.
 */
const CHAPITRES = [
  {
    titre: "J'ai un truc à vous dire. Mais pas tout d'un coup.",
    corps:
      "J'ai fermé mon garage il y a 3 ans. Aujourd'hui je gagne mieux ma vie — sans showroom, sans stock, sans charges. Je vais vous raconter comment, un chapitre à la fois. La suite demain.",
    cta: null as string | null,
  },
  {
    titre: "Le métier d'agent immobilier… appliqué à la voiture.",
    corps:
      "Un particulier me confie sa voiture, je la vends pour lui. Lui touche son net, moi je suis payé par l'acheteur. 80€ par mandat côté réseau, et bien plus en marge. Faites le calcul à 10 mandats/mois.",
    cta: null,
  },
  {
    titre: "Je ne dis ça qu'aux gens du métier. Comme vous.",
    corps:
      "Pas de droit d'entrée. 99€/mois pour le cockpit complet, la formation et l'accompagnement. Et vos 5 premiers mandats : offerts. À vie.",
    cta: null,
  },
  {
    titre: "Bordeaux, Orléans, Périgueux, Pessac… déjà pris.",
    corps:
      "Un seul agent par secteur, c'est la règle, pas un argument marketing. Regardez : 9 villes sont déjà attribuées. Et votre zone à vous ?",
    cta: "Voir si ma zone est libre",
  },
  {
    titre: "Il reste 1 place sur votre secteur.",
    corps:
      "Je ne mens pas sur la rareté : c'est 1 agent par zone, point. Si c'est vous, on se parle sous 72h. Pas de blabla, juste un échange entre pros.",
    cta: "Candidater (réponse <72h)",
  },
];

export function MajiLettre(_props: { ville?: string }) {
  const [chapter, setChapter] = useState(0); // index lu actuellement
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(true);

  const current = CHAPITRES[chapter];
  const isLast = chapter === CHAPITRES.length - 1;

  return (
    <>
      {/* Bandeau slim "inbox" */}
      <div
        onClick={() => {
          setOpen(true);
          setUnread(false);
        }}
        className="flex items-center gap-3 cursor-pointer rounded-xl border border-amber-200 bg-[#FDFBF7] px-4 py-3 hover:shadow-sm transition-shadow"
      >
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
            M
          </div>
          {unread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
              {chapter + 1}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-amber-700 font-semibold">
            Maxime, fondateur MaJi · Chapitre {chapter + 1}/{CHAPITRES.length}
          </p>
          <p className="text-sm font-medium text-gray-800 truncate">{current.titre}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>

      {/* Panneau de lecture */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[420px] sm:max-w-[420px] bg-[#FDFBF7]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-emerald-700">
              <MailOpen className="h-5 w-5" /> Une lettre de Maxime
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            {/* stepper */}
            <div className="flex gap-1.5 mb-5">
              {CHAPITRES.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i <= chapter ? "bg-emerald-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">
              Chapitre {chapter + 1}
            </p>
            <h3 className="font-black text-gray-900 text-lg leading-tight mt-1 font-serif">
              {current.titre}
            </h3>
            <p className="text-[15px] text-gray-700 leading-relaxed mt-4 font-serif">
              {current.corps}
            </p>
            <p className="text-sm text-gray-500 mt-6 italic">— Maxime, fondateur MaJi Auto</p>

            {/* actions */}
            <div className="mt-8 space-y-2">
              {current.cta && (
                <button
                  onClick={openMajiApply}
                  className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition-colors"
                >
                  {current.cta} <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {!isLast ? (
                <button
                  onClick={() => {
                    setChapter((c) => Math.min(c + 1, CHAPITRES.length - 1));
                    setUnread(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-800 text-sm font-medium"
                >
                  <Mail className="h-4 w-4" /> Lire le chapitre suivant (démo)
                </button>
              ) : (
                <p className="text-center text-[11px] text-gray-400">
                  Fin du feuilleton · en réel, 1 chapitre se débloque par jour
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// Le menu « Démarches » de la barre du site.
//
// L'onglet menait à /carte-grise : il promettait une liste et livrait une
// seule démarche. Les vingt pages du site n'étaient donc atteignables que
// depuis la section « Nos démarches » de l'accueil, et l'index départemental
// depuis un lien de pied de page à quatre-vingt-dix-huit pour cent du bas.
//
// Deux rendus, parce que les deux usages n'ont rien à voir : au survol sur
// grand écran, en accordéon déplié dans le tiroir du téléphone. Le contenu,
// lui, vient d'un seul endroit.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { MENU_DEMARCHES, type GroupeMenu } from "@/data/menuDemarches";

export function MenuDemarchesBureau() {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const fermeture = useRef<number>();

  // Un délai à la fermeture : sans lui, le menu disparaît dès que la souris
  // traverse le vide entre l'onglet et le panneau.
  const garder = () => { window.clearTimeout(fermeture.current); setOuvert(true); };
  const relacher = () => { fermeture.current = window.setTimeout(() => setOuvert(false), 120); };

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("keydown", auClavier);
    return () => document.removeEventListener("keydown", auClavier);
  }, []);

  return (
    <div ref={zone} className="relative" onMouseEnter={garder} onMouseLeave={relacher}>
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-haspopup="true"
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary"
      >
        Démarches
        <ChevronDown className={`h-4 w-4 transition-transform ${ouvert ? "rotate-180" : ""}`} />
      </button>

      {ouvert && (
        <div
          /* Centré sur la fenêtre, pas sur le bouton : l'onglet est à droite
             de la barre, et un panneau de 980 px centré sur lui sortait de
             l'écran. */
          className="fixed left-1/2 top-16 z-50 mt-1 max-h-[calc(100vh-5.5rem)] w-[min(94vw,980px)] -translate-x-1/2 overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-xl"
          role="menu"
        >
          {/* Les trois groupes font 3, 6 et 12 entrées : une colonne par
              groupe donnait une première colonne presque vide et une troisième
              interminable. Les deux groupes courts s'empilent donc à gauche,
              et le long s'étale sur les deux colonnes restantes. */}
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-6">
              {MENU_DEMARCHES.filter((g) => !g.large).map((col) => (
                <Groupe key={col.titre} groupe={col} onNaviguer={() => setOuvert(false)} />
              ))}
            </div>
            {MENU_DEMARCHES.filter((g) => g.large).map((col) => (
              <div key={col.titre} className="sm:col-span-1 lg:col-span-2">
                <Groupe groupe={col} onNaviguer={() => setOuvert(false)} colonnes />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Groupe({ groupe, onNaviguer, colonnes }: {
  groupe: GroupeMenu;
  onNaviguer: () => void;
  colonnes?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {groupe.titre} <span className="font-normal">({groupe.entrees.length})</span>
      </p>
      <ul className={colonnes ? "grid gap-x-8 gap-y-0.5 sm:grid-cols-2" : "space-y-0.5"}>
        {groupe.entrees.map((e) => {
          const Icone = e.icone;
          return (
            <li key={e.chemin}>
              <Link
                to={e.chemin}
                onClick={onNaviguer}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-primary/5 hover:text-primary"
                role="menuitem"
              >
                <Icone className="h-4 w-4 shrink-0 text-primary" />
                {e.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MenuDemarchesMobile({ onNaviguer }: { onNaviguer: () => void }) {
  return (
    <div className="space-y-4 border-y border-border py-3">
      {MENU_DEMARCHES.map((col) => (
        <div key={col.titre}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {col.titre}
          </p>
          <ul>
            {col.entrees.map((e) => {
              const Icone = e.icone;
              return (
                <li key={e.chemin}>
                  <Link
                    to={e.chemin}
                    onClick={onNaviguer}
                    className="flex items-center gap-2.5 py-1.5 text-sm text-foreground transition-colors hover:text-primary"
                  >
                    <Icone className="h-4 w-4 shrink-0 text-primary" />
                    {e.libelle}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

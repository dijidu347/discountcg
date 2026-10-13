// La carte de France des tarifs du cheval fiscal.
//
// Elle répond à deux reproches en même temps, et c'est pour cela qu'elle vaut
// la peine : les cent une pages départementales n'existaient nulle part dans
// la navigation — on ne pouvait les atteindre que par Google, ou en déroulant
// un tableau caché au fond du simulateur — et le site n'avait aucun visuel.
//
// Tout vient des données du site : le tracé est figé, les tarifs et les
// départements sont relus à chaque rendu. Aucun chiffre n'est écrit ici, donc
// rien ne peut se périmer.

import { Link } from "react-router-dom";
import { TRACES, VUE_CARTE } from "@/data/carteRegions";
import { REGIONS_TARIFS, couleurTarif, euroCourt, TARIF_MIN, TARIF_MAX } from "@/data/carteTarifs";

const DOM = new Set(["gua", "mar", "guy", "reu", "may"]);

export function CarteDesTarifs({ onChoisir }: { onChoisir?: (cle: string) => void }) {
  return (
    <figure className="m-0">
      <svg
        viewBox={VUE_CARTE}
        className="w-full h-auto"
        role="img"
        aria-label="Carte de France du tarif du cheval fiscal par région en 2026"
      >
        <title>Tarif du cheval fiscal par région en 2026</title>
        {REGIONS_TARIFS.map((r) => {
          const t = TRACES[r.cle];
          if (!t) return null;
          const estDom = DOM.has(r.cle);
          return (
            <g key={r.cle} className="cursor-pointer">
              <a
                href={`#region-${r.cle}`}
                onClick={(e) => {
                  if (!onChoisir) return;
                  e.preventDefault();
                  onChoisir(r.cle);
                }}
                aria-label={`${r.nom} : ${euroCourt(r.tarif)} le cheval fiscal`}
              >
                <path
                  d={t.d}
                  fill={couleurTarif(r.tarif)}
                  stroke="#fff"
                  strokeWidth={1.1}
                  className="transition-opacity hover:opacity-80"
                />
                {/* Le prix se pose sur la région en métropole, à côté de la
                    vignette pour l'outre-mer : les tracés y sont trop petits
                    pour porter un texte lisible. */}
                {estDom ? (
                  /* Sous la vignette, pas à côté : à la hauteur de la
                     Martinique et de la Guadeloupe, une étiquette posée à
                     droite passait sous la pointe de la Bretagne. */
                  <>
                    <text x={-89} y={t.cy + 44} textAnchor="middle" fontSize={15} fontWeight={700} fill="currentColor">
                      {euroCourt(r.tarif)}
                    </text>
                    <text x={-89} y={t.cy + 57} textAnchor="middle" fontSize={10.5} fill="currentColor" opacity={0.65}>
                      {r.nom}
                    </text>
                  </>
                ) : (
                  <text
                    x={t.cx}
                    y={t.cy}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={700}
                    fill="#fff"
                    style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.28)", strokeWidth: 2.5 }}
                    className="pointer-events-none"
                  >
                    {euroCourt(r.tarif)}
                  </text>
                )}
              </a>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-28 rounded-sm" style={{
            background: `linear-gradient(90deg, ${couleurTarif(TARIF_MIN)}, ${couleurTarif((TARIF_MIN+TARIF_MAX)/2)}, ${couleurTarif(TARIF_MAX)})`,
          }} />
          de {euroCourt(TARIF_MIN)} à {euroCourt(TARIF_MAX)} le cheval fiscal
        </span>
        <span>Cliquez une région pour voir ses départements</span>
      </figcaption>
    </figure>
  );
}

/** La liste complète, sous la carte : c'est elle qui fait la navigation. */
export function ListeDesRegions() {
  return (
    <div className="space-y-10">
      {REGIONS_TARIFS.map((r) => (
        <section key={r.cle} id={`region-${r.cle}`} className="scroll-mt-24">
          <h3 className="flex flex-wrap items-baseline gap-3 text-lg font-bold text-foreground">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: couleurTarif(r.tarif) }}
              aria-hidden
            />
            {r.nom}
            <span className="font-semibold text-primary">{euroCourt(r.tarif)} / CV</span>
            <span className="text-sm font-normal text-muted-foreground">
              {r.departements.length} département{r.departements.length > 1 ? "s" : ""}
            </span>
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {r.departements.map((d) => (
              <li key={d.code} className="min-w-0">
                <Link
                  to={d.chemin}
                  className="block truncate text-sm text-foreground hover:text-primary hover:underline"
                >
                  <span className="tabular-nums text-muted-foreground">{d.code}</span> {d.nom}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

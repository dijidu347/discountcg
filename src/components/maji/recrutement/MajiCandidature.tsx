import { useState } from "react";
import { Loader2, ArrowRight, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { nomDepartement, type MajiSignaux } from "@/lib/majiCiblage";

/**
 * MODULES 03 + 04 — Vérificateur de secteur et candidature en un clic.
 *
 * Deux idées structurantes :
 *
 *  1. La rareté est RÉELLE (un seul agent par département), donc on ne ment pas
 *     quand le secteur est pris. Une liste d'attente honnête est ce qui rend la
 *     rareté crédible sur tout le reste du réseau.
 *
 *  2. DiscountCG connaît déjà la raison sociale, le SIRET, le secteur et le volume
 *     d'activité. On ne redemande rien : le formulaire tombe de huit champs à deux.
 *
 * Contraintes de rédaction MaJi respectées ici : aucune promesse de rendez-vous,
 * de mandats signés ou de revenus — on parle de dépôt-vente ; le mot
 * « franchise » n'apparaît nulle part (c'est un réseau d'agents).
 */

const MOMENTS = ["Matin", "Midi", "Après-midi", "Soir"] as const;
type Moment = (typeof MOMENTS)[number];

interface GarageInfo {
  raison_sociale?: string | null;
  siret?: string | null;
  email?: string | null;
  telephone?: string | null;
  code_postal?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  garage: GarageInfo | null;
  signaux: MajiSignaux;
  /** Code département déduit du code postal du compte. */
  departement: string | null;
}

/** Plaque d'immatriculation française portant le numéro de département. */
function Plaque({ numero }: { numero: string }) {
  return (
    <span className="inline-flex items-stretch overflow-hidden rounded-[5px] border-2 border-gray-900 bg-white">
      <span className="flex flex-col items-center justify-between bg-[#003399] px-[7px] pb-1.5 pt-2 font-mono text-[9px] tracking-wide text-white">
        <i className="not-italic text-[11px] tracking-normal">★</i>F
      </span>
      <span className="flex items-center px-4 py-2 font-mono text-[26px] font-semibold tabular-nums tracking-wide text-gray-900">
        {numero}
      </span>
    </span>
  );
}

/** Champ pré-rempli, non modifiable : la donnée est déjà connue de DiscountCG. */
function ChampConnu({ label, valeur, mono }: { label: string; valeur: string; mono?: boolean }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500">
        {label}
      </label>
      <div className="flex items-center justify-between gap-2.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500">
        <span className={mono ? "font-mono" : undefined}>{valeur}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider">Connu</span>
      </div>
    </div>
  );
}

export function MajiCandidature({ open, onOpenChange, garage, signaux, departement }: Props) {
  const { toast } = useToast();
  const [telephone, setTelephone] = useState(garage?.telephone ?? "");
  const [moment, setMoment] = useState<Moment | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const libre = signaux.secteurLibre;
  const nomDept = nomDepartement(departement);
  const volume =
    `${signaux.cessions12Mois} cession${signaux.cessions12Mois > 1 ? "s" : ""}` +
    (signaux.achats12Mois > 0
      ? `, ${signaux.achats12Mois} déclaration${signaux.achats12Mois > 1 ? "s" : ""} d'achat`
      : "");

  const envoyer = async () => {
    if (!telephone.trim()) {
      toast({ title: "Téléphone requis", description: "Indiquez un numéro pour être rappelé.", variant: "destructive" });
      return;
    }
    setEnvoi(true);
    try {
      // Réutilise le canal de contact existant. Le préfixe rend la candidature
      // filtrable dans la boîte de réception en attendant une destination dédiée.
      const message = [
        libre ? "CANDIDATURE MAJI AUTO" : "LISTE D'ATTENTE MAJI AUTO (secteur déjà attribué)",
        "",
        `Raison sociale : ${garage?.raison_sociale ?? "—"}`,
        `SIRET : ${garage?.siret ?? "—"}`,
        `Secteur : ${departement ?? "—"}${nomDept ? ` ${nomDept}` : ""}`,
        `Volume constaté sur 12 mois : ${volume || "aucune cession"}`,
        `Plaque W Garage : ${signaux.aPlaqueWGarage ? "oui" : "non"}`,
        `Abonné Coffre-fort : ${signaux.abonneCoffre ? "oui" : "non"}`,
        "",
        `Téléphone : ${telephone.trim()}`,
        `Meilleur moment pour joindre : ${moment ?? "non précisé"}`,
      ].join("\n");

      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: garage?.raison_sociale ?? "Garage DiscountCG",
          email: garage?.email ?? "",
          phone: telephone.trim(),
          message,
        },
      });
      if (error) throw error;

      setEnvoye(true);
    } catch {
      toast({
        title: "Envoi impossible",
        description: "Réessayez dans un instant, ou contactez-nous directement.",
        variant: "destructive",
      });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="sr-only">
          {libre ? "Candidater au réseau MaJi Auto" : "Être prévenu quand le secteur se libère"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vérification de la disponibilité de votre secteur et envoi de votre candidature au réseau MaJi Auto.
        </DialogDescription>

        {envoye ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-4 text-lg font-semibold text-gray-900">
              {libre ? "Candidature envoyée" : "Vous êtes sur la liste d'attente"}
            </p>
            <p className="mx-auto mt-2 max-w-[42ch] text-sm text-gray-500">
              {libre
                ? "Le réseau vous rappelle au moment que vous avez indiqué."
                : "Vous serez prévenu en priorité si le secteur se libère."}
            </p>
            <button
              onClick={() => onOpenChange(false)}
              className="mt-5 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
        ) : (
          <>
            {/* MODULE 03 — état du secteur */}
            <div className="mb-1 flex flex-wrap items-center gap-3">
              {departement && <Plaque numero={departement} />}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13.5px] font-semibold ${
                  libre ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-800"
                }`}
              >
                <span className="h-[7px] w-[7px] rounded-full bg-current" />
                {libre ? "Disponible" : "Déjà attribué"}
              </span>
            </div>
            {nomDept && <div className="text-base font-semibold text-gray-900">{nomDept}</div>}

            <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-gray-600">
              {libre
                ? "Aucun agent n'est encore attribué sur votre secteur. Le réseau n'en retient qu'un seul par zone."
                : "Un agent couvre déjà ce secteur. Vous pouvez être prévenu en priorité s'il se libère, ou consulter les zones voisines encore ouvertes."}
            </p>

            {/* MODULE 04 — candidature pré-remplie */}
            <div className="mt-5 border-t border-gray-100 pt-5">
              {garage?.raison_sociale && <ChampConnu label="Raison sociale" valeur={garage.raison_sociale} />}
              {garage?.siret && <ChampConnu label="SIRET" valeur={garage.siret} mono />}
              {departement && (
                <ChampConnu label="Secteur" valeur={`${departement}${nomDept ? ` ${nomDept}` : ""}`} />
              )}
              {volume && <ChampConnu label="Volume constaté sur 12 mois" valeur={volume} />}

              <div className="mb-3">
                <label
                  htmlFor="maji-tel"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500"
                >
                  Votre téléphone
                </label>
                <input
                  id="maji-tel"
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="06 __ __ __ __"
                  className="w-full rounded-md border border-[#003399] bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003399]/30"
                />
              </div>

              <div className="mb-4">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500">
                  Meilleur moment pour vous joindre
                </span>
                <div className="flex flex-wrap gap-2">
                  {MOMENTS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMoment(m)}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        moment === m
                          ? "border-[#003399] bg-[#003399] text-white"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={envoyer}
                disabled={envoi}
                className="inline-flex items-center gap-2 rounded-md bg-[#003399] px-[18px] py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-[#002a7a] disabled:opacity-60"
              >
                {envoi && <Loader2 className="h-4 w-4 animate-spin" />}
                {libre ? "Envoyer ma candidature" : "Être prévenu en priorité"}
                {!envoi && <ArrowRight className="h-4 w-4" />}
              </button>

              <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
                Réseau de dépôt-vente automobile — 99 € par mois, 80 € par mandat signé.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

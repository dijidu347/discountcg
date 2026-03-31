import { useState } from "react";
import { useCoffreSubscription } from "@/hooks/useCoffreSubscription";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Archive, AlertTriangle, Gift, X, RotateCcw, Calendar, CreditCard, Coins,
} from "lucide-react";

type CancelStep = "idle" | "confirm1" | "retention_offer" | "confirm2" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CoffreManageSubscription({ open, onClose }: Props) {
  const [cancelStep, setCancelStep] = useState<CancelStep>("idle");
  const {
    subscription, isTrialing, cancel, applyRetentionDiscount, reactivate,
  } = useCoffreSubscription();

  const isCancelScheduled = subscription?.cancel_at_period_end;
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;
  const trialEnd = subscription?.trial_end
    ? new Date(subscription.trial_end).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const paymentLabel =
    subscription?.payment_mode === "tokens"
      ? "Jetons Jimmy"
      : subscription?.payment_mode === "beta"
      ? "Accès beta"
      : "Carte bancaire (Stripe)";

  const handleStartCancel = () => {
    // If trialing: skip retention, just ask once
    if (isTrialing) {
      setCancelStep("confirm2");
    } else {
      setCancelStep("confirm1");
    }
  };

  const handleConfirm1 = () => setCancelStep("retention_offer");

  const handleAcceptDiscount = async () => {
    await applyRetentionDiscount.mutateAsync();
    setCancelStep("idle");
    onClose();
  };

  const handleRefuseDiscount = () => setCancelStep("confirm2");

  const handleFinalCancel = async () => {
    await cancel.mutateAsync();
    setCancelStep("done");
  };

  const handleReactivate = async () => {
    await reactivate.mutateAsync();
    setCancelStep("idle");
    onClose();
  };

  const handleClose = () => {
    setCancelStep("idle");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">

        {/* ── STEP: idle (main info) ── */}
        {cancelStep === "idle" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Archive className="h-4 w-4 text-primary" />
                </div>
                <DialogTitle>Mon abonnement Coffre-fort</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Status */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Statut</span>
                  {isTrialing ? (
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">
                      Essai gratuit
                    </Badge>
                  ) : isCancelScheduled ? (
                    <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                      Résiliation programmée
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                      Actif
                    </Badge>
                  )}
                </div>

                {isTrialing && trialEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Fin d'essai
                    </span>
                    <span className="text-sm font-medium">{trialEnd}</span>
                  </div>
                )}

                {periodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {isCancelScheduled ? "Accès jusqu'au" : "Prochain renouvellement"}
                    </span>
                    <span className="text-sm font-medium">{periodEnd}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Paiement
                  </span>
                  <span className="text-sm font-medium">{paymentLabel}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tarif</span>
                  <span className="text-sm font-bold">9,99 € / mois</span>
                </div>
              </div>

              {/* Actions */}
              {isCancelScheduled ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Votre accès se termine le <strong>{periodEnd}</strong>.<br />
                    Vous pouvez annuler la résiliation.
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleReactivate}
                    disabled={reactivate.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {reactivate.isPending ? "En cours..." : "Annuler la résiliation"}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={handleStartCancel}
                  className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2 py-1"
                >
                  Résilier mon abonnement
                </button>
              )}
            </div>
          </>
        )}

        {/* ── STEP: confirm1 (première confirmation) ── */}
        {cancelStep === "confirm1" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <DialogTitle>Vous souhaitez résilier ?</DialogTitle>
              </div>
              <DialogDescription>
                Êtes-vous sûr de vouloir mettre fin à votre abonnement Coffre-fort ?
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-700">Vous allez perdre :</p>
              <ul className="text-sm text-amber-700/80 space-y-1">
                <li>• L'accès à tous vos documents stockés</li>
                <li>• Les exports comptables automatiques</li>
                <li>• La prise de photo rapide</li>
                <li>• L'historique de vos dépenses</li>
              </ul>
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelStep("idle")}>
                <X className="mr-2 h-4 w-4" /> Annuler
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleConfirm1}>
                Continuer quand même
              </Button>
            </div>
          </>
        )}

        {/* ── STEP: retention offer (-50%) ── */}
        {cancelStep === "retention_offer" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Gift className="h-4 w-4 text-emerald-600" />
                </div>
                <DialogTitle>Attendez ! Une offre exclusive pour vous</DialogTitle>
              </div>
              <DialogDescription>
                Avant de partir, nous vous offrons une remise exceptionnelle.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 p-5 text-center space-y-2">
              <div className="text-4xl font-black text-emerald-600">-50%</div>
              <p className="font-semibold text-foreground">sur votre prochain mois</p>
              <p className="text-sm text-muted-foreground">
                Au lieu de <span className="line-through">9,99 €</span>, payez seulement{" "}
                <span className="font-bold text-emerald-600">4,99 €</span> le mois prochain.
              </p>
              <p className="text-xs text-muted-foreground">
                Offre valable une seule fois. Prix normal repris ensuite.
              </p>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleRefuseDiscount}
                className="flex-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Non merci, résilier quand même
              </button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleAcceptDiscount}
                disabled={applyRetentionDiscount.isPending}
              >
                <Gift className="mr-2 h-4 w-4" />
                {applyRetentionDiscount.isPending ? "Application..." : "Oui, je garde mon accès !"}
              </Button>
            </div>
          </>
        )}

        {/* ── STEP: confirm2 (confirmation finale) ── */}
        {cancelStep === "confirm2" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <DialogTitle>Confirmation définitive</DialogTitle>
              </div>
              <DialogDescription>
                {isTrialing
                  ? "Votre essai gratuit sera arrêté. Vous perdrez l'accès à votre coffre-fort."
                  : "Dernière chance. Votre abonnement sera résilié à la fin de la période en cours."}
              </DialogDescription>
            </DialogHeader>

            {periodEnd && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 text-sm text-center">
                {isTrialing
                  ? "Votre accès sera coupé immédiatement."
                  : <>Vous conservez l'accès jusqu'au <strong>{periodEnd}</strong>.<br />Aucun remboursement ne sera effectué.</>
                }
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelStep("idle")}>
                Non, je reste
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleFinalCancel}
                disabled={cancel.isPending}
              >
                {cancel.isPending ? "Résiliation..." : "Oui, résilier définitivement"}
              </Button>
            </div>
          </>
        )}

        {/* ── STEP: done ── */}
        {cancelStep === "done" && (
          <>
            <DialogHeader>
              <DialogTitle>Résiliation confirmée</DialogTitle>
              <DialogDescription>
                Votre abonnement a bien été résilié.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 text-center space-y-2">
              {periodEnd && (
                <p className="text-sm text-muted-foreground">
                  Vous conservez l'accès à votre coffre-fort jusqu'au{" "}
                  <strong className="text-foreground">{periodEnd}</strong>.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Nous espérons vous revoir bientôt. Vos documents restent disponibles jusqu'à la fin de votre accès.
              </p>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Fermer
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

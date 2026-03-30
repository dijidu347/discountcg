import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CoffreSubscription {
  id: string;
  garage_id: string;
  status: "trialing" | "active" | "canceled" | "past_due";
  payment_mode: "stripe" | "tokens";
  cancel_at_period_end: boolean;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

export function useCoffreSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check admin role (admins get free access)
  const adminQuery = useQuery({
    queryKey: ["user-is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // First, get the garage_id for this user
  const garageQuery = useQuery({
    queryKey: ["garage-id", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("garages")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      return data?.id || null;
    },
    enabled: !!user && !adminQuery.data,
  });

  const garageId = garageQuery.data;

  const query = useQuery({
    queryKey: ["coffre-subscription", garageId],
    queryFn: async (): Promise<CoffreSubscription | null> => {
      const { data, error } = await supabase
        .from("coffre_subscriptions" as any)
        .select("*")
        .eq("garage_id", garageId!)
        .maybeSingle();

      if (error) {
        console.error("Error fetching coffre subscription:", error);
        return null;
      }

      // Beta/admin users: auto-create an 'active' row if none exists
      // so DB-level checks (storage RLS, etc.) pass correctly
      if (!data && (adminQuery.data === true || BETA_EMAILS.includes(user?.email || ""))) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setFullYear(periodEnd.getFullYear() + 10); // long-lived for beta
        await supabase.from("coffre_subscriptions" as any).upsert({
          garage_id: garageId,
          status: "active",
          payment_mode: "beta",
          cancel_at_period_end: false,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        }, { onConflict: "garage_id" });

        return {
          id: "",
          garage_id: garageId!,
          status: "active",
          payment_mode: "beta",
          cancel_at_period_end: false,
          trial_start: null,
          trial_end: null,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        };
      }

      return data as unknown as CoffreSubscription | null;
    },
    enabled: !!garageId,
  });

  const isAdmin = adminQuery.data === true;
  const BETA_EMAILS = ["mathieugaillac4@gmail.com"];
  const isBetaAllowed = isAdmin || (!!user?.email && BETA_EMAILS.includes(user.email));
  const isActive = isBetaAllowed && (isAdmin || query.data?.status === "active" || query.data?.status === "trialing");
  const isTrialing = query.data?.status === "trialing";
  const isCanceled = query.data?.status === "canceled";
  const isPastDue = query.data?.status === "past_due";

  // Subscribe: redirects to Stripe Checkout
  const subscribe = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-coffre-subscription");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: { checkout_url: string }) => {
      window.location.href = data.checkout_url;
    },
    onError: (error: any) => {
      const message = error?.message || "Erreur lors de la création de l'abonnement";
      toast.error(message);
    },
  });

  // Subscribe with tokens (deducts 9.99€ from token_balance)
  const subscribeWithTokens = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("activate-coffre-with-tokens");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffre-subscription"] });
      toast.success("Coffre-fort activé avec vos jetons !");
    },
    onError: (error: any) => {
      const message = error?.message || "Erreur lors de l'activation";
      toast.error(message);
    },
  });

  // Cancel: sets cancel_at_period_end
  const cancel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("cancel-coffre-subscription");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffre-subscription"] });
      toast.success("Votre abonnement sera annulé à la fin de la période en cours.");
    },
    onError: () => {
      toast.error("Erreur lors de l'annulation");
    },
  });

  return {
    subscription: query.data,
    garageId,
    isLoading: adminQuery.isLoading || query.isLoading || garageQuery.isLoading,
    isBetaAllowed,
    isActive,
    isTrialing,
    isCanceled,
    isPastDue,
    subscribe,
    subscribeWithTokens,
    cancel,
  };
}

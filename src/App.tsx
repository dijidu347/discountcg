import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

const Index = React.lazy(() => import("./pages/Index"));
const Login = React.lazy(() => import("./pages/Login"));
const Register = React.lazy(() => import("./pages/Register"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));
const CompleteProfile = React.lazy(() => import("./pages/CompleteProfile"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const NouvelleDemarche = React.lazy(() => import("./pages/NouvelleDemarche"));
const MesDemarches = React.lazy(() => import("./pages/MesDemarches"));
const MesFactures = React.lazy(() => import("./pages/MesFactures"));
const DemarcheDetail = React.lazy(() => import("./pages/DemarcheDetail"));
const GarageSettings = React.lazy(() => import("./pages/GarageSettings"));
const Support = React.lazy(() => import("./pages/Support"));
const CommanderSansCompte = React.lazy(() => import("./pages/CommanderSansCompte"));
const PaiementGuestOrder = React.lazy(() => import("./pages/PaiementGuestOrder"));
const PaiementDemarche = React.lazy(() => import("./pages/PaiementDemarche"));
const PaiementSucces = React.lazy(() => import("./pages/PaiementSucces"));
const SuiviCommande = React.lazy(() => import("./pages/SuiviCommande"));
const RechercheSuivi = React.lazy(() => import("./pages/RechercheSuivi"));
const DevisCarteGrise = React.lazy(() => import("./pages/DevisCarteGrise"));
const Simulateur = React.lazy(() => import("./pages/Simulateur"));
const ResultatCarteGrise = React.lazy(() => import("./pages/ResultatCarteGrise"));
const DemarcheSimple = React.lazy(() => import("./pages/DemarcheSimple"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AllDemarches = React.lazy(() => import("./pages/admin/AllDemarches"));
const AdminDemarcheDetail = React.lazy(() => import("./pages/admin/DemarcheDetail"));
const ManageUsers = React.lazy(() => import("./pages/admin/ManageUsers"));
const ManageActions = React.lazy(() => import("./pages/admin/ManageActions"));
const ManageGarages = React.lazy(() => import("./pages/admin/ManageGarages"));
const ManageAccounts = React.lazy(() => import("./pages/admin/ManageAccounts"));
const GuestOrders = React.lazy(() => import("./pages/admin/GuestOrders"));
const GuestOrderDetail = React.lazy(() => import("./pages/admin/GuestOrderDetail"));
const AdminNotifications = React.lazy(() => import("./pages/admin/AdminNotifications"));
const HistoriquePaiements = React.lazy(() => import("./pages/admin/HistoriquePaiements"));
const TokenPurchases = React.lazy(() => import("./pages/admin/TokenPurchases"));
const ManageEmailTemplates = React.lazy(() => import("./pages/admin/ManageEmailTemplates"));
const ManagePricingConfig = React.lazy(() => import("./pages/admin/ManagePricingConfig"));
const TestEmail = React.lazy(() => import("./pages/admin/TestEmail"));
const AdminRevenus = React.lazy(() => import("./pages/admin/AdminRevenus"));
const ManageGuestActions = React.lazy(() => import("./pages/admin/ManageGuestActions"));
const AcheterJetons = React.lazy(() => import("./pages/AcheterJetons"));
const PaiementRecharge = React.lazy(() => import("./pages/PaiementRecharge"));
const PaiementRechargeSucces = React.lazy(() => import("./pages/PaiementRechargeSucces"));
const PaiementSoldeSucces = React.lazy(() => import("./pages/PaiementSoldeSucces"));
const PaiementClient = React.lazy(() => import("./pages/PaiementClient"));
const DemarchePage = React.lazy(() => import("./pages/DemarchePage"));
const PrixCarteGrise = React.lazy(() => import("./pages/PrixCarteGrise"));
const APropos = React.lazy(() => import("./pages/APropos"));
const MentionsLegales = React.lazy(() => import("./pages/MentionsLegales"));
const CGV = React.lazy(() => import("./pages/CGV"));
const PolitiqueConfidentialite = React.lazy(() => import("./pages/PolitiqueConfidentialite"));
const Cookies = React.lazy(() => import("./pages/Cookies"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
          <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/devis/:orderId" element={<DevisCarteGrise />} />
          <Route path="/simulateur" element={<Simulateur />} />
          <Route path="/resultat-carte-grise" element={<ResultatCarteGrise />} />
          <Route path="/demarche-simple" element={<DemarcheSimple />} />
        <Route path="/commander/:orderId" element={<CommanderSansCompte />} />
        <Route path="/paiement/:orderId" element={<PaiementGuestOrder />} />
        <Route path="/paiement-demarche/:demarcheId" element={<PaiementDemarche />} />
        <Route path="/paiement-succes/:demarcheId" element={<PaiementSucces />} />
        <Route path="/recherche-suivi" element={<RechercheSuivi />} />
        <Route path="/suivi/:trackingNumber" element={<SuiviCommande />} />
        <Route path="/paiement-client/:token" element={<PaiementClient />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nouvelle-demarche" element={<NouvelleDemarche />} />
            <Route path="/nouvelle-demarche/:draftId" element={<NouvelleDemarche />} />
            <Route path="/mes-demarches" element={<MesDemarches />} />
            <Route path="/mes-factures" element={<MesFactures />} />
            <Route path="/demarche/:id" element={<DemarcheDetail />} />
            <Route path="/garage-settings" element={<GarageSettings />} />
            <Route path="/acheter-jetons" element={<AcheterJetons />} />
            <Route path="/paiement-recharge" element={<PaiementRecharge />} />
            <Route path="/paiement-recharge-succes" element={<PaiementRechargeSucces />} />
            <Route path="/paiement-solde-succes/:demarcheId" element={<PaiementSoldeSucces />} />
            <Route path="/support" element={<Support />} />
            <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/demarches" element={<AllDemarches />} />
          <Route path="/admin/demarche/:id" element={<AdminDemarcheDetail />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/actions" element={<ManageActions />} />
          <Route path="/admin/manage-users" element={<ManageUsers />} />
          <Route path="/admin/manage-garages" element={<ManageGarages />} />
          <Route path="/admin/manage-accounts" element={<ManageAccounts />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/historique-paiements" element={<HistoriquePaiements />} />
          <Route path="/admin/token-purchases" element={<TokenPurchases />} />
          <Route path="/admin/email-templates" element={<ManageEmailTemplates />} />
          <Route path="/admin/pricing-config" element={<ManagePricingConfig />} />
          <Route path="/admin/test-email" element={<TestEmail />} />
          <Route path="/admin/revenus" element={<AdminRevenus />} />
          <Route path="/admin/guest-orders" element={<GuestOrders />} />
           <Route path="/admin/guest-order/:id" element={<GuestOrderDetail />} />
           <Route path="/admin/guest-actions" element={<ManageGuestActions />} />
            <Route path="/prix-carte-grise" element={<PrixCarteGrise />} />
            <Route path="/a-propos" element={<APropos />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/cgv" element={<CGV />} />
            <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/:slug" element={<DemarchePage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

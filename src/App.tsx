import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NouvelleDemarche from "./pages/NouvelleDemarche";
import MesDemarches from "./pages/MesDemarches";
import MesFactures from "./pages/MesFactures";
import DemarcheDetail from "./pages/DemarcheDetail";
import GarageSettings from "./pages/GarageSettings";
import Support from "./pages/Support";
import CommanderSansCompte from "./pages/CommanderSansCompte";
import PaiementGuestOrder from "./pages/PaiementGuestOrder";
import SuiviCommande from "./pages/SuiviCommande";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AllDemarches from "./pages/admin/AllDemarches";
import AdminDemarcheDetail from "./pages/admin/DemarcheDetail";
import ManageUsers from "./pages/admin/ManageUsers";
import ManageActions from "./pages/admin/ManageActions";
import ManageGarages from "./pages/admin/ManageGarages";
import ManageAccounts from "./pages/admin/ManageAccounts";
import GuestOrders from "./pages/admin/GuestOrders";
import GuestOrderDetail from "./pages/admin/GuestOrderDetail";
import ManageSubscriptions from "./pages/admin/ManageSubscriptions";
import AdminNotifications from "./pages/admin/AdminNotifications";
import HistoriquePaiements from "./pages/admin/HistoriquePaiements";
import ManageEmailTemplates from "./pages/admin/ManageEmailTemplates";
import ManagePricingConfig from "./pages/admin/ManagePricingConfig";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/commander/:orderId" element={<CommanderSansCompte />} />
        <Route path="/paiement/:orderId" element={<PaiementGuestOrder />} />
        <Route path="/suivi/:trackingNumber" element={<SuiviCommande />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/nouvelle-demarche" element={<NouvelleDemarche />} />
            <Route path="/mes-demarches" element={<MesDemarches />} />
            <Route path="/mes-factures" element={<MesFactures />} />
            <Route path="/demarche/:id" element={<DemarcheDetail />} />
            <Route path="/garage-settings" element={<GarageSettings />} />
            <Route path="/support" element={<Support />} />
            <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/demarches" element={<AllDemarches />} />
          <Route path="/admin/demarche/:id" element={<AdminDemarcheDetail />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/actions" element={<ManageActions />} />
          <Route path="/admin/manage-users" element={<ManageUsers />} />
          <Route path="/admin/manage-garages" element={<ManageGarages />} />
          <Route path="/admin/manage-accounts" element={<ManageAccounts />} />
          <Route path="/admin/manage-subscriptions" element={<ManageSubscriptions />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/historique-paiements" element={<HistoriquePaiements />} />
          <Route path="/admin/email-templates" element={<ManageEmailTemplates />} />
          <Route path="/admin/pricing-config" element={<ManagePricingConfig />} />
          <Route path="/admin/guest-orders" element={<GuestOrders />} />
          <Route path="/admin/guest-order/:id" element={<GuestOrderDetail />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Shield, CreditCard, CheckCircle, Lock, ShieldCheck } from "lucide-react";

export const TrustSection = () => {
  return (
    <section className="py-16 px-4 bg-primary text-primary-foreground">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Paiement sécurisé */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Paiement sécurisé
            </h3>
            <div className="flex flex-wrap items-center gap-3 bg-primary-foreground/10 p-4 rounded-xl border border-primary-foreground/20">
              <span className="bg-white text-[#1a1f71] font-bold text-sm px-3 py-1.5 rounded italic tracking-tight">VISA</span>
              <span className="bg-white rounded px-2 py-1">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none" aria-label="Mastercard">
                  <circle cx="12" cy="10" r="9" fill="#EB001B"/>
                  <circle cx="20" cy="10" r="9" fill="#F79E1B"/>
                  <path d="M16 3.13a9 9 0 0 1 0 13.74 9 9 0 0 1 0-13.74z" fill="#FF5F00"/>
                </svg>
              </span>
              <span className="bg-white text-[#003087] font-bold text-sm px-3 py-1.5 rounded">Pay<span className="text-[#009cde]">Pal</span></span>
              <span className="bg-white text-gray-700 font-medium text-xs px-3 py-1.5 rounded flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label="Google Pay">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" fill="currentColor"/>
                </svg>
                Pay
              </span>
              <span className="bg-white text-black font-medium text-xs px-3 py-1.5 rounded flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-label="Apple Pay">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Pay
              </span>
              <div className="text-sm font-medium bg-primary-foreground/10 px-3 py-1.5 rounded-lg">
                Paiement 4x
              </div>
            </div>
            
            {/* Sécurité des documents */}
            <div className="bg-primary-foreground/10 p-4 rounded-xl border border-primary-foreground/20">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-1">Vos documents sont protégés</p>
                  <p className="text-xs opacity-90">
                    Tous vos documents sont cryptés (SSL 256 bits) et automatiquement supprimés après le traitement de votre dossier. Votre vie privée est notre priorité.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Badge RGPD */}
            <div className="flex items-center gap-3 bg-primary-foreground/10 p-3 rounded-xl border border-primary-foreground/20">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-foreground/20 rounded-full flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Conforme RGPD</p>
                <p className="text-xs opacity-80">Protection des données personnelles</p>
              </div>
            </div>
          </div>

          {/* Habilitation */}
          <div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Service habilité
            </h3>
            <div className="bg-primary-foreground/10 p-4 rounded-xl border border-primary-foreground/20 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Habilitation Préfecture</p>
                  <p className="text-xs opacity-80">N° 285046</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Agrément Trésor Public</p>
                  <p className="text-xs opacity-80">N° 63198</p>
                </div>
              </div>
              
              {/* Bande tricolore */}
              <div className="h-1 w-full bg-gradient-to-r from-france-blue via-background to-france-red rounded-full" />
              
              <p className="text-xs opacity-90">
                Membre de la Fédération Française des Professionnels de la Carte Grise en Ligne
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

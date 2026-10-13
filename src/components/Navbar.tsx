import { Menu, X, LogIn, Star, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AVIS_GROUPE, noteEnFrancais } from "@/data/avisGroupe";
import { MenuDemarchesBureau, MenuDemarchesMobile } from "@/components/MenuDemarches";
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
      setIsOpen(false);
    }
  };
  return <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo officiel */}
          <button onClick={() => navigate("/")} className="flex items-center" aria-label="DiscountCarteGrise - Accueil">
            <span className="text-xl sm:text-2xl font-bold">
              <span className="bg-gradient-to-r from-[#0231C7] via-[#333333] to-[#E70203] bg-clip-text text-transparent">DiscountCarteGrise</span>
            </span>
          </button>

          {/* Stats centrées - Desktop */}
          <div className="hidden lg:flex items-center gap-8">
            {/* La note est celle de l'atelier du groupe, pas de ce service : elle
                est donc nommée, chiffrée et cliquable. Sans source vérifiable,
                on n'affiche rien — voir src/data/avisGroupe.ts. */}
            {AVIS_GROUPE && (
              <a
                href={AVIS_GROUPE.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="group flex items-center gap-2.5 whitespace-nowrap"
              >
                <div className="flex items-center gap-0.5 text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                <div className="leading-tight">
                  <div className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors">
                    {noteEnFrancais(AVIS_GROUPE.note)} / 5 · {AVIS_GROUPE.nombre} avis Google
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {AVIS_GROUPE.societe}, {AVIS_GROUPE.lien}
                  </div>
                </div>
              </a>
            )}
          </div>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <MenuDemarchesBureau />
            <button onClick={() => navigate("/simulateur")} className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200">
              Prix
            </button>
            <button onClick={() => navigate("/recherche-suivi")} className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200">
              Suivi
            </button>
            <Button onClick={() => navigate("/login-particulier")} variant="outline" size="default" className="flex items-center gap-2 font-semibold">
              <User className="h-4 w-4" />
              Espace Particulier
            </Button>
            <Button onClick={() => navigate("/login")} variant="default" size="default" className="flex items-center gap-2 font-semibold shadow-md">
              <LogIn className="h-4 w-4" />
              Espace Pro
            </Button>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden text-foreground hover:text-primary transition-colors" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation
            La barre est en `fixed` : le tiroir doit donc porter lui-même sa
            hauteur maximale et son défilement, sinon les vingt-et-une
            démarches poussent les boutons de connexion hors de l'écran, sans
            aucun moyen de les atteindre. Et ces boutons passent AVANT la
            liste : ce sont eux qu'on vient chercher le plus souvent. */}
        {isOpen && <div className="md:hidden max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain py-4 space-y-4 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => {
          setIsOpen(false);
          navigate("/login-particulier");
        }} variant="outline" className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold">
                <User className="h-4 w-4 shrink-0" />
                Particulier
              </Button>
              <Button onClick={() => {
          setIsOpen(false);
          navigate("/login");
        }} variant="default" className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold">
                <LogIn className="h-4 w-4 shrink-0" />
                Espace Pro
              </Button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => {
          setIsOpen(false);
          navigate("/simulateur");
        }} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary">
                Prix
              </button>
              <button onClick={() => {
          setIsOpen(false);
          navigate("/recherche-suivi");
        }} className="flex-1 rounded-md border border-border py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary">
                Suivi
              </button>
            </div>

            <MenuDemarchesMobile onNaviguer={() => setIsOpen(false)} />

            {AVIS_GROUPE && (
              <a
                href={AVIS_GROUPE.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block text-center"
              >
                <div className="flex items-center justify-center gap-0.5 text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                <div className="text-[11px] font-medium text-foreground">
                  {noteEnFrancais(AVIS_GROUPE.note)} / 5 · {AVIS_GROUPE.nombre} avis Google
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {AVIS_GROUPE.societe}, {AVIS_GROUPE.lien}
                </div>
              </a>
            )}
          </div>}
      </div>
    </nav>;
};
export default Navbar;
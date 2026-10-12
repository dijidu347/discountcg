import { Menu, X, LogIn, Star, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AVIS_GROUPE, noteEnFrancais } from "@/data/avisGroupe";
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
                className="text-center group"
              >
                <div className="flex items-center justify-center gap-0.5 text-yellow-500">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <div className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                  {noteEnFrancais(AVIS_GROUPE.note)} / 5 · {AVIS_GROUPE.societe}
                </div>
                <div className="text-[10px] text-muted-foreground/70">
                  {AVIS_GROUPE.lien} · {AVIS_GROUPE.nombre} avis Google
                </div>
              </a>
            )}
          </div>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => navigate("/")} className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200">
              Accueil
            </button>
            <button onClick={() => navigate("/carte-grise")} className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200">
              Démarches
            </button>
            <button onClick={() => navigate("/carte-grise-professionnel")} className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-200">
              Professionnels
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

        {/* Mobile Navigation */}
        {isOpen && <div className="md:hidden py-4 space-y-4 border-t border-border">
            {/* Stats mobile */}
            {AVIS_GROUPE && (
              <div className="flex items-center justify-around py-3 border-b border-border">
                <a
                  href={AVIS_GROUPE.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-0.5 text-yellow-500">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {noteEnFrancais(AVIS_GROUPE.note)} / 5 · {AVIS_GROUPE.societe}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70">
                    {AVIS_GROUPE.lien} · {AVIS_GROUPE.nombre} avis Google
                  </div>
                </a>
              </div>
            )}
            
            <button onClick={() => {
          setIsOpen(false);
          navigate("/");
        }} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Accueil
            </button>
            <button onClick={() => {
          setIsOpen(false);
          navigate("/carte-grise");
        }} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Démarches
            </button>
            <button onClick={() => {
          setIsOpen(false);
          navigate("/carte-grise-professionnel");
        }} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Professionnels
            </button>
            <button onClick={() => {
          setIsOpen(false);
          navigate("/recherche-suivi");
        }} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Suivi
            </button>
            <Button onClick={() => {
          setIsOpen(false);
          navigate("/login-particulier");
        }} variant="outline" size="lg" className="w-full flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              Espace Particulier
            </Button>
            <Button onClick={() => {
          setIsOpen(false);
          navigate("/login");
        }} variant="default" size="lg" className="w-full flex items-center justify-center gap-2">
              <LogIn className="h-4 w-4" />
              Espace Pro
            </Button>
          </div>}
      </div>
    </nav>;
};
export default Navbar;
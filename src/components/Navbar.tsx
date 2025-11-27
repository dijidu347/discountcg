import { Menu, X, LogIn, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [statsCount, setStatsCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const startDate = new Date('2017-01-01');
    const today = new Date();
    const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averagePerDay = 45;
    const baseCount = daysSinceStart * averagePerDay;
    const todayProgress = Math.floor(Math.random() * averagePerDay);
    setStatsCount(baseCount + todayProgress);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo officiel */}
          <div className="flex items-center gap-3">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/1200px-Flag_of_France.svg.png" 
              alt="Drapeau français"
              className="w-10 h-6 rounded-sm border border-border object-cover"
            />
            <div className="text-sm leading-tight hidden sm:block">
              <div className="font-semibold text-foreground">République Française</div>
              <div className="text-xs text-muted-foreground">Service Carte Grise habilité</div>
            </div>
          </div>

          {/* Stats centrées - Desktop */}
          <div className="hidden lg:flex items-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground">5.0 / 5 avis clients</div>
            </div>
            <div className="text-center">
              <div className="text-primary font-extrabold text-lg tracking-wide">
                {statsCount.toLocaleString('fr-FR')}+
              </div>
              <div className="text-[11px] text-muted-foreground">Démarches réalisées</div>
            </div>
          </div>

          {/* Navigation - Desktop */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate("/")} className="text-sm text-foreground hover:text-primary transition-colors">
              Accueil
            </button>
            <button onClick={() => scrollToSection("services")} className="text-sm text-foreground hover:text-primary transition-colors">
              Services
            </button>
            <button onClick={() => scrollToSection("tarifs")} className="text-sm text-foreground hover:text-primary transition-colors">
              Tarifs
            </button>
            <button onClick={() => navigate("/recherche-suivi")} className="text-sm text-foreground hover:text-primary transition-colors">
              Suivi
            </button>
            <Button 
              onClick={() => navigate("/login")} 
              variant="default"
              size="sm"
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Pro
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-foreground hover:text-primary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            {/* Stats mobile */}
            <div className="flex items-center justify-around py-3 border-b border-border">
              <div className="text-center">
                <div className="flex items-center justify-center gap-0.5 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" />
                  ))}
                </div>
                <div className="text-[10px] text-muted-foreground">5.0 / 5</div>
              </div>
              <div className="text-center">
                <div className="text-primary font-bold text-sm">{statsCount.toLocaleString('fr-FR')}+</div>
                <div className="text-[10px] text-muted-foreground">Démarches</div>
              </div>
            </div>
            
            <button onClick={() => { setIsOpen(false); navigate("/"); }} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Accueil
            </button>
            <button onClick={() => scrollToSection("services")} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Services
            </button>
            <button onClick={() => scrollToSection("tarifs")} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Tarifs
            </button>
            <button onClick={() => { setIsOpen(false); navigate("/recherche-suivi"); }} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Suivi
            </button>
            <Button 
              onClick={() => { setIsOpen(false); navigate("/login"); }} 
              variant="default"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Espace Professionnel
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

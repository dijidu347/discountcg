import { Menu, X, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center font-bold text-white text-xl">
              DCG
            </div>
            <span className="text-xl font-bold text-foreground">DiscountCG</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection("services")} className="text-foreground hover:text-primary transition-colors">
              Services
            </button>
            <button onClick={() => scrollToSection("process")} className="text-foreground hover:text-primary transition-colors">
              Processus
            </button>
            <button onClick={() => scrollToSection("tarifs")} className="text-foreground hover:text-primary transition-colors">
              Tarifs
            </button>
            <button onClick={() => scrollToSection("faq")} className="text-foreground hover:text-primary transition-colors">
              FAQ
            </button>
            <button onClick={() => navigate("/recherche-suivi")} className="text-foreground hover:text-primary transition-colors">
              Suivi
            </button>
            <Button variant="hero" size="lg" onClick={() => scrollToSection("contact")}>
              Commencer
            </Button>
            <Button 
              onClick={() => navigate("/login")} 
              variant="default"
              size="lg"
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Connexion
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
          <div className="md:hidden py-4 space-y-4">
            <button onClick={() => scrollToSection("services")} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Services
            </button>
            <button onClick={() => scrollToSection("process")} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Processus
            </button>
            <button onClick={() => scrollToSection("tarifs")} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Tarifs
            </button>
            <button onClick={() => scrollToSection("faq")} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              FAQ
            </button>
            <button onClick={() => {
              setIsOpen(false);
              navigate("/recherche-suivi");
            }} className="block w-full text-left text-foreground hover:text-primary transition-colors py-2">
              Suivi
            </button>
            <Button variant="hero" size="lg" className="w-full" onClick={() => scrollToSection("contact")}>
              Commencer
            </Button>
            <Button 
              onClick={() => {
                setIsOpen(false);
                navigate("/login");
              }} 
              variant="default"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              Connexion
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

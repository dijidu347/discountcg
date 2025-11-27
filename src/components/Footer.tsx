import { Facebook, Instagram, Linkedin, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Flag_of_France.svg/1200px-Flag_of_France.svg.png" 
                alt="Drapeau français"
                className="w-8 h-5 rounded-sm border border-secondary-foreground/20 object-cover"
              />
              <span className="text-xl font-bold">DiscountCG</span>
            </div>
            <p className="text-sm opacity-80">
              Vos démarches d'immatriculation simplifiées. Service rapide, professionnel et 100% sécurisé.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold mb-4">Services</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#services" className="hover:opacity-100 transition-opacity">Changement de titulaire</a></li>
              <li><a href="#services" className="hover:opacity-100 transition-opacity">Déclaration de cession</a></li>
              <li><a href="#services" className="hover:opacity-100 transition-opacity">Changement d'adresse</a></li>
              <li><a href="#tarifs" className="hover:opacity-100 transition-opacity">Tarifs</a></li>
            </ul>
          </div>

          {/* Informations */}
          <div>
            <h4 className="font-bold mb-4">Informations</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#process" className="hover:opacity-100 transition-opacity">Comment ça marche</a></li>
              <li><a href="#faq" className="hover:opacity-100 transition-opacity">FAQ</a></li>
              <li><a href="#contact" className="hover:opacity-100 transition-opacity">Contact</a></li>
              <li><button onClick={() => navigate("/login")} className="hover:opacity-100 transition-opacity">Espace Pro</button></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-bold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Mentions légales</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Conditions générales</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Cookies</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm opacity-70">
              © {currentYear} DiscountCG. Tous droits réservés.
            </p>
            <p className="text-sm opacity-70">
              Service agréé et conforme ANTS
            </p>
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <a
        href="#contact"
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
        aria-label="Chat avec nous"
      >
        <Mail className="w-6 h-6 text-primary-foreground" />
      </a>
    </footer>
  );
};

export default Footer;

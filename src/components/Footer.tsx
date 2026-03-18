import { useNavigate, Link } from "react-router-dom";

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
              <a href="mailto:contact@discountcartegrise.fr" className="opacity-70 hover:opacity-100 transition-opacity" aria-label="Email">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold mb-4">Services</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/carte-grise" className="hover:opacity-100 transition-opacity">Carte grise en ligne</Link></li>
              <li><Link to="/declaration-cession" className="hover:opacity-100 transition-opacity">Déclaration de cession</Link></li>
              <li><Link to="/changement-adresse-carte-grise" className="hover:opacity-100 transition-opacity">Changement d'adresse</Link></li>
              <li><Link to="/prix-carte-grise" className="hover:opacity-100 transition-opacity">Prix carte grise 2026</Link></li>
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
              <li><Link to="/simulateur" className="hover:opacity-100 transition-opacity">Simulateur prix carte grise</Link></li>
              <li><Link to="/a-propos" className="hover:opacity-100 transition-opacity">A propos</Link></li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-bold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/mentions-legales" className="hover:opacity-100 transition-opacity">Mentions légales</Link></li>
              <li><Link to="/cgv" className="hover:opacity-100 transition-opacity">Conditions générales</Link></li>
              <li><Link to="/politique-confidentialite" className="hover:opacity-100 transition-opacity">Politique de confidentialité</Link></li>
              <li><Link to="/cookies" className="hover:opacity-100 transition-opacity">Cookies</Link></li>
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
    </footer>
  );
};

export default Footer;

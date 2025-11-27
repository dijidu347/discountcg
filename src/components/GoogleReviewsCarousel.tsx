import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const reviews = [
  {
    name: "Mathieu S.",
    rating: 5,
    date: "Il y a 2 semaines",
    text: "Service impeccable ! Mon dossier de carte grise a été traité en moins de 24h comme promis. L'équipe est très réactive et professionnelle. Je recommande vivement !",
    avatar: "MS"
  },
  {
    name: "Laurie L.",
    rating: 5,
    date: "Il y a 1 mois",
    text: "Excellente expérience. Prix transparents, pas de mauvaise surprise. Le suivi en ligne est très pratique. Merci pour votre efficacité !",
    avatar: "LL"
  },
  {
    name: "Sophie B.",
    rating: 5,
    date: "Il y a 3 semaines",
    text: "Très satisfaite du service. J'avais des questions sur mes documents et le support client m'a aidée rapidement. Carte grise reçue en 48h. Top !",
    avatar: "SB"
  },
  {
    name: "Pierre L.",
    rating: 5,
    date: "Il y a 1 semaine",
    text: "Service au top ! Rapide, efficace et moins cher que la concurrence. Je ne passerai plus par personne d'autre pour mes démarches de carte grise.",
    avatar: "PL"
  },
  {
    name: "Isabelle M.",
    rating: 5,
    date: "Il y a 2 mois",
    text: "Parfait ! Processus simple et rapide. L'équipe du garage Jimmy 2x est très professionnelle. Je recommande à 100%.",
    avatar: "IM"
  }
];

export const GoogleReviewsCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrevious = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(prev => (prev - 1 + reviews.length) % reviews.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(prev => (prev + 1) % reviews.length);
  };

  return (
    <section className="py-16 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <img 
              alt="Garage Jimmy 2x" 
              className="w-12 h-12 rounded-full object-cover shadow-lg" 
              src="/lovable-uploads/a470949f-46f8-412d-b366-69941c3007fb.jpg" 
            />
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Avis Clients Google
            </h2>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="text-2xl font-bold text-foreground ml-2">5.0</span>
          </div>
          <p className="text-muted-foreground">
            Basé sur des centaines d'avis vérifiés
          </p>
        </div>

        <div className="max-w-3xl mx-auto relative">
          {/* Carrousel */}
          <div className="relative overflow-hidden rounded-2xl">
            <div 
              className="flex transition-transform duration-500 ease-out" 
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {reviews.map((review, idx) => (
                <div key={idx} className="w-full flex-shrink-0 px-4">
                  <Card className="border border-border shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                          {review.avatar}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground">
                            {review.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {review.date}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        "{review.text}"
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Contrôles */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPrevious} 
              className="w-10 h-10 rounded-full"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex gap-2">
              {reviews.map((_, idx) => (
                <button 
                  key={idx} 
                  onClick={() => {
                    setIsAutoPlaying(false);
                    setCurrentIndex(idx);
                  }} 
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? "bg-primary w-6" : "bg-primary/30 hover:bg-primary/50"
                  }`} 
                />
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNext} 
              className="w-10 h-10 rounded-full"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Lien vers Google */}
          <div className="text-center mt-6">
            <a 
              href="https://www.google.fr/search?sca_esv=a73f109bbcae9216&sxsrf=AE3TifMH8hCDAbm_y2mEw-YvpIEG7jzcdg:1763372759531&kgmid=/g/11w9zk40cx&q=Garage+Jimmy+2x" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Voir tous nos avis sur Google
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

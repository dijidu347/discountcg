// Schema.org structured data generators for SEO

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: "Discount Carte Grise",
    legalName: "DISCOUNT DRIVER SAS",
    url: "https://discountcartegrise.fr",
    logo: {
      "@type": "ImageObject",
      url: "https://discountcartegrise.fr/logo.png",
      width: 300,
      height: 60,
    },
    image: "https://discountcartegrise.fr/logo.png",
    description: "Service de carte grise en ligne agree par l'Etat. Traitement sous 24h. Habilitation Prefecture N° 285046.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "24 RUE DU CROUZET",
      addressLocality: "Gigean",
      postalCode: "34770",
      addressRegion: "Occitanie",
      addressCountry: "FR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: "contact@discountcartegrise.fr",
      contactType: "customer service",
      availableLanguage: "French",
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    priceRange: "€€",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      reviewCount: "5",
      bestRating: "5",
      worstRating: "1",
    },
    hasCredential: [
      {
        "@type": "GovernmentPermit",
        name: "Habilitation Prefecture",
        identifier: "285046",
        issuedBy: {
          "@type": "GovernmentOrganization",
          name: "Prefecture de l'Herault",
        },
      },
      {
        "@type": "GovernmentPermit",
        name: "Agrement Tresor Public",
        identifier: "63198",
        issuedBy: {
          "@type": "GovernmentOrganization",
          name: "Tresor Public",
        },
      },
    ],
  };
}

export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Discount Carte Grise",
    url: "https://discountcartegrise.fr",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://discountcartegrise.fr/simulateur?type={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "Discount Carte Grise",
      url: "https://discountcartegrise.fr",
    },
  };
}

export function serviceSchema(
  name: string,
  description: string,
  price: string,
  url: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: "Demarche d'immatriculation",
    provider: {
      "@type": "Organization",
      name: "Discount Carte Grise",
      url: "https://discountcartegrise.fr",
    },
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    url,
    termsOfService: "https://discountcartegrise.fr/cgv",
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "Discount Carte Grise",
      },
    },
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function breadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function webPageSchema(
  name: string,
  description: string,
  url: string,
  datePublished?: string,
  dateModified?: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
    publisher: {
      "@type": "Organization",
      name: "Discount Carte Grise",
    },
    inLanguage: "fr",
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
  };
}

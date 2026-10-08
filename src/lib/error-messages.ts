// Fonction centralisée pour traduire les erreurs en français

export const getSupabaseErrorMessage = (error: { message?: string; code?: string } | null | undefined): string => {
  if (!error?.message) {
    return "Une erreur inattendue s'est produite. Veuillez réessayer.";
  }
  
  const errorMessage = error.message.toLowerCase();
  const errorCode = error.code?.toLowerCase() || '';

  // Erreurs de contrainte unique (duplicate key)
  if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint') || errorMessage.includes('unique_violation')) {
    if (errorMessage.includes('garages_user_id_key')) {
      return "Un compte garage existe déjà pour cet utilisateur. Vous ne pouvez avoir qu'un seul garage par compte.";
    }
    if (errorMessage.includes('garages_siret_key') || errorMessage.includes('siret')) {
      return "Ce numéro SIRET est déjà enregistré. Un compte existe peut-être déjà avec ce SIRET.";
    }
    if (errorMessage.includes('garages_email_key') || (errorMessage.includes('garages') && errorMessage.includes('email'))) {
      return "Cette adresse email est déjà utilisée par un autre garage.";
    }
    if (errorMessage.includes('vehicules_garage_id_immatriculation')) {
      return "Ce véhicule est déjà enregistré dans votre garage.";
    }
    if (errorMessage.includes('user_roles')) {
      return "Ce rôle est déjà attribué à cet utilisateur.";
    }
    if (errorMessage.includes('email')) {
      return "Cette adresse email est déjà utilisée.";
    }
    return "Cette information existe déjà dans notre système. Veuillez vérifier vos données.";
  }

  // Erreur spécifique à la création de garage via trigger (message générique de Supabase)
  if (errorMessage.includes('database error') || errorMessage.includes('trigger') || errorMessage.includes('aborted')) {
    return "Une erreur s'est produite lors de la création du compte. Le SIRET ou l'email est peut-être déjà utilisé. Veuillez vérifier vos informations ou vous connecter si vous avez déjà un compte.";
  }

  // Erreurs RLS (Row Level Security)
  if (errorMessage.includes('row-level security') || errorMessage.includes('rls')) {
    if (errorMessage.includes('garages')) {
      return "Vous n'avez pas les permissions nécessaires pour effectuer cette action sur votre garage. Veuillez vous reconnecter.";
    }
    if (errorMessage.includes('demarches')) {
      return "Vous n'avez pas les permissions pour accéder à cette démarche.";
    }
    if (errorMessage.includes('documents')) {
      return "Vous n'avez pas les permissions pour accéder à ces documents.";
    }
    if (errorMessage.includes('vehicules')) {
      return "Vous n'avez pas les permissions pour accéder à ce véhicule.";
    }
    return "Vous n'avez pas les permissions nécessaires pour effectuer cette action. Veuillez vous reconnecter.";
  }

  // Erreurs de clé étrangère
  if (errorMessage.includes('foreign key') || errorMessage.includes('violates foreign key')) {
    return "Cette opération n'est pas possible car des données liées existent. Veuillez d'abord supprimer les éléments associés.";
  }

  // Erreurs de validation
  if (errorMessage.includes('not null') || errorMessage.includes('null value')) {
    return "Un champ obligatoire n'a pas été renseigné. Veuillez compléter tous les champs requis.";
  }

  if (errorMessage.includes('check constraint')) {
    return "Les données saisies ne respectent pas les règles de validation. Veuillez vérifier vos informations.";
  }

  // Erreurs d'authentification
  if (errorMessage.includes('invalid login credentials') || errorMessage.includes('invalid credentials')) {
    return "Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.";
  }
  if (errorMessage.includes('email not confirmed')) {
    return "Votre email n'a pas encore été confirmé. Veuillez vérifier votre boîte de réception.";
  }
  if (errorMessage.includes('user not found')) {
    return "Aucun compte n'existe avec cet email. Veuillez créer un compte.";
  }
  // Supabase ecrit « Email address "x@y.fr" is invalid » : le test sur la
  // chaine « invalid email » ne matchait pas, et le garage tombait sur le
  // message par defaut sans savoir quoi corriger.
  if (errorMessage.includes('invalid email') || (errorMessage.includes('email') && errorMessage.includes('invalid'))) {
    return "L'adresse email saisie n'est pas valide. Vérifiez qu'elle ne contient ni espace ni accent.";
  }
  // Message reel : « Password should be at least 6 characters. »
  if (
    (errorMessage.includes('password') && errorMessage.includes('too short')) ||
    errorMessage.includes('password should be at least') ||
    errorMessage.includes('password is too weak') ||
    errorMessage.includes('weak password')
  ) {
    return "Le mot de passe est trop court : il doit contenir au moins 6 caractères.";
  }
  if (errorMessage.includes('signup requires a valid password') || errorMessage.includes('should be at least')) {
    return "Le mot de passe saisi n'est pas valide. Il doit contenir au moins 6 caractères.";
  }
  if (errorMessage.includes('user already registered') || errorMessage.includes('already registered')) {
    return "Un compte existe déjà avec cette adresse email.";
  }
  // Apres plusieurs essais, Supabase repond « For security purposes, you can
  // only request this after 48 seconds » — sans la chaine « rate limit ».
  // Quelqu'un qui reessaie s'enferme donc dans une erreur qu'il ne comprend pas.
  if (
    errorMessage.includes('email rate limit exceeded') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('for security purposes') ||
    errorMessage.includes('over_email_send_rate_limit') ||
    errorCode.includes('over_email_send_rate_limit')
  ) {
    return "Trop de tentatives rapprochées. Patientez une minute, puis réessayez une seule fois.";
  }
  // Echec d'un declencheur en base pendant la creation du compte : le client
  // ne peut rien y faire, autant le dire et l'orienter vers nous.
  if (errorMessage.includes('database error saving new user') || errorMessage.includes('unexpected_failure')) {
    return "La création du compte a échoué côté serveur. Ce n'est pas lié à vos informations : contactez-nous à contact@discountcartegrise.fr et nous le créerons pour vous.";
  }
  if (errorMessage.includes('signups not allowed') || errorMessage.includes('email signups are disabled')) {
    return "Les inscriptions sont momentanément indisponibles. Contactez-nous à contact@discountcartegrise.fr.";
  }
  if (errorMessage.includes('auth session missing')) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }
  if (errorMessage.includes('jwt expired') || errorMessage.includes('token expired')) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }
  if (errorMessage.includes('session') && errorMessage.includes('expired')) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }
  if (errorMessage.includes('popup closed') || errorMessage.includes('popup_closed')) {
    return "La fenêtre de connexion a été fermée. Veuillez réessayer.";
  }
  if (errorMessage.includes('access denied') || errorMessage.includes('unauthorized')) {
    return "Accès refusé. Vous n'avez pas les permissions nécessaires.";
  }
  if (errorMessage.includes('too many requests')) {
    return "Trop de requêtes. Veuillez patienter quelques minutes.";
  }

  // Erreurs réseau
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('failed to fetch')) {
    return "Erreur de connexion au serveur. Veuillez vérifier votre connexion internet.";
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return "La requête a pris trop de temps. Veuillez réessayer.";
  }

  // Erreurs de stockage
  if (errorMessage.includes('bucket') || errorMessage.includes('storage')) {
    if (errorMessage.includes('not found')) {
      return "L'espace de stockage n'a pas été trouvé.";
    }
    if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
      return "Vous n'avez pas les permissions pour accéder à ce fichier.";
    }
    return "Erreur lors de l'accès au stockage de fichiers.";
  }

  // Erreurs de fichier/upload
  if (errorMessage.includes('file') || errorMessage.includes('upload')) {
    if (errorMessage.includes('too large') || errorMessage.includes('size')) {
      return "Le fichier est trop volumineux. Veuillez choisir un fichier plus petit.";
    }
    if (errorMessage.includes('type') || errorMessage.includes('format')) {
      return "Le format du fichier n'est pas accepté.";
    }
    return "Erreur lors du téléchargement du fichier.";
  }

  // Erreurs de paiement
  if (errorMessage.includes('payment') || errorMessage.includes('stripe') || errorMessage.includes('charge')) {
    if (errorMessage.includes('declined') || errorMessage.includes('refused')) {
      return "Le paiement a été refusé. Veuillez vérifier vos informations de paiement.";
    }
    if (errorMessage.includes('expired')) {
      return "La carte bancaire a expiré.";
    }
    if (errorMessage.includes('insufficient funds')) {
      return "Fonds insuffisants sur votre compte.";
    }
    return "Une erreur est survenue lors du paiement. Veuillez réessayer.";
  }

  // Erreurs de base de données générales
  if (errorMessage.includes('database') || errorMessage.includes('postgres') || errorCode.includes('pgrst')) {
    return "Une erreur de base de données s'est produite. Veuillez réessayer ou contacter le support.";
  }

  // Erreur par défaut
  return MESSAGE_PAR_DEFAUT;
};

// Message servi quand aucun cas n'a matche. Expose pour que les formulaires
// sachent qu'ils n'ont rien appris au client : dans ce cas seulement, ils
// joignent le detail technique, faute de quoi ni lui ni nous ne pouvons
// diagnostiquer — c'est exactement ce qui est arrive sur une inscription
// garage bloquee.
export const MESSAGE_PAR_DEFAUT =
  "Une erreur s'est produite. Veuillez réessayer ou contacter le support si le problème persiste.";

export const estMessageParDefaut = (message: string): boolean => message === MESSAGE_PAR_DEFAUT;

// Fonction pour les erreurs d'authentification spécifiquement
export const getAuthErrorMessage = (error: { message?: string; status?: number } | null | undefined): string => {
  return getSupabaseErrorMessage(error);
};

// Fonction pour formater un message d'erreur technique pour le support
export const formatTechnicalError = (error: { message?: string; code?: string } | null | undefined): string => {
  if (!error) return '';
  const parts = [];
  if (error.code) parts.push(`Code: ${error.code}`);
  if (error.message) parts.push(`Message: ${error.message}`);
  return parts.join(' - ');
};

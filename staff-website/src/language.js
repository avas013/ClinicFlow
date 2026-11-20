import { ref, watchEffect } from 'vue'

const storageKey = 'clinicflow-language'

function savedLanguage() {
  try {
    return localStorage.getItem(storageKey) === 'fr' ? 'fr' : 'en'
  } catch {
    return 'en'
  }
}

export const language = ref(savedLanguage())

watchEffect(() => {
  document.documentElement.lang = language.value
  try {
    localStorage.setItem(storageKey, language.value)
  } catch {
    // The selection still applies for this session.
  }
})

export function t(text, values = {}) {
  const message = language.value === 'fr' ? (french[text] ?? text) : text
  return message.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match)
}

export function countLabel(count, singular, plural) {
  return t(`{count} ${count === 1 ? singular : plural}`, { count })
}

export function formatDate(value) {
  const locale = language.value === 'fr' ? 'fr-CA' : 'en-CA'
  return new Date(`${value}T12:00:00`).toLocaleDateString(locale, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatTime(value) {
  const [hour, minute] = value.split(':').map(Number)
  if (language.value === 'fr') {
    return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('fr-CA', {
      hour: 'numeric', minute: '2-digit',
    })
  }
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function formatShift(shift) {
  if (language.value === 'en') return shift

  return shift.split(' – ').map(time => {
    const [clock, period] = time.split(' ')
    const [hour, minute] = clock.split(':').map(Number)
    return formatTime(`${hour % 12 + (period === 'PM' ? 12 : 0)}:${minute}`)
  }).join(' – ')
}

const french = Object.assign(Object.create(null), {
  'Language': 'Langue',
  'Staff Portal': 'Portail du personnel',
  'Email address': 'Adresse courriel',
  'Password': 'Mot de passe',
  'Sign in': 'Se connecter',
  'Log out': 'Se déconnecter',
  'Incorrect email or password.': 'Courriel ou mot de passe incorrect.',
  'Confirmed': 'Confirmé',
  'Date': 'Date',
  'Time': 'Heure',
  'Scheduled': 'Planifié',
  'Checked in': 'Arrivée confirmée',
  'In progress': 'En cours',
  'Completed': 'Terminé',
  'Cancelled': 'Annulé',
  'No show': 'Absence',
  'Consultation': 'Consultation',
  'Follow-up': 'Suivi',
  'Check-up': 'Bilan de santé',
  'Walk-in': 'Sans rendez-vous',
  'Family Physician': 'Médecin de famille',
  'Registered Nurse': 'Personnel infirmier autorisé',
  'Room {number}': 'Salle {number}',
  'Patient name': 'Nom du patient',
  'Visit type': 'Type de visite',
  'Save appointment': 'Enregistrer le rendez-vous',
  '{count} visit': '{count} visite',
  '{count} visits': '{count} visites',
  'Front Desk Portal': 'Portail de la réception',
  'Clinic operations': 'Gestion de la clinique',
  'Manage patient arrivals and appointments': 'Gérer les arrivées et les rendez-vous',
  'Close form': 'Fermer le formulaire',
  'New appointment': 'Nouveau rendez-vous',
  "Today's appointments": 'Rendez-vous du jour',
  'Waiting to be seen': 'En attente de consultation',
  'Cancellations': 'Annulations',
  'Book an appointment / add walk-in': 'Prendre rendez-vous ou ajouter une visite sans rendez-vous',
  'e.g. Morgan Chen': 'p. ex. Morgan Chen',
  'Clinician': 'Professionnel de la santé',
  'Check in immediately (walk-in)': 'Confirmer l’arrivée immédiatement (sans rendez-vous)',
  'Front desk sections': 'Sections de la réception',
  'Appointments': 'Rendez-vous',
  'Waiting list': 'Liste d’attente',
  'Appointment management': 'Gestion des rendez-vous',
  'Search appointments': 'Rechercher des rendez-vous',
  'Search patient, clinician or status': 'Rechercher par patient, professionnel ou état',
  'Patient': 'Patient',
  'Date & time': 'Date et heure',
  'Status': 'État',
  'Confirmation': 'Confirmation',
  'Actions': 'Actions',
  'Pending': 'En attente',
  'Check in': 'Confirmer l’arrivée',
  'Cancel': 'Annuler',
  'No-show': 'Marquer comme absent',
  'Restore': 'Rétablir',
  'No matching appointments.': 'Aucun rendez-vous correspondant.',
  'Live waiting list': 'Liste d’attente en direct',
  'Patients appear here after being checked in.': 'Les patients apparaissent ici après avoir confirmé leur arrivée.',
  '{count} waiting': '{count} en attente',
  'Move {patient} up': 'Monter {patient} dans la liste',
  'Move {patient} down': 'Descendre {patient} dans la liste',
  'Call patient': 'Appeler le patient',
  'No patients in the waiting list.': 'Aucun patient dans la liste d’attente.',
  'Manage appointments and waiting order from the staff portal.': 'Gérez les rendez-vous et l’ordre de passage dans le portail du personnel.',
  'Walk-in checked in for {patient}.': 'Arrivée sans rendez-vous confirmée pour {patient}.',
  'Appointment booked for {patient}.': 'Rendez-vous réservé pour {patient}.',
  'Administrator Portal': 'Portail d’administration',
  'Clinic overview': 'Aperçu de la clinique',
  'Operational insights': 'Indicateurs de fonctionnement',
  'Reporting period': 'Période du rapport',
  'All dates': 'Toutes les dates',
  'Today only': 'Aujourd’hui seulement',
  'Export CSV': 'Exporter le fichier CSV',
  'Total appointments': 'Nombre total de rendez-vous',
  'Selected reporting period': 'Période sélectionnée',
  'Finished visits': 'Visites terminées',
  'Cancellation rate': 'Taux d’annulation',
  '{count} cancellation': '{count} annulation',
  '{count} cancellations': '{count} annulations',
  'Administrator dashboard views': 'Sections du tableau de bord d’administration',
  'Overview': 'Aperçu',
  'Staff schedule': 'Horaire du personnel',
  'Reports': 'Rapports',
  'Appointments by clinician': 'Rendez-vous par professionnel',
  'Distribution across your staff': 'Répartition des rendez-vous dans votre équipe',
  'Appointment status': 'État des rendez-vous',
  'Live appointment summary': 'Résumé des rendez-vous en direct',
  'Assignments for {date}': 'Affectations du {date}',
  'Staff member': 'Membre du personnel',
  'Role': 'Rôle',
  'Hours': 'Heures',
  'Room': 'Salle',
  'Patient waiting list': 'Liste d’attente des patients',
  'Change the order in which checked-in patients are called.': 'Modifiez l’ordre d’appel des patients déjà arrivés.',
  'No patients currently waiting.': 'Aucun patient en attente.',
  'Appointment report': 'Rapport sur les rendez-vous',
  'Changes made in Front Desk and Doctor/Nurse appear here.': 'Les changements effectués par la réception et l’équipe de soins apparaissent ici.',
  'Download CSV': 'Télécharger le fichier CSV',
  'Type': 'Type',
  'Yes': 'Oui',
  'No': 'Non',
  'No records in this period.': 'Aucun dossier pour cette période.',
})

// Additional website navigation, patient, calendar, and synchronization text.
Object.assign(french, {
  "Today's visits": "Visites d’aujourd’hui",
  "Today's schedule": "Horaire d’aujourd’hui",
  "Patient website navigation": "Navigation du site pour les patients",
  "Not currently in line": "Aucune place dans la file d’attente",
  "Position {position} in line": "Position {position} dans la file d’attente",
  "Open patient profile": "Ouvrir le profil du patient",
  "View notifications": "Voir les notifications",
  "Upcoming": "À venir",
  "Appointment": "Rendez-vous",
  "Confirm appointment": "Confirmer le rendez-vous",
  "No upcoming appointments.": "Aucun rendez-vous à venir.",
  "View More": "Voir plus",
  "Patient actions": "Actions du patient",
  "Booking": "Réservation",
  "Surveys / Feedback": "Sondages et commentaires",
  "Queue": "File d’attente",
  "All Appointments": "Tous les rendez-vous",
  "All upcoming appointments": "Tous les rendez-vous à venir",
  "Back to Home": "Retour à l’accueil",
  "Choose a date and time to book an appointment.": "Choisissez une date et une heure pour prendre rendez-vous.",
  "Doctor": "Médecin",
  "Book appointment": "Prendre rendez-vous",
  "Tell us about your experience.": "Parlez-nous de votre expérience.",
  "Thank you for your feedback!": "Merci de vos commentaires!",
  "Rating": "Évaluation",
  "Select a rating": "Choisir une évaluation",
  "Excellent": "Excellent",
  "Good": "Bon",
  "Average": "Moyen",
  "Poor": "Faible",
  "Very poor": "Très faible",
  "Comments (optional)": "Commentaires (facultatif)",
  "Share your feedback...": "Faites-nous part de vos commentaires…",
  "Submit feedback": "Envoyer les commentaires",
  "Profile": "Profil",
  "Patient account": "Compte patient",
  "Manage your appointments and account from ClinicFlow.": "Gérez vos rendez-vous et votre compte dans ClinicFlow.",
  "Settings": "Paramètres",
  "Past appointments": "Rendez-vous passés",
  "No past appointments.": "Aucun rendez-vous passé.",
  "Back to Settings": "Retour aux paramètres",
  "Menu": "Menu",
  "Home": "Accueil",
  "Notifications": "Notifications",
  "Bottom navigation": "Navigation inférieure",
  "Back": "Retour",
  "Clinical workspace": "Espace clinique",
  "Good morning, care team": "Bonjour à l’équipe de soins",
  "View schedule for": "Voir l’horaire de",
  "Close booking": "Fermer la réservation",
  "Book patient appointment": "Prendre rendez-vous pour un patient",
  "Book appointment for patient": "Prendre rendez-vous pour un patient",
  "Assigned appointments": "Rendez-vous attribués",
  "Ready for appointment": "Prêts pour leur rendez-vous",
  "Currently being seen": "En consultation",
  "Doctor app views": "Vues de l’espace clinique",
  "Start visit": "Commencer la consultation",
  "Complete visit": "Terminer la consultation",
  "Mark no-show": "Indiquer une absence",
  "Book follow-up": "Réserver un suivi",
  "No appointments for this staff member today.": "Aucun rendez-vous pour ce membre du personnel aujourd’hui.",
  "My patients": "Mes patients",
  "No patients assigned.": "Aucun patient attribué.",
  "Visit history": "Historique des visites",
  "{date} at {time}": "{date} à {time}",
  "Rebook": "Reprendre rendez-vous",
  "No visit history yet.": "Aucun historique de visites.",
  "Manage appointments and waiting order from the ClinicFlow Website.": "Gérez les rendez-vous et l’ordre d’attente depuis le site Web ClinicFlow.",
  "Feedback": "Commentaires",
  "Appointment details": "Détails du rendez-vous",
  "Office address:": "Adresse de la clinique :",
  "Bring:": "À apporter :",
  "Your health card, a current medication list, and any relevant documents.": "Votre carte Santé, une liste à jour de vos médicaments et tout document pertinent.",
  "Appointment calendar": "Calendrier des rendez-vous",
  "No upcoming appointments on this date.": "Aucun rendez-vous à venir à cette date.",
  "View booking availability": "Voir les disponibilités",
  "No appointment notifications yet.": "Aucune notification de rendez-vous pour le moment.",
  "Mark as read": "Marquer comme lu",
  "Select an available 15-minute slot": "Choisissez un créneau disponible de 15 minutes",
  "Checking shared availability…": "Vérification des disponibilités partagées…",
  "Greyed-out times are already booked for this clinician.": "Les créneaux grisés sont déjà réservés pour ce professionnel.",
  "Appointment time": "Heure du rendez-vous",
  "Taken": "Réservé",
  "Could not check shared availability. The server will still block conflicts.": "Impossible de vérifier les disponibilités partagées. Le serveur bloquera tout de même les conflits.",
  "Your appointment": "Votre rendez-vous",
  "Times available": "Créneaux disponibles",
  "Previous month": "Mois précédent",
  "Next month": "Mois suivant",
  "appointment booked": "rendez-vous réservé",
  "times available": "créneaux disponibles",
  "no times available": "aucun créneau disponible",
  "Refresh": "Actualiser",
  "↻ Refresh": "↻ Actualiser",
  "♧ Notifications": "♧ Notifications",
  "Appointment synchronization": "Synchronisation des rendez-vous",
  "Last checked": "Dernière vérification",
  "ClinicFlow notifications": "Notifications ClinicFlow",
  "Appointment notifications": "Notifications de rendez-vous",
  "Enable desktop alerts": "Activer les notifications sur le bureau",
  "No new notifications.": "Aucune nouvelle notification.",
  "Mark read": "Marquer comme lu",
  "Notifications require Supabase and a real signed-in account.": "Les notifications nécessitent Supabase et une connexion à un compte réel.",
  "Local demo — not shared": "Démonstration locale — non partagée",
  "Refreshing…": "Actualisation…",
  "Saving…": "Enregistrement…",
  "Online · checking every 5 seconds": "En ligne · vérification toutes les 5 secondes",
  "Synced · checks every 5 seconds": "Synchronisé · vérification toutes les 5 secondes",
  "Not connected": "Non connecté",
  "Address will be provided by the clinic.": "L’adresse sera fournie par la clinique.",
  "Awaiting confirmation": "En attente de confirmation",
  "Choose a time": "Choisir une heure",
  "No times available": "Aucun créneau disponible",
  "That time is no longer available. Choose another time.": "Ce créneau n’est plus disponible. Choisissez une autre heure.",
  "That appointment slot is not available.": "Ce créneau n’est pas disponible.",
  "The chosen slot is no longer available.": "Le créneau choisi n’est plus disponible.",
  "Appointment booked. Please confirm your attendance.": "Rendez-vous réservé. Veuillez confirmer votre présence.",
  "Appointment confirmed.": "Rendez-vous confirmé.",
  "You are already on the home screen.": "Vous êtes déjà sur la page d’accueil.",
  "{count} upcoming appointment": "{count} rendez-vous à venir",
  "{count} upcoming appointments": "{count} rendez-vous à venir",
  "{count} past appointment": "{count} rendez-vous passé",
  "{count} past appointments": "{count} rendez-vous passés",
  "{count} visit": "{count} visite",
  "{count} visits": "{count} visites"
})

Object.assign(french, {
  '{count} appointment': '{count} rendez-vous',
  '{count} appointments': '{count} rendez-vous',
  '{count} patient': '{count} patient',
  '{count} patients': '{count} patients',
  '{count} record': '{count} dossier',
  '{count} records': '{count} dossiers',
  'Dr. Smith': 'Dr Smith',
  'Dr. Lee': 'Dr Lee',
  'Nurse Patel': 'Personnel infirmier Patel',
})

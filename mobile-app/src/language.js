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

const french = Object.assign(Object.create(null), {
  'Language': 'Langue',
  'Clinic hours': 'Heures d’ouverture',
  'Location': 'Adresse',
  'Phone': 'Téléphone',
  'Contact email': 'Courriel de contact',
  'Monday–Friday': 'Du lundi au vendredi',
  '9:00 AM–5:00 PM': '9 h à 17 h',
  'Patient and Care Team': 'Patients et équipe de soins',
  'Email': 'Courriel',
  'Email address': 'Adresse courriel',
  'Password': 'Mot de passe',
  'Sign in': 'Se connecter',
  'Log out': 'Se déconnecter',
  'Incorrect email or password.': 'Courriel ou mot de passe incorrect.',
  'Open patient profile': 'Ouvrir le profil du patient',
  'View notifications': 'Voir les notifications',
  'Upcoming': 'À venir',
  'Appointment': 'Rendez-vous',
  'Confirmed': 'Confirmé',
  'Awaiting confirmation': 'En attente de confirmation',
  'Confirm appointment': 'Confirmer le rendez-vous',
  'No upcoming appointments.': 'Aucun rendez-vous à venir.',
  'View More': 'Voir plus',
  'Patient actions': 'Actions du patient',
  'Booking': 'Prendre rendez-vous',
  'Surveys / Feedback': 'Sondages et commentaires',
  'Queue': 'File d’attente',
  'All Appointments': 'Tous les rendez-vous à venir',
  'All upcoming appointments': 'Tous les rendez-vous à venir',
  '{count} upcoming appointment': '{count} rendez-vous à venir',
  '{count} upcoming appointments': '{count} rendez-vous à venir',
  'Back to Home': 'Retour à l’accueil',
  'Choose a date and time to book an appointment.': 'Choisissez une date et une heure pour votre rendez-vous.',
  'Doctor': 'Professionnel de la santé',
  'Date': 'Date',
  'Time': 'Heure',
  'Book appointment': 'Réserver le rendez-vous',
  'Tell us about your experience.': 'Parlez-nous de votre expérience.',
  'Thank you for your feedback!': 'Merci pour vos commentaires!',
  'Rating': 'Note',
  'Select a rating': 'Choisissez une note',
  'Excellent': 'Excellent',
  'Good': 'Bon',
  'Average': 'Moyen',
  'Poor': 'Mauvais',
  'Very poor': 'Très mauvais',
  'Comments (optional)': 'Commentaires (facultatif)',
  'Share your feedback...': 'Donnez votre avis…',
  'Submit feedback': 'Envoyer les commentaires',
  'Profile': 'Profil',
  'Patient account': 'Compte patient',
  'Manage your appointments and account from ClinicFlow.': 'Gérez vos rendez-vous et votre compte dans ClinicFlow.',
  'Notifications': 'Notifications',
  'Upcoming appointment': 'Prochain rendez-vous',
  'Check your upcoming appointments and confirmation status.': 'Consultez vos prochains rendez-vous et leur état de confirmation.',
  'Menu': 'Menu',
  'Home': 'Accueil',
  'Settings': 'Paramètres',
  'Past appointments': 'Rendez-vous passés',
  'No past appointments.': 'Aucun rendez-vous passé.',
  'Seen by {clinician}': 'Soins reçus de {clinician}',
  'Assigned to {clinician}': 'Rendez-vous avec {clinician}',
  'Back to Settings': 'Retour aux paramètres',
  'Bottom navigation': 'Navigation du bas',
  'Back': 'Retour',
  'Not currently in line': 'Vous n’êtes pas dans la file d’attente',
  'Position {position} in line': 'Position {position} dans la file d’attente',
  'You are already on the home screen.': 'Vous êtes déjà à l’accueil.',
  'Choose an appointment date and time in the future.': 'Choisissez une date et une heure à venir.',
  'Appointment booked. Please confirm your attendance.': 'Rendez-vous réservé. Veuillez confirmer votre présence.',
  'Appointment confirmed.': 'Rendez-vous confirmé.',
  'Scheduled': 'Planifié',
  'Checked in': 'Arrivée confirmée',
  'In progress': 'En cours',
  'Completed': 'Terminé',
  'Cancelled': 'Annulé',
  'No show': 'Absence',
  'Consultation': 'Consultation',
  'Follow-up': 'Suivi',
  'Check-up': 'Bilan de santé',
  'Clinical workspace': 'Espace clinique',
  'Good morning, care team': 'Bonjour, équipe de soins',
  'View schedule for': 'Afficher l’horaire de',
  'Close booking': 'Fermer le formulaire',
  'Book patient appointment': 'Prendre rendez-vous pour un patient',
  'Book appointment for patient': 'Prendre rendez-vous pour un patient',
  'Patient name': 'Nom du patient',
  'Visit type': 'Type de visite',
  'Save appointment': 'Enregistrer le rendez-vous',
  "Today's visits": 'Visites du jour',
  'Assigned appointments': 'Rendez-vous attribués',
  'Ready for appointment': 'Prêt pour le rendez-vous',
  'Currently being seen': 'En consultation',
  'Doctor app views': 'Sections de l’application clinique',
  'Schedule': 'Horaire',
  'Patients': 'Patients',
  'History': 'Historique',
  "Today's schedule": 'Horaire du jour',
  '{count} appointment': '{count} rendez-vous',
  '{count} appointments': '{count} rendez-vous',
  'Start visit': 'Commencer la visite',
  'Complete visit': 'Terminer la visite',
  'Mark no-show': 'Marquer comme absent',
  'Book follow-up': 'Planifier un suivi',
  'No appointments for this staff member today.': 'Aucun rendez-vous pour cette personne aujourd’hui.',
  'My patients': 'Mes patients',
  '{count} patient': '{count} patient',
  '{count} patients': '{count} patients',
  '{count} visit': '{count} visite',
  '{count} visits': '{count} visites',
  'No patients assigned.': 'Aucun patient attribué.',
  'Visit history': 'Historique des visites',
  '{count} record': '{count} dossier',
  '{count} records': '{count} dossiers',
  '{date} at {time}': '{date} à {time}',
  'Rebook': 'Reprendre rendez-vous',
  'No visit history yet.': 'Aucune visite dans l’historique.',
  'Appointment booked for {patient}. The patient can now confirm it.': 'Rendez-vous réservé pour {patient}. Le patient peut maintenant le confirmer.',
  'Follow-up for {patient} booked for {date}. The patient can confirm it in their app.': 'Rendez-vous de suivi réservé pour {patient} le {date}. Le patient peut le confirmer dans son application.',
})

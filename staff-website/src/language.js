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

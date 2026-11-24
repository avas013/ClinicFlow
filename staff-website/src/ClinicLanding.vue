<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { language } from './language.js'

const landingFrench = {
  'Welcome': 'Bienvenue',
  'Care that fits into your day.': 'Des soins adaptés à votre quotidien.',
  'A little less admin. More room for care.': 'Moins de démarches. Plus de place aux soins.',
  'Let’s find your next step.': 'Trouvez votre prochaine étape.',
  'Welcome back.': 'Heureux de vous retrouver.',
  'Privacy & your information': 'Confidentialité et renseignements personnels',
  'Using this website': 'Utilisation du site Web',
  'Access that works for you.': 'Un accès adapté à vos besoins.',
  'Find a time': 'Choisissez un créneau',
  'Check available dates and choose a visit that fits your schedule.': 'Consultez les disponibilités et choisissez un rendez-vous qui convient à votre horaire.',
  'Confirm your visit': 'Confirmez votre visite',
  'Review your appointment details and confirm your attendance.': 'Vérifiez les détails de votre rendez-vous et confirmez votre présence.',
  'Know what’s next': 'Suivez les prochaines étapes',
  'See upcoming appointments and check your place in the clinic queue.': 'Consultez vos prochains rendez-vous et votre place dans la file d’attente.',
  'Skip to content': 'Passer au contenu',
  'home': 'accueil',
  'Main navigation': 'Navigation principale',
  'Home': 'Accueil',
  'About': 'À propos',
  'Help': 'Aide',
  'Sign in': 'Se connecter',
  'Language': 'Langue',
  'Your clinic, connected': 'Votre clinique, à portée de main',
  'Care that fits': 'Des soins adaptés',
  'into your day': 'à votre quotidien',
  'Appointments, updates, and your care team. A simpler way to stay connected with your clinic, all in one place.': 'Rendez-vous, mises à jour et équipe de soins. Restez en contact avec votre clinique, simplement et au même endroit.',
  'Sign in to your account': 'Connectez-vous à votre compte',
  'Get to know us': 'Découvrez-nous',
  'New here?': 'Première visite?',
  'Find out how to get access': 'Découvrez comment obtenir un accès',
  'An illustration of the appointment experience': 'Illustration du suivi d’un rendez-vous',
  'Clarity at every step': 'Des étapes claires',
  'Your appointment, at a glance': 'Votre rendez-vous en un coup d’œil',
  'VISIT': 'VISITE',
  'A time that works for you': 'Un horaire qui vous convient',
  'With your clinic care team': 'Avec l’équipe de soins de votre clinique',
  'Appointment confirmed': 'Rendez-vous confirmé',
  'Less time keeping track.': 'Moins de suivi à faire.',
  'More time for you.': 'Plus de temps pour vous.',
  'Illustrative appointment preview': 'Exemple de présentation d’un rendez-vous',
  'Built around your visit.': 'Conçu pour votre visite.',
  'Patients': 'Patients',
  'Doctors & nurses': 'Médecins et personnel infirmier',
  'Clinic staff': 'Personnel de la clinique',
  'A clearer path to your next visit': 'Préparez votre prochaine visite simplement',
  'Your next appointment,': 'Votre prochain rendez-vous,',
  'without the back and forth.': 'sans les allers-retours.',
  'For the people behind your care': 'Pour les personnes qui prennent soin de vous',
  'One connected clinic.': 'Une clinique connectée.',
  'A more organised day.': 'Une journée mieux organisée.',
  'Doctors and nurses can review their schedules. Front desk staff can manage arrivals, while administrators keep an overview of clinic activity.': 'Les médecins et le personnel infirmier consultent leur horaire. La réception gère les arrivées et les administrateurs suivent les activités de la clinique.',
  'Learn about ClinicFlow': 'Découvrez ClinicFlow',
  'Appointment planning': 'Planification des rendez-vous',
  'Clear visit updates': 'Des mises à jour claires sur votre visite',
  'A workspace for each role': 'Un espace de travail pour chaque rôle',
  'Ready for your next step?': 'Prêt pour la prochaine étape?',
  'Sign in to see your appointments or open your clinic workspace.': 'Connectez-vous pour consulter vos rendez-vous ou accéder à votre espace de travail.',
  'Sign in to ClinicFlow': 'Se connecter à ClinicFlow',
  'A shared place for patients and clinic teams to keep the everyday details of a visit organised.': 'Un espace commun pour aider les patients et les équipes à organiser les détails de chaque visite.',
  'Care starts with clarity.': 'Des soins qui commencent par la clarté.',
  'Knowing when your appointment is, whether it is confirmed, and where to go next should feel straightforward. ClinicFlow brings those details together so patients can prepare for their visit.': 'La date de votre rendez-vous, sa confirmation et les prochaines étapes devraient être faciles à trouver. ClinicFlow rassemble ces renseignements pour vous aider à préparer votre visite.',
  'For clinic teams, dedicated workspaces help doctors, nurses, front desk staff, and administrators follow appointments through the day.': 'Des espaces adaptés permettent aux médecins, au personnel infirmier, à la réception et aux administrateurs de suivre les rendez-vous tout au long de la journée.',
  'Open your workspace': 'Accédez à votre espace de travail',
  'Our approach': 'Notre approche',
  'Simple to find.': 'Facile à trouver.',
  'Easy to follow.': 'Simple à suivre.',
  'Clear language, familiar navigation, and visible appointment updates help everyone know their next step.': 'Un langage clair, une navigation familière et des mises à jour visibles aident chacun à connaître sa prochaine étape.',
  'Before you visit': 'Avant votre visite',
  'Location': 'Emplacement',
  'Clinic location will be added here once confirmed.': 'L’adresse de la clinique sera ajoutée après confirmation.',
  'Opening hours': 'Heures d’ouverture',
  'Phone': 'Téléphone',
  'Email': 'Courriel',
  'Opening hours will be added here once confirmed.': 'Les heures d’ouverture seront ajoutées après confirmation.',
  'Questions about your visit?': 'Des questions sur votre visite?',
  'Use the help page for account guidance and ways to contact the clinic.': 'Consultez la page d’aide pour obtenir des renseignements sur votre compte et les moyens de joindre la clinique.',
  'Visit help & resources': 'Consultez l’aide et les ressources',
  'Your ClinicFlow account': 'Votre compte ClinicFlow',
  'Sign in to manage your appointments or access your care team workspace.': 'Connectez-vous pour gérer vos rendez-vous ou accéder à l’espace de votre équipe de soins.',
  'Need help getting started?': 'Besoin d’aide pour commencer?',
  'Account access guidance': 'Aide pour accéder à votre compte',
  'Back to Home': 'Retour à l’accueil',
  'Connect your existing sign-in form': 'Ajoutez votre formulaire de connexion',
  'The landing page is ready. Place the current login form in this sign-in slot to keep the existing account system.': 'La page d’accueil est prête. Ajoutez le formulaire de connexion existant dans cet espace pour conserver le système de comptes.',
  'Help & resources': 'Aide et ressources',
  'Find account guidance, prepare for your visit, or learn where to ask a question.': 'Obtenez de l’aide pour votre compte, préparez votre visite ou découvrez où poser une question.',
  'Common questions': 'Questions fréquentes',
  'How do I sign up or get an account?': 'Comment s’inscrire ou obtenir un compte?',
  'Use the account provided by your clinic. If you have not received access, ask the front desk about registration before trying to sign in.': 'Utilisez le compte fourni par votre clinique. Si vous n’avez pas reçu d’accès, renseignez-vous auprès de la réception avant d’essayer de vous connecter.',
  'Online self-registration is not currently available.': 'L’inscription autonome en ligne n’est pas disponible pour le moment.',
  'How do I book or confirm a visit?': 'Comment prendre ou confirmer un rendez-vous?',
  'Sign in as a patient and open Booking to choose an available appointment. Upcoming visits appear in your account, where you can confirm attendance.': 'Connectez-vous en tant que patient et ouvrez Réservation pour choisir un créneau disponible. Vos prochains rendez-vous apparaissent dans votre compte, où vous pouvez confirmer votre présence.',
  'Go to sign in': 'Accéder à la connexion',
  'What if I cannot sign in?': 'Que faire si la connexion échoue?',
  'Check your email address and password for typing errors. If you still need help, contact the clinic’s front desk. Never send your password in an inquiry.': 'Vérifiez votre adresse courriel et votre mot de passe. Si le problème persiste, contactez la réception. Ne transmettez jamais votre mot de passe dans une demande.',
  'Can I send a medical question here?': 'Peut-on poser une question médicale ici?',
  'Discuss medical questions directly with your care team through the clinic’s approved contact method. General account inquiries should exclude symptoms, health records, and other personal health information.': 'Adressez vos questions médicales directement à votre équipe de soins par un moyen approuvé par la clinique. N’incluez ni symptômes, ni dossiers médicaux, ni autres renseignements personnels sur la santé dans les demandes générales.',
  'General inquiries': 'Demandes générales',
  'Talk to the clinic.': 'Communiquez avec la clinique.',
  'For appointments, registration, or accessibility support, reach out to the front desk.': 'Pour les rendez-vous, l’inscription ou les besoins d’accessibilité, contactez la réception.',
  'Clinic contact details are awaiting confirmation.': 'Les coordonnées de la clinique sont en attente de confirmation.',
  'Please keep general inquiries free of medical or sensitive personal information.': 'N’incluez aucun renseignement médical ou personnel sensible dans les demandes générales.',
  'Trusted resources': 'Ressources fiables',
  'Health811': 'Santé811',
  'Ontario health information and service navigation': 'Renseignements sur la santé et les services en Ontario',
  'Health privacy rights': 'Droits relatifs à la confidentialité des renseignements sur la santé',
  'Information and Privacy Commissioner of Ontario': 'Commissaire à l’information et à la protection de la vie privée de l’Ontario',
  'Ontario’s health privacy law': 'Loi ontarienne sur la confidentialité des renseignements sur la santé',
  'Personal Health Information Protection Act': 'Loi sur la protection des renseignements personnels sur la santé',
  'Help & information': 'Aide et renseignements',
  'Keep health information in the right place.': 'Utilisez les bons moyens pour vos renseignements de santé.',
  'Use fictional information when exploring this student prototype. Ask the clinic which approved channel to use for personal health information.': 'Utilisez des renseignements fictifs pour explorer ce prototype étudiant. Demandez à la clinique quel moyen approuvé utiliser pour vos renseignements personnels sur la santé.',
  'A clinic-specific privacy notice, including its information practices and privacy contact, must be supplied by the clinic before real patient information is collected.': 'Avant toute collecte de véritables renseignements sur les patients, la clinique doit fournir un avis de confidentialité précisant ses pratiques et la personne responsable de la protection de la vie privée.',
  'Understand your rights': 'Comprenez vos droits',
  'The Information and Privacy Commissioner of Ontario provides guidance on access, consent, and health information privacy.': 'Le Commissaire à l’information et à la protection de la vie privée de l’Ontario fournit des renseignements sur l’accès, le consentement et la confidentialité des renseignements sur la santé.',
  'Read the IPC’s health privacy guidance': 'Consultez les renseignements du Commissaire sur la confidentialité',
  'Appointment and account information': 'Renseignements sur les rendez-vous et les comptes',
  'ClinicFlow supports appointment administration. Information shown on this website does not replace advice from a qualified healthcare professional.': 'ClinicFlow facilite la gestion des rendez-vous. Les renseignements du site ne remplacent pas les conseils d’un professionnel de la santé qualifié.',
  'Ask the clinic directly about appointment changes, fees, eligibility, or services. Clinic-specific website terms and policies are awaiting confirmation.': 'Adressez-vous à la clinique pour toute question sur les modifications de rendez-vous, les frais, l’admissibilité ou les services. Les conditions et politiques propres à la clinique sont en attente de confirmation.',
  'Use the help page for account guidance and links to external resources.': 'Consultez la page d’aide pour votre compte et les liens vers des ressources externes.',
  'Navigate in the way that suits you.': 'Naviguez à votre façon.',
  'Use a keyboard to move between links and controls. The page supports browser text zoom, small screens, and your device’s reduced-motion preference.': 'Utilisez un clavier pour passer d’un lien ou d’une commande à l’autre. La page prend en charge le zoom du navigateur, les petits écrans et la préférence de réduction des animations de votre appareil.',
  'Need another way to access care?': 'Besoin d’un autre moyen d’accéder aux soins?',
  'Ask the clinic’s front desk about assistance or an alternative way to book a visit. Contact details will be added once confirmed.': 'Renseignez-vous auprès de la réception pour obtenir de l’aide ou prendre rendez-vous autrement. Les coordonnées seront ajoutées après confirmation.',
  'Back to help & resources': 'Retour à l’aide et aux ressources',
  'A clearer connection': 'Un lien plus simple',
  'to your clinic.': 'avec votre clinique.',
  'Explore': 'Découvrir',
  'About the clinic': 'À propos de la clinique',
  'Here to help': 'À votre service',
  'New patient access': 'Accès pour les nouveaux patients',
  'Your information': 'Vos renseignements',
  'Privacy information': 'Renseignements sur la confidentialité',
  'Website use': 'Utilisation du site',
  'Accessibility': 'Accessibilité',
  '· Student prototype': '· Prototype étudiant',
  'For a medical emergency, call': 'En cas d’urgence médicale, composez le',
}

function landingText(text) {
  return language.value === 'fr' ? (landingFrench[text] ?? text) : text
}


// Supply verified clinic details when they are available.
const props = defineProps({
  clinicName: { type: String, default: 'ClinicFlow' },
  contactEmail: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  hours: { type: String, default: '' },
})
const allowedPages = ['home', 'about', 'help', 'signin', 'privacy', 'terms', 'accessibility']
const page = ref('home')
const main = ref(null)
const helpTopic = ref('')
const year = new Date().getFullYear()
const title = computed(() => ({
  home: landingText("Care that fits into your day."),
  about: landingText("A little less admin. More room for care."),
  help: landingText("Let’s find your next step."),
  signin: landingText("Welcome back."),
  privacy: landingText("Privacy & your information"),
  terms: landingText("Using this website"),
  accessibility: landingText("Access that works for you."),
}[page.value]))
const steps = computed(() => [
  ['Find a time', 'Check available dates and choose a visit that fits your schedule.'],
  ['Confirm your visit', 'Review your appointment details and confirm your attendance.'],
  ['Know what’s next', 'See upcoming appointments and check your place in the clinic queue.'],
].map(step => step.map(landingText)))
function readPage() {
  const requested = window.location.hash.slice(1)
  page.value = allowedPages.includes(requested) ? requested : 'home'
  document.title = `${page.value === 'home' ? landingText('Welcome') : title.value} | ${props.clinicName}`
}
async function navigate() {
  readPage()
  await nextTick()
  main.value?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: 'instant' })
}
watch(language, () => {
  document.title = `${page.value === 'home' ? landingText('Welcome') : title.value} | ${props.clinicName}`
})
function requestAccess() {
  helpTopic.value = 'access'
}
onMounted(() => {
  readPage()
  window.addEventListener('hashchange', navigate)
})
onUnmounted(() => window.removeEventListener('hashchange', navigate))
</script>

<template>
  <div class="clinic-landing">
    <a class="skip-link" href="#main" @click.prevent="main?.focus()">{{ landingText("Skip to content") }}</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="#home" :aria-label="clinicName + ' ' + landingText('home')"><span class="brand-mark" aria-hidden="true">+</span>{{ clinicName }}</a>
        <nav :aria-label="landingText('Main navigation')">
          <a href="#home" :aria-current="page === 'home' ? 'page' : undefined">{{ landingText("Home") }}</a>
          <a href="#about" :aria-current="page === 'about' ? 'page' : undefined">{{ landingText("About") }}</a>
          <a href="#help" :aria-current="page === 'help' ? 'page' : undefined">{{ landingText("Help") }}</a>
        </nav>
        <label class="landing-language">
          <span>{{ landingText('Language') }}</span>
          <select v-model="language">
            <option value="en" lang="en">English</option>
            <option value="fr" lang="fr">Français</option>
          </select>
        </label>
        <a class="button header-signin" href="#signin">{{ landingText("Sign in") }}</a>
      </div>
    </header>

    <main id="main" ref="main" tabindex="-1" :key="page" class="page">
      <template v-if="page === 'home'">
        <section class="hero container" aria-labelledby="home-heading">
          <div class="hero-copy">
            <p class="eyebrow">{{ landingText("Your clinic, connected") }}</p>
            <h1 id="home-heading">{{ landingText("Care that fits") }}<br>{{ landingText("into your day") }}<span>.</span></h1>
            <p class="lead">{{ landingText("Appointments, updates, and your care team. A simpler way to stay connected with your clinic, all in one place.") }}</p>
            <div class="landing-clinic-info" aria-label="Clinic information">
              <p><strong>{{ landingText("Opening hours") }}:</strong> {{ hours }}</p>
              <p><strong>{{ landingText("Location") }}:</strong> {{ address }}</p>
              <p><strong>{{ landingText("Phone") }}:</strong> {{ phone }}</p>
              <p><strong>{{ landingText("Email") }}:</strong> {{ contactEmail }}</p>
            </div>
            <div class="actions"><a class="button" href="#signin">{{ landingText("Sign in to your account") }}</a><a class="button secondary" href="#about">{{ landingText("Get to know us") }}</a></div>
            <p class="new-patient">{{ landingText("New here?") }} <a href="#help" @click="requestAccess">{{ landingText("Find out how to get access") }}</a></p>
          </div>
          <div class="hero-visual" :aria-label="landingText('An illustration of the appointment experience')">
            <div class="visual-heading"><span class="visual-cross" aria-hidden="true">+</span><span>{{ landingText("Clarity at every step") }}</span></div>
            <div class="appointment-example">
              <p class="example-label">{{ landingText("Your appointment, at a glance") }}</p>
              <div class="example-date"><div class="calendar-symbol" aria-hidden="true"><span>{{ landingText("VISIT") }}</span><b>✓</b></div><div><strong>{{ landingText("A time that works for you") }}</strong><p>{{ landingText("With your clinic care team") }}</p></div></div>
              <div class="example-status"><span aria-hidden="true">✓</span> {{ landingText("Appointment confirmed") }}</div>
            </div>
            <div class="visual-caption"><span class="caption-line" aria-hidden="true"></span><p>{{ landingText("Less time keeping track.") }}<br><strong>{{ landingText("More time for you.") }}</strong></p></div>
            <p class="illustration-label">{{ landingText("Illustrative appointment preview") }}</p>
          </div>
        </section>
        <section class="intro-strip">
          <div class="container strip-inner"><p>{{ landingText("Built around your visit.") }}</p><span>{{ landingText("Patients") }}</span><span>{{ landingText("Doctors & nurses") }}</span><span>{{ landingText("Clinic staff") }}</span></div>
        </section>
        <section class="container section" aria-labelledby="simple-heading">
          <div class="section-heading"><p class="eyebrow">{{ landingText("A clearer path to your next visit") }}</p><h2 id="simple-heading">{{ landingText("Your next appointment,") }}<br>{{ landingText("without the back and forth.") }}</h2></div>
          <div class="steps">
            <article v-for="(step, index) in steps" :key="step[0]">
              <span class="step-icon" aria-hidden="true">{{ ['▦', '✓', '≡'][index] }}</span><h3>{{ step[0] }}</h3><p>{{ step[1] }}</p>
            </article>
          </div>
        </section>
        <section class="container care-panel">
          <div><p class="eyebrow">{{ landingText("For the people behind your care") }}</p><h2>{{ landingText("One connected clinic.") }}<br>{{ landingText("A more organised day.") }}</h2><p>{{ landingText("Doctors and nurses can review their schedules. Front desk staff can manage arrivals, while administrators keep an overview of clinic activity.") }}</p><a class="text-link" href="#about">{{ landingText("Learn about ClinicFlow") }}</a></div>
          <div class="care-list"><p><span aria-hidden="true">✓</span> {{ landingText("Appointment planning") }}</p><p><span aria-hidden="true">✓</span> {{ landingText("Clear visit updates") }}</p><p><span aria-hidden="true">✓</span> {{ landingText("A workspace for each role") }}</p></div>
        </section>
        <section class="container final-cta"><h2>{{ landingText("Ready for your next step?") }}</h2><p>{{ landingText("Sign in to see your appointments or open your clinic workspace.") }}</p><a href="#signin" class="button">{{ landingText("Sign in to ClinicFlow") }}</a></section>
      </template>

      <template v-else-if="page === 'about'">
        <section class="container inner-hero"><p class="eyebrow">{{ landingText("About") }} {{ clinicName }}</p><h1>{{ title }}</h1><p class="lead">{{ landingText("A shared place for patients and clinic teams to keep the everyday details of a visit organised.") }}</p></section>
        <section class="container about-grid section">
          <div><h2>{{ landingText("Care starts with clarity.") }}</h2><p>{{ landingText("Knowing when your appointment is, whether it is confirmed, and where to go next should feel straightforward. ClinicFlow brings those details together so patients can prepare for their visit.") }}</p><p>{{ landingText("For clinic teams, dedicated workspaces help doctors, nurses, front desk staff, and administrators follow appointments through the day.") }}</p><a href="#signin" class="text-link">{{ landingText("Open your workspace") }}</a></div>
          <aside class="about-note"><p class="eyebrow">{{ landingText("Our approach") }}</p><h2>{{ landingText("Simple to find.") }}<br>{{ landingText("Easy to follow.") }}</h2><p>{{ landingText("Clear language, familiar navigation, and visible appointment updates help everyone know their next step.") }}</p></aside>
        </section>
        <section class="container section"><h2>{{ landingText("Before you visit") }}</h2><div class="detail-grid"><article><h3>{{ landingText("Location") }}</h3><p>{{ address || landingText('Clinic location will be added here once confirmed.') }}</p></article><article><h3>{{ landingText("Opening hours") }}</h3><p>{{ hours || landingText('Opening hours will be added here once confirmed.') }}</p></article><article><h3>{{ landingText("Questions about your visit?") }}</h3><p>{{ landingText("Use the help page for account guidance and ways to contact the clinic.") }}</p><a href="#help" class="text-link">{{ landingText("Visit help & resources") }}</a></article></div></section>
      </template>

      <template v-else-if="page === 'signin'">
        <section class="container signin-layout">
          <div><p class="eyebrow">{{ landingText("Your ClinicFlow account") }}</p><h1>{{ title }}</h1><p class="lead">{{ landingText("Sign in to manage your appointments or access your care team workspace.") }}</p><p>{{ landingText("Need help getting started?") }} <a href="#help" @click="requestAccess">{{ landingText("Account access guidance") }}</a></p><a href="#home" class="text-link">{{ landingText("Back to Home") }}</a></div>
          <div class="signin-slot"><slot name="signin"><h2>{{ landingText("Connect your existing sign-in form") }}</h2><p>{{ landingText("The landing page is ready. Place the current login form in this sign-in slot to keep the existing account system.") }}</p></slot></div>
        </section>
      </template>

      <template v-else-if="page === 'help'">
        <section class="container inner-hero"><p class="eyebrow">{{ landingText("Help & resources") }}</p><h1>{{ title }}</h1><p class="lead">{{ landingText("Find account guidance, prepare for your visit, or learn where to ask a question.") }}</p></section>
        <section class="container help-layout section">
          <div class="faq">
            <h2>{{ landingText("Common questions") }}</h2>
            <details :open="helpTopic === 'access'"><summary>{{ landingText("How do I sign up or get an account?") }}</summary><p>{{ landingText("Use the account provided by your clinic. If you have not received access, ask the front desk about registration before trying to sign in.") }}</p><p>{{ landingText("Online self-registration is not currently available.") }}</p></details>
            <details><summary>{{ landingText("How do I book or confirm a visit?") }}</summary><p>{{ landingText("Sign in as a patient and open Booking to choose an available appointment. Upcoming visits appear in your account, where you can confirm attendance.") }}</p><a href="#signin" class="text-link">{{ landingText("Go to sign in") }}</a></details>
            <details><summary>{{ landingText("What if I cannot sign in?") }}</summary><p>{{ landingText("Check your email address and password for typing errors. If you still need help, contact the clinic’s front desk. Never send your password in an inquiry.") }}</p></details>
            <details><summary>{{ landingText("Can I send a medical question here?") }}</summary><p>{{ landingText("Discuss medical questions directly with your care team through the clinic’s approved contact method. General account inquiries should exclude symptoms, health records, and other personal health information.") }}</p></details>
          </div>
          <aside class="inquiry"><p class="eyebrow">{{ landingText("General inquiries") }}</p><h2>{{ landingText("Talk to the clinic.") }}</h2><p>{{ landingText("For appointments, registration, or accessibility support, reach out to the front desk.") }}</p><a v-if="contactEmail && !contactEmail.startsWith('[')" :href="'mailto:' + contactEmail" class="text-link">{{ contactEmail }}</a><p v-else-if="contactEmail" class="setup-note">{{ contactEmail }}</p><p v-else class="setup-note">{{ landingText("Clinic contact details are awaiting confirmation.") }}</p><a v-if="phone && !phone.startsWith('[')" :href="'tel:' + phone.replace(/[^+0-9]/g, '')" class="text-link">{{ phone }}</a><p v-else-if="phone" class="setup-note">{{ phone }}</p><p class="small">{{ landingText("Please keep general inquiries free of medical or sensitive personal information.") }}</p></aside>
        </section>
        <section class="container resources section"><h2>{{ landingText("Trusted resources") }}</h2><a href="https://health811.ontario.ca/" rel="noreferrer">{{ landingText("Health811") }} <span>{{ landingText("Ontario health information and service navigation") }}</span></a><a href="https://www.ipc.on.ca/en/health-individuals/file-a-health-privacy-complaint/your-health-privacy-rights-in-ontario" rel="noreferrer">{{ landingText("Health privacy rights") }} <span>{{ landingText("Information and Privacy Commissioner of Ontario") }}</span></a><a href="https://www.ontario.ca/laws/statute/04p03" rel="noreferrer">{{ landingText("Ontario’s health privacy law") }} <span>{{ landingText("Personal Health Information Protection Act") }}</span></a></section>
      </template>

      <section v-else class="container policy">
        <p class="eyebrow">{{ landingText("Help & information") }}</p><h1>{{ title }}</h1>
        <template v-if="page === 'privacy'"><h2>{{ landingText("Keep health information in the right place.") }}</h2><p>{{ landingText("Use fictional information when exploring this student prototype. Ask the clinic which approved channel to use for personal health information.") }}</p><p>{{ landingText("A clinic-specific privacy notice, including its information practices and privacy contact, must be supplied by the clinic before real patient information is collected.") }}</p><h2>{{ landingText("Understand your rights") }}</h2><p>{{ landingText("The Information and Privacy Commissioner of Ontario provides guidance on access, consent, and health information privacy.") }}</p><a class="text-link" href="https://www.ipc.on.ca/en/health-individuals/file-a-health-privacy-complaint/your-health-privacy-rights-in-ontario">{{ landingText("Read the IPC’s health privacy guidance") }}</a></template>
        <template v-else-if="page === 'terms'"><h2>{{ landingText("Appointment and account information") }}</h2><p>{{ landingText("ClinicFlow supports appointment administration. Information shown on this website does not replace advice from a qualified healthcare professional.") }}</p><p>{{ landingText("Ask the clinic directly about appointment changes, fees, eligibility, or services. Clinic-specific website terms and policies are awaiting confirmation.") }}</p><p>{{ landingText("Use the help page for account guidance and links to external resources.") }}</p></template>
        <template v-else><h2>{{ landingText("Navigate in the way that suits you.") }}</h2><p>{{ landingText("Use a keyboard to move between links and controls. The page supports browser text zoom, small screens, and your device’s reduced-motion preference.") }}</p><h2>{{ landingText("Need another way to access care?") }}</h2><p>{{ landingText("Ask the clinic’s front desk about assistance or an alternative way to book a visit. Contact details will be added once confirmed.") }}</p></template>
        <a href="#help" class="text-link">{{ landingText("Back to help & resources") }}</a>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer-main">
        <div class="footer-brand"><a class="brand" href="#home"><span class="brand-mark" aria-hidden="true">+</span>{{ clinicName }}</a><p>{{ landingText("A clearer connection") }}<br>{{ landingText("to your clinic.") }}</p></div>
        <div><h2>{{ landingText("Explore") }}</h2><a href="#home">{{ landingText("Home") }}</a><a href="#about">{{ landingText("About the clinic") }}</a><a href="#signin">{{ landingText("Sign in") }}</a></div>
        <div><h2>{{ landingText("Here to help") }}</h2><a href="#help">{{ landingText("Help & resources") }}</a><a href="#help" @click="requestAccess">{{ landingText("New patient access") }}</a><a href="#help">{{ landingText("General inquiries") }}</a></div>
        <div><h2>{{ landingText("Your information") }}</h2><a href="#privacy">{{ landingText("Privacy information") }}</a><a href="#terms">{{ landingText("Website use") }}</a><a href="#accessibility">{{ landingText("Accessibility") }}</a></div>
      </div>
      <div class="container footer-bottom"><p>© {{ year }} {{ clinicName }} {{ landingText("· Student prototype") }}</p><p>{{ landingText("For a medical emergency, call") }} <a href="tel:911">911</a>.</p></div>
    </footer>
  </div>
</template>

<style scoped>
.clinic-landing { --ink:#20374e; --muted:#526779; --blue:#2669a6; --pale:#eef5fb; --border:#d6e2ec; font-family:Inter,Arial,sans-serif; font-size:1rem; line-height:1.65; color:var(--ink); background:#fff; min-height:100dvh; }
* { box-sizing:border-box; }
a { color:#205e94; text-underline-offset:4px; }
button,input,select { font:inherit; }
.container,.header-inner { max-width:1160px; margin-inline:auto; padding-inline:32px; }
.site-header { background:#fff; border-bottom:1px solid var(--border); }
.header-inner { display:flex; align-items:center; justify-content:space-between; gap:24px; min-height:92px; }
.brand { display:inline-flex; align-items:center; gap:10px; font-size:1.4rem; font-weight:750; letter-spacing:-.04em; color:var(--ink); text-decoration:none; min-height:44px; }
.brand-mark { display:grid; place-items:center; width:35px; height:35px; border-radius:10px; background:var(--blue); color:#fff; font-size:1.9rem; line-height:1; font-weight:600; }
nav { display:flex; gap:28px; }
.landing-language { display:flex; flex-wrap:wrap; align-items:center; gap:8px; font-size:.875rem; margin-left:auto; }
.landing-language select { min-height:44px; max-width:150px; padding:8px 12px; border:1px solid #8ba6bc; border-radius:8px; background:white; color:#20374e; font:inherit; }
.header-inner { gap:20px; }

nav a { display:flex; align-items:center; min-height:48px; padding:4px 5px; text-decoration:none; font-size:.94rem; color:var(--muted); border-bottom:2px solid transparent; }
nav a[aria-current] { color:var(--blue); border-bottom-color:var(--blue); font-weight:700; }
.button { display:inline-flex; min-height:48px; align-items:center; justify-content:center; padding:11px 23px; border:1px solid var(--blue); border-radius:8px; background:var(--blue); color:#fff; text-decoration:none; font-weight:650; line-height:1.4; transition:background .18s,box-shadow .18s,transform .18s; }
.button:hover { background:#1d5485; box-shadow:0 4px 12px #163b5b18; transform:translateY(-1px); }
.secondary { background:#fff; color:#205e94; border-color:#bbcedf; }
.secondary:hover { color:#fff; }
.header-signin { min-height:44px; padding:9px 22px; }
.hero { display:grid; grid-template-columns:1.15fr 1fr; align-items:center; gap:66px; padding-top:80px; padding-bottom:80px; }
.eyebrow { color:#2d638b; font-size:.8rem; text-transform:uppercase; letter-spacing:.13em; font-weight:700; margin:0 0 19px; }
h1,h2,h3,p { overflow-wrap:break-word; }
h1 { font-size:clamp(2.5rem,4.8vw,4rem); letter-spacing:-.055em; line-height:1.1; font-weight:650; margin:0 0 25px; }
h1 span { color:var(--blue); }
.lead { color:var(--muted); font-size:1.1rem; line-height:1.8; max-width:520px; margin:0 0 29px; }
.actions { display:flex; gap:12px; flex-wrap:wrap; }
.new-patient { color:var(--muted); font-size:.875rem; margin:22px 0 0; }
.landing-clinic-info { background:#f7fafd; border:1px solid var(--border); border-radius:10px; padding:12px 16px; margin:0 0 22px; font-size:.87rem; overflow-wrap:anywhere; }
.landing-clinic-info p { margin:4px 0; color:var(--muted); }
.landing-clinic-info strong { color:var(--ink); }
.new-patient a { display:inline-block; padding-block:5px; }
.hero-visual { background:#eaf3fb; border-radius:22px; padding:32px; border:1px solid #dfeaf4; position:relative; }
.visual-heading { display:flex; gap:12px; align-items:center; font-size:.875rem; color:#345a78; margin:0 0 32px; }
.visual-cross { background:#d4e7f7; width:32px; height:32px; display:grid; place-items:center; color:#2669a6; border-radius:50%; font-size:1.6rem; }
.appointment-example { background:white; border:1px solid #d7e3ee; border-radius:13px; padding:24px; box-shadow:0 15px 30px #264c7010; transform:rotate(-2deg); }
.example-label { color:var(--muted); font-size:.875rem; margin:0 0 22px; }
.example-date { display:flex; gap:15px; align-items:center; }
.example-date strong { font-size:.95rem; font-weight:650; }
.example-date p { font-size:.875rem; color:var(--muted); margin:3px 0; }
.calendar-symbol { min-width:58px; border:1px solid #d3e1ef; border-radius:8px; overflow:hidden; text-align:center; background:#f8fbfe; }
.calendar-symbol span { display:block; background:#e7f0f9; font-size:.65rem; padding:2px 8px; color:#426683; letter-spacing:.08em; }
.calendar-symbol b { color:#2669a6; font-size:1.5rem; font-weight:500; }
.example-status { margin-top:23px; border-top:1px solid #e4edf4; padding-top:14px; font-size:.875rem; color:#216448; }
.example-status span { margin-right:6px; }
.visual-caption { display:flex; gap:18px; align-items:center; margin:35px 0 18px; }
.caption-line { width:35px; height:1px; background:#8dacc5; }
.visual-caption p { font-size:1rem; line-height:1.6; margin:0; color:#526c83; }
.visual-caption strong { font-weight:600; color:var(--ink); }
.illustration-label { color:#536d83; font-size:.75rem; margin:22px 0 0; }
.intro-strip { background:#f7fafd; border-block:1px solid #e3ebf2; }
.strip-inner { display:flex; align-items:center; justify-content:space-between; gap:24px; padding-block:22px; color:#46617a; font-size:.9rem; flex-wrap:wrap; }
.strip-inner p { margin:0; font-weight:650; color:var(--ink); }
.section { padding-block:70px; }
h2 { font-size:clamp(1.7rem,3vw,2.35rem); line-height:1.25; letter-spacing:-.04em; font-weight:650; margin:0 0 20px; }
h3 { font-size:1.13rem; line-height:1.4; margin:18px 0 10px; }
p { margin:0 0 18px; }
.steps { display:grid; grid-template-columns:repeat(3,1fr); gap:44px; margin-top:42px; }
.steps article { border-top:1px solid var(--border); padding-top:27px; }
.steps p,.care-panel p,.about-grid p,.detail-grid p { color:var(--muted); }
.step-icon { display:grid; place-items:center; width:42px; height:42px; background:#eaf3fb; border-radius:10px; color:#2669a6; font-size:1.4rem; }
.care-panel { display:grid; grid-template-columns:1.3fr 1fr; gap:70px; background:#f0f6fb; border:1px solid #e2ecf4; border-radius:18px; padding:44px; max-width:1096px; }
.care-panel p { max-width:540px; }
.care-list { align-self:center; padding-left:20px; }
.care-list p { border-bottom:1px solid #d9e5ef; padding-bottom:16px; font-weight:550; }
.care-list span { margin-right:12px; color:#2669a6; }
.text-link { display:inline-block; min-height:44px; padding-block:9px; font-weight:650; }
.final-cta { text-align:center; padding-block:80px; }
.final-cta p { color:var(--muted); margin-bottom:25px; }
.site-footer { background:#f6f9fc; border-top:1px solid var(--border); }
.footer-main { display:grid; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:34px; padding-block:45px; }
.footer-main h2 { font-size:.9rem; letter-spacing:0; margin:8px 0 14px; }
.footer-main>div>a:not(.brand) { display:block; width:fit-content; padding-block:9px; font-size:.875rem; text-decoration:none; color:#46617a; min-height:40px; }
.footer-main a:hover { text-decoration:underline; }
.footer-brand p { color:var(--muted); font-size:.9rem; margin-top:15px; }
.footer-bottom { display:flex; justify-content:space-between; gap:20px; padding-block:20px; border-top:1px solid var(--border); flex-wrap:wrap; font-size:.8rem; color:#526779; }
.footer-bottom p { margin:0; }
.inner-hero { padding-top:76px; padding-bottom:44px; border-bottom:1px solid var(--border); }
.inner-hero h1 { max-width:780px; }
.about-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:80px; }
.about-note { background:var(--pale); padding:35px; border-radius:15px; }
.detail-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:35px; }
.detail-grid article { border-top:1px solid var(--border); }
.help-layout { display:grid; grid-template-columns:1.4fr 1fr; gap:70px; align-items:start; }
.inquiry { background:var(--pale); border-radius:14px; padding:30px; }
.small,.setup-note { font-size:.875rem; color:var(--muted); }
.faq details { border-bottom:1px solid var(--border); padding-block:10px; }
summary { cursor:pointer; padding:12px 6px; font-weight:600; min-height:48px; }
.faq details p { padding-inline:6px; color:var(--muted); margin-top:12px; }
.resources { padding-top:0; }
.resources>a { display:block; padding:18px 0; border-bottom:1px solid var(--border); font-weight:600; }
.resources span { display:block; color:var(--muted); font-size:.9rem; font-weight:400; text-decoration:none; }
.signin-layout { min-height:660px; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; padding-block:70px; }
.signin-slot { border:1px solid var(--border); border-radius:16px; background:#f7fafd; padding:30px; }
.policy { max-width:850px; padding-block:70px; min-height:650px; }
.policy h1 { font-size:2.8rem; margin-bottom:40px; }
.policy h2 { font-size:1.35rem; letter-spacing:-.02em; margin-top:28px; }
.policy p { color:var(--muted); }
:focus-visible { outline:3px solid #174e7c; outline-offset:5px; border-radius:3px; }
main:focus { outline:none; }
.skip-link { position:absolute; top:-80px; left:20px; z-index:20; padding:12px; background:white; border:2px solid #174e7c; }
.skip-link:focus { top:12px; }
@media(prefers-reduced-motion:no-preference) { .page { animation:arrive .35s ease-out; } .hero-visual { animation:arrive .6s ease-out; } @keyframes arrive { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } } }
@media(prefers-reduced-motion:reduce) { *,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; } }
@media(max-width:850px) { .hero { gap:30px; padding-block:55px; } .hero-visual { padding:24px; } .appointment-example { padding:18px; } .steps { gap:25px; } .care-panel { margin-inline:24px; gap:30px; } .about-grid,.help-layout,.signin-layout { gap:35px; } }
@media(max-width:640px) {
 .container,.header-inner { padding-inline:22px; } .header-inner { flex-wrap:wrap; gap:6px 12px; padding-block:13px; } .brand { font-size:1.2rem; } nav { order:3; width:100%; justify-content:center; gap:35px; } nav a { min-height:44px; } .header-signin { margin-left:0; } .landing-language { gap:4px; } .landing-language>span { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; } .landing-language select { max-width:115px; padding-inline:7px; }
 .hero { grid-template-columns:1fr; padding-block:42px; gap:35px; } h1 { font-size:2.8rem; } .hero-visual { max-width:420px; width:100%; margin-inline:auto; } .hero-copy .lead { font-size:1rem; } .actions { flex-direction:column; align-items:stretch; } .hero-copy br { display:none; }
 .strip-inner { justify-content:start; gap:10px 24px; } .strip-inner p { width:100%; } .section { padding-block:45px; } .steps,.detail-grid { grid-template-columns:1fr; gap:20px; } .steps { margin-top:28px; } .steps article { padding-top:20px; } .steps h3 { margin-top:12px; }
 .care-panel { grid-template-columns:1fr; margin-inline:16px; padding:28px; gap:20px; } .care-list { padding-left:0; } .final-cta { padding-block:50px; } .footer-main { grid-template-columns:1fr 1fr; gap:24px; } .footer-brand { grid-column:1/-1; } .footer-bottom { gap:10px; }
 .inner-hero { padding-top:45px; } .about-grid,.help-layout,.signin-layout { grid-template-columns:1fr; gap:28px; } .signin-layout { padding-block:40px; } .signin-slot { padding:22px; } .policy h1 { font-size:2.2rem; } .about-note,.inquiry { padding:24px; } .resources { padding-top:0; }
}
</style>


<style scoped>
@media(max-width:380px) { .header-inner { padding-inline:14px; gap:6px; } .brand { gap:5px; font-size:1rem; } .brand-mark { width:30px; height:30px; } .header-signin { padding-inline:10px; font-size:.875rem; } .landing-language select { max-width:100px; } }
</style>


<style scoped>
.site-header { position:sticky; top:0; z-index:1200; }
</style>

<style scoped>
.site-header .header-inner { max-width:none; padding-left:16px; }
</style>

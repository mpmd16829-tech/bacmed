export type CoachLanguage = 'fr' | 'ar'

export function coachReply(input: string, language: CoachLanguage): string {
  const q = input.toLowerCase()
  if (language === 'ar') {
    if (/خوف|قلق|stress/.test(q)) return 'ما عليك باس. تنفّس بشوي، واختار تمرين واحد ساهل تبدأ بيه. التقدّم الصغير اليوم خير من التأجيل.'
    if (/خطة|برنامج|planning/.test(q)) return 'شوف خانة البرنامج، وابدأ بحصة اليوم. اقرا الدرس مدة قصيرة وبعدها طبّق تمرين بلا ما تشوف الحل.'
    if (/درس|cours/.test(q)) return 'امشِ لخانة الدروس، اختار الشعبة والمادة، واقرا النقاط المهمة. من بعد جرّب التمرين وصحّح غلطك.'
    return 'مرحبا بيك. نقدر نعاونك فتنظيم المراجعة، فهم طريقة الحل، ولا تخفيف القلق. قول لي شنو المادة اللي باغي تبدأ بها؟'
  }
  if (/stress|peur|angoisse|panique/.test(q)) return 'On ralentit. Respire pendant une minute, puis choisis une seule tâche de 20 minutes. Le but maintenant est de démarrer, pas de tout finir.'
  if (/planning|plan|organis/.test(q)) return 'Ouvre ton planning du jour et commence par la première séance. Fais le cours sans distraction, puis teste-toi sans regarder la correction.'
  if (/cours|chapitre|matière/.test(q)) return 'Va dans Cours, filtre par matière puis ouvre un chapitre. Lis les objectifs, cache le résumé et essaie de reformuler avec tes propres mots.'
  if (/progress|résultat|avance/.test(q)) return 'La progression mesure tes chapitres lus, exercices réussis et séances terminées. Regarde surtout la régularité, pas seulement le pourcentage.'
  return 'Je suis ton coach hors ligne. Je peux t’aider à démarrer une séance, choisir un cours, organiser tes révisions ou gérer le stress. De quoi as-tu besoin ?'
}

export const quickPrompts = {
  fr: ['Organise ma séance', 'Je suis stressé', 'Comment réviser ?', 'Voir ma progression'],
  ar: ['نظّم لي الحصة', 'أنا قلق', 'كيف نراجع؟', 'نشوف التقدّم'],
}

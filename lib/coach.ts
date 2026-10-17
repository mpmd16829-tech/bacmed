import type { Locale, Localized } from './i18n'

export type CoachTip = {
  id: string
  keywords: string[]
  answer: Localized
  subject_id?: string | null
  priority?: number
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    // Harakat and accent marks must never break a keyword match.
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")

const score = (tip: CoachTip, question: string) =>
  tip.keywords.reduce((best, keyword) => {
    const k = normalize(keyword).trim()
    if (!k) return best
    return question.includes(k) ? Math.max(best, k.length) : best
  }, 0)

/**
 * The coach answers from the tips maintained in the console; when none matches (or the student is
 * offline with no cached tips) it falls back to the built-in rules, so a reply is always given.
 */
export function coachReply(input: string, language: Locale = 'fr', tips: CoachTip[] = []): string {
  const q = normalize(input)
  const matches = tips
    .map((tip) => ({ tip, value: score(tip, q) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value || (b.tip.priority ?? 0) - (a.tip.priority ?? 0))
  if (matches.length) {
    const answer = matches[0].tip.answer
    const text = answer?.[language] || answer?.fr || answer?.ar
    if (text) return text
  }
  return ruleReply(q, language)
}

function ruleReply(q: string, language: Locale): string {
  if (language === 'ar') {
    if (/خوف|قلق|stress|توتر/.test(q)) return 'ما عليك باس. تنفّس بشوي، واختار تمرين واحد ساهل تبدأ بيه. التقدّم الصغير اليوم خير من التأجيل.'
    if (/خطة|برنامج|planning|تنظيم|حصة/.test(q)) return 'شوف خانة البرنامج، وابدأ بحصة اليوم. اقرا الدرس مدة قصيرة وبعدها طبّق تمرين بلا ما تشوف الحل.'
    if (/درس|cours|فصل|مادة/.test(q)) return 'امشِ لخانة الدروس، اختار الشعبة والمادة، واقرا النقاط المهمة. من بعد جرّب التمرين وصحّح غلطك.'
    if (/نسيان|حفظ|ذاكرة/.test(q)) return 'اللي يتكرر ثلاث مرات متباعدة (يوم 1، 3، 7) يثبت. لخّص في ورقة قصيرة وراجعها في هاد الأوقات.'
    if (/امتحان|بكالوريا/.test(q)) return 'ابدأ بالأسئلة السهلة اللي تجيب نقاط، خلي 10 دقائق للمراجعة، وبيّن الوحدات في كل جواب.'
    return 'مرحبا بيك. نقدر نعاونك فتنظيم المراجعة، فهم طريقة الحل، ولا تخفيف القلق. قول لي شنو المادة اللي باغي تبدأ بها؟'
  }
  if (/stress|peur|angoisse|panique/.test(q)) return 'On ralentit. Respire pendant une minute, puis choisis une seule tâche de 20 minutes. Le but maintenant est de démarrer, pas de tout finir.'
  if (/planning|plan|organis|séance/.test(q)) return 'Ouvre ton planning du jour et commence par la première séance. Fais le cours sans distraction, puis teste-toi sans regarder la correction.'
  if (/cours|chapitre|matière|leçon/.test(q)) return 'Va dans Cours, filtre par matière puis ouvre un chapitre. Lis les objectifs, cache le résumé et essaie de reformuler avec tes propres mots.'
  if (/progress|résultat|avance|note/.test(q)) return 'La progression mesure tes chapitres maîtrisés, exercices réussis et séances terminées. Regarde surtout la régularité, pas seulement le pourcentage.'
  if (/oubli|mémo|retenir/.test(q)) return 'Trois rappels espacés (jour 1, jour 3, jour 7) valent mieux qu’une relecture de deux heures. Fais une fiche courte et reprends-la à ces trois moments.'
  if (/examen|épreuve|bac/.test(q)) return 'Stratégie d’épreuve : commence par ce qui rapporte vite, garde 10 minutes pour relire, et n’oublie ni les unités ni la conclusion.'
  return 'Je suis ton coach hors ligne. Je peux t’aider à démarrer une séance, choisir un cours, organiser tes révisions ou gérer le stress. De quoi as-tu besoin ?'
}

export const quickPrompts = {
  fr: ['Organise ma séance', 'Je suis stressé', 'Comment mémoriser ?', 'Voir ma progression'],
  ar: ['نظّم لي الحصة', 'أنا قلق', 'كيف أحفظ؟', 'نشوف التقدّم'],
}

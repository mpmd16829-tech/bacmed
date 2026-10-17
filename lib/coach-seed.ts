import type { Localized } from './i18n'

/**
 * Base de conseils du coach, version 0 : ce que les règles fixes savaient déjà répondre.
 * Elle est importée dans `coach_tips` (npm run db:seed) puis modifiée depuis la console superadmin,
 * donc le contenu du coach n'est plus figé dans le code.
 */
export type CoachTipSeed = { id: string; keywords: string[]; answer: Localized }

export const coachTipsSeed: CoachTipSeed[] = [
  {
    id: 'tip-stress',
    keywords: ['stress', 'peur', 'angoisse', 'panique', 'overwhelmed', 'خوف', 'قلق', ' ضغط', 'توتر'],
    answer: {
      fr: "On ralentit. Respire une minute, puis choisis une seule tâche de 20 minutes. Le but maintenant est de démarrer, pas de tout finir.",
      ar: 'ما عليك باس. تنفّس بشوي، واختار تمرين واحد ساهل تبدأ بيه. التقدّم الصغير اليوم خير من التأجيل.',
    },
  },
  {
    id: 'tip-planning',
    keywords: ['planning', 'plan', 'organis', 'programme', 'séance', 'خطة', 'برنامج', 'تنظيم', 'حصة'],
    answer: {
      fr: 'Ouvre ton planning du jour et commence par la première séance. Le cours d’abord sans distraction, puis l’exercice sans regarder la correction.',
      ar: 'شوف خانة البرنامج، وابدأ بحصة اليوم. اقرا الدرس مدة قصيرة وبعدها طبّق تمرين بلا ما تشوف الحل.',
    },
  },
  {
    id: 'tip-course',
    keywords: ['cours', 'chapitre', 'matière', 'leçon', 'réviser', 'درس', 'فصل', 'مادة', 'مراجعة'],
    answer: {
      fr: 'Va dans Cours, filtre par matière, ouvre un chapitre. Lis les objectifs, cache le résumé et reformule-le avec tes mots.',
      ar: 'امشِ لخانة الدروس، اختار الشعبة والمادة، واقرا النقاط المهمة. من بعد جرّب التمرين وصحّح غلطك.',
    },
  },
  {
    id: 'tip-progress',
    keywords: ['progression', 'résultat', 'avance', 'note', 'pourcentage', 'تقدم', 'نتيجة', 'نقطة'],
    answer: {
      fr: 'La progression compte les chapitres maîtrisés, les exercices réussis et les séances terminées. Regarde surtout la régularité, pas seulement le pourcentage.',
      ar: 'التقدم يحسب الفصول المتقنة والتمارين الناجحة والحصص المنجزة. ركّز على الاستمرارية أكثر من النسبة.',
    },
  },
  {
    id: 'tip-method',
    keywords: ['méthode', 'comment', 'astuce', 'technique', 'منهجية', 'طريقة', 'نصيحة'],
    answer: {
      fr: 'Trois gestes qui font la différence : rappel actif (fermer le cours et restituer), entraînement chronométré, puis explication à voix haute comme si tu corrigeais ta copie.',
      ar: 'ثلاث عادات تفرق: الاسترجاع النشط (سدّ الدرس وحكيه)، تدريب بالوقت، وشرح بصوتك كأنك تصحح ورقتك.',
    },
  },
  {
    id: 'tip-memory',
    keywords: ['mémoire', 'oublier', 'mémoriser', 'retenir', 'نسيان', 'حفظ', 'ذاكرة'],
    answer: {
      fr: 'Ce qui est vu trois fois espacé (jour 1, jour 3, jour 7) reste. Fais des fiches courtes et reprends-les à ces trois moments plutôt qu’une longue relecture.',
      ar: 'اللي يتكرر ثلاث مرات متباعدة (يوم 1، 3، 7) يثبت. ورّق ملخصات قصيرة وراجعها في هاد الأوقات بدل قراءة طويلة.',
    },
  },
  {
    id: 'tip-exam',
    keywords: ['examen', 'épreuve', 'bac', 'contrôle', 'امتحان', 'البكالوريا', 'فرض'],
    answer: {
      fr: 'Stratégie d’épreuve : commence par les questions qui rapportent vite, garde 10 minutes pour relire, et soigne l’unité de chaque réponse.',
      ar: 'استراتيجية الامتحان: ابدأ بالأسئلة السهلة اللي تجيب نقاط، خلي 10 دقائق للمراجعة، وبيّن الوحدات في كل جواب.',
    },
  },
  {
    id: 'tip-sleep',
    keywords: ['sommeil', 'dormir', 'nuit', 'fatigue', 'نوم', 'تعب', 'سهر'],
    answer: {
      fr: 'Une nuit blanche coûte plus qu’elle ne rapporte : la mémoire se range pendant le sommeil. Vise une dernière séance légère puis dors.',
      ar: 'ليلة بلا نوم تخسر أكثر مما تعطي: الذاكرة ترتّب نفسها في النوم. اعمل حصة خفيفة وبعدها نام.',
    },
  },
  {
    id: 'tip-maths',
    keywords: ['maths', 'mathématiques', 'exercice', 'calcul', 'رياضيات', 'حساب'],
    answer: {
      fr: 'En maths, la justification vaut des points : écris la règle avant de l’appliquer, garde les étapes visibles, puis vérifie le résultat avec un cas simple.',
      ar: 'في الرياضيات التبرير يجيب نقاط: اكتب القاعدة قبل التطبيق، خلِّ الخطوات ظاهرة، وتحقق بالنتيجة بحالة بسيطة.',
    },
  },
  {
    id: 'tip-svt',
    keywords: ['svt', 'sciences naturelles', 'biologie', 'génétique', 'علوم الحياة', 'الوراثة', 'الأرض'],
    answer: {
      fr: 'En SVT, pars toujours du document : décris ce que tu vois, nomme le concept, puis conclus. Un raisonnement sans donnée du sujet ne rapporte rien.',
      ar: 'في العلوم الطبيعية ابدأ من الوثيقة: وصف، ثم تسمية المفهوم، ثم استنتاج. استدلال بلا معطيات ما يعطي نقاط.',
    },
  },
  {
    id: 'tip-arabe',
    keywords: ['arabe', 'langue', 'grammaire', 'analyse', 'العربية', 'النحو', 'تحليل'],
    answer: {
      fr: "Pour l'arabe comme pour le français : repère la consigne, cite le texte, explique le procédé, puis répond à la question posée. Une idée = une preuve.",
      ar: 'في العربية والفرنسية: حدّد التعليمة، استشهد بالنص، شرح الأسلوب، ثم جاوب على السؤال. فكرة واحدة = شاهد واحد.',
    },
  },
  {
    id: 'tip-start',
    keywords: ['démarrer', 'commencer', 'procrastination', 'flemme', 'بدأ', 'تكاسل', 'بداية'],
    answer: {
      fr: 'La règle des deux minutes : ouvre l’application, lis une seule notion essentielle. Si tu veux arrêter après, tu arrêtes. Dans la plupart des cas, tu continues.',
      ar: 'قاعدة الدقيقتين: حلّ التطبيق واقرا فكرة وحدة أساسية. إذا بغيت توقف من بعد، توقف. غالبية المرات كتكمل.',
    },
  },
]

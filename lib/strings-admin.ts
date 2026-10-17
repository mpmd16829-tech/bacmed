import type { Locale } from './i18n'

/**
 * Libellés de la console superadmin, de l'espace enseignant et du code élève.
 * Tout est bilingue FR/AR : l'application est utilisée dans les deux langues, la console aussi.
 */
export const L = {
  // Ouverture de la console
  pinTitle: { fr: 'Console PrépaBAC', ar: 'لوحة تحكم بريباك' },
  pinText: { fr: 'Saisis le code administrateur.', ar: 'أدخل رمز المدير.' },
  pin: { fr: 'Code administrateur', ar: 'رمز المدير' },
  open: { fr: 'Ouvrir la console', ar: 'فتح اللوحة' },
  badPin: { fr: 'Code incorrect.', ar: 'رمز غير صحيح.' },
  close: { fr: 'Fermer', ar: 'إغلاق' },
  logout: { fr: 'Se déconnecter', ar: 'تسجيل الخروج' },
  saved: { fr: 'Enregistré', ar: 'محفوظ' },
  saving: { fr: 'Enregistrement…', ar: 'جارٍ الحفظ…' },
  error: { fr: 'Erreur', ar: 'خطأ' },
  offline: { fr: 'Connexion requise pour la console.', ar: 'اللوحة تتطلب الاتصال.' },

  // Onglets
  tabCourses: { fr: 'Cours', ar: 'الدروس' },
  tabExercises: { fr: 'Exercices', ar: 'التمارين' },
  tabImport: { fr: 'Importer', ar: 'استيراد' },
  tabCoach: { fr: 'Coach', ar: 'المدرب' },
  tabPeople: { fr: 'Personnes', ar: 'الأشخاص' },
  tabSettings: { fr: 'Réglages', ar: 'الإعدادات' },

  // Catalogue
  catalogue: { fr: 'Catalogue', ar: 'الكتالوج' },
  subjects: { fr: 'Matières', ar: 'المواد' },
  streams: { fr: 'Filières', ar: 'الشعب' },
  addSubject: { fr: 'Ajouter une matière', ar: 'إضافة مادة' },
  addChapter: { fr: 'Ajouter un cours', ar: 'إضافة درس' },
  addExercise: { fr: 'Ajouter un exercice', ar: 'إضافة تمرين' },
  edit: { fr: 'Modifier', ar: 'تعديل' },
  del: { fr: 'Supprimer', ar: 'حذف' },
  confirmDel: { fr: 'Supprimer définitivement ce contenu ?', ar: 'حذف هذا المحتوى نهائيا؟' },
  publish: { fr: 'Publier', ar: 'نشر' },
  unpublish: { fr: 'Masquer', ar: 'إخفاء' },
  published: { fr: 'Publié', ar: 'منشور' },
  draft: { fr: 'Brouillon', ar: 'مسودة' },
  allStreams: { fr: 'Toutes les filières', ar: 'كل الشعب' },
  linked: { fr: 'Liée aux filières', ar: 'مرتبطة بالشعب' },
  link: { fr: 'Rattacher à une filière', ar: 'ربط بشعبة' },
  unlink: { fr: 'Retirer de la filière', ar: 'إزالة من الشعبة' },
  coefficient: { fr: 'Coefficient', ar: 'المعامل' },
  position: { fr: 'Ordre', ar: 'الترتيب' },
  chaptersCount: { fr: 'cours', ar: 'دروس' },
  exercisesCount: { fr: 'exercices', ar: 'تمارين' },

  // Champs d'un cours
  frField: { fr: 'Texte en français', ar: 'النص بالفرنسية' },
  arField: { fr: 'Texte en arabe', ar: 'النص بالعربية' },
  fTitle: { fr: 'Titre', ar: 'العنوان' },
  fSummary: { fr: 'Résumé', ar: 'الملخص' },
  fDuration: { fr: 'Durée (minutes)', ar: 'المدة (دقائق)' },
  fObjectives: { fr: 'Objectifs (une ligne par élément)', ar: 'الأهداف (سطر لكل عنصر)' },
  fPrerequisites: { fr: 'Prérequis (une ligne par élément)', ar: 'المكتسبات القبلية (سطر لكل عنصر)' },
  fEssentials: { fr: 'Notions essentielles (une ligne par élément)', ar: 'المفاهيم الأساسية (سطر لكل عنصر)' },
  fMethod: { fr: 'Méthode pas à pas (une ligne par étape)', ar: 'المنهجية خطوة بخطوة (سطر لكل خطوة)' },
  fExample: { fr: 'Exemple guidé', ar: 'مثال محلول' },
  fMistakes: { fr: 'Erreurs fréquentes (une ligne par erreur)', ar: 'أخطاء شائعة (سطر لكل خطأ)' },
  fRecap: { fr: 'Résumé express', ar: 'خلاصة سريعة' },
  fSubject: { fr: 'Matière', ar: 'المادة' },
  fChapter: { fr: 'Cours rattaché', ar: 'الفصل المرتبط' },
  fQuestion: { fr: 'Énoncé', ar: 'السؤال' },
  fHint: { fr: 'Indice', ar: 'تلميح' },
  fAnswer: { fr: 'Réponse', ar: 'الإجابة' },
  fCorrection: { fr: 'Correction détaillée', ar: 'التصحيح المفصل' },
  fDifficulty: { fr: 'Difficulté', ar: 'الصعوبة' },
  easy: { fr: 'Facile', ar: 'سهل' },
  medium: { fr: 'Moyen', ar: 'متوسط' },
  hard: { fr: 'Difficile', ar: 'صعب' },
  fName: { fr: 'Nom', ar: 'الاسم' },
  fShort: { fr: 'Sigle (MATH, PC…)', ar: 'الرمز المختصر' },
  save: { fr: 'Enregistrer', ar: 'حفظ' },
  cancel: { fr: 'Annuler', ar: 'إلغاء' },
  applyNow: { fr: 'Appliquer la liste', ar: 'تطبيق القائمة' },
  emptyCatalog: { fr: 'Aucun contenu pour l’instant.', ar: 'لا يوجد محتوى حاليا.' },
  noTeachers: { fr: 'Aucun code enseignant créé.', ar: 'لم تُنشأ أي رمز أستاذ.' },
  confirmTeacherDel: { fr: 'Supprimer ce code enseignant ? Les élèves gardent leur code et leur progression.', ar: 'حذف رمز الأستاذ؟ يحتفظ الطلاب برمزهم وتقدمهم.' },
  answerLabel: { fr: 'Réponse du coach', ar: 'جواب المدرب' },

  // Import
  importText: {
    fr: 'N’importe quel fichier (4,5 Mo max). PDF, DOCX, TXT, MD, JSON, CSV, HTML sont lus ; un fichier illisible est signalé, jamais ignoré. Le texte extrait est découpé en cours et exercices, puis tu valides avant la publication.',
    ar: 'أي ملف (حتى 4,5 ميغابايت). ملفات PDF وDOCX وTXT وMD وJSON وCSV وHTML تُقرأ، وأي ملف غير قابل للقراءة يُنبَّه عليه بدل إغفاله. يُقسَم النص إلى دروس وتمارين ثم تعتمده قبل النشر.',
  },
  chooseFile: { fr: 'Choisir un fichier', ar: 'اختيار ملف' },
  analyze: { fr: 'Analyser le fichier', ar: 'تحليل الملف' },
  preview: { fr: 'Aperçu avant publication', ar: 'معاينة قبل النشر' },
  pages: { fr: 'pages', ar: 'صفحات' },
  characters: { fr: 'caractères lus', ar: 'حرفا مقروءا' },
  detectedChapters: { fr: 'cours détectés', ar: 'دروس مكتشفة' },
  detectedExercises: { fr: 'exercices détectés', ar: 'تمارين مكتشفة' },
  targetSubject: { fr: 'Matière de destination', ar: 'المادة المستقبِلة' },
  commit: { fr: 'Importer comme brouillons', ar: 'استيراد كمسودات' },
  imported: { fr: 'Importé en brouillon. Relis-le dans « Cours » puis publie.', ar: 'تم الاستيراد كمسودة. راجعه في «الدروس» ثم انشره.' },
  unsupported: { fr: 'Format non pris en charge', ar: 'صيغة غير مدعومة' },
  nothingToImport: { fr: 'Aucun contenu exploitable dans ce fichier.', ar: 'لا يوجد محتوى قابل للاستعمال في هذا الملف.' },

  // Coach
  coachText: { fr: 'Ces conseils répondent aux questions du coach. Sans réseau, l’app garde ses règles locales.', ar: 'هذه النصائح تجيب على أسئلة المدرب. دون اتصال تستعمل التطبيق قواعد المحلية.' },
  addTip: { fr: 'Ajouter un conseil', ar: 'إضافة نصيحة' },
  fKeywords: { fr: 'Mots-clés (séparés par des virgules, FR et AR)', ar: 'الكلمات المفتاحية (بفواصل، فرنسية وعربية)' },
  fPriority: { fr: 'Priorité', ar: 'الأولوية' },

  // Personnes
  teachers: { fr: 'Enseignants', ar: 'الأساتذة' },
  students: { fr: 'Élèves', ar: 'الطلاب' },
  addTeacher: { fr: 'Créer un code enseignant', ar: 'إنشاء رمز أستاذ' },
  teacherName: { fr: 'Nom du professeur', ar: 'اسم الأستاذ' },
  teacherCode: { fr: 'Code enseignant', ar: 'رمز الأستاذ' },
  active: { fr: 'Actif', ar: 'نشط' },
  disabled: { fr: 'Désactivé', ar: 'معطل' },
  studentsOf: { fr: 'élèves rattachés', ar: 'طالب مرتبط' },
  noStudents: { fr: 'Aucun élève pour le moment.', ar: 'لا يوجد طلاب حتى الآن.' },
  lastSeen: { fr: 'Dernière visite', ar: 'آخر زيارة' },
  streakLabel: { fr: 'Série', ar: 'السلسلة' },
  value: { fr: 'Maîtrise', ar: 'الإتقان' },
  resetStudent: { fr: 'Remettre à zéro la progression', ar: 'تصفير التقدم' },
  confirmReset: { fr: 'Effacer la progression de cet élève en ligne ?', ar: 'حذف تقدم هذا الطالب من الخادم؟' },
  unlinkStudent: { fr: 'Détacher le compte', ar: 'فصل الحساب' },
  confirmUnlink: { fr: 'Supprimer ce code élève ? Son ancien appareil redeviendra anonyme.', ar: 'حذف رمز الطالب؟ سيعود جهازه السابق مجهولا.' },
  reassign: { fr: 'Changer de professeur', ar: 'تغيير الأستاذ' },
  none: { fr: 'Aucun', ar: 'بدون' },

  // Réglages
  changePin: { fr: 'Changer le code administrateur', ar: 'تغيير رمز المدير' },
  currentPin: { fr: 'Code actuel', ar: 'الرمز الحالي' },
  nextPin: { fr: 'Nouveau code (4 à 8 chiffres)', ar: 'الرمز الجديد (4 إلى 8 أرقام)' },
  settingsText: {
    fr: 'Le code par défaut est 7777. Le changer ne touche pas aux sessions déjà ouvertes.',
    ar: 'الرمز الافتراضي 7777. تغييره لا يغلق الجلسات المفتوحة.',
  },

  // Code élève (côté app)
  myCode: { fr: 'Ton code élève', ar: 'رمزك الخاص' },
  myCodeText: {
    fr: 'Garde ce code : il retrouve ta progression sur un autre téléphone ou un autre ordinateur.',
    ar: 'احفظ هذا الرمز: يعيد تقدمك على هاتف أو حاسوب آخر.',
  },
  createCode: { fr: 'Créer mon code', ar: 'إنشاء رمزي' },
  codeCreated: { fr: 'Code créé', ar: 'تم إنشاء الرمز' },
  attachCode: { fr: 'J’ai déjà un code', ar: 'لدي رمز بالفعل' },
  attachPlaceholder: { fr: 'BAC-XXXXXX', ar: 'BAC-XXXXXX' },
  attach: { fr: 'Récupérer ma progression', ar: 'استرجاع تقدمي' },
  attaching: { fr: 'Récupération…', ar: 'جارٍ الاسترجاع…' },
  attached: { fr: 'Progression récupérée et fusionnée.', ar: 'تم استرجاع التقدم ودمجه.' },
  badCode: { fr: 'Code introuvable ou mal recopié.', ar: 'الرمز غير موجود أو منسوخ خطأ.' },
  teacherField: { fr: 'Code de ton professeur (facultatif)', ar: 'رمز أستاذك (اختياري)' },
  teacherHint: { fr: 'Ton professeur suit alors ta maîtrise par matière.', ar: 'يتابع أستاذك عند ذلك إتقانك حسب المادة.' },
  linkedTeacher: { fr: 'Professeur', ar: 'الأستاذ' },
  copy: { fr: 'Copier', ar: 'نسخ' },
  copied: { fr: 'Copié', ar: 'تم النسخ' },
  offlineNeeded: { fr: 'Connecte-toi une fois pour créer ou récupérer ton code.', ar: 'اتصل مرة واحدة لإنشاء رمزك أو استرجاعه.' },

  // Espace enseignant
  profSpace: { fr: 'Espace enseignant', ar: 'فضاء الأستاذ' },
  profLogin: { fr: 'Entre ton code enseignant (PRF-…)', ar: 'أدخل رمز أستاذك (PRF-…)' },
  enter: { fr: 'Entrer', ar: 'دخول' },
  badTeacher: { fr: 'Code enseignant inconnu ou désactivé.', ar: 'رمز الأستاذ غير موجود أو معطل.' },
  myClass: { fr: 'Ma classe', ar: 'فئتي' },
  weakPoints: { fr: 'Points à revoir', ar: 'نقاط للمراجعة' },
  bySubject: { fr: 'Maîtrise par matière', ar: 'الإتقان حسب المادة' },
  emptyClass: { fr: 'Aucun élève rattaché à ce code pour l’instant.', ar: 'لا يوجد طلاب مرتبطون بهذا الرمز حاليا.' },
  backApp: { fr: 'Retour à l’app', ar: 'العودة إلى التطبيق' },
} as const

export type AdminKey = keyof typeof L

export const tr = (locale: Locale, key: AdminKey) => L[key][locale]

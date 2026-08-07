// Comprehensive directory of Lebanon's recognized universities (licensed by the
// Lebanese Ministry of Education and Higher Education / MEHE).
//
// The `rank` reflects a general national standing based on overall academic
// reputation, accreditation and research profile (broadly aligned with
// international rankings such as QS). It is a country-wide guide — for a
// specific major, always cross-check the AI recommendation, which ranks
// universities per field of study.
//
// Tuition ranges are INDICATIVE annual estimates in USD and vary by major and
// year; always confirm current fees on the university's official website.

export type TuitionTier = "Low" | "Moderate" | "High" | "Premium";

export type LebUniversity = {
  rank: number;
  /** Official English name. */
  name: string;
  /** Official/common Arabic name. */
  nameAr: string;
  /** Common acronym (empty when none is widely used). */
  acronym: string;
  /** Main-campus city (English). */
  city: string;
  /** Main-campus city (Arabic). */
  cityAr: string;
  type: "Public" | "Private";
  /** Year established. */
  founded: number;
  /** Faculties/fields this university is strongest in (English). */
  fields: string[];
  /** Same fields in Arabic. */
  fieldsAr: string[];
  /** Short profile so a student can learn about it (English). */
  description: string;
  /** Same profile in Arabic. */
  descriptionAr: string;
  /** Official website domain (empty when not confirmed). */
  website: string;
  /** Relative cost tier. */
  tuitionTier: TuitionTier;
  /** Indicative annual tuition range in USD. */
  tuitionRange: string;
  /** General admission requirements (English). */
  admission: string;
  /** Same in Arabic. */
  admissionAr: string;
};

// Reusable admission requirement templates (kept DRY).
const ADM = {
  english: {
    en: "Lebanese Baccalaureate Part II or an accredited equivalent (e.g. IB, GCE, or Freshman year), plus proof of English proficiency (TOEFL/IELTS or placement test). Competitive majors such as medicine, engineering and pharmacy require an entrance exam.",
    ar: "شهادة البكالوريا اللبنانية القسم الثاني أو ما يعادلها المعتمد (كالـ IB أو GCE أو سنة تمهيدية Freshman)، مع إثبات إتقان الإنجليزية (TOEFL/IELTS أو امتحان تحديد مستوى). التخصصات التنافسية كالطب والهندسة والصيدلة تتطلّب امتحان دخول.",
  },
  french: {
    en: "Lebanese or French Baccalaureate (or an accredited equivalent) with French proficiency (English also required for some programs). Medicine, dentistry and pharmacy require a competitive entrance exam.",
    ar: "البكالوريا اللبنانية أو الفرنسية (أو ما يعادلها المعتمد) مع إتقان الفرنسية (والإنجليزية لبعض البرامج). الطب وطب الأسنان والصيدلة تتطلّب امتحان دخول تنافسي.",
  },
  public: {
    en: "Lebanese Baccalaureate Part II (or an accredited equivalent). Admission to medicine, engineering, pharmacy and fine arts is through a competitive national entrance exam.",
    ar: "شهادة البكالوريا اللبنانية القسم الثاني (أو ما يعادلها المعتمد). القبول في الطب والهندسة والصيدلة والفنون الجميلة يتم عبر مباراة دخول وطنية تنافسية.",
  },
  arabic: {
    en: "Lebanese Baccalaureate Part II or an accredited equivalent. Some faculties require a placement or entrance test.",
    ar: "شهادة البكالوريا اللبنانية القسم الثاني أو ما يعادلها المعتمد. بعض الكليات تتطلّب امتحان تحديد مستوى أو امتحان دخول.",
  },
};

// Complete list of Lebanon's recognized universities, ordered best → lightest.
export const LEBANON_UNIVERSITIES: LebUniversity[] = [
  {
    rank: 1,
    name: "American University of Beirut",
    nameAr: "الجامعة الأميركية في بيروت",
    acronym: "AUB",
    city: "Beirut (Hamra)",
    cityAr: "بيروت (الحمرا)",
    type: "Private",
    founded: 1866,
    fields: ["Medicine", "Engineering", "Business", "Sciences", "Public Health"],
    fieldsAr: ["الطب", "الهندسة", "إدارة الأعمال", "العلوم", "الصحة العامة"],
    description:
      "Lebanon's oldest and top-ranked university, American-accredited with English instruction. Home to a leading medical center (AUBMC) and consistently the highest-ranked university in the country.",
    descriptionAr:
      "أقدم وأعرق جامعة في لبنان، معتمدة أميركياً والتدريس فيها بالإنجليزية. تضم مركزاً طبياً رائداً (AUBMC) وتحتل باستمرار المرتبة الأولى وطنياً.",
    website: "aub.edu.lb",
    tuitionTier: "Premium",
    tuitionRange: "$18,000–$27,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 2,
    name: "Saint Joseph University of Beirut",
    nameAr: "جامعة القدّيس يوسف في بيروت",
    acronym: "USJ",
    city: "Beirut",
    cityAr: "بيروت",
    type: "Private",
    founded: 1875,
    fields: ["Medicine", "Law", "Business", "Engineering", "Humanities"],
    fieldsAr: ["الطب", "الحقوق", "إدارة الأعمال", "الهندسة", "العلوم الإنسانية"],
    description:
      "A French-tradition Jesuit university and one of Lebanon's most prestigious, especially strong in medicine, law and political science. Instruction is mainly in French with English programs.",
    descriptionAr:
      "جامعة يسوعية عريقة ذات تقليد فرنسي ومن أرقى جامعات لبنان، تتميّز بالطب والحقوق والعلوم السياسية. التدريس أساساً بالفرنسية مع برامج بالإنجليزية.",
    website: "usj.edu.lb",
    tuitionTier: "High",
    tuitionRange: "$8,000–$16,000 / year",
    admission: ADM.french.en,
    admissionAr: ADM.french.ar,
  },
  {
    rank: 3,
    name: "Lebanese American University",
    nameAr: "الجامعة اللبنانية الأميركية",
    acronym: "LAU",
    city: "Beirut / Byblos",
    cityAr: "بيروت / جبيل",
    type: "Private",
    founded: 1924,
    fields: ["Pharmacy", "Engineering", "Business", "Medicine", "Arts & Sciences"],
    fieldsAr: ["الصيدلة", "الهندسة", "إدارة الأعمال", "الطب", "الآداب والعلوم"],
    description:
      "American-accredited university with two campuses, renowned for pharmacy, business and its schools of medicine and engineering. Fully English-language with strong US partnerships.",
    descriptionAr:
      "جامعة معتمدة أميركياً بحرمين جامعيين، تشتهر بالصيدلة وإدارة الأعمال وكليتَي الطب والهندسة. التدريس بالإنجليزية بالكامل مع شراكات أميركية قوية.",
    website: "lau.edu.lb",
    tuitionTier: "Premium",
    tuitionRange: "$17,000–$26,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 4,
    name: "Lebanese University",
    nameAr: "الجامعة اللبنانية",
    acronym: "LU",
    city: "Beirut (multi-campus)",
    cityAr: "بيروت (عدّة فروع)",
    type: "Public",
    founded: 1951,
    fields: ["Medicine", "Engineering", "Law", "Sciences", "Fine Arts"],
    fieldsAr: ["الطب", "الهندسة", "الحقوق", "العلوم", "الفنون الجميلة"],
    description:
      "The only public (state) university in Lebanon, with campuses across all regions and the largest student body. Low tuition and competitive-entry faculties in medicine and engineering.",
    descriptionAr:
      "الجامعة الحكومية الوحيدة في لبنان، لها فروع في كل المناطق وأكبر عدد طلاب. أقساطها منخفضة وكلياتها في الطب والهندسة تعتمد مباريات دخول تنافسية.",
    website: "ul.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$300–$1,500 / year",
    admission: ADM.public.en,
    admissionAr: ADM.public.ar,
  },
  {
    rank: 5,
    name: "University of Balamand",
    nameAr: "جامعة البلمند",
    acronym: "UOB",
    city: "Koura (North)",
    cityAr: "الكورة (الشمال)",
    type: "Private",
    founded: 1988,
    fields: ["Medicine", "Engineering", "Business", "Fine Arts", "Sciences"],
    fieldsAr: ["الطب", "الهندسة", "إدارة الأعمال", "الفنون الجميلة", "العلوم"],
    description:
      "A respected university in the North with a strong medical school (in partnership with major hospitals) and the Lebanese Academy of Fine Arts (ALBA). English-language instruction.",
    descriptionAr:
      "جامعة مرموقة في الشمال بكلية طب قوية (بالشراكة مع مستشفيات كبرى) وتضم الأكاديمية اللبنانية للفنون الجميلة (ألبا). التدريس بالإنجليزية.",
    website: "balamand.edu.lb",
    tuitionTier: "High",
    tuitionRange: "$9,000–$16,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 6,
    name: "Holy Spirit University of Kaslik",
    nameAr: "جامعة الروح القدس - الكسليك",
    acronym: "USEK",
    city: "Jounieh (Kaslik)",
    cityAr: "جونية (الكسليك)",
    type: "Private",
    founded: 1938,
    fields: ["Engineering", "Business", "Music", "Law", "Sciences"],
    fieldsAr: ["الهندسة", "إدارة الأعمال", "الموسيقى", "الحقوق", "العلوم"],
    description:
      "One of the oldest private universities, founded by the Lebanese Maronite Order, with a well-known music conservatory and strong engineering and business schools.",
    descriptionAr:
      "من أقدم الجامعات الخاصة، أسّسها الرهبانية اللبنانية المارونية، وتشتهر بمعهد الموسيقى وكليات الهندسة وإدارة الأعمال القوية.",
    website: "usek.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$7,000–$13,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 7,
    name: "Notre Dame University – Louaize",
    nameAr: "جامعة سيّدة اللويزة",
    acronym: "NDU",
    city: "Zouk Mosbeh",
    cityAr: "ذوق مصبح",
    type: "Private",
    founded: 1987,
    fields: ["Business", "Engineering", "Architecture", "Media", "Sciences"],
    fieldsAr: ["إدارة الأعمال", "الهندسة", "العمارة", "الإعلام", "العلوم"],
    description:
      "A Catholic English-language university with a scenic campus, especially strong in business, architecture and media/communication arts. Multiple regional campuses.",
    descriptionAr:
      "جامعة كاثوليكية تدرّس بالإنجليزية بحرم جميل، تتميّز بإدارة الأعمال والعمارة والإعلام وفنون الاتصال. لها عدة فروع في المناطق.",
    website: "ndu.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$8,000–$14,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 8,
    name: "Beirut Arab University",
    nameAr: "جامعة بيروت العربية",
    acronym: "BAU",
    city: "Beirut (Tarik El Jdideh)",
    cityAr: "بيروت (طريق الجديدة)",
    type: "Private",
    founded: 1960,
    fields: ["Engineering", "Medicine", "Architecture", "Law", "Pharmacy"],
    fieldsAr: ["الهندسة", "الطب", "العمارة", "الحقوق", "الصيدلة"],
    description:
      "A large university historically linked to Alexandria University (Egypt), popular for engineering, architecture and law, with affordable tuition and campuses in Beirut, Debbieh and Tripoli.",
    descriptionAr:
      "جامعة كبيرة مرتبطة تاريخياً بجامعة الإسكندرية (مصر)، تشتهر بالهندسة والعمارة والحقوق، بأقساط معقولة وفروع في بيروت والدبية وطرابلس.",
    website: "bau.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$4,000–$9,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 9,
    name: "Haigazian University",
    nameAr: "جامعة هايكازيان",
    acronym: "HU",
    city: "Beirut (Kantari)",
    cityAr: "بيروت (القنطاري)",
    type: "Private",
    founded: 1955,
    fields: ["Business", "Sciences", "Humanities", "Education", "Psychology"],
    fieldsAr: ["إدارة الأعمال", "العلوم", "العلوم الإنسانية", "التربية", "علم النفس"],
    description:
      "A small American-style liberal-arts university of Armenian heritage, known for a personal, close-knit environment and strong programs in business and social sciences.",
    descriptionAr:
      "جامعة صغيرة على الطراز الأميركي للآداب الحرّة ذات إرث أرمني، تشتهر ببيئة قريبة وشخصية وبرامج قوية في إدارة الأعمال والعلوم الاجتماعية.",
    website: "haigazian.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$6,000–$10,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 10,
    name: "Antonine University",
    nameAr: "الجامعة الأنطونية",
    acronym: "UA",
    city: "Baabda (Hadat)",
    cityAr: "بعبدا (الحدت)",
    type: "Private",
    founded: 1996,
    fields: ["Engineering", "Health Sciences", "Music", "Media", "Business"],
    fieldsAr: ["الهندسة", "العلوم الصحية", "الموسيقى", "الإعلام", "إدارة الأعمال"],
    description:
      "Founded by the Antonine Maronite Order, recognized for telecom/computer engineering, health sciences (physiotherapy, audiology) and music. Campuses in Hadat, Zahle, Nabatieh and Mejdlaya.",
    descriptionAr:
      "أسّسها الرهبانية الأنطونية المارونية، وتشتهر بهندسة الاتصالات والحاسوب والعلوم الصحية (العلاج الفيزيائي والسمعيات) والموسيقى. لها فروع في الحدت وزحلة والنبطية ومجدليا.",
    website: "ua.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$6,000–$11,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 11,
    name: "Rafik Hariri University",
    nameAr: "جامعة رفيق الحريري",
    acronym: "RHU",
    city: "Mechref (Damour)",
    cityAr: "مشرف (الدامور)",
    type: "Private",
    founded: 1999,
    fields: ["Engineering", "Business", "Computer Science", "Health Sciences"],
    fieldsAr: ["الهندسة", "إدارة الأعمال", "علوم الحاسوب", "العلوم الصحية"],
    description:
      "A modern campus university (formerly a college of science and technology) with a strong engineering and computing focus and growing health-sciences programs.",
    descriptionAr:
      "جامعة حديثة بحرم واسع (كانت كلية للعلوم والتكنولوجيا)، تركّز بقوة على الهندسة والمعلوماتية مع برامج علوم صحية متنامية.",
    website: "rhu.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$7,000–$12,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 12,
    name: "American University of Science and Technology",
    nameAr: "الجامعة الأميركية للعلوم والتكنولوجيا",
    acronym: "AUST",
    city: "Beirut (Ashrafieh)",
    cityAr: "بيروت (الأشرفية)",
    type: "Private",
    founded: 2000,
    fields: ["Business", "Engineering", "Arts & Sciences", "Public Health"],
    fieldsAr: ["إدارة الأعمال", "الهندسة", "الآداب والعلوم", "الصحة العامة"],
    description:
      "An English-language university with an American credit system and several regional campuses, offering business, engineering, arts & sciences and public-health programs.",
    descriptionAr:
      "جامعة تدرّس بالإنجليزية بنظام ساعات معتمدة أميركي ولها عدة فروع، تقدّم برامج في إدارة الأعمال والهندسة والآداب والعلوم والصحة العامة.",
    website: "aust.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$6,000–$10,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 13,
    name: "Lebanese International University",
    nameAr: "الجامعة اللبنانية الدولية",
    acronym: "LIU",
    city: "Beirut / Bekaa (multi-campus)",
    cityAr: "بيروت / البقاع (عدّة فروع)",
    type: "Private",
    founded: 2001,
    fields: ["Engineering", "Business", "Pharmacy", "Education", "Arts"],
    fieldsAr: ["الهندسة", "إدارة الأعمال", "الصيدلة", "التربية", "الآداب"],
    description:
      "The largest private university by enrollment, with campuses across every region and affordable tuition, making higher education accessible nationwide.",
    descriptionAr:
      "أكبر جامعة خاصة من حيث عدد الطلاب، ولها فروع في كل المناطق وأقساط ميسّرة، ما يجعل التعليم العالي متاحاً في كل لبنان.",
    website: "liu.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$3,000–$6,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 14,
    name: "Islamic University of Lebanon",
    nameAr: "الجامعة الإسلامية في لبنان",
    acronym: "IUL",
    city: "Khaldeh",
    cityAr: "خلدة",
    type: "Private",
    founded: 1996,
    fields: ["Engineering", "Business", "Law", "Health Sciences", "Islamic Studies"],
    fieldsAr: ["الهندسة", "إدارة الأعمال", "الحقوق", "العلوم الصحية", "الدراسات الإسلامية"],
    description:
      "A private university with campuses in Khaldeh, Baalbek, Tyre and Wardaniyeh, offering engineering, business, law, health sciences and Islamic studies.",
    descriptionAr:
      "جامعة خاصة لها فروع في خلدة وبعلبك وصور والوردانية، تقدّم برامج في الهندسة وإدارة الأعمال والحقوق والعلوم الصحية والدراسات الإسلامية.",
    website: "iul.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$3,000–$6,000 / year",
    admission: ADM.arabic.en,
    admissionAr: ADM.arabic.ar,
  },
  {
    rank: 15,
    name: "La Sagesse University",
    nameAr: "جامعة الحكمة",
    acronym: "ULS",
    city: "Furn El Chebbak",
    cityAr: "فرن الشباك",
    type: "Private",
    founded: 1875,
    fields: ["Law", "Business", "Political Science", "Media"],
    fieldsAr: ["الحقوق", "إدارة الأعمال", "العلوم السياسية", "الإعلام"],
    description:
      "Rooted in the historic La Sagesse law school (one of Lebanon's oldest), it is especially reputable for law, political science and business.",
    descriptionAr:
      "تعود جذورها إلى كلية الحقوق العريقة في الحكمة (من أقدم كليات الحقوق في لبنان)، وتتميّز خصوصاً بالحقوق والعلوم السياسية وإدارة الأعمال.",
    website: "uls.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$6,000–$10,000 / year",
    admission: ADM.french.en,
    admissionAr: ADM.french.ar,
  },
  {
    rank: 16,
    name: "Phoenicia University",
    nameAr: "جامعة فينيقيا",
    acronym: "PU",
    city: "Zahrani (South)",
    cityAr: "الزهراني (الجنوب)",
    type: "Private",
    founded: 2013,
    fields: ["Engineering", "Business", "Pharmacy", "Sciences"],
    fieldsAr: ["الهندسة", "إدارة الأعمال", "الصيدلة", "العلوم"],
    description:
      "A newer university in the South with a large modern campus, offering engineering, pharmacy, business and sciences with an English-language system.",
    descriptionAr:
      "جامعة حديثة في الجنوب بحرم عصري واسع، تقدّم الهندسة والصيدلة وإدارة الأعمال والعلوم بنظام تدريس بالإنجليزية.",
    website: "pu.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$5,000–$9,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 17,
    name: "Modern University for Business and Science",
    nameAr: "الجامعة الحديثة للإدارة والعلوم",
    acronym: "MUBS",
    city: "Beirut (Damour & multi-campus)",
    cityAr: "بيروت (الدامور وعدّة فروع)",
    type: "Private",
    founded: 2000,
    fields: ["Business", "Computer Science", "Health Sciences", "Arts"],
    fieldsAr: ["إدارة الأعمال", "علوم الحاسوب", "العلوم الصحية", "الآداب"],
    description:
      "A business- and technology-focused university with several campuses and international academic partnerships, popular for management and computing degrees.",
    descriptionAr:
      "جامعة تركّز على إدارة الأعمال والتكنولوجيا، لها عدة فروع وشراكات أكاديمية دولية، وتشتهر بشهادات الإدارة والمعلوماتية.",
    website: "mubs.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$5,000–$9,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 18,
    name: "American University of Technology",
    nameAr: "الجامعة الأميركية للتكنولوجيا",
    acronym: "AUT",
    city: "Fidar (Byblos)",
    cityAr: "فيدار (جبيل)",
    type: "Private",
    founded: 2000,
    fields: ["Business", "Engineering", "Nursing", "Arts & Sciences"],
    fieldsAr: ["إدارة الأعمال", "الهندسة", "التمريض", "الآداب والعلوم"],
    description:
      "An English-language university on the coastal Byblos road, offering business, engineering, nursing and arts & sciences with a US-style credit system.",
    descriptionAr:
      "جامعة تدرّس بالإنجليزية على طريق جبيل الساحلي، تقدّم إدارة الأعمال والهندسة والتمريض والآداب والعلوم بنظام ساعات أميركي.",
    website: "aut.edu",
    tuitionTier: "Moderate",
    tuitionRange: "$6,000–$10,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 19,
    name: "Global University",
    nameAr: "الجامعة العالمية",
    acronym: "GU",
    city: "Beirut (Bir Hassan)",
    cityAr: "بيروت (بئر حسن)",
    type: "Private",
    founded: 2000,
    fields: ["Business", "Engineering", "Health Sciences", "Arts"],
    fieldsAr: ["إدارة الأعمال", "الهندسة", "العلوم الصحية", "الآداب"],
    description:
      "A private university offering business, engineering, health sciences and arts programs, with a focus on accessible, career-oriented education.",
    descriptionAr:
      "جامعة خاصة تقدّم برامج في إدارة الأعمال والهندسة والعلوم الصحية والآداب، مع تركيز على تعليم ميسّر موجّه نحو سوق العمل.",
    website: "gu.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$4,000–$8,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 20,
    name: "Al-Maaref University",
    nameAr: "جامعة المعارف",
    acronym: "MU",
    city: "Beirut (Airport Road)",
    cityAr: "بيروت (طريق المطار)",
    type: "Private",
    founded: 2014,
    fields: ["Engineering", "Business", "Media", "Health Sciences"],
    fieldsAr: ["الهندسة", "إدارة الأعمال", "الإعلام", "العلوم الصحية"],
    description:
      "A modern private university offering engineering, business, media and health sciences, with a growing research and community-service orientation.",
    descriptionAr:
      "جامعة خاصة حديثة تقدّم الهندسة وإدارة الأعمال والإعلام والعلوم الصحية، مع توجّه متنامٍ نحو البحث وخدمة المجتمع.",
    website: "mu.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$4,000–$8,000 / year",
    admission: ADM.arabic.en,
    admissionAr: ADM.arabic.ar,
  },
  {
    rank: 21,
    name: "American University of Culture and Education",
    nameAr: "الجامعة الأميركية للثقافة والتعليم",
    acronym: "AUCE",
    city: "Beirut (multi-campus)",
    cityAr: "بيروت (عدّة فروع)",
    type: "Private",
    founded: 1998,
    fields: ["Business", "Education", "Arts & Sciences", "Health Sciences"],
    fieldsAr: ["إدارة الأعمال", "التربية", "الآداب والعلوم", "العلوم الصحية"],
    description:
      "An English-language university with several campuses (Beirut, Koura, Tyre, Nabatieh), offering business, education, arts & sciences and health-sciences degrees.",
    descriptionAr:
      "جامعة تدرّس بالإنجليزية ولها عدة فروع (بيروت، الكورة، صور، النبطية)، تقدّم شهادات في إدارة الأعمال والتربية والآداب والعلوم والعلوم الصحية.",
    website: "auce.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$4,000–$8,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 22,
    name: "Middle East University",
    nameAr: "جامعة الشرق الأوسط",
    acronym: "MEU",
    city: "Beirut (Sabtieh)",
    cityAr: "بيروت (السبتية)",
    type: "Private",
    founded: 1939,
    fields: ["Business", "Education", "Theology", "Arts"],
    fieldsAr: ["إدارة الأعمال", "التربية", "اللاهوت", "الآداب"],
    description:
      "A small liberal-arts university with a long history, offering business, education, theology and arts programs in a close campus community.",
    descriptionAr:
      "جامعة صغيرة للآداب الحرّة ذات تاريخ طويل، تقدّم برامج في إدارة الأعمال والتربية واللاهوت والآداب ضمن مجتمع جامعي قريب.",
    website: "meu.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$5,000–$9,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 23,
    name: "Jinan University",
    nameAr: "جامعة الجنان",
    acronym: "JU",
    city: "Tripoli (North)",
    cityAr: "طرابلس (الشمال)",
    type: "Private",
    founded: 1988,
    fields: ["Business", "Media", "Health Sciences", "Engineering"],
    fieldsAr: ["إدارة الأعمال", "الإعلام", "العلوم الصحية", "الهندسة"],
    description:
      "One of the North's established private universities, based in Tripoli, offering business, media, health sciences and engineering.",
    descriptionAr:
      "من الجامعات الخاصة العريقة في الشمال، مقرّها طرابلس، تقدّم إدارة الأعمال والإعلام والعلوم الصحية والهندسة.",
    website: "jinan.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$3,000–$6,000 / year",
    admission: ADM.arabic.en,
    admissionAr: ADM.arabic.ar,
  },
  {
    rank: 24,
    name: "Al-Manar University of Tripoli",
    nameAr: "جامعة المنار في طرابلس",
    acronym: "MUT",
    city: "Tripoli (North)",
    cityAr: "طرابلس (الشمال)",
    type: "Private",
    founded: 2010,
    fields: ["Business", "Engineering", "Health Sciences", "Arts"],
    fieldsAr: ["إدارة الأعمال", "الهندسة", "العلوم الصحية", "الآداب"],
    description:
      "A private university in Tripoli serving the North, offering business, engineering, health sciences and arts programs.",
    descriptionAr:
      "جامعة خاصة في طرابلس تخدم الشمال، تقدّم برامج في إدارة الأعمال والهندسة والعلوم الصحية والآداب.",
    website: "mut.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$3,000–$6,000 / year",
    admission: ADM.arabic.en,
    admissionAr: ADM.arabic.ar,
  },
  {
    rank: 25,
    name: "Lebanese German University",
    nameAr: "الجامعة اللبنانية الألمانية",
    acronym: "LGU",
    city: "Jounieh (Sahel Alma)",
    cityAr: "جونية (ساحل علما)",
    type: "Private",
    founded: 2001,
    fields: ["Engineering", "Business", "Design", "Health Sciences"],
    fieldsAr: ["الهندسة", "إدارة الأعمال", "التصميم", "العلوم الصحية"],
    description:
      "A university with a German academic orientation and partnerships, offering engineering, business, design and health-sciences programs.",
    descriptionAr:
      "جامعة ذات توجّه أكاديمي ألماني وشراكات، تقدّم برامج في الهندسة وإدارة الأعمال والتصميم والعلوم الصحية.",
    website: "lgu.edu.lb",
    tuitionTier: "Moderate",
    tuitionRange: "$5,000–$9,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 26,
    name: "Lebanese Canadian University",
    nameAr: "الجامعة اللبنانية الكندية",
    acronym: "LCU",
    city: "Aintoura (Keserwan)",
    cityAr: "عينطورة (كسروان)",
    type: "Private",
    founded: 2003,
    fields: ["Business", "Engineering", "Health Sciences", "Arts"],
    fieldsAr: ["إدارة الأعمال", "الهندسة", "العلوم الصحية", "الآداب"],
    description:
      "A private university with a Canadian academic orientation, offering business, engineering, health sciences and arts programs.",
    descriptionAr:
      "جامعة خاصة ذات توجّه أكاديمي كندي، تقدّم برامج في إدارة الأعمال والهندسة والعلوم الصحية والآداب.",
    website: "lcu.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$4,000–$7,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 27,
    name: "Holy Family University",
    nameAr: "جامعة العائلة المقدّسة",
    acronym: "HFU",
    city: "Batroun (North)",
    cityAr: "البترون (الشمال)",
    type: "Private",
    founded: 2000,
    fields: ["Business", "Health Sciences", "Education", "Arts"],
    fieldsAr: ["إدارة الأعمال", "العلوم الصحية", "التربية", "الآداب"],
    description:
      "A Catholic university in Batroun serving the northern coast, offering business, health sciences, education and arts programs.",
    descriptionAr:
      "جامعة كاثوليكية في البترون تخدم الساحل الشمالي، تقدّم برامج في إدارة الأعمال والعلوم الصحية والتربية والآداب.",
    website: "usf.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$4,000–$7,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 28,
    name: "Arts, Sciences and Technology University in Lebanon",
    nameAr: "جامعة الفنون والعلوم والتكنولوجيا في لبنان",
    acronym: "AUL",
    city: "Beirut (multi-campus)",
    cityAr: "بيروت (عدّة فروع)",
    type: "Private",
    founded: 2000,
    fields: ["Business", "Computer Science", "Law", "Arts"],
    fieldsAr: ["إدارة الأعمال", "علوم الحاسوب", "الحقوق", "الآداب"],
    description:
      "A private university with campuses across Lebanon offering business, computer science, law and arts programs, with a practical, career-oriented approach.",
    descriptionAr:
      "جامعة خاصة لها فروع في مختلف المناطق، تقدّم إدارة الأعمال وعلوم الحاسوب والحقوق والآداب بنهج عملي موجّه نحو سوق العمل.",
    website: "aul.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$3,500–$7,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 29,
    name: "University of Sciences and Arts in Lebanon",
    nameAr: "جامعة العلوم والآداب في لبنان",
    acronym: "USAL",
    city: "Beirut (Zoukak El Blat)",
    cityAr: "بيروت (زقاق البلاط)",
    type: "Private",
    founded: 2013,
    fields: ["Business", "Engineering", "Health Sciences", "Arts"],
    fieldsAr: ["إدارة الأعمال", "الهندسة", "العلوم الصحية", "الآداب"],
    description:
      "A private university offering business, engineering, health sciences and arts programs with a focus on practical skills and employability.",
    descriptionAr:
      "جامعة خاصة تقدّم برامج في إدارة الأعمال والهندسة والعلوم الصحية والآداب، مع تركيز على المهارات العملية والقابلية للتوظيف.",
    website: "usal.edu.lb",
    tuitionTier: "Low",
    tuitionRange: "$4,000–$8,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
  {
    rank: 30,
    name: "City University",
    nameAr: "الجامعة المدينة",
    acronym: "CU",
    city: "Beirut (Aramoun)",
    cityAr: "بيروت (عرمون)",
    type: "Private",
    founded: 2013,
    fields: ["Business", "Computer Science", "Health Sciences", "Arts"],
    fieldsAr: ["إدارة الأعمال", "علوم الحاسوب", "العلوم الصحية", "الآداب"],
    description:
      "A private university offering business, computing, health-sciences and arts programs, aimed at accessible and applied higher education.",
    descriptionAr:
      "جامعة خاصة تقدّم برامج في إدارة الأعمال والمعلوماتية والعلوم الصحية والآداب، تهدف إلى تعليم عالٍ ميسّر وتطبيقي.",
    website: "",
    tuitionTier: "Low",
    tuitionRange: "$3,000–$6,000 / year",
    admission: ADM.english.en,
    admissionAr: ADM.english.ar,
  },
];

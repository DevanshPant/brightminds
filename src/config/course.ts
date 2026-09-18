/**
 * ─────────────────────────────────────────────────────────────
 *  BrightMinds - Course catalogue
 *  Edit THIS FILE to change course content. Nothing else needs
 *  to change when you add a course or tweak copy/pricing.
 *  `price` is in RUPEES (₹). The server converts it to paise.
 * ─────────────────────────────────────────────────────────────
 */

export type Course = {
  id: string;
  slug: string;
  title: string;
  /** Big heading shown on the course page */
  heading: string;
  /** Small pill above the heading */
  tagline: string;
  subtitle: string;
  description: string;
  price: number;          // ₹ INR
  originalPrice?: number; // ₹ INR - shown struck through
  duration: string;
  mode: string;
  eligibility: string;
  seats?: string;
  startsOn?: string;
  highlights: { title: string; description: string }[];
  curriculum: { module: string; points: string[] }[];
  outcomes: string[];
  faqs: { q: string; a: string }[];
  active: boolean;
};

export const COURSES: Course[] = [
  {
    id: 'nda-1-april-2027',
    slug: 'nda-1-april-2027',
    title: 'NDA (I) April 2027',
    heading: 'Your Journey to the Academy Starts Here.',
    tagline: 'New Batch',
    subtitle: 'Complete written exam preparation for the UPSC NDA & NA Examination',
    description:
      'Six months of structured, mentor-led online coaching covering the complete UPSC NDA written syllabus. Mathematics and the General Ability Test are taught from the ground up against the official syllabus, with regular full-length mocks and detailed analysis of every paper.',
    price: 499,
    originalPrice: 1500,
    duration: '6 months',
    mode: 'Live Online Classes',
    eligibility: 'Class 11, 12 & 12th-pass aspirants',
    seats: 'Limited seats per batch',
    startsOn: '27 Sept 2026',
    highlights: [
      {
        title: 'Paper I - Mathematics',
        description: 'All 300 marks covered against the official UPSC syllabus, from basics to exam-level problem solving.',
      },
      {
        title: 'Paper II - General Ability Test',
        description: 'English and General Knowledge for the full 600 marks, taught topic by topic with regular revision.',
      },
      {
        title: 'Full-Length Mock Tests',
        description: 'Timed papers in the real exam pattern, with negative marking, followed by detailed analysis of every mistake.',
      },
    ],
    curriculum: [
      {
        module: 'Paper I - Mathematics (300 marks)',
        points: [
          'Algebra, Matrices and Determinants',
          'Trigonometry',
          'Analytical Geometry of two and three dimensions',
          'Differential and Integral Calculus, Differential Equations',
          'Vector Algebra, Statistics and Probability',
        ],
      },
      {
        module: 'Paper II - General Ability Test (600 marks)',
        points: [
          'English: grammar, vocabulary, comprehension and cohesion (200 marks)',
          'Physics and Chemistry',
          'General Science, History and the Freedom Movement',
          'Geography and Current Events (400 marks with the above)',
        ],
      },
      {
        module: 'Test Series & Revision',
        points: [
          'Sectional tests through the course',
          'Full-length mocks in the real exam pattern',
          'Negative-marking strategy and attempt planning',
          'Performance review after every paper',
        ],
      },
    ],
    outcomes: [
      'Complete coverage of the UPSC NDA written syllabus, Mathematics and GAT',
      'Exam temperament built through timed, full-length mocks',
      'A clear attempt strategy that accounts for negative marking',
      'Regular doubt support through the BrightMinds student community',
    ],
    faqs: [
      {
        q: 'Who can apply for the NDA?',
        a: 'Unmarried candidates who have passed or are appearing for Class 12 (10+2). Candidates for the Air Force, Naval Academy and the Naval wing must have studied Physics, Chemistry and Mathematics in Class 12; the Army wing is open to any stream. UPSC publishes the exact age and date-of-birth window in each official notification - please confirm your eligibility there before applying.',
      },
      {
        q: 'What is the exam pattern?',
        a: 'Two written papers: Mathematics (300 marks) and the General Ability Test (600 marks - English 200, General Knowledge 400), for a written total of 900 marks. There is negative marking. This course covers the written examination; candidates who clear it are then called for the SSB interview conducted by the Services Selection Board.',
      },
      {
        q: 'Which exam sitting will I appear for?',
        a: 'UPSC conducts the NDA examination twice a year - NDA (I) is normally written in April and NDA (II) around September. Your mentor helps you decide which sitting to target based on your class, your syllabus coverage and your readiness. Exact dates always come from the official UPSC notification, and we share every update in the WhatsApp community as soon as it is announced.'
      },
      {
        q: 'Is ₹499 the full fee?',
        a: 'Yes. ₹499 is a one-time payment for the full 6-month programme. There are no hidden or recurring charges.',
      },
      {
        q: 'What happens right after I pay?',
        a: 'You instantly receive a payment receipt by email along with the private WhatsApp community link. All batch timings, class links and study material are shared there.',
      },
      {
        q: 'What if I miss a live class?',
        a: 'Let your mentor know in the community and they will help you cover what you missed, so you do not fall behind.',
      },
    ],
    active: true,
  },
];

export const getCourse = (idOrSlug: string): Course | undefined =>
  COURSES.find((c) => c.id === idOrSlug || c.slug === idOrSlug);

export const PRIMARY_COURSE = COURSES[0];

/*
 * The WhatsApp community link is deliberately NOT exposed here. A VITE_ value
 * is compiled into the JavaScript of every page, so publishing the invite
 * would let anyone join without paying. It reaches a student only through
 * their own enrolment record, which Firestore rules restrict to them.
 */

export const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

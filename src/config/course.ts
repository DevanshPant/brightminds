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
    title: 'NDA-1 April 2027',
    heading: 'Your Journey to the Academy Starts Here.',
    tagline: 'New Batch',
    subtitle: 'Complete written and SSB preparation for the UPSC NDA & NA Examination',
    description:
      'Six months of structured, mentor-led coaching covering the complete UPSC NDA syllabus. Mathematics and the General Ability Test are taught from the ground up against the official syllabus, with regular full-length mocks. Alongside the written paper, you are prepared for what most aspirants ignore until it is too late - the SSB interview, and the physical and medical standards. Taught by mentors who include serving and veteran officers.',
    price: 499,
    originalPrice: 1500,
    duration: '6 months of live coaching',
    mode: 'Live online + recordings',
    eligibility: 'Class 11, 12 & 12th-pass aspirants',
    seats: 'Limited seats per batch',
    startsOn: 'Starts 11 April 2027',
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
        title: 'SSB Interview Preparation',
        description: 'Screening, psychological tests, GTO tasks and the personal interview - explained and practised, not left to chance.',
      },
      {
        title: 'Full-Length Mock Tests',
        description: 'Timed papers in the real exam pattern, with negative marking, followed by detailed analysis of every mistake.',
      },
      {
        title: 'Officer Mentorship',
        description: 'Guidance from serving and veteran officers who have been through the selection process themselves.',
      },
      {
        title: 'Physical & Medical Readiness',
        description: 'Fitness targets and the common medical rejections, so nothing avoidable stands between you and selection.',
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
      {
        module: 'SSB Interview & Beyond',
        points: [
          'Stage I: Officer Intelligence Rating, Picture Perception and Discussion',
          'Stage II: psychological tests, GTO tasks, personal interview and conference',
          'Officer Like Qualities - what assessors actually look for',
          'Physical fitness targets and common medical rejections',
        ],
      },
    ],
    outcomes: [
      'Complete coverage of the UPSC NDA written syllabus, Mathematics and GAT',
      'Exam temperament built through timed, full-length mocks',
      'A clear attempt strategy that accounts for negative marking',
      'Real understanding of the SSB process instead of second-hand advice',
      'Direct access to officer mentors through the BrightMinds community',
    ],
    faqs: [
      {
        q: 'Who can apply for the NDA?',
        a: 'Unmarried candidates who have passed or are appearing for Class 12 (10+2). Candidates for the Air Force, Naval Academy and the Naval wing must have studied Physics, Chemistry and Mathematics in Class 12; the Army wing is open to any stream. UPSC publishes the exact age and date-of-birth window in each official notification - please confirm your eligibility there before applying.',
      },
      {
        q: 'What is the exam pattern?',
        a: 'Two written papers: Mathematics (300 marks) and the General Ability Test (600 marks - English 200, General Knowledge 400), for a written total of 900 marks. There is negative marking. Candidates who clear the written paper go on to the SSB interview, which also carries 900 marks.',
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
        a: 'Every session is recorded and shared in the community, so nothing is missed.',
      },
      {
        q: 'Do you prepare us for the SSB as well?',
        a: 'Yes. SSB preparation is built into the course rather than sold separately, and is guided by mentors who have been through the selection process themselves.',
      },
    ],
    active: true,
  },
];

export const getCourse = (idOrSlug: string): Course | undefined =>
  COURSES.find((c) => c.id === idOrSlug || c.slug === idOrSlug);

export const PRIMARY_COURSE = COURSES[0];

/** Public WhatsApp community link - set VITE_WHATSAPP_COMMUNITY_LINK in .env */
export const WHATSAPP_COMMUNITY_LINK: string =
  import.meta.env.VITE_WHATSAPP_COMMUNITY_LINK || '';

export const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

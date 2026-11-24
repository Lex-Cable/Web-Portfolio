import type {
  Education,
  Experience,
  GithubSettings,
  PortfolioProfile,
  Project,
  Skill,
} from '../types/portfolio';

export const DEFAULT_CV_PDF_PATH =
  '/assets/aistudio/Jacinta_Wambui_Waweru_Professional_CV_83c4f51b.pdf';
export const DEFAULT_CV_FILENAME = 'Jacinta_Wambui_Waweru_Professional_CV.pdf';

export const DEFAULT_PROFILE: PortfolioProfile = {
  name: 'Jacinta Wambui Waweru',
  title: 'Full-Stack Developer',
  location: 'Nairobi, Kenya',
  githubUsername: 'Lex-Cable',
  githubUrl: 'https://github.com/Lex-Cable',
  email: 'jaccie.wambui26@gmail.com',
  linkedinUrl: 'https://linkedin.com/in/jacinta-wambui-3b4696318/',
  devtoUrl: 'https://dev.to/lexcable',
  mastodonHandle: 'https://mastodon.social/@lex_Cab23',
  blueskyHandle: '@Lex_Cab23',
  headline:
    'Building practical, scalable web applications grounded in clean engineering and business understanding.',
  shortBio:
    'I am a Full-Stack Developer and Business Management undergraduate focused on designing and building practical, scalable digital solutions. Combining full-stack software engineering with business management insight allows me to build business-ready digital products that genuinely stand out.',
  fullBio:
    'I am a Full-Stack Developer interested in designing and developing practical, scalable digital solutions across responsive web interfaces, server-side logic, relational and NoSQL databases, and API integrations.\n\nIn as much as I am a Full-Stack Developer, I am still a Business Manager at the end of the day. Studying for a Bachelor of Business Management alongside software engineering has shaped how I approach every product I build—helping me understand business workflows, customer expectations, revenue realities, and operational clarity so that the business projects I create truly stand out.\n\nWhether collaborating on live commercial platforms or architecting full-stack web applications from scratch, I focus on turning ideas into dependable software that delivers measurable real-world value.',
  approach:
    'I approach software projects through both an engineering and business-management lens: first clarifying the underlying user, operational, and commercial workflow before choosing tools. From database schema design and Firestore security rules to responsive frontend interfaces, I prioritize data integrity, clear architecture, and practical usability.',
  careerGoals:
    'I am seeking software engineering roles, technical internships, and collaborative projects where I can contribute across the full stack while bringing business-oriented product thinking to every team and product.',
  photoUrl: '/assets/aistudio/image_bf3b1a1c.png',
  seoTitle: 'Jacinta Wambui Waweru — Full-Stack Developer',
  seoDescription:
    'Full-Stack Developer in Kenya building web applications with React, TypeScript, Node.js, Python, and Laravel. Explore verified projects and GitHub activity.',
};

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'berry-e-learning-platform',
    slug: 'berry-e-learning-platform',
    title: 'Berry E-Learning Platform',
    shortDescription:
      'A live, personalized e-learning platform built to support learners with structured curriculum pathways, interactive activities, mastery assessments, and AI-assisted study support.',
    problemStatement:
      'Many learners struggle with fragmented study materials and one-size-fits-all courses that fail to adapt to specific school curricula or track concept mastery clearly over time.',
    contributionRole:
      'Full-Stack Developer — designed and implemented the React + TypeScript client interface, Express backend services, Firestore data model and security rules, assessment grading workflows, and Gemini-assisted study support.',
    fullDescription:
      'Berry is a live e-learning platform organized around distinct educational stages, including early childhood (Berry Ali), primary and junior school aligned with Kenya’s Competency-Based Curriculum (Berry Junior), senior school (Berry Senior), and lifelong/professional learning.\n\nThe platform implements learner dashboards, curriculum module organization, interactive learning exercises, automated question banks, mastery calculation logic, learner certificate workflows, Firebase Authentication, hardened Firestore security rules, and server-side Gemini AI integration.',
    technologies: [
      'React',
      'TypeScript',
      'Tailwind CSS',
      'Node.js',
      'Express',
      'Firebase',
      'Cloud Firestore',
      'Gemini AI (@google/genai)',
      'Vite',
    ],
    features: [
      'Structured curriculum and grade-level course organization',
      'Learner dashboards with progress and mastery tracking logic',
      'Interactive learning activities with server-side answer verification',
      'Assessments, question banks, and certificate issuance workflows',
      'Firebase Authentication and rule-tested Firestore security boundaries',
      'Server-side Gemini AI educational assistance',
    ],
    verificationNote:
      'Technologies and modules verified directly against Lex-Cable/Berry-E-Learning-Platform-Development (package.json, server.ts, firestore.rules, and test suites). Live deployment active at berry-e-learning-platform-development.onrender.com.',
    imageUrl: '/src/assets/images/showcase_berry_elearning_1795504804753.jpg',
    githubUrl: 'https://github.com/Lex-Cable/Berry-E-Learning-Platform-Development',
    liveDemoUrl: 'https://berry-e-learning-platform-development.onrender.com/',
    status: 'Completed',
    featured: true,
    isPublic: true,
    sourceRepoName: 'Berry-E-Learning-Platform-Development',
    repoUpdatedAt: '2026-11-09T16:55:04Z',
    displayOrder: 1,
  },
  {
    id: 'buyhive-marketplace',
    slug: 'buyhive-marketplace',
    title: 'BuyHive Multi-Vendor E-Commerce Marketplace',
    shortDescription:
      'A multi-vendor e-commerce marketplace architecture designed to connect shoppers with independent sellers through moderated product listings, seller portals, and coordinated order workflows.',
    problemStatement:
      'Independent sellers often lack a unified, trustworthy online storefront with structured product inspection, while shoppers need reliable discovery and protected communication across multiple vendors.',
    contributionRole:
      'Full-Stack Developer — architected the marketplace domain structure using Laravel 12, Fortify authentication, Inertia.js with Vue 3, TypeScript, and MySQL schema planning alongside a React/Vite frontend shell.',
    fullDescription:
      'BuyHive is structured as a marketplace intermediary connecting customers, independent sellers, and marketplace operations. The repository houses a Laravel 12 backend (`laravel-app/`) configured with Laravel Fortify, Inertia.js (`inertiajs/inertia-laravel` and `@inertiajs/vue3`), Vue 3, TypeScript, Tailwind CSS, and MySQL database planning, alongside a Vite/Express web workspace.\n\nPlanned and in-progress marketplace workflows include seller registration and verification, product submission for inspection before publishing, category-based discovery, shopping cart and checkout flows, and coordinated order fulfillment.',
    technologies: [
      'PHP 8.3',
      'Laravel 12',
      'Laravel Fortify',
      'Inertia.js',
      'Vue 3',
      'TypeScript',
      'Tailwind CSS',
      'MySQL',
    ],
    features: [
      'Multi-vendor marketplace and Seller Portal architecture',
      'Authentication scaffolding via Laravel Fortify',
      'Inertia.js + Vue 3 SPA bridge for storefront and dashboard views',
      'Product discovery, category navigation, and listing inspection workflow design',
      'Coordinated order lifecycle and seller-customer privacy boundaries',
    ],
    verificationNote:
      'Stack verified directly against Lex-Cable/BuyHive (laravel-app/composer.json, laravel-app/package.json, and repository README). Project is actively under development; no live production URL is published.',
    imageUrl: '/src/assets/images/showcase_buyhive_marketplace_1795504805481.jpg',
    githubUrl: 'https://github.com/Lex-Cable/BuyHive',
    liveDemoUrl: '',
    status: 'In Development',
    featured: true,
    isPublic: true,
    sourceRepoName: 'BuyHive',
    repoUpdatedAt: '2026-11-01T00:00:00Z',
    displayOrder: 2,
  },
  {
    id: 'weego',
    slug: 'weego',
    title: 'Weego',
    shortDescription:
      'Responsive landing page for a Kenyan ride-hailing, package delivery, pick-up transportation, towing, and shuttle mobility platform.',
    problemStatement:
      'Urban commuters and logistics users across Kenya needed a clear, mobile-friendly digital storefront explaining ride tiers, multi-service delivery options, booking steps, and driver earning opportunities.',
    contributionRole:
      'Software Engineering Intern at Content Aggregation Limited (CAL) — played a central role in designing and building the responsive Weego landing page for production launch.',
    fullDescription:
      'Weego (weego.co.ke) is a Kenyan mobility and convenience platform covering Economy, Standard, Electric, XL, and Boda ride options alongside taxi hailing, parcel delivery, pick-up transportation, towing, and shuttle bus services.\n\nDuring my Software Engineering Internship at Content Aggregation Limited (CAL), I collaborated on shipping live client platforms and focused directly on crafting the Weego landing page—structuring responsive service cards, ride-type comparisons, a four-step rider walkthrough, and driver partner onboarding flows.',
    technologies: [
      'Nuxt.js',
      'Vue.js',
      'HTML5',
      'CSS3',
      'JavaScript',
      'Responsive Web Design',
    ],
    features: [
      'Responsive landing page built for Kenyan desktop and mobile visitors',
      'Structured ride-type showcase across Economy, Standard, Electric, XL, and Boda options',
      'Service breakdowns covering taxi hailing, package delivery, pick-up transport, and towing',
      'Four-step booking walkthrough and driver partner onboarding sections',
    ],
    verificationNote:
      'Live production site verified at weego.co.ke. Landing page built during Software Engineering Internship at Content Aggregation Limited (CAL); source repository is proprietary.',
    imageUrl: '/src/assets/images/showcase_weego_mobility_1795510024417.jpg',
    githubUrl: '',
    liveDemoUrl: 'https://weego.co.ke',
    status: 'Completed',
    featured: true,
    isPublic: true,
    sourceRepoName: '',
    repoUpdatedAt: '',
    displayOrder: 3,
  },
  {
    id: 'talent-bridge',
    slug: 'talent-bridge',
    title: 'Talent Bridge',
    shortDescription:
      'Remote talent placement platform connecting international companies with pre-screened, timezone-aligned Kenyan professionals through a guided four-step hiring flow.',
    problemStatement:
      'International hiring teams seeking remote professionals in Nairobi needed a structured alternative to generic job boards—one clearly presenting rigorous screening, fast placement timelines, and ongoing 90-day support.',
    contributionRole:
      'Software Engineering Intern at Content Aggregation Limited (CAL) — took full end-to-end ownership of developing and delivering the Talent Bridge web platform.',
    fullDescription:
      'Talent Bridge (talentbridgekenya.com) connects global companies with attitude-first Kenyan professionals through a four-stage process: Brief Us, We Source & Screen, You Choose, and They Thrive.\n\nDuring my Software Engineering Internship at Content Aggregation Limited (CAL), I carried full ownership of building and shipping Talent Bridge—implementing the Django web architecture, static asset pipeline, editorial typography, dedicated company and talent journeys, and live production deployment.',
    technologies: [
      'Python',
      'Django',
      'HTML5',
      'CSS3',
      'JavaScript',
      'Responsive Web Design',
    ],
    features: [
      'Full end-to-end ownership from web development through live production delivery',
      'Four-step client hiring workflow (Brief Us, We Source & Screen, You Choose, They Thrive)',
      'Dedicated navigation and landing pathways for hiring companies, talent, and team info',
      'Django core application structure with responsive static asset bundling',
    ],
    verificationNote:
      'Live production site verified at talentbridgekenya.com. Developed end-to-end during Software Engineering Internship at Content Aggregation Limited (CAL); source repository is proprietary.',
    imageUrl: '/src/assets/images/showcase_talent_bridge_1795510022765.jpg',
    githubUrl: '',
    liveDemoUrl: 'https://talentbridgekenya.com/',
    status: 'Completed',
    featured: true,
    isPublic: true,
    sourceRepoName: '',
    repoUpdatedAt: '',
    displayOrder: 4,
  },
];

export const DEFAULT_SKILLS: Skill[] = [
  // Frontend Development
  { id: 'skill-html5', name: 'HTML5', category: 'Frontend Development', proficiency: 'Proficient', isPublic: true, displayOrder: 1 },
  { id: 'skill-css3', name: 'CSS3 & Tailwind CSS', category: 'Frontend Development', proficiency: 'Proficient', isPublic: true, displayOrder: 2 },
  { id: 'skill-js', name: 'JavaScript', category: 'Frontend Development', proficiency: 'Comfortable', isPublic: true, displayOrder: 3 },
  { id: 'skill-react', name: 'React.js & TypeScript', category: 'Frontend Development', proficiency: 'Comfortable', isPublic: true, displayOrder: 4 },
  { id: 'skill-php', name: 'PHP', category: 'Frontend Development', proficiency: 'Comfortable', isPublic: true, displayOrder: 5 },

  // Backend Development
  { id: 'skill-python', name: 'Python', category: 'Backend Development', proficiency: 'Comfortable', isPublic: true, displayOrder: 6 },
  { id: 'skill-django', name: 'Django', category: 'Backend Development', proficiency: 'Familiar', isPublic: true, displayOrder: 7 },
  { id: 'skill-flask', name: 'Flask', category: 'Backend Development', proficiency: 'Familiar', isPublic: true, displayOrder: 8 },
  { id: 'skill-nodejs', name: 'Node.js', category: 'Backend Development', proficiency: 'Comfortable', isPublic: true, displayOrder: 9 },
  { id: 'skill-express', name: 'Express.js', category: 'Backend Development', proficiency: 'Comfortable', isPublic: true, displayOrder: 10 },
  { id: 'skill-laravel', name: 'Laravel', category: 'Backend Development', proficiency: 'Familiar', isPublic: true, displayOrder: 11 },

  // Databases
  { id: 'skill-postgres', name: 'PostgreSQL', category: 'Databases', proficiency: 'Familiar', isPublic: true, displayOrder: 12 },
  { id: 'skill-mongodb', name: 'MongoDB', category: 'Databases', proficiency: 'Familiar', isPublic: true, displayOrder: 13 },
  { id: 'skill-firebase', name: 'Firebase & Cloud Firestore', category: 'Databases', proficiency: 'Comfortable', isPublic: true, displayOrder: 14 },

  // Development Tools and DevOps
  { id: 'skill-git', name: 'Git', category: 'Development Tools and DevOps', proficiency: 'Comfortable', isPublic: true, displayOrder: 15 },
  { id: 'skill-github', name: 'GitHub', category: 'Development Tools and DevOps', proficiency: 'Comfortable', isPublic: true, displayOrder: 16 },
  { id: 'skill-gha', name: 'GitHub Actions', category: 'Development Tools and DevOps', proficiency: 'Familiar', isPublic: true, displayOrder: 17 },
  { id: 'skill-docker', name: 'Docker', category: 'Development Tools and DevOps', proficiency: 'Familiar', isPublic: true, displayOrder: 18 },
  { id: 'skill-cicd', name: 'CI/CD Workflows', category: 'Development Tools and DevOps', proficiency: 'Familiar', isPublic: true, displayOrder: 19 },

  // Other Technologies
  { id: 'skill-cpp', name: 'C++', category: 'Other Technologies', proficiency: 'Familiar', isPublic: true, displayOrder: 20 },
  { id: 'skill-rest', name: 'REST APIs', category: 'Other Technologies', proficiency: 'Comfortable', isPublic: true, displayOrder: 21 },
  { id: 'skill-graphql', name: 'GraphQL', category: 'Other Technologies', proficiency: 'Currently Learning', isPublic: true, displayOrder: 22 },
  { id: 'skill-websockets', name: 'WebSockets', category: 'Other Technologies', proficiency: 'Familiar', isPublic: true, displayOrder: 23 },

  // Additional Learning Interests
  { id: 'skill-ai', name: 'Artificial Intelligence', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 24 },
  { id: 'skill-ml', name: 'Machine Learning', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 25 },
  { id: 'skill-tf', name: 'TensorFlow', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 26 },
  { id: 'skill-pytorch', name: 'PyTorch', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 27 },
  { id: 'skill-sysdesign', name: 'System Design', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 28 },
  { id: 'skill-microservices', name: 'Microservices', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 29 },
  { id: 'skill-cloud', name: 'Cloud Computing', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 30 },
  { id: 'skill-aws', name: 'AWS', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 31 },
  { id: 'skill-k8s', name: 'Kubernetes', category: 'Additional Learning Interests', proficiency: 'Currently Learning', isPublic: true, displayOrder: 32 },
];

export const DEFAULT_EXPERIENCES: Experience[] = [
  {
    id: 'exp-cal-finance',
    organization: 'Content Aggregation Limited (CAL)',
    location: 'Nairobi, Kenya',
    role: 'Software Engineering Intern',
    period: 'May 2025 – September 2025',
    entryType: 'Internship',
    summary:
      'Collaborated on building and shipping live production websites including Weego (weego.co.ke), Viusasa (https://viusasa.com/), Talent Bridge (https://talentbridgekenya.com/), and Citizen Duka (https://viusasa.com/citizen-duka). Played a central role in creating the Weego landing page and took full end-to-end ownership of developing Talent Bridge.',
    highlights: [
      'Collaborated across live production platforms: Weego (weego.co.ke), Viusasa (https://viusasa.com/), Talent Bridge (https://talentbridgekenya.com/), and Citizen Duka (https://viusasa.com/citizen-duka)',
      'Designed and built the responsive Weego (weego.co.ke) landing page',
      'Took full ownership of developing and delivering Talent Bridge (https://talentbridgekenya.com/)',
      'Contributed hands-on web development and technical collaboration on Viusasa (https://viusasa.com/) and Citizen Duka (https://viusasa.com/citizen-duka)',
    ],
    ambiguityFlag: false,
    ambiguityNote: '',
    isPublic: true,
    displayOrder: 1,
  },
  {
    id: 'exp-mauku-njau',
    organization: 'Mauku Njau & Associates',
    location: 'Kenya',
    role: 'Accountant & Tax Advocate Intern',
    period: 'May 2026 – August 2026',
    entryType: 'Internship',
    summary:
      'Completed an internship focused on accounting workflows, tax documentation preparation, financial record organization, and office administrative support.',
    highlights: [
      'Supported preparation and organization of accounting and tax documentation',
      'Assisted with financial record verification and structured filing',
      'Provided administrative coordination across client and compliance workflows',
    ],
    ambiguityFlag: false,
    ambiguityNote: '',
    isPublic: true,
    displayOrder: 2,
  },
  {
    id: 'exp-roline-consultancy',
    organization: 'Roline Consultancy',
    location: 'Nigeria (Remote / Cross-Border)',
    role: 'Customer Care Agent',
    period: 'February 2025 – April 2026',
    entryType: 'Work Experience',
    summary:
      'Managed client communication channels, handled customer enquiries, resolved support issues, and maintained structured follow-ups and relationship continuity.',
    highlights: [
      'Handled incoming customer enquiries and provided timely support resolution',
      'Tracked follow-ups and documented client interactions systematically',
      'Strengthened client communication and collaborative problem-solving',
    ],
    ambiguityFlag: false,
    ambiguityNote: '',
    isPublic: true,
    displayOrder: 3,
  },
  {
    id: 'exp-cal-westlands-draft',
    organization: 'Cal Westlands',
    location: 'Westlands, Nairobi, Kenya',
    role: 'Multidisciplinary Intern (Business, Finance, HR & Web Development)',
    period: 'Approx. 6 months (Dates pending verification)',
    entryType: 'Draft Record',
    summary:
      'Previously recorded six-month internship exposure covering business operations, data entry, customer service, human resources, finance, and software/web development.',
    highlights: [
      'Exposure to business operations, data entry, and customer service workflows',
      'Assisted across human resources and finance support functions',
      'Hands-on exposure to software and web development tasks',
    ],
    ambiguityFlag: true,
    ambiguityNote:
      'Flagged for review: The exact relationship and date overlap between "Cal Westlands" and "Content Aggregation Limited (CAL)" (May 2025 – September 2025) must be verified by Jacinta before public display. Kept private until approved.',
    isPublic: false,
    displayOrder: 4,
  },
];

export const DEFAULT_EDUCATION: Education[] = [
  {
    id: 'edu-cuk-bbm',
    institution: 'The Co-operative University of Kenya',
    qualification: 'Bachelor of Business Management',
    expectedGraduation: '2027',
    statusLabel: 'In Progress — Expected Graduation 2027',
    location: 'Karen, Nairobi, Kenya',
    coursework: [
      'Accounting',
      'Finance',
      'Taxation',
      'Auditing',
      'Economics',
      'Human Resource Management',
      'Business Management',
      'Business Law',
    ],
    notes:
      'Undergraduate business studies complementing full-stack software engineering with grounding in finance, operational governance, and organizational strategy.',
    isPublic: true,
    displayOrder: 1,
  },
];

export const DEFAULT_GITHUB_SETTINGS: GithubSettings = {
  syncFrequencyMinutes: 360,
  autoMetadataRefresh: true,
  detectNewRepos: true,
  detectReadmeChanges: true,
  generateAiSuggestions: true,
  emailNotifications: false,
  requireApprovalBeforePublish: true,
  lastSyncAt: '',
  lastSyncStatus: 'Not synced yet',
  lastSyncSummary: 'Run a manual sync or enable scheduled sync in Admin Dashboard.',
};

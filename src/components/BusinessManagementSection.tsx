import React from 'react';
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  ChartNoAxesCombined,
  Download,
  GraduationCap,
  Handshake,
  Landmark,
  Users,
} from 'lucide-react';
import type { Education, Experience, PortfolioProfile } from '../types/portfolio';

interface BusinessManagementSectionProps {
  profile: PortfolioProfile;
  experiences: Experience[];
  education: Education[];
  onDownloadCv: () => void;
  onNavigate: (path: string) => void;
}

const focusAreas = [
  {
    icon: Calculator,
    title: 'Accounting, Finance & Taxation',
    description:
      'Academic grounding in accounting principles, financial management, taxation, and auditing.',
    topics: ['Accounting', 'Financial management', 'Taxation', 'Auditing'],
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Business Operations & Strategy',
    description:
      'Understanding how organisations plan, coordinate resources, evaluate decisions, and deliver value.',
    topics: ['Business management', 'Economics', 'Business law', 'Operations'],
  },
  {
    icon: Users,
    title: 'People & Customer Experience',
    description:
      'Practical experience supporting customers, communicating clearly, and maintaining service relationships.',
    topics: ['Customer care', 'Communication', 'Human resource management', 'Problem-solving'],
  },
  {
    icon: Landmark,
    title: 'Digital Business & Product Thinking',
    description:
      'Applying business context when shaping digital products, workflows, marketplace operations, and user journeys.',
    topics: ['Process thinking', 'Product planning', 'Workflow design', 'Digital services'],
  },
];

const businessApplications = [
  {
    title: 'Understand the operating model',
    description:
      'Clarify the people, processes, customer needs, and commercial goals behind a product before deciding how to build it.',
  },
  {
    title: 'Translate workflows into software',
    description:
      'Use business process understanding to shape practical features, clear user journeys, and maintainable application logic.',
  },
  {
    title: 'Keep the customer and organisation in view',
    description:
      'Balance usability, service quality, operational clarity, and the realities of running a digital product.',
  },
];

export function BusinessManagementSection({
  profile,
  experiences,
  education,
  onDownloadCv,
  onNavigate,
}: BusinessManagementSectionProps) {
  const publicExperiences = experiences
    .filter((item) => item.isPublic && !item.ambiguityFlag && item.entryType !== 'Draft Record')
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const publicEducation = education
    .filter((item) => item.isPublic)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#f7f3ed]">
      <section className="border-b border-[#ddd4c9]/70 dark:border-[#2c2925]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24">
          <div className="max-w-4xl">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#a8795d] dark:text-[#caa288] mb-5">
              Business & Management
            </p>
            <h1 className="font-serif-editorial text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight">
              Understanding the business behind the build.
            </h1>
            <p className="mt-7 max-w-3xl text-base sm:text-lg leading-8 text-[#68635d] dark:text-[#b9aea2]">
              Alongside my work in software development, I am pursuing a Bachelor of Business
              Management. This perspective helps me look beyond the interface and consider the
              customers, processes, financial context, and organisational goals that a digital
              solution needs to serve.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onDownloadCv}
                className="inline-flex items-center gap-2 rounded-full bg-[#161616] px-6 py-3 text-sm font-semibold text-[#fffdf9] transition-colors hover:bg-[#393530] dark:bg-[#b98b6e] dark:text-[#161616] dark:hover:bg-[#caa288]"
              >
                <Download className="h-4 w-4" />
                Download CV
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c9] px-6 py-3 text-sm font-semibold text-[#161616] transition-colors hover:border-[#b98b6e] dark:border-[#494139] dark:text-[#f7f3ed]"
              >
                Get in touch
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#a8795d] dark:text-[#caa288]">
            Academic & professional focus
          </p>
          <h2 className="mt-3 font-serif-editorial text-3xl sm:text-4xl tracking-tight">
            Business knowledge I am building and applying.
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-7 text-[#68635d] dark:text-[#b9aea2]">
            These areas reflect my university coursework and professional exposure. They are
            presented as areas of study and experience, not as claims of professional certification.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {focusAreas.map((area) => {
            const Icon = area.icon;
            return (
              <article
                key={area.title}
                className="rounded-2xl border border-[#e4ddd4] bg-white/70 p-6 sm:p-7 dark:border-[#302c27] dark:bg-[#191816]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f0e9] text-[#946c53] dark:bg-[#28231f] dark:text-[#d3a98b]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{area.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#68635d] dark:text-[#b9aea2]">
                  {area.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {area.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full bg-[#f4f0e9] px-3 py-1.5 text-xs font-medium text-[#5f574f] dark:bg-[#28231f] dark:text-[#d2c5b8]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#f7f3ed] dark:bg-[#191816]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#a8795d] dark:text-[#caa288]">
                Business meets technology
              </p>
              <h2 className="mt-3 font-serif-editorial text-3xl sm:text-4xl tracking-tight">
                Business thinking. Technical execution.
              </h2>
              <p className="mt-5 text-sm sm:text-base leading-7 text-[#68635d] dark:text-[#b9aea2]">
                My business studies influence how I approach software: start with the real-world
                need, understand the workflow, and then build a solution that is useful to the
                people and organisation relying on it.
              </p>
            </div>
            <div className="space-y-4">
              {businessApplications.map((item, index) => (
                <div
                  key={item.title}
                  className="flex gap-4 rounded-2xl border border-[#e1d9ce] bg-[#fffdf9] p-5 sm:p-6 dark:border-[#302c27] dark:bg-[#111110]"
                >
                  <span className="font-mono-tabular pt-1 text-sm text-[#a8795d] dark:text-[#caa288]">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#68635d] dark:text-[#b9aea2]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-[#e1d9ce] bg-[#fffdf9] p-6 sm:p-8 dark:border-[#302c27] dark:bg-[#111110]">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f0e9] text-[#946c53] dark:bg-[#28231f] dark:text-[#d3a98b]">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold">A practical example: BuyHive</h3>
                <p className="mt-2 text-sm leading-7 text-[#68635d] dark:text-[#b9aea2]">
                  BuyHive brings business and software considerations together through its
                  multi-vendor marketplace model: independent sellers, product review before
                  listing, customer checkout, order coordination, and commission-based marketplace
                  operations. It is an example of how I think about the operating model as well as
                  the application architecture.
                </p>
                <a
                  href="https://github.com/Lex-Cable/BuyHive"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#946c53] hover:text-[#6f4d39] dark:text-[#d3a98b]"
                >
                  Explore the BuyHive project
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#a8795d] dark:text-[#caa288]">
            Professional experience
          </p>
          <h2 className="mt-3 font-serif-editorial text-3xl sm:text-4xl tracking-tight">
            Learning through real working environments.
          </h2>
        </div>
        <div className="space-y-4">
          {publicExperiences.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#e4ddd4] bg-white/70 p-6 sm:p-7 dark:border-[#302c27] dark:bg-[#191816]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8795d] dark:text-[#caa288]">
                    {item.entryType}
                  </p>
                  <h3 className="mt-2 text-lg font-bold">{item.role}</h3>
                  <p className="mt-1 text-sm text-[#68635d] dark:text-[#b9aea2]">
                    {item.organization}{item.location ? ` · ${item.location}` : ''}
                  </p>
                </div>
                <span className="text-sm font-medium text-[#68635d] dark:text-[#b9aea2]">
                  {item.period}
                </span>
              </div>
              <p className="mt-5 text-sm leading-7 text-[#68635d] dark:text-[#b9aea2]">
                {item.summary}
              </p>
              {item.highlights.length > 0 && (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {item.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm leading-6">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b98b6e]" />
                      <span className="text-[#68635d] dark:text-[#b9aea2]">{highlight}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#ddd4c9]/70 dark:border-[#2c2925]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#a8795d] dark:text-[#caa288]">
                Education
              </p>
              <h2 className="mt-3 font-serif-editorial text-3xl sm:text-4xl tracking-tight">
                The academic foundation.
              </h2>
            </div>
            <div className="space-y-4">
              {publicEducation.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#e4ddd4] bg-white/70 p-6 sm:p-7 dark:border-[#302c27] dark:bg-[#191816]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f0e9] text-[#946c53] dark:bg-[#28231f] dark:text-[#d3a98b]">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold">{item.qualification}</h3>
                      <p className="mt-1 text-sm text-[#68635d] dark:text-[#b9aea2]">
                        {item.institution} · {item.location}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-[#946c53] dark:text-[#d3a98b]">
                        {item.statusLabel}
                      </p>
                    </div>
                  </div>
                  {item.notes && (
                    <p className="mt-5 text-sm leading-7 text-[#68635d] dark:text-[#b9aea2]">
                      {item.notes}
                    </p>
                  )}
                  <div className="mt-5">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#68635d] dark:text-[#b9aea2]">
                      Relevant coursework
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.coursework.map((course) => (
                        <span
                          key={course}
                          className="rounded-full bg-[#f4f0e9] px-3 py-1.5 text-xs font-medium text-[#5f574f] dark:bg-[#28231f] dark:text-[#d2c5b8]"
                        >
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#161616] text-[#fffdf9]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-[0.18em] uppercase text-[#b98b6e]">
                A combined perspective
              </p>
              <h2 className="mt-3 font-serif-editorial text-2xl sm:text-3xl">
                Building with both the system and the business in mind.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#b9aea2]">
                {profile.name} · {profile.location}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/contact')}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#b98b6e] px-6 py-3 text-sm font-semibold text-[#161616] transition-colors hover:bg-[#caa288]"
            >
              Let’s connect
              <Handshake className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

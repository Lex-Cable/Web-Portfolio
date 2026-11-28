import React from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Calculator,
  ChartNoAxesCombined,
  ClipboardCheck,
  Handshake,
  Landmark,
  Scale,
  UsersRound,
} from 'lucide-react';
import type { Education, Experience, PortfolioProfile } from '../types/portfolio';

interface BusinessManagementSectionProps {
  profile: PortfolioProfile;
  experiences: Experience[];
  education: Education[];
  onDownloadCv: () => void;
  onPreviewCv: () => void;
}

const FOCUS_AREAS = [
  {
    icon: Calculator,
    title: 'Financial Management & Accounting',
    description: 'Financial record keeping, accounting workflows, budgeting fundamentals, and clear reporting that supports informed decisions.',
  },
  {
    icon: Scale,
    title: 'Taxation & Compliance',
    description: 'Tax documentation preparation, compliance awareness, organized records, and careful attention to regulatory requirements.',
  },
  {
    icon: ClipboardCheck,
    title: 'Auditing & Internal Controls',
    description: 'Documentation review, verification, structured filing, and process discipline that strengthens accountability.',
  },
  {
    icon: ChartNoAxesCombined,
    title: 'Business Analysis & Strategy',
    description: 'Understanding business needs, examining workflows, and translating operational challenges into practical improvements.',
  },
  {
    icon: Handshake,
    title: 'Customer Relationship Management',
    description: 'Responsive client communication, customer support, issue resolution, and consistent relationship follow-through.',
  },
  {
    icon: UsersRound,
    title: 'Human Resources & Operations',
    description: 'People-focused coordination, administrative support, organized processes, and day-to-day operational awareness.',
  },
];

const BUSINESS_APPLICATIONS = [
  'Clarifying the business problem before choosing a technical solution',
  'Designing digital workflows around real customer and operational needs',
  'Considering data accuracy, financial visibility, and process accountability',
  'Building products with usability, maintainability, and business value in mind',
];

export function BusinessManagementSection({
  profile,
  experiences,
  education,
  onDownloadCv,
  onPreviewCv,
}: BusinessManagementSectionProps) {
  const publicExperiences = experiences
    .filter((experience) => experience.isPublic && experience.entryType !== 'Draft Record')
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const publicEducation = education
    .filter((item) => item.isPublic)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="min-h-screen bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#f7f3ed]">
      <section className="border-b border-[#ddd4c9]/80 dark:border-[#2c2925]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="max-w-4xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-[#9a7056] dark:text-[#caa288]">
              <span className="w-7 h-px bg-[#b98b6e]" />
              Beyond the code
            </p>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-7xl leading-[1.05] tracking-tight font-semibold">
              Business <span className="font-serif-editorial italic font-normal text-[#9a7056] dark:text-[#caa288]">&</span> Management
            </h1>
            <p className="mt-7 max-w-3xl text-lg sm:text-xl leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
              {profile.shortBio}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onDownloadCv}
                className="inline-flex items-center gap-2 rounded-full bg-[#161616] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#38332f] dark:bg-[#b98b6e] dark:text-[#161616] dark:hover:bg-[#caa288]"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Download CV
              </button>
              <button
                type="button"
                onClick={onPreviewCv}
                className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c9] px-6 py-3 text-sm font-semibold text-[#161616] transition-colors hover:border-[#b98b6e] dark:border-[#3a342e] dark:text-[#f7f3ed]"
              >
                <BookOpen className="h-4 w-4" />
                Preview CV
              </button>
            </div>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#ddd4c9] bg-[#ddd4c9] dark:border-[#2c2925] dark:bg-[#2c2925]">
            <div className="bg-[#f7f3ed] dark:bg-[#191816] p-6 sm:p-7">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8b8177] dark:text-[#a99d91]">Perspective</p>
              <p className="mt-3 text-xl font-semibold">Business-minded</p>
              <p className="mt-2 text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">Technology shaped by customers, operations, and outcomes.</p>
            </div>
            <div className="bg-[#f7f3ed] dark:bg-[#191816] p-6 sm:p-7">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8b8177] dark:text-[#a99d91]">Academic foundation</p>
              <p className="mt-3 text-xl font-semibold">Business Management</p>
              <p className="mt-2 text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">The Co-operative University of Kenya.</p>
            </div>
            <div className="bg-[#f7f3ed] dark:bg-[#191816] p-6 sm:p-7">
              <p className="text-xs uppercase tracking-[0.14em] text-[#8b8177] dark:text-[#a99d91]">Working approach</p>
              <p className="mt-3 text-xl font-semibold">Practical & analytical</p>
              <p className="mt-2 text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">Structured thinking, clear communication, and continuous improvement.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#9a7056] dark:text-[#caa288]">Areas of focus</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">A grounded business toolkit.</h2>
          <p className="mt-4 text-base leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
            My business studies and practical experience have built a foundation across financial, operational, and people-focused functions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FOCUS_AREAS.map((area, index) => {
            const Icon = area.icon;
            return (
              <article key={area.title} className="rounded-2xl border border-[#ddd4c9] bg-white/60 p-6 sm:p-7 transition-colors hover:border-[#b98b6e]/70 dark:border-[#2c2925] dark:bg-[#191816]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular text-[#9a7056] dark:text-[#caa288]">0{index + 1}</span>
                  <Icon className="h-5 w-5 text-[#9a7056] dark:text-[#caa288]" aria-hidden="true" />
                </div>
                <h3 className="mt-7 text-lg font-semibold">{area.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">{area.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#f4f0e9] dark:bg-[#191816] border-y border-[#ddd4c9]/80 dark:border-[#2c2925]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#9a7056] dark:text-[#caa288]">Professional experience</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">Learning through real work.</h2>
            <p className="mt-4 text-base leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
              Selected roles from my professional journey, drawn from the experience records already maintained in my portfolio.
            </p>
            <div className="mt-8 inline-flex items-center gap-2 text-sm font-semibold">
              <BriefcaseBusiness className="h-4 w-4 text-[#9a7056] dark:text-[#caa288]" />
              Experience-led perspective
            </div>
          </div>
          <div className="space-y-8">
            {publicExperiences.map((experience) => (
              <article key={experience.id} className="relative border-l border-[#c9b9aa] pl-6 dark:border-[#55483e]">
                <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-[#b98b6e]" />
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{experience.role}</h3>
                    <p className="mt-1 text-sm font-medium text-[#9a7056] dark:text-[#caa288]">{experience.organization}</p>
                  </div>
                  <span className="text-xs text-[#8b8177] dark:text-[#a99d91] sm:text-right">{experience.period}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">{experience.summary}</p>
                {experience.highlights.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {experience.highlights.slice(0, 3).map((highlight) => (
                      <li key={highlight} className="flex gap-2 text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#b98b6e]" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
            {publicExperiences.length === 0 && (
              <p className="text-sm text-[#68635d] dark:text-[#b9aea2]">Professional experience will appear here when public portfolio records are available.</p>
            )}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#9a7056] dark:text-[#caa288]">Education</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">The academic foundation.</h2>
          <div className="mt-8 space-y-7">
            {publicEducation.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#ddd4c9] p-6 dark:border-[#2c2925]">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#f4f0e9] p-3 text-[#9a7056] dark:bg-[#29231e] dark:text-[#caa288]">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{item.qualification}</h3>
                    <p className="mt-1 text-sm text-[#68635d] dark:text-[#b9aea2]">{item.institution}</p>
                    <p className="mt-2 text-xs font-medium text-[#9a7056] dark:text-[#caa288]">{item.statusLabel}</p>
                  </div>
                </div>
                {item.coursework.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b8177] dark:text-[#a99d91]">Relevant coursework</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.coursework.map((course) => (
                        <span key={course} className="rounded-full border border-[#ddd4c9] px-3 py-1.5 text-xs text-[#68635d] dark:border-[#3a342e] dark:text-[#b9aea2]">{course}</span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#9a7056] dark:text-[#caa288]">Business meets technology</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">A wider lens on every product.</h2>
          <p className="mt-5 text-base leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
            Business management informs how I scope, design, and build software. It helps me look beyond whether a feature works to understand why it matters and how it fits into a real organization.
          </p>
          <div className="mt-7 space-y-4">
            {BUSINESS_APPLICATIONS.map((application) => (
              <div key={application} className="flex items-start gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#b98b6e]" />
                <p className="text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">{application}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-[#161616] p-6 sm:p-7 text-[#fffdf9] dark:bg-[#29231e]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#caa288]">My point of view</p>
            <p className="mt-3 text-lg leading-relaxed font-serif-editorial">
              “Strong digital products are built when technical decisions make sense for the people, processes, and goals behind the business.”
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#ddd4c9] dark:border-[#2c2925]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 sm:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-7">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#9a7056] dark:text-[#caa288]">Continue exploring</p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">Interested in how I bring both disciplines together?</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#68635d] dark:text-[#b9aea2]">Explore my technical work, professional background, or get in touch to discuss an opportunity.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/projects" className="inline-flex items-center gap-2 rounded-full border border-[#ddd4c9] px-5 py-3 text-sm font-semibold hover:border-[#b98b6e] dark:border-[#3a342e]">
              View projects <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 rounded-full bg-[#b98b6e] px-5 py-3 text-sm font-semibold text-[#161616] hover:bg-[#caa288]">
              Contact me <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

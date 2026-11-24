import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Cloud,
  Code2,
  Cpu,
  Database,
  Download,
  ExternalLink,
  Github,
  GitBranch,
  Layers,
  ChevronDown,
} from 'lucide-react';
import type {
  Education,
  Experience,
  GithubSnapshot,
  GitlabSnapshot,
  PortfolioProfile,
  Project,
  Skill,
  SkillCategory,
} from '../types/portfolio';
import {
  extractReferencedProductionSites,
  renderTextWithSiteLinks,
} from '../utils/linkifyText';

interface HomeSectionProps {
  profile: PortfolioProfile;
  projects: Project[];
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  githubSnapshot: GithubSnapshot | null;
  gitlabSnapshot?: GitlabSnapshot | null;
  onNavigate: (path: string) => void;
  onDownloadCv: () => void;
}

const CAPABILITY_CARDS: Array<{
  num: string;
  category: SkillCategory;
  title: string;
  summary: string;
  icon: React.ReactNode;
}> = [
  {
    num: '01.',
    category: 'Frontend Development',
    title: 'Frontend Engineering',
    summary: 'Responsive, accessible web interfaces crafted with React, TypeScript, HTML5, CSS3, JavaScript, and PHP.',
    icon: <Code2 className="w-4 h-4" />,
  },
  {
    num: '02.',
    category: 'Backend Development',
    title: 'Backend & API Systems',
    summary: 'Structured server-side logic and RESTful workflows using Node.js, Express.js, Python (Django, Flask), and Laravel.',
    icon: <Layers className="w-4 h-4" />,
  },
  {
    num: '03.',
    category: 'Databases',
    title: 'Data Modeling & Persistence',
    summary: 'Relational and document data integration across Firebase, Cloud Firestore security rules, PostgreSQL, and MongoDB.',
    icon: <Database className="w-4 h-4" />,
  },
  {
    num: '04.',
    category: 'Development Tools and DevOps',
    title: 'Git, CI/CD & DevOps',
    summary: 'Version-controlled delivery and automated repository workflows with Git, GitHub, GitHub Actions, and Docker.',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    num: '05.',
    category: 'Other Technologies',
    title: 'Core Protocols & Systems',
    summary: 'Practical foundations in REST APIs, WebSockets, C++, and exploring GraphQL schema patterns.',
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    num: '06.',
    category: 'Additional Learning Interests',
    title: 'Applied AI & Cloud Architecture',
    summary: 'Active study in Gemini AI integrations, Machine Learning, TensorFlow, PyTorch, System Design, AWS, and Kubernetes.',
    icon: <Cpu className="w-4 h-4" />,
  },
];

export function HomeSection({
  profile,
  projects,
  skills,
  experiences,
  education,
  githubSnapshot,
  gitlabSnapshot,
  onNavigate,
  onDownloadCv,
}: HomeSectionProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const [failedProjectImages, setFailedProjectImages] = useState<Record<string, boolean>>({});

  const featuredProjects = projects.filter((p) => p.isPublic && p.featured).slice(0, 4);
  const publicExperiences = experiences.filter((e) => e.isPublic);

  return (
    <div className="space-y-0">
      {/* 1. Nova Astro Split Hero */}
      <section aria-labelledby="hero-heading" className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-16">
        <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col justify-between p-7 sm:p-12 lg:p-14 space-y-8"
          >
            <div className="space-y-6">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
                {profile.title} · {profile.location}
              </p>

              <h1
                id="hero-heading"
                className="text-3xl sm:text-4xl lg:text-[2.95rem] font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] leading-[1.12] text-balance"
              >
                {profile.headline}
              </h1>

              <p className="text-[15.5px] sm:text-base text-[#68635d] dark:text-[#b9aea2] leading-relaxed max-w-xl">
                {profile.shortBio}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/projects')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>View Projects</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onDownloadCv}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-full border border-[#b9aea2] dark:border-[#3d3832] bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#fffdf9] hover:border-[#161616] dark:hover:border-[#b98b6e] transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download CV</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/contact')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Contact Me</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-[#ddd4c9] dark:border-[#2c2925] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#68635d] dark:text-[#b9aea2]">
              <span className="font-semibold text-[#161616] dark:text-[#fffdf9]">
                {profile.name}
              </span>
              <span aria-hidden="true">·</span>
              <span>GitHub @{githubSnapshot?.username || profile.githubUsername}</span>
              <span aria-hidden="true">·</span>
              <span>GitLab @{gitlabSnapshot?.username || 'lex_cab23'}</span>
              <span aria-hidden="true">·</span>
              <span>{education[0]?.statusLabel || 'B.B.M. Expected 2027'}</span>
            </div>
          </motion.div>

          {/* Right Portrait Column */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative min-h-[420px] lg:min-h-[560px] bg-[#eee8df] dark:bg-[#23201d]"
          >
            {!imgFailed && profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={`${profile.name} — ${profile.title}`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <span className="text-4xl font-bold text-[#161616] dark:text-[#fffdf9]">JW</span>
                <span className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">{profile.name}</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* Full-Width Verified Snapshot Strip Below Hero */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 border-y border-[#ddd4c9] dark:border-[#2c2925] py-5">
          <div>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Engineering Discipline</p>
            <p className="text-sm sm:text-base font-semibold text-[#161616] dark:text-[#fffdf9] mt-0.5">
              Full-Stack Web Development
            </p>
          </div>
          <div>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Public GitHub Repositories</p>
            <p className="text-sm sm:text-base font-semibold font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-0.5">
              {githubSnapshot ? githubSnapshot.publicReposCount : '—'}
              <span className="text-xs font-normal font-sans text-[#68635d] dark:text-[#b9aea2] ml-1.5">
                live via REST API
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Undergraduate Degree</p>
            <p className="text-sm sm:text-base font-semibold text-[#161616] dark:text-[#fffdf9] mt-0.5">
              {education[0]?.qualification || 'Bachelor of Business Management'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Verified Roles</p>
            <p className="text-sm sm:text-base font-semibold text-[#161616] dark:text-[#fffdf9] mt-0.5">
              {publicExperiences.length} Work & Internships
            </p>
          </div>
        </div>
      </section>

      {/* 2. Nova Astro #services Style Capabilities Section */}
      <section id="services" aria-labelledby="capabilities-heading" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
          <div className="grid lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-5 space-y-2">
              <h2
                id="capabilities-heading"
                className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9]"
              >
                Technical capabilities
              </h2>
            </div>
            <div className="lg:col-span-4">
              <p className="text-base text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
                Structured across frontend, backend, data systems, and DevOps — with transparent proficiency levels.
              </p>
            </div>
            <div className="lg:col-span-3 lg:text-right">
              <button
                type="button"
                onClick={() => onNavigate('/skills')}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] transition-colors"
              >
                <span className="transition-transform duration-300 group-hover:-translate-x-1">
                  Explore all skills
                </span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Nova Services Interactive Card Grid */}
          <div className="mt-10 grid md:grid-cols-2 gap-3.5">
            {CAPABILITY_CARDS.map((card) => {
              const catSkills = skills.filter(
                (s) => s.isPublic && s.category === card.category
              );
              return (
                <article
                  key={card.num}
                  onClick={() => onNavigate('/skills')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate('/skills');
                    }
                  }}
                  className="group cursor-pointer rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] p-4 sm:p-5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 transition-all duration-300 hover:border-[#b98b6e] hover:bg-[#b98b6e]/10 dark:hover:bg-[#b98b6e]/10"
                >
                  <div
                    aria-hidden="true"
                    className="w-10 h-10 rounded-full border border-[#b98b6e]/40 text-[#b98b6e] grid place-items-center transition-colors duration-300 group-hover:border-[#b98b6e] group-hover:bg-[#b98b6e] group-hover:text-[#161616]"
                  >
                    {card.icon}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-sm sm:text-base font-mono-tabular text-[#68635d] dark:text-[#b9aea2] shrink-0">
                        {card.num}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-[#161616] dark:text-[#fffdf9] truncate">
                        {card.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#68635d] dark:text-[#b9aea2] leading-relaxed line-clamp-2">
                      {card.summary}
                    </p>
                    <p className="text-[11px] font-mono-tabular text-[#68635d] dark:text-[#b9aea2] pt-0.5 truncate">
                      {catSkills.map((s) => s.name).join(' · ')}
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="w-9 h-9 rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-[#161616] dark:text-[#fffdf9] grid place-items-center transition-colors duration-300 group-hover:border-[#b98b6e] group-hover:bg-[#b98b6e] group-hover:text-[#161616]"
                  >
                    <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Nova Astro #realizacje Selected Work Section */}
      <section aria-labelledby="selected-work-heading" className="bg-[#f4f0e9] dark:bg-[#191816] border-y border-[#ddd4c9] dark:border-[#2c2925] py-16 sm:py-22">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 space-y-12">
          <div className="grid lg:grid-cols-12 gap-6 items-end">
            <div className="lg:col-span-6 space-y-2">
              <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
                Selected Work
              </p>
              <h2
                id="selected-work-heading"
                className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance"
              >
                Turning real problems into functional software
              </h2>
            </div>
            <div className="lg:col-span-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <p className="text-sm sm:text-base text-[#68635d] dark:text-[#b9aea2] max-w-md leading-relaxed">
                Selected full-stack builds and live commercial web platforms delivered across UI engineering, backend architecture, and business workflows.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('/projects')}
                className="group inline-flex items-center gap-2 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] whitespace-nowrap shrink-0"
              >
                <span>See all projects</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {featuredProjects.map((project) => (
              <article
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => onNavigate(`/projects/${project.slug}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate(`/projects/${project.slug}`);
                  }
                }}
                className="group cursor-pointer bg-[#fffdf9] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl overflow-hidden flex flex-col justify-between transition-colors hover:border-[#b98b6e]"
              >
                <div>
                  <div className="aspect-[4/3] w-full overflow-hidden border-b border-[#ddd4c9] dark:border-[#2c2925] bg-[#eee8df] dark:bg-[#1c1a17]">
                    {project.imageUrl && !failedProjectImages[project.id] ? (
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedProjectImages((prev) => ({ ...prev, [project.id]: true }))
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
                          {project.title}
                        </p>
                        <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">
                          {project.technologies.slice(0, 3).join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-6 sm:p-8 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#68635d] dark:text-[#b9aea2]">
                      <span className="font-semibold text-[#b98b6e]">{project.status}</span>
                      <span aria-hidden="true">·</span>
                      <span>{project.technologies.slice(0, 4).join(' / ')}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-[#161616] dark:text-[#fffdf9] group-hover:text-[#b98b6e] transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
                      {project.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-[#eee8df] dark:border-[#2c2925] flex flex-wrap items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] group-hover:text-[#b98b6e] transition-colors">
                    <span>Case study & stack</span>
                    <ArrowRight className="w-4 h-4" />
                  </span>
                  <div className="flex items-center gap-4">
                    {project.liveDemoUrl && (
                      <a
                        href={project.liveDemoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#b98b6e] hover:underline whitespace-nowrap shrink-0"
                      >
                        <span>
                          {project.slug.includes('berry')
                            ? 'Access Berry Live'
                            : project.slug === 'weego'
                              ? 'Visit Weego'
                              : project.slug === 'talent-bridge'
                                ? 'Visit Talent Bridge'
                                : 'Access Live'}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#68635d] dark:text-[#b9aea2] hover:text-[#161616] dark:hover:text-[#fffdf9] whitespace-nowrap shrink-0"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Nova Astro #faq3 Style Experience & Credentials Accordion */}
      <section aria-labelledby="experience-preview-heading" className="py-16 sm:py-22">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="text-center space-y-3 mb-12">
            <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
              Experience & Education
            </p>
            <h2
              id="experience-preview-heading"
              className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9]"
            >
              Background & Academic Foundation
            </h2>
            <p className="text-sm sm:text-base text-[#68635d] dark:text-[#b9aea2] max-w-2xl mx-auto">
              Combining hands-on software engineering internship delivery, accounting and tax practice, and customer support with ongoing Business Management studies.
            </p>
          </div>

          <div className="space-y-3">
            {publicExperiences.map((exp, idx) => {
              const siteLinks = extractReferencedProductionSites(exp.summary, exp.highlights);
              return (
                <details
                  key={exp.id}
                  open={idx === 0}
                  className="group bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-xl overflow-hidden transition-colors open:border-[#b98b6e]"
                >
                  <summary className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7 sm:py-5 cursor-pointer list-none">
                    <div>
                      <h3 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
                        {exp.role} — {exp.organization}
                      </h3>
                      <p className="text-xs font-mono-tabular text-[#68635d] dark:text-[#b9aea2] mt-0.5">
                        {exp.period} · {exp.entryType}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-[#68635d] transition-transform duration-200 group-open:rotate-180 shrink-0" />
                  </summary>
                  <div className="px-5 pb-5 sm:px-7 sm:pb-6 pt-1 text-sm text-[#68635d] dark:text-[#b9aea2] space-y-2 border-t border-[#eee8df] dark:border-[#2c2925]">
                    <p className="leading-relaxed pt-3">{renderTextWithSiteLinks(exp.summary)}</p>
                    <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
                      {exp.highlights.map((h, i) => (
                        <li key={i}>{renderTextWithSiteLinks(h)}</li>
                      ))}
                    </ul>
                    {siteLinks.length > 0 && (
                      <div className="pt-3 border-t border-[#eee8df] dark:border-[#2c2925] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        <span className="font-semibold text-[#68635d] dark:text-[#b9aea2]">
                          Live Websites:
                        </span>
                        {siteLinks.map((site) => (
                          <a
                            key={site.url}
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] transition-colors"
                          >
                            <span>{site.name}</span>
                            <ExternalLink className="w-3 h-3 text-[#b98b6e]" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}

            {education.filter((e) => e.isPublic).map((edu) => (
              <details
                key={edu.id}
                className="group bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-xl overflow-hidden transition-colors open:border-[#b98b6e]"
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7 sm:py-5 cursor-pointer list-none">
                  <div>
                    <h3 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
                      {edu.qualification} — {edu.institution}
                    </h3>
                    <p className="text-xs font-mono-tabular text-[#b98b6e] mt-0.5">
                      {edu.statusLabel} · {edu.location}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#68635d] transition-transform duration-200 group-open:rotate-180 shrink-0" />
                </summary>
                <div className="px-5 pb-5 sm:px-7 sm:pb-6 pt-3 text-sm text-[#68635d] dark:text-[#b9aea2] space-y-2 border-t border-[#ddd4c9] dark:border-[#2c2925]">
                  <p className="leading-relaxed">{edu.notes}</p>
                  <p className="text-xs">
                    <strong className="text-[#161616] dark:text-[#fffdf9]">Relevant Coursework:</strong>{' '}
                    {edu.coursework.join(' · ')}
                  </p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => onNavigate('/github')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] transition-colors whitespace-nowrap shrink-0"
            >
              <Github className="w-4 h-4" />
              <span>View live GitHub repository activity</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="hidden sm:inline text-[#ddd4c9] dark:text-[#2c2925]" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('/gitlab')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] transition-colors whitespace-nowrap shrink-0"
            >
              <GitBranch className="w-4 h-4" />
              <span>View GitLab profile & member projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

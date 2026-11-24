import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Github, ShieldCheck } from 'lucide-react';
import type { Project } from '../types/portfolio';

interface ProjectsSectionProps {
  projects: Project[];
  selectedSlug?: string;
  onNavigate: (path: string) => void;
}

export function ProjectsSection({ projects, selectedSlug, onNavigate }: ProjectsSectionProps) {
  const [techFilter, setTechFilter] = useState<string>('All');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const publicProjects = useMemo(() => projects.filter((p) => p.isPublic), [projects]);

  const allTechnologies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of publicProjects) {
      for (const tech of p.technologies) {
        counts.set(tech, (counts.get(tech) || 0) + 1);
      }
    }
    return ['All', ...Array.from(counts.keys()).slice(0, 14)];
  }, [publicProjects]);

  const filteredProjects = useMemo(() => {
    if (techFilter === 'All') return publicProjects;
    return publicProjects.filter((p) =>
      p.technologies.some((t) => t.toLowerCase() === techFilter.toLowerCase())
    );
  }, [publicProjects, techFilter]);

  const detailProject = selectedSlug
    ? publicProjects.find((p) => p.slug === selectedSlug)
    : undefined;

  if (selectedSlug) {
    if (!detailProject) {
      return (
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-16 space-y-6">
          <button
            type="button"
            onClick={() => onNavigate('/projects')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to all projects</span>
          </button>
          <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-8">
            <h1 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9]">
              Project not found
            </h1>
            <p className="text-sm text-[#68635d] dark:text-[#b9aea2] mt-2">
              This project record is either private, awaiting approval, or does not exist.
            </p>
          </div>
        </div>
      );
    }

    return (
      <article className="max-w-5xl mx-auto px-5 sm:px-8 py-12 space-y-10">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('/projects')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#68635d] dark:text-[#b9aea2] hover:text-[#161616] dark:hover:text-[#fffdf9] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Projects</span>
          </button>
        </div>

        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#68635d] dark:text-[#b9aea2]">
            <span className="font-semibold text-[#b98b6e]">{detailProject.status}</span>
            {detailProject.sourceRepoName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">Lex-Cable/{detailProject.sourceRepoName}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
            {detailProject.title}
          </h1>
          <p className="text-base sm:text-lg text-[#68635d] dark:text-[#b9aea2] leading-relaxed max-w-3xl">
            {detailProject.shortDescription}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {detailProject.githubUrl && (
              <a
                href={detailProject.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors whitespace-nowrap shrink-0"
              >
                <Github className="w-4 h-4" />
                <span>View Repository on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {detailProject.liveDemoUrl && (
              <a
                href={detailProject.liveDemoUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 ${
                  detailProject.githubUrl
                    ? 'border border-[#b98b6e] bg-[#b98b6e]/15 dark:bg-[#b98b6e]/20 text-[#161616] dark:text-[#fffdf9] hover:bg-[#b98b6e] hover:text-[#161616]'
                    : 'bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288]'
                }`}
              >
                <span>
                  {detailProject.slug.includes('berry')
                    ? 'Access Berry Live'
                    : detailProject.slug === 'weego'
                      ? 'Visit Weego Live'
                      : detailProject.slug === 'talent-bridge'
                        ? 'Visit Talent Bridge Live'
                        : 'Access Live Platform'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </header>

        {detailProject.imageUrl && !failedImages[detailProject.id] && (
          <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl overflow-hidden">
            <img
              src={detailProject.imageUrl}
              alt={detailProject.title}
              referrerPolicy="no-referrer"
              onError={() =>
                setFailedImages((prev) => ({ ...prev, [detailProject.id]: true }))
              }
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            <section className="space-y-2.5">
              <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                Problem Addressed
              </h2>
              <p className="text-[15px] leading-relaxed text-[#4b4742] dark:text-[#d5cdc3]">
                {detailProject.problemStatement}
              </p>
            </section>

            <section className="space-y-2.5 pt-6 border-t border-[#ddd4c9] dark:border-[#2c2925]">
              <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                My Contribution & Role
              </h2>
              <p className="text-[15px] leading-relaxed text-[#4b4742] dark:text-[#d5cdc3]">
                {detailProject.contributionRole}
              </p>
            </section>

            <section className="space-y-2.5 pt-6 border-t border-[#ddd4c9] dark:border-[#2c2925]">
              <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                Architecture & Overview
              </h2>
              <p className="text-[15px] leading-relaxed text-[#4b4742] dark:text-[#d5cdc3] whitespace-pre-line">
                {detailProject.fullDescription}
              </p>
            </section>

            <section className="space-y-3 pt-6 border-t border-[#ddd4c9] dark:border-[#2c2925]">
              <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                Implemented & Verified Areas
              </h2>
              <ul className="space-y-2.5">
                {detailProject.features.map((feat, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-[15px] text-[#4b4742] dark:text-[#d5cdc3]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#b98b6e] mt-1 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                Verified Technologies
              </h2>
              <div className="divide-y divide-[#ddd4c9] dark:divide-[#2c2925]">
                {detailProject.technologies.map((tech) => (
                  <p
                    key={tech}
                    className="py-2 text-sm text-[#4b4742] dark:text-[#d5cdc3] first:pt-0 last:pb-0"
                  >
                    {tech}
                  </p>
                ))}
              </div>
            </div>

            {detailProject.verificationNote && (
              <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#161616] dark:text-[#fffdf9]">
                  <ShieldCheck className="w-4 h-4 text-[#b98b6e]" />
                  <span>{detailProject.githubUrl ? 'Repository Verification' : 'Project Verification'}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
                  {detailProject.verificationNote}
                </p>
              </div>
            )}
          </aside>
        </div>
      </article>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 space-y-12">
      <header className="space-y-5 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
          Selected Work
        </p>
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
            Software Engineering Projects
          </h1>
          <p className="text-sm sm:text-base text-[#68635d] dark:text-[#b9aea2]">
            Selected full-stack engineering builds and live commercial web platforms, featuring public source repositories, live deployments, and verified technology stacks.
          </p>
        </div>

        <div
          role="group"
          aria-label="Filter projects by technology"
          className="flex flex-wrap items-center gap-1.5 pt-2"
        >
          {allTechnologies.map((tech) => (
            <button
              key={tech}
              type="button"
              onClick={() => setTechFilter(tech)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-colors whitespace-nowrap shrink-0 ${
                techFilter === tech
                  ? 'bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] border-[#161616] dark:border-[#b98b6e]'
                  : 'bg-[#fffdf9] dark:bg-[#191816] text-[#68635d] dark:text-[#b9aea2] border-[#ddd4c9] dark:border-[#2c2925] hover:border-[#b98b6e]'
              }`}
            >
              {tech}
            </button>
          ))}
        </div>
      </header>

      {filteredProjects.length === 0 ? (
        <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-[#161616] dark:text-[#fffdf9]">
            No projects match "{techFilter}".
          </p>
          <button
            type="button"
            onClick={() => setTechFilter('All')}
            className="text-sm font-semibold text-[#b98b6e] hover:underline"
          >
            Reset filter
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {filteredProjects.map((project) => (
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
              className="group cursor-pointer bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl overflow-hidden flex flex-col justify-between transition-colors hover:border-[#b98b6e]"
            >
              <div>
                <div className="aspect-[4/3] w-full bg-[#eee8df] dark:bg-[#23201d] overflow-hidden border-b border-[#ddd4c9] dark:border-[#2c2925]">
                  {project.imageUrl && !failedImages[project.id] ? (
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [project.id]: true }))
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
                    <span>{project.technologies.join(' / ')}</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold text-[#161616] dark:text-[#fffdf9] group-hover:text-[#b98b6e] transition-colors">
                    {project.title}
                  </h2>

                  <p className="text-sm text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
                    {project.shortDescription}
                  </p>
                </div>
              </div>

              <div className="px-6 sm:px-8 pb-6 pt-3 border-t border-[#eee8df] dark:border-[#2c2925] flex flex-wrap items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#161616] dark:text-[#fffdf9] group-hover:text-[#b98b6e] transition-colors">
                  <span>Case study & architecture</span>
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
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

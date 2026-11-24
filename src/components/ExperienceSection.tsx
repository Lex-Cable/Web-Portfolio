import React from 'react';
import { Briefcase, Download, ExternalLink, GraduationCap } from 'lucide-react';
import type { Education, Experience } from '../types/portfolio';
import {
  extractReferencedProductionSites,
  renderTextWithSiteLinks,
} from '../utils/linkifyText';

interface ExperienceSectionProps {
  experiences: Experience[];
  education: Education[];
  onDownloadCv: () => void;
  onPreviewCv: () => void;
}

export function ExperienceSection({
  experiences,
  education,
  onDownloadCv,
  onPreviewCv,
}: ExperienceSectionProps) {
  const publicExperiences = experiences.filter((e) => e.isPublic);
  const publicEducation = education.filter((e) => e.isPublic);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 space-y-16">
      <header className="space-y-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
          Background & Credentials
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
              Professional Experience & Education
            </h1>
            <p className="text-sm sm:text-base text-[#68635d] dark:text-[#b9aea2]">
              Software engineering, accounting and tax, and customer support experience alongside ongoing undergraduate business studies.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onDownloadCv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CV</span>
            </button>
            <button
              type="button"
              onClick={onPreviewCv}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] text-[#161616] dark:text-[#fffdf9] hover:border-[#b98b6e] transition-colors whitespace-nowrap shrink-0"
            >
              <span>Open CV PDF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <section aria-labelledby="experience-timeline-heading" className="space-y-8">
        <div className="flex items-center gap-2.5">
          <Briefcase className="w-5 h-5 text-[#b98b6e]" />
          <h2 id="experience-timeline-heading" className="text-xl font-bold text-[#161616] dark:text-[#fffdf9]">
            Experience Timeline
          </h2>
        </div>

        <div className="space-y-5">
          {publicExperiences.map((exp, idx) => {
            const siteLinks = extractReferencedProductionSites(exp.summary, exp.highlights);
            return (
              <article
                key={exp.id}
                className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                      <span className="font-mono-tabular text-[#b98b6e] mr-2">0{idx + 1}.</span>
                      {exp.role}
                    </h3>
                    <p className="text-sm font-medium text-[#4b4742] dark:text-[#d5cdc3] mt-0.5">
                      {exp.organization}
                      {exp.location ? ` · ${exp.location}` : ''}
                    </p>
                  </div>
                  <div className="text-xs font-mono-tabular text-[#68635d] dark:text-[#b9aea2] shrink-0">
                    {exp.period} · {exp.entryType}
                  </div>
                </div>

                <p className="text-sm sm:text-[15px] text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
                  {renderTextWithSiteLinks(exp.summary)}
                </p>

                {exp.highlights.length > 0 && (
                  <ul className="space-y-1.5 pt-1 text-sm text-[#68635d] dark:text-[#b9aea2] list-disc list-inside">
                    {exp.highlights.map((item, hIdx) => (
                      <li key={hIdx}>{renderTextWithSiteLinks(item)}</li>
                    ))}
                  </ul>
                )}

                {siteLinks.length > 0 && (
                  <div className="pt-3 border-t border-[#eee8df] dark:border-[#2c2925] flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
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
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="education-heading" className="space-y-6 pt-4 border-t border-[#ddd4c9] dark:border-[#2c2925]">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="w-5 h-5 text-[#b98b6e]" />
          <h2 id="education-heading" className="text-xl font-bold text-[#161616] dark:text-[#fffdf9]">
            Education
          </h2>
        </div>

        <div className="space-y-6">
          {publicEducation.map((edu) => (
            <article
              key={edu.id}
              className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                    {edu.qualification}
                  </h3>
                  <p className="text-sm font-medium text-[#4b4742] dark:text-[#d5cdc3] mt-0.5">
                    {edu.institution} · {edu.location}
                  </p>
                </div>
                <span className="text-xs font-mono-tabular text-[#b98b6e] font-semibold shrink-0">
                  {edu.statusLabel}
                </span>
              </div>

              {edu.notes && (
                <p className="text-sm text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
                  {edu.notes}
                </p>
              )}

              <div className="pt-2">
                <p className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9] mb-2">
                  Relevant Academic Areas
                </p>
                <p className="text-sm text-[#68635d] dark:text-[#b9aea2]">
                  {edu.coursework.join(' · ')}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

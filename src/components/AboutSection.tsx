import React from 'react';
import { GraduationCap, Compass, Layers, ArrowRight, Download, ExternalLink } from 'lucide-react';
import type { Education, PortfolioProfile } from '../types/portfolio';

interface AboutSectionProps {
  profile: PortfolioProfile;
  education: Education[];
  onNavigate: (path: string) => void;
  onDownloadCv: () => void;
  onPreviewCv: () => void;
}

export function AboutSection({
  profile,
  education,
  onNavigate,
  onDownloadCv,
  onPreviewCv,
}: AboutSectionProps) {
  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-14 space-y-16">
      <header className="space-y-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-10">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">About</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
          Engineering practical software with business context
        </h1>
        <p className="text-base text-[#68635d] dark:text-[#b9aea2] max-w-2xl">
          {profile.name} · {profile.title} · {profile.location}
        </p>
      </header>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-6">
          <h2 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9]">
            Professional Biography
          </h2>
          <div className="space-y-4 text-[15.5px] leading-relaxed text-[#4b4742] dark:text-[#d5cdc3] whitespace-pre-line">
            {profile.fullBio}
          </div>

          <div className="pt-6 border-t border-[#ddd4c9] dark:border-[#2c2925] space-y-3">
            <div className="flex items-center gap-2 text-[#161616] dark:text-[#fffdf9] font-bold">
              <Layers className="w-4 h-4 text-[#b98b6e]" />
              <h2>Approach to Building Software</h2>
            </div>
            <p className="text-[15px] leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
              {profile.approach}
            </p>
          </div>

          <div className="pt-6 border-t border-[#ddd4c9] dark:border-[#2c2925] space-y-3">
            <div className="flex items-center gap-2 text-[#161616] dark:text-[#fffdf9] font-bold">
              <Compass className="w-4 h-4 text-[#b98b6e]" />
              <h2>Career Goals</h2>
            </div>
            <p className="text-[15px] leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
              {profile.careerGoals}
            </p>
          </div>
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-2.5 text-[#161616] dark:text-[#fffdf9] font-bold">
              <GraduationCap className="w-5 h-5 text-[#b98b6e]" />
              <h2>Education</h2>
            </div>

            {education.map((edu) => (
              <div key={edu.id} className="space-y-3">
                <div>
                  <p className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
                    {edu.qualification}
                  </p>
                  <p className="text-sm text-[#4b4742] dark:text-[#d5cdc3] mt-0.5">
                    {edu.institution}
                  </p>
                  <p className="text-xs font-mono-tabular text-[#b98b6e] mt-1">
                    {edu.statusLabel} · {edu.location}
                  </p>
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
                  <p className="text-xs text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
                    {edu.coursework.join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-3">
            <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
              Looking to collaborate or hire?
            </h3>
            <p className="text-sm text-[#68635d] dark:text-[#b9aea2]">
              View verified projects on GitHub or reach out directly regarding full-stack engineering roles and internships.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onDownloadCv}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CV</span>
              </button>
              <button
                type="button"
                onClick={onPreviewCv}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] transition-colors whitespace-nowrap shrink-0"
              >
                <span>View CV PDF</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/projects')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] transition-colors whitespace-nowrap shrink-0"
              >
                <span>View Projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b98b6e] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Contact Me</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

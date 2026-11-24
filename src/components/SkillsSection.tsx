import React, { useMemo, useState } from 'react';
import type { Skill, SkillCategory, SkillProficiency } from '../types/portfolio';

interface SkillsSectionProps {
  skills: Skill[];
}

const CATEGORIES: SkillCategory[] = [
  'Frontend Development',
  'Backend Development',
  'Databases',
  'Development Tools and DevOps',
  'Other Technologies',
  'Additional Learning Interests',
];

const PROFICIENCY_FILTERS: Array<'All' | SkillProficiency> = [
  'All',
  'Proficient',
  'Comfortable',
  'Familiar',
  'Currently Learning',
];

export function SkillsSection({ skills }: SkillsSectionProps) {
  const [selectedProficiency, setSelectedProficiency] = useState<'All' | SkillProficiency>('All');

  const publicSkills = useMemo(() => skills.filter((s) => s.isPublic), [skills]);

  const filteredByProficiency = useMemo(() => {
    if (selectedProficiency === 'All') return publicSkills;
    return publicSkills.filter((s) => s.proficiency === selectedProficiency);
  }, [publicSkills, selectedProficiency]);

  const proficiencyTextColor = (level: SkillProficiency) => {
    switch (level) {
      case 'Proficient':
        return 'text-[#161616] dark:text-[#fffdf9] font-semibold';
      case 'Comfortable':
        return 'text-[#b98b6e] font-semibold';
      case 'Familiar':
        return 'text-[#68635d] dark:text-[#b9aea2]';
      case 'Currently Learning':
        return 'text-[#8c847a] dark:text-[#8c847a]';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 space-y-12">
      <header className="space-y-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
          Capabilities & Stack
        </p>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
              Organized Skills & Learning Focus
            </h1>
            <p className="text-sm sm:text-base text-[#68635d] dark:text-[#b9aea2]">
              Categorized transparently by real hands-on proficiency rather than arbitrary percentages.
            </p>
          </div>

          <div
            role="group"
            aria-label="Filter skills by proficiency"
            className="flex flex-wrap items-center gap-1 p-1 bg-[#f4f0e9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-xl self-start"
          >
            {PROFICIENCY_FILTERS.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedProficiency(level)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedProficiency === level
                    ? 'bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616]'
                    : 'text-[#68635d] dark:text-[#b9aea2] hover:text-[#161616] dark:hover:text-[#fffdf9]'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {CATEGORIES.map((category, idx) => {
          const items = filteredByProficiency.filter((s) => s.category === category);
          if (items.length === 0) return null;

          return (
            <section
              key={category}
              aria-labelledby={`cat-${category}`}
              className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-baseline justify-between gap-4 border-b border-[#eee8df] dark:border-[#2c2925] pb-3">
                <h2
                  id={`cat-${category}`}
                  className="text-base sm:text-lg font-bold text-[#161616] dark:text-[#fffdf9]"
                >
                  <span className="font-mono-tabular text-[#b98b6e] mr-2">
                    0{idx + 1}.
                  </span>
                  {category}
                </h2>
                <span className="text-xs font-mono-tabular text-[#68635d] dark:text-[#b9aea2]">
                  {items.length} {items.length === 1 ? 'tech' : 'techs'}
                </span>
              </div>

              <div className="divide-y divide-[#eee8df] dark:divide-[#2c2925]">
                {items.map((skill) => (
                  <div
                    key={skill.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#161616] dark:text-[#fffdf9]">
                        {skill.name}
                      </p>
                      {skill.note && (
                        <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-0.5">
                          {skill.note}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs whitespace-nowrap shrink-0 ${proficiencyTextColor(skill.proficiency)}`}>
                      {skill.proficiency}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

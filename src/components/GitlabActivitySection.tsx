import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bookmark,
  Building2,
  Calendar,
  Check,
  ExternalLink,
  FolderGit2,
  GitBranch,
  GitFork,
  Globe,
  Lock,
  MapPin,
  RefreshCw,
  Star,
  Users,
} from 'lucide-react';
import type {
  Experience,
  GithubContributionDay,
  GitlabSnapshot,
  Project,
} from '../types/portfolio';

interface GitlabActivitySectionProps {
  snapshot: GitlabSnapshot | null;
  projects?: Project[];
  experiences?: Experience[];
  loading: boolean;
  error: string | null;
  onRefreshPublic: () => void;
}

const HEATMAP_LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[#efe9e0] dark:bg-[#23201c]',
  1: 'bg-[#e5d0c0] dark:bg-[#4c3728]',
  2: 'bg-[#cfa385] dark:bg-[#754f38]',
  3: 'bg-[#b98b6e] dark:bg-[#9c6b4d]',
  4: 'bg-[#8a5d42] dark:bg-[#cfa385]',
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface PrivateMemberProjectSummary {
  id: string;
  name: string;
  visibility: 'Private';
  role: string;
  contribution: string;
  technologies: string;
}

export function GitlabActivitySection({
  snapshot,
  projects = [],
  experiences = [],
  loading,
  error,
  onRefreshPublic,
}: GitlabActivitySectionProps) {
  const [hoveredDay, setHoveredDay] = useState<GithubContributionDay | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [refreshRequested, setRefreshRequested] = useState(false);
  const [refreshedNotice, setRefreshedNotice] = useState<string | null>(null);
  const prevLoadingRef = useRef(loading);

  useEffect(() => {
    if (prevLoadingRef.current && !loading && refreshRequested) {
      setRefreshRequested(false);
      if (!error) {
        const timeStr = snapshot?.lastSyncedAt
          ? new Date(snapshot.lastSyncedAt).toLocaleTimeString()
          : new Date().toLocaleTimeString();
        setRefreshedNotice(`Updated ${timeStr}`);
      }
    }
    prevLoadingRef.current = loading;
  }, [loading, refreshRequested, error, snapshot?.lastSyncedAt]);

  useEffect(() => {
    if (!refreshedNotice) return;
    const timer = setTimeout(() => setRefreshedNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [refreshedNotice]);

  const handleRefreshClick = () => {
    setRefreshedNotice(null);
    setRefreshRequested(true);
    onRefreshPublic();
  };

  const privateMemberProjects = useMemo<PrivateMemberProjectSummary[]>(() => {
    const weegoProj = projects.find((p) => p.slug === 'weego');
    const tbProj = projects.find((p) => p.slug === 'talent-bridge');
    const calExp = experiences.find((e) =>
      e.organization.toLowerCase().includes('content aggregation')
    );

    return [
      {
        id: 'member-weego',
        name: weegoProj?.title || 'Weego',
        visibility: 'Private',
        role: 'Landing Page & Frontend Development',
        contribution:
          weegoProj?.shortDescription
            ? `Played a central role in designing and building the responsive Weego landing page—${weegoProj.shortDescription.charAt(0).toLowerCase()}${weegoProj.shortDescription.slice(1)}`
            : 'Played a central role in designing and building the responsive Weego landing page—structuring ride tiers (Economy, Standard, Electric, XL, and Boda), multi-service delivery sections, a four-step booking flow, and driver partner onboarding.',
        technologies: weegoProj?.technologies.length
          ? weegoProj.technologies.join(' · ')
          : 'Nuxt.js · Vue.js · JavaScript · Responsive Web Design',
      },
      {
        id: 'member-talent-bridge',
        name: tbProj?.title || 'Talent Bridge',
        visibility: 'Private',
        role: 'End-to-End Platform Development',
        contribution:
          tbProj?.shortDescription
            ? `Took full end-to-end ownership of developing and shipping Talent Bridge—${tbProj.shortDescription.charAt(0).toLowerCase()}${tbProj.shortDescription.slice(1)}`
            : 'Took full ownership of building and delivering the Talent Bridge web platform—implementing the application architecture, company and talent workflows, four-step hiring journey, and production deployment.',
        technologies: tbProj?.technologies.length
          ? tbProj.technologies.join(' · ')
          : 'Python · Django · HTML5 · CSS3 · JavaScript',
      },
      {
        id: 'member-viusasa',
        name: 'Viusasa',
        visibility: 'Private',
        role: 'Frontend & Web Engineering Collaboration',
        contribution:
          calExp?.highlights.find((h) => h.toLowerCase().includes('viusasa') && !h.toLowerCase().includes('weego')) ||
          'Collaborated with the engineering team on live web development, UI refinements, and production delivery workflows supporting the Viusasa platform.',
        technologies: 'Web Frontend · UI Collaboration · Production Maintenance',
      },
      {
        id: 'member-citizen-duka',
        name: 'Citizen Duka',
        visibility: 'Private',
        role: 'Web Development Collaboration',
        contribution:
          'Contributed hands-on web development and technical collaboration on storefront pages and user-facing features during production rollout.',
        technologies: 'Web Frontend · Storefront UI · Team Collaboration',
      },
    ];
  }, [projects, experiences]);

  const monthMarkers = useMemo(() => {
    const weeks = snapshot?.contributionCalendar?.weeks || [];
    const markers: Array<{ weekIndex: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      const firstDay = week[0];
      if (!firstDay) return;
      const month = new Date(`${firstDay.date}T00:00:00Z`).getUTCMonth();
      if (month !== lastMonth) {
        markers.push({ weekIndex: idx, label: MONTH_SHORT[month] });
        lastMonth = month;
      }
    });
    return markers;
  }, [snapshot?.contributionCalendar?.weeks]);

  const memberUrl = snapshot?.memberProjectsUrl || 'https://gitlab.com/dashboard/projects/member';
  const profileUrl = snapshot?.profileUrl || 'https://gitlab.com/lex_cab23';

  const hasMainRepoLists = Boolean(
    snapshot && (snapshot.personalProjects.length > 0 || snapshot.starredProjects.length > 0)
  );
  const hasSidebarData = Boolean(
    snapshot && (snapshot.topLanguages.length > 0 || snapshot.recentEvents.length > 0)
  );

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 space-y-12">
      <header className="space-y-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
          GitLab Profile & Member Projects
        </p>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
              GitLab Profile, Member Projects & Activity
            </h1>
        </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {refreshedNotice && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono-tabular whitespace-nowrap">
                <Check className="w-3.5 h-3.5" />
                <span>{refreshedNotice}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] text-[#161616] dark:text-[#fffdf9] hover:border-[#b98b6e] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Refreshing…' : 'Refresh Snapshot'}</span>
            </button>
            <a
              href={memberUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full border border-[#b98b6e] bg-[#b98b6e]/15 dark:bg-[#b98b6e]/20 text-[#161616] dark:text-[#fffdf9] hover:bg-[#b98b6e] hover:text-[#161616] transition-colors whitespace-nowrap shrink-0"
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Member Projects</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={profileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] transition-colors whitespace-nowrap shrink-0"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Open GitLab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-[#f8e7c8] dark:bg-[#3b2d18] border border-[#ddd4c9] dark:border-[#59370d] rounded-xl p-4 text-sm text-[#59370d] dark:text-[#f8e7c8]">
          {error}
        </div>
      )}

      {!snapshot && loading ? (
        <div className="grid sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-24 rounded-2xl bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] animate-pulse"
            />
          ))}
        </div>
      ) : snapshot ? (
        <>
          {/* Profile Overview Card */}
          <section
            aria-label="GitLab profile overview"
            className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-start gap-5">
              {snapshot.avatarUrl && !avatarFailed ? (
                <img
                  src={snapshot.avatarUrl}
                  alt={`${snapshot.name} GitLab avatar`}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-20 h-20 rounded-2xl object-cover border border-[#ddd4c9] dark:border-[#2c2925] shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#f4f0e9] dark:bg-[#24211e] border border-[#ddd4c9] dark:border-[#2c2925] flex items-center justify-center text-lg font-bold text-[#b98b6e] shrink-0">
                  JW
                </div>
              )}

              <div className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#161616] dark:text-[#fffdf9]">
                    {snapshot.name}
                  </h2>
                  <span className="text-sm font-mono-tabular text-[#68635d] dark:text-[#b9aea2]">
                    @{snapshot.username}
                  </span>
                  {snapshot.pronouns && (
                    <>
                      <span aria-hidden="true" className="text-[#b9aea2]">·</span>
                      <span className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                        {snapshot.pronouns}
                      </span>
                    </>
                  )}
                </div>

                {snapshot.bio && (
                  <p className="text-sm sm:text-[15px] text-[#4b4742] dark:text-[#d5cdc3]">
                    {snapshot.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#68635d] dark:text-[#b9aea2] pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#b98b6e]" />
                    <span>Member since {snapshot.memberSince}</span>
                  </span>
                  {snapshot.organization && (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#b98b6e]" />
                      <span>{snapshot.organization}</span>
                    </span>
                  )}
                  {snapshot.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#b98b6e]" />
                      <span>{snapshot.location}</span>
                    </span>
                  )}
                  {snapshot.lastActivityAtomAt && (
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                      <Activity className="w-3.5 h-3.5 text-[#b98b6e]" />
                      <span>
                        Latest activity {new Date(snapshot.lastActivityAtomAt).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4-Column Summary Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#eee8df] dark:border-[#2c2925]">
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Member Projects</p>
                <p className="text-2xl font-bold font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-1">
                  {snapshot.memberProjectsCount > 0
                    ? snapshot.memberProjectsCount
                    : privateMemberProjects.length}
                </p>
              </div>
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                  Public Contributions (1 Yr)
                </p>
                <p className="text-2xl font-bold font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-1">
                  {snapshot.contributionCalendar?.totalContributions ?? 0}
                </p>
              </div>
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Starred Projects</p>
                <p className="text-2xl font-bold font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-1">
                  {snapshot.starredProjectsCount}
                </p>
              </div>
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Last Synchronized</p>
                <p className="text-sm font-medium font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-2">
                  {new Date(snapshot.lastSyncedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          {/* Member Projects Section (gitlab.com/dashboard/projects/member) */}
          <section
            aria-label="GitLab Member Projects"
            className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#b98b6e]" />
                  <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                    Member Projects (
                    {snapshot.memberProjects.length > 0
                      ? snapshot.memberProjects.length
                      : privateMemberProjects.length}
                    )
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-[#68635d] dark:text-[#b9aea2]">
                  Private team repositories under your GitLab membership workspace, shown with project roles and contributions.
                </p>
              </div>
              <a
                href={memberUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
              >
                <span>Open Member Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {snapshot.memberProjects.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {snapshot.memberProjects.map((proj) => (
                  <article
                    key={proj.id}
                    className="bg-[#fffdf9] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-5 space-y-3 hover:border-[#b98b6e] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {proj.visibility === 'public' ? (
                          <a
                            href={proj.webUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm sm:text-base font-bold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] inline-flex items-center gap-1.5"
                          >
                            <span className="truncate">{proj.nameWithNamespace}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        ) : (
                          <h3 className="text-sm sm:text-base font-bold text-[#161616] dark:text-[#fffdf9] truncate">
                            {proj.name}
                          </h3>
                        )}
                        {proj.description && (
                          <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1 leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#68635d] dark:text-[#b9aea2] shrink-0">
                        {proj.visibility === 'public' ? (
                          <Globe className="w-3 h-3 text-[#b98b6e]" />
                        ) : (
                          <Lock className="w-3 h-3 text-[#b98b6e]" />
                        )}
                        <span className="capitalize">{proj.visibility}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#68635d] dark:text-[#b9aea2] font-mono-tabular">
                      {proj.primaryLanguage && (
                        <span className="font-sans font-semibold text-[#161616] dark:text-[#fffdf9]">
                          {proj.primaryLanguage}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#b98b6e]" />
                        {proj.stars}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitFork className="w-3 h-3 text-[#b98b6e]" />
                        {proj.forks}
                      </span>
                      {proj.lastActivityAt && (
                        <span>
                          Updated {new Date(proj.lastActivityAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {privateMemberProjects.map((proj) => (
                  <article
                    key={proj.id}
                    className="bg-[#fffdf9] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[#161616] dark:text-[#fffdf9] truncate">
                          {proj.name}
                        </h3>
                        <p className="text-xs font-medium text-[#b98b6e] mt-0.5">
                          {proj.role}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#68635d] dark:text-[#b9aea2] shrink-0">
                        <Lock className="w-3 h-3 text-[#b98b6e]" />
                        <span>{proj.visibility}</span>
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#4b4742] dark:text-[#d5cdc3] leading-relaxed">
                      {proj.contribution}
                    </p>

                    <p className="text-xs text-[#68635d] dark:text-[#b9aea2] pt-1 border-t border-[#eee8df] dark:border-[#2c2925]">
                      {proj.technologies}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Contribution Calendar Heatmap */}
          {snapshot.contributionCalendar && (
            <section
              aria-label="GitLab contribution calendar"
              className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                    {snapshot.contributionCalendar.periodLabel}
                  </h2>
                  <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-0.5 min-h-[1rem]">
                    {hoveredDay
                      ? hoveredDay.tooltip
                      : `${snapshot.contributionCalendar.activeDaysCount} active days · Current streak: ${snapshot.contributionCalendar.currentStreak} day(s) · Longest streak: ${snapshot.contributionCalendar.longestStreak} day(s)`}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#68635d] dark:text-[#b9aea2]">
                  <span>Less</span>
                  {([0, 1, 2, 3, 4] as const).map((lvl) => (
                    <span
                      key={lvl}
                      className={`w-3 h-3 rounded-[3px] ${HEATMAP_LEVEL_CLASSES[lvl]}`}
                      aria-hidden="true"
                    />
                  ))}
                  <span>More</span>
                </div>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="min-w-[700px] space-y-1.5">
                  <div className="flex pl-9 text-[11px] text-[#68635d] dark:text-[#b9aea2]">
                    {snapshot.contributionCalendar.weeks.map((_, idx) => {
                      const marker = monthMarkers.find((m) => m.weekIndex === idx);
                      return (
                        <div key={idx} className="w-[13px] mr-[3px] shrink-0">
                          {marker ? <span>{marker.label}</span> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-start">
                    <div className="w-9 shrink-0 grid grid-rows-7 gap-[3px] text-[10px] text-[#68635d] dark:text-[#b9aea2] pr-2 leading-[11px]">
                      <span />
                      <span>Mon</span>
                      <span />
                      <span>Wed</span>
                      <span />
                      <span>Fri</span>
                      <span />
                    </div>

                    <div className="flex">
                      {snapshot.contributionCalendar.weeks.map((week, wIdx) => (
                        <div key={wIdx} className="grid grid-rows-7 gap-[3px] mr-[3px]">
                          {week.map((day) => (
                            <button
                              key={day.date}
                              type="button"
                              aria-label={day.tooltip}
                              title={day.tooltip}
                              onMouseEnter={() => setHoveredDay(day)}
                              onFocus={() => setHoveredDay(day)}
                              onMouseLeave={() => setHoveredDay(null)}
                              className={`w-[11px] h-[11px] rounded-[2.5px] transition-transform hover:scale-125 focus:outline-none focus:ring-1 focus:ring-[#b98b6e] ${HEATMAP_LEVEL_CLASSES[day.level]}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Personal Public Projects, Starred Projects, Languages & Recent Events (rendered only when populated) */}
          {(hasMainRepoLists || hasSidebarData) && (
            <div className={hasMainRepoLists && hasSidebarData ? 'grid lg:grid-cols-12 gap-8' : 'space-y-8'}>
              {hasMainRepoLists && (
                <div className={hasSidebarData ? 'lg:col-span-8 space-y-10' : 'space-y-10'}>
                  {snapshot.personalProjects.length > 0 && (
                    <section className="space-y-4">
                      <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                        Personal Public Projects ({snapshot.personalProjects.length})
                      </h2>
                      <div className="space-y-4">
                        {snapshot.personalProjects.map((repo) => (
                          <article
                            key={repo.id}
                            className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-3 transition-colors hover:border-[#b98b6e]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <a
                                  href={repo.webUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-base font-bold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] inline-flex items-center gap-1.5"
                                >
                                  <span>{repo.nameWithNamespace}</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <p className="text-sm text-[#68635d] dark:text-[#b9aea2] mt-1">
                                  {repo.description || 'Repository hosted on GitLab.'}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-mono-tabular text-[#68635d] dark:text-[#b9aea2]">
                                <span className="inline-flex items-center gap-1">
                                  <Star className="w-3.5 h-3.5 text-[#b98b6e]" />
                                  {repo.stars}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <GitFork className="w-3.5 h-3.5 text-[#b98b6e]" />
                                  {repo.forks}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#68635d] dark:text-[#b9aea2] pt-1">
                              {repo.primaryLanguage && (
                                <span className="font-semibold text-[#161616] dark:text-[#fffdf9]">
                                  {repo.primaryLanguage}
                                </span>
                              )}
                              {repo.topics.length > 0 && (
                                <>
                                  {repo.primaryLanguage && <span aria-hidden="true">·</span>}
                                  <span>Topics: {repo.topics.join(', ')}</span>
                                </>
                              )}
                              {repo.lastActivityAt && (
                                <>
                                  {(repo.primaryLanguage || repo.topics.length > 0) && (
                                    <span aria-hidden="true">·</span>
                                  )}
                                  <span className="font-mono-tabular">
                                    Updated {new Date(repo.lastActivityAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  {snapshot.starredProjects.length > 0 && (
                    <section className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-[#b98b6e]" />
                        <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                          Starred Projects ({snapshot.starredProjects.length})
                        </h2>
                      </div>
                      <div className="space-y-4">
                        {snapshot.starredProjects.map((sr) => (
                          <article
                            key={sr.id}
                            className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-2 transition-colors hover:border-[#b98b6e]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <a
                                  href={sr.webUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm sm:text-base font-bold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] inline-flex items-center gap-1.5"
                                >
                                  <span>{sr.nameWithNamespace}</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                {sr.description && (
                                  <p className="text-xs sm:text-sm text-[#4b4742] dark:text-[#d5cdc3] mt-1">
                                    {sr.description}
                                  </p>
                                )}
                              </div>
                              {sr.stars > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs font-mono-tabular text-[#68635d] dark:text-[#b9aea2]">
                                  <Star className="w-3.5 h-3.5 text-[#b98b6e]" />
                                  {sr.stars}
                                </span>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {hasSidebarData && (
                <aside className={hasMainRepoLists ? 'lg:col-span-4 space-y-6' : 'grid md:grid-cols-2 gap-6'}>
                  {snapshot.topLanguages.length > 0 && (
                    <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4">
                      <h2 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                        Repository Languages
                      </h2>
                      <div className="space-y-3">
                        {snapshot.topLanguages.map((lang) => (
                          <div key={lang.language} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#161616] dark:text-[#fffdf9]">
                                {lang.language}
                              </span>
                              <span className="font-mono-tabular text-[#68635d] dark:text-[#b9aea2]">
                                {lang.percentage}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-[#ddd4c9] dark:bg-[#2c2925] overflow-hidden">
                              <div
                                className="h-full bg-[#b98b6e] rounded-full"
                                style={{ width: `${Math.max(4, lang.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {snapshot.recentEvents.length > 0 && (
                    <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#b98b6e]" />
                        <h2 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                          Recent Activity
                        </h2>
                      </div>
                      <ul className="divide-y divide-[#eee8df] dark:divide-[#2c2925]">
                        {snapshot.recentEvents.slice(0, 8).map((ev) => (
                          <li key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                            <p className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">
                              {ev.summary}
                            </p>
                            {ev.createdAt && (
                              <p className="text-[11px] font-mono-tabular text-[#68635d] dark:text-[#b9aea2] mt-0.5">
                                {new Date(ev.createdAt).toLocaleString()}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </aside>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

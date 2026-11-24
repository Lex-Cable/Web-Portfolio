import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Award,
  Bookmark,
  Building2,
  Check,
  ExternalLink,
  GitFork,
  Github,
  MapPin,
  Pin,
  RefreshCw,
  Star,
  Users,
} from 'lucide-react';
import type { GithubContributionDay, GithubSnapshot } from '../types/portfolio';

interface GithubActivitySectionProps {
  snapshot: GithubSnapshot | null;
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

export function GithubActivitySection({
  snapshot,
  loading,
  error,
  onRefreshPublic,
}: GithubActivitySectionProps) {
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

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 space-y-12">
      <header className="space-y-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
          GitHub Profile & Synchronization
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
              Live GitHub Profile, Contributions & Repositories
            </h1>
            <p className="text-sm sm:text-base text-[#68635d] dark:text-[#b9aea2]">
              Synchronized directly from{' '}
              <a
                href="https://github.com/Lex-Cable"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#b98b6e] hover:underline"
              >
                github.com/Lex-Cable
              </a>
              , including profile README, contribution graph, pinned projects, achievements, and starred repositories.
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
              href="https://github.com/Lex-Cable"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] transition-colors whitespace-nowrap shrink-0"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Open GitHub</span>
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
          {/* Profile Overview + Achievements + Social Sidebar */}
          <section
            aria-label="GitHub profile overview"
            className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                {snapshot.avatarUrl && !avatarFailed ? (
                  <img
                    src={snapshot.avatarUrl}
                    alt={`${snapshot.name} GitHub avatar`}
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

                  <p className="text-sm sm:text-[15px] text-[#4b4742] dark:text-[#d5cdc3]">
                    {snapshot.bio || 'Full-Stack Developer | Problem Solver | Tech Enthusiast'}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#68635d] dark:text-[#b9aea2] pt-1">
                    {snapshot.statusMessage && (
                      <span className="text-[#161616] dark:text-[#fffdf9] font-medium">
                        Status: {snapshot.statusMessage}
                      </span>
                    )}
                    {snapshot.company && (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#b98b6e]" />
                        <span>{snapshot.company}</span>
                      </span>
                    )}
                    {snapshot.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#b98b6e]" />
                        <span>{snapshot.location}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                      <Users className="w-3.5 h-3.5 text-[#b98b6e]" />
                      <span>
                        {snapshot.followers} followers · {snapshot.following ?? 0} following
                      </span>
                    </span>
                  </div>

                  {snapshot.socialLinks && snapshot.socialLinks.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs">
                      {snapshot.socialLinks.map((link) => (
                        <a
                          key={`${link.label}-${link.url}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#161616] dark:text-[#f7f3ed] hover:text-[#b98b6e] transition-colors"
                        >
                          <span className="text-[#68635d] dark:text-[#b9aea2]">{link.label}:</span>
                          <span>{link.value}</span>
                          <ExternalLink className="w-3 h-3 text-[#b98b6e]" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {snapshot.achievements && snapshot.achievements.length > 0 && (
                <div className="lg:border-l lg:border-[#eee8df] lg:dark:border-[#2c2925] lg:pl-6 flex flex-col gap-2.5 shrink-0">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#b98b6e]">
                    <Award className="w-3.5 h-3.5" />
                    <span>GitHub Achievements</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {snapshot.achievements.map((ach) => (
                      <a
                        key={ach.slug}
                        href={ach.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#f7f3ed] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] hover:border-[#b98b6e] transition-colors"
                      >
                        <img
                          src={ach.imageUrl}
                          alt={`GitHub achievement: ${ach.name}`}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 object-contain"
                        />
                        <span className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">
                          {ach.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 4-Column Summary Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-[#eee8df] dark:border-[#2c2925]">
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Public Repositories</p>
                <p className="text-2xl font-bold font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-1">
                  {snapshot.publicReposCount}
                </p>
              </div>
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                  Contributions (Last Year)
                </p>
                <p className="text-2xl font-bold font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-1">
                  {snapshot.contributionCalendar?.totalContributions ?? '—'}
                </p>
              </div>
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Starred Repositories</p>
                <p className="text-2xl font-bold font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-1">
                  {snapshot.starredReposCount ?? snapshot.starredRepos?.length ?? 0}
                </p>
              </div>
              <div className="bg-[#f7f3ed] dark:bg-[#111110] rounded-xl p-4">
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">Last Synchronized</p>
                <p className="text-sm font-medium font-mono-tabular text-[#161616] dark:text-[#fffdf9] mt-2">
                  {new Date(snapshot.lastSyncedAt).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
              Data Source: {snapshot.statsSourceNote}. {snapshot.contributionsSummary}
            </p>
          </section>

          {/* Profile README (Lex-Cable/Lex-Cable) */}
          {snapshot.profileReadme && (
            <section
              aria-label="GitHub Profile README"
              className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-4">
                <div>
                  <p className="text-xs font-mono-tabular text-[#b98b6e]">
                    {snapshot.username} / README.md
                  </p>
                  <h2 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9] mt-1">
                    {snapshot.profileReadme.headline}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-[#68635d] dark:text-[#b9aea2] mt-0.5">
                    {snapshot.profileReadme.subtitle}
                  </p>
                </div>
                <a
                  href={`https://github.com/${snapshot.username}/${snapshot.username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#b98b6e] hover:underline"
                >
                  <span>View README repo</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {snapshot.profileReadme.intro && (
                <p className="text-sm sm:text-[15px] leading-relaxed text-[#4b4742] dark:text-[#d5cdc3] max-w-4xl">
                  {snapshot.profileReadme.intro}
                </p>
              )}

              <div className="grid lg:grid-cols-12 gap-8">
                {snapshot.profileReadme.highlights.length > 0 && (
                  <div className="lg:col-span-7 space-y-3">
                    <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                      About Me & Current Focus
                    </h3>
                    <div className="divide-y divide-[#ddd4c9] dark:divide-[#2c2925] border-y border-[#ddd4c9] dark:border-[#2c2925]">
                      {snapshot.profileReadme.highlights.map((item, idx) => (
                        <div key={idx} className="py-3 text-sm space-y-1">
                          <span className="text-xs font-semibold text-[#b98b6e]">
                            {item.label}
                          </span>
                          <p className="text-[#4b4742] dark:text-[#d5cdc3] leading-relaxed">
                            {item.text}
                          </p>
                        </div>
                      ))}
                      {snapshot.profileReadme.funFact && (
                        <div className="py-3 text-sm space-y-1">
                          <span className="text-xs font-semibold text-[#b98b6e]">Fun fact</span>
                          <p className="text-[#4b4742] dark:text-[#d5cdc3] leading-relaxed">
                            {snapshot.profileReadme.funFact}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {snapshot.profileReadme.techStack.length > 0 && (
                  <div className="lg:col-span-5 space-y-3">
                    <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                      README Tech Stack
                    </h3>
                    <div className="space-y-3 bg-[#fffdf9] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] rounded-xl p-5">
                      {snapshot.profileReadme.techStack.map((group) => (
                        <div key={group.category} className="space-y-1">
                          <p className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">
                            {group.category}
                          </p>
                          <p className="text-xs text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
                            {group.items.join(' · ')}
                          </p>
                        </div>
                      ))}
                      {snapshot.profileReadme.reachMe.length > 0 && (
                        <div className="pt-3 border-t border-[#eee8df] dark:border-[#2c2925] space-y-1.5">
                          <p className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">
                            GitHub Contact Channels
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#68635d] dark:text-[#b9aea2]">
                            {snapshot.profileReadme.reachMe.map((ch) =>
                              ch.url ? (
                                <a
                                  key={`${ch.label}-${ch.value}`}
                                  href={ch.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:text-[#b98b6e] transition-colors"
                                >
                                  {ch.label}: {ch.value}
                                </a>
                              ) : (
                                <span key={`${ch.label}-${ch.value}`}>
                                  {ch.label}: {ch.value}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Live Contribution Calendar Heatmap */}
          {snapshot.contributionCalendar && (
            <section
              aria-label="GitHub contribution graph"
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
                  {/* Month Labels */}
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

                  {/* Weekday Labels + 53 Week Columns */}
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

          {/* Pinned Repositories */}
          {snapshot.pinnedRepos && snapshot.pinnedRepos.length > 0 && (
            <section aria-label="Pinned repositories" className="space-y-4">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-[#b98b6e]" />
                <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                  Pinned Repositories
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {snapshot.pinnedRepos.map((pin) => (
                  <a
                    key={pin.fullName}
                    href={pin.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-[#b98b6e] transition-colors group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#161616] dark:text-[#fffdf9] group-hover:text-[#b98b6e] transition-colors truncate">
                          {pin.name}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#68635d] shrink-0" />
                      </div>
                      <p className="text-xs text-[#68635d] dark:text-[#b9aea2] leading-relaxed line-clamp-3">
                        {pin.description || 'Pinned repository on GitHub.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#68635d] dark:text-[#b9aea2] font-mono-tabular">
                      {pin.primaryLanguage && (
                        <span className="font-sans font-semibold text-[#161616] dark:text-[#fffdf9]">
                          {pin.primaryLanguage}
                        </span>
                      )}
                      {pin.stars > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3 h-3 text-[#b98b6e]" />
                          {pin.stars}
                        </span>
                      )}
                      {pin.forks > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <GitFork className="w-3 h-3 text-[#b98b6e]" />
                          {pin.forks}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-10">
              {/* Public Repositories */}
              <section className="space-y-4">
                <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                  Public Repositories ({snapshot.repositories.length})
                </h2>
                <div className="space-y-4">
                  {snapshot.repositories.map((repo) => (
                    <article
                      key={repo.id}
                      className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-3 transition-colors hover:border-[#b98b6e]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <a
                            href={repo.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-base font-bold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] inline-flex items-center gap-1.5"
                          >
                            <span>{repo.name}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <p className="text-sm text-[#68635d] dark:text-[#b9aea2] mt-1">
                            {repo.description || 'Public repository on GitHub.'}
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
                        {repo.detectedStack && repo.detectedStack.length > 0 && (
                          <>
                            {repo.primaryLanguage && <span aria-hidden="true">·</span>}
                            <span>Detected stack: {repo.detectedStack.join(', ')}</span>
                          </>
                        )}
                        {(repo.pushedAt || repo.updatedAt) && (
                          <>
                            {(repo.primaryLanguage ||
                              (repo.detectedStack && repo.detectedStack.length > 0)) && (
                              <span aria-hidden="true">·</span>
                            )}
                            <span className="font-mono-tabular">
                              Updated {new Date(repo.pushedAt || repo.updatedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {/* Starred Repositories */}
              {snapshot.starredRepos && snapshot.starredRepos.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-[#b98b6e]" />
                      <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
                        Starred Repositories ({snapshot.starredRepos.length})
                      </h2>
                    </div>
                    <a
                      href={`https://github.com/${snapshot.username}?tab=stars`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#b98b6e] hover:underline inline-flex items-center gap-1"
                    >
                      <span>View Stars on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="space-y-4">
                    {snapshot.starredRepos.map((sr) => (
                      <article
                        key={sr.fullName}
                        className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-2.5 transition-colors hover:border-[#b98b6e]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <a
                              href={sr.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm sm:text-base font-bold text-[#161616] dark:text-[#fffdf9] hover:text-[#b98b6e] inline-flex items-center gap-1.5"
                            >
                              <span>{sr.fullName}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            {sr.forkedFrom && (
                              <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-0.5">
                                Forked from {sr.forkedFrom}
                              </p>
                            )}
                            {sr.description && (
                              <p className="text-xs sm:text-sm text-[#4b4742] dark:text-[#d5cdc3] mt-1.5">
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
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#68635d] dark:text-[#b9aea2]">
                          {sr.primaryLanguage && (
                            <span className="font-semibold text-[#161616] dark:text-[#fffdf9]">
                              {sr.primaryLanguage}
                            </span>
                          )}
                          {sr.updatedLabel && (
                            <>
                              {sr.primaryLanguage && <span aria-hidden="true">·</span>}
                              <span>Updated {sr.updatedLabel}</span>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4">
                <h2 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                  Most-Used Languages
                </h2>
                {snapshot.topLanguages.length === 0 ? (
                  <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                    No language byte metrics returned yet.
                  </p>
                ) : (
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
                )}
              </div>

              <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#b98b6e]" />
                  <h2 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                    Recent Public Events
                  </h2>
                </div>
                {snapshot.recentEvents.length === 0 ? (
                  <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                    No recent public events within GitHub’s REST event window. See the contribution graph for full annual activity.
                  </p>
                ) : (
                  <ul className="divide-y divide-[#eee8df] dark:divide-[#2c2925]">
                    {snapshot.recentEvents.slice(0, 8).map((ev) => (
                      <li key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                        <p className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">
                          {ev.summary}
                        </p>
                        <p className="text-[11px] font-mono-tabular text-[#68635d] dark:text-[#b9aea2] mt-0.5">
                          {new Date(ev.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}

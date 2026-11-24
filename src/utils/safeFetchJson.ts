import type {
  GithubEventSummary,
  GithubLanguageStat,
  GithubRepoSummary,
  GithubSnapshot,
  GitlabProjectSummary,
  GitlabSnapshot,
} from '../types/portfolio';

export interface SafeJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  rawText: string;
  isHtml: boolean;
}

export async function safeParseJsonResponse<T>(res: Response): Promise<SafeJsonResult<T>> {
  const rawText = await res.text();
  const trimmed = rawText.trim();
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const looksLikeHtml =
    contentType.includes('text/html') ||
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html');

  if (!trimmed || looksLikeHtml) {
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      rawText,
      isHtml: looksLikeHtml,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as T;
    return {
      ok: res.ok,
      status: res.status,
      data: parsed,
      rawText,
      isHtml: false,
    };
  } catch {
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      rawText,
      isHtml: false,
    };
  }
}

export function extractApiError(
  result: SafeJsonResult<{ error?: string; message?: string }>,
  fallbackMessage: string
): string {
  if (result.data?.error) return result.data.error;
  if (result.data?.message) return result.data.message;
  if (result.isHtml) {
    return `${fallbackMessage} (Server returned an HTML response, HTTP ${result.status}).`;
  }
  return fallbackMessage;
}

const SAFE_GITHUB_USERNAME = /^[a-zA-Z0-9._-]+$/;

/**
 * Browser-side fallback against GitHub's public CORS-enabled REST API.
 * Used when the backend endpoint returns HTML/502 or shared server IP rate-limits.
 * Fires only 3 lightweight requests using the visitor's own browser quota.
 */
export async function fetchDirectPublicGithubSnapshot(
  rawUsername = 'Lex-Cable'
): Promise<GithubSnapshot> {
  const username = SAFE_GITHUB_USERNAME.test(rawUsername) ? rawUsername : 'Lex-Cable';
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };

  const [userRes, reposRes, eventsRes] = await Promise.all([
    fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers, cache: 'no-store' }),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers, cache: 'no-store' }
    ),
    fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=20`,
      { headers, cache: 'no-store' }
    ),
  ]);

  const userParsed = await safeParseJsonResponse<Record<string, unknown>>(userRes);
  if (!userRes.ok || !userParsed.data) {
    if (userRes.status === 403 && userRes.headers.get('x-ratelimit-remaining') === '0') {
      throw new Error('GitHub public API rate limit temporarily reached. Please try again shortly.');
    }
    throw new Error(`GitHub public API returned HTTP ${userRes.status}.`);
  }

  const reposParsed = await safeParseJsonResponse<Record<string, unknown>[]>(reposRes);
  const eventsParsed = await safeParseJsonResponse<Record<string, unknown>[]>(eventsRes);

  const user = userParsed.data;
  const reposRaw = reposRes.ok && Array.isArray(reposParsed.data) ? reposParsed.data : [];
  const eventsRaw = eventsRes.ok && Array.isArray(eventsParsed.data) ? eventsParsed.data : [];
  const rateLimitRemaining = Number(reposRes.headers.get('x-ratelimit-remaining') ?? '0');

  const languageTotals: Record<string, number> = {};
  const repositories: GithubRepoSummary[] = [];

  for (const r of reposRaw) {
    const repoName = String(r.name || '');
    if (!repoName) continue;
    const primaryLang = r.language ? String(r.language) : null;
    const sizeBytes = Math.max(1, Number(r.size || 1)) * 1024;
    if (primaryLang) {
      languageTotals[primaryLang] = (languageTotals[primaryLang] || 0) + sizeBytes;
    }

    const topics = Array.isArray(r.topics) ? r.topics.map((t) => String(t)) : [];
    const detectedStack = Array.from(
      new Set([...(primaryLang ? [primaryLang] : []), ...topics])
    );

    repositories.push({
      id: Number(r.id),
      name: repoName,
      fullName: String(r.full_name || `${username}/${repoName}`),
      htmlUrl: String(r.html_url || ''),
      description: r.description ? String(r.description) : null,
      primaryLanguage: primaryLang,
      languages: primaryLang ? { [primaryLang]: sizeBytes } : {},
      stars: Number(r.stargazers_count || 0),
      forks: Number(r.forks_count || 0),
      openIssues: Number(r.open_issues_count || 0),
      defaultBranch: String(r.default_branch || 'main'),
      createdAt: String(r.created_at || ''),
      updatedAt: String(r.updated_at || ''),
      pushedAt: String(r.pushed_at || ''),
      homepage: r.homepage ? String(r.homepage) : null,
      detectedStack,
    });
  }

  const totalLangBytes = Object.values(languageTotals).reduce((a, b) => a + b, 0) || 1;
  const topLanguages: GithubLanguageStat[] = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: Math.round((bytes / totalLangBytes) * 1000) / 10,
    }));

  const recentEvents: GithubEventSummary[] = eventsRaw.slice(0, 10).map((ev) => {
    const type = String(ev.type || 'Activity');
    const repo = (ev.repo as { name?: string })?.name || username;
    const payload = (ev.payload as Record<string, unknown>) || {};
    let summary = `${type.replace(/Event$/, '')} on ${repo}`;
    if (type === 'PushEvent' && Array.isArray(payload.commits)) {
      summary = `Pushed ${payload.commits.length} commit(s) to ${repo}`;
    } else if (type === 'CreateEvent') {
      summary = `Created ${String(payload.ref_type || 'branch')} in ${repo}`;
    } else if (type === 'IssuesEvent') {
      summary = `${String(payload.action || 'Updated')} issue in ${repo}`;
    }
    return {
      id: String(ev.id || `${type}-${ev.created_at}`),
      type,
      repoName: repo,
      createdAt: String(ev.created_at || ''),
      summary,
    };
  });

  const totalStars = repositories.reduce((acc, r) => acc + r.stars, 0);
  const totalForks = repositories.reduce((acc, r) => acc + r.forks, 0);

  return {
    username: String(user.login || username),
    name: String(user.name || 'Jacinta Wambui Waweru'),
    avatarUrl: String(user.avatar_url || ''),
    bio: String(user.bio || 'Full-Stack Developer | Problem Solver | Tech Enthusiast'),
    profileUrl: String(user.html_url || `https://github.com/${username}`),
    publicReposCount: Number(user.public_repos || repositories.length),
    followers: Number(user.followers || 0),
    following: typeof user.following === 'number' ? user.following : undefined,
    location: user.location ? String(user.location) : undefined,
    company: user.company ? String(user.company) : undefined,
    totalStars,
    totalForks,
    contributionsSummary:
      'Showing live public REST API repository and event metrics directly from GitHub.',
    contributionsDataAvailable: false,
    topLanguages,
    repositories,
    recentEvents,
    statsSourceNote: 'Live GitHub Public REST API',
    lastSyncedAt: new Date().toISOString(),
    rateLimitRemaining,
  };
}

export function mergeGithubSnapshots(
  existing: GithubSnapshot | null,
  incoming: GithubSnapshot
): GithubSnapshot {
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    avatarUrl: incoming.avatarUrl || existing.avatarUrl,
    bio: incoming.bio || existing.bio,
    location: incoming.location || existing.location,
    company: incoming.company || existing.company,
    pronouns: incoming.pronouns || existing.pronouns,
    following: incoming.following ?? existing.following,
    statusMessage: incoming.statusMessage || existing.statusMessage,
    socialLinks: incoming.socialLinks?.length ? incoming.socialLinks : existing.socialLinks,
    achievements: incoming.achievements?.length ? incoming.achievements : existing.achievements,
    pinnedRepos: incoming.pinnedRepos?.length ? incoming.pinnedRepos : existing.pinnedRepos,
    starredRepos: incoming.starredRepos?.length ? incoming.starredRepos : existing.starredRepos,
    starredReposCount: incoming.starredReposCount ?? existing.starredReposCount,
    profileReadme: incoming.profileReadme || existing.profileReadme,
    contributionCalendar: incoming.contributionCalendar || existing.contributionCalendar,
    contributionsSummary: incoming.contributionCalendar
      ? incoming.contributionsSummary
      : existing.contributionsSummary || incoming.contributionsSummary,
    contributionsDataAvailable:
      incoming.contributionsDataAvailable || existing.contributionsDataAvailable,
    topLanguages: incoming.topLanguages.length ? incoming.topLanguages : existing.topLanguages,
    repositories: incoming.repositories.length ? incoming.repositories : existing.repositories,
    recentEvents: incoming.recentEvents.length ? incoming.recentEvents : existing.recentEvents,
  };
}

function buildRollingGitlabCalendar() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 364);
  const startDow = start.getUTCDay();
  if (startDow !== 0) {
    start.setUTCDate(start.getUTCDate() - startDow);
  }

  const days = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const labelDate = cursor.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    days.push({
      date: dateStr,
      level: 0 as const,
      count: 0,
      tooltip: `0 contributions on ${labelDate}`,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return {
    totalContributions: 0,
    periodLabel: '0 public contributions in the last year',
    activeDaysCount: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeks,
  };
}

export async function fetchDirectPublicGitlabSnapshot(
  rawUsername = 'lex_cab23'
): Promise<GitlabSnapshot> {
  const username = SAFE_GITHUB_USERNAME.test(rawUsername) ? rawUsername : 'lex_cab23';
  const usersRes = await fetch(
    `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`,
    { cache: 'no-store' }
  );
  const usersParsed = await safeParseJsonResponse<Record<string, unknown>[]>(usersRes);
  if (!usersRes.ok || !Array.isArray(usersParsed.data) || usersParsed.data.length === 0) {
    throw new Error(`GitLab public API returned HTTP ${usersRes.status}.`);
  }

  const basic = usersParsed.data[0];
  const userId = Number(basic.id || 28177991);

  const [ownedRes, contribRes, starredRes, eventsRes] = await Promise.all([
    fetch(`https://gitlab.com/api/v4/users/${userId}/projects?per_page=100`, { cache: 'no-store' }),
    fetch(`https://gitlab.com/api/v4/users/${userId}/contributed_projects?per_page=100`, { cache: 'no-store' }),
    fetch(`https://gitlab.com/api/v4/users/${userId}/starred_projects?per_page=50`, { cache: 'no-store' }),
    fetch(`https://gitlab.com/api/v4/users/${userId}/events?per_page=25`, { cache: 'no-store' }),
  ]);

  const ownedParsed = await safeParseJsonResponse<Record<string, unknown>[]>(ownedRes);
  const contribParsed = await safeParseJsonResponse<Record<string, unknown>[]>(contribRes);
  const starredParsed = await safeParseJsonResponse<Record<string, unknown>[]>(starredRes);
  const eventsParsed = await safeParseJsonResponse<Record<string, unknown>[]>(eventsRes);

  const mapItem = (p: Record<string, unknown>, isMemberProject: boolean): GitlabProjectSummary => ({
    id: Number(p.id),
    name: String(p.name || ''),
    nameWithNamespace: String(p.name_with_namespace || p.name || ''),
    pathWithNamespace: String(p.path_with_namespace || ''),
    webUrl: String(p.web_url || ''),
    description: p.description ? String(p.description) : null,
    visibility:
      p.visibility === 'public' || p.visibility === 'internal' ? p.visibility : 'private',
    defaultBranch: String(p.default_branch || 'main'),
    stars: Number(p.star_count || 0),
    forks: Number(p.forks_count || 0),
    openIssuesCount: Number(p.open_issues_count || 0),
    topics: Array.isArray(p.topics) ? p.topics.map(String) : [],
    primaryLanguage: null,
    languages: {},
    lastActivityAt: String(p.last_activity_at || ''),
    createdAt: String(p.created_at || ''),
    isMemberProject,
  });

  const personalProjects = Array.isArray(ownedParsed.data)
    ? ownedParsed.data.map((p) => mapItem(p, false))
    : [];
  const contributedProjects = Array.isArray(contribParsed.data)
    ? contribParsed.data.map((p) => mapItem(p, true))
    : [];
  const starredProjects = Array.isArray(starredParsed.data)
    ? starredParsed.data.map((p) => ({
        id: Number(p.id),
        name: String(p.name || ''),
        nameWithNamespace: String(p.name_with_namespace || p.name || ''),
        pathWithNamespace: String(p.path_with_namespace || ''),
        webUrl: String(p.web_url || ''),
        description: p.description ? String(p.description) : null,
        stars: Number(p.star_count || 0),
        forks: Number(p.forks_count || 0),
        primaryLanguage: null,
        lastActivityAt: String(p.last_activity_at || ''),
      }))
    : [];

  const recentEvents = Array.isArray(eventsParsed.data)
    ? eventsParsed.data.slice(0, 15).map((ev, idx) => {
        const action = String(ev.action_name || 'updated');
        const targetType = ev.target_type ? String(ev.target_type) : null;
        const targetTitle = ev.target_title ? String(ev.target_title) : null;
        const projectId = ev.project_id ? Number(ev.project_id) : null;
        const pushData = ev.push_data as { commit_count?: number; ref?: string } | undefined;
        let summary = `${action} on GitLab`;
        if (pushData?.commit_count) {
          summary = `Pushed ${pushData.commit_count} commit(s)${pushData.ref ? ` (${pushData.ref})` : ''}`;
        } else if (targetTitle) {
          summary = `${action} ${targetType || 'item'} "${targetTitle}"`;
        }
        return {
          id: String(ev.id || `gl-ev-${idx}`),
          actionName: action,
          targetType,
          targetTitle,
          projectId,
          projectName: 'GitLab',
          createdAt: String(ev.created_at || ''),
          summary,
        };
      })
    : [];

  const rawName = String(basic.name || '').trim();
  const displayName =
    rawName && rawName.toLowerCase() !== 'jacinta wambui'
      ? rawName
      : 'Jacinta Wambui Waweru';

  const latestActivityAt =
    recentEvents.find((e) => e.createdAt)?.createdAt ||
    [...personalProjects, ...contributedProjects]
      .map((p) => p.lastActivityAt)
      .filter(Boolean)
      .sort()
      .pop();

  return {
    username: String(basic.username || username),
    userId,
    name: displayName,
    avatarUrl: String(basic.avatar_url || ''),
    bio: 'Full-Stack Developer | Problem Solver | Tech Enthusiast',
    profileUrl: String(basic.web_url || `https://gitlab.com/${username}`),
    memberProjectsUrl: 'https://gitlab.com/dashboard/projects/member',
    memberSince: 'May 29, 2025',
    location: 'Karen, Nairobi, Kenya',
    organization: 'The Co-operative University of Kenya',
    pronouns: 'She/Her',
    state: String(basic.state || 'active'),
    lastActivityAtomAt: latestActivityAt,
    authenticatedTokenActive: false,
    publicProjectsCount: personalProjects.length,
    memberProjectsCount: contributedProjects.length,
    starredProjectsCount: starredProjects.length,
    totalStars: 0,
    totalForks: 0,
    contributionCalendar: buildRollingGitlabCalendar(),
    topLanguages: [],
    memberProjects: contributedProjects,
    personalProjects,
    contributedProjects,
    starredProjects,
    recentEvents,
    statsSourceNote: 'GitLab',
    visibilityNote:
      'Private member projects are visible inside the GitLab Member Dashboard when signed in.',
    lastSyncedAt: new Date().toISOString(),
  };
}

export function mergeGitlabSnapshots(
  existing: GitlabSnapshot | null,
  incoming: GitlabSnapshot
): GitlabSnapshot {
  if (!existing) return incoming;
  const incomingCalHasData = Boolean(
    incoming.contributionCalendar && incoming.contributionCalendar.totalContributions > 0
  );
  const existingCalHasData = Boolean(
    existing.contributionCalendar && existing.contributionCalendar.totalContributions > 0
  );
  return {
    ...existing,
    ...incoming,
    avatarUrl: incoming.avatarUrl || existing.avatarUrl,
    bio: incoming.bio || existing.bio,
    location: incoming.location || existing.location,
    organization: incoming.organization || existing.organization,
    pronouns: incoming.pronouns || existing.pronouns,
    lastActivityAtomAt: incoming.lastActivityAtomAt || existing.lastActivityAtomAt,
    contributionCalendar: incomingCalHasData
      ? incoming.contributionCalendar
      : existingCalHasData
        ? existing.contributionCalendar
        : incoming.contributionCalendar || existing.contributionCalendar,
    topLanguages: incoming.topLanguages.length ? incoming.topLanguages : existing.topLanguages,
    memberProjects: incoming.memberProjects.length
      ? incoming.memberProjects
      : existing.memberProjects,
    personalProjects: incoming.personalProjects.length
      ? incoming.personalProjects
      : existing.personalProjects,
    contributedProjects: incoming.contributedProjects.length
      ? incoming.contributedProjects
      : existing.contributedProjects,
    starredProjects: incoming.starredProjects.length
      ? incoming.starredProjects
      : existing.starredProjects,
    starredProjectsCount:
      incoming.starredProjectsCount || existing.starredProjectsCount,
    recentEvents: incoming.recentEvents.length ? incoming.recentEvents : existing.recentEvents,
  };
}

export function createBaselineGitlabSnapshot(): GitlabSnapshot {
  return {
    username: 'lex_cab23',
    userId: 28177991,
    name: 'Jacinta Wambui Waweru',
    avatarUrl: '',
    bio: 'Full-Stack Developer | Problem Solver | Tech Enthusiast',
    profileUrl: 'https://gitlab.com/lex_cab23',
    memberProjectsUrl: 'https://gitlab.com/dashboard/projects/member',
    memberSince: 'May 29, 2025',
    location: 'Karen, Nairobi, Kenya',
    organization: 'The Co-operative University of Kenya',
    pronouns: 'She/Her',
    state: 'active',
    authenticatedTokenActive: false,
    publicProjectsCount: 0,
    memberProjectsCount: 0,
    starredProjectsCount: 0,
    totalStars: 0,
    totalForks: 0,
    contributionCalendar: buildRollingGitlabCalendar(),
    topLanguages: [],
    memberProjects: [],
    personalProjects: [],
    contributedProjects: [],
    starredProjects: [],
    recentEvents: [],
    statsSourceNote: 'GitLab',
    visibilityNote:
      'Private member projects are visible inside the GitLab Member Dashboard when signed in.',
    lastSyncedAt: new Date().toISOString(),
  };
}

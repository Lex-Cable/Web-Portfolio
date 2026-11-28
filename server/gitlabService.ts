import type {
  GithubContributionCalendar,
  GithubContributionDay,
  GithubLanguageStat,
  GitlabEventSummary,
  GitlabProjectSummary,
  GitlabSnapshot,
  GitlabStarredProject,
} from '../src/types/portfolio.ts';

const SAFE_GITLAB_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const WEB_USER_AGENT =
  'Mozilla/5.0 (compatible; jacinta-waweru-portfolio-sync/1.0; +https://gitlab.com/lex_cab23)';

function getGitLabHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': WEB_USER_AGENT,
    Accept: 'application/json',
  };
  if (process.env.GITLAB_TOKEN) {
    headers['PRIVATE-TOKEN'] = process.env.GITLAB_TOKEN;
  }
  return headers;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseJsonSafely<T>(res: Response | null): Promise<T | null> {
  if (!res || !res.ok) return null;
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('<')) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

async function fetchTextSafely(
  url: string,
  headers: Record<string, string> = {}
): Promise<{ text: string | null; rateLimited: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': WEB_USER_AGENT,
        ...headers,
      },
    });
    if (res.status === 429) return { text: null, rateLimited: true };
    if (!res.ok) return { text: null, rateLimited: false };
    return { text: await res.text(), rateLimited: false };
  } catch {
    return { text: null, rateLimited: false };
  }
}

async function fetchJsonSafe<T>(
  url: string,
  headers: Record<string, string>
): Promise<{ data: T | null; rateLimited: boolean }> {
  try {
    const res = await fetch(url, { headers });
    if (res.status === 429) return { data: null, rateLimited: true };
    return { data: await parseJsonSafely<T>(res), rateLimited: false };
  } catch {
    return { data: null, rateLimited: false };
  }
}

function parseGitLabProfileHtml(html: string): {
  memberSince?: string;
  bio?: string;
  location?: string;
  organization?: string;
  pronouns?: string;
  avatarUrl?: string;
} {
  const memberMatch = html.match(/Member since\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const bioMatch = html.match(/class="[^"]*profile-user-bio[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  const avatarMatch = html.match(/<img[^>]+class="[^"]*avatar[^"]*"[^>]+src="([^"]+)"/i);
  const text = stripHtml(html);

  const pronounsMatch = text.match(/\(([A-Za-z]+\/[A-Za-z]+)\)/);
  return {
    memberSince: memberMatch ? memberMatch[1].trim() : undefined,
    bio: bioMatch ? stripHtml(bioMatch[1]) : undefined,
    pronouns: pronounsMatch ? pronounsMatch[1] : undefined,
    avatarUrl: avatarMatch ? decodeHtmlEntities(avatarMatch[1]) : undefined,
  };
}

function parseAtomFeed(xml: string): {
  latestUpdated?: string;
  events: GitlabEventSummary[];
} {
  const updatedMatches = Array.from(xml.matchAll(/<updated>([^<]+)<\/updated>/g)).map(
    (m) => m[1].trim()
  );
  const latestUpdated = updatedMatches[0];

  const events: GitlabEventSummary[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = entryRegex.exec(xml)) !== null && idx < 15) {
    const entry = m[1];
    const idM = entry.match(/<id>([^<]+)<\/id>/);
    const titleM = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const updM = entry.match(/<updated>([^<]+)<\/updated>/);
    const summaryText = titleM ? stripHtml(titleM[1]) : 'GitLab activity';
    events.push({
      id: idM ? idM[1].trim() : `atom-${idx}`,
      actionName: 'activity',
      targetType: null,
      targetTitle: null,
      projectId: null,
      projectName: 'GitLab',
      createdAt: updM ? updM[1].trim() : '',
      summary: summaryText,
    });
    idx++;
  }

  return { latestUpdated, events };
}

function buildContributionCalendar(
  countsByDate: Record<string, number> | null
): GithubContributionCalendar | undefined {
  if (!countsByDate) return undefined;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 364);
  // Align start back to Sunday so columns match Sun..Sat
  const startDow = start.getUTCDay();
  if (startDow !== 0) {
    start.setUTCDate(start.getUTCDate() - startDow);
  }

  const maxCount = Math.max(1, ...Object.values(countsByDate).map((n) => Number(n) || 0));
  const days: GithubContributionDay[] = [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const count = Number(countsByDate[dateStr] || 0);
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count > 0) {
      const ratio = count / maxCount;
      if (ratio >= 0.75) level = 4;
      else if (ratio >= 0.5) level = 3;
      else if (ratio >= 0.25) level = 2;
      else level = 1;
    }
    const labelDate = cursor.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    days.push({
      date: dateStr,
      level,
      count,
      tooltip: `${count} contribution${count === 1 ? '' : 's'} on ${labelDate}`,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const weeks: GithubContributionDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  let totalContributions = 0;
  let activeDaysCount = 0;
  let longestStreak = 0;
  let running = 0;

  for (const d of days) {
    totalContributions += d.count;
    if (d.count > 0) {
      activeDaysCount++;
      running++;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 0;
    }
  }

  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      currentStreak++;
    } else if (i === days.length - 1) {
      continue;
    } else {
      break;
    }
  }

  return {
    totalContributions,
    periodLabel: `${totalContributions} public contributions in the last year`,
    activeDaysCount,
    currentStreak,
    longestStreak,
    weeks,
  };
}

function mapRawProject(
  p: Record<string, unknown>,
  languages: Record<string, number>,
  isMemberProject: boolean
): GitlabProjectSummary {
  const langEntries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const primaryLanguage = langEntries[0]?.[0] || null;
  const vis = String(p.visibility || 'private');
  const visibility: GitlabProjectSummary['visibility'] =
    vis === 'public' || vis === 'internal' ? vis : 'private';

  return {
    id: Number(p.id),
    name: String(p.name || ''),
    nameWithNamespace: String(p.name_with_namespace || p.name || ''),
    pathWithNamespace: String(p.path_with_namespace || ''),
    webUrl: String(p.web_url || ''),
    description: p.description ? String(p.description) : null,
    visibility,
    defaultBranch: String(p.default_branch || 'main'),
    stars: Number(p.star_count || 0),
    forks: Number(p.forks_count || 0),
    openIssuesCount: Number(p.open_issues_count || 0),
    topics: Array.isArray(p.topics) ? p.topics.map(String) : [],
    primaryLanguage,
    languages,
    lastActivityAt: String(p.last_activity_at || ''),
    createdAt: String(p.created_at || ''),
    isMemberProject,
  };
}

export async function fetchGitLabSnapshot(rawUsername = 'lex_cab23'): Promise<GitlabSnapshot> {
  const username = SAFE_GITLAB_SEGMENT.test(rawUsername) ? rawUsername : 'lex_cab23';
  const headers = getGitLabHeaders();
  const hasToken = Boolean(process.env.GITLAB_TOKEN);

  const [usersRes, profileRes, atomRes, calendarRes, authedRes] = await Promise.all([
    fetchJsonSafe<Record<string, unknown>[]>(
      `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`,
      headers
    ),
    fetchTextSafely(`https://gitlab.com/${encodeURIComponent(username)}`),
    fetchTextSafely(`https://gitlab.com/${encodeURIComponent(username)}.atom`),
    fetchJsonSafe<Record<string, number>>(
      `https://gitlab.com/users/${encodeURIComponent(username)}/calendar.json`,
      headers
    ),
    hasToken
      ? fetchJsonSafe<Record<string, unknown>>('https://gitlab.com/api/v4/user', headers)
      : Promise.resolve({ data: null, rateLimited: false }),
  ]);

  const usersList = usersRes.data;
  const profileHtml = profileRes.text;
  const atomXml = atomRes.text;
  const calendarJson = calendarRes.data;
  const authedUser = authedRes.data;

  const anyRateLimited =
    usersRes.rateLimited ||
    profileRes.rateLimited ||
    atomRes.rateLimited ||
    calendarRes.rateLimited;

  if (!usersList && !profileHtml && !authedUser && anyRateLimited) {
    throw new Error('GitLab rate limit reached on server IP (HTTP 429).');
  }

  const basicUser = Array.isArray(usersList) && usersList.length > 0 ? usersList[0] : null;
  const userId = Number(authedUser?.id || basicUser?.id || 28177991);
  const parsedHtml = profileHtml ? parseGitLabProfileHtml(profileHtml) : {};
  const parsedAtom = atomXml ? parseAtomFeed(atomXml) : { events: [] };

  const [
    ownedRes,
    contribRes,
    starredRes,
    memberRes,
    eventsRes,
  ] = await Promise.all([
    fetchJsonSafe<Record<string, unknown>[]>(
      `https://gitlab.com/api/v4/users/${userId}/projects?per_page=100&order_by=last_activity_at&sort=desc`,
      headers
    ),
    fetchJsonSafe<Record<string, unknown>[]>(
      `https://gitlab.com/api/v4/users/${userId}/contributed_projects?per_page=100&order_by=last_activity_at&sort=desc`,
      headers
    ),
    fetchJsonSafe<Record<string, unknown>[]>(
      `https://gitlab.com/api/v4/users/${userId}/starred_projects?per_page=50`,
      headers
    ),
    hasToken
      ? fetchJsonSafe<Record<string, unknown>[]>(
          'https://gitlab.com/api/v4/projects?membership=true&per_page=100&order_by=last_activity_at&sort=desc',
          headers
        )
      : Promise.resolve({ data: null, rateLimited: false }),
    fetchJsonSafe<Record<string, unknown>[]>(
      `https://gitlab.com/api/v4/users/${userId}/events?per_page=25`,
      headers
    ),
  ]);

  const rawOwnedProjects = ownedRes.data;
  const rawContributedProjects = contribRes.data;
  const rawStarredProjects = starredRes.data;
  const rawMemberProjects = memberRes.data;
  const rawEvents = eventsRes.data;

  const allRawForLanguages = [
    ...(rawMemberProjects || []),
    ...(rawOwnedProjects || []),
    ...(rawContributedProjects || []),
  ];
  const uniqueProjectIds = Array.from(
    new Set(allRawForLanguages.map((p) => Number(p.id)).filter((id) => Number.isFinite(id) && id > 0))
  ).slice(0, 12);

  const languagesMap = new Map<number, Record<string, number>>();
  if (uniqueProjectIds.length > 0) {
    await Promise.all(
      uniqueProjectIds.map(async (pid) => {
        const langsRes = await fetchJsonSafe<Record<string, number>>(
          `https://gitlab.com/api/v4/projects/${pid}/languages`,
          headers
        );
        if (langsRes.data && typeof langsRes.data === 'object') {
          languagesMap.set(pid, langsRes.data);
        }
      })
    );
  }

  const memberProjects = (rawMemberProjects || []).map((p) =>
    mapRawProject(p, languagesMap.get(Number(p.id)) || {}, true)
  );
  const personalProjects = (rawOwnedProjects || []).map((p) =>
    mapRawProject(p, languagesMap.get(Number(p.id)) || {}, false)
  );
  const contributedProjects = (rawContributedProjects || []).map((p) =>
    mapRawProject(p, languagesMap.get(Number(p.id)) || {}, true)
  );

  // Combine member + contributed if token isn't active and contributed has public items
  const effectiveMemberProjects =
    memberProjects.length > 0 ? memberProjects : contributedProjects;

  const starredProjects: GitlabStarredProject[] = (rawStarredProjects || []).map((p) => {
    const pid = Number(p.id);
    const langs = languagesMap.get(pid) || {};
    const primaryLanguage = Object.entries(langs).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return {
      id: pid,
      name: String(p.name || ''),
      nameWithNamespace: String(p.name_with_namespace || p.name || ''),
      pathWithNamespace: String(p.path_with_namespace || ''),
      webUrl: String(p.web_url || ''),
      description: p.description ? String(p.description) : null,
      stars: Number(p.star_count || 0),
      forks: Number(p.forks_count || 0),
      primaryLanguage,
      lastActivityAt: String(p.last_activity_at || ''),
    };
  });

  // Aggregate language shares across visible projects
  const languageTotals: Record<string, number> = {};
  const mergedProjectsById = new Map<number, GitlabProjectSummary>();
  for (const p of [...effectiveMemberProjects, ...personalProjects, ...contributedProjects]) {
    mergedProjectsById.set(p.id, p);
  }
  for (const proj of mergedProjectsById.values()) {
    for (const [lang, pct] of Object.entries(proj.languages)) {
      languageTotals[lang] = (languageTotals[lang] || 0) + Number(pct || 0);
    }
  }
  const totalLangScore = Object.values(languageTotals).reduce((a, b) => a + b, 0) || 1;
  const topLanguages: GithubLanguageStat[] = Object.entries(languageTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([language, score]) => ({
      language,
      bytes: Math.round(score),
      percentage: Math.round((score / totalLangScore) * 1000) / 10,
    }));

  const apiEvents: GitlabEventSummary[] = (rawEvents || []).map((ev, idx) => {
    const action = String(ev.action_name || 'updated');
    const targetType = ev.target_type ? String(ev.target_type) : null;
    const targetTitle = ev.target_title ? String(ev.target_title) : null;
    const projectId = ev.project_id ? Number(ev.project_id) : null;
    const projectObj = projectId ? mergedProjectsById.get(projectId) : undefined;
    const projectName = projectObj?.pathWithNamespace || (projectId ? `Project #${projectId}` : 'GitLab');
    const pushData = ev.push_data as { commit_count?: number; ref?: string; action?: string } | undefined;

    let summary = `${action} on ${projectName}`;
    if (pushData) {
      const count = Number(pushData.commit_count || 0);
      const ref = pushData.ref ? ` (${pushData.ref})` : '';
      summary = count > 0 ? `Pushed ${count} commit(s) to ${projectName}${ref}` : `${pushData.action || action} branch on ${projectName}${ref}`;
    } else if (targetTitle) {
      summary = `${action} ${targetType || 'item'} "${targetTitle}" in ${projectName}`;
    }

    return {
      id: String(ev.id || `gl-ev-${idx}`),
      actionName: action,
      targetType,
      targetTitle,
      projectId,
      projectName,
      createdAt: String(ev.created_at || ''),
      summary,
    };
  });

  const recentEvents = apiEvents.length > 0 ? apiEvents : parsedAtom.events;
  const contributionCalendar = buildContributionCalendar(calendarJson);

  const uniqueProjects = Array.from(mergedProjectsById.values());
  const totalStars = uniqueProjects.reduce((acc, p) => acc + p.stars, 0);
  const totalForks = uniqueProjects.reduce((acc, p) => acc + p.forks, 0);

  const avatarRaw = String(
    authedUser?.avatar_url || basicUser?.avatar_url || parsedHtml.avatarUrl || ''
  );
  const avatarUrl = avatarRaw.includes('s=80')
    ? avatarRaw.replace('s=80', 's=200')
    : avatarRaw;

  const latestEventDate = recentEvents.find((e) => e.createdAt)?.createdAt;
  const latestProjDate = uniqueProjects
    .map((p) => p.lastActivityAt)
    .filter(Boolean)
    .sort()
    .pop();
  const lastActivityAtomAt = parsedAtom.latestUpdated || latestEventDate || latestProjDate;

  const visibilityNote = hasToken
    ? 'Displaying member and public repositories from GitLab.'
    : 'Private member projects are visible inside the GitLab Member Dashboard when signed in.';

  const rawName = String(authedUser?.name || basicUser?.name || '').trim();
  const displayName =
    rawName && rawName.toLowerCase() !== 'jacinta wambui'
      ? rawName
      : 'Jacinta Wambui Waweru';

  return {
    username: String(authedUser?.username || basicUser?.username || username),
    userId,
    name: displayName,
    avatarUrl,
    bio: String(
      authedUser?.bio ||
        parsedHtml.bio ||
        'Full-Stack Developer | Problem Solver | Tech Enthusiast'
    ),
    profileUrl: String(authedUser?.web_url || basicUser?.web_url || `https://gitlab.com/${username}`),
    memberProjectsUrl: 'https://gitlab.com/dashboard/projects/member',
    memberSince: parsedHtml.memberSince || 'May 29, 2025',
    location:
      (authedUser?.location ? String(authedUser.location) : parsedHtml.location) ||
      'Karen, Nairobi, Kenya',
    organization:
      (authedUser?.organization ? String(authedUser.organization) : parsedHtml.organization) ||
      'The Co-operative University of Kenya',
    pronouns:
      (authedUser?.pronouns ? String(authedUser.pronouns) : parsedHtml.pronouns) ||
      'She/Her',
    state: String(authedUser?.state || basicUser?.state || 'active'),
    lastActivityAtomAt,
    authenticatedTokenActive: hasToken,
    publicProjectsCount: personalProjects.length,
    memberProjectsCount: effectiveMemberProjects.length,
    starredProjectsCount: starredProjects.length,
    totalStars,
    totalForks,
    contributionCalendar,
    topLanguages,
    memberProjects: effectiveMemberProjects,
    personalProjects,
    contributedProjects,
    starredProjects,
    recentEvents,
    statsSourceNote: 'GitLab',
    visibilityNote,
    lastSyncedAt: new Date().toISOString(),
  };
}

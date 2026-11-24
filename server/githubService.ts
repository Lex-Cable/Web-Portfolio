import crypto from 'node:crypto';
import type {
  GithubAchievement,
  GithubContributionCalendar,
  GithubContributionDay,
  GithubEventSummary,
  GithubLanguageStat,
  GithubPinnedRepo,
  GithubProfileReadme,
  GithubRepoSummary,
  GithubSnapshot,
  GithubStarredRepo,
} from '../src/types/portfolio.ts';

const SAFE_GITHUB_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const WEB_USER_AGENT =
  'Mozilla/5.0 (compatible; jacinta-waweru-portfolio-sync/1.0; +https://github.com/Lex-Cable)';

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'jacinta-waweru-portfolio-sync',
    Accept: 'application/vnd.github+json',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

async function parseJsonSafely<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

async function fetchTextSafely(url: string, headers: Record<string, string> = {}): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': WEB_USER_AGENT,
        ...headers,
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchWithRetry(url: string, init: RequestInit = {}, retries = 1): Promise<Response> {
  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, init);
      if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error('GitHub API rate limit exceeded.');
      }
      if (res.status >= 500 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
        attempt++;
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
        attempt++;
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('GitHub fetch failed');
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function detectTechFromManifests(
  files: string[],
  readme: string,
  pkgJson: string | null,
  composerJson: string | null
): string[] {
  const stack = new Set<string>();
  const combined = `${readme}\n${pkgJson || ''}\n${composerJson || ''}`.toLowerCase();

  if (pkgJson) {
    if (combined.includes('"react"')) stack.add('React');
    if (combined.includes('"typescript"')) stack.add('TypeScript');
    if (combined.includes('"firebase"')) stack.add('Firebase');
    if (combined.includes('"express"')) stack.add('Express');
    if (combined.includes('"@google/genai"')) stack.add('Gemini AI');
    if (combined.includes('"vue"')) stack.add('Vue.js');
    if (combined.includes('"@inertiajs/vue3"')) stack.add('Inertia.js');
    if (combined.includes('tailwindcss')) stack.add('Tailwind CSS');
    if (combined.includes('"vite"')) stack.add('Vite');
  }
  if (composerJson) {
    stack.add('PHP');
    if (combined.includes('laravel/framework')) stack.add('Laravel');
    if (combined.includes('laravel/fortify')) stack.add('Laravel Fortify');
    if (combined.includes('inertiajs/inertia-laravel')) stack.add('Inertia.js');
  }
  if (files.includes('firestore.rules')) stack.add('Cloud Firestore');
  if (files.includes('Dockerfile')) stack.add('Docker');
  if (files.some((f) => f.endsWith('.py'))) stack.add('Python');
  if (combined.includes('mysql')) stack.add('MySQL');
  if (combined.includes('postgresql') || combined.includes('postgres')) stack.add('PostgreSQL');
  return Array.from(stack);
}

function parseProfileReadmeMarkdown(markdown: string): GithubProfileReadme {
  const cleanLine = (s: string) =>
    s
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/\*\*/g, '')
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

  const lines = markdown.split(/\r?\n/);
  let headline = "Hey there! I'm Jaccie Jay";
  let subtitle = 'Full-Stack Developer | Problem Solver | Tech Enthusiast';
  const introParts: string[] = [];
  const techStack: Array<{ category: string; items: string[] }> = [];
  const highlights: Array<{ label: string; text: string }> = [];
  let funFact = '';
  let pronouns = '';
  const reachMe: Array<{ label: string; value: string; url?: string }> = [];

  let currentSection = '';
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# ')) {
      headline = cleanLine(trimmed.slice(2)) || headline;
      currentSection = 'intro';
      continue;
    }
    if (trimmed.startsWith('## ')) {
      currentSection = cleanLine(trimmed.slice(3)).toLowerCase();
      continue;
    }
    if (trimmed.startsWith('### ') && currentSection === 'intro') {
      subtitle = cleanLine(trimmed.slice(4)) || subtitle;
      continue;
    }
    if (trimmed.startsWith('---') || trimmed.startsWith('<')) {
      continue;
    }

    if (currentSection === 'intro') {
      const cleaned = cleanLine(trimmed);
      if (cleaned) introParts.push(cleaned);
    } else if (currentSection.includes('tech stack')) {
      const match = trimmed.match(/^\*\*([^:*]+):\*\*\s*(.+)$/);
      if (match) {
        const category = match[1].trim();
        const items = match[2]
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        techStack.push({ category, items });
      }
    } else if (currentSection.includes('about me')) {
      if (trimmed.startsWith('- ')) {
        const cleaned = cleanLine(trimmed.slice(2));
        const prefixes = [
          "I’m currently working on",
          "I'm currently working on",
          "I’m currently learning",
          "I'm currently learning",
          "I’m looking to collaborate on",
          "I'm looking to collaborate on",
          "I’m looking for help with",
          "I'm looking for help with",
          'Ask me about',
        ];
        let matched = false;
        for (const p of prefixes) {
          if (cleaned.toLowerCase().startsWith(p.toLowerCase())) {
            highlights.push({
              label: p.replace(/^I[’']m\s+/i, '').replace(/^\w/, (c) => c.toUpperCase()),
              text: cleaned.slice(p.length).trim().replace(/^./, (c) => c.toUpperCase()),
            });
            matched = true;
            break;
          }
        }
        if (!matched && cleaned) {
          highlights.push({ label: 'Focus', text: cleaned });
        }
      }
    } else if (currentSection.includes('how to reach me')) {
      const linkMatch = trimmed.match(/^\-\s*(?:[^\w]*)\s*([^:]+):\s*\[([^\]]+)\]\(([^)]+)\)/);
      const plainMatch = trimmed.match(/^\-\s*(?:[^\w]*)\s*([^:]+):\s*(.+)$/);
      if (linkMatch) {
        reachMe.push({
          label: cleanLine(linkMatch[1]),
          value: linkMatch[2].trim(),
          url: linkMatch[3].trim(),
        });
      } else if (plainMatch) {
        reachMe.push({
          label: cleanLine(plainMatch[1]),
          value: cleanLine(plainMatch[2]),
        });
      }
    } else if (currentSection.includes('pronouns')) {
      const cleaned = cleanLine(trimmed);
      if (cleaned) pronouns = cleaned;
    } else if (currentSection.includes('fun fact')) {
      const cleaned = cleanLine(trimmed);
      if (cleaned) funFact = funFact ? `${funFact} ${cleaned}` : cleaned;
    }
  }

  return {
    rawMarkdown: markdown,
    headline,
    subtitle,
    intro: introParts.join(' '),
    techStack,
    highlights,
    funFact,
    pronouns,
    reachMe,
  };
}

function parseContributionCalendarHtml(html: string): GithubContributionCalendar | undefined {
  const headerMatch = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const periodLabel = headerMatch ? stripHtml(headerMatch[1]) : '';
  const totalMatch = periodLabel.match(/([\d,]+)\s+contribution/i);
  const totalFromHeader = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : 0;

  const tooltips = new Map<string, string>();
  const tipRegex = /<tool-tip[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g;
  let tipMatch: RegExpExecArray | null;
  while ((tipMatch = tipRegex.exec(html)) !== null) {
    tooltips.set(tipMatch[1], stripHtml(tipMatch[2]));
  }

  const daysByDate = new Map<string, GithubContributionDay>();
  const tdRegex = /<td\b[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g;
  let tdMatch: RegExpExecArray | null;
  while ((tdMatch = tdRegex.exec(html)) !== null) {
    const tag = tdMatch[0];
    const dateMatch = tag.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
    const levelMatch = tag.match(/data-level="([0-4])"/);
    const idMatch = tag.match(/id="([^"]+)"/);
    if (!dateMatch || !levelMatch) continue;

    const date = dateMatch[1];
    const level = Number(levelMatch[1]) as 0 | 1 | 2 | 3 | 4;
    const tooltip = (idMatch && tooltips.get(idMatch[1])) || `Contributions on ${date}`;
    const countMatch = tooltip.match(/^(\d+)\s+contribution/i);
    const count = countMatch ? Number(countMatch[1]) : level > 0 ? level : 0;

    daysByDate.set(date, { date, level, count, tooltip });
  }

  if (daysByDate.size === 0) return undefined;

  const sortedDays = Array.from(daysByDate.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Group into Sunday..Saturday columns
  const weeks: GithubContributionDay[][] = [];
  let currentWeek: GithubContributionDay[] = [];
  for (const day of sortedDays) {
    const dow = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (dow === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  let longestStreak = 0;
  let running = 0;
  let activeDaysCount = 0;
  for (const d of sortedDays) {
    if (d.level > 0 || d.count > 0) {
      activeDaysCount++;
      running++;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 0;
    }
  }

  // Current streak up to latest day (allowing today to be 0 if yesterday was active)
  let currentStreak = 0;
  for (let i = sortedDays.length - 1; i >= 0; i--) {
    const d = sortedDays[i];
    if (d.level > 0 || d.count > 0) {
      currentStreak++;
    } else if (i === sortedDays.length - 1) {
      continue;
    } else {
      break;
    }
  }

  const summedCount = sortedDays.reduce((acc, d) => acc + d.count, 0);
  const totalContributions = totalFromHeader || summedCount;

  return {
    totalContributions,
    periodLabel: periodLabel || `${totalContributions} contributions in the last year`,
    activeDaysCount,
    currentStreak,
    longestStreak,
    weeks,
  };
}

function parseGitHubWebProfile(html: string, username: string) {
  const nameMatch = html.match(/itemprop="name"[^>]*>([\s\S]*?)<\/span>/);
  const avatarMatch = html.match(/class="avatar avatar-user[^"]*"[^>]*src="([^"]+)"/);
  const bioMatch = html.match(/data-bio-text="([^"]*)"/);
  const statusMatch = html.match(/user-status-message-wrapper[^>]*>([\s\S]*?)<\/div>/);
  const companyMatch = html.match(/itemprop="worksFor"[^>]*>([\s\S]*?)<\/li>/);
  const locationMatch = html.match(/itemprop="homeLocation"[^>]*>([\s\S]*?)<\/li>/);

  const followersMatch = html.match(/tab=followers"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/);
  const followingMatch = html.match(/tab=following"[^>]*>[\s\S]*?<span[^>]*>(\d+)<\/span>/);

  // Header tab counters (Repositories, Projects, Packages, Stars)
  const starsTabMatch = html.match(/data-tab-item="stars"[\s\S]*?<span[^>]*class="Counter[^"]*"[^>]*>(\d+)<\/span>/);
  const reposTabMatch = html.match(/data-tab-item="repositories"[\s\S]*?<span[^>]*class="Counter[^"]*"[^>]*>(\d+)<\/span>/);

  // Social links from vcard-details
  const socialLinksMap = new Map<string, { label: string; value: string; url: string }>();
  const vcardBlock = html.match(/<ul class="vcard-details">([\s\S]*?)<\/ul>/);
  if (vcardBlock) {
    const socialRegex = /<li[^>]*itemprop="social"[^>]*>([\s\S]*?)<\/li>/g;
    let sm: RegExpExecArray | null;
    while ((sm = socialRegex.exec(vcardBlock[1])) !== null) {
      const linkM = sm[1].match(/href="([^"]+)"/);
      const url = linkM ? decodeHtmlEntities(linkM[1]) : '';
      const text = stripHtml(sm[1]);
      if (url) {
        let label = 'Link';
        if (url.includes('github.com')) label = 'GitHub';
        else if (url.includes('dev.to')) label = 'Dev.to';
        else if (url.includes('mastodon')) label = 'Mastodon';
        else if (url.includes('bsky.app')) label = 'Bluesky';
        else if (url.includes('linkedin')) label = 'LinkedIn';
        socialLinksMap.set(url.replace(/\/$/, '').toLowerCase(), {
          label,
          value: text.replace(/^(Mastodon|Bluesky)\s*/i, '').trim() || url,
          url,
        });
      }
    }
    const urlLi = vcardBlock[1].match(/<li[^>]*itemprop="url"[^>]*>([\s\S]*?)<\/li>/);
    if (urlLi) {
      const hrefM = urlLi[1].match(/href="([^"]+)"/);
      if (hrefM) {
        const url = decodeHtmlEntities(hrefM[1]);
        socialLinksMap.set(url.replace(/\/$/, '').toLowerCase(), {
          label: 'GitHub',
          value: `@${username}`,
          url,
        });
      }
    }
  }
  const socialLinks = Array.from(socialLinksMap.values());

  // Achievements
  const achievementsMap = new Map<string, GithubAchievement>();
  const achRegex = /<a[^>]*href="([^"]*\?achievement=([^"&]+)[^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*alt="Achievement:\s*([^"]+)"/g;
  let achM: RegExpExecArray | null;
  while ((achM = achRegex.exec(html)) !== null) {
    const slug = achM[2];
    if (!achievementsMap.has(slug)) {
      achievementsMap.set(slug, {
        slug,
        name: decodeHtmlEntities(achM[4]).trim(),
        imageUrl: decodeHtmlEntities(achM[3]),
        url: `https://github.com${decodeHtmlEntities(achM[1])}`,
      });
    }
  }

  // Pinned repositories
  const pinnedRepos: GithubPinnedRepo[] = [];
  const pinRegex = /<div class="pinned-item-list-item-content">([\s\S]*?)<\/div>\s*<\/li>/g;
  let pinM: RegExpExecArray | null;
  while ((pinM = pinRegex.exec(html)) !== null) {
    const block = pinM[1];
    const linkM = block.match(/<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<span class="repo"[^>]*>([\s\S]*?)<\/span>/);
    if (!linkM) continue;
    const descM = block.match(/<p class="pinned-item-desc[^"]*">([\s\S]*?)<\/p>/);
    const langM = block.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/);
    const starsM = block.match(/href="[^"]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/);
    const forksM = block.match(/href="[^"]+\/forks"[^>]*>([\s\S]*?)<\/a>/);
    const href = decodeHtmlEntities(linkM[1]);
    const name = stripHtml(linkM[2]);
    pinnedRepos.push({
      name,
      fullName: href.replace(/^\//, ''),
      htmlUrl: href.startsWith('http') ? href : `https://github.com${href}`,
      description: descM ? stripHtml(descM[1]) : null,
      primaryLanguage: langM ? stripHtml(langM[1]) : null,
      stars: starsM ? Number(stripHtml(starsM[1]).replace(/,/g, '')) || 0 : 0,
      forks: forksM ? Number(stripHtml(forksM[1]).replace(/,/g, '')) || 0 : 0,
    });
  }

  return {
    name: nameMatch ? stripHtml(nameMatch[1]) : 'Jacinta Wambui Waweru',
    avatarUrl: avatarMatch ? decodeHtmlEntities(avatarMatch[1]).replace(/\?s=\d+/, '') : '',
    bio: bioMatch ? decodeHtmlEntities(bioMatch[1]) : '',
    statusMessage: statusMatch ? stripHtml(statusMatch[1]) : undefined,
    company: companyMatch ? stripHtml(companyMatch[1]) : undefined,
    location: locationMatch ? stripHtml(locationMatch[1]) : undefined,
    followers: followersMatch ? Number(followersMatch[1]) || 0 : 0,
    following: followingMatch ? Number(followingMatch[1]) || 0 : 0,
    starredReposCount: starsTabMatch ? Number(starsTabMatch[1]) || 0 : undefined,
    publicReposCount: reposTabMatch ? Number(reposTabMatch[1]) || 0 : undefined,
    socialLinks,
    achievements: Array.from(achievementsMap.values()),
    pinnedRepos,
  };
}

function parseRepositoriesTabHtml(html: string, username: string): GithubRepoSummary[] {
  const repos: GithubRepoSummary[] = [];
  const liRegex = /<li[^>]*itemprop="owns"[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  let syntheticId = 1000;
  while ((m = liRegex.exec(html)) !== null) {
    const li = m[1];
    const nameM = li.match(/itemprop="name codeRepository"[^>]*>([\s\S]*?)<\/a>/);
    if (!nameM) continue;
    const repoName = stripHtml(nameM[1]);
    const descM = li.match(/itemprop="description"[^>]*>([\s\S]*?)<\/p>/);
    const langM = li.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/);
    const updM = li.match(/datetime="([^"]+)"/);
    const starsM = li.match(/href="[^"]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/);
    const forksM = li.match(/href="[^"]+\/forks"[^>]*>([\s\S]*?)<\/a>/);
    const primaryLanguage = langM ? stripHtml(langM[1]) : null;
    const updatedAt = updM ? updM[1] : '';

    repos.push({
      id: syntheticId++,
      name: repoName,
      fullName: `${username}/${repoName}`,
      htmlUrl: `https://github.com/${username}/${repoName}`,
      description: descM ? stripHtml(descM[1]) : null,
      primaryLanguage,
      languages: primaryLanguage ? { [primaryLanguage]: 100 } : {},
      stars: starsM ? Number(stripHtml(starsM[1]).replace(/,/g, '')) || 0 : 0,
      forks: forksM ? Number(stripHtml(forksM[1]).replace(/,/g, '')) || 0 : 0,
      openIssues: 0,
      defaultBranch: 'main',
      createdAt: updatedAt,
      updatedAt,
      pushedAt: updatedAt,
      homepage: null,
      detectedStack: primaryLanguage ? [primaryLanguage] : [],
    });
  }
  return repos;
}

function parseStarsTabHtml(html: string): GithubStarredRepo[] {
  const starred: GithubStarredRepo[] = [];
  const idx = html.indexOf('user-starred-repos');
  const scope = idx !== -1 ? html.slice(idx) : html;
  const cardRegex = /<div class="col-12 d-block[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = cardRegex.exec(scope)) !== null) {
    const block = m[1];
    const linkM = block.match(/<h3>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkM) continue;
    const href = decodeHtmlEntities(linkM[1]);
    const fullName = stripHtml(linkM[2]).replace(/\s*\/\s*/g, '/');
    const descM = block.match(/<p[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/p>|<div class="py-1"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    const descText = descM ? stripHtml(descM[1] || descM[2] || '') : null;
    const langM = block.match(/itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/);
    const forkM = block.match(/Forked from\s*<a[^>]*>([\s\S]*?)<\/a>/);
    const starsM = block.match(/href="[^"]+\/stargazers"[^>]*>([\s\S]*?)<\/a>/);
    const timeM = block.match(/Updated\s*<relative-time[^>]*>([\s\S]*?)<\/relative-time>/);

    starred.push({
      fullName,
      htmlUrl: href.startsWith('http') ? href : `https://github.com${href}`,
      description: descText || null,
      primaryLanguage: langM ? stripHtml(langM[1]) : null,
      stars: starsM ? Number(stripHtml(starsM[1]).replace(/,/g, '')) || 0 : 0,
      forkedFrom: forkM ? stripHtml(forkM[1]) : null,
      updatedLabel: timeM ? stripHtml(timeM[1]) : null,
    });
  }
  return starred;
}

async function fetchGraphQLContributions(username: string): Promise<{ available: boolean; summary: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      available: false,
      summary: 'Live contribution graph, profile README, pinned & starred repositories synced from GitHub.',
    };
  }
  try {
    const query = `query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
          }
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
        }
      }
    }`;
    const res = await fetchWithRetry('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        ...getGitHubHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { login: username } }),
    });
    if (!res.ok) {
      return {
        available: false,
        summary: 'Live GitHub REST + contribution graph metrics synced.',
      };
    }
    const json = await parseJsonSafely<{
      data?: {
        user?: {
          contributionsCollection?: {
            contributionCalendar?: { totalContributions?: number };
            totalCommitContributions?: number;
            totalPullRequestContributions?: number;
          };
        };
      };
    }>(res);
    const cc = json?.data?.user?.contributionsCollection;
    if (!cc) {
      return { available: false, summary: 'Contribution collection unavailable.' };
    }
    const total = cc.contributionCalendar?.totalContributions ?? 0;
    const commits = cc.totalCommitContributions ?? 0;
    const prs = cc.totalPullRequestContributions ?? 0;
    return {
      available: true,
      summary: `${total} total contributions in the past year (${commits} commits, ${prs} pull requests via GitHub GraphQL API).`,
    };
  } catch {
    return {
      available: false,
      summary: 'Live GitHub REST + contribution graph metrics synced.',
    };
  }
}

export async function fetchGitHubSnapshot(rawUsername = 'Lex-Cable'): Promise<GithubSnapshot> {
  const username = SAFE_GITHUB_SEGMENT.test(rawUsername) ? rawUsername : 'Lex-Cable';
  const headers = getGitHubHeaders();
  const hasToken = Boolean(process.env.GITHUB_TOKEN);

  // Run API requests (best-effort) + public web/raw requests (zero API quota) in parallel
  const [
    userRes,
    reposRes,
    eventsRes,
    starredRes,
    graphqlContrib,
    webProfileHtml,
    webReposHtml,
    webStarsHtml,
    contributionsHtml,
    rawReadmeMain,
  ] = await Promise.all([
    fetchWithRetry(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }).catch(() => null),
    fetchWithRetry(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
      { headers }
    ).catch(() => null),
    fetchWithRetry(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=20`,
      { headers }
    ).catch(() => null),
    fetchWithRetry(
      `https://api.github.com/users/${encodeURIComponent(username)}/starred?per_page=30`,
      { headers }
    ).catch(() => null),
    fetchGraphQLContributions(username),
    fetchTextSafely(`https://github.com/${encodeURIComponent(username)}`),
    fetchTextSafely(`https://github.com/${encodeURIComponent(username)}?tab=repositories`),
    fetchTextSafely(`https://github.com/${encodeURIComponent(username)}?tab=stars`),
    fetchTextSafely(`https://github.com/users/${encodeURIComponent(username)}/contributions`),
    fetchTextSafely(`https://raw.githubusercontent.com/${encodeURIComponent(username)}/${encodeURIComponent(username)}/main/README.md`),
  ]);

  const rawReadme =
    rawReadmeMain ??
    (await fetchTextSafely(
      `https://raw.githubusercontent.com/${encodeURIComponent(username)}/${encodeURIComponent(username)}/master/README.md`
    ));

  const apiUser = userRes?.ok ? await parseJsonSafely<Record<string, unknown>>(userRes) : null;
  const apiRepos = reposRes?.ok ? (await parseJsonSafely<Record<string, unknown>[]>(reposRes)) || [] : [];
  const apiEvents = eventsRes?.ok ? (await parseJsonSafely<Record<string, unknown>[]>(eventsRes)) || [] : [];
  const apiStarred = starredRes?.ok
    ? (await parseJsonSafely<Record<string, unknown>[]>(starredRes)) || []
    : [];

  const webProfile = webProfileHtml ? parseGitHubWebProfile(webProfileHtml, username) : null;
  const contributionCalendar = contributionsHtml
    ? parseContributionCalendarHtml(contributionsHtml)
    : undefined;
  const profileReadme = rawReadme ? parseProfileReadmeMarkdown(rawReadme) : undefined;

  if (!apiUser && !webProfile) {
    throw new Error('Unable to reach GitHub profile or API right now.');
  }

  const rateLimitRemaining = reposRes
    ? Number(reposRes.headers.get('x-ratelimit-remaining') ?? '0')
    : undefined;

  const languageTotals: Record<string, number> = {};
  let repositories: GithubRepoSummary[] = [];

  if (apiRepos.length > 0) {
    for (const r of apiRepos) {
      const repoName = String(r.name || '');
      if (!SAFE_GITHUB_SEGMENT.test(repoName)) continue;

      const primaryLang = r.language ? String(r.language) : null;
      const topics = Array.isArray(r.topics) ? r.topics.map((t) => String(t)) : [];

      let langs: Record<string, number> = {};
      let readmeExcerpt = '';
      let readmeHash = '';
      let rootFiles: string[] = [];
      let pkgJson: string | null = null;
      let composerJson: string | null = null;

      if (hasToken) {
        try {
          const langRes = await fetchWithRetry(
            `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/languages`,
            { headers }
          );
          if (langRes.ok) {
            langs = (await parseJsonSafely<Record<string, number>>(langRes)) || {};
          }
        } catch {
          langs = {};
        }

        try {
          const rdRes = await fetchWithRetry(
            `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/readme`,
            { headers }
          );
          if (rdRes.ok) {
            const rdJson = await parseJsonSafely<{ content?: string }>(rdRes);
            if (rdJson?.content) {
              const decoded = Buffer.from(rdJson.content, 'base64').toString('utf8');
              readmeExcerpt = decoded.slice(0, 1200);
              readmeHash = sha256(decoded);
            }
          }
        } catch {
          // Optional README
        }

        try {
          const contentsRes = await fetchWithRetry(
            `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/contents`,
            { headers }
          );
          if (contentsRes.ok) {
            const items = await parseJsonSafely<{ name: string }[]>(contentsRes);
            rootFiles = Array.isArray(items) ? items.map((i) => i.name) : [];
          }
          if (rootFiles.includes('package.json')) {
            const pkgRes = await fetchWithRetry(
              `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/contents/package.json`,
              { headers }
            );
            if (pkgRes.ok) {
              const j = await parseJsonSafely<{ content?: string }>(pkgRes);
              if (j?.content) pkgJson = Buffer.from(j.content, 'base64').toString('utf8');
            }
          }
          if (rootFiles.includes('laravel-app')) {
            const compRes = await fetchWithRetry(
              `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/contents/laravel-app/composer.json`,
              { headers }
            );
            if (compRes.ok) {
              const j = await parseJsonSafely<{ content?: string }>(compRes);
              if (j?.content) composerJson = Buffer.from(j.content, 'base64').toString('utf8');
            }
          }
        } catch {
          // Non-blocking manifest inspection
        }
      }

      if (Object.keys(langs).length > 0) {
        for (const [lang, bytes] of Object.entries(langs)) {
          languageTotals[lang] = (languageTotals[lang] || 0) + Number(bytes || 0);
        }
      } else if (primaryLang) {
        const estimatedBytes = Math.max(1, Number(r.size || 1)) * 1024;
        langs = { [primaryLang]: estimatedBytes };
        languageTotals[primaryLang] = (languageTotals[primaryLang] || 0) + estimatedBytes;
      }

      const detectedStack = hasToken
        ? detectTechFromManifests(rootFiles, readmeExcerpt, pkgJson, composerJson)
        : Array.from(new Set([...(primaryLang ? [primaryLang] : []), ...topics]));

      repositories.push({
        id: Number(r.id),
        name: repoName,
        fullName: String(r.full_name || `${username}/${repoName}`),
        htmlUrl: String(r.html_url || ''),
        description: r.description ? String(r.description) : null,
        primaryLanguage: primaryLang,
        languages: langs,
        stars: Number(r.stargazers_count || 0),
        forks: Number(r.forks_count || 0),
        openIssues: Number(r.open_issues_count || 0),
        defaultBranch: String(r.default_branch || 'main'),
        createdAt: String(r.created_at || ''),
        updatedAt: String(r.updated_at || ''),
        pushedAt: String(r.pushed_at || ''),
        homepage: r.homepage ? String(r.homepage) : null,
        readmeExcerpt,
        readmeHash,
        detectedStack,
      });
    }
  } else if (webReposHtml) {
    repositories = parseRepositoriesTabHtml(webReposHtml, username);
    for (const r of repositories) {
      if (r.primaryLanguage) {
        languageTotals[r.primaryLanguage] = (languageTotals[r.primaryLanguage] || 0) + 100;
      }
    }
  }

  // Enrich language breakdown from Profile README if repositories only report TypeScript
  if (Object.keys(languageTotals).length === 0 && profileReadme?.techStack?.length) {
    for (const group of profileReadme.techStack) {
      for (const item of group.items) {
        languageTotals[item] = (languageTotals[item] || 0) + 100;
      }
    }
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

  const recentEvents: GithubEventSummary[] = apiEvents.slice(0, 10).map((ev) => {
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

  // Starred repositories: prefer REST API, fall back to live GitHub stars tab
  let starredRepos: GithubStarredRepo[] = [];
  if (apiStarred.length > 0) {
    starredRepos = apiStarred.map((sr) => ({
      fullName: String(sr.full_name || ''),
      htmlUrl: String(sr.html_url || ''),
      description: sr.description ? String(sr.description) : null,
      primaryLanguage: sr.language ? String(sr.language) : null,
      stars: Number(sr.stargazers_count || 0),
      updatedLabel: sr.pushed_at ? new Date(String(sr.pushed_at)).toLocaleDateString() : null,
    }));
  } else if (webStarsHtml) {
    starredRepos = parseStarsTabHtml(webStarsHtml);
  }

  const totalStars = repositories.reduce((acc, r) => acc + r.stars, 0);
  const totalForks = repositories.reduce((acc, r) => acc + r.forks, 0);

  const contributionsText = graphqlContrib.available
    ? graphqlContrib.summary
    : contributionCalendar
      ? `${contributionCalendar.periodLabel} (${contributionCalendar.activeDaysCount} active days, longest streak ${contributionCalendar.longestStreak} day(s)).`
      : graphqlContrib.summary;

  return {
    username: String(apiUser?.login || username),
    name: String(apiUser?.name || webProfile?.name || 'Jacinta Wambui Waweru'),
    avatarUrl: String(apiUser?.avatar_url || webProfile?.avatarUrl || ''),
    bio: String(apiUser?.bio || webProfile?.bio || 'Full-Stack Developer | Problem Solver | Tech Enthusiast'),
    profileUrl: String(apiUser?.html_url || `https://github.com/${username}`),
    publicReposCount: Number(
      apiUser?.public_repos ?? webProfile?.publicReposCount ?? repositories.length
    ),
    followers: Number(apiUser?.followers ?? webProfile?.followers ?? 0),
    following: Number(apiUser?.following ?? webProfile?.following ?? 0),
    statusMessage: webProfile?.statusMessage,
    location: String(apiUser?.location || webProfile?.location || 'Karen, Kenya'),
    company: String(apiUser?.company || webProfile?.company || 'The Co-operative University Of Kenya'),
    pronouns: profileReadme?.pronouns || 'She/Her',
    socialLinks: webProfile?.socialLinks,
    achievements: webProfile?.achievements,
    pinnedRepos: webProfile?.pinnedRepos,
    starredRepos,
    starredReposCount: webProfile?.starredReposCount ?? starredRepos.length,
    profileReadme,
    contributionCalendar,
    totalStars,
    totalForks,
    contributionsSummary: contributionsText,
    contributionsDataAvailable: graphqlContrib.available || Boolean(contributionCalendar),
    topLanguages,
    repositories,
    recentEvents,
    statsSourceNote: apiUser
      ? graphqlContrib.available
        ? 'Live GitHub REST API + GraphQL API + Profile README & Contributions'
        : 'Live GitHub REST API + Public Profile, Contributions & README'
      : 'Live GitHub Public Profile, Contributions Graph & Profile README',
    lastSyncedAt: new Date().toISOString(),
    rateLimitRemaining,
  };
}

export async function fetchRepositoryFullDetails(
  username: string,
  repoName: string
): Promise<{
  readme: string;
  files: string[];
  packageJson: string | null;
  composerJson: string | null;
}> {
  if (!SAFE_GITHUB_SEGMENT.test(username) || !SAFE_GITHUB_SEGMENT.test(repoName)) {
    throw new Error('Invalid GitHub repository identifier');
  }
  const headers = getGitHubHeaders();
  let readme = '';
  let files: string[] = [];
  let packageJson: string | null = null;
  let composerJson: string | null = null;

  const rdRes = await fetchWithRetry(
    `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/readme`,
    { headers }
  );
  if (rdRes.ok) {
    const j = await parseJsonSafely<{ content?: string }>(rdRes);
    if (j?.content) readme = Buffer.from(j.content, 'base64').toString('utf8');
  }

  const contRes = await fetchWithRetry(
    `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/contents`,
    { headers }
  );
  if (contRes.ok) {
    const items = await parseJsonSafely<{ name: string }[]>(contRes);
    files = Array.isArray(items) ? items.map((i) => i.name) : [];
  }

  if (files.includes('package.json')) {
    const pkgRes = await fetchWithRetry(
      `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/contents/package.json`,
      { headers }
    );
    if (pkgRes.ok) {
      const j = await parseJsonSafely<{ content?: string }>(pkgRes);
      if (j?.content) packageJson = Buffer.from(j.content, 'base64').toString('utf8');
    }
  }

  if (files.includes('laravel-app')) {
    const compRes = await fetchWithRetry(
      `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(repoName)}/contents/laravel-app/composer.json`,
      { headers }
    );
    if (compRes.ok) {
      const j = await parseJsonSafely<{ content?: string }>(compRes);
      if (j?.content) composerJson = Buffer.from(j.content, 'base64').toString('utf8');
    }
  }

  return { readme, files, packageJson, composerJson };
}

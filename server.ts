import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { createServer as createViteServer } from 'vite';
import { fetchGitHubSnapshot, fetchRepositoryFullDetails } from './server/githubService.ts';
import { fetchGitLabSnapshot } from './server/gitlabService.ts';
import { analyzeRepositoryWithGemini, generatePortfolioAdvisory } from './server/geminiService.ts';
import { sendContactEmail, sendContactReply } from './server/emailService.ts';
import type { GithubRepoSummary, GithubSnapshot, GitlabSnapshot, Project } from './src/types/portfolio.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_EMAIL = 'jaccie.wambui26@gmail.com';
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'Lex-Cable';
const GITLAB_USERNAME = process.env.GITLAB_USERNAME || 'lex_cab23';
const PORT = Number(process.env.PORT || 3000);

// Initialize firebase-admin strictly for verifyIdToken (no IAM needed)
let adminAuthReady = false;
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { projectId?: string };
    if (fbConfig.projectId && fbConfig.projectId !== 'remixed-project-id') {
      const adminApp = getApps().length
        ? getApp()
        : initializeApp({ projectId: fbConfig.projectId });
      getAuth(adminApp);
      adminAuthReady = true;
    }
  }
} catch (err) {
  console.error('Firebase Admin token verifier initialization skipped:', err);
}

interface AuthedRequest extends Request {
  adminEmail?: string;
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!adminAuthReady) {
    res.status(503).json({ error: 'Firebase Authentication is not initialized on the server.' });
    return;
  }
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(match[1]);
    if (!decoded.email_verified || (decoded.email || '').toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ error: 'Forbidden: only the verified, allowlisted administrator may access this resource.' });
      return;
    }
    req.adminEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

// In-memory + tmp disk cache & configurable background scheduler state
const GITHUB_DISK_CACHE_PATH = '/tmp/lex-cable-github-cache.json';
let cachedSnapshot: GithubSnapshot | null = null;
let cachedAtMs = 0;

try {
  if (fs.existsSync(GITHUB_DISK_CACHE_PATH)) {
    const raw = JSON.parse(fs.readFileSync(GITHUB_DISK_CACHE_PATH, 'utf8')) as {
      snapshot?: GithubSnapshot;
      cachedAtMs?: number;
    };
    if (raw.snapshot && Array.isArray(raw.snapshot.repositories)) {
      cachedSnapshot = raw.snapshot;
      cachedAtMs = Number(raw.cachedAtMs || 0);
    }
  }
} catch {
  // Ignore invalid temp cache
}

function persistSnapshotToCache(snapshot: GithubSnapshot) {
  cachedSnapshot = snapshot;
  cachedAtMs = Date.now();
  try {
    fs.writeFileSync(
      GITHUB_DISK_CACHE_PATH,
      JSON.stringify({ snapshot, cachedAtMs }),
      'utf8'
    );
  } catch {
    // Non-fatal in read-only filesystems
  }
}

const GITLAB_DISK_CACHE_PATH = '/tmp/lex-cable-gitlab-cache.json';
let cachedGitlabSnapshot: GitlabSnapshot | null = null;
let cachedGitlabAtMs = 0;

try {
  if (fs.existsSync(GITLAB_DISK_CACHE_PATH)) {
    const raw = JSON.parse(fs.readFileSync(GITLAB_DISK_CACHE_PATH, 'utf8')) as {
      snapshot?: GitlabSnapshot;
      cachedAtMs?: number;
    };
    if (raw.snapshot && raw.snapshot.username) {
      cachedGitlabSnapshot = raw.snapshot;
      cachedGitlabAtMs = Number(raw.cachedAtMs || 0);
    }
  }
} catch {
  // Ignore invalid temp cache
}

function persistGitlabSnapshotToCache(snapshot: GitlabSnapshot) {
  cachedGitlabSnapshot = snapshot;
  cachedGitlabAtMs = Date.now();
  try {
    fs.writeFileSync(
      GITLAB_DISK_CACHE_PATH,
      JSON.stringify({ snapshot, cachedAtMs: cachedGitlabAtMs }),
      'utf8'
    );
  } catch {
    // Non-fatal in read-only filesystems
  }
}

let gitlabRefreshPromise: Promise<GitlabSnapshot> | null = null;
let gitlabRateLimitedUntilMs = 0;

async function refreshGitlabSnapshot(forceRefresh = false): Promise<GitlabSnapshot> {
  const cacheTtlMs = 30 * 60 * 1000;
  const cacheIsFresh = Boolean(cachedGitlabSnapshot && Date.now() - cachedGitlabAtMs < cacheTtlMs);

  if (!forceRefresh && cacheIsFresh && cachedGitlabSnapshot) return cachedGitlabSnapshot;
  if (Date.now() < gitlabRateLimitedUntilMs && cachedGitlabSnapshot) return cachedGitlabSnapshot;

  if (!gitlabRefreshPromise) {
    gitlabRefreshPromise = fetchGitLabSnapshot(GITLAB_USERNAME)
      .then((fresh) => {
        const merged = mergeGitlabSnapshot(cachedGitlabSnapshot, fresh);
        persistGitlabSnapshotToCache(merged);
        gitlabRateLimitedUntilMs = 0;
        return merged;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        if (/rate limit|429/i.test(message)) {
          // Honor a conservative cooldown so repeated page visits do not amplify 429s.
          gitlabRateLimitedUntilMs = Date.now() + 15 * 60 * 1000;
        }
        if (cachedGitlabSnapshot) return cachedGitlabSnapshot;
        throw error;
      })
      .finally(() => {
        gitlabRefreshPromise = null;
      });
  }

  return gitlabRefreshPromise;
}

function mergeGithubSnapshot(
  prev: GithubSnapshot | null,
  fresh: GithubSnapshot
): GithubSnapshot {
  if (!prev) return fresh;
  return {
    ...prev,
    ...fresh,
    avatarUrl: fresh.avatarUrl || prev.avatarUrl,
    socialLinks: fresh.socialLinks?.length ? fresh.socialLinks : prev.socialLinks,
    achievements: fresh.achievements?.length ? fresh.achievements : prev.achievements,
    pinnedRepos: fresh.pinnedRepos?.length ? fresh.pinnedRepos : prev.pinnedRepos,
    starredRepos: fresh.starredRepos?.length ? fresh.starredRepos : prev.starredRepos,
    starredReposCount: fresh.starredReposCount ?? prev.starredReposCount,
    profileReadme: fresh.profileReadme || prev.profileReadme,
    contributionCalendar: fresh.contributionCalendar || prev.contributionCalendar,
    topLanguages: fresh.topLanguages.length ? fresh.topLanguages : prev.topLanguages,
    repositories: fresh.repositories.length ? fresh.repositories : prev.repositories,
    recentEvents: fresh.recentEvents.length ? fresh.recentEvents : prev.recentEvents,
  };
}

function mergeGitlabSnapshot(
  prev: GitlabSnapshot | null,
  fresh: GitlabSnapshot
): GitlabSnapshot {
  if (!prev) return fresh;
  const freshCalHasData = Boolean(
    fresh.contributionCalendar && fresh.contributionCalendar.totalContributions > 0
  );
  const prevCalHasData = Boolean(
    prev.contributionCalendar && prev.contributionCalendar.totalContributions > 0
  );
  return {
    ...prev,
    ...fresh,
    avatarUrl: fresh.avatarUrl || prev.avatarUrl,
    location: fresh.location || prev.location,
    organization: fresh.organization || prev.organization,
    pronouns: fresh.pronouns || prev.pronouns,
    lastActivityAtomAt: fresh.lastActivityAtomAt || prev.lastActivityAtomAt,
    contributionCalendar: freshCalHasData
      ? fresh.contributionCalendar
      : prevCalHasData
        ? prev.contributionCalendar
        : fresh.contributionCalendar || prev.contributionCalendar,
    topLanguages: fresh.topLanguages.length ? fresh.topLanguages : prev.topLanguages,
    memberProjects: fresh.memberProjects.length ? fresh.memberProjects : prev.memberProjects,
    personalProjects: fresh.personalProjects.length ? fresh.personalProjects : prev.personalProjects,
    contributedProjects: fresh.contributedProjects.length
      ? fresh.contributedProjects
      : prev.contributedProjects,
    starredProjects: fresh.starredProjects.length ? fresh.starredProjects : prev.starredProjects,
    recentEvents: fresh.recentEvents.length ? fresh.recentEvents : prev.recentEvents,
  };
}

interface AutomationState {
  enabled: boolean;
  frequencyMinutes: number;
  lastRunAt: string | null;
  lastStatus: 'idle' | 'success' | 'error';
  lastMessage: string;
  queuedDetections: Array<{
    id: string;
    type: 'new_repo' | 'repo_update';
    repoName: string;
    detectedAt: string;
    summary: string;
    repo: GithubRepoSummary;
  }>;
  recentLogs: Array<{ timestamp: string; status: string; message: string }>;
}

const automationState: AutomationState = {
  enabled: true,
  frequencyMinutes: 360,
  lastRunAt: null,
  lastStatus: 'idle',
  lastMessage: 'Background scheduler initialized.',
  queuedDetections: [],
  recentLogs: [],
};

let schedulerTimer: NodeJS.Timeout | null = null;

function pushSchedulerLog(status: string, message: string) {
  automationState.recentLogs.unshift({
    timestamp: new Date().toISOString(),
    status,
    message,
  });
  automationState.recentLogs = automationState.recentLogs.slice(0, 25);
}

async function runScheduledSyncJob(trigger: 'scheduler' | 'cron') {
  try {
    const prevSnapshot = cachedSnapshot;
    const nextSnapshot = await fetchGitHubSnapshot(GITHUB_USERNAME);

    if (prevSnapshot) {
      const prevMap = new Map(prevSnapshot.repositories.map((r) => [r.name, r]));
      for (const repo of nextSnapshot.repositories) {
        if (repo.name.toLowerCase() === GITHUB_USERNAME.toLowerCase()) continue;
        const prev = prevMap.get(repo.name);
        if (!prev) {
          automationState.queuedDetections.push({
            id: `det-new-${repo.name}-${Date.now()}`,
            type: 'new_repo',
            repoName: repo.name,
            detectedAt: new Date().toISOString(),
            summary: `Detected new public repository: ${repo.name}`,
            repo,
          });
        } else if (
          (repo.readmeHash && prev.readmeHash && repo.readmeHash !== prev.readmeHash) ||
          repo.description !== prev.description ||
          repo.pushedAt !== prev.pushedAt
        ) {
          automationState.queuedDetections.push({
            id: `det-upd-${repo.name}-${Date.now()}`,
            type: 'repo_update',
            repoName: repo.name,
            detectedAt: new Date().toISOString(),
            summary: `Detected metadata or README update on ${repo.name}`,
            repo,
          });
        }
      }
      // Keep queue deduplicated and bounded
      const dedup = new Map(automationState.queuedDetections.map((d) => [`${d.type}:${d.repoName}`, d]));
      automationState.queuedDetections = Array.from(dedup.values()).slice(0, 20);
    }

    persistSnapshotToCache(nextSnapshot);
    let gitlabSyncSuffix = '';
    try {
      const nextGitlab = await fetchGitLabSnapshot(GITLAB_USERNAME);
      persistGitlabSnapshotToCache(nextGitlab);
      gitlabSyncSuffix = ` + GitLab @${nextGitlab.username}`;
    } catch {
      // Non-fatal: keep GitHub sync success while preserving last valid GitLab cache
    }
    automationState.lastRunAt = nextSnapshot.lastSyncedAt;
    automationState.lastStatus = 'success';
    automationState.lastMessage = `Synced ${nextSnapshot.repositories.length} public repositories${gitlabSyncSuffix} (${trigger}).`;
    pushSchedulerLog('success', automationState.lastMessage);
  } catch (err) {
    automationState.lastRunAt = new Date().toISOString();
    automationState.lastStatus = 'error';
    automationState.lastMessage = err instanceof Error ? err.message : 'Scheduled sync failed';
    pushSchedulerLog('error', automationState.lastMessage);
  }
}

function reconfigureScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (!automationState.enabled) return;
  const intervalMs = Math.max(5, Math.min(10080, automationState.frequencyMinutes)) * 60 * 1000;
  schedulerTimer = setInterval(() => {
    void runScheduledSyncJob('scheduler');
  }, intervalMs);
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many contact submissions. Please try again in 15 minutes.' },
  });

  const adminApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit reached for automation requests. Please wait shortly.' },
  });

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      githubConfigured: Boolean(process.env.GITHUB_TOKEN),
      gitlabConfigured: Boolean(process.env.GITLAB_TOKEN),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    });
  });

  // Minimal operational health endpoint; never exposes environment secrets.
  app.get('/api/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      service: 'web-portfolio',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      integrations: {
        firebaseAuthVerifier: adminAuthReady ? 'ready' : 'not-configured',
        githubCache: cachedSnapshot ? 'available' : 'empty',
        gitlabCache: cachedGitlabSnapshot ? 'available' : 'empty',
      },
    });
  });

  // Serve verified CV PDF with explicit Content-Type, Accept-Ranges, and optional attachment download
  app.get('/api/cv', (req, res) => {
    const candidates = [
      path.resolve(__dirname, 'public/assets/aistudio/Jacinta_Wambui_Waweru_Professional_CV_83c4f51b.pdf'),
      path.resolve(__dirname, 'dist/assets/aistudio/Jacinta_Wambui_Waweru_Professional_CV_83c4f51b.pdf'),
    ];
    const pdfPath = candidates.find((p) => fs.existsSync(p));
    if (!pdfPath) {
      res.status(404).json({ error: 'CV PDF file not found.' });
      return;
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const total = pdfBuffer.length;
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    const range = req.headers.range;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="Jacinta_Wambui_Waweru_Professional_CV.pdf"`
    );
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=300');

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
        if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && start <= end && end < total) {
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
          res.setHeader('Content-Length', String(end - start + 1));
          res.end(pdfBuffer.subarray(start, end + 1));
          return;
        }
      }
    }

    res.setHeader('Content-Length', String(total));
    res.end(pdfBuffer);
  });

  // Public GitHub Snapshot (caches for 30 minutes unless ?refresh=1)
  app.get('/api/github/snapshot', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const forceRefresh = req.query.refresh === '1';
    try {
      const cacheTtlMs = 30 * 60 * 1000;
      const missingExtended = !cachedSnapshot?.contributionCalendar || !cachedSnapshot?.profileReadme;
      if (forceRefresh || !cachedSnapshot || missingExtended || Date.now() - cachedAtMs > cacheTtlMs) {
        const fresh = await fetchGitHubSnapshot(GITHUB_USERNAME);
        const merged = mergeGithubSnapshot(cachedSnapshot, fresh);
        persistSnapshotToCache(merged);
        automationState.lastRunAt = merged.lastSyncedAt;
        automationState.lastStatus = 'success';
        automationState.lastMessage = `Fetched live snapshot (${merged.repositories.length} repos).`;
      }
      res.json(cachedSnapshot);
    } catch (err) {
      if (!forceRefresh && cachedSnapshot) {
        res.json(cachedSnapshot);
        return;
      }
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to fetch GitHub profile.',
      });
    }
  });

  // Public GitLab Snapshot (30-minute cache, single-flight refresh, and stale-cache fallback)
  app.get('/api/gitlab/snapshot', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const forceRefresh = req.query.refresh === '1';
    try {
      const snapshot = await refreshGitlabSnapshot(forceRefresh);
      res.json(snapshot);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to fetch GitLab profile.',
      });
    }
  });

  // Protected Admin GitHub Sync + Change Detection + Optional Gemini Summaries
  app.post('/api/github/sync', adminApiLimiter, requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const {
        existingProjects = [],
        detectNewRepos = true,
        detectReadmeChanges = true,
        generateAiSuggestions = true,
      } = (req.body || {}) as {
        existingProjects?: Project[];
        detectNewRepos?: boolean;
        detectReadmeChanges?: boolean;
        generateAiSuggestions?: boolean;
      };

      const prevReposMap = new Map(
        (cachedSnapshot?.repositories || []).map((r) => [r.name.toLowerCase(), r])
      );
      const freshGithub = await fetchGitHubSnapshot(GITHUB_USERNAME);
      const snapshot = mergeGithubSnapshot(cachedSnapshot, freshGithub);
      persistSnapshotToCache(snapshot);

      let gitlabSnapshot: GitlabSnapshot | null = cachedGitlabSnapshot;
      try {
        gitlabSnapshot = await refreshGitlabSnapshot(false);
      } catch {
        // GitLab is optional for a successful GitHub sync; preserve any cached snapshot.
      }

      const projectByRepo = new Map<string, Project>();
      for (const p of existingProjects) {
        if (p.sourceRepoName) {
          projectByRepo.set(p.sourceRepoName.toLowerCase(), p);
        } else if (p.githubUrl) {
          const tail = p.githubUrl.split('/').pop()?.toLowerCase();
          if (tail) projectByRepo.set(tail, p);
        }
      }

      const proposals: Array<{
        category: 'new_repo' | 'repo_update';
        targetType: 'project';
        targetId: string;
        title: string;
        explanation: string;
        previousContentJson: string;
        proposedContentJson: string;
        source: 'github_sync' | 'gemini_ai';
      }> = [];

      for (const repo of snapshot.repositories) {
        // Skip the GitHub profile README repo Lex-Cable/Lex-Cable from becoming a software project card
        if (repo.name.toLowerCase() === GITHUB_USERNAME.toLowerCase()) continue;

        const existingProject = projectByRepo.get(repo.name.toLowerCase());
        const prevCachedRepo = prevReposMap.get(repo.name.toLowerCase());

        if (!existingProject && detectNewRepos) {
          let suggested: Record<string, unknown> = {
            id: repo.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
            slug: repo.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
            title: repo.name.replace(/[-_]+/g, ' '),
            shortDescription: repo.description || `Public repository ${repo.name} synchronized from GitHub.`,
            problemStatement: 'Review repository README and define the specific problem addressed.',
            contributionRole: 'Full-Stack Developer',
            fullDescription: repo.readmeExcerpt || repo.description || '',
            technologies: repo.detectedStack?.length
              ? repo.detectedStack
              : Object.keys(repo.languages),
            features: ['Synchronized from public GitHub repository'],
            githubUrl: repo.htmlUrl,
            liveDemoUrl: repo.homepage || '',
            status: 'In Development',
            featured: false,
            isPublic: true,
            sourceRepoName: repo.name,
            repoUpdatedAt: repo.pushedAt,
            displayOrder: 10,
          };

          let usedAi = false;
          if (generateAiSuggestions && process.env.GEMINI_API_KEY) {
            try {
              const details = await fetchRepositoryFullDetails(GITHUB_USERNAME, repo.name);
              const aiDraft = await analyzeRepositoryWithGemini({
                repoName: repo.name,
                githubUrl: repo.htmlUrl,
                description: repo.description,
                readme: details.readme,
                files: details.files,
                packageJson: details.packageJson,
                composerJson: details.composerJson,
              });
              suggested = { ...suggested, ...aiDraft, githubUrl: repo.htmlUrl, sourceRepoName: repo.name };
              usedAi = true;
            } catch {
              // Fall back cleanly to deterministic GitHub metadata
            }
          }

          proposals.push({
            category: 'new_repo',
            targetType: 'project',
            targetId: String(suggested.id),
            title: `New Repository Detected: ${repo.name}`,
            explanation: usedAi
              ? `Detected new public GitHub repository "${repo.name}" and drafted a grounded summary using Gemini AI from its README and manifests.`
              : `Detected new public GitHub repository "${repo.name}". Review and approve before publishing.`,
            previousContentJson: '{}',
            proposedContentJson: JSON.stringify(suggested, null, 2),
            source: usedAi ? 'gemini_ai' : 'github_sync',
          });
        } else if (existingProject && detectReadmeChanges) {
          const pushedChanged =
            repo.pushedAt &&
            existingProject.repoUpdatedAt &&
            new Date(repo.pushedAt).getTime() > new Date(existingProject.repoUpdatedAt).getTime();
          const readmeChanged =
            Boolean(prevCachedRepo?.readmeHash && repo.readmeHash && prevCachedRepo.readmeHash !== repo.readmeHash);
          const newDetectedTechs = (repo.detectedStack || []).filter(
            (t) => !existingProject.technologies.some((et) => et.toLowerCase() === t.toLowerCase())
          );

          if (pushedChanged || readmeChanged || newDetectedTechs.length > 0) {
            const mergedTechs = Array.from(
              new Set([...existingProject.technologies, ...newDetectedTechs])
            );
            const proposedProject: Partial<Project> = {
              ...existingProject,
              technologies: mergedTechs,
              repoUpdatedAt: repo.pushedAt,
            };

            proposals.push({
              category: 'repo_update',
              targetType: 'project',
              targetId: existingProject.id,
              title: `Repository Update Detected: ${repo.name}`,
              explanation: [
                pushedChanged ? `New commits pushed (${repo.pushedAt}).` : '',
                readmeChanged ? 'Repository README changed.' : '',
                newDetectedTechs.length ? `Detected additional stack tokens: ${newDetectedTechs.join(', ')}.` : '',
              ]
                .filter(Boolean)
                .join(' '),
              previousContentJson: JSON.stringify(
                {
                  technologies: existingProject.technologies,
                  repoUpdatedAt: existingProject.repoUpdatedAt || '',
                },
                null,
                2
              ),
              proposedContentJson: JSON.stringify(proposedProject, null, 2),
              source: 'github_sync',
            });
          }
        }
      }

      // Consume queued detections once surfaced to admin
      const backgroundDetections = [...automationState.queuedDetections];
      automationState.queuedDetections = [];
      automationState.lastRunAt = snapshot.lastSyncedAt;
      automationState.lastStatus = 'success';
      automationState.lastMessage = `Manual sync by ${req.adminEmail}: ${snapshot.repositories.length} repos checked, ${proposals.length} proposal(s) generated.`;
      pushSchedulerLog('success', automationState.lastMessage);

      res.json({
        snapshot,
        gitlabSnapshot,
        proposals,
        backgroundDetections,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GitHub synchronization failed';
      automationState.lastStatus = 'error';
      automationState.lastMessage = msg;
      pushSchedulerLog('error', msg);
      res.status(502).json({ error: msg });
    }
  });

  // Protected Admin AI Repository Analysis
  app.post('/api/ai/analyze-repo', adminApiLimiter, requireAdmin, async (req, res) => {
    try {
      const { repoName, githubUrl, description } = (req.body || {}) as {
        repoName?: string;
        githubUrl?: string;
        description?: string | null;
      };
      if (!repoName || typeof repoName !== 'string') {
        res.status(400).json({ error: 'repoName is required.' });
        return;
      }
      const details = await fetchRepositoryFullDetails(GITHUB_USERNAME, repoName);
      const analysis = await analyzeRepositoryWithGemini({
        repoName,
        githubUrl: githubUrl || `https://github.com/${GITHUB_USERNAME}/${repoName}`,
        description: description ?? null,
        readme: details.readme,
        files: details.files,
        packageJson: details.packageJson,
        composerJson: details.composerJson,
      });
      res.json({ analysis });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'AI repository analysis failed.',
      });
    }
  });

  // Protected Admin AI Portfolio Advisory (Bio, SEO, CV, Missing Info Audit)
  app.post('/api/ai/advisory', adminApiLimiter, requireAdmin, async (req, res) => {
    try {
      const { task, profileJson, projectsJson, skillsJson, experiencesJson } = (req.body || {}) as {
        task?: 'bio_polish' | 'seo_metadata' | 'cv_improvements' | 'missing_info_audit';
        profileJson?: string;
        projectsJson?: string;
        skillsJson?: string;
        experiencesJson?: string;
      };
      if (!task || !['bio_polish', 'seo_metadata', 'cv_improvements', 'missing_info_audit'].includes(task)) {
        res.status(400).json({ error: 'Invalid advisory task.' });
        return;
      }
      const advisory = await generatePortfolioAdvisory({
        task,
        profileJson: profileJson || '{}',
        projectsJson: projectsJson || '[]',
        skillsJson: skillsJson || '[]',
        experiencesJson: experiencesJson || '[]',
      });
      res.json({ advisory });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'AI advisory generation failed.',
      });
    }
  });

  // Contact Form Endpoint (rate limited + honeypot + optional SMTP)
  app.post('/api/contact', contactLimiter, async (req, res) => {
    try {
      const { name, email, subject, message, website, startedAt } = (req.body || {}) as {
        name?: string;
        email?: string;
        subject?: string;
        message?: string;
        website?: string;
        startedAt?: number;
      };

      // Honeypot check
      if (website && website.trim().length > 0) {
        res.status(400).json({ error: 'Invalid submission.' });
        return;
      }
      // Basic bot timing check (if submitted under 1.2s from form render)
      if (typeof startedAt === 'number' && Date.now() - startedAt < 1200) {
        res.status(400).json({ error: 'Please take a moment before submitting.' });
        return;
      }

      if (!name || name.trim().length < 2 || name.trim().length > 120) {
        res.status(400).json({ error: 'Please provide your name (2–120 characters).' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email.trim()) || email.trim().length > 160) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }
      if (!subject || subject.trim().length < 2 || subject.trim().length > 200) {
        res.status(400).json({ error: 'Please provide a clear subject.' });
        return;
      }
      if (!message || message.trim().length < 5 || message.trim().length > 4000) {
        res.status(400).json({ error: 'Message must be between 5 and 4000 characters.' });
        return;
      }

      const result = await sendContactEmail({
        senderName: name.trim(),
        senderEmail: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unable to process contact submission.',
      });
    }
  });

  // Send a direct reply to a contact form message (administrator only).
  app.post('/api/admin/contact-reply', adminApiLimiter, requireAdmin, async (req: AuthedRequest, res) => {
    try {
      const { senderName, senderEmail, subject, reply } = (req.body || {}) as {
        senderName?: string;
        senderEmail?: string;
        subject?: string;
        reply?: string;
      };
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!senderName || senderName.trim().length < 2 || senderName.length > 120 ||
          !senderEmail || !emailRegex.test(senderEmail) || senderEmail.length > 160 ||
          !subject || subject.trim().length < 2 || subject.length > 200 ||
          !reply || reply.trim().length < 2 || reply.length > 5000) {
        res.status(400).json({ error: 'Please check the recipient, subject, and reply. The reply must contain 2–5,000 characters.' });
        return;
      }
      await sendContactReply({
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        subject: subject.trim(),
        reply: reply.trim(),
      });
      res.json({ ok: true, message: 'Reply sent successfully.' });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : 'Unable to send the reply.' });
    }
  });

  // Protected Admin Automation Scheduler Status & Config
  app.get('/api/automation/status', requireAdmin, (_req, res) => {
    res.json({
      ...automationState,
      githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    });
  });

  app.post('/api/automation/config', requireAdmin, (req, res) => {
    const { enabled, frequencyMinutes } = (req.body || {}) as {
      enabled?: boolean;
      frequencyMinutes?: number;
    };
    if (typeof enabled === 'boolean') {
      automationState.enabled = enabled;
    }
    if (typeof frequencyMinutes === 'number' && Number.isFinite(frequencyMinutes)) {
      automationState.frequencyMinutes = Math.max(5, Math.min(10080, Math.round(frequencyMinutes)));
    }
    reconfigureScheduler();
    pushSchedulerLog(
      'config',
      `Scheduler ${automationState.enabled ? 'enabled' : 'paused'} (${automationState.frequencyMinutes} min interval).`
    );
    res.json(automationState);
  });

  // External Cron Trigger (Cloud Scheduler / GitHub Actions)
  app.post('/api/cron/github-sync', async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      res.status(503).json({ error: 'CRON_SECRET is not configured on the server.' });
      return;
    }
    if (req.headers['x-cron-secret'] !== secret) {
      res.status(401).json({ error: 'Unauthorized cron trigger.' });
      return;
    }
    await runScheduledSyncJob('cron');
    res.json({
      ok: automationState.lastStatus === 'success',
      lastRunAt: automationState.lastRunAt,
      message: automationState.lastMessage,
      queuedDetectionsCount: automationState.queuedDetections.length,
    });
  });

  // Dynamic SEO Sitemap & Robots.txt
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const routes = [
      '/',
      '/about',
      '/skills',
      '/projects',
      '/projects/berry-e-learning-platform',
      '/projects/buyhive-marketplace',
      '/projects/weego',
      '/projects/talent-bridge',
      '/github',
      '/gitlab',
      '/experience',
      '/contact',
    ];
    const urls = routes
      .map(
        (route) =>
          `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`
      )
      .join('\n');
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  });

  // Ensure unmatched or errored /api/* requests always return JSON, never index.html
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Unexpected server error.',
      });
      return;
    }
    next(err);
  });

  // Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const publicDir = path.resolve(__dirname, 'public');
    app.use(express.static(distDir));
    if (fs.existsSync(publicDir)) {
      app.use(express.static(publicDir));
    }
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  reconfigureScheduler();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});




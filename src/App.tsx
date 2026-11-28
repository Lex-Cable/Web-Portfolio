import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Download, FileText, X } from 'lucide-react';
import { ADMIN_EMAIL, auth, testFirestoreConnection } from './lib/firebase';
import {
  DEFAULT_CV_FILENAME,
  DEFAULT_CV_PDF_PATH,
  DEFAULT_EDUCATION,
  DEFAULT_EXPERIENCES,
  DEFAULT_GITHUB_SETTINGS,
  DEFAULT_PROFILE,
  DEFAULT_PROJECTS,
  DEFAULT_SKILLS,
} from './data/defaultPortfolio';
import {
  seedInitialPortfolioIfEmpty,
  subscribeAnalyticsEvents,
  subscribeApprovedCv,
  subscribeAuditLogs,
  subscribeContactMessages,
  subscribeCvVersions,
  subscribeEducation,
  subscribeExperiences,
  subscribeGithubSettings,
  subscribePendingApprovals,
  subscribeProjects,
  subscribePublicGithubCache,
  subscribePublicProfile,
  subscribeSkills,
  trackAnalyticsEvent,
} from './services/portfolioDb';
import type {
  AnalyticsEvent,
  ApprovedCv,
  AuditLog,
  ContactMessage,
  CvVersion,
  Education,
  Experience,
  GithubSettings,
  GithubSnapshot,
  GitlabSnapshot,
  PendingApproval,
  PortfolioProfile,
  Project,
  Skill,
} from './types/portfolio';
import {
  decodeValidPdfBase64,
  fetchVerifiedCvPdfBlob,
  generatePortfolioCvPdfBlob,
  triggerBlobDownload,
} from './utils/pdfGenerator';
import {
  createBaselineGitlabSnapshot,
  extractApiError,
  fetchDirectPublicGithubSnapshot,
  fetchDirectPublicGitlabSnapshot,
  mergeGithubSnapshots,
  mergeGitlabSnapshots,
  safeParseJsonResponse,
} from './utils/safeFetchJson';
import { Layout } from './components/Layout';
import { HomeSection } from './components/HomeSection';
const AboutSection = lazy(() =>
  import('./components/AboutSection').then((module) => ({ default: module.AboutSection }))
);
const SkillsSection = lazy(() =>
  import('./components/SkillsSection').then((module) => ({ default: module.SkillsSection }))
);
const ProjectsSection = lazy(() =>
  import('./components/ProjectsSection').then((module) => ({ default: module.ProjectsSection }))
);
const GithubActivitySection = lazy(() =>
  import('./components/GithubActivitySection').then((module) => ({ default: module.GithubActivitySection }))
);
const GitlabActivitySection = lazy(() =>
  import('./components/GitlabActivitySection').then((module) => ({ default: module.GitlabActivitySection }))
);
const BusinessManagementSection = lazy(() =>
  import('./components/BusinessManagementSection').then((module) => ({ default: module.BusinessManagementSection }))
);
const ExperienceSection = lazy(() =>
  import('./components/ExperienceSection').then((module) => ({ default: module.ExperienceSection }))
);
const ContactSection = lazy(() =>
  import('./components/ContactSection').then((module) => ({ default: module.ContactSection }))
);
const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then((module) => ({ default: module.AdminDashboard }))
);

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(
    () => window.location.pathname || '/'
  );
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [adminMfaVerified, setAdminMfaVerified] = useState(false);

  const [profile, setProfile] = useState<PortfolioProfile>(DEFAULT_PROFILE);
  const [projects, setProjects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [skills, setSkills] = useState<Skill[]>(DEFAULT_SKILLS);
  const [experiences, setExperiences] = useState<Experience[]>(DEFAULT_EXPERIENCES);
  const [education, setEducation] = useState<Education[]>(DEFAULT_EDUCATION);
  const [approvedCv, setApprovedCv] = useState<ApprovedCv | null>(null);

  const [githubSnapshot, setGithubSnapshot] = useState<GithubSnapshot | null>(null);
  const [githubLoading, setGithubLoading] = useState<boolean>(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  const [gitlabSnapshot, setGitlabSnapshot] = useState<GitlabSnapshot | null>(null);
  const [gitlabLoading, setGitlabLoading] = useState<boolean>(false);
  const [gitlabError, setGitlabError] = useState<string | null>(null);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);

  // Admin state
  const [githubSettings, setGithubSettings] = useState<GithubSettings>(DEFAULT_GITHUB_SETTINGS);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [cvVersions, setCvVersions] = useState<CvVersion[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === ADMIN_EMAIL &&
      adminMfaVerified
  );

  useEffect(() => {
    let cancelled = false;
    setAdminMfaVerified(false);
    if (user && user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL) {
      void user.getIdTokenResult().then(({ claims }) => {
        const firebaseClaims = claims.firebase as { sign_in_second_factor?: string } | undefined;
        if (!cancelled) {
          setAdminMfaVerified(firebaseClaims?.sign_in_second_factor === 'totp');
        }
      }).catch(() => {
        if (!cancelled) setAdminMfaVerified(false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Theme synchronization
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Browser history routing
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // SEO document title synchronization
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': profile.seoTitle || `${profile.name} — ${profile.title}`,
      '/about': `About — ${profile.name}`,
      '/skills': `Technical Skills — ${profile.name}`,
      '/projects': `Software Projects — ${profile.name}`,
      '/github': `GitHub Activity — ${profile.name}`,
      '/gitlab': `GitLab Activity — ${profile.name}`,
      '/business-management': `Business & Management — ${profile.name}`,
      '/experience': `Experience & Education — ${profile.name}`,
      '/contact': `Contact — ${profile.name}`,
      '/admin': `Admin Console — ${profile.name}`,
    };
    if (currentPath.startsWith('/projects/')) {
      const slug = currentPath.replace('/projects/', '');
      const proj = projects.find((p) => p.slug === slug);
      document.title = proj ? `${proj.title} — ${profile.name}` : `Project — ${profile.name}`;
      void trackAnalyticsEvent('project_view', slug);
    } else {
      document.title = titles[currentPath] || titles['/'];
      if (!currentPath.startsWith('/admin')) {
        void trackAnalyticsEvent('page_view', currentPath === '/' ? 'home' : currentPath.slice(1));
      }
    }
  }, [currentPath, profile.name, profile.title, profile.seoTitle, projects]);

  // Firestore connection validation + Auth listener
  useEffect(() => {
    void testFirestoreConnection();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Seed initial verified portfolio data when Admin signs in for the first time
  useEffect(() => {
    if (authReady && isAdmin) {
      void seedInitialPortfolioIfEmpty();
    }
  }, [authReady, isAdmin]);

  // Public Firestore subscriptions (gracefully fallback to verified defaults if unseeded)
  useEffect(() => {
    const unsubs = [
      subscribePublicProfile((data) => {
        if (data) setProfile(data);
      }),
      subscribePublicGithubCache((cache) => {
        if (cache) {
          setGithubSnapshot((prev) => {
            if (!prev) return cache;
            const prevTime = Date.parse(prev.lastSyncedAt || '') || 0;
            const cacheTime = Date.parse(cache.lastSyncedAt || '') || 0;
            if (prevTime >= cacheTime) return prev;
            return {
              ...cache,
              ...prev,
              lastSyncedAt: cache.lastSyncedAt,
              repositories: prev.repositories.length ? prev.repositories : cache.repositories,
            };
          });
        }
      }),
      subscribeApprovedCv((cv) => {
        setApprovedCv(cv);
      }),
      subscribeProjects(isAdmin, (items) => {
        if (items.length > 0) {
          const isInitialTwoOnly =
            items.length <= 2 &&
            items.every(
              (item) =>
                item.id === 'berry-e-learning-platform' ||
                item.id === 'buyhive-marketplace'
            );
          if (isInitialTwoOnly) {
            const extraDefaults = DEFAULT_PROJECTS.filter(
              (d) => d.id === 'weego' || d.id === 'talent-bridge'
            );
            setProjects([...items, ...extraDefaults]);
          } else {
            setProjects(items);
          }
        }
      }),
      subscribeSkills(isAdmin, (items) => {
        if (items.length > 0) setSkills(items);
      }),
      subscribeExperiences(isAdmin, (items) => {
        if (items.length > 0) setExperiences(items);
      }),
      subscribeEducation(isAdmin, (items) => {
        if (items.length > 0) setEducation(items);
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isAdmin]);

  // Admin-only Firestore subscriptions
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setApprovals([]);
      setAuditLogs([]);
      setCvVersions([]);
      setMessages([]);
      setAnalytics([]);
      return;
    }
    const unsubs = [
      subscribePendingApprovals(setApprovals),
      subscribeAuditLogs(setAuditLogs),
      subscribeCvVersions(setCvVersions),
      subscribeGithubSettings((s) => {
        if (s) setGithubSettings(s);
      }),
      subscribeContactMessages(setMessages),
      subscribeAnalyticsEvents(setAnalytics),
    ];
    return () => unsubs.forEach((u) => u());
  }, [authReady, isAdmin]);

  const fetchLiveGithubSnapshot = useCallback(async (forceRefresh = false) => {
    setGithubLoading(true);
    setGithubError(null);
    let backendFailureMessage: string | null = null;

    try {
      try {
        const url = forceRefresh
          ? `/api/github/snapshot?refresh=1&_t=${Date.now()}`
          : '/api/github/snapshot';
        const res = await fetch(url, { cache: 'no-store' });
        const parsed = await safeParseJsonResponse<GithubSnapshot & { error?: string }>(res);
        if (parsed.ok && parsed.data && Array.isArray(parsed.data.repositories)) {
          const fresh = parsed.data;
          setGithubSnapshot((existing) => mergeGithubSnapshots(existing, fresh));
          return;
        }
        backendFailureMessage = extractApiError(parsed, 'Unable to fetch GitHub snapshot.');
      } catch (err) {
        backendFailureMessage =
          err instanceof Error ? err.message : 'Unable to reach GitHub snapshot endpoint.';
      }

      // Fallback to GitHub's public CORS-enabled REST API using the visitor's own quota
      try {
        const directSnapshot = await fetchDirectPublicGithubSnapshot(
          profile.githubUsername || 'Lex-Cable'
        );
        setGithubSnapshot((existing) => mergeGithubSnapshots(existing, directSnapshot));
        setGithubError(null);
        return;
      } catch (directErr) {
        const fallbackMsg =
          directErr instanceof Error ? directErr.message : backendFailureMessage;
        setGithubSnapshot((existing) => {
          if (!existing || forceRefresh) {
            setGithubError(
              fallbackMsg ||
                'Unable to load live GitHub activity right now. Please try again shortly.'
            );
          }
          return existing;
        });
      }
    } finally {
      setGithubLoading(false);
    }
  }, [profile.githubUsername]);

  const fetchLiveGitlabSnapshot = useCallback(async (forceRefresh = false) => {
    setGitlabLoading(true);
    setGitlabError(null);
    let backendFailureMessage: string | null = null;

    try {
      try {
        const url = forceRefresh
          ? `/api/gitlab/snapshot?refresh=1&_t=${Date.now()}`
          : '/api/gitlab/snapshot';
        const res = await fetch(url, { cache: 'no-store' });
        const parsed = await safeParseJsonResponse<GitlabSnapshot & { error?: string }>(res);
        if (parsed.ok && parsed.data && parsed.data.username) {
          const fresh = parsed.data;
          setGitlabSnapshot((existing) => mergeGitlabSnapshots(existing, fresh));
          return;
        }
        backendFailureMessage = extractApiError(parsed, 'Unable to fetch GitLab snapshot.');
      } catch (err) {
        backendFailureMessage =
          err instanceof Error ? err.message : 'Unable to reach GitLab snapshot endpoint.';
      }

      // Fallback to GitLab's public CORS-enabled REST API using the visitor's own quota
      try {
        const directSnapshot = await fetchDirectPublicGitlabSnapshot('lex_cab23');
        setGitlabSnapshot((existing) => mergeGitlabSnapshots(existing, directSnapshot));
        setGitlabError(null);
        return;
      } catch (directErr) {
        const fallbackMsg =
          directErr instanceof Error ? directErr.message : backendFailureMessage;
        setGitlabSnapshot((existing) => {
          if (forceRefresh) {
            setGitlabError(
              fallbackMsg ||
                'GitLab public API rate limit reached temporarily; showing cached workspace data.'
            );
          }
          return existing || createBaselineGitlabSnapshot();
        });
      }
    } finally {
      setGitlabLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLiveGithubSnapshot();
    void fetchLiveGitlabSnapshot();
  }, [fetchLiveGithubSnapshot, fetchLiveGitlabSnapshot]);

  // Keep GitHub & GitLab sync dates automatically fresh when revisiting their pages
  useEffect(() => {
    const staleThresholdMs = 5 * 60 * 1000;
    if (currentPath === '/github' && githubSnapshot && !githubLoading && !githubError) {
      const lastMs = Date.parse(githubSnapshot.lastSyncedAt || '') || 0;
      if (lastMs > 0 && Date.now() - lastMs > staleThresholdMs) {
        void fetchLiveGithubSnapshot();
      }
    } else if (currentPath === '/gitlab' && gitlabSnapshot && !gitlabLoading && !gitlabError) {
      const lastMs = Date.parse(gitlabSnapshot.lastSyncedAt || '') || 0;
      if (lastMs > 0 && Date.now() - lastMs > staleThresholdMs) {
        void fetchLiveGitlabSnapshot();
      }
    }
  }, [
    currentPath,
    githubLoading,
    gitlabLoading,
    githubError,
    gitlabError,
    githubSnapshot,
    gitlabSnapshot,
    fetchLiveGithubSnapshot,
    fetchLiveGitlabSnapshot,
  ]);

  useEffect(() => {
    return () => {
      if (cvPreviewUrl) {
        URL.revokeObjectURL(cvPreviewUrl);
      }
    };
  }, [cvPreviewUrl]);

  const buildActiveCvBlob = useCallback((): Blob => {
    if (approvedCv?.dataBase64) {
      const validBytes = decodeValidPdfBase64(approvedCv.dataBase64);
      if (validBytes) {
        return new Blob([validBytes], { type: 'application/pdf' });
      }
    }
    return generatePortfolioCvPdfBlob({
      profile,
      projects,
      skills,
      experiences,
      education,
      githubSnapshot,
      gitlabSnapshot,
    });
  }, [approvedCv, profile, projects, skills, experiences, education, githubSnapshot, gitlabSnapshot]);

  const handleDownloadCv = useCallback(async () => {
    void trackAnalyticsEvent('cv_download', approvedCv?.versionId || 'automated-portfolio-cv');

    try {
      const blob = buildActiveCvBlob();
      triggerBlobDownload(blob, approvedCv?.fileName || DEFAULT_CV_FILENAME);
    } catch {
      try {
        const blob = await fetchVerifiedCvPdfBlob(DEFAULT_CV_PDF_PATH);
        triggerBlobDownload(blob, DEFAULT_CV_FILENAME);
      } catch {
        // Unable to generate or fetch fallback PDF
      }
    }
  }, [approvedCv, buildActiveCvBlob]);

  const handlePreviewCv = useCallback(async () => {
    void trackAnalyticsEvent('page_view', `cv_preview:${approvedCv?.versionId || 'automated-portfolio-cv'}`);
    try {
      const blob = buildActiveCvBlob();
      setCvPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      try {
        const blob = await fetchVerifiedCvPdfBlob(DEFAULT_CV_PDF_PATH);
        setCvPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } catch {
        // Unable to open preview
      }
    }
  }, [approvedCv?.versionId, buildActiveCvBlob]);

  const closeCvPreview = useCallback(() => {
    setCvPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const renderRoute = () => {
    if (currentPath === '/about') {
      return (
        <AboutSection
          profile={profile}
          education={education}
          onNavigate={navigate}
          onDownloadCv={handleDownloadCv}
          onPreviewCv={handlePreviewCv}
        />
      );
    }
    if (currentPath === '/skills') {
      return <SkillsSection skills={skills} />;
    }
    if (currentPath === '/projects') {
      return <ProjectsSection projects={projects} onNavigate={navigate} />;
    }
    if (currentPath.startsWith('/projects/')) {
      const slug = currentPath.replace('/projects/', '');
      return <ProjectsSection projects={projects} selectedSlug={slug} onNavigate={navigate} />;
    }
    if (currentPath === '/github') {
      return (
        <GithubActivitySection
          snapshot={githubSnapshot}
          loading={githubLoading}
          error={githubError}
          onRefreshPublic={() => void fetchLiveGithubSnapshot(true)}
        />
      );
    }
    if (currentPath === '/gitlab') {
      return (
        <GitlabActivitySection
          snapshot={gitlabSnapshot}
          projects={projects}
          experiences={experiences}
          loading={gitlabLoading}
          error={gitlabError}
          onRefreshPublic={() => void fetchLiveGitlabSnapshot(true)}
        />
      );
    }
    if (currentPath === '/business-management') {
      return (
        <BusinessManagementSection
          profile={profile}
          experiences={experiences}
          education={education}
          onDownloadCv={handleDownloadCv}
          onPreviewCv={handlePreviewCv}
        />
      );
    }
    if (currentPath === '/experience') {
      return (
        <ExperienceSection
          experiences={experiences}
          education={education}
          onDownloadCv={handleDownloadCv}
          onPreviewCv={handlePreviewCv}
        />
      );
    }
    if (currentPath === '/contact') {
      return <ContactSection profile={profile} />;
    }
    if (currentPath === '/admin') {
      return (
        <AdminDashboard
          user={user}
          authReady={authReady}
          isAdmin={isAdmin}
          profile={profile}
          projects={projects}
          skills={skills}
          experiences={experiences}
          education={education}
          githubSnapshot={githubSnapshot}
          gitlabSnapshot={gitlabSnapshot}
          githubSettings={githubSettings}
          approvals={approvals}
          auditLogs={auditLogs}
          cvVersions={cvVersions}
          messages={messages}
          analytics={analytics}
          onGithubSnapshotUpdate={setGithubSnapshot}
          onGitlabSnapshotUpdate={setGitlabSnapshot}
        />
      );
    }
    return (
      <HomeSection
        profile={profile}
        projects={projects}
        skills={skills}
        experiences={experiences}
        education={education}
        githubSnapshot={githubSnapshot}
        gitlabSnapshot={gitlabSnapshot}
        onNavigate={navigate}
        onDownloadCv={handleDownloadCv}
      />
    );
  };

  return (
    <Layout
      currentPath={currentPath}
      onNavigate={navigate}
      profile={profile}
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((d) => !d)}
      isAdmin={isAdmin}
      pendingCount={pendingCount}
    >
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center text-sm text-[#8b8178]">
            Loading page...
          </div>
        }
      >
        {renderRoute()}
      </Suspense>

      {cvPreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Automated Portfolio CV PDF Preview"
        >
          <div className="w-full max-w-4xl h-[88vh] flex flex-col rounded-2xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] shadow-2xl overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#141311]">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-4 h-4 text-[#b98b6e] shrink-0" />
                <span className="text-sm font-bold text-[#161616] dark:text-[#fffdf9] truncate">
                  {approvedCv?.fileName || DEFAULT_CV_FILENAME}
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleDownloadCv()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={closeCvPreview}
                  aria-label="Close CV preview"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-[#161616] dark:text-[#fffdf9] hover:bg-[#efe9e0] dark:hover:bg-[#24211e] whitespace-nowrap shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close</span>
                </button>
              </div>
            </div>
            <iframe
              title="Portfolio CV PDF Preview"
              src={cvPreviewUrl}
              className="flex-1 w-full bg-[#f4f0e9] dark:bg-[#111110]"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

import React, { useEffect, useState } from 'react';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  Bot,
  CheckSquare,
  FileText,
  FolderGit2,
  GitBranch,
  Inbox,
  Layers,
  Lock,
  LogOut,
  RefreshCw,
  Server,
  UserCheck,
} from 'lucide-react';
import { ADMIN_EMAIL, auth, googleProvider } from '../lib/firebase';
import type {
  AnalyticsEvent,
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
} from '../types/portfolio';
import {
  createPendingApproval,
  saveGithubCacheToFirestore,
  saveGithubSettings,
} from '../services/portfolioDb';
import { extractApiError, safeParseJsonResponse } from '../utils/safeFetchJson';
import {
  ApprovalsPanel,
  CvManagerPanel,
  InboxAnalyticsAuditPanel,
  ProfileAndExperiencePanel,
  ProjectsManagerPanel,
  SkillsManagerPanel,
} from './AdminSubPanels';

interface AdminDashboardProps {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  profile: PortfolioProfile;
  projects: Project[];
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  githubSnapshot: GithubSnapshot | null;
  gitlabSnapshot: GitlabSnapshot | null;
  githubSettings: GithubSettings;
  approvals: PendingApproval[];
  auditLogs: AuditLog[];
  cvVersions: CvVersion[];
  messages: ContactMessage[];
  analytics: AnalyticsEvent[];
  onGithubSnapshotUpdate: (snapshot: GithubSnapshot) => void;
  onGitlabSnapshotUpdate: (snapshot: GitlabSnapshot) => void;
}

type AdminTab =
  | 'approvals'
  | 'github'
  | 'ai'
  | 'projects'
  | 'skills'
  | 'profile'
  | 'cv'
  | 'inbox'
  | 'setup';

export function AdminDashboard({
  user,
  authReady,
  isAdmin,
  profile,
  projects,
  skills,
  experiences,
  education,
  githubSnapshot,
  gitlabSnapshot,
  githubSettings,
  approvals,
  auditLogs,
  cvVersions,
  messages,
  analytics,
  onGithubSnapshotUpdate,
  onGitlabSnapshotUpdate,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('approvals');
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<GithubSettings>(githubSettings);
  const [automationStatus, setAutomationStatus] = useState<{
    enabled?: boolean;
    frequencyMinutes?: number;
    lastRunAt?: string | null;
    lastStatus?: string;
    lastMessage?: string;
    githubTokenConfigured?: boolean;
    geminiConfigured?: boolean;
    smtpConfigured?: boolean;
    cronSecretConfigured?: boolean;
    recentLogs?: Array<{ timestamp: string; status: string; message: string }>;
  } | null>(null);

  const [aiBusy, setAiBusy] = useState(false);
  const [selectedRepoForAi, setSelectedRepoForAi] = useState('Berry-E-Learning-Platform-Development');
  const [aiReport, setAiReport] = useState<{ summary?: string; recommendations?: string[] } | null>(null);

  useEffect(() => {
    setSettingsForm(githubSettings);
  }, [githubSettings]);

  const fetchAutomationStatus = async () => {
    if (!user || !isAdmin) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/automation/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await safeParseJsonResponse<{
        enabled?: boolean;
        frequencyMinutes?: number;
        lastRunAt?: string | null;
        lastStatus?: string;
        lastMessage?: string;
        githubTokenConfigured?: boolean;
        geminiConfigured?: boolean;
        smtpConfigured?: boolean;
        cronSecretConfigured?: boolean;
        recentLogs?: Array<{ timestamp: string; status: string; message: string }>;
      }>(res);
      if (res.ok && parsed.data) {
        setAutomationStatus(parsed.data);
      }
    } catch {
      // ignore non-critical status check
    }
  };

  useEffect(() => {
    if (isAdmin && user) {
      void fetchAutomationStatus();
    }
  }, [isAdmin, user]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
    }
  };

  const handleSyncGithubNow = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          existingProjects: projects,
          detectNewRepos: settingsForm.detectNewRepos,
          detectReadmeChanges: settingsForm.detectReadmeChanges,
          generateAiSuggestions: settingsForm.generateAiSuggestions,
        }),
      });
      const parsed = await safeParseJsonResponse<{
        error?: string;
        snapshot?: GithubSnapshot;
        gitlabSnapshot?: GitlabSnapshot | null;
        proposals?: Array<{
          category: 'new_repo' | 'repo_update';
          targetType: 'project';
          targetId: string;
          title: string;
          explanation: string;
          previousContentJson: string;
          proposedContentJson: string;
          source: 'github_sync' | 'gemini_ai';
        }>;
      }>(res);
      const data = parsed.data;
      if (!res.ok || !data?.snapshot) {
        throw new Error(extractApiError(parsed, 'GitHub & GitLab synchronization failed.'));
      }

      onGithubSnapshotUpdate(data.snapshot);
      if (data.gitlabSnapshot) {
        onGitlabSnapshotUpdate(data.gitlabSnapshot);
      }
      await saveGithubCacheToFirestore(data.snapshot);

      const pendingTitles = new Set(
        approvals.filter((a) => a.status === 'pending').map((a) => a.title)
      );
      let queuedCount = 0;
      for (const prop of data.proposals || []) {
        if (!pendingTitles.has(prop.title)) {
          await createPendingApproval(prop);
          queuedCount++;
        }
      }

      const gitlabNote = data.gitlabSnapshot
        ? ` + GitLab (@${data.gitlabSnapshot.username})`
        : '';
      const updatedSettings: GithubSettings = {
        ...settingsForm,
        lastSyncAt: data.snapshot.lastSyncedAt,
        lastSyncStatus: 'Success',
        lastSyncSummary: `Synced ${data.snapshot.repositories.length} GitHub repos${gitlabNote}; ${queuedCount} new approval item(s) queued.`,
      };
      setSettingsForm(updatedSettings);
      await saveGithubSettings(updatedSettings);
      setSyncMessage(updatedSettings.lastSyncSummary || 'Sync completed.');
      await fetchAutomationStatus();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'GitHub & GitLab sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await saveGithubSettings(settingsForm);
    const token = await user.getIdToken();
    await fetch('/api/automation/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        enabled: settingsForm.autoMetadataRefresh,
        frequencyMinutes: settingsForm.syncFrequencyMinutes,
      }),
    });
    setSyncMessage('Automation settings saved.');
    await fetchAutomationStatus();
  };

  const handleAnalyzeRepoWithAi = async () => {
    if (!user) return;
    setAiBusy(true);
    setAiReport(null);
    try {
      const token = await user.getIdToken();
      const repoMeta = githubSnapshot?.repositories.find((r) => r.name === selectedRepoForAi);
      const res = await fetch('/api/ai/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repoName: selectedRepoForAi,
          githubUrl: repoMeta?.htmlUrl,
          description: repoMeta?.description,
        }),
      });
      const parsed = await safeParseJsonResponse<{
        error?: string;
        analysis?: Record<string, unknown>;
      }>(res);
      const data = parsed.data;
      if (!res.ok || !data?.analysis) {
        throw new Error(extractApiError(parsed, 'Gemini AI analysis failed.'));
      }

      const matchedProject = projects.find(
        (p) => p.sourceRepoName?.toLowerCase() === selectedRepoForAi.toLowerCase()
      );

      await createPendingApproval({
        category: matchedProject ? 'repo_update' : 'new_repo',
        targetType: 'project',
        targetId: matchedProject?.id || selectedRepoForAi.toLowerCase(),
        title: `AI Draft for ${selectedRepoForAi}`,
        explanation:
          'Generated grounded project summary and verified stack from the repository README and manifest files using Gemini AI.',
        previousContentJson: matchedProject
          ? JSON.stringify(
              {
                shortDescription: matchedProject.shortDescription,
                technologies: matchedProject.technologies,
              },
              null,
              2
            )
          : '{}',
        proposedContentJson: JSON.stringify(
          {
            ...(matchedProject || {}),
            ...data.analysis,
            sourceRepoName: selectedRepoForAi,
            githubUrl:
              repoMeta?.htmlUrl || `https://github.com/Lex-Cable/${selectedRepoForAi}`,
          },
          null,
          2
        ),
        source: 'gemini_ai',
      });

      setAiReport({
        summary: `Drafted grounded summary for "${selectedRepoForAi}" and sent it to your Pending Approvals queue.`,
      });
    } catch (err) {
      setAiReport({
        summary: err instanceof Error ? err.message : 'Unable to analyze repository.',
      });
    } finally {
      setAiBusy(false);
    }
  };

  const handleRunAdvisory = async (
    task: 'bio_polish' | 'seo_metadata' | 'cv_improvements' | 'missing_info_audit'
  ) => {
    if (!user) return;
    setAiBusy(true);
    setAiReport(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/ai/advisory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task,
          profileJson: JSON.stringify(profile),
          projectsJson: JSON.stringify(projects),
          skillsJson: JSON.stringify(skills),
          experiencesJson: JSON.stringify(experiences),
        }),
      });
      const parsed = await safeParseJsonResponse<{
        error?: string;
        advisory?: {
          summary?: string;
          proposedPatch?: Record<string, string>;
          recommendations?: string[];
        };
      }>(res);
      const data = parsed.data;
      if (!res.ok || !data?.advisory) {
        throw new Error(extractApiError(parsed, 'Advisory request failed.'));
      }

      if ((task === 'bio_polish' || task === 'seo_metadata') && data.advisory.proposedPatch) {
        await createPendingApproval({
          category: task === 'seo_metadata' ? 'seo_update' : 'bio_update',
          targetType: task === 'seo_metadata' ? 'seo' : 'profile',
          targetId: 'public',
          title:
            task === 'seo_metadata'
              ? 'AI SEO Title & Meta Description Draft'
              : 'AI Professional Bio Refinement Draft',
          explanation: data.advisory.summary || 'Grounded Gemini AI content suggestion.',
          previousContentJson: JSON.stringify(
            {
              headline: profile.headline,
              shortBio: profile.shortBio,
              seoTitle: profile.seoTitle,
              seoDescription: profile.seoDescription,
            },
            null,
            2
          ),
          proposedContentJson: JSON.stringify(data.advisory.proposedPatch, null, 2),
          source: 'gemini_ai',
        });
      }

      setAiReport({
        summary: data.advisory.summary,
        recommendations: data.advisory.recommendations,
      });
    } catch (err) {
      setAiReport({
        summary: err instanceof Error ? err.message : 'Unable to generate advisory.',
      });
    } finally {
      setAiBusy(false);
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center text-sm text-[#68635d] dark:text-[#b9aea2]">
        Verifying session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-5 py-20">
        <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-8 space-y-5 text-center">
          <div className="w-12 h-12 rounded-full border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-[#b98b6e]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9]">
              Private Portfolio Admin Console
            </h1>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2] leading-relaxed">
              Sign in with the authorized administrator Google account ({ADMIN_EMAIL}) to manage approvals, GitHub automation, projects, and CV versions.
            </p>
          </div>
          {authError && (
            <p className="text-xs text-red-600 dark:text-red-400">{authError}</p>
          )}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full px-5 py-2.5 text-sm font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-5 py-20">
        <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-8 space-y-4 text-center">
          <h1 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
            Access Restricted
          </h1>
          <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
            Signed in as <span className="font-mono-tabular">{user.email}</span>. Only{' '}
            <span className="font-mono-tabular">{ADMIN_EMAIL}</span> is authorized to access this dashboard.
          </p>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="px-5 py-2 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-[#161616] dark:text-[#fffdf9] hover:bg-[#f4f0e9] dark:hover:bg-[#24211e]"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'approvals',
      label: `Approvals${pendingCount > 0 ? ` (${pendingCount})` : ''}`,
      icon: <CheckSquare className="w-4 h-4" />,
    },
    { id: 'github', label: 'GitHub Sync', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Assistant', icon: <Bot className="w-4 h-4" /> },
    { id: 'projects', label: 'Projects', icon: <FolderGit2 className="w-4 h-4" /> },
    { id: 'skills', label: 'Skills', icon: <Layers className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile & Bio', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'cv', label: 'CV Manager', icon: <FileText className="w-4 h-4" /> },
    { id: 'inbox', label: 'Inbox & Analytics', icon: <Inbox className="w-4 h-4" /> },
    { id: 'setup', label: 'Deployment Guide', icon: <Server className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-12 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#b98b6e]">
            Admin Console · {tabs.find((t) => t.id === activeTab)?.label}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] mt-1">
            Portfolio & Automation Control Center
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSyncGithubNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing…' : 'Sync GitHub & GitLab'}</span>
          </button>
          <button
            type="button"
            onClick={() => void signOut(auth)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-[#161616] dark:text-[#fffdf9] hover:bg-[#f4f0e9] dark:hover:bg-[#191816] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {syncMessage && (
        <div className="p-4 rounded-2xl bg-[#f7f3ed] dark:bg-[#191816] border border-[#b98b6e]/50 text-xs text-[#161616] dark:text-[#f7f3ed]">
          {syncMessage}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3 bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-2.5 flex lg:flex-col gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616]'
                  : 'text-[#68635d] dark:text-[#b9aea2] hover:bg-[#eee8df] dark:hover:bg-[#24211e] hover:text-[#161616] dark:hover:text-[#fffdf9]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        {/* Active Workspace Panel */}
        <div className="lg:col-span-9 min-w-0">
          {activeTab === 'approvals' && <ApprovalsPanel approvals={approvals} />}

          {activeTab === 'github' && (
            <div className="space-y-8">
              <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
                      GitHub & GitLab Automation Settings
                    </h2>
                    <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                      Last GitHub Sync:{' '}
                      {settingsForm.lastSyncAt || githubSnapshot?.lastSyncedAt
                        ? new Date(
                            settingsForm.lastSyncAt || githubSnapshot?.lastSyncedAt || ''
                          ).toLocaleString()
                        : 'Not synced yet'}{' '}
                      · Last GitLab Sync:{' '}
                      {gitlabSnapshot?.lastSyncedAt
                        ? new Date(gitlabSnapshot.lastSyncedAt).toLocaleString()
                        : 'Pending'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-[#161616] dark:text-[#f7f3ed]">
                        Synchronization Frequency
                      </label>
                      <select
                        value={settingsForm.syncFrequencyMinutes}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            syncFrequencyMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110] text-[#161616] dark:text-[#f7f3ed]"
                      >
                        <option value={15}>Every 15 minutes</option>
                        <option value={60}>Hourly (60 minutes)</option>
                        <option value={360}>Every 6 hours</option>
                        <option value={1440}>Daily (24 hours)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-2 text-[#161616] dark:text-[#f7f3ed]">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsForm.autoMetadataRefresh}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, autoMetadataRefresh: e.target.checked })
                        }
                        className="accent-[#b98b6e]"
                      />
                      <span>Enable scheduled background metadata refresh</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsForm.detectNewRepos}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, detectNewRepos: e.target.checked })
                        }
                        className="accent-[#b98b6e]"
                      />
                      <span>Detect new public repositories</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsForm.detectReadmeChanges}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, detectReadmeChanges: e.target.checked })
                        }
                        className="accent-[#b98b6e]"
                      />
                      <span>Detect README & description updates</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsForm.generateAiSuggestions}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, generateAiSuggestions: e.target.checked })
                        }
                        className="accent-[#b98b6e]"
                      />
                      <span>Draft summaries using Gemini AI on detection</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settingsForm.requireApprovalBeforePublish}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            requireApprovalBeforePublish: e.target.checked,
                          })
                        }
                        className="accent-[#b98b6e]"
                      />
                      <span>Require explicit approval before publishing</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] font-semibold hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors"
                  >
                    Save Automation Settings
                  </button>
                </form>
              </div>

              {automationStatus && (
                <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4 text-xs">
                  <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                    Server Scheduler & Integration Readiness
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[#68635d] dark:text-[#b9aea2]">GitHub Token</p>
                      <p className="font-semibold text-[#161616] dark:text-[#fffdf9] mt-0.5">
                        {automationStatus.githubTokenConfigured ? 'Configured (GraphQL ready)' : 'Public REST mode'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#68635d] dark:text-[#b9aea2]">Gemini API</p>
                      <p className="font-semibold text-[#161616] dark:text-[#fffdf9] mt-0.5">
                        {automationStatus.geminiConfigured ? 'Configured' : 'Missing GEMINI_API_KEY'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#68635d] dark:text-[#b9aea2]">SMTP Email</p>
                      <p className="font-semibold text-[#161616] dark:text-[#fffdf9] mt-0.5">
                        {automationStatus.smtpConfigured ? 'Configured' : 'Firestore Inbox only'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#68635d] dark:text-[#b9aea2]">External Cron</p>
                      <p className="font-semibold text-[#161616] dark:text-[#fffdf9] mt-0.5">
                        {automationStatus.cronSecretConfigured ? 'CRON_SECRET set' : 'Set CRON_SECRET'}
                      </p>
                    </div>
                  </div>
                  {automationStatus.recentLogs && automationStatus.recentLogs.length > 0 && (
                    <div className="pt-3 border-t border-[#ddd4c9] dark:border-[#2c2925] space-y-1.5">
                      <p className="font-semibold text-[#161616] dark:text-[#f7f3ed]">
                        Recent Scheduler Runs
                      </p>
                      {automationStatus.recentLogs.slice(0, 6).map((l, i) => (
                        <p key={i} className="font-mono-tabular text-[11px] text-[#68635d] dark:text-[#b9aea2]">
                          [{new Date(l.timestamp).toLocaleTimeString()}] {l.status}: {l.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
                  Gemini AI Portfolio Assistant
                </h2>
                <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                  All AI-generated project summaries, bio revisions, and SEO drafts enter your Pending Approvals queue first and never auto-publish.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <select
                    value={selectedRepoForAi}
                    onChange={(e) => setSelectedRepoForAi(e.target.value)}
                    className="px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110] text-[#161616] dark:text-[#f7f3ed]"
                  >
                    {(githubSnapshot?.repositories || []).map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                    {(!githubSnapshot || githubSnapshot.repositories.length === 0) && (
                      <>
                        <option value="Berry-E-Learning-Platform-Development">
                          Berry-E-Learning-Platform-Development
                        </option>
                        <option value="BuyHive">BuyHive</option>
                      </>
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={handleAnalyzeRepoWithAi}
                    className="px-5 py-2.5 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] disabled:opacity-50 transition-colors"
                  >
                    {aiBusy ? 'Analyzing…' : 'Analyze Repo & Queue Draft'}
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-[#ddd4c9] dark:border-[#2c2925]">
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => void handleRunAdvisory('bio_polish')}
                    className="p-4 text-left rounded-2xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed]/60 dark:bg-[#111110]/60 hover:border-[#b98b6e] transition-colors"
                  >
                    <p className="text-xs font-bold text-[#161616] dark:text-[#fffdf9]">
                      Draft Bio & Headline Improvements
                    </p>
                    <p className="text-[11px] text-[#68635d] dark:text-[#b9aea2] mt-1">
                      Queues refined bio copy for your approval.
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => void handleRunAdvisory('seo_metadata')}
                    className="p-4 text-left rounded-2xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed]/60 dark:bg-[#111110]/60 hover:border-[#b98b6e] transition-colors"
                  >
                    <p className="text-xs font-bold text-[#161616] dark:text-[#fffdf9]">
                      Draft SEO Title & Description
                    </p>
                    <p className="text-[11px] text-[#68635d] dark:text-[#b9aea2] mt-1">
                      Queues recruiter-focused SEO metadata.
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => void handleRunAdvisory('cv_improvements')}
                    className="p-4 text-left rounded-2xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed]/60 dark:bg-[#111110]/60 hover:border-[#b98b6e] transition-colors"
                  >
                    <p className="text-xs font-bold text-[#161616] dark:text-[#fffdf9]">
                      Suggest CV Improvements
                    </p>
                    <p className="text-[11px] text-[#68635d] dark:text-[#b9aea2] mt-1">
                      Grounded feedback based on verified projects & skills.
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => void handleRunAdvisory('missing_info_audit')}
                    className="p-4 text-left rounded-2xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed]/60 dark:bg-[#111110]/60 hover:border-[#b98b6e] transition-colors"
                  >
                    <p className="text-xs font-bold text-[#161616] dark:text-[#fffdf9]">
                      Audit Missing Portfolio Information
                    </p>
                    <p className="text-[11px] text-[#68635d] dark:text-[#b9aea2] mt-1">
                      Highlights unverified records or gaps to resolve.
                    </p>
                  </button>
                </div>
              </div>

              {aiReport && (
                <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-3 text-xs">
                  <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                    AI Output
                  </h3>
                  {aiReport.summary && (
                    <p className="text-[#161616] dark:text-[#f7f3ed] leading-relaxed">
                      {aiReport.summary}
                    </p>
                  )}
                  {aiReport.recommendations && aiReport.recommendations.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-[#68635d] dark:text-[#b9aea2]">
                      {aiReport.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'projects' && <ProjectsManagerPanel projects={projects} />}

          {activeTab === 'skills' && <SkillsManagerPanel skills={skills} />}

          {activeTab === 'profile' && (
            <ProfileAndExperiencePanel profile={profile} experiences={experiences} />
          )}

          {activeTab === 'cv' && (
            <CvManagerPanel
              cvVersions={cvVersions}
              profile={profile}
              projects={projects}
              skills={skills}
              experiences={experiences}
              education={education}
              githubSnapshot={githubSnapshot}
              gitlabSnapshot={gitlabSnapshot}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxAnalyticsAuditPanel
              messages={messages}
              analytics={analytics}
              auditLogs={auditLogs}
            />
          )}

          {activeTab === 'setup' && (
            <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4 text-xs leading-relaxed text-[#68635d] dark:text-[#b9aea2]">
              <h2 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
                Deployment & Scheduled Automation Setup
              </h2>
              <p>
                1. <strong className="text-[#161616] dark:text-[#fffdf9]">GitHub GraphQL & Higher Rate Limits</strong>: Add <code className="font-mono-tabular text-[#b98b6e]">GITHUB_TOKEN</code> (read-only public repo + read:user scope) in your hosting environment secrets to unlock GitHub GraphQL contribution statistics and 5,000 req/hr rate limits.
              </p>
              <p>
                2. <strong className="text-[#161616] dark:text-[#fffdf9]">Contact Form Email Forwarding</strong>: Configure <code className="font-mono-tabular text-[#b98b6e]">SMTP_HOST</code>, <code className="font-mono-tabular text-[#b98b6e]">SMTP_PORT</code>, <code className="font-mono-tabular text-[#b98b6e]">SMTP_USER</code>, and <code className="font-mono-tabular text-[#b98b6e]">SMTP_PASS</code> so contact submissions email <code className="font-mono-tabular text-[#b98b6e]">{ADMIN_EMAIL}</code> and auto-acknowledge senders in addition to saving in Firestore.
              </p>
              <p>
                3. <strong className="text-[#161616] dark:text-[#fffdf9]">External Scheduled Sync (Cloud Scheduler / GitHub Actions)</strong>: Set <code className="font-mono-tabular text-[#b98b6e]">CRON_SECRET</code> in server secrets and trigger <code className="font-mono-tabular text-[#b98b6e]">POST /api/cron/github-sync</code> with header <code className="font-mono-tabular text-[#b98b6e]">x-cron-secret</code> on your preferred schedule. Note that serverless hosts (like Vercel) scale to zero between requests, so an external cron trigger (GitHub Actions schedule or Google Cloud Scheduler) guarantees reliable periodic syncs.
              </p>
              <p>
                4. <strong className="text-[#161616] dark:text-[#fffdf9]">Production Deployment</strong>: Build with <code className="font-mono-tabular text-[#b98b6e]">npm run build</code> and start the full-stack server with <code className="font-mono-tabular text-[#b98b6e]">npm start</code>. Ensure <code className="font-mono-tabular text-[#b98b6e]">GEMINI_API_KEY</code> and <code className="font-mono-tabular text-[#b98b6e]">APP_URL</code> are configured as server-side secrets.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

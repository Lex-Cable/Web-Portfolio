export type SkillCategory =
  | 'Frontend Development'
  | 'Backend Development'
  | 'Databases'
  | 'Development Tools and DevOps'
  | 'Other Technologies'
  | 'Additional Learning Interests';

export type SkillProficiency =
  | 'Proficient'
  | 'Comfortable'
  | 'Familiar'
  | 'Currently Learning';

export type ProjectStatus =
  | 'In Development'
  | 'Active Prototype'
  | 'Completed'
  | 'Archived';

export type ApprovalCategory =
  | 'new_repo'
  | 'repo_update'
  | 'bio_update'
  | 'skill_update'
  | 'experience_update'
  | 'cv_update'
  | 'seo_update'
  | 'ai_suggestion';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'edited_approved';

export interface PortfolioProfile {
  name: string;
  title: string;
  location: string;
  githubUsername: string;
  githubUrl: string;
  email: string;
  linkedinUrl: string;
  devtoUrl: string;
  mastodonHandle: string;
  blueskyHandle: string;
  headline: string;
  shortBio: string;
  fullBio: string;
  approach: string;
  careerGoals: string;
  photoUrl: string;
  seoTitle: string;
  seoDescription: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  problemStatement: string;
  contributionRole: string;
  fullDescription: string;
  technologies: string[];
  features: string[];
  verificationNote?: string;
  imageUrl?: string;
  githubUrl: string;
  liveDemoUrl?: string;
  status: ProjectStatus;
  featured: boolean;
  isPublic: boolean;
  sourceRepoName?: string;
  repoUpdatedAt?: string;
  displayOrder: number;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: SkillProficiency;
  note?: string;
  isPublic: boolean;
  displayOrder: number;
}

export interface Experience {
  id: string;
  organization: string;
  location?: string;
  role: string;
  period: string;
  entryType: 'Work Experience' | 'Internship' | 'Draft Record';
  summary: string;
  highlights: string[];
  ambiguityFlag: boolean;
  ambiguityNote?: string;
  isPublic: boolean;
  displayOrder: number;
}

export interface Education {
  id: string;
  institution: string;
  qualification: string;
  expectedGraduation: string;
  statusLabel: string;
  location: string;
  coursework: string[];
  notes?: string;
  isPublic: boolean;
  displayOrder: number;
}

export interface GithubRepoSummary {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  homepage: string | null;
  readmeExcerpt?: string;
  readmeHash?: string;
  detectedStack?: string[];
}

export interface GithubEventSummary {
  id: string;
  type: string;
  repoName: string;
  createdAt: string;
  summary: string;
}

export interface GithubLanguageStat {
  language: string;
  bytes: number;
  percentage: number;
}

export interface GithubContributionDay {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  count: number;
  tooltip: string;
}

export interface GithubContributionCalendar {
  totalContributions: number;
  periodLabel: string;
  activeDaysCount: number;
  currentStreak: number;
  longestStreak: number;
  weeks: GithubContributionDay[][];
}

export interface GithubAchievement {
  name: string;
  slug: string;
  imageUrl: string;
  url: string;
}

export interface GithubPinnedRepo {
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
}

export interface GithubStarredRepo {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  forkedFrom?: string | null;
  updatedLabel?: string | null;
}

export interface GithubProfileReadme {
  rawMarkdown: string;
  headline: string;
  subtitle: string;
  intro: string;
  techStack: Array<{ category: string; items: string[] }>;
  highlights: Array<{ label: string; text: string }>;
  funFact: string;
  pronouns: string;
  reachMe: Array<{ label: string; value: string; url?: string }>;
}

export interface GithubSnapshot {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  profileUrl: string;
  publicReposCount: number;
  followers: number;
  following?: number;
  statusMessage?: string;
  location?: string;
  company?: string;
  pronouns?: string;
  socialLinks?: Array<{ label: string; value: string; url: string }>;
  achievements?: GithubAchievement[];
  pinnedRepos?: GithubPinnedRepo[];
  starredRepos?: GithubStarredRepo[];
  starredReposCount?: number;
  profileReadme?: GithubProfileReadme;
  contributionCalendar?: GithubContributionCalendar;
  totalStars: number;
  totalForks: number;
  contributionsSummary: string;
  contributionsDataAvailable: boolean;
  topLanguages: GithubLanguageStat[];
  repositories: GithubRepoSummary[];
  recentEvents: GithubEventSummary[];
  statsSourceNote: string;
  lastSyncedAt: string;
  rateLimitRemaining?: number;
}

export interface GitlabProjectSummary {
  id: number;
  name: string;
  nameWithNamespace: string;
  pathWithNamespace: string;
  webUrl: string;
  description: string | null;
  visibility: 'public' | 'internal' | 'private';
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssuesCount: number;
  topics: string[];
  primaryLanguage: string | null;
  languages: Record<string, number>;
  lastActivityAt: string;
  createdAt: string;
  isMemberProject: boolean;
}

export interface GitlabStarredProject {
  id: number;
  name: string;
  nameWithNamespace: string;
  pathWithNamespace: string;
  webUrl: string;
  description: string | null;
  stars: number;
  forks: number;
  primaryLanguage: string | null;
  lastActivityAt: string;
}

export interface GitlabEventSummary {
  id: string;
  actionName: string;
  targetType: string | null;
  targetTitle: string | null;
  projectId: number | null;
  projectName: string;
  createdAt: string;
  summary: string;
}

export interface GitlabSnapshot {
  username: string;
  userId: number;
  name: string;
  avatarUrl: string;
  bio: string;
  profileUrl: string;
  memberProjectsUrl: string;
  memberSince: string;
  location?: string;
  organization?: string;
  pronouns?: string;
  state: string;
  lastActivityAtomAt?: string;
  authenticatedTokenActive: boolean;
  publicProjectsCount: number;
  memberProjectsCount: number;
  starredProjectsCount: number;
  totalStars: number;
  totalForks: number;
  contributionCalendar?: GithubContributionCalendar;
  topLanguages: GithubLanguageStat[];
  memberProjects: GitlabProjectSummary[];
  personalProjects: GitlabProjectSummary[];
  contributedProjects: GitlabProjectSummary[];
  starredProjects: GitlabStarredProject[];
  recentEvents: GitlabEventSummary[];
  statsSourceNote: string;
  visibilityNote: string;
  lastSyncedAt: string;
}

export interface PendingApproval {
  id: string;
  category: ApprovalCategory;
  targetType: 'project' | 'profile' | 'skill' | 'experience' | 'cv' | 'seo';
  targetId: string;
  title: string;
  explanation: string;
  previousContentJson: string;
  proposedContentJson: string;
  source: 'github_sync' | 'gemini_ai' | 'manual_draft';
  status: ApprovalStatus;
  reviewerNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  actorEmail: string;
  detailsJson?: string;
  createdAt?: string;
}

export interface CvVersion {
  id: string;
  versionLabel: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataBase64: string;
  notes?: string;
  isPublicApproved: boolean;
  uploadedByEmail: string;
  createdAt?: string;
}

export interface ApprovedCv {
  versionId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataBase64: string;
  summaryNote?: string;
}

export interface GithubSettings {
  syncFrequencyMinutes: number;
  autoMetadataRefresh: boolean;
  detectNewRepos: boolean;
  detectReadmeChanges: boolean;
  generateAiSuggestions: boolean;
  emailNotifications: boolean;
  requireApprovalBeforePublish: boolean;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncSummary?: string;
}

export interface ContactMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  emailDelivered: boolean;
  status: 'unread' | 'read' | 'replied' | 'archived';
  createdAt?: string;
}

export interface AnalyticsEvent {
  id: string;
  eventType: 'page_view' | 'project_view' | 'cv_download' | 'contact_submit';
  targetSlug: string;
  referrer: string;
  createdAt?: string;
}

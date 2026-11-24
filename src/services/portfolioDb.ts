import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  writeBatch,
  limit,
} from 'firebase/firestore';
import {
  ADMIN_EMAIL,
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  DEFAULT_EDUCATION,
  DEFAULT_EXPERIENCES,
  DEFAULT_GITHUB_SETTINGS,
  DEFAULT_PROFILE,
  DEFAULT_PROJECTS,
  DEFAULT_SKILLS,
} from '../data/defaultPortfolio';
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
  PendingApproval,
  PortfolioProfile,
  Project,
  Skill,
} from '../types/portfolio';

function cleanId(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || `item-${Date.now()}`;
}

export async function seedInitialPortfolioIfEmpty(): Promise<boolean> {
  if (!auth.currentUser) return false;
  const profileRef = doc(db, 'portfolio_public', 'profile');
  let snap;
  try {
    snap = await getDoc(profileRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'portfolio_public/profile');
  }
  if (snap && snap.exists()) {
    try {
      const existingProfile = snap.data() as PortfolioProfile;
      const profileUpdates: Record<string, unknown> = {};
      if (
        existingProfile.fullBio &&
        !existingProfile.fullBio.includes('Business Manager at the end of the day')
      ) {
        profileUpdates.shortBio = DEFAULT_PROFILE.shortBio;
        profileUpdates.fullBio = DEFAULT_PROFILE.fullBio;
        profileUpdates.approach = DEFAULT_PROFILE.approach;
        profileUpdates.careerGoals = DEFAULT_PROFILE.careerGoals;
      }
      if (
        !existingProfile.photoUrl ||
        existingProfile.photoUrl.includes('portrait_jacinta_developer_')
      ) {
        profileUpdates.photoUrl = DEFAULT_PROFILE.photoUrl;
      }
      if (Object.keys(profileUpdates).length > 0) {
        await updateDoc(profileRef, {
          ...profileUpdates,
          updatedAt: serverTimestamp(),
        });
      }

      const berryRef = doc(db, 'projects', 'berry-e-learning-platform');
      const berrySnap = await getDoc(berryRef);
      if (berrySnap.exists()) {
        const berryData = berrySnap.data() as Project;
        if (!berryData.liveDemoUrl && berryData.status === 'In Development') {
          const berryDefault = DEFAULT_PROJECTS.find((p) => p.id === 'berry-e-learning-platform');
          if (berryDefault) {
            await updateDoc(berryRef, {
              shortDescription: berryDefault.shortDescription,
              fullDescription: berryDefault.fullDescription,
              verificationNote: berryDefault.verificationNote || '',
              liveDemoUrl: berryDefault.liveDemoUrl || '',
              status: berryDefault.status,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      for (const projectId of ['weego', 'talent-bridge']) {
        const projRef = doc(db, 'projects', projectId);
        const projSnap = await getDoc(projRef);
        if (!projSnap.exists()) {
          const projDefault = DEFAULT_PROJECTS.find((p) => p.id === projectId);
          if (projDefault) {
            const { id: _ignoredId, ...projFields } = projDefault;
            await setDoc(projRef, {
              ...projFields,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }

      const calRef = doc(db, 'experiences', 'exp-cal-finance');
      const calSnap = await getDoc(calRef);
      if (calSnap.exists()) {
        const calData = calSnap.data() as Experience;
        const needsCalUpgrade =
          calData.role === 'Finance Intern' ||
          calData.summary?.includes('viewsasa.co.ke') ||
          calData.summary?.includes('talentbridge.co.ke') ||
          calData.summary?.includes('wego.co.ke') ||
          !calData.summary?.includes('Citizen Duka (');
        if (needsCalUpgrade) {
          const calDefault = DEFAULT_EXPERIENCES.find((e) => e.id === 'exp-cal-finance');
          if (calDefault) {
            await updateDoc(calRef, {
              role: calDefault.role,
              summary: calDefault.summary,
              highlights: calDefault.highlights,
              ambiguityFlag: calDefault.ambiguityFlag,
              ambiguityNote: calDefault.ambiguityNote || '',
              displayOrder: calDefault.displayOrder,
              updatedAt: serverTimestamp(),
            });
          }
          const maukuRef = doc(db, 'experiences', 'exp-mauku-njau');
          const maukuSnap = await getDoc(maukuRef);
          if (maukuSnap.exists()) {
            await updateDoc(maukuRef, { displayOrder: 2, updatedAt: serverTimestamp() });
          }
          const rolineRef = doc(db, 'experiences', 'exp-roline-consultancy');
          const rolineSnap = await getDoc(rolineRef);
          if (rolineSnap.exists()) {
            await updateDoc(rolineRef, { displayOrder: 3, updatedAt: serverTimestamp() });
          }
        }
      }
    } catch {
      // Non-fatal baseline check
    }
    return false;
  }

  const batch = writeBatch(db);
  batch.set(profileRef, {
    ...DEFAULT_PROFILE,
    updatedAt: serverTimestamp(),
  });

  if (auth.currentUser.email === ADMIN_EMAIL && auth.currentUser.emailVerified) {
    batch.set(doc(db, 'admins', auth.currentUser.uid), {
      email: auth.currentUser.email,
      role: 'admin',
      createdAt: serverTimestamp(),
    });
  }

  for (const project of DEFAULT_PROJECTS) {
    const { id: _ignoredId, ...projectFields } = project;
    batch.set(doc(db, 'projects', project.id), {
      ...projectFields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const skill of DEFAULT_SKILLS) {
    batch.set(doc(db, 'skills', skill.id), {
      ...skill,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const exp of DEFAULT_EXPERIENCES) {
    batch.set(doc(db, 'experiences', exp.id), {
      ...exp,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  for (const edu of DEFAULT_EDUCATION) {
    batch.set(doc(db, 'education', edu.id), {
      ...edu,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'github_settings', 'default'), {
    ...DEFAULT_GITHUB_SETTINGS,
    updatedAt: serverTimestamp(),
  });

  // Create initial review item for the Cal Westlands vs CAL ambiguity
  batch.set(doc(db, 'pending_approvals', 'review-cal-westlands-overlap'), {
    category: 'experience_update',
    targetType: 'experience',
    targetId: 'exp-cal-westlands-draft',
    title: 'Review Internship Record: Cal Westlands vs Content Aggregation Limited (CAL)',
    explanation:
      'Two internship records reference CAL/Cal Westlands (CAL Software Engineering Intern May 2025 – Sep 2025, and Cal Westlands ~6 months). Cal Westlands is kept private until you confirm whether to publish it separately, edit it, or merge notes.',
    previousContentJson: JSON.stringify({ isPublic: false, organization: 'Cal Westlands' }, null, 2),
    proposedContentJson: JSON.stringify(
      {
        ...DEFAULT_EXPERIENCES.find((e) => e.id === 'exp-cal-westlands-draft'),
        isPublic: true,
        ambiguityFlag: false,
        ambiguityNote: '',
      },
      null,
      2
    ),
    source: 'manual_draft',
    status: 'pending',
    reviewerNote: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'audit_logs', `seed-${Date.now()}`), {
    action: 'initial_seed',
    entityType: 'portfolio',
    entityId: 'root',
    summary: 'Initialized verified portfolio records in Firestore',
    actorEmail: auth.currentUser.email || ADMIN_EMAIL,
    detailsJson: JSON.stringify({ projects: DEFAULT_PROJECTS.length, skills: DEFAULT_SKILLS.length }),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'initial_seed_batch');
  }
}

export function subscribePublicProfile(onData: (profile: PortfolioProfile | null) => void) {
  return onSnapshot(
    doc(db, 'portfolio_public', 'profile'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as PortfolioProfile) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, 'portfolio_public/profile')
  );
}

export function subscribePublicGithubCache(onData: (cache: GithubSnapshot | null) => void) {
  return onSnapshot(
    doc(db, 'portfolio_public', 'github_cache'),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const raw = snap.data() as Record<string, unknown>;
      try {
        onData({
          username: String(raw.username || 'Lex-Cable'),
          name: String(raw.name || 'Jacinta Wambui Waweru'),
          avatarUrl: String(raw.avatarUrl || ''),
          bio: String(raw.bio || ''),
          profileUrl: String(raw.profileUrl || 'https://github.com/Lex-Cable'),
          publicReposCount: Number(raw.publicReposCount || 0),
          followers: 0,
          totalStars: Number(raw.totalStars || 0),
          totalForks: Number(raw.totalForks || 0),
          contributionsSummary: String(raw.contributionsSummary || ''),
          contributionsDataAvailable: Boolean(raw.contributionsSummary && !String(raw.contributionsSummary).includes('not available')),
          topLanguages: raw.topLanguagesJson ? JSON.parse(String(raw.topLanguagesJson)) : [],
          repositories: raw.repositoriesJson ? JSON.parse(String(raw.repositoriesJson)) : [],
          recentEvents: raw.recentEventsJson ? JSON.parse(String(raw.recentEventsJson)) : [],
          statsSourceNote: String(raw.statsSourceNote || 'Live GitHub REST API'),
          lastSyncedAt: String(raw.lastSyncedAt || ''),
        });
      } catch {
        onData(null);
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, 'portfolio_public/github_cache')
  );
}

export function subscribeApprovedCv(onData: (cv: ApprovedCv | null) => void) {
  return onSnapshot(
    doc(db, 'portfolio_public', 'approved_cv'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as ApprovedCv) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, 'portfolio_public/approved_cv')
  );
}

export function subscribeProjects(isAdminMode: boolean, onData: (projects: Project[]) => void) {
  const q = isAdminMode
    ? query(collection(db, 'projects'), orderBy('displayOrder', 'asc'))
    : query(collection(db, 'projects'), where('isPublic', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...(d.data() as Project), id: d.id }));
      items.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
  );
}

export function subscribeSkills(isAdminMode: boolean, onData: (skills: Skill[]) => void) {
  const q = isAdminMode
    ? query(collection(db, 'skills'), orderBy('displayOrder', 'asc'))
    : query(collection(db, 'skills'), where('isPublic', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...(d.data() as Skill), id: d.id }));
      items.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'skills')
  );
}

export function subscribeExperiences(isAdminMode: boolean, onData: (experiences: Experience[]) => void) {
  const q = isAdminMode
    ? query(collection(db, 'experiences'), orderBy('displayOrder', 'asc'))
    : query(collection(db, 'experiences'), where('isPublic', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...(d.data() as Experience), id: d.id }));
      items.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'experiences')
  );
}

export function subscribeEducation(isAdminMode: boolean, onData: (education: Education[]) => void) {
  const q = isAdminMode
    ? query(collection(db, 'education'), orderBy('displayOrder', 'asc'))
    : query(collection(db, 'education'), where('isPublic', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...(d.data() as Education), id: d.id }));
      items.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'education')
  );
}

// Admin-only subscriptions
export function subscribePendingApprovals(onData: (items: PendingApproval[]) => void) {
  const q = query(collection(db, 'pending_approvals'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...(data as unknown as PendingApproval),
            id: d.id,
            createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || '',
            updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || '',
          };
        })
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'pending_approvals')
  );
}

export function subscribeAuditLogs(onData: (logs: AuditLog[]) => void) {
  const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...(data as unknown as AuditLog),
            id: d.id,
            createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || '',
          };
        })
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
  );
}

export function subscribeCvVersions(onData: (versions: CvVersion[]) => void) {
  const q = query(collection(db, 'cv_versions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...(data as unknown as CvVersion),
            id: d.id,
            createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || '',
          };
        })
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'cv_versions')
  );
}

export function subscribeGithubSettings(onData: (settings: GithubSettings | null) => void) {
  return onSnapshot(
    doc(db, 'github_settings', 'default'),
    (snap) => {
      onData(snap.exists() ? (snap.data() as GithubSettings) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, 'github_settings/default')
  );
}

export function subscribeContactMessages(onData: (messages: ContactMessage[]) => void) {
  const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...(data as unknown as ContactMessage),
            id: d.id,
            createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || '',
          };
        })
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'contact_messages')
  );
}

export function subscribeAnalyticsEvents(onData: (events: AnalyticsEvent[]) => void) {
  const q = query(collection(db, 'analytics_events'), orderBy('createdAt', 'desc'), limit(300));
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            ...(data as unknown as AnalyticsEvent),
            id: d.id,
            createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString() || '',
          };
        })
      );
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'analytics_events')
  );
}

// Mutations
export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
  details?: Record<string, unknown>
) {
  const id = cleanId(`audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  try {
    await setDoc(doc(db, 'audit_logs', id), {
      action: action.slice(0, 80),
      entityType: entityType.slice(0, 80),
      entityId: cleanId(entityId),
      summary: summary.slice(0, 500),
      actorEmail: auth.currentUser?.email || ADMIN_EMAIL,
      detailsJson: details ? JSON.stringify(details).slice(0, 8000) : '',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `audit_logs/${id}`);
  }
}

export async function saveGithubCacheToFirestore(snapshot: GithubSnapshot) {
  try {
    await setDoc(doc(db, 'portfolio_public', 'github_cache'), {
      username: snapshot.username.slice(0, 60),
      name: (snapshot.name || '').slice(0, 120),
      avatarUrl: (snapshot.avatarUrl || '').slice(0, 500),
      bio: (snapshot.bio || '').slice(0, 500),
      profileUrl: snapshot.profileUrl.slice(0, 300),
      publicReposCount: snapshot.publicReposCount,
      totalStars: snapshot.totalStars,
      totalForks: snapshot.totalForks,
      contributionsSummary: (snapshot.contributionsSummary || '').slice(0, 1000),
      topLanguagesJson: JSON.stringify(snapshot.topLanguages).slice(0, 8000),
      repositoriesJson: JSON.stringify(snapshot.repositories).slice(0, 60000),
      recentEventsJson: JSON.stringify(snapshot.recentEvents).slice(0, 40000),
      statsSourceNote: (snapshot.statsSourceNote || '').slice(0, 400),
      lastSyncedAt: snapshot.lastSyncedAt.slice(0, 80),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'portfolio_public/github_cache');
  }
}

export async function saveGithubSettings(settings: GithubSettings) {
  try {
    await setDoc(doc(db, 'github_settings', 'default'), {
      syncFrequencyMinutes: Math.max(5, Math.min(10080, Math.round(settings.syncFrequencyMinutes))),
      autoMetadataRefresh: Boolean(settings.autoMetadataRefresh),
      detectNewRepos: Boolean(settings.detectNewRepos),
      detectReadmeChanges: Boolean(settings.detectReadmeChanges),
      generateAiSuggestions: Boolean(settings.generateAiSuggestions),
      emailNotifications: Boolean(settings.emailNotifications),
      requireApprovalBeforePublish: Boolean(settings.requireApprovalBeforePublish),
      lastSyncAt: (settings.lastSyncAt || '').slice(0, 80),
      lastSyncStatus: (settings.lastSyncStatus || '').slice(0, 80),
      lastSyncSummary: (settings.lastSyncSummary || '').slice(0, 500),
      updatedAt: serverTimestamp(),
    });
    await logAudit('update_settings', 'github_settings', 'default', 'Updated GitHub automation settings');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'github_settings/default');
  }
}

export async function saveProfileDirectly(profile: PortfolioProfile) {
  try {
    await setDoc(doc(db, 'portfolio_public', 'profile'), {
      ...profile,
      name: profile.name.slice(0, 120),
      title: profile.title.slice(0, 120),
      location: profile.location.slice(0, 120),
      githubUsername: profile.githubUsername.slice(0, 60),
      email: profile.email.slice(0, 160),
      headline: profile.headline.slice(0, 240),
      shortBio: profile.shortBio.slice(0, 800),
      fullBio: profile.fullBio.slice(0, 4000),
      approach: profile.approach.slice(0, 2500),
      careerGoals: profile.careerGoals.slice(0, 2000),
      seoTitle: (profile.seoTitle || '').slice(0, 120),
      seoDescription: (profile.seoDescription || '').slice(0, 300),
      updatedAt: serverTimestamp(),
    });
    await logAudit('update_profile', 'profile', 'public', 'Updated public portfolio profile');
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'portfolio_public/profile');
  }
}

export async function saveProjectDirectly(project: Project, isNew = false) {
  const id = cleanId(project.id || project.slug || project.title);
  const slug = cleanId(project.slug || project.title).replace(/_/g, '-');
  const existingSnap = isNew ? null : await getDoc(doc(db, 'projects', id));
  const payload = {
    slug,
    title: project.title.slice(0, 160),
    shortDescription: project.shortDescription.slice(0, 500),
    problemStatement: project.problemStatement.slice(0, 2000),
    contributionRole: project.contributionRole.slice(0, 2000),
    fullDescription: project.fullDescription.slice(0, 6000),
    technologies: project.technologies.slice(0, 25).map((t) => t.slice(0, 200)),
    features: project.features.slice(0, 25).map((f) => f.slice(0, 200)),
    verificationNote: (project.verificationNote || '').slice(0, 600),
    imageUrl: (project.imageUrl || '').slice(0, 500),
    githubUrl: project.githubUrl.slice(0, 300),
    liveDemoUrl: (project.liveDemoUrl || '').slice(0, 300),
    status: project.status,
    featured: Boolean(project.featured),
    isPublic: Boolean(project.isPublic),
    sourceRepoName: (project.sourceRepoName || '').slice(0, 140),
    repoUpdatedAt: (project.repoUpdatedAt || '').slice(0, 80),
    displayOrder: Number(project.displayOrder || 10),
    createdAt: existingSnap?.exists() ? existingSnap.data().createdAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'projects', id), payload);
    await logAudit(isNew ? 'create_project' : 'update_project', 'project', id, `${isNew ? 'Created' : 'Updated'} project "${project.title}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `projects/${id}`);
  }
}

export async function removeProject(projectId: string) {
  const id = cleanId(projectId);
  try {
    await deleteDoc(doc(db, 'projects', id));
    await logAudit('delete_project', 'project', id, `Deleted project ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
  }
}

export async function saveSkillDirectly(skill: Skill, isNew = false) {
  const id = cleanId(skill.id || `skill-${skill.name}`);
  const existingSnap = isNew ? null : await getDoc(doc(db, 'skills', id));
  try {
    await setDoc(doc(db, 'skills', id), {
      name: skill.name.slice(0, 80),
      category: skill.category,
      proficiency: skill.proficiency,
      note: (skill.note || '').slice(0, 240),
      isPublic: Boolean(skill.isPublic),
      displayOrder: Number(skill.displayOrder || 50),
      createdAt: existingSnap?.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAudit(isNew ? 'create_skill' : 'update_skill', 'skill', id, `Saved skill "${skill.name}" (${skill.proficiency})`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `skills/${id}`);
  }
}

export async function removeSkill(skillId: string) {
  const id = cleanId(skillId);
  try {
    await deleteDoc(doc(db, 'skills', id));
    await logAudit('delete_skill', 'skill', id, `Deleted skill ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `skills/${id}`);
  }
}

export async function saveExperienceDirectly(exp: Experience, isNew = false) {
  const id = cleanId(exp.id || `exp-${exp.organization}`);
  const existingSnap = isNew ? null : await getDoc(doc(db, 'experiences', id));
  try {
    await setDoc(doc(db, 'experiences', id), {
      organization: exp.organization.slice(0, 160),
      location: (exp.location || '').slice(0, 120),
      role: exp.role.slice(0, 160),
      period: exp.period.slice(0, 100),
      entryType: exp.entryType,
      summary: exp.summary.slice(0, 1500),
      highlights: exp.highlights.slice(0, 20).map((h) => h.slice(0, 200)),
      ambiguityFlag: Boolean(exp.ambiguityFlag),
      ambiguityNote: (exp.ambiguityNote || '').slice(0, 600),
      isPublic: Boolean(exp.isPublic),
      displayOrder: Number(exp.displayOrder || 10),
      createdAt: existingSnap?.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAudit(isNew ? 'create_experience' : 'update_experience', 'experience', id, `Saved experience "${exp.organization}"`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `experiences/${id}`);
  }
}

export async function createPendingApproval(input: Omit<PendingApproval, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
  const id = cleanId(`appr-${input.targetType}-${input.targetId}-${Date.now()}`);
  try {
    await setDoc(doc(db, 'pending_approvals', id), {
      category: input.category,
      targetType: input.targetType,
      targetId: cleanId(input.targetId),
      title: input.title.slice(0, 200),
      explanation: input.explanation.slice(0, 1500),
      previousContentJson: input.previousContentJson.slice(0, 30000),
      proposedContentJson: input.proposedContentJson.slice(0, 30000),
      source: input.source,
      status: 'pending',
      reviewerNote: (input.reviewerNote || '').slice(0, 600),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAudit('queue_approval', input.targetType, id, `Queued pending approval: ${input.title}`);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `pending_approvals/${id}`);
  }
}

export async function resolvePendingApproval(
  approval: PendingApproval,
  decision: 'approved' | 'rejected' | 'edited_approved',
  editedProposedJson?: string,
  reviewerNote = ''
) {
  const finalJson = editedProposedJson ?? approval.proposedContentJson;

  if (decision === 'approved' || decision === 'edited_approved') {
    const parsed = JSON.parse(finalJson) as Record<string, unknown>;
    if (approval.targetType === 'project') {
      const existingDoc = await getDoc(doc(db, 'projects', cleanId(approval.targetId)));
      const base: Partial<Project> = existingDoc.exists() ? (existingDoc.data() as Project) : {};
      const merged: Project = {
        id: cleanId(String(parsed.id || approval.targetId)),
        slug: cleanId(String(parsed.slug || parsed.title || approval.targetId)).replace(/_/g, '-'),
        title: String(parsed.title || base.title || approval.targetId),
        shortDescription: String(parsed.shortDescription || base.shortDescription || 'Software project repository.'),
        problemStatement: String(parsed.problemStatement || base.problemStatement || 'Addresses practical workflow and engineering requirements.'),
        contributionRole: String(parsed.contributionRole || base.contributionRole || 'Full-Stack Developer'),
        fullDescription: String(parsed.fullDescription || base.fullDescription || parsed.shortDescription || ''),
        technologies: Array.isArray(parsed.technologies) ? parsed.technologies.map(String) : base.technologies || [],
        features: Array.isArray(parsed.features) ? parsed.features.map(String) : base.features || [],
        verificationNote: String(parsed.verificationNote || base.verificationNote || 'Verified via repository inspection and owner approval.'),
        imageUrl: String(parsed.imageUrl || base.imageUrl || ''),
        githubUrl: String(parsed.githubUrl || base.githubUrl || 'https://github.com/Lex-Cable'),
        liveDemoUrl: String(parsed.liveDemoUrl || base.liveDemoUrl || ''),
        status: (parsed.status as Project['status']) || base.status || 'In Development',
        featured: typeof parsed.featured === 'boolean' ? parsed.featured : Boolean(base.featured),
        isPublic: typeof parsed.isPublic === 'boolean' ? parsed.isPublic : true,
        sourceRepoName: String(parsed.sourceRepoName || base.sourceRepoName || ''),
        repoUpdatedAt: String(parsed.repoUpdatedAt || base.repoUpdatedAt || ''),
        displayOrder: Number(parsed.displayOrder || base.displayOrder || 10),
      };
      await saveProjectDirectly(merged, !existingDoc.exists());
    } else if (approval.targetType === 'profile' || approval.targetType === 'seo') {
      const existingSnap = await getDoc(doc(db, 'portfolio_public', 'profile'));
      const currentProfile = existingSnap.exists() ? (existingSnap.data() as PortfolioProfile) : DEFAULT_PROFILE;
      await saveProfileDirectly({ ...currentProfile, ...parsed });
    } else if (approval.targetType === 'experience') {
      const existingDoc = await getDoc(doc(db, 'experiences', cleanId(approval.targetId)));
      const base: Partial<Experience> = existingDoc.exists() ? (existingDoc.data() as Experience) : {};
      await saveExperienceDirectly({ ...(base as Experience), ...(parsed as Partial<Experience>), id: cleanId(approval.targetId) }, !existingDoc.exists());
    }
  }

  try {
    await updateDoc(doc(db, 'pending_approvals', approval.id), {
      status: decision,
      proposedContentJson: finalJson.slice(0, 30000),
      reviewerNote: reviewerNote.slice(0, 600),
      updatedAt: serverTimestamp(),
    });
    await logAudit(
      `approval_${decision}`,
      approval.targetType,
      approval.targetId,
      `${decision.toUpperCase()}: ${approval.title}`,
      { approvalId: approval.id, reviewerNote }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `pending_approvals/${approval.id}`);
  }
}

export async function uploadPrivateCvVersion(params: {
  versionLabel: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataBase64: string;
  notes: string;
  publishImmediately: boolean;
}) {
  const id = cleanId(`cv-${Date.now()}`);
  const email = auth.currentUser?.email || ADMIN_EMAIL;
  try {
    await setDoc(doc(db, 'cv_versions', id), {
      versionLabel: params.versionLabel.slice(0, 80),
      fileName: params.fileName.slice(0, 200),
      mimeType: params.mimeType.slice(0, 100),
      fileSize: params.fileSize,
      dataBase64: params.dataBase64,
      notes: params.notes.slice(0, 500),
      isPublicApproved: params.publishImmediately,
      uploadedByEmail: email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (params.publishImmediately) {
      await setDoc(doc(db, 'portfolio_public', 'approved_cv'), {
        versionId: id,
        fileName: params.fileName.slice(0, 200),
        mimeType: params.mimeType.slice(0, 100),
        fileSize: params.fileSize,
        dataBase64: params.dataBase64,
        summaryNote: params.notes.slice(0, 500),
        updatedAt: serverTimestamp(),
      });
    }
    await logAudit('upload_cv', 'cv', id, `Uploaded CV "${params.versionLabel}" (published: ${params.publishImmediately})`);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `cv_versions/${id}`);
  }
}

export async function publishCvVersion(version: CvVersion) {
  try {
    const existingVersions = await getDocs(collection(db, 'cv_versions'));
    const batch = writeBatch(db);
    existingVersions.docs.forEach((d) => {
      batch.update(d.ref, {
        isPublicApproved: d.id === version.id,
        updatedAt: serverTimestamp(),
      });
    });
    batch.set(doc(db, 'portfolio_public', 'approved_cv'), {
      versionId: version.id,
      fileName: version.fileName.slice(0, 200),
      mimeType: version.mimeType.slice(0, 100),
      fileSize: version.fileSize,
      dataBase64: version.dataBase64,
      summaryNote: (version.notes || '').slice(0, 500),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    await logAudit('publish_cv', 'cv', version.id, `Approved CV version "${version.versionLabel}" as public CV`);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `portfolio_public/approved_cv`);
  }
}

export async function saveContactMessageToFirestore(params: {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  emailDelivered: boolean;
}) {
  const id = cleanId(`msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  try {
    await setDoc(doc(db, 'contact_messages', id), {
      senderName: params.senderName.trim().slice(0, 120),
      senderEmail: params.senderEmail.trim().slice(0, 160),
      subject: params.subject.trim().slice(0, 200),
      message: params.message.trim().slice(0, 4000),
      emailDelivered: Boolean(params.emailDelivered),
      status: 'unread',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `contact_messages/${id}`);
  }
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessage['status']
) {
  try {
    await updateDoc(doc(db, 'contact_messages', cleanId(id)), { status });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contact_messages/${id}`);
  }
}

export async function trackAnalyticsEvent(
  eventType: AnalyticsEvent['eventType'],
  targetSlug: string
) {
  const id = cleanId(`evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const referrer = typeof document !== 'undefined' ? (document.referrer || 'direct').slice(0, 300) : 'direct';
  try {
    await setDoc(doc(db, 'analytics_events', id), {
      eventType,
      targetSlug: (targetSlug || 'home').slice(0, 140),
      referrer,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking privacy-conscious telemetry
  }
}

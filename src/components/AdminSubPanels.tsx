import React, { useState } from 'react';
import {
  Check,
  Edit3,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  Download,
  Eye,
  Mail,
  Send,
  Activity,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import type {
  AnalyticsEvent,
  AuditLog,
  ContactMessage,
  CvVersion,
  Education,
  Experience,
  GithubSnapshot,
  GitlabSnapshot,
  PendingApproval,
  PortfolioProfile,
  Project,
  ProjectStatus,
  Skill,
  SkillCategory,
  SkillProficiency,
} from '../types/portfolio';
import {
  publishCvVersion,
  removeProject,
  removeSkill,
  resolvePendingApproval,
  saveExperienceDirectly,
  saveProfileDirectly,
  saveProjectDirectly,
  saveSkillDirectly,
  updateContactMessageStatus,
  uploadPrivateCvVersion,
} from '../services/portfolioDb';
import {
  downloadBase64File,
  generatePortfolioCvPdfBase64,
  generatePortfolioCvPdfBlob,
  triggerBlobDownload,
} from '../utils/pdfGenerator';
import { DEFAULT_CV_FILENAME } from '../data/defaultPortfolio';

const SKILL_CATEGORIES: SkillCategory[] = [
  'Frontend Development',
  'Backend Development',
  'Databases',
  'Development Tools and DevOps',
  'Other Technologies',
  'Additional Learning Interests',
];

const PROFICIENCY_LEVELS: SkillProficiency[] = [
  'Proficient',
  'Comfortable',
  'Familiar',
  'Currently Learning',
];


function ApprovalContentPreview({ json, emptyLabel }: { json: string; emptyLabel: string }) {
  let data: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(json || '{}') as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
    else data = { content: parsed };
  } catch {
    return <pre className="text-xs whitespace-pre-wrap break-words text-[#514941] dark:text-[#d5cdc3]">{json}</pre>;
  }
  const entries = Object.entries(data).filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key));
  if (!entries.length) return <p className="text-xs text-[#8a8178] dark:text-[#b9aea2]">{emptyLabel}</p>;
  const humanize = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  const display = (value: unknown) => {
    if (value === null || value === undefined || value === '') return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? value.join(' · ') : 'None';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {entries.slice(0, 12).map(([key, value]) => (
        <div key={key} className="rounded-xl bg-white/70 dark:bg-[#111110]/70 border border-[#e7ddd2] dark:border-[#39332d] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide font-semibold text-[#9b806b]">{humanize(key)}</p>
          <p className="text-xs leading-relaxed text-[#302a25] dark:text-[#f0e8df] mt-1 break-words">{display(value)}</p>
        </div>
      ))}
      {entries.length > 12 && <p className="sm:col-span-2 text-[11px] text-[#8a8178]">And {entries.length - 12} more fields.</p>}
      <details className="sm:col-span-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-[#9b6847]">View raw details</summary>
        <pre className="mt-2 text-[11px] font-mono-tabular bg-[#f7f3ed] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] rounded-xl p-3 overflow-x-auto max-h-56">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}

export function ApprovalsPanel({ approvals }: { approvals: PendingApproval[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedJson, setEditedJson] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = approvals.filter((a) => a.status === 'pending');
  const history = approvals.filter((a) => a.status !== 'pending');

  const handleAction = async (
    item: PendingApproval,
    decision: 'approved' | 'rejected' | 'edited_approved'
  ) => {
    setError(null);
    setBusyId(item.id);
    try {
      if (decision === 'edited_approved') {
        JSON.parse(editedJson);
      }
      await resolvePendingApproval(
        item,
        decision,
        decision === 'edited_approved' ? editedJson : undefined,
        reviewerNotes[item.id] || ''
      );
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Invalid JSON or unable to save approval decision.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
          Pending Approvals ({pending.length})
        </h2>
        <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">
          Nothing is published automatically. Review the suggested change, then approve, edit, or decline it.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-8 text-center">
          <p className="text-sm font-medium text-[#68635d] dark:text-[#b9aea2]">
            All caught up — no pending changes awaiting review.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {pending.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div
                key={item.id}
                className="relative overflow-hidden bg-gradient-to-br from-[#fffdf9] via-[#fffdf9] to-[#f4e7dc] dark:from-[#191816] dark:via-[#191816] dark:to-[#30231b] border border-[#cfa385] dark:border-[#76543e] rounded-2xl p-6 space-y-5 shadow-[0_12px_35px_rgba(128,83,48,0.08)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#b98b6e] font-semibold tracking-wide uppercase">
                      {item.source === 'gemini_ai' ? 'AI suggestion' : item.source === 'github_sync' ? 'GitHub update' : 'Manual draft'} · {item.category.replace(/[_-]+/g, ' ')} · {item.targetType}
                    </p>
                    <h3 className="text-base font-bold text-[#161616] dark:text-[#fffdf9] mt-0.5">
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-xs font-mono-tabular text-[#b98b6e] font-semibold">
                    Needs your review
                  </span>
                </div>

                <p className="text-sm text-[#68635d] dark:text-[#b9aea2]">
                  {item.explanation}
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#68635d] dark:text-[#b9aea2]">
                      What is there now
                    </p>
                    <pre className="text-[11px] font-mono-tabular bg-[#f7f3ed] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] rounded-xl p-3.5 overflow-x-auto max-h-56 text-[#161616] dark:text-[#f7f3ed]">
                      {item.previousContentJson || 'No previous version — this is a new item.'}
                    </pre>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-[#68635d] dark:text-[#b9aea2]">
                      What will change
                    </p>
                    {isEditing ? (
                      <textarea
                        rows={10}
                        value={editedJson}
                        onChange={(e) => setEditedJson(e.target.value)}
                        className="w-full text-[11px] font-mono-tabular bg-[#f7f3ed] dark:bg-[#111110] border border-[#b98b6e] rounded-xl p-3.5 text-[#161616] dark:text-[#f7f3ed] focus:outline-none"
                      />
                    ) : (
                      <pre className="text-[11px] font-mono-tabular bg-[#f7f3ed] dark:bg-[#111110] border border-[#ddd4c9] dark:border-[#2c2925] rounded-xl p-3.5 overflow-x-auto max-h-56 text-[#161616] dark:text-[#f7f3ed]">
                        {item.proposedContentJson}
                      </pre>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#ddd4c9] dark:border-[#2c2925]">
                  <input
                    type="text"
                    placeholder="Optional reviewer note…"
                    value={reviewerNotes[item.id] || ''}
                    onChange={(e) =>
                      setReviewerNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110] text-[#161616] dark:text-[#f7f3ed]"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleAction(item, 'edited_approved')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save & Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-[#68635d] dark:text-[#b9aea2]"
                        >
                          Cancel Edit
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => {
                            setEditingId(item.id);
                            setEditedJson(item.proposedContentJson);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-[#161616] dark:text-[#fffdf9] hover:bg-[#f4f0e9] dark:hover:bg-[#24211e]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Review & Edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleAction(item, 'approved')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => handleAction(item, 'rejected')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-red-700 text-white hover:bg-red-800"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#ddd4c9] dark:border-[#2c2925]">
          <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
            Recent Reviewed Decisions
          </h3>
          <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl divide-y divide-[#ddd4c9] dark:divide-[#2c2925]">
            {history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="px-4 py-3.5 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <p className="font-semibold text-[#161616] dark:text-[#fffdf9]">{item.title}</p>
                  <p className="text-[#68635d] dark:text-[#b9aea2]">
                    {item.source} · {item.targetType}
                    {item.reviewerNote ? ` · Note: ${item.reviewerNote}` : ''}
                  </p>
                </div>
                <span
                  className={`font-semibold whitespace-nowrap ${
                    item.status === 'rejected'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {item.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectsManagerPanel({ projects }: { projects: Project[] }) {
  const emptyForm: Project = {
    id: '',
    slug: '',
    title: '',
    shortDescription: '',
    problemStatement: '',
    contributionRole: 'Full-Stack Developer',
    fullDescription: '',
    technologies: [],
    features: [],
    verificationNote: '',
    imageUrl: '',
    githubUrl: 'https://github.com/Lex-Cable',
    liveDemoUrl: '',
    status: 'In Development',
    featured: false,
    isPublic: true,
    sourceRepoName: '',
    displayOrder: projects.length + 1,
  };

  const [editing, setEditing] = useState<Project | null>(null);
  const [techInput, setTechInput] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = (p: Project) => {
    setEditing(p);
    setTechInput(p.technologies.join(', '));
    setFeaturesInput(p.features.join('\n'));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      await saveProjectDirectly(
        {
          ...editing,
          technologies: techInput
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          features: featuresInput
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        isNew
      );
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
            Projects Manager
          </h2>
          <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
            Add, edit, or toggle public visibility of portfolio projects without editing source code.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openEditor(emptyForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Project</span>
        </button>
      </div>

      {editing && (
        <form
          onSubmit={handleSave}
          className="bg-[#fffdf9] dark:bg-[#191816] border border-[#b98b6e]/60 rounded-2xl p-6 space-y-4"
        >
          <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
            {editing.id ? `Edit: ${editing.title}` : 'New Project'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Project Title"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
            <input
              placeholder="URL slug (auto-generated if blank)"
              value={editing.slug}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
            <input
              placeholder="GitHub Repository URL (optional for client sites)"
              value={editing.githubUrl}
              onChange={(e) => setEditing({ ...editing, githubUrl: e.target.value })}
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
            <input
              placeholder="Live Demo URL (leave blank if none)"
              value={editing.liveDemoUrl || ''}
              onChange={(e) => setEditing({ ...editing, liveDemoUrl: e.target.value })}
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
            <select
              value={editing.status}
              onChange={(e) =>
                setEditing({ ...editing, status: e.target.value as ProjectStatus })
              }
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            >
              <option value="In Development">In Development</option>
              <option value="Active Prototype">Active Prototype</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
            <input
              placeholder="Image URL (/src/assets/... or https://...)"
              value={editing.imageUrl || ''}
              onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
              className="px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
          </div>

          <textarea
            required
            rows={2}
            placeholder="Short description"
            value={editing.shortDescription}
            onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
          <textarea
            required
            rows={2}
            placeholder="Problem statement"
            value={editing.problemStatement}
            onChange={(e) => setEditing({ ...editing, problemStatement: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
          <textarea
            required
            rows={2}
            placeholder="Your contribution & role"
            value={editing.contributionRole}
            onChange={(e) => setEditing({ ...editing, contributionRole: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
          <textarea
            required
            rows={3}
            placeholder="Full overview & architecture"
            value={editing.fullDescription}
            onChange={(e) => setEditing({ ...editing, fullDescription: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
          <input
            placeholder="Verified technologies (comma-separated)"
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
          <textarea
            rows={3}
            placeholder="Key implemented features (one per line)"
            value={featuresInput}
            onChange={(e) => setFeaturesInput(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />

          <div className="flex flex-wrap items-center gap-6 text-xs">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                className="accent-[#b98b6e]"
              />
              <span>Featured on Home</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.isPublic}
                onChange={(e) => setEditing({ ...editing, isPublic: e.target.checked })}
                className="accent-[#b98b6e]"
              />
              <span>Publicly Visible</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288]"
            >
              {saving ? 'Saving…' : 'Save Project'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-5 py-2 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl divide-y divide-[#ddd4c9] dark:divide-[#2c2925]">
        {projects.map((p) => (
          <div key={p.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">{p.title}</p>
              <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
                {p.status} · {p.isPublic ? 'Public' : 'Private Draft'} · {p.technologies.slice(0, 4).join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openEditor(p)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] hover:bg-[#f4f0e9] dark:hover:bg-[#24211e]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => void removeProject(p.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillsManagerPanel({ skills }: { skills: Skill[] }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SkillCategory>('Frontend Development');
  const [proficiency, setProficiency] = useState<SkillProficiency>('Comfortable');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await saveSkillDirectly(
      {
        id: '',
        name: name.trim(),
        category,
        proficiency,
        isPublic: true,
        displayOrder: skills.length + 1,
      },
      true
    );
    setName('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
          Skills & Proficiency Editor
        </h2>
        <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
          Categorize each technology accurately across Proficient, Comfortable, Familiar, or Currently Learning.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-4 flex flex-wrap items-center gap-3"
      >
        <input
          required
          placeholder="Technology name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[160px] px-3.5 py-2 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SkillCategory)}
          className="px-3.5 py-2 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
        >
          {SKILL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={proficiency}
          onChange={(e) => setProficiency(e.target.value as SkillProficiency)}
          className="px-3.5 py-2 text-xs rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
        >
          {PROFICIENCY_LEVELS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Skill</span>
        </button>
      </form>

      <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl divide-y divide-[#ddd4c9] dark:divide-[#2c2925]">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
          >
            <div>
              <p className="font-bold text-[#161616] dark:text-[#fffdf9]">{skill.name}</p>
              <p className="text-[#68635d] dark:text-[#b9aea2]">{skill.category}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={skill.proficiency}
                onChange={(e) =>
                  void saveSkillDirectly(
                    { ...skill, proficiency: e.target.value as SkillProficiency },
                    false
                  )
                }
                className="px-3 py-1.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
              >
                {PROFICIENCY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void removeSkill(skill.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full"
                title="Delete skill"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileAndExperiencePanel({
  profile,
  experiences,
}: {
  profile: PortfolioProfile;
  experiences: Experience[];
}) {
  const [form, setForm] = useState<PortfolioProfile>(profile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await saveProfileDirectly(form);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-10">
      <form
        onSubmit={handleSaveProfile}
        className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
          Public Profile & Bio Settings
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-[#68635d] dark:text-[#b9aea2]">Headline</label>
            <input
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-[#68635d] dark:text-[#b9aea2]">Photo URL</label>
            <input
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
          </div>
        </div>
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-[#68635d] dark:text-[#b9aea2]">Short Summary</label>
          <textarea
            rows={3}
            value={form.shortBio}
            onChange={(e) => setForm({ ...form, shortBio: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
        </div>
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-[#68635d] dark:text-[#b9aea2]">Full Biography</label>
          <textarea
            rows={4}
            value={form.fullBio}
            onChange={(e) => setForm({ ...form, fullBio: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
        </div>
        <button
          type="submit"
          disabled={savingProfile}
          className="px-5 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288]"
        >
          {savingProfile ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
              Experience Records & Ambiguity Review
            </h2>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
              Review flagged internship records before toggling them public.
            </p>
          </div>
        </div>

        {editingExp && (
          <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#b98b6e]/60 rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="font-bold text-[#161616] dark:text-[#fffdf9]">
              Editing {editingExp.organization}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={editingExp.organization}
                onChange={(e) => setEditingExp({ ...editingExp, organization: e.target.value })}
                className="px-3.5 py-2 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
              />
              <input
                value={editingExp.role}
                onChange={(e) => setEditingExp({ ...editingExp, role: e.target.value })}
                className="px-3.5 py-2 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
              />
              <input
                value={editingExp.period}
                onChange={(e) => setEditingExp({ ...editingExp, period: e.target.value })}
                className="px-3.5 py-2 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
              />
              <label className="inline-flex items-center gap-2 px-2">
                <input
                  type="checkbox"
                  checked={editingExp.isPublic}
                  onChange={(e) => setEditingExp({ ...editingExp, isPublic: e.target.checked })}
                  className="accent-[#b98b6e]"
                />
                <span>Published publicly</span>
              </label>
            </div>
            <textarea
              rows={3}
              value={editingExp.summary}
              onChange={(e) => setEditingExp({ ...editingExp, summary: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await saveExperienceDirectly(editingExp, false);
                  setEditingExp(null);
                }}
                className="px-4 py-2 rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] font-semibold"
              >
                Save Experience
              </button>
              <button
                type="button"
                onClick={() => setEditingExp(null)}
                className="px-4 py-2 rounded-full border border-[#ddd4c9] dark:border-[#2c2925]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-5 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">
                    {exp.role} — {exp.organization}
                  </p>
                  <p className="text-xs font-mono-tabular text-[#68635d] dark:text-[#b9aea2]">
                    {exp.period} · {exp.isPublic ? 'Public' : 'Private Draft'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingExp(exp)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] hover:bg-[#f4f0e9] dark:hover:bg-[#24211e]"
                >
                  Edit
                </button>
              </div>
              {exp.ambiguityFlag && exp.ambiguityNote && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{exp.ambiguityNote}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CvManagerPanel({
  cvVersions,
  profile,
  projects,
  skills,
  experiences,
  education,
  githubSnapshot,
  gitlabSnapshot,
}: {
  cvVersions: CvVersion[];
  profile: PortfolioProfile;
  projects: Project[];
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  githubSnapshot?: GithubSnapshot | null;
  gitlabSnapshot?: GitlabSnapshot | null;
}) {
  const [versionLabel, setVersionLabel] = useState(`v${cvVersions.length + 1}.0`);
  const [notes, setNotes] = useState('');
  const [publishNow, setPublishNow] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<CvVersion | null>(null);
  const [autoPreviewUrl, setAutoPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleAutoPreview = () => {
    if (autoPreviewUrl) {
      URL.revokeObjectURL(autoPreviewUrl);
      setAutoPreviewUrl(null);
      return;
    }
    const blob = generatePortfolioCvPdfBlob({
      profile,
      projects,
      skills,
      experiences,
      education,
      githubSnapshot,
      gitlabSnapshot,
    });
    setAutoPreviewUrl(URL.createObjectURL(blob));
  };

  const handleDownloadAutomatedCv = () => {
    const blob = generatePortfolioCvPdfBlob({
      profile,
      projects,
      skills,
      experiences,
      education,
      githubSnapshot,
      gitlabSnapshot,
    });
    triggerBlobDownload(blob, DEFAULT_CV_FILENAME);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document (.pdf).');
      return;
    }
    if (file.size > 700000) {
      setError('PDF exceeds 700KB Firestore document limit. Please compress the PDF under 700KB.');
      return;
    }

    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.split(',')[1] || '');
        };
        reader.onerror = () => reject(new Error('Failed to read PDF file.'));
        reader.readAsDataURL(file);
      });

      await uploadPrivateCvVersion({
        versionLabel: versionLabel.trim() || `v${cvVersions.length + 1}`,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        dataBase64: base64,
        notes,
        publishImmediately: publishNow,
      });
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerateFromProfile = async () => {
    setUploading(true);
    setError(null);
    try {
      const base64 = generatePortfolioCvPdfBase64({
        profile,
        projects,
        skills,
        experiences,
        education,
        githubSnapshot,
        gitlabSnapshot,
      });
      await uploadPrivateCvVersion({
        versionLabel: `Generated-${new Date().toISOString().slice(0, 10)}`,
        fileName: DEFAULT_CV_FILENAME,
        mimeType: 'application/pdf',
        fileSize: Math.round((base64.length * 3) / 4),
        dataBase64: base64,
        notes: 'Snapshot generated directly from live web portfolio layout, projects, skills, GitHub/GitLab & education.',
        publishImmediately: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
            Private CV Management & Version History
          </h2>
          <p className="text-xs text-[#68635d] dark:text-[#b9aea2]">
            Older CV drafts stay strictly private. Only the version marked as Approved Public CV is downloadable by visitors.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateFromProfile}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] hover:bg-[#f4f0e9] dark:hover:bg-[#24211e]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#b98b6e]" />
          <span>Generate Draft CV from Approved Profile</span>
        </button>
      </div>

      <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">Upload New PDF CV</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-xs">
          <input
            placeholder="Version label (e.g., v2.1-Recruiter)"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
          <input
            placeholder="Private version notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110]"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="accent-[#b98b6e]"
            />
            <span>Publish immediately as public Download CV</span>
          </label>
          <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Uploading…' : 'Choose PDF (max 700KB)'}</span>
            <input
              type="file"
              accept="application/pdf"
              disabled={uploading}
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {previewVersion && (
        <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#161616] dark:text-[#fffdf9]">
              Preview: {previewVersion.versionLabel} ({previewVersion.fileName})
            </p>
            <button
              type="button"
              onClick={() => setPreviewVersion(null)}
              className="text-xs text-[#68635d] hover:text-[#161616] dark:hover:text-[#fffdf9]"
            >
              Close Preview
            </button>
          </div>
          <iframe
            title="CV PDF Preview"
            src={`data:application/pdf;base64,${previewVersion.dataBase64}`}
            className="w-full h-[460px] rounded-xl border border-[#ddd4c9] dark:border-[#2c2925]"
          />
        </div>
      )}

      {autoPreviewUrl && (
        <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#161616] dark:text-[#fffdf9]">
              Preview: Automated Live Portfolio CV ({DEFAULT_CV_FILENAME})
            </p>
            <button
              type="button"
              onClick={toggleAutoPreview}
              className="text-xs text-[#68635d] hover:text-[#161616] dark:hover:text-[#fffdf9]"
            >
              Close Preview
            </button>
          </div>
          <iframe
            title="Automated Live Portfolio CV Preview"
            src={autoPreviewUrl}
            className="w-full h-[540px] rounded-xl border border-[#ddd4c9] dark:border-[#2c2925]"
          />
        </div>
      )}

      <div className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl divide-y divide-[#ddd4c9] dark:divide-[#2c2925]">
        <div className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs bg-[#f7f3ed]/60 dark:bg-[#141311]">
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-[#b98b6e] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#161616] dark:text-[#fffdf9]">
                Automated Live Portfolio CV — {DEFAULT_CV_FILENAME}
              </p>
              <p className="text-[#68635d] dark:text-[#b9aea2]">
                Dynamically generated in real time from your live web portfolio layout (Hero, Capabilities, Projects, About, Experience, GitHub & GitLab).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAutoPreview}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816]"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{autoPreviewUrl ? 'Hide Preview' : 'Preview'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadAutomatedCv}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
        {cvVersions.length === 0 ? (
          <div className="p-6 text-xs text-[#68635d] dark:text-[#b9aea2]">
            No custom Firestore CV overrides published yet. Visitors automatically receive the live portfolio-exact generated CV above.
          </div>
        ) : (
          cvVersions.map((ver) => (
            <div key={ver.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-[#b98b6e] mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-[#161616] dark:text-[#fffdf9]">
                    {ver.versionLabel} — {ver.fileName}
                  </p>
                  <p className="text-[#68635d] dark:text-[#b9aea2]">
                    {(ver.fileSize / 1024).toFixed(1)} KB ·{' '}
                    {ver.isPublicApproved ? 'Approved Public CV' : 'Private Archive'}
                    {ver.notes ? ` · ${ver.notes}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewVersion(ver)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#ddd4c9] dark:border-[#2c2925]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadBase64File(ver.dataBase64, ver.fileName, ver.mimeType)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#ddd4c9] dark:border-[#2c2925]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                {!ver.isPublicApproved && (
                  <button
                    type="button"
                    onClick={() => void publishCvVersion(ver)}
                    className="px-3.5 py-1.5 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
                  >
                    Approve for Public
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function InboxAnalyticsAuditPanel({
  messages,
  analytics,
  auditLogs,
}: {
  messages: ContactMessage[];
  analytics: AnalyticsEvent[];
  auditLogs: AuditLog[];
}) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null);
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [replySuccess, setReplySuccess] = useState<Record<string, string>>({});

  const pageViews = analytics.filter((e) => e.eventType === 'page_view').length;
  const cvDownloads = analytics.filter((e) => e.eventType === 'cv_download').length;
  const contactSubmits = analytics.filter((e) => e.eventType === 'contact_submit').length;
  const unreadCount = messages.filter((m) => m.status === 'unread').length;
  const projectViews = new Map<string, number>();
  for (const evt of analytics) {
    if (evt.eventType === 'project_view') {
      projectViews.set(evt.targetSlug, (projectViews.get(evt.targetSlug) || 0) + 1);
    }
  }

  const sendReply = async (message: ContactMessage) => {
    const reply = (replyDrafts[message.id] || '').trim();
    if (reply.length < 2) {
      setReplyErrors((prev) => ({ ...prev, [message.id]: 'Write a reply before sending.' }));
      return;
    }
    setReplyBusyId(message.id);
    setReplyErrors((prev) => ({ ...prev, [message.id]: '' }));
    setReplySuccess((prev) => ({ ...prev, [message.id]: '' }));
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Your admin session has expired. Please sign in again.');
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/admin/contact-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          senderName: message.senderName,
          senderEmail: message.senderEmail,
          subject: message.subject,
          reply,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || 'The reply could not be sent.');
      await updateContactMessageStatus(message.id, 'replied');
      setReplyDrafts((prev) => ({ ...prev, [message.id]: '' }));
      setReplySuccess((prev) => ({ ...prev, [message.id]: 'Reply sent. This conversation is marked as replied.' }));
      setReplyingId(null);
    } catch (err) {
      setReplyErrors((prev) => ({ ...prev, [message.id]: err instanceof Error ? err.message : 'Unable to send reply.' }));
    } finally {
      setReplyBusyId(null);
    }
  };

  const readableAction = (value: string) => value.replace(/[_-]+/g, ' ').replace(/\\b\\w/g, (letter) => letter.toUpperCase());
  const readableDate = (value?: string) => {
    if (!value) return 'Time not recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Time not recorded' : date.toLocaleString();
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#b98b6e]">Your audience at a glance</p>
            <h2 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9] mt-1">Portfolio analytics</h2>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">Counts from recorded portfolio events.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Page views', value: pageViews, note: 'Portfolio visits' },
            { label: 'Project views', value: Array.from(projectViews.values()).reduce((a, b) => a + b, 0), note: 'Project detail views' },
            { label: 'CV downloads', value: cvDownloads, note: 'Document downloads' },
            { label: 'Contact enquiries', value: contactSubmits, note: 'Form submissions' },
          ].map((metric) => (
            <div key={metric.label} className="relative overflow-hidden rounded-2xl border border-[#ddd4c9] dark:border-[#39332d] bg-gradient-to-br from-[#fffdf9] to-[#f3e9df] dark:from-[#211d19] dark:to-[#30241d] p-4">
              <p className="text-xs font-medium text-[#68635d] dark:text-[#c9b9aa]">{metric.label}</p>
              <p className="text-3xl font-bold tracking-tight text-[#241b15] dark:text-[#fffdf9] mt-2">{metric.value.toLocaleString()}</p>
              <p className="text-[11px] text-[#8a7565] dark:text-[#b9aea2] mt-1">{metric.note}</p>
            </div>
          ))}
        </div>
        {projectViews.size > 0 && (
          <div className="rounded-2xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#161616] dark:text-[#fffdf9]">Most viewed projects</h3>
            {Array.from(projectViews.entries()).sort((a, b) => b[1] - a[1]).map(([slug, count]) => (
              <div key={slug} className="flex items-center gap-3 text-xs">
                <span className="flex-1 text-[#4b4742] dark:text-[#d5cdc3]">{readableAction(slug)}</span>
                <div className="w-28 h-1.5 rounded-full bg-[#eee8df] dark:bg-[#302a25] overflow-hidden"><div className="h-full rounded-full bg-[#b98b6e]" style={{ width: `${Math.min(100, count / Math.max(1, ...projectViews.values()) * 100)}%` }} /></div>
                <span className="w-8 text-right font-semibold tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#b98b6e]">Messages from your contact page</p>
            <h2 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9] mt-1">Your inbox</h2>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">Open a message to read it and reply without leaving the dashboard.</p>
          </div>
          <div className="rounded-full px-3.5 py-2 text-xs font-semibold bg-[#f4e4d7] text-[#754b31] dark:bg-[#493021] dark:text-[#f2c9a9]">
            {unreadCount} unread · {messages.length} total
          </div>
        </div>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfc3b7] dark:border-[#39332d] bg-[#fffdf9] dark:bg-[#191816] p-10 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-[#f4e4d7] dark:bg-[#493021] flex items-center justify-center text-[#9b6847]"><Mail className="w-5 h-5" /></div>
              <p className="font-semibold text-sm text-[#161616] dark:text-[#fffdf9] mt-3">Your inbox is clear</p>
              <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">New contact form enquiries will appear here.</p>
            </div>
          ) : messages.map((m) => {
            const expanded = expandedId === m.id;
            const isReplying = replyingId === m.id;
            return (
              <article key={m.id} className={`rounded-2xl border overflow-hidden transition-colors ${m.status === 'unread' ? 'border-[#c89570] dark:border-[#a87654] bg-[#fffaf5] dark:bg-[#241b16] shadow-[0_8px_28px_rgba(128,83,48,0.09)]' : 'border-[#ddd4c9] dark:border-[#39332d] bg-[#fffdf9] dark:bg-[#191816]'}`}>
                <button type="button" onClick={() => { setExpandedId(expanded ? null : m.id); if (!expanded && m.status === 'unread') void updateContactMessageStatus(m.id, 'read'); }} className="w-full text-left p-4 sm:p-5 flex items-start gap-3">
                  <div className={`mt-0.5 w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${m.status === 'unread' ? 'bg-[#f0d9c6] text-[#754b31] dark:bg-[#493021] dark:text-[#f2c9a9]' : 'bg-[#f1ece5] text-[#75695f] dark:bg-[#302a25] dark:text-[#c9b9aa]'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-[#161616] dark:text-[#fffdf9]">{m.senderName}</span>
                      {m.status === 'unread' && <span className="w-2 h-2 rounded-full bg-[#c16f3d]" />}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${m.status === 'unread' ? 'bg-[#f0d9c6] text-[#754b31]' : m.status === 'replied' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-[#eee8df] text-[#6b625a] dark:bg-[#302a25] dark:text-[#d5cdc3]'}`}>{readableAction(m.status)}</span>
                    </div>
                    <p className="text-sm font-semibold text-[#4b4742] dark:text-[#e5ddd4] mt-1 truncate">{m.subject}</p>
                    <p className="text-xs text-[#777067] dark:text-[#b9aea2] mt-1 truncate">{m.message}</p>
                    <p className="text-[11px] text-[#91867c] dark:text-[#9d9186] mt-2">{m.senderEmail} · {readableDate(m.createdAt)}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#9b6847] shrink-0">{expanded ? 'Close' : 'Read message'}</span>
                </button>
                {expanded && (
                  <div className="border-t border-[#e5d8ca] dark:border-[#39332d] p-4 sm:p-5 space-y-4">
                    <div className="rounded-xl bg-[#f7f1ea] dark:bg-[#211d19] p-4">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#9b6847] mb-2">Original message</p>
                      <p className="text-sm leading-7 text-[#302a25] dark:text-[#f0e8df] whitespace-pre-wrap">{m.message}</p>
                    </div>
                    {replySuccess[m.id] && <p className="text-xs text-emerald-700 dark:text-emerald-400">{replySuccess[m.id]}</p>}
                    {replyErrors[m.id] && <p role="alert" className="text-xs text-red-700 dark:text-red-400">{replyErrors[m.id]}</p>}
                    {isReplying ? (
                      <div className="space-y-3">
                        <div className="text-xs text-[#68635d] dark:text-[#b9aea2]">To: <strong>{m.senderName}</strong> · {m.senderEmail}</div>
                        <textarea rows={6} maxLength={5000} value={replyDrafts[m.id] || ''} onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))} placeholder="Write a thoughtful reply…" className="w-full rounded-xl border border-[#c89570] bg-white dark:bg-[#111110] p-4 text-sm text-[#161616] dark:text-[#fffdf9] outline-none focus:ring-2 focus:ring-[#c89570]/30" />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[11px] text-[#91867c]">{(replyDrafts[m.id] || '').length}/5000 characters · Sent by email</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setReplyingId(null)} className="px-4 py-2 rounded-full border border-[#ddd4c9] dark:border-[#39332d] text-xs font-semibold">Cancel</button>
                            <button type="button" disabled={replyBusyId === m.id || (replyDrafts[m.id] || '').trim().length < 2} onClick={() => void sendReply(m)} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#241b15] text-white dark:bg-[#d1a17d] dark:text-[#211811] text-xs font-semibold disabled:opacity-50"><Send className="w-3.5 h-3.5" />{replyBusyId === m.id ? 'Sending…' : 'Send reply'}</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-[11px] text-[#91867c]">Reply will be sent directly to the sender's email address.</span>
                        <button type="button" onClick={() => { setReplyingId(m.id); setReplyErrors((prev) => ({ ...prev, [m.id]: '' })); }} className="inline-flex items-center gap-2 rounded-full bg-[#241b15] text-white dark:bg-[#d1a17d] dark:text-[#211811] px-5 py-2.5 text-xs font-semibold"><Send className="w-3.5 h-3.5" />Reply to enquiry</button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-[#e5d8ca] dark:border-[#39332d] pt-3">
                      <span className="text-[11px] text-[#91867c]">{m.emailDelivered ? 'Original enquiry was forwarded by email' : 'Original enquiry is stored in your private inbox'}</span>
                      <select aria-label="Message status" value={m.status} onChange={(e) => void updateContactMessageStatus(m.id, e.target.value as ContactMessage['status'])} className="rounded-lg border border-[#ddd4c9] dark:border-[#39332d] bg-transparent px-2 py-1.5 text-xs">
                        <option value="unread">Unread</option><option value="read">Read</option><option value="replied">Replied</option><option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#b98b6e]">Account activity</p>
          <h2 className="text-xl font-bold text-[#161616] dark:text-[#fffdf9] mt-1">Audit history</h2>
          <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">A plain-language record of changes made in the admin console.</p>
        </div>
        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#cfc3b7] dark:border-[#39332d] p-7 text-center text-xs text-[#68635d] dark:text-[#b9aea2]">No admin activity has been recorded yet.</div>
          ) : auditLogs.slice(0, 30).map((log) => {
            let details: Record<string, unknown> = {};
            try { details = log.detailsJson ? JSON.parse(log.detailsJson) as Record<string, unknown> : {}; } catch { details = {}; }
            const detailText = Object.entries(details).filter(([key]) => !/token|password|secret/i.test(key)).slice(0, 5).map(([key, value]) => `${readableAction(key)}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
            return (
              <article key={log.id} className="rounded-xl border border-[#ddd4c9] dark:border-[#39332d] bg-[#fffdf9] dark:bg-[#191816] p-4 flex gap-3">
                <div className="w-9 h-9 shrink-0 rounded-xl bg-[#f1e5d9] dark:bg-[#493021] text-[#8e5e3e] flex items-center justify-center"><Activity className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#211b16] dark:text-[#fffdf9]">{log.summary || readableAction(log.action)}</h3>
                    <span className="text-[10px] rounded-full bg-[#eee8df] dark:bg-[#302a25] px-2 py-1 text-[#75695f]">{readableAction(log.action)}</span>
                  </div>
                  <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">{readableAction(log.entityType)} · Record: {log.entityId}</p>
                  {detailText.length > 0 && <ul className="mt-2 space-y-1 text-xs text-[#514941] dark:text-[#d5cdc3] list-disc pl-4">{detailText.map((detail, index) => <li key={index}>{detail}</li>)}</ul>}
                  <p className="text-[11px] text-[#91867c] dark:text-[#9d9186] mt-2">By {log.actorEmail} · {readableDate(log.createdAt)}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

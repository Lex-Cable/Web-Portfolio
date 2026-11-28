import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query,
  serverTimestamp, setDoc, writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

type ModuleDefinition = {
  id: string;
  label: string;
  collection: string;
  description: string;
  starter: Record<string, unknown>;
};

const MODULES: ModuleDefinition[] = [
  { id: 'analytics', label: 'Analytics & visitor intelligence', collection: 'analytics_events', description: 'Privacy-conscious page, project and conversion activity. Visitor identities are not collected.', starter: { eventType: 'page_view', targetSlug: 'home', referrer: '', createdAt: new Date().toISOString() } },
  { id: 'crm', label: 'Contact & opportunity CRM', collection: 'opportunities', description: 'Track enquiries, recruiting conversations, client leads and follow-ups.', starter: { name: '', email: '', organization: '', opportunityType: 'Recruitment', status: 'new', notes: '', followUpAt: '' } },
  { id: 'calendar', label: 'Content publishing calendar', collection: 'content_calendar', description: 'Plan drafts and schedule content. Publishing remains approval-gated.', starter: { title: '', content: '', channel: 'Portfolio', status: 'draft', scheduledAt: '', approved: false } },
  { id: 'health', label: 'Website health & error monitoring', collection: 'system_checks', description: 'Run lightweight checks against the running application and record results.', starter: { check: 'manual', status: 'healthy', message: '', checkedAt: new Date().toISOString() } },
  { id: 'documents', label: 'Professional documents vault', collection: 'professional_documents', description: 'Private document metadata and secure reference links. Do not store passwords or identity secrets here.', starter: { title: '', category: 'CV', fileName: '', secureUrl: '', notes: '', visibility: 'private', expiresAt: '' } },
  { id: 'career', label: 'Career development roadmap', collection: 'career_goals', description: 'Track learning goals, certifications, milestones and progress.', starter: { title: '', category: 'Learning', status: 'planned', targetDate: '', progress: 0, notes: '' } },
  { id: 'case-studies', label: 'Project case studies & milestones', collection: 'project_case_studies', description: 'Record project outcomes, evidence, milestones and measurable impact.', starter: { projectId: '', title: '', problem: '', solution: '', impact: '', milestone: '', status: 'draft', approved: false } },
  { id: 'automation', label: 'Automation centre', collection: 'automation_workflows', description: 'Maintain workflow definitions and execution notes. Secrets remain in server environment variables.', starter: { name: '', trigger: 'manual', enabled: false, approvalRequired: true, description: '', lastRunAt: '', lastStatus: 'never' } },
  { id: 'seo', label: 'SEO management', collection: 'seo_settings', description: 'Manage page metadata, canonical URLs and social previews. Review changes before publishing.', starter: { pagePath: '/', title: '', description: '', canonicalUrl: '', ogImage: '', noIndex: false, approved: false } },
  { id: 'testimonials', label: 'Testimonials manager', collection: 'testimonials', description: 'Collect and moderate recommendations. Nothing is public until approved.', starter: { personName: '', role: '', organization: '', quote: '', source: '', status: 'pending', approved: false } },
  { id: 'backups', label: 'Backup & restore', collection: 'admin_backups', description: 'Export portfolio and admin records to JSON, then restore a validated backup.', starter: { label: 'Manual backup', createdAt: new Date().toISOString(), formatVersion: 1 } },
  { id: 'history', label: 'Change history & version comparison', collection: 'content_versions', description: 'Store snapshots of content changes for comparison and recovery.', starter: { entityType: 'profile', entityId: 'profile', versionLabel: '', contentJson: '{}', changeNote: '' } },
  { id: 'accessibility', label: 'Accessibility checker', collection: 'accessibility_reviews', description: 'Track manual accessibility reviews and issues to resolve.', starter: { pagePath: '/', criterion: 'Image alternative text', status: 'needs-review', notes: '', reviewedAt: new Date().toISOString() } },
  { id: 'newsletter', label: 'Newsletter management', collection: 'newsletter_subscribers', description: 'Manage opt-in subscribers, consent timestamps and unsubscribe status.', starter: { email: '', name: '', consent: false, consentAt: '', status: 'pending' } },
  { id: 'privacy', label: 'Privacy centre', collection: 'privacy_settings', description: 'Maintain retention, analytics and privacy policy settings.', starter: { analyticsEnabled: true, retentionDays: 180, anonymizeAnalytics: true, cookieNoticeEnabled: true, privacyPolicyVersion: '1.0', updatedAt: new Date().toISOString() } },
];

const EXPORT_COLLECTIONS = [
  'portfolio_public', 'projects', 'skills', 'experiences', 'education',
  'pending_approvals', 'audit_logs', 'cv_versions', 'github_settings',
  'contact_messages', 'analytics_events', ...MODULES.map((m) => m.collection),
];

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function downloadJson(name: string, value: unknown) {
  const blob = new Blob([pretty(value)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdminExpansionPanel() {
  const [activeId, setActiveId] = useState(MODULES[0].id);
  const [records, setRecords] = useState<Array<{ id: string; data: Record<string, unknown> }>>([]);
  const [draft, setDraft] = useState(pretty(MODULES[0].starter));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [restoreText, setRestoreText] = useState('');

  const active = useMemo(() => MODULES.find((item) => item.id === activeId) || MODULES[0], [activeId]);

  const loadRecords = useCallback(async () => {
    setBusy(true);
    setMessage('');
    try {
      const q = query(collection(db, active.collection), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setRecords(snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> })));
    } catch (error) {
      // Some module records use updatedAt or have no createdAt; retry without ordering.
      try {
        const snap = await getDocs(query(collection(db, active.collection), limit(100)));
        setRecords(snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> })));
      } catch (retryError) {
        setRecords([]);
        setMessage(retryError instanceof Error ? retryError.message : String(error));
      }
    } finally {
      setBusy(false);
    }
  }, [active]);

  useEffect(() => {
    setDraft(pretty(active.starter));
    setEditingId(null);
    void loadRecords();
  }, [active, loadRecords]);

  const saveRecord = async () => {
    if (!auth.currentUser) return;
    setBusy(true);
    setMessage('');
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('A record must be a JSON object.');
      const payload = { ...parsed, updatedAt: serverTimestamp(), ...(editingId ? {} : { createdAt: serverTimestamp() }) };
      if (editingId) await setDoc(doc(db, active.collection, editingId), payload, { merge: true });
      else await addDoc(collection(db, active.collection), payload);
      setMessage('Record saved.');
      setDraft(pretty(active.starter));
      setEditingId(null);
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save record.');
    } finally {
      setBusy(false);
    }
  };

  const removeRecord = async (id: string) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      await deleteDoc(doc(db, active.collection, id));
      setMessage('Record deleted.');
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete record.');
    }
  };

  const runHealthCheck = async () => {
    setBusy(true);
    try {
      const started = Date.now();
      const response = await fetch('/api/health', { cache: 'no-store' });
      const payload = await response.json() as Record<string, unknown>;
      const result = { ...payload, httpStatus: response.status, responseTimeMs: Date.now() - started, checkedAt: new Date().toISOString() };
      setHealth(result);
      await addDoc(collection(db, 'system_checks'), { check: 'application-health', status: response.ok ? 'healthy' : 'degraded', message: pretty(result), checkedAt: serverTimestamp(), createdAt: serverTimestamp() });
      await loadRecords();
    } catch (error) {
      setHealth({ status: 'unavailable', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      const backup: Record<string, unknown> = { format: 'web-portfolio-backup', version: 1, exportedAt: new Date().toISOString(), collections: {} };
      const data: Record<string, Array<{ id: string; data: Record<string, unknown> }>> = {};
      for (const name of EXPORT_COLLECTIONS) {
        const snap = await getDocs(query(collection(db, name), limit(500)));
        data[name] = snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> }));
      }
      backup.collections = data;
      downloadJson(`web-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
      await addDoc(collection(db, 'admin_backups'), { label: 'Exported JSON backup', createdAt: serverTimestamp(), collections: EXPORT_COLLECTIONS.length, recordCount: Object.values(data).reduce((sum, rows) => sum + rows.length, 0) });
      setMessage('Backup exported. Keep the downloaded file in a secure location.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backup export failed.');
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async () => {
    setBusy(true);
    setMessage('');
    try {
      const backup = JSON.parse(restoreText) as { format?: string; version?: number; collections?: Record<string, Array<{ id: string; data: Record<string, unknown> }>> };
      if (backup.format !== 'web-portfolio-backup' || backup.version !== 1 || !backup.collections) throw new Error('This is not a supported Web Portfolio backup.');
      const allowed = new Set(EXPORT_COLLECTIONS);
      for (const [name, rows] of Object.entries(backup.collections)) {
        if (!allowed.has(name) || !Array.isArray(rows)) throw new Error(`Unsupported collection: ${name}`);
        for (let offset = 0; offset < rows.length; offset += 400) {
          const batch = writeBatch(db);
          for (const row of rows.slice(offset, offset + 400)) {
            if (!row.id || !row.data || typeof row.data !== 'object') throw new Error(`Invalid record in ${name}`);
            batch.set(doc(db, name, row.id), row.data, { merge: true });
          }
          await batch.commit();
        }
      }
      setMessage('Restore completed. Existing records were merged; records absent from the backup were not deleted.');
      setRestoreText('');
      await loadRecords();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Restore failed.');
    } finally {
      setBusy(false);
    }
  };

  const useStarter = () => {
    setEditingId(null);
    setDraft(pretty(active.starter));
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {MODULES.map((item) => (
          <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`text-left rounded-2xl border p-4 transition-colors ${activeId === item.id ? 'border-[#b98b6e] bg-[#f4eee7] dark:bg-[#24211e]' : 'border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] hover:border-[#b98b6e]'}`}>
            <span className="block text-xs font-bold text-[#161616] dark:text-[#fffdf9]">{item.label}</span>
            <span className="block mt-1 text-[11px] text-[#68635d] dark:text-[#b9aea2]">{item.description}</span>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#191816] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">{active.label}</h2>
            <p className="text-xs text-[#68635d] dark:text-[#b9aea2] mt-1">{active.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {active.id === 'backups' && <button type="button" onClick={exportBackup} disabled={busy} className="px-4 py-2 rounded-full bg-[#161616] text-white text-xs font-semibold disabled:opacity-50">Export backup</button>}
            {active.id === 'health' && <button type="button" onClick={runHealthCheck} disabled={busy} className="px-4 py-2 rounded-full bg-[#161616] text-white text-xs font-semibold disabled:opacity-50">Run health check</button>}
            <button type="button" onClick={loadRecords} disabled={busy} className="px-4 py-2 rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-xs font-semibold">Refresh</button>
          </div>
        </div>

        {active.id === 'analytics' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Events', records.length],
              ['Page views', records.filter((r) => r.data.eventType === 'page_view').length],
              ['Project views', records.filter((r) => r.data.eventType === 'project_view').length],
              ['CV downloads', records.filter((r) => r.data.eventType === 'cv_download').length],
            ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#f7f3ed] dark:bg-[#111110] p-3"><p className="text-[11px] text-[#68635d] dark:text-[#b9aea2]">{label}</p><p className="text-xl font-bold text-[#161616] dark:text-[#fffdf9]">{value}</p></div>)}
          </div>
        )}

        {active.id === 'health' && health && <pre className="overflow-auto rounded-xl bg-[#f7f3ed] dark:bg-[#111110] p-3 text-[11px]">{pretty(health)}</pre>}

        {active.id === 'backups' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">Restore from a previously exported JSON backup</label>
            <textarea value={restoreText} onChange={(event) => setRestoreText(event.target.value)} rows={6} placeholder="Paste the contents of your backup JSON file here…" className="w-full rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110] p-3 text-xs font-mono" />
            <button type="button" onClick={restoreBackup} disabled={busy || !restoreText.trim()} className="px-4 py-2 rounded-full border border-[#b98b6e] text-xs font-semibold disabled:opacity-50">Restore (merge only)</button>
          </div>
        )}

        {active.id === 'documents' && <p className="text-xs text-[#8b5e34] dark:text-[#d9ad7e]">Store metadata and secure document references here. Actual private file storage is not enabled by this module; avoid public URLs for sensitive documents.</p>}
        {active.id === 'newsletter' && <p className="text-xs text-[#8b5e34] dark:text-[#d9ad7e]">Only add people who explicitly opted in. This manager does not send campaigns or subscribe visitors automatically.</p>}
        {active.id === 'testimonials' && <p className="text-xs text-[#8b5e34] dark:text-[#d9ad7e]">Set approved to true only after obtaining permission to publish the person's words and attribution.</p>}
        {active.id === 'calendar' && <p className="text-xs text-[#8b5e34] dark:text-[#d9ad7e]">Scheduling is a planning workflow. It does not publish automatically; approved publishing needs a separate deployment integration.</p>}

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-2">
              <label className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">{editingId ? `Edit record · ${editingId}` : 'New record / JSON editor'}</label>
              <button type="button" onClick={useStarter} className="text-[11px] underline text-[#8b5e34]">Reset template</button>
            </div>
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={15} spellCheck={false} className="w-full rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] bg-[#f7f3ed] dark:bg-[#111110] p-3 text-[11px] font-mono text-[#161616] dark:text-[#f7f3ed]" />
            <button type="button" onClick={saveRecord} disabled={busy} className="px-5 py-2.5 rounded-full bg-[#161616] dark:bg-[#b98b6e] text-white dark:text-[#161616] text-xs font-semibold disabled:opacity-50">{busy ? 'Saving…' : editingId ? 'Update record' : 'Create record'}</button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><label className="text-xs font-semibold text-[#161616] dark:text-[#fffdf9]">Saved records ({records.length})</label><span className="text-[10px] text-[#68635d] dark:text-[#b9aea2]">Latest 100</span></div>
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {records.map((record) => (
                <div key={record.id} className="rounded-xl border border-[#ddd4c9] dark:border-[#2c2925] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => { setEditingId(record.id); setDraft(pretty(record.data)); }} className="text-left min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-[#161616] dark:text-[#fffdf9] truncate">{String(record.data.title || record.data.name || record.data.label || record.data.email || record.data.pagePath || record.id)}</span>
                      <span className="block text-[10px] text-[#68635d] dark:text-[#b9aea2] truncate">{record.id}</span>
                      <span className="block mt-1 text-[10px] text-[#68635d] dark:text-[#b9aea2]">{String(record.data.status || record.data.statusLabel || '')}</span>
                    </button>
                    <button type="button" onClick={() => void removeRecord(record.id)} className="text-[11px] text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
              ))}
              {!records.length && <p className="text-xs text-[#68635d] dark:text-[#b9aea2] py-6 text-center">{busy ? 'Loading records…' : 'No records yet.'}</p>}
            </div>
          </div>
        </div>
        {message && <p role="status" className="text-xs text-[#8b5e34] dark:text-[#d9ad7e]">{message}</p>}
      </section>
    </div>
  );
}

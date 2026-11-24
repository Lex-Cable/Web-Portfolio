import React, { useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Github, Linkedin, Mail, Send } from 'lucide-react';
import type { PortfolioProfile } from '../types/portfolio';
import { saveContactMessageToFirestore, trackAnalyticsEvent } from '../services/portfolioDb';
import { extractApiError, safeParseJsonResponse } from '../utils/safeFetchJson';

interface ContactSectionProps {
  profile: PortfolioProfile;
}

export function ContactSection({ profile }: ContactSectionProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const formStartRef = useRef<number>(Date.now());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNote(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          website: honeypot,
          startedAt: formStartRef.current,
        }),
      });

      const parsed = await safeParseJsonResponse<{
        error?: string;
        emailDelivered?: boolean;
        note?: string;
      }>(res);

      const data = parsed.data;
      if (!res.ok || !data) {
        throw new Error(extractApiError(parsed, 'Unable to submit contact message.'));
      }

      await saveContactMessageToFirestore({
        senderName: name,
        senderEmail: email,
        subject,
        message,
        emailDelivered: Boolean(data.emailDelivered),
      });

      void trackAnalyticsEvent('contact_submit', 'contact_form');

      setSuccessNote(
        data.emailDelivered
          ? 'Your message has been sent and an acknowledgement email has been dispatched.'
          : 'Your message has been received and stored in Jacinta’s private portfolio inbox.'
      );
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      formStartRef.current = Date.now();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-14 space-y-12">
      <header className="space-y-4 border-b border-[#ddd4c9] dark:border-[#2c2925] pb-8">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[#b98b6e]">
          Contact
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#161616] dark:text-[#fffdf9] text-balance">
          Start a Conversation
        </h1>
        <p className="text-sm sm:text-base text-[#68635d] dark:text-[#b9aea2] max-w-2xl">
          Open to software engineering roles, technical internships, and collaborative development projects.
        </p>
      </header>

      <div className="grid lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-5 space-y-6">
          <div className="bg-[#f7f3ed] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-bold text-[#161616] dark:text-[#fffdf9]">
              Direct Channels
            </h2>

            <div className="space-y-4 text-sm">
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center justify-between gap-3 text-[#4b4742] dark:text-[#d5cdc3] hover:text-[#b98b6e]"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#b98b6e]" />
                  <span>{profile.email}</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#68635d]" />
              </a>

              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 text-[#4b4742] dark:text-[#d5cdc3] hover:text-[#b98b6e]"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Linkedin className="w-4 h-4 text-[#b98b6e]" />
                  <span>LinkedIn</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#68635d]" />
              </a>

              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 text-[#4b4742] dark:text-[#d5cdc3] hover:text-[#b98b6e]"
              >
                <span className="inline-flex items-center gap-2.5">
                  <Github className="w-4 h-4 text-[#b98b6e]" />
                  <span>GitHub (@{profile.githubUsername})</span>
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-[#68635d]" />
              </a>

              <a
                href={profile.devtoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 text-[#4b4742] dark:text-[#d5cdc3] hover:text-[#b98b6e]"
              >
                <span>Dev.to (@lexcable)</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#68635d]" />
              </a>

              <a
                href={profile.mastodonHandle}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 text-[#4b4742] dark:text-[#d5cdc3] hover:text-[#b98b6e]"
              >
                <span>Mastodon (@lex_Cab23)</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#68635d]" />
              </a>

              <div className="flex items-center justify-between gap-3 text-[#68635d] dark:text-[#b9aea2]">
                <span>Bluesky</span>
                <span className="font-mono-tabular text-xs">{profile.blueskyHandle}</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-[#fffdf9] dark:bg-[#191816] border border-[#ddd4c9] dark:border-[#2c2925] rounded-2xl p-6 sm:p-8 space-y-5"
          >
            <h2 className="text-lg font-bold text-[#161616] dark:text-[#fffdf9]">
              Send a Message
            </h2>

            <div className="hidden" aria-hidden="true">
              <label htmlFor="contact-website">Website</label>
              <input
                id="contact-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="contact-name"
                  className="block text-xs font-semibold text-[#4b4742] dark:text-[#d5cdc3]"
                >
                  Your Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#ddd4c9] dark:border-[#3d3832] bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#fffdf9] focus:outline-none focus:ring-2 focus:ring-[#b98b6e]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="contact-email"
                  className="block text-xs font-semibold text-[#4b4742] dark:text-[#d5cdc3]"
                >
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  maxLength={160}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#ddd4c9] dark:border-[#3d3832] bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#fffdf9] focus:outline-none focus:ring-2 focus:ring-[#b98b6e]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="contact-subject"
                className="block text-xs font-semibold text-[#4b4742] dark:text-[#d5cdc3]"
              >
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                required
                minLength={2}
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Full-Stack Developer Opportunity"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#ddd4c9] dark:border-[#3d3832] bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#fffdf9] focus:outline-none focus:ring-2 focus:ring-[#b98b6e]"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="contact-message"
                className="block text-xs font-semibold text-[#4b4742] dark:text-[#d5cdc3]"
              >
                Message
              </label>
              <textarea
                id="contact-message"
                required
                minLength={5}
                maxLength={4000}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share details about the role, project scope, or collaboration…"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#ddd4c9] dark:border-[#3d3832] bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#fffdf9] focus:outline-none focus:ring-2 focus:ring-[#b98b6e]"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-[#fddbd7] dark:bg-[#491410] border border-[#b42318]/40 text-xs text-[#641b16] dark:text-[#fddbd7]"
              >
                {error}
              </div>
            )}

            {successNote && (
              <div
                role="status"
                className="p-3.5 rounded-lg bg-[#dcefe4] dark:bg-[#173d2b] border border-[#2f6b4f]/30 text-xs text-[#173d2b] dark:text-[#dcefe4] flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successNote}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Sending…' : 'Send Message'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

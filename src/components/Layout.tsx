import React, { useState } from 'react';
import { Menu, Moon, Sun, X, ArrowUpRight, Lock } from 'lucide-react';
import type { PortfolioProfile } from '../types/portfolio';

interface LayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  profile: PortfolioProfile;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isAdmin: boolean;
  pendingCount: number;
  children: React.ReactNode;
}

const NAV_LINKS = [
  { label: 'About', path: '/about' },
  { label: 'Capabilities', path: '/skills' },
  { label: 'Projects', path: '/projects' },
  { label: 'GitHub', path: '/github' },
  { label: 'GitLab', path: '/gitlab' },
  { label: 'Business & Management', path: '/business-management' },
  { label: 'Experience', path: '/experience' },
];

export function Layout({
  currentPath,
  onNavigate,
  profile,
  darkMode,
  onToggleDarkMode,
  isAdmin,
  pendingCount,
  children,
}: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fffdf9] dark:bg-[#111110] text-[#161616] dark:text-[#f7f3ed] transition-colors duration-200">
      {/* Nova Astro Inspired 3-Zone Editorial Top Bar */}
      <header className="sticky top-0 z-40 bg-[#fffdf9]/92 dark:bg-[#111110]/92 backdrop-blur-md border-b border-[#ddd4c9]/70 dark:border-[#2c2925]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-18 flex items-center justify-between gap-8">
          {/* Zone 1: Tracked Wordmark */}
          <a
            href="/"
            onClick={(e) => handleNav(e, '/')}
            className="text-sm sm:text-base font-bold tracking-[0.16em] uppercase text-[#161616] dark:text-[#fffdf9] whitespace-nowrap shrink-0"
          >
            Jacinta Waweru
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-5 lg:gap-7 text-[15px] font-semibold text-[#68635d] dark:text-[#b9aea2]"
          >
            {NAV_LINKS.map((item) => {
              const active =
                currentPath === item.path ||
                (item.path === '/projects' && currentPath.startsWith('/projects/'));
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleNav(e, item.path)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'text-[#161616] dark:text-[#fffdf9] border-[#b98b6e]'
                      : 'border-transparent hover:text-[#161616] dark:hover:text-[#fffdf9] hover:border-[#b98b6e]/50'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/contact"
              onClick={(e) => handleNav(e, '/contact')}
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-full bg-[#161616] dark:bg-[#b98b6e] text-[#fffdf9] dark:text-[#161616] hover:bg-[#2d2b28] dark:hover:bg-[#caa288] transition-colors whitespace-nowrap shrink-0"
            >
              Contact Me
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#ddd4c9] dark:border-[#2c2925] text-[#161616] dark:text-[#fffdf9] hover:bg-[#f4f0e9] dark:hover:bg-[#1c1a17]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#ddd4c9] dark:border-[#2c2925] bg-[#fffdf9] dark:bg-[#111110] px-5 py-5 space-y-1">
            <a
              href="/"
              onClick={(e) => handleNav(e, '/')}
              className="block py-2.5 text-sm font-semibold text-[#161616] dark:text-[#fffdf9]"
            >
              Home
            </a>
            {NAV_LINKS.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className="block py-2.5 text-sm font-semibold text-[#161616] dark:text-[#fffdf9]"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/contact"
              onClick={(e) => handleNav(e, '/contact')}
              className="block py-2.5 text-sm font-semibold text-[#b98b6e]"
            >
              Contact Me
            </a>
            <div className="pt-3 mt-3 border-t border-[#ddd4c9] dark:border-[#2c2925] flex items-center justify-between">
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="inline-flex items-center gap-2 py-2 text-xs font-medium text-[#68635d] dark:text-[#b9aea2]"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>{darkMode ? 'Light surface' : 'Dark surface'}</span>
              </button>
              <a
                href="/admin"
                onClick={(e) => handleNav(e, '/admin')}
                className="inline-flex items-center gap-1.5 py-2 text-xs font-semibold text-[#161616] dark:text-[#fffdf9]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin</span>
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Nova Astro Dark Editorial Footer */}
      <footer className="bg-[#161616] text-[#fffdf9] mt-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-14 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-b border-white/10 pb-10">
            <div className="space-y-2 max-w-lg">
              <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#b98b6e]">
                {profile.title}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fffdf9]">
                {profile.name}
              </h2>
              <p className="text-sm text-[#b9aea2]">
                {profile.location} · Open to software engineering roles, internships, and collaborative builds.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/contact"
                onClick={(e) => handleNav(e, '/contact')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full bg-[#b98b6e] text-[#161616] hover:bg-[#caa288] transition-colors"
              >
                <span>Start a Conversation</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#b9aea2]">
            <p>© {new Date().getFullYear()} {profile.name} · GitHub @{profile.githubUsername}</p>

            <div className="flex flex-wrap items-center gap-5 font-medium">
              <a
                href={profile.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[#b98b6e] transition-colors"
              >
                <span>GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://gitlab.com/lex_cab23"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[#b98b6e] transition-colors"
              >
                <span>GitLab</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <a
                href={profile.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[#b98b6e] transition-colors"
              >
                <span>LinkedIn</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <a
                href={profile.devtoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-[#b98b6e] transition-colors"
              >
                <span>Dev.to</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
              <span className="text-white/20" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="inline-flex items-center gap-1.5 hover:text-[#b98b6e] transition-colors"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <a
                href="/admin"
                onClick={(e) => handleNav(e, '/admin')}
                className="inline-flex items-center gap-1.5 hover:text-[#b98b6e] transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {isAdmin
                    ? `Admin Console${pendingCount > 0 ? ` (${pendingCount} pending)` : ''}`
                    : 'Admin'}
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

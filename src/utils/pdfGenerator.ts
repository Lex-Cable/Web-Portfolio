import type {
  Education,
  Experience,
  GithubSnapshot,
  GitlabSnapshot,
  PortfolioProfile,
  Project,
  Skill,
  SkillCategory,
} from '../types/portfolio';

export interface PortfolioCvInput {
  profile: PortfolioProfile;
  projects: Project[];
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  githubSnapshot?: GithubSnapshot | null;
  gitlabSnapshot?: GitlabSnapshot | null;
}

interface PdfLinkAnnotation {
  x: number;
  y: number; // bottom-left y
  w: number;
  h: number;
  url: string;
}

interface PdfPage {
  commands: string[];
  links: PdfLinkAnnotation[];
}

// Nova Astro RGB palette (0..1 floats)
const COLOR = {
  ivory: [1.0, 0.992, 0.976] as const, // #fffdf9
  stone: [0.969, 0.953, 0.929] as const, // #f7f3ed
  stoneDeep: [0.957, 0.941, 0.914] as const, // #f4f0e9
  border: [0.867, 0.831, 0.788] as const, // #ddd4c9
  borderSoft: [0.933, 0.910, 0.875] as const, // #eee8df
  obsidian: [0.086, 0.086, 0.086] as const, // #161616
  body: [0.294, 0.278, 0.259] as const, // #4b4742
  muted: [0.408, 0.388, 0.365] as const, // #68635d
  copper: [0.725, 0.545, 0.431] as const, // #b98b6e
  white: [1, 1, 1] as const,
};

type Rgb = readonly [number, number, number];

function rgbFill(c: Rgb): string {
  return `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} rg`;
}

function rgbStroke(c: Rgb): string {
  return `${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(3)} RG`;
}

function toPdfAscii(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, '*')
    .replace(/\u00B7/g, '|')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function escapePdfString(text: string): string {
  return toPdfAscii(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

// Approximate Helvetica character width ratio per em for accurate box wrapping
function estimateCharEmWidth(ch: string, bold: boolean): number {
  const factor = bold ? 1.06 : 1.0;
  if (ch === ' ') return 0.28 * factor;
  if ('iIljtf!|.,:;\'"`'.includes(ch)) return 0.27 * factor;
  if ('r-()[]/\\'.includes(ch)) return 0.35 * factor;
  if ('mwMW@%&'.includes(ch)) return 0.86 * factor;
  if (ch >= 'A' && ch <= 'Z') return 0.69 * factor;
  if (ch >= '0' && ch <= '9') return 0.56 * factor;
  return 0.53 * factor;
}

function measureTextWidth(text: string, fontSize: number, bold = false): number {
  const ascii = toPdfAscii(text);
  let ems = 0;
  for (let i = 0; i < ascii.length; i++) {
    ems += estimateCharEmWidth(ascii[i], bold);
  }
  return ems * fontSize;
}

function wrapTextToWidth(text: string, maxWidthPt: number, fontSize: number, bold = false): string[] {
  const paragraphs = text.split(/\r?\n/);
  const result: string[] = [];

  for (const para of paragraphs) {
    const normalized = toPdfAscii(para).replace(/\s+/g, ' ').trim();
    if (!normalized) {
      result.push('');
      continue;
    }
    const words = normalized.split(' ');
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureTextWidth(candidate, fontSize, bold) <= maxWidthPt) {
        current = candidate;
      } else {
        if (current) {
          result.push(current);
          current = '';
        }
        // Handle overly long single token (like URLs)
        if (measureTextWidth(word, fontSize, bold) > maxWidthPt) {
          let chunk = '';
          for (let i = 0; i < word.length; i++) {
            const nextChunk = chunk + word[i];
            if (measureTextWidth(nextChunk, fontSize, bold) <= maxWidthPt) {
              chunk = nextChunk;
            } else {
              if (chunk) result.push(chunk);
              chunk = word[i];
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) result.push(current);
  }

  return result;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const CAPABILITY_ORDER: Array<{
  num: string;
  category: SkillCategory;
  title: string;
}> = [
  { num: '01.', category: 'Frontend Development', title: 'Frontend Engineering' },
  { num: '02.', category: 'Backend Development', title: 'Backend & API Systems' },
  { num: '03.', category: 'Databases', title: 'Data Modeling & Persistence' },
  { num: '04.', category: 'Development Tools and DevOps', title: 'Git, CI/CD & DevOps' },
  { num: '05.', category: 'Other Technologies', title: 'Core Protocols & Systems' },
  { num: '06.', category: 'Additional Learning Interests', title: 'Applied AI & Cloud Architecture' },
];

const SITE_LINKS_EXTRACTION: Array<{ name: string; url: string; patterns: string[] }> = [
  { name: 'Weego', url: 'https://weego.co.ke', patterns: ['weego.co.ke'] },
  { name: 'Viusasa', url: 'https://viusasa.com/', patterns: ['viusasa.com'] },
  { name: 'Talent Bridge', url: 'https://talentbridgekenya.com/', patterns: ['talentbridgekenya.com'] },
  { name: 'Citizen Duka', url: 'https://viusasa.com/citizen-duka', patterns: ['viusasa.com/citizen-duka'] },
];

function extractLiveSites(exp: Experience): Array<{ name: string; url: string }> {
  const combined = `${exp.summary} ${exp.highlights.join(' ')}`.toLowerCase();
  return SITE_LINKS_EXTRACTION.filter((site) => {
    if (site.name === 'Viusasa') {
      return /(?:^|[^a-z])viusasa\.com(?:\/(?![a-z])|[^a-z/]|$)/i.test(combined);
    }
    return site.patterns.some((p) => combined.includes(p));
  }).map(({ name, url }) => ({ name, url }));
}

/**
 * Generates a dynamic, multi-page Nova Astro editorial CV PDF matching the exact
 * visual styling, color hierarchy, and section arrangement of the web portfolio.
 */
export function generatePortfolioCvPdfBase64(params: PortfolioCvInput): string {
  const {
    profile,
    projects,
    skills,
    experiences,
    education,
    githubSnapshot,
    gitlabSnapshot,
  } = params;

  const PAGE_W = 595.28; // A4 width in pt
  const PAGE_H = 841.89; // A4 height in pt
  const MARGIN = 36;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const TOP_Y = PAGE_H - 42;
  const BOTTOM_Y = 46;

  const pages: PdfPage[] = [];
  let page: PdfPage = { commands: [], links: [] };
  let y = TOP_Y;

  const initPageSurface = (p: PdfPage, isFirst: boolean) => {
    // Ivory page background (#fffdf9)
    p.commands.push(`${rgbFill(COLOR.ivory)} 0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)} re f`);
    if (isFirst) {
      // Top obsidian accent bar matching Layout header contrast
      p.commands.push(`${rgbFill(COLOR.obsidian)} 0 ${(PAGE_H - 6).toFixed(2)} ${PAGE_W.toFixed(2)} 6 re f`);
    } else {
      // Subtle continuation masthead on pages 2+
      p.commands.push(`${rgbFill(COLOR.copper)} 0 ${(PAGE_H - 3).toFixed(2)} ${PAGE_W.toFixed(2)} 3 re f`);
    }
  };

  initPageSurface(page, true);

  const newPage = () => {
    pages.push(page);
    page = { commands: [], links: [] };
    initPageSurface(page, false);
    y = PAGE_H - 38;
    // Compact continuation header
    drawText(profile.name.toUpperCase(), MARGIN, y, 7.5, true, COLOR.obsidian);
    drawText(
      `${profile.title} | ${profile.location}`,
      PAGE_W - MARGIN - measureTextWidth(`${profile.title} | ${profile.location}`, 7.5, false),
      y,
      7.5,
      false,
      COLOR.muted
    );
    y -= 8;
    drawLine(MARGIN, y, PAGE_W - MARGIN, y, COLOR.border, 0.6);
    y -= 18;
  };

  const ensureSpace = (neededPt: number) => {
    if (y - neededPt < BOTTOM_Y) {
      newPage();
    }
  };

  const drawRect = (
    x: number,
    bottomY: number,
    w: number,
    h: number,
    fillColor?: Rgb,
    strokeColor?: Rgb,
    lineWidth = 0.65
  ) => {
    if (fillColor && strokeColor) {
      page.commands.push(
        `${lineWidth.toFixed(2)} w ${rgbFill(fillColor)} ${rgbStroke(strokeColor)} ${x.toFixed(2)} ${bottomY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`
      );
    } else if (fillColor) {
      page.commands.push(
        `${rgbFill(fillColor)} ${x.toFixed(2)} ${bottomY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
      );
    } else if (strokeColor) {
      page.commands.push(
        `${lineWidth.toFixed(2)} w ${rgbStroke(strokeColor)} ${x.toFixed(2)} ${bottomY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`
      );
    }
  };

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Rgb = COLOR.border,
    width = 0.65
  ) => {
    page.commands.push(
      `${width.toFixed(2)} w ${rgbStroke(color)} ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    );
  };

  const drawText = (
    text: string,
    x: number,
    baselineY: number,
    size: number,
    bold = false,
    color: Rgb = COLOR.obsidian,
    linkUrl?: string
  ) => {
    const clean = toPdfAscii(text);
    if (!clean.trim()) return;
    const font = bold ? '/F2' : '/F1';
    page.commands.push(
      `BT ${font} ${size.toFixed(2)} Tf ${rgbFill(color)} ${x.toFixed(2)} ${baselineY.toFixed(2)} Td (${escapePdfString(clean)}) Tj ET`
    );
    if (linkUrl) {
      const normalized = normalizeUrl(linkUrl);
      if (normalized) {
        page.links.push({
          x,
          y: baselineY - 2,
          w: Math.max(20, measureTextWidth(clean, size, bold)),
          h: size + 4,
          url: normalized,
        });
      }
    }
  };

  const drawSectionHeader = (eyebrow: string, heading: string, rightNote?: string) => {
    ensureSpace(44);
    drawText(eyebrow.toUpperCase(), MARGIN, y, 7.5, true, COLOR.copper);
    y -= 14;
    drawText(heading, MARGIN, y, 13.5, true, COLOR.obsidian);
    if (rightNote) {
      const noteW = measureTextWidth(rightNote, 8, false);
      drawText(rightNote, PAGE_W - MARGIN - noteW, y + 1, 8, false, COLOR.muted);
    }
    y -= 7;
    drawLine(MARGIN, y, PAGE_W - MARGIN, y, COLOR.border, 0.7);
    y -= 13;
  };

  const publicProjects = [...projects]
    .filter((p) => p.isPublic)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const publicSkills = skills.filter((s) => s.isPublic);
  const publicExperiences = [...experiences]
    .filter((e) => e.isPublic)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const publicEducation = [...education]
    .filter((e) => e.isPublic)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // =========================================================================
  // 1. TOP WORDMARK & SPLIT HERO CARD (Mirrors Layout Header + HomeSection Hero)
  // =========================================================================
  drawText('JACINTA WAWERU', MARGIN, y, 10, true, COLOR.obsidian);
  const navRightText = 'FULL-STACK DEVELOPER  |  NAIROBI, KENYA';
  drawText(
    navRightText,
    PAGE_W - MARGIN - measureTextWidth(navRightText, 7.5, true),
    y + 1,
    7.5,
    true,
    COLOR.copper
  );
  y -= 8;
  drawLine(MARGIN, y, PAGE_W - MARGIN, y, COLOR.border, 0.7);
  y -= 12;

  // Measure Hero Card height dynamically
  const heroPadX = 16;
  const heroInnerW = CONTENT_W - heroPadX * 2;
  const headlineLines = wrapTextToWidth(profile.headline, heroInnerW, 15.5, true);
  const shortBioLines = wrapTextToWidth(profile.shortBio, heroInnerW, 8.8, false);

  const heroLinks: Array<{ label: string; text: string; url: string }> = [
    { label: 'Email:', text: profile.email, url: `mailto:${profile.email}` },
    { label: 'GitHub:', text: `github.com/${profile.githubUsername}`, url: profile.githubUrl },
    { label: 'GitLab:', text: `gitlab.com/${gitlabSnapshot?.username || 'lex_cab23'}`, url: gitlabSnapshot?.profileUrl || 'https://gitlab.com/lex_cab23' },
    { label: 'LinkedIn:', text: 'linkedin.com/in/jacinta-wambui-3b4696318', url: profile.linkedinUrl },
    { label: 'Dev.to:', text: 'dev.to/lexcable', url: profile.devtoUrl },
  ];

  const heroBoxH =
    16 + // top padding
    11 + // eyebrow
    headlineLines.length * 18.5 +
    6 +
    shortBioLines.length * 12 +
    12 + // divider + gap
    28 + // 2 rows of links
    12;

  const heroBottomY = y - heroBoxH;
  drawRect(MARGIN, heroBottomY, CONTENT_W, heroBoxH, COLOR.stone, COLOR.border, 0.75);

  let hy = y - 18;
  drawText(`${profile.name}  |  ${profile.title.toUpperCase()}  |  ${profile.location.toUpperCase()}`, MARGIN + heroPadX, hy, 7.5, true, COLOR.copper);
  hy -= 18;

  for (const hl of headlineLines) {
    drawText(hl, MARGIN + heroPadX, hy, 15, true, COLOR.obsidian);
    hy -= 18;
  }
  hy -= 2;

  for (const bl of shortBioLines) {
    drawText(bl, MARGIN + heroPadX, hy, 8.8, false, COLOR.body);
    hy -= 12;
  }
  hy -= 4;
  drawLine(MARGIN + heroPadX, hy, PAGE_W - MARGIN - heroPadX, hy, COLOR.border, 0.55);
  hy -= 12;

  // Render hero links across 2 tidy rows
  const row1 = heroLinks.slice(0, 3);
  const row2 = heroLinks.slice(3);
  let lx = MARGIN + heroPadX;
  for (const item of row1) {
    drawText(item.label, lx, hy, 7.8, true, COLOR.muted);
    lx += measureTextWidth(item.label, 7.8, true) + 3;
    drawText(item.text, lx, hy, 7.8, true, COLOR.obsidian, item.url);
    lx += measureTextWidth(item.text, 7.8, true) + 14;
  }
  hy -= 12;
  lx = MARGIN + heroPadX;
  for (const item of row2) {
    drawText(item.label, lx, hy, 7.8, true, COLOR.muted);
    lx += measureTextWidth(item.label, 7.8, true) + 3;
    drawText(item.text, lx, hy, 7.8, true, COLOR.obsidian, item.url);
    lx += measureTextWidth(item.text, 7.8, true) + 14;
  }

  y = heroBottomY - 10;

  // 4-Column Verified Snapshot Strip (Mirrors HomeSection strip below hero)
  const stripMetrics = [
    { label: 'Engineering Discipline', value: 'Full-Stack Web Development' },
    {
      label: 'Public GitHub Repositories',
      value: `${githubSnapshot?.publicReposCount ?? 3} public (@${profile.githubUsername})`,
    },
    {
      label: 'Undergraduate Degree',
      value: publicEducation[0]?.qualification || 'Bachelor of Business Management',
    },
    {
      label: 'Verified Roles',
      value: `${publicExperiences.length} Work & Internships`,
    },
  ];

  const stripH = 34;
  drawLine(MARGIN, y, PAGE_W - MARGIN, y, COLOR.border, 0.6);
  drawLine(MARGIN, y - stripH, PAGE_W - MARGIN, y - stripH, COLOR.border, 0.6);
  const colW4 = CONTENT_W / 4;
  for (let i = 0; i < stripMetrics.length; i++) {
    const sx = MARGIN + i * colW4 + (i === 0 ? 2 : 6);
    if (i > 0) {
      drawLine(MARGIN + i * colW4, y - 5, MARGIN + i * colW4, y - stripH + 5, COLOR.borderSoft, 0.5);
    }
    drawText(stripMetrics[i].label, sx, y - 12, 7.2, false, COLOR.muted);
    const valLines = wrapTextToWidth(stripMetrics[i].value, colW4 - 10, 8.2, true);
    drawText(valLines[0] || '', sx, y - 24, 8.2, true, COLOR.obsidian);
  }
  y = y - stripH - 18;

  // =========================================================================
  // 2. 01 · TECHNICAL CAPABILITIES & SKILLS (Mirrors HomeSection 2-Col Grid + SkillsSection)
  // =========================================================================
  drawSectionHeader(
    '01 | Technical Capabilities & Stack',
    'Technical capabilities',
    'Categorized by hands-on proficiency'
  );

  const gap2Col = 10;
  const colW2 = (CONTENT_W - gap2Col) / 2;

  for (let i = 0; i < CAPABILITY_ORDER.length; i += 2) {
    const pair = [CAPABILITY_ORDER[i], CAPABILITY_ORDER[i + 1]].filter(Boolean);
    const prepared = pair.map((cap) => {
      const catItems = publicSkills.filter((s) => s.category === cap.category);
      const formattedList = catItems.map((s) => `${s.name} (${s.proficiency})`).join(' | ');
      const wrapped = wrapTextToWidth(formattedList || 'No skills listed', colW2 - 20, 7.8, false);
      const boxH = 14 + 13 + wrapped.length * 10.5 + 10;
      return { cap, wrapped, boxH };
    });

    const rowH = Math.max(...prepared.map((p) => p.boxH));
    ensureSpace(rowH + 8);

    prepared.forEach((item, colIdx) => {
      const cx = MARGIN + colIdx * (colW2 + gap2Col);
      const cBottom = y - rowH;
      drawRect(cx, cBottom, colW2, rowH, COLOR.ivory, COLOR.border, 0.6);

      let cy = y - 14;
      drawText(item.cap.num, cx + 10, cy, 8.5, true, COLOR.copper);
      drawText(item.cap.title, cx + 27, cy, 9.2, true, COLOR.obsidian);
      cy -= 13;
      for (const line of item.wrapped) {
        drawText(line, cx + 10, cy, 7.8, false, COLOR.body);
        cy -= 10.5;
      }
    });

    y -= rowH + 8;
  }

  y -= 10;

  // =========================================================================
  // 3. 02 · SELECTED WORK — SOFTWARE PROJECTS (Mirrors HomeSection & ProjectsSection 2-Col)
  // =========================================================================
  drawSectionHeader(
    '02 | Selected Work',
    'Software Engineering Projects',
    `${publicProjects.length} Featured Builds & Client Platforms`
  );

  for (let i = 0; i < publicProjects.length; i += 2) {
    const pair = [publicProjects[i], publicProjects[i + 1]].filter(Boolean);
    const cardInnerW = colW2 - 20;

    const prepared = pair.map((proj) => {
      const titleLines = wrapTextToWidth(proj.title, cardInnerW, 10, true);
      const descLines = wrapTextToWidth(proj.shortDescription, cardInnerW, 8.1, false);
      const roleLines = wrapTextToWidth(`Role: ${proj.contributionRole}`, cardInnerW, 7.6, false);
      const featLines = proj.features.slice(0, 3).flatMap((f) =>
        wrapTextToWidth(`- ${f}`, cardInnerW, 7.5, false)
      );
      const techLines = wrapTextToWidth(`Stack: ${proj.technologies.join(' | ')}`, cardInnerW, 7.4, false);

      const hasLinks = Boolean(proj.liveDemoUrl || proj.githubUrl);
      const boxH =
        13 +
        11 + // status line
        titleLines.length * 12 +
        3 +
        descLines.length * 10.5 +
        4 +
        roleLines.length * 10 +
        4 +
        featLines.length * 9.8 +
        5 +
        techLines.length * 9.8 +
        (hasLinks ? 16 : 6) +
        6;

      return { proj, titleLines, descLines, roleLines, featLines, techLines, boxH };
    });

    const rowH = Math.max(...prepared.map((p) => p.boxH));
    ensureSpace(rowH + 10);

    prepared.forEach((item, colIdx) => {
      const cx = MARGIN + colIdx * (colW2 + gap2Col);
      const cBottom = y - rowH;
      drawRect(cx, cBottom, colW2, rowH, COLOR.stone, COLOR.border, 0.65);

      let py = y - 14;
      const statusText = `${item.proj.status.toUpperCase()}${item.proj.sourceRepoName ? `  |  ${item.proj.sourceRepoName}` : ''}`;
      drawText(statusText, cx + 10, py, 7, true, COLOR.copper);
      py -= 13;

      for (const tl of item.titleLines) {
        drawText(tl, cx + 10, py, 10, true, COLOR.obsidian);
        py -= 12;
      }
      py -= 2;

      for (const dl of item.descLines) {
        drawText(dl, cx + 10, py, 8.1, false, COLOR.body);
        py -= 10.5;
      }
      py -= 3;

      for (const rl of item.roleLines) {
        drawText(rl, cx + 10, py, 7.6, false, COLOR.muted);
        py -= 10;
      }
      py -= 3;

      for (const fl of item.featLines) {
        drawText(fl, cx + 10, py, 7.5, false, COLOR.body);
        py -= 9.8;
      }
      py -= 4;

      for (const techL of item.techLines) {
        drawText(techL, cx + 10, py, 7.4, true, COLOR.muted);
        py -= 9.8;
      }

      // Links pinned near bottom of card
      const linkY = cBottom + 10;
      let linkX = cx + 10;
      if (item.proj.liveDemoUrl) {
        const label =
          item.proj.slug.includes('berry')
            ? 'Live: Berry App'
            : item.proj.slug === 'weego'
              ? 'Live: weego.co.ke'
              : item.proj.slug === 'talent-bridge'
                ? 'Live: talentbridgekenya.com'
                : `Live: ${item.proj.liveDemoUrl.replace(/^https?:\/\//, '')}`;
        drawText(label, linkX, linkY, 7.6, true, COLOR.copper, item.proj.liveDemoUrl);
        linkX += measureTextWidth(label, 7.6, true) + 12;
      }
      if (item.proj.githubUrl) {
        const ghLabel = 'GitHub Repository';
        drawText(ghLabel, linkX, linkY, 7.6, true, COLOR.obsidian, item.proj.githubUrl);
      }
    });

    y -= rowH + 10;
  }

  y -= 8;

  // =========================================================================
  // 4. 03 · ABOUT & ACADEMIC FOUNDATION (Mirrors AboutSection 2-Col Arrangement)
  // =========================================================================
  const leftW = CONTENT_W * 0.59;
  const rightW = CONTENT_W - leftW - 12;

  const fullBioParas = profile.fullBio.split(/\n\s*\n/).filter(Boolean);
  const fullBioLines = fullBioParas.flatMap((p, idx) => {
    const wrapped = wrapTextToWidth(p, leftW, 8.2, false);
    return idx < fullBioParas.length - 1 ? [...wrapped, ''] : wrapped;
  });
  const approachLines = wrapTextToWidth(profile.approach, leftW, 8.1, false);
  const goalLines = wrapTextToWidth(profile.careerGoals, leftW, 8.1, false);

  const edu = publicEducation[0];
  const eduNotesLines = edu?.notes ? wrapTextToWidth(edu.notes, rightW - 20, 8, false) : [];
  const eduCourseLines = edu
    ? wrapTextToWidth(edu.coursework.join(' | '), rightW - 20, 7.8, false)
    : [];

  const leftBlockH =
    14 +
    fullBioLines.length * 10.6 +
    14 +
    approachLines.length * 10.6 +
    14 +
    goalLines.length * 10.6 +
    8;
  const rightBlockH =
    16 +
    14 +
    12 +
    12 +
    12 +
    eduNotesLines.length * 10.4 +
    14 +
    eduCourseLines.length * 10.2 +
    14;
  const aboutSectionH = Math.max(leftBlockH, rightBlockH);

  // Measure header + content together so header never orphans
  ensureSpace(Math.min(aboutSectionH + 45, 280));
  drawSectionHeader(
    '03 | About & Academic Foundation',
    'Engineering practical software with business context'
  );

  // If the full split block doesn't fit on remaining page, jump cleanly to next page before starting 2-col block
  if (y - aboutSectionH < BOTTOM_Y) {
    newPage();
    drawSectionHeader(
      '03 | About & Academic Foundation',
      'Engineering practical software with business context'
    );
  }

  let ayLeft = y;
  drawText('Professional Biography', MARGIN, ayLeft, 9.5, true, COLOR.obsidian);
  ayLeft -= 13;
  for (const bl of fullBioLines) {
    if (bl === '') {
      ayLeft -= 5;
    } else {
      drawText(bl, MARGIN, ayLeft, 8.2, false, COLOR.body);
      ayLeft -= 10.6;
    }
  }
  ayLeft -= 4;
  drawText('Approach to Building Software', MARGIN, ayLeft, 9, true, COLOR.obsidian);
  ayLeft -= 12;
  for (const al of approachLines) {
    drawText(al, MARGIN, ayLeft, 8.1, false, COLOR.muted);
    ayLeft -= 10.6;
  }
  ayLeft -= 4;
  drawText('Career Goals', MARGIN, ayLeft, 9, true, COLOR.obsidian);
  ayLeft -= 12;
  for (const gl of goalLines) {
    drawText(gl, MARGIN, ayLeft, 8.1, false, COLOR.muted);
    ayLeft -= 10.6;
  }

  if (edu) {
    const rx = MARGIN + leftW + 12;
    const cardBottom = y - rightBlockH;
    drawRect(rx, cardBottom, rightW, rightBlockH, COLOR.stone, COLOR.border, 0.65);
    let ayRight = y - 16;
    drawText('EDUCATION', rx + 10, ayRight, 7.5, true, COLOR.copper);
    ayRight -= 13;
    drawText(edu.qualification, rx + 10, ayRight, 9.5, true, COLOR.obsidian);
    ayRight -= 12;
    drawText(edu.institution, rx + 10, ayRight, 8.3, false, COLOR.body);
    ayRight -= 11;
    drawText(`${edu.statusLabel} | ${edu.location}`, rx + 10, ayRight, 7.6, true, COLOR.copper);
    ayRight -= 13;
    for (const nl of eduNotesLines) {
      drawText(nl, rx + 10, ayRight, 8, false, COLOR.muted);
      ayRight -= 10.4;
    }
    ayRight -= 4;
    drawText('Relevant Academic Areas', rx + 10, ayRight, 7.8, true, COLOR.obsidian);
    ayRight -= 11;
    for (const cl of eduCourseLines) {
      drawText(cl, rx + 10, ayRight, 7.8, false, COLOR.muted);
      ayRight -= 10.2;
    }
  }

  y = y - aboutSectionH - 14;

  // =========================================================================
  // 5. 04 · EXPERIENCE TIMELINE (Mirrors ExperienceSection numbered cards)
  // =========================================================================
  drawSectionHeader(
    '04 | Background & Credentials',
    'Professional & Internship Experience'
  );

  publicExperiences.forEach((exp, idx) => {
    const innerW = CONTENT_W - 22;
    const summaryLines = wrapTextToWidth(exp.summary, innerW, 8.2, false);
    const highlightLines = exp.highlights.flatMap((h) =>
      wrapTextToWidth(`- ${h}`, innerW, 8, false)
    );
    const liveSites = extractLiveSites(exp);

    const cardH =
      14 +
      13 + // role
      12 + // org + location
      4 +
      summaryLines.length * 10.8 +
      4 +
      highlightLines.length * 10.4 +
      (liveSites.length > 0 ? 18 : 6) +
      6;

    ensureSpace(cardH + 8);
    const cBottom = y - cardH;
    drawRect(MARGIN, cBottom, CONTENT_W, cardH, COLOR.ivory, COLOR.border, 0.65);

    let ey = y - 15;
    const numStr = `0${idx + 1}.`;
    drawText(numStr, MARGIN + 11, ey, 9.5, true, COLOR.copper);
    drawText(exp.role, MARGIN + 30, ey, 9.8, true, COLOR.obsidian);
    const rightPeriod = `${exp.period} | ${exp.entryType}`;
    drawText(
      rightPeriod,
      PAGE_W - MARGIN - 11 - measureTextWidth(rightPeriod, 7.8, false),
      ey,
      7.8,
      false,
      COLOR.muted
    );
    ey -= 12;
    drawText(
      `${exp.organization}${exp.location ? ` | ${exp.location}` : ''}`,
      MARGIN + 11,
      ey,
      8.3,
      true,
      COLOR.body
    );
    ey -= 13;

    for (const sl of summaryLines) {
      drawText(sl, MARGIN + 11, ey, 8.2, false, COLOR.muted);
      ey -= 10.8;
    }
    ey -= 2;

    for (const hl of highlightLines) {
      drawText(hl, MARGIN + 11, ey, 8, false, COLOR.body);
      ey -= 10.4;
    }

    if (liveSites.length > 0) {
      const siteY = cBottom + 10;
      drawLine(MARGIN + 11, siteY + 9, PAGE_W - MARGIN - 11, siteY + 9, COLOR.borderSoft, 0.5);
      let sx = MARGIN + 11;
      drawText('Live Websites:', sx, siteY, 7.6, true, COLOR.muted);
      sx += measureTextWidth('Live Websites:', 7.6, true) + 6;
      for (const site of liveSites) {
        drawText(site.name, sx, siteY, 7.6, true, COLOR.copper, site.url);
        sx += measureTextWidth(site.name, 7.6, true) + 12;
      }
    }

    y = cBottom - 8;
  });

  y -= 8;

  // =========================================================================
  // 6. 05 · LIVE GITHUB & GITLAB ACTIVITY SUMMARY (Mirrors /github & /gitlab)
  // =========================================================================
  const ghReposList =
    githubSnapshot?.repositories
      ?.filter((r) => r.name.toLowerCase() !== (githubSnapshot.username || 'lex-cable').toLowerCase())
      .map((r) => r.name) || ['Berry-E-Learning-Platform-Development', 'BuyHive'];
  const ghTopLangs =
    githubSnapshot?.topLanguages?.slice(0, 5).map((l) => `${l.language} (${l.percentage}%)`).join(' | ') ||
    'TypeScript | PHP | Vue | Blade | CSS';

  const ghLines = [
    `Profile: @${githubSnapshot?.username || profile.githubUsername} | ${githubSnapshot?.publicReposCount ?? 3} public repos`,
    `Contributions (1 Yr): ${githubSnapshot?.contributionCalendar?.totalContributions ?? 'Live synced'} | Starred: ${githubSnapshot?.starredReposCount ?? githubSnapshot?.starredRepos?.length ?? 2}`,
    ...wrapTextToWidth(`Languages: ${ghTopLangs}`, colW2 - 20, 7.6, false),
    ...wrapTextToWidth(`Repositories: ${ghReposList.join(', ')}`, colW2 - 20, 7.6, false),
  ];

  const calExp = publicExperiences.find((e) => e.organization.toLowerCase().includes('content aggregation'));
  const weegoProj = publicProjects.find((p) => p.slug === 'weego');
  const tbProj = publicProjects.find((p) => p.slug === 'talent-bridge');

  const glMemberItems = [
    `Weego (Private): ${weegoProj ? 'Landing page & UI architecture (Nuxt.js, Vue.js)' : 'Responsive landing page build'}`,
    `Talent Bridge (Private): ${tbProj ? 'End-to-end Django platform development & delivery' : 'Full-stack platform ownership'}`,
    `Viusasa (Private): ${calExp ? 'Frontend & web engineering collaboration' : 'Live web engineering collaboration'}`,
    `Citizen Duka (Private): Storefront web development & team collaboration`,
  ].flatMap((line) => wrapTextToWidth(`- ${line}`, colW2 - 20, 7.5, false));

  const glLines = [
    `Profile: @${gitlabSnapshot?.username || 'lex_cab23'} | Member since ${gitlabSnapshot?.memberSince || 'May 29, 2025'}`,
    `Member Projects (Private Workspace): 4 commercial repositories`,
    ...glMemberItems,
  ];

  const syncBoxH = Math.max(
    36 + ghLines.length * 10.5 + 12,
    36 + glLines.length * 10.5 + 12
  );

  ensureSpace(syncBoxH + 45);
  drawSectionHeader(
    '05 | Synchronized Engineering Profiles',
    'GitHub & GitLab Activity Overview',
    `Auto-generated ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  );

  const syncBottom = y - syncBoxH;

  // GitHub Card (left)
  drawRect(MARGIN, syncBottom, colW2, syncBoxH, COLOR.stone, COLOR.border, 0.65);
  let gy = y - 14;
  drawText('GITHUB (@Lex-Cable)', MARGIN + 10, gy, 8.2, true, COLOR.obsidian, profile.githubUrl);
  gy -= 13;
  for (const line of ghLines) {
    drawText(line, MARGIN + 10, gy, 7.6, false, COLOR.body);
    gy -= 10.5;
  }

  // GitLab Card (right)
  const glX = MARGIN + colW2 + gap2Col;
  drawRect(glX, syncBottom, colW2, syncBoxH, COLOR.stone, COLOR.border, 0.65);
  let gly = y - 14;
  drawText(
    `GITLAB (@${gitlabSnapshot?.username || 'lex_cab23'})`,
    glX + 10,
    gly,
    8.2,
    true,
    COLOR.obsidian,
    gitlabSnapshot?.profileUrl || 'https://gitlab.com/lex_cab23'
  );
  gly -= 13;
  for (const line of glLines) {
    drawText(line, glX + 10, gly, 7.5, false, COLOR.body);
    gly -= 10.5;
  }

  pages.push(page);

  // Add editorial footers to all pages
  const totalPages = pages.length;
  const generatedLabel = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  pages.forEach((p, idx) => {
    const footerTextLeft = `${profile.name}  |  Web Portfolio Curriculum Vitae  |  Updated ${generatedLabel}`;
    const footerTextRight = `Page ${idx + 1} of ${totalPages}`;
    p.commands.push(
      `0.50 w ${rgbStroke(COLOR.border)} ${MARGIN.toFixed(2)} 30.00 m ${(PAGE_W - MARGIN).toFixed(2)} 30.00 l S`
    );
    p.commands.push(
      `BT /F1 7.20 Tf ${rgbFill(COLOR.muted)} ${MARGIN.toFixed(2)} 19.00 Td (${escapePdfString(footerTextLeft)}) Tj ET`
    );
    const rw = measureTextWidth(footerTextRight, 7.2, true);
    p.commands.push(
      `BT /F2 7.20 Tf ${rgbFill(COLOR.copper)} ${(PAGE_W - MARGIN - rw).toFixed(2)} 19.00 Td (${escapePdfString(footerTextRight)}) Tj ET`
    );
  });

  // =========================================================================
  // Assemble PDF 1.4 object table (strictly 7-bit ASCII => string.length === bytes.length)
  // =========================================================================
  const objects: string[] = [];
  const addObj = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObj(''); // 1
  const pagesId = addObj(''); // 2
  const fontRegularId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); // 3
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'); // 4

  const pageIds: number[] = [];
  for (const p of pages) {
    const streamStr = p.commands.join('\n') + '\n';
    const contentId = addObj(
      `<< /Length ${streamStr.length} >>\nstream\n${streamStr}endstream`
    );

    const annotIds: number[] = [];
    for (const link of p.links) {
      const rect = `[${link.x.toFixed(2)} ${link.y.toFixed(2)} ${(link.x + link.w).toFixed(2)} ${(link.y + link.h).toFixed(2)}]`;
      const annotId = addObj(
        `<< /Type /Annot /Subtype /Link /Rect ${rect} /Border [0 0 0] /A << /S /URI /URI (${escapePdfString(link.url)}) >> >>`
      );
      annotIds.push(annotId);
    }

    const annotsEntry =
      annotIds.length > 0
        ? ` /Annots [${annotIds.map((id) => `${id} 0 R`).join(' ')}]`
        : '';

    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W.toFixed(2)} ${PAGE_H.toFixed(2)}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R${annotsEntry} >>`
    );
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const bytes = new TextEncoder().encode(pdf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function generatePortfolioCvPdfBlob(params: PortfolioCvInput): Blob {
  const base64 = generatePortfolioCvPdfBase64(params);
  const validBytes = decodeValidPdfBase64(base64);
  if (!validBytes) {
    throw new Error('Failed to generate valid PDF document.');
  }
  return new Blob([validBytes], { type: 'application/pdf' });
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

export function decodeValidPdfBase64(rawBase64: string): Uint8Array<ArrayBuffer> | null {
  try {
    const stripped = rawBase64
      .replace(/^data:[^;]+;base64,/i, '')
      .replace(/\s+/g, '');
    if (!stripped) return null;
    const binary = atob(stripped);
    const buffer = new ArrayBuffer(binary.length);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return isPdfBytes(bytes) ? bytes : null;
  } catch {
    return null;
  }
}

export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function fetchVerifiedCvPdfBlob(fallbackAssetPath: string): Promise<Blob> {
  const urls = ['/api/cv', fallbackAssetPath];
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      if (isPdfBytes(bytes)) {
        return new Blob([buf], { type: 'application/pdf' });
      }
    } catch {
      // Try next source
    }
  }
  throw new Error('Unable to load a valid PDF document from server.');
}

export function downloadBase64File(base64: string, fileName: string, mimeType = 'application/pdf') {
  const stripped = base64.replace(/^data:[^;]+;base64,/i, '').replace(/\s+/g, '');
  const binary = atob(stripped);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  if (mimeType === 'application/pdf' && !isPdfBytes(bytes)) {
    throw new Error('Invalid PDF data.');
  }
  const blob = new Blob([buffer], { type: mimeType });
  triggerBlobDownload(blob, fileName);
}

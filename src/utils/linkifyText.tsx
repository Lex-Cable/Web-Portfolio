import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface ProductionSiteLink {
  name: string;
  domainLabel: string;
  url: string;
}

export const CAL_PRODUCTION_SITES: ProductionSiteLink[] = [
  {
    name: 'Weego',
    domainLabel: 'weego.co.ke',
    url: 'https://weego.co.ke',
  },
  {
    name: 'Viusasa',
    domainLabel: 'viusasa.com',
    url: 'https://viusasa.com/',
  },
  {
    name: 'Talent Bridge',
    domainLabel: 'talentbridgekenya.com',
    url: 'https://talentbridgekenya.com/',
  },
  {
    name: 'Citizen Duka',
    domainLabel: 'viusasa.com/citizen-duka',
    url: 'https://viusasa.com/citizen-duka',
  },
];

// Matches explicit "Name (url)" phrases or bare domain/URL tokens (longest match first)
const SITE_TOKEN_REGEX =
  /(Weego\s*\((?:https?:\/\/)?weego\.co\.ke\/?\)|Viusasa\s*\((?:https?:\/\/)?viusasa\.com\/?\)|Talent Bridge\s*\((?:https?:\/\/)?talentbridgekenya\.com\/?\)|Citizen Duka\s*\((?:https?:\/\/)?viusasa\.com\/citizen-duka\/?\)|https?:\/\/viusasa\.com\/citizen-duka\/?|viusasa\.com\/citizen-duka\/?|https?:\/\/talentbridgekenya\.com\/?|talentbridgekenya\.com\/?|https?:\/\/viusasa\.com\/?|viusasa\.com\/?|https?:\/\/weego\.co\.ke\/?|weego\.co\.ke\/?)/gi;

function resolveMatchedSite(token: string): ProductionSiteLink | null {
  const lower = token.toLowerCase();
  if (lower.includes('citizen-duka')) {
    return CAL_PRODUCTION_SITES[3];
  }
  if (lower.includes('talentbridgekenya.com')) {
    return CAL_PRODUCTION_SITES[2];
  }
  if (lower.includes('viusasa.com')) {
    return CAL_PRODUCTION_SITES[1];
  }
  if (lower.includes('weego.co.ke')) {
    return CAL_PRODUCTION_SITES[0];
  }
  return null;
}

export function extractReferencedProductionSites(
  summary: string,
  highlights: string[]
): ProductionSiteLink[] {
  const combined = `${summary}\n${highlights.join('\n')}`.toLowerCase();
  return CAL_PRODUCTION_SITES.filter(
    (site) =>
      combined.includes(site.domainLabel.toLowerCase()) ||
      combined.includes(site.name.toLowerCase())
  );
}

export function renderTextWithSiteLinks(text: string): React.ReactNode {
  const parts = text.split(SITE_TOKEN_REGEX);
  if (parts.length <= 1) return text;

  return parts.map((part, idx) => {
    if (!part) return null;
    const site = resolveMatchedSite(part);
    if (!site) {
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    return (
      <a
        key={idx}
        href={site.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-baseline gap-1 font-semibold text-[#161616] dark:text-[#fffdf9] underline decoration-[#b98b6e] underline-offset-2 hover:text-[#b98b6e] transition-colors"
      >
        <span>{site.name}</span>
        <ExternalLink className="w-3 h-3 text-[#b98b6e] self-center shrink-0" aria-hidden="true" />
      </a>
    );
  });
}

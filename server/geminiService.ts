import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in server environment secrets.');
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function analyzeRepositoryWithGemini(params: {
  repoName: string;
  githubUrl: string;
  description: string | null;
  readme: string;
  files: string[];
  packageJson: string | null;
  composerJson: string | null;
}) {
  const ai = getGeminiClient();

  const prompt = `Analyze the following real GitHub repository for Jacinta Wambui Waweru's developer portfolio.
STRICT GROUNDING RULES:
- Rely ONLY on the provided README, file list, and manifest files.
- Do NOT invent deployment URLs, user counts, revenue, performance metrics, or unverified features.
- If the README says a project is under development, reflect status as "In Development".
- Keep prose crisp, authentic, recruiter-friendly, and free of hype.

Repository Name: ${params.repoName}
GitHub URL: ${params.githubUrl}
GitHub Description: ${params.description || 'None provided'}
Root Files: ${params.files.join(', ')}
package.json: ${params.packageJson ? params.packageJson.slice(0, 2500) : 'None'}
composer.json: ${params.composerJson ? params.composerJson.slice(0, 2500) : 'None'}
README:
${params.readme.slice(0, 6000)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction:
        'You are a careful senior engineering portfolio editor. Return factual, grounded JSON summarizing the repository without fabricating metrics or claims.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          shortDescription: { type: Type.STRING },
          problemStatement: { type: Type.STRING },
          contributionRole: { type: Type.STRING },
          fullDescription: { type: Type.STRING },
          technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
          features: { type: Type.ARRAY, items: { type: Type.STRING } },
          status: { type: Type.STRING },
          verificationNote: { type: Type.STRING },
        },
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  return JSON.parse(text) as Record<string, unknown>;
}

export async function generatePortfolioAdvisory(params: {
  task: 'bio_polish' | 'seo_metadata' | 'cv_improvements' | 'missing_info_audit';
  profileJson: string;
  projectsJson: string;
  skillsJson: string;
  experiencesJson: string;
}) {
  const ai = getGeminiClient();

  const taskPrompts: Record<string, string> = {
    bio_polish:
      'Suggest refined, authentic recruiter-friendly versions of `headline`, `shortBio`, `fullBio`, and `approach` using ONLY facts present in the profile, projects, skills, and experiences.',
    seo_metadata:
      'Generate an accurate, recruiter-searchable `seoTitle` (40-60 chars) and `seoDescription` (120-158 chars) based strictly on Jacinta Wambui Waweru’s verified profile.',
    cv_improvements:
      'Provide specific, actionable CV improvement suggestions grounded strictly in Jacinta’s verified projects, skills, education (expected 2027), and work/internship history without inventing achievements.',
    missing_info_audit:
      'Audit the portfolio records for gaps, ambiguities (such as CAL vs Cal Westlands, missing live demo URLs, or skills needing verification), and list concrete items to review.',
  };

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: `Task: ${taskPrompts[params.task]}

Profile: ${params.profileJson.slice(0, 3000)}
Projects: ${params.projectsJson.slice(0, 4000)}
Skills: ${params.skillsJson.slice(0, 2500)}
Experiences: ${params.experiencesJson.slice(0, 2500)}`,
    config: {
      systemInstruction:
        'Never fabricate employment dates, metrics, certifications, or completed degrees (degree expected 2027). Return structured JSON.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          proposedPatch: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              shortBio: { type: Type.STRING },
              fullBio: { type: Type.STRING },
              approach: { type: Type.STRING },
              seoTitle: { type: Type.STRING },
              seoDescription: { type: Type.STRING },
            },
          },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      },
    },
  });

  const text = (response.text ?? '{}').trim();
  return JSON.parse(text) as Record<string, unknown>;
}

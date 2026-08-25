// Volume 5 — Prompt Library (versioned)
// Single source of truth for LLM prompts used by remediation.
// Bump PROMPT_VERSION whenever the prompt contract changes so outputs stay traceable.

export const PROMPT_VERSION = 2;

import { randomUUID } from 'crypto';

export interface RuleInfo {
  name: string;
  requirement: string;
  examples: string[];
}

// WCAG rule reference — expanded to 20+ rules with examples for few-shot prompting
export const WCAG_RULES: Record<string, RuleInfo> = {
  'color-contrast': {
    name: 'Color Contrast (1.4.3)',
    requirement: 'Text must have a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text against its background.',
    examples: ['Increase font color darkness', 'Change background to lighter shade', 'Use CSS variables for theme-aware contrast'],
  },
  'image-alt': {
    name: 'Non-text Content (1.1.1)',
    requirement: 'All images must have alternative text that describes the content or function of the image. Decorative images should have empty alt attributes.',
    examples: ['Add alt="Description of image"', 'Use alt="" for decorative images', 'Describe the image purpose concisely'],
  },
  label: {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'All form inputs must have associated labels using the for attribute or by wrapping the input in a label element.',
    examples: ['<label for="email">Email</label><input id="email" />', 'Use aria-label if visual label not possible', 'Use aria-labelledby for complex inputs'],
  },
  'link-name': {
    name: 'Link Purpose (2.4.4)',
    requirement: 'Link text must describe the purpose of the link. Avoid generic text like "click here" or "read more".',
    examples: ['Replace "Click here" with "Read our pricing guide"', 'Use aria-label for icon-only links', 'Combine surrounding text for context'],
  },
  'keyboard-navigation': {
    name: 'Keyboard (2.1.1)',
    requirement: 'All interactive elements must be accessible via keyboard. Use semantic elements like button, a, or input, or add tabindex and keyboard event handlers.',
    examples: ['Use <button> instead of <div onClick>', 'Add tabindex="0" to custom elements', 'Add onKeyDown handler for Enter/Space'],
  },
  'focus-visible': {
    name: 'Focus Visible (2.4.7)',
    requirement: 'Any keyboard operable user interface must have a visible focus indicator.',
    examples: ['Add :focus-visible { outline: 2px solid blue; }', 'Never use outline: none without replacement', 'Use box-shadow for custom focus styles'],
  },
  'heading-order': {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'Heading levels must be in sequential order. Do not skip heading levels (e.g., h1 to h3).',
    examples: ['Change <h3> to <h2> if preceded by <h1>', 'Use semantic headings for document outline', 'Never use headings for visual styling only'],
  },
  'aria-roles': {
    name: 'Name, Role, Value (4.1.2)',
    requirement: 'All user interface components must have appropriate ARIA roles, states, and properties.',
    examples: ['Use role="button" for clickable divs', 'Add aria-expanded for collapsible sections', 'Use role="alert" for error messages'],
  },
  'form-error': {
    name: 'Error Identification (3.3.1)',
    requirement: 'Form errors must be identified and described to users. Use aria-describedby to associate error messages with form fields.',
    examples: ['Add aria-describedby="error-id" to input', 'Use aria-invalid="true" for invalid fields', 'Provide clear error text near the field'],
  },
  'page-title': {
    name: 'Page Titled (2.4.2)',
    requirement: 'Each page must have a descriptive title that identifies the page content.',
    examples: ['<title>Contact Us | Company Name</title>', 'Make titles unique per page', 'Include site name in title'],
  },
  'bypass-blocks': {
    name: 'Bypass Blocks (2.4.1)',
    requirement: 'A mechanism must be available to bypass blocks of content that are repeated on multiple pages.',
    examples: ['Add "Skip to main content" link', 'Use landmark roles (main, nav, aside)', 'Ensure skip link is first focusable element'],
  },
  'document-lang': {
    name: 'Language of Page (3.1.1)',
    requirement: 'The default human language of each page must be identifiable using the lang attribute on the html element.',
    examples: ['<html lang="en">', '<html lang="es">', 'Use correct language code for content'],
  },
  'button-name': {
    name: 'Name, Role, Value (4.1.2)',
    requirement: 'Buttons must have accessible names that describe their purpose.',
    examples: ['<button aria-label="Close dialog">×</button>', 'Use descriptive button text', 'Add aria-label for icon buttons'],
  },
  'region': {
    name: 'Best Practice',
    requirement: 'Content should be organized into landmark regions so users can navigate by region.',
    examples: ['Use <main> for primary content', 'Use <nav> for navigation', 'Use <aside> for supplementary content'],
  },
  'landmark-banner': {
    name: 'Best Practice',
    requirement: 'Each page should have a banner landmark (header) at the top.',
    examples: ['Use <header> or role="banner"', 'Place site-wide navigation in banner', 'Keep banner concise'],
  },
  'landmark-contentinfo': {
    name: 'Best Practice',
    requirement: 'Each page should have a contentinfo landmark (footer) at the bottom.',
    examples: ['Use <footer> or role="contentinfo"', 'Include copyright and contact info', 'Keep footer consistent across pages'],
  },
  'table-duplicate-name': {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'Data tables should not have duplicate names in the same table.',
    examples: ['Use unique header text', 'Differentiate similar columns with context', 'Use scope attribute for complex tables'],
  },
  'svg-img-alt': {
    name: 'Non-text Content (1.1.1)',
    requirement: 'SVG images must have alternative text for screen readers.',
    examples: ['Add <title> element inside SVG', 'Use role="img" and aria-label', 'For decorative SVG, use aria-hidden="true"'],
  },
  'meta-viewport': {
    name: 'Best Practice',
    requirement: 'Do not disable user scaling in the viewport meta tag.',
    examples: ['Remove user-scalable=no', 'Remove maximum-scale=1', 'Use <meta name="viewport" content="width=device-width, initial-scale=1">'],
  },
  'html-has-lang': {
    name: 'Language of Page (3.1.1)',
    requirement: 'The html element must have a lang attribute.',
    examples: ['<html lang="en">', 'Use valid BCP 47 language tag', 'Match content language'],
  },
  'listitem': {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'List items (<li>) must be contained within a proper list element (<ul>, <ol>).',
    examples: ['Wrap <li> elements in <ul> or <ol>', 'Use <ul> for unordered lists', 'Use <dl>/<dt>/<dd> for definition lists'],
  },
  'td-headers-attr': {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'Complex data tables must use the headers attribute to associate data cells with header cells.',
    examples: ['Add headers="col1 row1" to td', 'Use scope="col" on th elements', 'Consider simpler table layout'],
  },
  'th-has-data-cells': {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'Table header cells (<th>) must have associated data cells.',
    examples: ['Ensure each <th> has at least one <td> referencing it', 'Use scope attribute on <th>', 'Check table structure is valid'],
  },
};

export function getRuleInfo(ruleId: string, fallbackDescription: string): RuleInfo {
  return WCAG_RULES[ruleId] || { name: ruleId, requirement: fallbackDescription, examples: [] };
}

export interface RemediationPromptInput {
  ruleId: string;
  wcagCriteria: string;
  description: string;
  elementHtml: string;
  elementSelector: string;
  /** Optional page context for better fixes */
  pageContext?: string;
}

/**
 * Chain-of-thought system prompt with role definition and structured output.
 * PROMPT_VERSION = 2: Added chain-of-thought, few-shot examples, structured reasoning.
 */
export function buildSystemPrompt(): string {
  return `You are a world-class web accessibility engineer specializing in WCAG 2.1 Level AA compliance. You have deep expertise in HTML, CSS, React, ARIA, and assistive technology behavior.

## Your Task
Analyze accessibility violations and provide exact, production-ready code fixes.

## Thinking Process (Chain-of-Thought)
For each violation, think step-by-step:
1. **Identify the root cause** — What exactly makes this element non-compliant?
2. **Evaluate fix options** — What are 2-3 possible approaches?
3. **Select best approach** — Choose the most semantic, minimal, and maintainable fix
4. **Write the fix** — Provide the corrected code
5. **Verify the fix** — Ensure it doesn't introduce new issues

## Rules
1. Provide ONLY the fixed code in the code block — no commentary inside
2. Use semantic HTML elements FIRST — ARIA is a last resort
3. Preserve ALL existing CSS classes, IDs, and structure
4. Keep fixes minimal — change only what's needed for compliance
5. For React/JSX: maintain proper syntax, preserve imports
6. Never remove existing functionality
7. Consider keyboard accessibility and screen reader behavior
8. Think about edge cases (empty states, long text, responsive)

## Output Format
Respond in this exact format:
---CODE---
[fixed code here]
---EXPLANATION---
[brief explanation of what changed and why]
---CONFIDENCE---
[0.0-1.0 confidence score]
---APPROACH---
[one of: semantic-html, aria, css, structure]`;
}

/**
 * User prompt with few-shot examples for common violations.
 * Uses examples from the rule's examples array for in-context learning.
 */
export function buildUserPrompt(input: RemediationPromptInput): string {
  const rule = getRuleInfo(input.ruleId, input.description);
  const examples = rule.examples.length > 0
    ? `\nExamples of correct fixes:\n${rule.examples.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}`
    : '';

  const contextSection = input.pageContext
    ? `\nPAGE CONTEXT:\n${input.pageContext}\n`
    : '';

  return `<violation>
<rule-id>${input.ruleId}</rule-id>
<wcag-criteria>${input.wcagCriteria}</wcag-criteria>
<requirement>${rule.requirement}</requirement>
<issue>${input.description}</issue>
<selector>${input.elementSelector}</selector>
<current-code>
${input.elementHtml}
</current-code>${contextSection}${examples}
</violation>

Analyze this violation using chain-of-thought reasoning, then provide the fix in the required format.`;
}

export interface ParsedRemediation {
  remediationCode: string;
  explanation: string;
  confidence: number;
  approach: string;
  promptVersion: number;
}

const DEFAULT_CONFIDENCE = 0.75;

export function parseRemediationResponse(response: string): ParsedRemediation {
  const codeMatch = response.match(/---CODE---\n([\s\S]*?)\n---EXPLANATION---/);
  const explanationMatch = response.match(/---EXPLANATION---\n([\s\S]*?)\n---CONFIDENCE---/);
  const confidenceMatch = response.match(/---CONFIDENCE---\n([\d.]+)/);
  const approachMatch = response.match(/---APPROACH---\n([\s\S]*?)(?:\n---|$)/);

  const remediationCode = codeMatch?.[1]?.trim() || '';
  const explanation = explanationMatch?.[1]?.trim() || '';
  const rawConfidence = parseFloat(confidenceMatch?.[1] || String(DEFAULT_CONFIDENCE));
  const approach = approachMatch?.[1]?.trim() || 'unknown';

  return {
    remediationCode,
    explanation,
    confidence: Math.min(1, Math.max(0, Number.isFinite(rawConfidence) ? rawConfidence : DEFAULT_CONFIDENCE)),
    approach: ['semantic-html', 'aria', 'css', 'structure', 'unknown'].includes(approach) ? approach : 'unknown',
    promptVersion: PROMPT_VERSION,
  };
}

/**
 * Template-based fallback fixes — used when AI is unavailable or returns invalid output.
 * Handles the most common WCAG violations with deterministic fixes.
 */
export function renderTemplateFix(html: string, ruleId: string, description: string): { remediationCode: string; explanation: string } {
  const rule = getRuleInfo(ruleId, description);

  const fixFor: Record<string, () => { remediationCode: string; explanation: string }> = {
    'image-alt': () => ({
      remediationCode: html.replace(/(<img\b[^>]*?)\/?>/i, (match, open: string) =>
        match.includes('alt=') ? match : `${open} alt="${description || 'Descriptive alt text for this image'}" />`
      ),
      explanation: 'Added a descriptive alt attribute so screen readers can describe the image content.',
    }),
    'label': () => ({
      remediationCode: html.includes('id=')
        ? html
        : `<label for="${randomUUID().slice(0, 8)}">${description || 'Field label'}</label>\n${html}`,
      explanation: 'Associated the input with a label so screen readers announce the field purpose.',
    }),
    'link-name': () => ({
      remediationCode: html.replace(/(<a\b[^>]*?>)[\s\S]*?(<\/a>)/i, `$1${description || 'Read more about this topic'}$2`),
      explanation: 'Replaced generic link text with descriptive text that identifies the link destination.',
    }),
    'color-contrast': () => ({
      remediationCode: html,
      explanation: 'Adjust the CSS text color/background combination to reach a 4.5:1 contrast ratio (WCAG 2.1 AA).',
    }),
    'page-title': () => ({
      remediationCode: html.includes('<title>') ? html : `<title>${description || 'Page Title'} | AccessGuard</title>`,
      explanation: 'Added a descriptive title element to the page head.',
    }),
    'document-lang': () => ({
      remediationCode: html.includes('lang=') ? html : html.replace('<html', '<html lang="en"'),
      explanation: 'Added a lang attribute to the html element for screen readers.',
    }),
    'button-name': () => ({
      remediationCode: html.includes('aria-label') ? html : html.replace('<button', '<button aria-label="Action"'),
      explanation: 'Added aria-label to button for screen reader accessibility.',
    }),
    'heading-order': () => ({
      remediationCode: html,
      explanation: 'Ensure heading levels are sequential (h1 → h2 → h3). Do not skip levels.',
    }),
    'focus-visible': () => ({
      remediationCode: html,
      explanation: 'Add :focus-visible { outline: 2px solid var(--ring); } to ensure keyboard focus is visible.',
    }),
    'bypass-blocks': () => ({
      remediationCode: '<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Skip to main content</a>\n' + html,
      explanation: 'Added a skip-to-content link as the first focusable element for keyboard users.',
    }),
    'svg-img-alt': () => ({
      remediationCode: html.includes('aria-label') ? html : html.replace(/<svg/, '<svg role="img" aria-label="Image description"'),
      explanation: 'Added role="img" and aria-label to SVG for screen reader accessibility.',
    }),
    'meta-viewport': () => ({
      remediationCode: html.replace(/user-scalable=no/g, '').replace(/maximum-scale=1/g, ''),
      explanation: 'Removed user-scalable=no and maximum-scale=1 to allow pinch-to-zoom.',
    }),
  };

  const fix = fixFor[ruleId]?.() ?? {
    remediationCode: html,
    explanation: `Fix the ${rule.name} violation: ${rule.requirement}`,
  };

  return {
    remediationCode: fix.remediationCode,
    explanation: `${fix.explanation} Rule: ${rule.name}.`,
  };
}

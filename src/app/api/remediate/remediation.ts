import ZAI from 'z-ai-web-dev-sdk';
import { logger } from '@/lib/error-logger';

interface RemediationRequest {
  violationId: string;
  elementHtml: string;
  elementSelector: string;
  description: string;
  ruleId: string;
  wcagCriteria: string;
}

// WCAG Rule explanations for better AI prompts
export const WCAG_RULES: Record<string, { name: string; requirement: string }> = {
  'color-contrast': {
    name: 'Color Contrast (1.4.3)',
    requirement: 'Text must have a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text against its background.'
  },
  'image-alt': {
    name: 'Non-text Content (1.1.1)',
    requirement: 'All images must have alternative text that describes the content or function of the image. Decorative images should have empty alt attributes.'
  },
  'label': {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'All form inputs must have associated labels using the for attribute or by wrapping the input in a label element.'
  },
  'link-name': {
    name: 'Link Purpose (2.4.4)',
    requirement: 'Link text must describe the purpose of the link. Avoid generic text like "click here" or "read more".'
  },
  'keyboard-navigation': {
    name: 'Keyboard (2.1.1)',
    requirement: 'All interactive elements must be accessible via keyboard. Use semantic elements like button, a, or input, or add tabindex and keyboard event handlers.'
  },
  'focus-visible': {
    name: 'Focus Visible (2.4.7)',
    requirement: 'Any keyboard operable user interface must have a visible focus indicator.'
  },
  'heading-order': {
    name: 'Info and Relationships (1.3.1)',
    requirement: 'Heading levels must be in sequential order. Do not skip heading levels (e.g., h1 to h3).'
  },
  'aria-roles': {
    name: 'Name, Role, Value (4.1.2)',
    requirement: 'All user interface components must have appropriate ARIA roles, states, and properties.'
  },
  'form-error': {
    name: 'Error Identification (3.3.1)',
    requirement: 'Form errors must be identified and described to users. Use aria-describedby to associate error messages with form fields.'
  },
  'page-title': {
    name: 'Page Titled (2.4.2)',
    requirement: 'Each page must have a descriptive title that identifies the page content.'
  },
  'bypass-blocks': {
    name: 'Bypass Blocks (2.4.1)',
    requirement: 'A mechanism must be available to bypass blocks of content that are repeated on multiple pages.'
  },
  'document-lang': {
    name: 'Language of Page (3.1.1)',
    requirement: 'The default human language of each page must be identifiable using the lang attribute on the html element.'
  }
};

export async function generateRemediation(violation: RemediationRequest) {
  const zai = await ZAI.create().catch(() => null);
  if (!zai) {
    return templateRemediation(violation);
  }

  const ruleInfo = WCAG_RULES[violation.ruleId] || {
    name: violation.ruleId,
    requirement: violation.description
  };

  const systemPrompt = `You are an expert web accessibility consultant specializing in WCAG 2.1 Level AA compliance. 
Your job is to provide exact code fixes for accessibility violations.

IMPORTANT RULES:
1. Provide ONLY the fixed code - no explanations in the code block
2. Use semantic HTML elements whenever possible
3. Maintain all existing CSS classes and styles
4. Do NOT use ARIA as a band-aid fix - use proper HTML elements first
5. Ensure keyboard accessibility
6. For React/JSX code, maintain proper syntax
7. Keep the fix minimal and focused on the accessibility issue

For each fix, also provide:
- A brief explanation of what was changed and why
- A confidence score (0-1) for the fix`;

  const userPrompt = `Fix this WCAG violation:

VIOLATION DETAILS:
- Rule: ${ruleInfo.name}
- WCAG Criteria: ${violation.wcagCriteria}
- Requirement: ${ruleInfo.requirement}
- Issue: ${violation.description}

CURRENT CODE:
${violation.elementHtml}

SELECTOR: ${violation.elementSelector}

Provide the fixed code, a brief explanation, and a confidence score (0-1). Format your response as:
---CODE---
[fixed code here]
---EXPLANATION---
[explanation here]
---CONFIDENCE---
[0-1 number]`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      thinking: { type: 'disabled' }
    });

    const response = completion.choices[0]?.message?.content || '';

    // Parse the response
    const codeMatch = response.match(/---CODE---\n([\s\S]*?)\n---EXPLANATION---/);
    const explanationMatch = response.match(/---EXPLANATION---\n([\s\S]*?)\n---CONFIDENCE---/);
    const confidenceMatch = response.match(/---CONFIDENCE---\n([\d.]+)/);

    const remediationCode = codeMatch?.[1]?.trim() || '';
    const explanation = explanationMatch?.[1]?.trim() || '';
    const confidence = parseFloat(confidenceMatch?.[1] || '0.85');

    return {
      remediationCode,
      explanation,
      confidence: Math.min(1, Math.max(0, confidence))
    };
  } catch (error) {
    logger.error({ err: error }, '');
    throw error;
  }
}

function templateRemediation(violation: RemediationRequest): { remediationCode: string; explanation: string; confidence: number } {
  const html = violation.elementHtml || '';
  const rule = WCAG_RULES[violation.ruleId] || { name: violation.ruleId, requirement: violation.description };

  const fixFor: Record<string, () => { remediationCode: string; explanation: string }> = {
    'image-alt': () => ({
      remediationCode: html.replace(/(<img\b[^>]*?)\/?>/i, (match, open) =>
        match.includes('alt=') ? match : `${open} alt="${violation.description || 'Descriptive alt text for this image'}" />`
      ),
      explanation: 'Added a descriptive alt attribute so screen readers can describe the image content.',
    }),
    label: () => ({
      remediationCode: html.includes('id=')
        ? html
        : `<label for="${Math.random().toString(36).slice(2, 8)}">${violation.description || 'Field label'}</label>\n${html}`,
      explanation: 'Associated the input with a label so screen readers announce the field purpose.',
    }),
    'link-name': () => ({
      remediationCode: html.replace(/(<a\b[^>]*?>)[\s\S]*?(<\/a>)/i, `$1${violation.description || 'Read more about this topic'}$2`),
      explanation: 'Replaced generic link text with descriptive text that identifies the link destination.',
    }),
    'color-contrast': () => ({
      remediationCode: html,
      explanation: 'Adjust the CSS text color/background combination to reach a 4.5:1 contrast ratio (WCAG 2.1 AA).',
    }),
  };

  const fallback = {
    remediationCode: html,
    explanation: `Fix the ${rule.name} violation: ${rule.requirement}`,
  };

  const fix = fixFor[violation.ruleId]?.() ?? fallback;
  return {
    remediationCode: fix.remediationCode,
    explanation: `${fix.explanation} Rule: ${rule.name} (${violation.wcagCriteria}).`,
    confidence: 0.5,
  };
}

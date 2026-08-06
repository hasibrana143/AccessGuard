import { describe, it, expect } from 'vitest';
import {
  PROMPT_VERSION,
  WCAG_RULES,
  getRuleInfo,
  buildSystemPrompt,
  buildUserPrompt,
  parseRemediationResponse,
  renderTemplateFix,
} from '@/ai/prompts';

describe('ai/prompts', () => {
  it('exposes a versioned prompt contract', () => {
    expect(PROMPT_VERSION).toBe(1);
    expect(WCAG_RULES['image-alt'].name).toContain('1.1.1');
  });

  it('falls back to generic rule info for unknown rules', () => {
    const info = getRuleInfo('unknown-rule', 'fallback requirement');
    expect(info.name).toBe('unknown-rule');
    expect(info.requirement).toBe('fallback requirement');
  });

  it('builds a user prompt containing violation context', () => {
    const prompt = buildUserPrompt({
      ruleId: 'image-alt',
      wcagCriteria: '1.1.1',
      description: 'Image missing alt',
      elementHtml: '<img src="a.jpg" />',
      elementSelector: 'img',
    });
    expect(prompt).toContain('image-alt');
    expect(prompt).toContain('1.1.1');
    expect(prompt).toContain('<img src="a.jpg" />');
    expect(prompt).toContain('---CODE---');
    expect(prompt).toContain('---CONFIDENCE---');
  });

  it('parses a well-formed model response', () => {
    const parsed = parseRemediationResponse(
      '---CODE---\n<img alt="x" src="a.jpg" />\n---EXPLANATION---\nAdded alt.\n---CONFIDENCE---\n0.92'
    );
    expect(parsed.remediationCode).toBe('<img alt="x" src="a.jpg" />');
    expect(parsed.explanation).toBe('Added alt.');
    expect(parsed.confidence).toBe(0.92);
    expect(parsed.promptVersion).toBe(PROMPT_VERSION);
  });

  it('clamps confidence outside [0,1]', () => {
    expect(parseRemediationResponse('---CODE---\nc\n---EXPLANATION---\ne\n---CONFIDENCE---\n1.9').confidence).toBe(1);
    expect(parseRemediationResponse('---CODE---\nc\n---EXPLANATION---\ne\n---CONFIDENCE---\n0').confidence).toBe(0);
  });

  it('uses the default confidence when missing', () => {
    const parsed = parseRemediationResponse('---CODE---\nc\n---EXPLANATION---\ne');
    expect(parsed.confidence).toBe(0.85);
  });

  it('renders template fixes without claiming AI origin', () => {
    const fix = renderTemplateFix('<img src="a.jpg">', 'image-alt', 'Image missing alt');
    expect(fix.remediationCode).toContain('alt=');
    expect(fix.explanation).toContain('Rule:');
    expect(fix.explanation).not.toContain('AI');
  });
});
import ts from 'typescript';
import { isJsxLikeFile, liveTagStarts, locateElement } from '@/lib/ast-patch';
import { parseTagAttributes } from '@/lib/html-attributes';

export interface ElementContext {
  /** Lower-cased tag name, e.g. "div". */
  tag: string;
  /** The id of the element, when it has one. */
  id: string | null;
  /** The class names of the element. */
  classes: string[];
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

const RAW_TEXT_TAGS = new Set([
  'script', 'style', 'textarea', 'title', 'xmp', 'listing', 'plaintext', 'noscript',
  'iframe', 'noembed', 'noframes',
]);

const INERT_TAGS = new Set(['template', 'object', 'applet', 'frameset']);

interface TagStart {
  name: string;
  closing: boolean;
  nameEnd: number;
}

/** Find a tag name without treating a quoted attribute value as markup. */
function readTagStart(content: string, start: number): TagStart | null {
  const match = /^<\s*(\/?)\s*([a-zA-Z][^\s/>]*)/.exec(content.slice(start, start + 256));
  if (!match) return null;
  return {
    name: (match[2] as string).toLowerCase(),
    closing: match[1] === '/',
    nameEnd: start + match[0].length,
  };
}

/** Find the `>` that closes a tag while respecting quoted attribute values. */
function findTagEnd(content: string, start: number): number {
  let index = start + 1;
  let quote: string | null = null;
  while (index < content.length) {
    const character = content[index] as string;
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
    index++;
  }
  return content.length;
}

/** Find the real end tag of a raw-text element, ignoring names such as `</scripture>`. */
function findRawTextEnd(content: string, tag: string, from: number): number {
  const lower = content.toLowerCase();
  const needle = `</${tag}`;
  let index = lower.indexOf(needle, from);
  while (index !== -1) {
    const after = lower[index + needle.length];
    if (after === undefined || after === '>' || after === '/' || /\s/.test(after)) {
      return index;
    }
    index = lower.indexOf(needle, index + 1);
  }
  return -1;
}

/** Find the matching end of nested inert content so its tags cannot affect the stack. */
function findInertEnd(content: string, tag: string, from: number): number {
  const lower = content.toLowerCase();
  const open = `<${tag}`;
  const close = `</${tag}`;
  let depth = 1;
  let index = from;

  while (index < content.length) {
    const lt = content.indexOf('<', index);
    if (lt === -1) return -1;

    if (content.startsWith('<!--', lt)) {
      const end = content.indexOf('-->', lt + 4);
      index = end === -1 ? content.length : end + 3;
      continue;
    }

    if (lower.startsWith(close, lt)) {
      const after = lower[lt + close.length];
      if (after === undefined || after === '>' || after === '/' || /\s/.test(after)) {
        depth--;
        if (depth === 0) return lt;
        index = lt + close.length;
        continue;
      }
    }

    if (lower.startsWith(open, lt)) {
      const after = lower[lt + open.length];
      if (after === '>' || after === '/' || (after !== undefined && /\s/.test(after))) {
        depth++;
        index = findTagEnd(content, lt) + 1;
        continue;
      }
    }

    index = findTagEnd(content, lt) + 1;
  }

  return -1;
}

/** Read the identifying attributes used to compare a runtime reach with an ancestor. */
function htmlElementContext(
  content: string,
  tag: string,
  nameEnd: number,
  tagEnd: number
): ElementContext {
  const attributes = parseTagAttributes(content.slice(nameEnd, tagEnd));
  const classes: string[] = [];
  let id: string | null = null;
  let hasClass = false;

  for (const attribute of attributes) {
    if (attribute.name === 'id' && id === null) id = attribute.value;
    if (attribute.name === 'class' && !hasClass) {
      hasClass = true;
      classes.push(...attribute.value.split(/\s+/).filter(Boolean));
    }
  }

  return { tag, id, classes };
}

/**
 * The elements that contain the element in `content`, outermost first.
 * `null` when the element cannot be located or the relation cannot be established.
 */
export function elementAncestors(
  content: string,
  filePath: string,
  elementHtml: string,
  occurrence: number = 0
): ElementContext[] | null {
  if (!elementHtml) return null;

  if (usesJsx(filePath, content)) {
    const jsxPath = filePath.replace(/\.ts$/i, '.tsx');
    const location = locateElement(content, jsxPath, elementHtml, occurrence);
    if (!location) return null;

    const source = ts.createSourceFile(
      jsxPath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind(jsxPath)
    );
    const found: { node: ts.JsxElement | ts.JsxSelfClosingElement | null } = { node: null };

    const visit = (node: ts.Node): void => {
      if (
        found.node === null &&
        (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.getStart(source) === location.start
      ) {
        found.node = node;
        return;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);

    const target = found.node;
    if (!target) return null;

    const ancestors: ElementContext[] = [];
    for (let parent = target.parent; parent; parent = parent.parent) {
      if (ts.isJsxElement(parent)) {
        ancestors.unshift(jsxElementContext(parent.openingElement, source));
      }
    }
    return ancestors;
  }

  const location = locateElement(content, filePath, elementHtml, occurrence);
  if (!location) return null;

  const live = liveTagStarts(content);
  const stack: ElementContext[] = [];
  let index = 0;

  while (index < content.length) {
    const lt = content.indexOf('<', index);
    if (lt === -1) break;

    if (content.startsWith('<!--', lt)) {
      const ends = [content.indexOf('-->', lt + 4), content.indexOf('--!>', lt + 4)]
        .filter((end) => end !== -1);
      index = ends.length ? Math.min(...ends) + 3 : content.length;
      continue;
    }

    if (content.startsWith('<!', lt) || content.startsWith('<?', lt)) {
      const end = content.indexOf('>', lt);
      index = end === -1 ? content.length : end + 1;
      continue;
    }

    const tagStart = readTagStart(content, lt);
    if (!tagStart) {
      index = lt + 1;
      continue;
    }

    const tagEnd = findTagEnd(content, lt);
    if (tagStart.closing) {
      for (let stackIndex = stack.length - 1; stackIndex >= 0; stackIndex--) {
        if (stack[stackIndex]?.tag === tagStart.name) {
          stack.length = stackIndex;
          break;
        }
      }
      index = tagEnd + 1;
      continue;
    }

    if (RAW_TEXT_TAGS.has(tagStart.name)) {
      const end = tagStart.name === 'plaintext'
        ? -1
        : findRawTextEnd(content, tagStart.name, tagEnd + 1);
      index = end === -1 ? content.length : end;
      continue;
    }

    if (INERT_TAGS.has(tagStart.name)) {
      const end = findInertEnd(content, tagStart.name, tagEnd + 1);
      index = end === -1 ? content.length : end;
      continue;
    }

    if (!live.has(lt)) {
      index = tagEnd + 1;
      continue;
    }

    if (lt === location.start) {
      return stack.map((ancestor) => ({ ...ancestor, classes: [...ancestor.classes] }));
    }

    const inner = content.slice(lt + 1, tagEnd).trimEnd();
    if (!VOID_TAGS.has(tagStart.name) && !inner.endsWith('/')) {
      stack.push(htmlElementContext(content, tagStart.name, tagStart.nameEnd, tagEnd));
    }
    index = tagEnd + 1;
  }

  return null;
}

/** Choose the parser that matches the source language. */
function scriptKind(filePath: string): ts.ScriptKind {
  if (/\.tsx$/i.test(filePath)) return ts.ScriptKind.TSX;
  return ts.ScriptKind.JSX;
}

/** True when a file contains JSX that the TypeScript parser can identify. */
function usesJsx(filePath: string, content: string): boolean {
  if (isJsxLikeFile(filePath)) return true;
  if (!/\.ts$/i.test(filePath)) return false;

  const source = ts.createSourceFile(
    filePath.replace(/\.ts$/i, '.tsx'),
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  let found = false;
  const visit = (node: ts.Node): void => {
    if (
      ts.isJsxSelfClosingElement(node) ||
      (ts.isJsxElement(node) && ts.isJsxClosingElement(node.closingElement))
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** Read the identifying attributes from a JSX opening element. */
function jsxElementContext(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  source: ts.SourceFile
): ElementContext {
  const classes: string[] = [];
  let id: string | null = null;

  for (const property of node.attributes.properties) {
    if (!ts.isJsxAttribute(property)) continue;
    const name = property.name.getText(source).toLowerCase();
    if (name !== 'id' && name !== 'class' && name !== 'classname') continue;

    const value = jsxAttributeValue(property, source);
    if (name === 'id') {
      if (id === null && value !== null) id = value;
    } else if (value !== null) {
      classes.push(...value.split(/\s+/).filter(Boolean));
    }
  }

  return { tag: node.tagName.getText(source).toLowerCase(), id, classes };
}

/** Read a JSX attribute only when its value is a static string. */
function jsxAttributeValue(
  attribute: ts.JsxAttribute,
  source: ts.SourceFile
): string | null {
  if (!attribute.initializer) return '';
  if (
    ts.isStringLiteral(attribute.initializer) ||
    ts.isNoSubstitutionTemplateLiteral(attribute.initializer)
  ) {
    return attribute.initializer.text;
  }
  if (!ts.isJsxExpression(attribute.initializer)) return null;

  const expression = attribute.initializer.expression;
  if (
    expression &&
    (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
  ) {
    return expression.text;
  }
  return null;
}

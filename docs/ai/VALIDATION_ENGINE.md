# Volume 5 — Validation Engine

## 1. Layers

A fix passes five layers before it can touch a repository. Each layer can stop it.

1. **Safety validation** — `validateRemediation` (`src/lib/github-pr.ts`): the
   attributes are parsed the way a browser parses them
   (`src/lib/html-attributes.ts`). It blocks `<script>` in any spelling,
   active/embedding elements (`iframe`, `object`, `embed`, `svg`, `style`, `link`,
   `meta`, `frame`, `frameset`, `portal`, `video`, `audio`, `plaintext`, …),
   **every** event handler attribute (also when the scanned element
   already carried one), URI attributes whose scheme is not on the allow list
   (`javascript:`, `vbscript:`, `data:text/html`, … — checked after entity decoding
   and normalisation, so `&#106;avascript:` and `java\tscript:` are caught),
   overlay capable styles (`position`, `z-index`, viewport units, `url()`),
   `opacity:0` (the priority suffix is not part of the value, so
   `opacity:0!important` is the same declaration), any
   **brace** (it becomes an expression in JSX and an interpolation in a template
   file), **server-template syntax** (`<% … %>`, `<? … ?>`, `{{ … }}`, `{% … %}`,
   `{# … #}`, `<# …` — the template engine of the customer's build evaluates it), an
   `<input>` whose type is an image **after the browser decodes it**
   (`type="im&#97;ge"` is `image`) or whose type carries an entity the decoder
   does not know, and a remediation that **adds a class** the original element
   does not have (a class is a hook into the repository's stylesheet, whose effect
   is not part of the isolated verification; the JSX spelling `className` is the
   same hook, because React maps it to the browser's `class` attribute); it rejects
   unclosed tags; size cap
   20k chars. The style check rejects a
   value that carries an **entity, a CSS escape or a CSS comment** instead of
   guessing what the browser resolves it to — a partial entity table cannot mirror
   the browser (`position&sol;&ast;x*&sol;:fixed` is `position: fixed`).
   A remediation is also rejected when it **hides the element it patches**
   (`hidden`, `display:none`, `visibility:hidden`) or hides the element or its
   text in any other way (`font-size:0`, `line-height:0`,
   `content-visibility:hidden`, `scale:0`, `filter:opacity(0)`, an off-screen
   `translate` or `text-indent`), when it gives the patched element a **zero
   size** (`width:0`, `height:0`) or moves it off-screen with a **large negative
   margin**, when it makes the **text transparent**
   (`color:transparent`, a colour with an alpha of zero — in the modern syntaxes
   as well, so `oklch(0 0 0 / 0%)` is transparent — and
   `-webkit-text-fill-color:transparent`), when it carries **HTML comment
   syntax** (`<!--`, `-->`, `--!>` — a comment swallows the markup behind it),
   when it **changes, drops or adds a destination** of a URI attribute (the
   comparison is made on the URL the way the browser resolves it, so the
   protocol-relative, single-slash and backslash spelling of a remote URL cannot
   slip past it, and a changed `href` may not point the user somewhere else;
   **every** duplicate of the attribute is compared in source order, because the
   browser uses the first one, and `ping` and `attributionsrc` are parsed as the
   space-separated URL list the browser parses),
   and when it does not create a **live element** for the rule it claims to fix
   (an `<img>` inside `textarea`, `title` or a bogus comment is not a fix, and an
   `image-alt` fix has to keep the media source of the original image).
2. **Rule validation** — `validateFixForRule` (`src/lib/fix-validation.ts`): the fix
   must contain what the rule needs (an `alt=`, a `<label>`, an accessible name).
3. **Placeholder rejection** — `containsPlaceholder` (`src/lib/ast-patch.ts`): a fix
   that still says `TODO`, `FIXME`, `{{alt_text}}`, `YOUR_ALT_TEXT` is discarded. It
   is not a fix, it is a note about a fix.
4. **Structural patching** — `locateElement` / `buildReplacement` (`src/lib/ast-patch.ts`):
   the target element is located in the source and the patch is written there, then the
   result is re-parsed. A patch that would not parse is discarded, and so is a patch
   that would empty the visible text of the element (text hidden with `hidden`,
   `display:none`, `visibility:hidden` or `opacity:0` does not count as visible —
   the CSS priority suffix is stripped first, so `opacity:0!important` is caught too;
   `aria-hidden` does **not** hide anything visually, so its text counts as visible
   text). The new text has to **keep** the old text: a fix that reduces "Read more"
   to "R" passes every rule check and still deletes what the user reads.
   A fix is only written when **every** occurrence of its element in the file is
   covered by a selected fix: the fixes are matched to the occurrences in order, so
   selecting one of two identical elements would otherwise patch the wrong one.
   Two selected copies of the same element with different remediations cannot be
   mapped at all and stay review suggestions.
   Such a fix stays a review suggestion.
5. **Verification** — `verifyFixes` (`src/lib/fix-verification.ts`): axe is re-run on
   the remediation snippet, in a browser that cannot make network requests or open a
   WebSocket, under a restrictive CSP. Only a verified fix may open a PR (see
   `FIX_VERIFICATION.md`).

Layers 1–3 run **before** layer 5, so unsafe markup is never rendered in the
verification browser.

The repository writer (`src/lib/github.ts`) adds five more conditions before it
writes anything into a customer's repository:

- the GitHub tree must not be `truncated` — a partial list cannot prove uniqueness;
- **every text file** of the tree must be readable, whatever its extension — a
  file the writer does not know (a template, a partial, a content file) can hold
  the same element, and an unreadable file (the API returns it with
  `encoding: 'none'`) counts as unreadable;
- the whole scan must fit the byte budget (5 MB);
- the tree must not hold a **submodule** (a tree entry of type `commit`): it holds
  files the tree does not list, so the scan is incomplete;
- the repository's **own stylesheets** must not be able to harm the patched
  element: **every** style source the repository owns is read and matched against
  the element (`src/lib/css-context.ts`) — the stylesheet files (`.css`, `.scss`,
  `.less`, …), the `<style>` block of every file, the stylesheets a file links and
  the stylesheets they import. A rule that can turn the element into a
  full-viewport overlay (a positioned element that spans the viewport) or hide it
  (`display:none`, `visibility:hidden`, `opacity:0`, `content-visibility:hidden`,
  a zero `scale`, a `filter: opacity(0)`, an off-screen `translate`, a zero
  `font-size`/`line-height` on a text-bearing element, a large negative
  `text-indent`, a large negative margin) keeps the fix out of the repository.
  The rules of a utility stylesheet are read together, so `fixed inset-0 w-screen
  h-screen` is caught even when no single rule covers the viewport, and the verdict
  does not depend on the order the stylesheets were read in. The reader follows the
  browser: the CSS priority suffix is stripped (`fixed!important` is `fixed`), every
  logical, small and large viewport unit is known (`100vi`, `100vb`, `100svw`,
  `100lvh`), the `inset` shorthand sets its edges the way the browser assigns them
  (`inset:0 0` sets the block edges and the inline edges), the logical inset
  longhands (`inset-block-start`, `inset-block-end`, `inset-inline-start`,
  `inset-inline-end`) set the same edges, the logical sizing
  properties (`inline-size`, `block-size`) are known, CSS escapes are decoded, a
  comment opener inside a string is text, native nesting is flattened and the frames
  of an animation are judged when the element animates with them — including the
  **end state**, which is what the user sees after the animation runs (a **reversed**
  animation ends at its *first* frame, so the visible frame is chosen from the
  animation's direction). The effective
  style of the patched element is the repository's rules **plus the remediation's
  own inline declarations**, and the custom properties the fix defines resolve the
  `var()` references of the repository's rules. A stylesheet the analyser cannot
  judge, a value it cannot compute for a property the fix changes, a **relational
  selector** (`:has(…)`, whose DOM context the fix can change), a **dynamic style
  source** (a JSX `<style>{expression}</style>`) and a **runtime-created style**
  (a repository script that calls `createElement('style')`, `insertRule(…)` or
  assigns `style.textContent`) are **unprovable** — an unprovable destination
  never receives a source patch.

  The same judgement follows the paint and the geometry the customer sees. A
  repository rule that makes the text **transparent** (`color:transparent`, a
  colour with an alpha of zero), moves the element off-screen with a **logical
  margin** (`margin-inline-start:-10000px`) or a **negative positional offset**
  (`left:-9999px`), gives it a **zero dimension** (`width:0`), removes its box with
  `display:contents`, or ends an animation invisible hides the patched element, so
  the fix stays out of the repository. A size the analyser cannot compute — a fixed
  length that may be as long as the customer's screen (`9999px`), a viewport unit
  above 100% (`200vw`), a font-relative length of 64 units or more — is
  **unprovable**, never harmless.

  A rule the fix **activates** is judged as well, not only a rule that matches the
  patched element. A **sibling or descendant selector** whose compound asks for an
  attribute the fix adds (`[alt] ~ .overlay`) starts matching when the fix lands:
  the rule can take over another element of the customer page, so the destination is
  unprovable. A **network-bearing declaration** of such a rule (`background-image:
  url(…)`) loads a resource in the customer browser, which the verification browser
  blocks and therefore never sees: the destination is unprovable.

  The repository's **runtime** is judged as well, because the verification browser
  does not run the customer's JavaScript. A script that **conditionally mutates** an
  element — it reads the element's state (`hasAttribute(…)`, `matches(…)`) and then
  changes its class, its inline style or its attributes — can take the patched
  element over as soon as the fix adds the attribute the script reads; a script that
  names the patched element by its id can take it over unconditionally. A **service
  worker** can deliver the stylesheet bytes the static scan cannot see, and a
  **CSS-in-JS** library builds the selector and the declaration at runtime. All of
  them are unprovable, and an unprovable destination never receives a source patch.

  The runtime is read in **both carriers**: an **inline `<script>`** in the repository
  HTML is runtime code like a linked script — an unclosed block cannot be followed, so
  it fails closed — and a **DOM property getter** (`img.alt`, `el.className`,
  `el.dataset.x`) is a state read like `hasAttribute(…)`, because the property
  reflects the attribute the fix adds.

  Four more gaps of the same judgement are closed. **Selector identifiers** are
  decoded the way the browser decodes them — the attribute *name* included, so
  `[a\6ct]` reaches the added `alt` instead of looking like no rule at all. The
  **painted box** is judged, not the content box: padding, border, `box-sizing`,
  `scale` and `transform: scale(…)` are composed into the box the customer sees, so
  a `50vw × 50vh` box scaled by `3` covers the viewport and a `10000px` border or
  padding grows the box far past it; a box that *may* cover the viewport is
  unprovable, and a declared size the analyser cannot compute stays unprovable. A
  fix that adds **`autofocus`** gives the element the focus, so every focus rule whose
  compound can match it is judged too — `input:focus ~ .overlay` takes the page over,
  and `input:focus{background-image:url(…)}` makes the customer browser request a
  resource. The **play state** of an animation decides the frame the customer sees: a
  **paused** animation stays on its first frame.

  Six more gaps of the same judgement are closed after that. **Event-handler
  attributes** are runtime carriers: `<body onload="…">` runs when the event fires, so
  the handler body is analysed like an inline script, and a handler whose value cannot
  be read fails closed. The DOM APIs that read an attribute's presence **generically**
  — `getAttributeNames()`, `getAttributeNode()`, `attributes.getNamedItem()`,
  `hasAttributes()`, an iteration of `element.attributes` and the **markup read**
  (`outerHTML`) — are state reads like `hasAttribute(…)`, so a script that enumerates
  the attributes (or reads the markup that carries them) and then mutates reacts to
  any attribute the fix adds. The markup of the **document**
  (`document.body.innerHTML`) stays out of the family: it carries the customer's own
  unconditional runtime, not the attributes of the element the fix patches. The
  **effective painted surface** is composed, not the content box: the
  **logical** padding and border longhands set the same edges as the physical ones,
  `zoom` is a scale factor like `scale` and `transform: scale(…)`, a scale above one
  on an axis **without a declared size** cannot be computed (the intrinsic size is
  unknown) and stays unprovable, an **`aspect-ratio`** that fills an axis the element
  does not declare is unprovable (the derived size depends on the shape of the
  customer's screen), and a **`box-shadow`** grows the painted area by its blur and
  spread on every side — even for an element that is not positioned. A **maximum size
  is a cap**, so it is composed with the overflow: a zero `max-height` / `max-width`
  together with a clipping overflow removes the patched control from the paint. The
  **resource check** of an activated rule resolves the `var()` references of the
  declaration before it looks for a `url(…)`, against the definitions that can reach
  the element — the global ones (`:root`, `html`) included — and a reference that
  stays unresolved is unprovable; the effective style is deliberately *not* widened with
  the global definitions, because a value that only `:root` defines may be conditional
  or overridden. The **animation delay, duration and fill mode** decide the frame the
  customer sees: a paused animation with a **negative delay** sits at that progress on
  the timeline (the keyframe offsets are kept so the frame can be chosen), and a
  running animation with a positive delay shows the **first** frame during the delay
  when the fill mode is `backwards` or `both`.

   Nine more gaps of the same judgement are closed after that. **Attribute reads
   whose name the script builds** are resolved: a concatenation of string literals
   (`'a'+'lt'`) names the attribute it evaluates to, and a name the reader cannot
   resolve fails closed into the generic bucket — `hasAttributes()` and the **markup
   read** (`outerHTML`) join the generic reads (`getAttributeNames()`,
   `getAttributeNode()`, `attributes.getNamedItem()`). A **`<script src>` target**
   is followed into the tree and read as runtime code whatever the file is called — a
   browser executes the response by its MIME type, not by its suffix — and a target
   outside the repository makes the destination unprovable. The runtime is judged
   against **every element the remediation introduces**: a script that names an added
   id or reads an added attribute reaches that element only after the fix lands. The
   **functional pseudo-classes** `:is()`, `:where()` and `:not()` are read and
   matched the way the browser matches them, and the fix's **removed** classes and
   attributes are tracked — removing `.card` makes `:not(.card)` start matching. An
   added **`tabindex`** is a focusability transition like `autofocus`, so every
   focus rule whose compound can match the element is judged. The **painted
   surface** is composed for a **non-positioned** element as well, and a painted
   box that covers the viewport **because of the fix** is refused. A large
   **positive** offset or margin is off-screen just like a large negative one. A
   remediation may not **introduce a URI attribute** the original element does not
   have — a relative path is a request from the customer's browser — and only a
   pure in-page fragment (`#main`) stays allowed. No **live element** of the
   replacement may be hidden: the `hidden` attribute and the hiding styles are
   refused on every live tag, not only on the first one.

   Seven more gaps of the same judgement are closed after that. The repository's
   stylesheet and script references are resolved against the document's **effective
   base URL** — a `<base href>` changes that base, so the reference is read where the
   browser reads it, and a base that cannot be resolved from repository source or that
   points outside the repository makes the destination unprovable. A **computed
   property read** (`img["al"+"t"]`) and a **computed selector read**
   (`img.matches("["+"al"+"t"+"]")`) are state reads: the name is resolved when it is a
   concatenation of string literals and fails closed into the generic bucket
   otherwise. The destination CSS models an attribute **value change** under a negated
   requirement, reduces a **nested negation** the way the browser reduces it and reads
   the selector list of **`:nth-child(… of …)`**; a functional pseudo-class whose
   transition cannot be read fails closed. The **actual focusability** is compared
   before and after the fix — an added `href`, an added `contenteditable` and a
   `tabindex` value change are focusability transitions like an added `tabindex`. The
   **outline** grows the painted surface on every side without changing the layout, so
   a `100000px` outline covers the viewport although the element itself is `64×64`. The
   `inset`, `inset-block` and `inset-inline` **shorthands** are expanded into their
   physical edges, so a large offset written as a shorthand is off-screen like the
   longhand. And the **safety analysis runs for every candidate**: the ten-source-write
   budget limits the source writes, never the validation, the runtime analysis or the
   destination analysis, so an unsafe candidate beyond the budget cannot become a
   review artifact.

   Nine more gaps of the same judgement are closed after that. The **stylesheet
   discovery follows the browser**: a `<link>` is parsed with the quoted attribute
   semantics of `src/lib/html-attributes.ts` (a `>` inside a quoted value does not end
   the tag), the HTML entities of `rel` and `href` are decoded before they are
   compared, and a link whose attributes cannot be read makes the destination
   **unprovable** instead of being skipped. The **document base** is read at runtime as
   well: a repository script that assigns the `href` of a `<base>` element changes the
   base the browser loads its stylesheets from, so the base becomes unprovable and the
   destination is refused instead of falling back to the document URL. A **remediation
   that introduces an element** changes the DOM position of the elements around it, so
   a repository stylesheet with a **structural selector** (`:nth-child(…)`,
   `:nth-last-child(…)`, a sibling combinator) makes the destination unprovable; the
   patched element itself is identified by its **id** (or by its kind when it has
   none), never by its position in the snippet, and a remediation that removes an
   element of the original is refused. The **remediation's own inline style** is
   checked for a resource with the same machinery as the repository's rules: the
   `var()` references resolve against the definitions that can reach the element, an
   `image-set(…)` is a resource like a `url(…)`, and an unresolved reference is
   unprovable. The **closing bracket of an attribute selector** is read with quote and
   escape handling, so `img[alt="\]"]` is the selector the browser sees and not a
   malformed one. The **link state** is compared before and after the fix: an added
   `href` turns `:link` and `:any-link` on, so the rules that use them are judged like
   the rules the fix activates with an attribute. A **viewport-unit offset** is
   composed with the **declared size** of the element, so `99vw` moves a `64×64` target
   out of the viewport although the offset alone is smaller than one viewport.

   Nine more gaps of the same judgement are closed after that. The **runtime reads an
   attribute by the shape of the call**, not by a literal method name: the direct call,
   the optional call (`img.getAttribute?.('alt')`), the prototype receiver
   (`Element.prototype.getAttribute.call(img,'alt')`), a statically resolvable
   computed method name (`img['get'+'Attribute']('alt')`) and a **tagged-template**
   invocation (``img.getAttribute`alt`` — the template strings are the first
   argument of the call) are the same read, and the
   attribute argument is resolved with the existing string-expression resolver. A
   method name or an attribute name the reader cannot resolve fails closed into the
   generic bucket, because the script then reacts to **any** attribute the fix adds. A
   **dataset key** is mapped to its `data-*` attribute for the bracket access
   (`img.dataset['state']`) and for the `Reflect.get` / `getOwnPropertyDescriptor`
   forms on a `dataset` receiver, so the reader sees the same attribute the browser
   sees. An **id the fix introduces** is an introduced id on the patched target as
   well as on every element the remediation adds: `document.getElementById('activated')`
   finds the element only after the fix, so the runtime reference refuses the source
   patch. An **indexed collection receiver** resolves to its collection —
   `document.querySelectorAll('base')[0].href='/sub/'` names an element the analyser
   cannot choose, so the document base becomes unprovable and the stylesheet the
   browser really loads is the one that is judged.

   The **destination CSS** closes four more gaps of the same kind. The **colour alpha**
   is read in one browser-equivalent grammar: the legacy comma alpha and the modern
   slash alpha, for every colour function that has one, so `rgba(0 0 0 / 0)` is
   transparent like `rgba(0,0,0,0)`. A **removed class** and a **changed attribute
   value** propagate through a nested negation and through the `:is()` / `:where()`
   alternatives, so `button:is(:not(.armed))` is a rule the fix activates when the fix
   removes `.armed`. An **`@font-face`** is collected with its `src` descriptors, and an
   activated `font-family` resolves to the resource of the matching face, so a font
   the fix activates is a customer-side request like any other resource. And the
   **remediation's own accessibility semantics** are read the way the browser reads
   them: the value is entity-decoded (`aria-hidden="&#116;rue"` is `true`), `inert`
   hides the element, and the **remediation's ancestors** are inspected as well, so an
   `aria-hidden="true"` wrapper hides the repaired image. A `role="presentation"`
   ancestor is **not** a hiding form — Chromium keeps the image with the role `image` —
   and the legitimate decorative-image cases stay allowed.

An incomplete scan never patches a file; the fix stays a review suggestion. The
review comment that is written into the file instead neutralizes the comment
terminator (`*/`, `-->`, `--!>`), so untrusted text cannot close the comment and
become code.

A fix is only written into a file whose destination context can be proven: an HTML
file (where only a **live tag** counts — not markup inside a comment, a script
block or another tag's attribute value) or a JSX file (where the element is located
through the AST). A TypeScript module or a component file that mixes markup and
code has no proven context — the element text can sit inside a string or an
expression there — so the fix ships as a review suggestion. Those files are still
scanned, so a duplicate in one of them keeps the remaining match ambiguous.

The **live context** follows the browser: markup inside a raw-text element
(`script`, `style`, `textarea`, `title`, `xmp`, `listing`, `plaintext`, `noscript`,
`iframe`, `noembed`, `noframes`) never becomes an element, the content of a
`template`, `object`, `applet` or **`frameset`** is parsed but never rendered (in
a frameset document it is frame content, not body content), and an element that
is never closed keeps the rest of the document as its text. The end tag has to be a
real end tag: `</scripture>` does not close a script. A markup declaration that is
not a comment (`<!bogus …>`, a CDATA section) is a bogus comment that ends at the
next `>`, and an end tag inside a quoted attribute value belongs to the attribute,
not to the element.

A **template destination** is refused as well: an HTML file that carries
server-template syntax (`<% … %>`, `<? … ?>`, `{{ … }}`, `{% … %}`, `{# … #}`,
`<# …`) is a template, not HTML. Nothing is written into it — not the patch and
not the review comment, because the template engine would evaluate the comment as
well.

Output is embedded in an `accessguard/fix-accessibility-fixes-{date}-{ts}` branch PR
with a summary file — a human reviews before merge; nothing auto-merges. Every opened
PR writes a `github_pr_created` audit log entry; the write is retried
(`createAuditLogWithRetry`) before the route reports a missing trail.

The route **proves before it mutates**. The writer has a plan phase
(`planRepositoryFixes`, no writes) and an apply phase (`applyRepositoryFixPlan`), and
the route plans first. A candidate the destination CSS, the repository runtime or the
static safety checks refused gets **no artifact at all** — no patch, no review
document, no summary entry, no link — and a run in which every candidate is refused
creates no branch and no pull request.

The **audit intent** (`github_pr_intent`) is written **before** the branch is created,
so a repository mutation can never exist without a trail: if the intent cannot be
written, nothing is created at all. The closing `github_pr_created` record follows the
pull request; if that write fails, the intent record remains the recoverable trail and
the response says so (`auditRecorded: false`, `auditNotice`).

## 2. Purpose

- Prevent AI-generated code from introducing XSS/second-order injection into customer codebases.
- Keep PRs small, focused, reviewable — enterprise-friendly.
- Never claim a fix was made when it was not.

## 3. Tests

- `src/lib/__tests__/fix-validation.test.ts` — injection and per-rule checks.
- `src/lib/__tests__/html-attributes.test.ts` — browser-like attribute parsing, entity
  decoding, URI normalisation, the browser-equivalent URL resolution
  (`canonicalizeUri`), handler stripping.
- `src/lib/__tests__/github-pr.test.ts` — occurrence-aware patching, placeholder,
  no-op, content-loss and syntax-guard rejection, validation bypasses (CSS escaped
  overlays, `frame`/`frameset`), the destination comparison of a URI attribute
  (protocol-relative, single-slash and backslash spelling, a changed `href`, a
  dropped source, a remote destination behind a **duplicate** attribute and a
  remote URL inside a **ping list**), the hiding styles, the modern colour alpha
  syntaxes and the **alpha of a mixed colour** (`color-mix()`, read through the
  shared colour helper), a zero-size patched element, a large negative margin, the JSX
  `className` hook, the FreeMarker directive, Markdown escaping and the inline
  code span.
- `src/lib/__tests__/fix-validation.test.ts` — injection and per-rule checks, the
  live-element and media-source requirement of the `image-alt` rule.
- `src/lib/__tests__/ast-patch.test.ts` — AST location (every identity attribute the
  report carries), JSX conversion, parse guard, visible-text guard including hidden
  text, `aria-hidden` text and the CSS priority suffix, and the live-context guard
  (raw-text elements, inert `template`/`object`/`applet`/`frameset` content,
  raw-text end tag prefixes, elements that are never closed, bogus comments and
  CDATA sections, an end tag inside an attribute value).
- `src/lib/__tests__/element-ancestors.test.ts` — the chain that contains an element:
  the HTML tag stack (a void element is not an ancestor, a sibling container is not
  one, markup inside a script block or a comment is ignored) and the JSX parent chain
  (`src/lib/element-ancestors.ts`).
- `src/lib/__tests__/css-context.test.ts` — the destination stylesheet judgement:
  overlay and hiding rules, utility stylesheets read together, conditional groups,
  comments, attribute selectors and the rules that do not reach the element — plus
  the rules the browser applies and the analyser used to miss (escaped selectors,
  properties and values, negated selectors, dynamic and logical viewport units,
  minimum viewport sizing, custom properties, native nesting, a changed attribute
  value, the CSS priority suffix, a relational selector, a dynamic style source,
  the **inset shorthand edge assignment**, the **logical sizing properties**, the
  **composition with the remediation's own inline style**, the **custom properties
  the fix defines**, the **JSX class carrier**, an **animation end state**, a large
  negative margin and a viewport-unit translation),
  and the rules the ninth review found and the analyser used to miss (the **logical
  inset longhands**, a size **larger than the viewport**, a **sibling combinator** the
  fix activates, a **repository resource** the fix activates, a **transparent
  repository colour**, a **logical margin**, a **negative positional offset**, a
  **single zero dimension**, `display:contents` and a **reversed animation**),
  the independence of the verdict from the order of the stylesheets and the
  animation frames,
  and the rules the eleventh review found and the analyser used to miss (the
  **logical padding and border longhands**, **`zoom`**, an **unconstrained scale**,
  **`aspect-ratio`**, a **viewport-wide `box-shadow`**, a **zero maximum size with a
  clipping overflow**, an **inherited custom property** behind the resource check and
  the **animation delay, negative delay and fill mode**),
  and the rules the sixteenth review found and the analyser used to miss (the
  **alpha of a mixed colour** (`color-mix()`, with the weights read from the mix),
  the **family of an activated `font` shorthand**, the **effective `src` of a
  duplicated `@font-face`** — the last declaration wins, as in the browser — and the
  **control-state transition** a fix creates (`:enabled` / `:disabled`), while the
  user-interaction pseudo-classes `:hover` and `:focus-within` stay harmless),
  and the rules the seventeenth review found and the analyser used to miss (the
  **effective `font-family` of a duplicated `@font-face`** — the last declaration wins,
  as in the browser — and a **family table that could not be read completely**, where a
  family without a readable face is unknown rather than absent),
  and the rules the eighteenth review found and the analyser used to miss (the
  **custom property an activated rule defines**, followed into the rule that
  **consumes** it — `font-family` and the `font` shorthand alike — so the chain
  `--f` → `font-family` → `@font-face` → customer-side resource is judged; the
  **order independence** of the face and the **activated rule inside a media block**;
  and the **custom property the remediation declares inline**, while a family without
  a face, a property no rule of the element consumes and a global property the fix
  does not activate stay harmless).
  and the rules the nineteenth review found and the analyser used to miss (the
  **transitive custom-property chain** — a property that an applicable declaration
  **defines while it references** a property already in the set joins the set, so the
  chain `--a` → `--b` → `font-family` → `@font-face` → customer-side resource is judged
  end to end; the **cascade winner** of a custom property — `!important`, then the
  inline style, then the **specificity** (the browser's: a CSS escape is part of the
  identifier, so `.md\:flex` is one class `(0,1,0)`), then the **source order** — the
  **document order of the page**, one cascade per document — so
  `[aria-label]{--f:Evil}` (0,1,0) beats `button{--f:Local}` (0,0,1) exactly as the
  browser computes it, and a selector whose specificity cannot be read fails closed
  (a `:root` / `html` rule is skipped instead, because it cannot match the patched
  element);
  and the **applicable font declarations cascaded instead of unioned**, so only the
  declaration the browser keeps is judged and a repository whose later rule overrides
  the family stays writable).
- `src/lib/__tests__/fix-verification.test.ts` — gate semantics, the
  check-before-render order, the browser isolation (no HTTP, no WebSocket), the
  visible-text verdict, the rendered-element verdict (a hidden element, transparent
  text in the modern syntaxes, a zero-size text, an unpainted element, an element
  moved off-screen, a zero-area element, a clipped text, an animation that ends
  invisible) and real axe runs.
- `src/lib/__tests__/github.test.ts` — the repository writer: one fetch and one write
  per file, the complete tree scan, ambiguous matches left alone, an incomplete scan
  (unreadable file, truncated tree, submodule) never patching, the destination
  stylesheet guard (a preprocessor stylesheet, a linked stylesheet, a **style the
  repository script creates at runtime**), the **runtime behaviour of the repository
  script** (a conditional class or inline-style mutation, a mutation that names the
  patched element, an **event-handler attribute** that reacts to the added
  attribute, a **generic attribute read** (`getAttributeNames()`,
  `getAttributeNode()`, `attributes.getNamedItem()`, `hasAttributes()` and the
  **markup read** `outerHTML`), a service worker, a CSS-in-JS
  library), the blob whose extension
  does not say
  whether it is binary, the template destination, failed writes not reported as
  applied, and the **alternate attribute-read call forms** (the prototype `.call`
  receiver, the optional call and the computed method name) with the **dataset
  reads** (the bracket access and the `Reflect.get` on a `dataset` receiver), the
  **id the fix introduces on the patched target**, the **indexed collection
  receivers** of the document base, the **modern slash alpha** of a transparent
  colour, the **class removal through a nested negation**, the **`@font-face`
  resource** of an activated font family, the **browser-decoded accessibility
  hiding** (`aria-hidden`, `role` and `inert`, on the element and on its
  remediation ancestors) and the **removal of `autofocus`**,
  and the behaviour the sixteenth review found and the writer used to miss (a
  **member chain read as a chain** — the dot, the computed, the optional and the
  optional computed member, for the attribute reads, the `Reflect` reads and the
  dataset reads; an **introduced id the runtime builds at runtime**; a **literal
  runtime selector that names an introduced element** by its tag, id, class or
  attribute; the **alternate base-`href` mutations** (`setAttributeNS(...)` and an
  `Attr.value` write) and the **base the runtime creates**),
  and the behaviour the seventeenth review found and the writer used to miss (every
  **statically resolvable DOM mutation** — `setAttributeNS`, the whole and the
  per-property inline style assignments, the class-name compound, the `Attr.value`
  write, the markup replacement and the object assignment — through the shared
  member-chain reader, and a **method name or a written attribute name the reader
  cannot resolve** fails closed like a generic state read),
  and the behaviour the eighteenth review found and the writer used to miss (the
  **runtime reader decides by reach and effect, not by a spelling** — the prototype
  `.call` and `.apply` mutation, the reflective write, the bound method alias, the
  bound class-list alias, the removal of the patched element, the removal through its
  parent, the page replacement and the **IDL attribute write** that empties the
  alternative text the fix adds; the **neutralisation and the destruction** of the
  fix by name and by reach; and the **unrelated computed call** on a plain array,
  whose literal and unknown index no longer refuse every fix of the repository),
  and the **writer-level refusals of the activated custom property** that loads a
  font family or a font shorthand, with the global property and the family without a
  face staying writable,
  and the behaviour the nineteenth review found and the writer used to miss (the
  **attribute-read family** as a pattern rather than a list — every `get` / `has` +
  `Attribute` + optional `Node` + optional `NS` method, with the namespaced variants
  reading the **local** name at the second argument, while `toggleAttribute` left the
  read family because it **writes**; the **reflective write that keeps its effect** —
  `Reflect.apply(fn, target, args)` resolves the method it applies, unwraps a
  `.bind()`, reads that method's arguments, and fails closed when the method or the
  arguments cannot be read; the **destruction reach that includes the ancestors** of
  the patched element, read from the repository's own markup by
  `src/lib/element-ancestors.ts`, with the removal of an element that cannot contain
  the patched one staying writable and an unprovable relation failing closed; the
  **object utilities** `Object.assign` / `Object.defineProperty` /
  `Object.defineProperties` writing the attributes they name; and the **iteration and
  focus helpers** — `forEach`, `entries`, `keys`, `values`, `item`, `focus`, `blur` —
  that no longer count as a write of the page, so a benign script that only reads and
  logs keeps its fix).
- `src/lib/__tests__/audit-retry.test.ts` — the audit write is retried before a
  missing trail is reported.
- `src/app/api/github/create-pr/route.test.ts` — the PR route: no PR without verified
  fixes, only violations with an accepted artifact linked, honest file counters, audit
  trail written before the link update.

## 4. The VPAT report (`src/lib/vpat-generator.ts`)

The same rule applies to the compliance report: it may not claim more than it knows.

- A report generated for a scan verifies that the scan belongs to the authorized
  project; a foreign scan id is answered with `404` and no violation is queried.
- Violations are queried by **project and scan**, so a report can never be built from
  another tenant's scan.
- A manual check is stored under its catalog id (`meaningful-alt`, `keyboard-flow`, …).
  The generator resolves that id through the catalog to the WCAG criterion it assesses,
  so a real manual pass can clear a minor or moderate finding, a manual fail marks the
  criterion as not supported, and a manual pass can never clear a critical or serious
  finding.
- A criterion with an unresolved violation is `partially-supports` — never `supports`.

## 5. Roadmap

- Vue / Svelte / Astro AST support (currently these file types fall back to an exact
  text match, which is conservative and can miss).
- Full page re-scan verification (needs the customer's build; today verification is
  rule-level on the remediation snippet).
- A source map from the scanned URL to the repository path, so a match is never
  ambiguous (today an ambiguous match is left to a human).
- Cache the parsed AST per file instead of re-parsing it per fix (the batch deadline
  bounds the cost today).

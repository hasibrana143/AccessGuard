// Guided manual-testing catalog: WCAG checks automation cannot decide.
// Each check carries bilingual title + step-by-step guidance. Results are
// stored per project (ManualCheck model) via /api/projects/[id]/manual-checks.

export interface ManualCheckDef {
  id: string;
  wcag: string; // e.g. "2.1.1"
  level: 'A' | 'AA' | 'AAA';
  titleEn: string;
  titleHi: string;
  stepsEn: string[];
  stepsHi: string[];
}

export const MANUAL_CHECK_STATUSES = ['pending', 'pass', 'fail', 'na'] as const;
export type ManualCheckStatus = (typeof MANUAL_CHECK_STATUSES)[number];

export const MANUAL_CHECKS: ManualCheckDef[] = [
  {
    id: 'keyboard-flow',
    wcag: '2.1.1',
    level: 'A',
    titleEn: 'Full task flow works keyboard-only',
    titleHi: 'पूरा टास्क फ़्लो कीबोर्ड से काम करता है',
    stepsEn: [
      'Unplug the mouse. Tab through the entire key user flow (signup, checkout, form submit).',
      'Every interactive element must receive visible focus and be operable with Enter/Space.',
      'No keyboard traps: you must be able to Tab away from every widget.',
    ],
    stepsHi: [
      'माउस हटाकर मुख्य फ़्लो में Tab से आगे बढ़ें।',
      'हर इंटरैक्टिव एलिमेंट पर फ़ोकस दिखे और Enter/Space से चले।',
      'कहीं कीबोर्ड ट्रैप न हो — हर विजेट से Tab से बाहर निकला जा सके।',
    ],
  },
  {
    id: 'focus-visible-order',
    wcag: '2.4.3',
    level: 'A',
    titleEn: 'Focus order is meaningful and always visible',
    titleHi: 'फ़ोकस क्रम सार्थक है और हमेशा दिखता है',
    stepsEn: [
      'Tab through the page: focus must follow the visual reading order.',
      'The focus indicator must be clearly visible on every element (not removed by CSS).',
      'Skip links, if present, must land focus on the main content.',
    ],
    stepsHi: [
      'Tab दबाकर देखें — फ़ोकस पढ़ने के क्रम में आगे बढ़े।',
      'फ़ोकस इंडिकेटर हर एलिमेंट पर साफ़ दिखे।',
      'Skip link मुख्य कंटेंट पर फ़ोकस ले जाए।',
    ],
  },
  {
    id: 'screen-reader-walkthrough',
    wcag: '1.3.1',
    level: 'A',
    titleEn: 'Screen-reader walkthrough of core pages',
    titleHi: 'मुख्य पेजों का स्क्रीन-रीडर वॉकथ्रू',
    stepsEn: [
      'With NVDA/VoiceOver running, navigate headings (H key) — structure must match the visual hierarchy.',
      'Landmarks (banner, nav, main, contentinfo) must exist and be correctly labeled.',
      'Dynamic updates (toasts, validation) must be announced via live regions.',
    ],
    stepsHi: [
      'NVDA/VoiceOver चलाकर हेडिंग से नेविगेट करें — संरचना विज़ुअल क्रम से मेल खाए।',
      'Landmarks सही लेबल के साथ मौजूद हों।',
      'टोस्ट/validation संदेश live region से सुनाई दें।',
    ],
  },
  {
    id: 'meaningful-alt',
    wcag: '1.1.1',
    level: 'A',
    titleEn: 'Image alt text is meaningful (not just present)',
    titleHi: 'इमेज alt टेक्स्ट सार्थक है (सिर्फ़ मौजूद नहीं)',
    stepsEn: [
      'Automation only checks alt EXISTS. Read each alt: does it convey the image purpose?',
      'Decorative images must have empty alt="".',
      'No alt may contain "image of" redundancy or file names.',
    ],
    stepsHi: [
      'हर alt पढ़ें — क्या वह इमेज का उद्देश्य बताता है?',
      'सजावटी इमेज में खाली alt="" हो।',
      'alt में फ़ाइल नाम या "image of" जैसी redundancy न हो।',
    ],
  },
  {
    id: 'form-errors-announced',
    wcag: '3.3.1',
    level: 'A',
    titleEn: 'Form errors are identified and announced',
    titleHi: 'फ़ॉर्म त्रुटियां पहचानी और सुनाई जाती हैं',
    stepsEn: [
      'Submit each form empty and with invalid data.',
      'Every error must name the field, describe the problem, and move/announce focus to it.',
      'Errors must not rely on color alone.',
    ],
    stepsHi: [
      'हर फ़ॉर्म खाली और गलत डेटा के साथ सबमिट करें।',
      'हर त्रुटि में फ़ील्ड का नाम, समस्या का विवरण हो और फ़ोकस वहां जाए।',
      'त्रुटि सिर्फ़ रंग से न बताई जाए।',
    ],
  },
  {
    id: 'video-captions',
    wcag: '1.2.2',
    level: 'A',
    titleEn: 'Prerecorded video has accurate captions',
    titleHi: 'रिकॉर्डेड वीडियो में सटीक कैप्शन हैं',
    stepsEn: [
      'Play each video: captions must exist, be synchronized, and match the speech.',
      'Auto-generated captions must be reviewed for accuracy.',
      'If no video exists on the site, mark N/A.',
    ],
    stepsHi: [
      'हर वीडियो चलाएं — कैप्शन मौजूद, सिंक में और सही हों।',
      'ऑटो-कैप्शन की सटीकता जांची गई हो।',
      'साइट पर वीडियो न हो तो N/A चुनें।',
    ],
  },
  {
    id: 'zoom-200',
    wcag: '1.4.4',
    level: 'AA',
    titleEn: 'Content usable at 200% zoom',
    titleHi: '200% ज़ूम पर कंटेंट usable है',
    stepsEn: [
      'Zoom the browser to 200%. No content may be clipped, overlapped, or unreachable.',
      'Horizontal scrolling for full sentences is a failure (except data tables).',
    ],
    stepsHi: [
      'ब्राउज़र 200% ज़ूम करें — कोई कंटेंट कटे, ढके या unreachable न हो।',
      'पूरे वाक्यों के लिए horizontal scroll fail है (डेटा टेबल को छोड़कर)।',
    ],
  },
  {
    id: 'color-only-meaning',
    wcag: '1.4.1',
    level: 'A',
    titleEn: 'No meaning conveyed by color alone',
    titleHi: 'सिर्फ़ रंग से कोई अर्थ न बताया गया हो',
    stepsEn: [
      'Find every color-coded signal (errors, statuses, chart segments, required markers).',
      'Each must have a text label, icon, or pattern as a second channel.',
    ],
    stepsHi: [
      'रंग से बताए गए हर संकेत (error, status, चार्ट, required) को खोजें।',
      'हर एक के साथ टेक्स्ट लेबल, आइकन या पैटर्न भी हो।',
    ],
  },
  {
    id: 'link-purpose',
    wcag: '2.4.4',
    level: 'A',
    titleEn: 'Link purpose is clear from text alone',
    titleHi: 'लिंक का उद्देश्य टेक्स्ट से ही स्पष्ट है',
    stepsEn: [
      'Read all links out of context ("click here", "read more", bare URLs).',
      'Each link must make its destination clear, via text or programmatically associated context.',
    ],
    stepsHi: [
      '"click here"/"read more" जैसे सभी लिंक संदर्भ से हटकर पढ़ें।',
      'हर लिंक का गंतव्य टेक्स्ट से स्पष्ट हो।',
    ],
  },
  {
    id: 'heading-meaning',
    wcag: '1.3.1',
    level: 'A',
    titleEn: 'Headings describe their sections accurately',
    titleHi: 'हेडिंग अपने सेक्शन का सही वर्णन करती हैं',
    stepsEn: [
      'Extract the heading outline (h1–h6). Exactly one h1 per page.',
      'Each heading must describe the content under it — no skipped levels used for styling.',
    ],
    stepsHi: [
      'हेडिंग outline निकालें — प्रति पेज exactly एक h1।',
      'हर हेडिंग अपने नीचे के कंटेंट का वर्णन करे।',
    ],
  },
  {
    id: 'motion-reduced',
    wcag: '2.3.3',
    level: 'AAA',
    titleEn: 'Animation respects reduced-motion',
    titleHi: 'एनिमेशन reduced-motion का सम्मान करता है',
    stepsEn: [
      'Enable prefers-reduced-motion in the OS/browser.',
      'Auto-playing animation, parallax, and smooth-scroll effects must stop or be dismissible.',
    ],
    stepsHi: [
      'OS/ब्राउज़र में reduced-motion चालू करें।',
      'ऑटो-प्ले एनिमेशन और parallax रुकें या बंद किए जा सकें।',
    ],
  },
  {
    id: 'timeouts-adjustable',
    wcag: '2.2.1',
    level: 'A',
    titleEn: 'Time limits are adjustable or announced',
    titleHi: 'समय-सीमा adjustable है या घोषित है',
    stepsEn: [
      'Trigger every session/timeout in the app.',
      'Users must get a warning with an option to extend — or no essential limit may exist.',
      'If the app has no time limits, mark N/A.',
    ],
    stepsHi: [
      'ऐप का हर timeout/session-expiry ट्रिगर करें।',
      'बढ़ाने के विकल्प सहित चेतावनी मिले — या कोई ज़रूरी सीमा न हो।',
      'समय-सीमा न हो तो N/A चुनें।',
    ],
  },
  {
    id: 'language-changes',
    wcag: '3.1.2',
    level: 'AA',
    titleEn: 'Language changes are programmatically marked',
    titleHi: 'भाषा बदलाव programmatically marked हैं',
    stepsEn: [
      'Find any passage in a different language than the page.',
      'It must carry the correct lang attribute so screen readers switch voices.',
      'If the site is monolingual, mark N/A.',
    ],
    stepsHi: [
      'पेज की भाषा से अलग कोई अंश खोजें।',
      'उस पर सही lang attribute हो ताकि स्क्रीन-रीडर आवाज़ बदले।',
      'साइट एकभाषी हो तो N/A चुनें।',
    ],
  },
  {
    id: 'status-announced',
    wcag: '4.1.3',
    level: 'AA',
    titleEn: 'Status messages announced without focus theft',
    titleHi: 'स्टेटस संदेश बिना फ़ोकस छीने सुनाई देते हैं',
    stepsEn: [
      'Perform async actions (save, upload, scan complete).',
      'Success/progress messages must be announced to assistive tech AND must not move keyboard focus.',
    ],
    stepsHi: [
      'Async action करें (save, upload, scan complete)।',
      'सफलता/प्रगति संदेश सुनाई दें लेकिन कीबोर्ड फ़ोकस न हिले।',
    ],
  },
  {
    id: 'consistent-navigation',
    wcag: '3.2.3',
    level: 'AA',
    titleEn: 'Navigation is consistent across pages',
    titleHi: 'सभी पेजों पर नेविगेशन consistent है',
    stepsEn: [
      'Open 5+ pages: nav order, labels, and placement must be identical.',
      'Repeated blocks (header/footer) must be skippable the same way everywhere.',
    ],
    stepsHi: [
      '5+ पेज खोलें — नेविगेशन क्रम, लेबल, स्थान समान हों।',
      'Header/footer हर जगह एक जैसे skip किए जा सकें।',
    ],
  },
];

export function getCheckDef(checkId: string): ManualCheckDef | undefined {
  return MANUAL_CHECKS.find((c) => c.id === checkId);
}

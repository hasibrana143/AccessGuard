# Risk Score Methodology

## Overview
The AccessGuard risk score is a transparent, severity-weighted metric ranging from **0 (best) to 100 (worst)**. It is **not** a compliance probability or legal guarantee — it is a relative severity index for tracking progress over time.

## Formula
```
riskScore = max(0, min(100, 100 - Σ(severityWeight × count)))
```

| Severity | Weight | Rationale |
|----------|--------|-----------|
| Critical | 10 | Blocks access for assistive technology users; legal exposure |
| Serious | 5 | Significantly impairs accessibility; likely to affect users |
| Moderate | 2 | Degrades experience; workaround exists |
| Minor | 1 | Cosmetic/best-practice; low user impact |

## Properties
- **Deterministic** — same violation counts always produce same score
- **Monotonic** — fixing violations never increases score
- **Transparent** — weights published; no hidden factors
- **Additive** — score = 100 - total weighted penalty
- **Bounded** — always 0–100

## Example
| Violations | Calculation | Score |
|------------|-------------|-------|
| 2 critical, 3 serious, 5 moderate, 10 minor | 100 - (20 + 15 + 10 + 10) | 45 |
| 0 critical, 1 serious, 2 moderate, 5 minor | 100 - (5 + 4 + 5) | 86 |
| 0 violations | 100 - 0 | 100 |

## What It Is NOT
- ❌ Compliance guarantee
- ❌ Lawsuit probability
- ❌ WCAG conformance percentage
- ❌ User-experience metric

## What It IS
- ✅ Relative severity index
- ✅ Progress tracking tool
- ✅ Cross-project comparison (same methodology)
- ✅ Trend indicator (improving/degrading)

## Regression Integration
The risk score is paired with **regression data** (new/fixed/regressed/persisting) for actionable insights:
- Score improving + fixed > new = positive trend
- Score stable + regressed > 0 = attention needed
- Score worsening = immediate action required

## Implementation
Defined in `src/lib/scan-executor.ts` lines ~441-442. Methodology version 1.0 (2026-11-21).
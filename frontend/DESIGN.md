# ReviewPilot — Product Landing Page Design System & Plan

## 1. Product & Audience
- **Product:** ReviewPilot — automated code review and remediation engine. Scans every `git push` to connected GitHub repositories with AST static analysis (Semgrep, ESLint, gitleaks), isolates findings in an ephemeral sandbox, applies and tests candidate patches, and opens high-confidence pull requests for developer approval.
- **Audience:** Individual developers, lead engineers, and small high-velocity engineering teams building web apps, APIs, and infrastructure. Skeptical of AI hype; values deterministic linters, verifiable sandbox test runs, and complete merge control.
- **Job of Screen One:** In **5 seconds**, communicate the pipeline loop: **Push → Scan → Fix → Pull Request**, and motivate clicking **Connect GitHub**.

## 2. Mood & Visual Language
- **Mood:** Precise, calm, technical, transparent, utilitarian.
- **Design Metaphor:** Architectural blueprint meets terminal telemetry. Clean solid surfaces, 1px hairlines, crisp geometric cards, monospace metadata tags.
- **Zero-Slop Enforcement:**
  - **Light Theme Only:** Strict `#F7F7F7` canvas, `#FFFFFF` card surfaces, `#E4E4E7` borders, `#111111` high-contrast typography.
  - **No Gradients:** Absolutely no linear, radial, conic, text, border, or glow gradients.
  - **No Glow / Glassmorphism:** Depth is created strictly through solid white planes over light grey backgrounds, 1px hairlines, and single subtle low elevation (`0 1px 3px rgba(0,0,0,0.06)`). Never border plus shadow together on cards.
  - **No Slop Tropes:** No emoji icons, no tinted-square icon badges, no cards inside cards, no floating blur spheres, no fake testimonials or fabricated logos. Any numerical indicator is explicitly marked as "Sample data".
  - **No Banned Buzzwords:** Zero instances of "Elevate", "Streamline", "Supercharge", "Unlock", "Seamless", "Empower", "Revolutionize", or "World-class". Headings use clean sentence case.
  - **Single Orange Accent:** Orange (`#F6821F`) is strictly reserved for the single primary action per viewport and critical state indicators (e.g. scan plane, primary CTA button).

## 3. Color Palette & Semantic Tokens
All colors derive strictly from existing tokens in `globals.css` with solid assignments:

| Token Name | Solid Value | Role / Usage |
| :--- | :--- | :--- |
| `--background` | `#F7F7F7` | Overall landing page canvas |
| `--foreground` | `#111111` | Primary text and headings |
| `--card` | `#FFFFFF` | File cards, bento surfaces, frames |
| `--card-foreground` | `#111111` | Text within card surfaces |
| `--border` / `--input` | `#E4E4E7` | 1px hairline card borders and dividers |
| `--primary` | `#F6821F` | Single primary CTA button & active scan plane |
| `--primary-foreground` | `#111111` | Text on orange CTA button |
| `--muted` | `#F3F3F3` | Header backgrounds, badge fills |
| `--muted-foreground` | `#52525B` | Secondary annotations, timestamps, metadata |
| `--destructive` | `#C10007` | Flagged vulnerability lines, Critical badges |
| `--warning` | `#FFAC00` | Warning lines, High severity tags |
| `--success` | `#058378` | Test passed status, verified PR badge |
| `--link` | `#1D4ED8` | File links and active indicator dots |
| `--grid-line` | `#E4E4E7` | Subtle 32px blueprint grid pattern |
| `--scan-plane` | `rgba(246, 130, 31, 0.14)` | Solid orange scan sweep plane |

## 4. Typography Scale & Hierarchy
Scoped strictly to `(marketing)` route group via `next/font/google`:
- **Display Font:** `Schibsted Grotesk` (weights: 600, 700; tracking: `-0.03em`, line-height: `1.05`)
- **Body Font:** `Instrument Sans` (weights: 400, 500, 600; line-height: `1.6`)
- **Code/Monospace:** `Geist Mono` (weights: 400, 500; tracking: `-0.01em`)
- *(Dashboard retains `Inter` without conflict).*

### Type Scale (Desktop & Responsive Clamp)
- **Hero Display H1:** `clamp(2.5rem, 5.5vw, 4.5rem)` (40px to 72px) — line-height `1.05`, tracking `-0.03em`
- **Section Heading H2:** `clamp(1.75rem, 3.5vw, 2.75rem)` (28px to 44px) — line-height `1.15`, tracking `-0.025em`
- **Subsection Title H3:** `1.25rem` (20px) — line-height `1.3`, font-weight `600`
- **Body Lede:** `1.125rem` (18px) — line-height `1.6`, font-weight `400`, color `text-muted-foreground`
- **Body Regular:** `0.9375rem` (15px) — line-height `1.6`, color `text-foreground`
- **Meta / Microcopy:** `0.8125rem` (13px) / `0.75rem` (12px) — `font-mono`, color `text-muted-foreground`

---

## 5. Layout Wireframe of Every Section

```
+-------------------------------------------------------------------------------+
| SECTION 1: NAV (Sticky 56px, solid #FFFFFF / hairline border on scroll)       |
| [RP Logo] ReviewPilot    Features   Security   Pricing   FAQ   [Sign in] [Connect GitHub] |
+-------------------------------------------------------------------------------+
| SECTION 2: HERO (12-col grid: 5-col Left Copy, 7-col Right 3D Scene)          |
|                                                                               |
| Scan every push.                   [ 3D R3F Isometric File Stack Scene ]      |
| Fix it with one click.               6 cards stacked in 3D perspective        |
|                                      - Sweep: 1.2s orange plane sweep         |
| ReviewPilot checks each push to      - Real DOM labels on flagged lines       |
| your GitHub repository, explains     - Diff card slides out (tests passed)    |
| what it finds, tests a fix in a      - PR #128 card lands in place            |
| sandbox, and opens a pull request.                                            |
| You approve every change.          [ Fallback / Mobile: hero-poster.tsx SVG ] |
|                                                                               |
| [Connect GitHub]  [Replay scan]                                               |
| Free plan: 1 repository. No card required.                                    |
+-------------------------------------------------------------------------------+
| SECTION 3: WORKS WITH (Slim monochrome strip, 56px height)                   |
| Runs on tools you already know:   [GitHub]   [Semgrep]   [ESLint]   [gitleaks] |
+-------------------------------------------------------------------------------+
| SECTION 4: PINNED STORY "From push to pull request" (ScrollTrigger pinned)    |
| Left Column (Scrolls past 4 steps)        Right Column (Pinned Morphing Stage)|
| 1. You push code                          [ Step 1: Push commit row slides in]|
| 2. It scans what changed                  [ Step 2: File tree highlights scan]|
| 3. You review the findings                [ Step 3: Finding rows with badges] |
| 4. A tested fix becomes a pull request    [ Step 4: Diff + sandbox test check]|
+-------------------------------------------------------------------------------+
| SECTION 5: BENTO "What you get" (Heterogeneous 8px rounded grid)              |
| +--------------------------------------+------------------------------------+ |
| | [Large] Findings you can act on      | [Medium] Fixes tested before seen  | |
| | Interactive filter chips (Crit, High)| Monospace diff + checklist         | |
| | Real-time row reordering (Motion)    | Lint: PASS, Tests: PASS            | |
| +-------------------+------------------+------------------------------------+ |
| | [Small] Only what | [Small] Findings | [Medium] Scan time per push        | |
| | changed (file tree| by severity chart| SVG path-draw telemetry line       | |
| | with 3/40 flagged)| (Recharts bar)   | "Sample data. Your repo will show" | |
+---------------------+------------------+------------------------------------+ |
| SECTION 6: SECURITY "Built for code you do not fully trust"                   |
| Left: Clear technical guarantee copy    Right: Vertical SVG timeline scrub    |
| 1. Secrets redacted before AI code     [Node 1] -- Hairline path drawing      |
| 2. Fixes run in isolated sandbox       [Node 2] -- Solid marker as reached    |
| 3. Patches only change approved files  [Node 3]                               |
| 4. Person approves every pull request  [Node 4]                               |
| <!-- TODO: verify data retention and privacy policy with legal before launch -->|
+-------------------------------------------------------------------------------+
| SECTION 7: DASHBOARD PREVIEW (Full-bleed band, BrowserFrame)                  |
| [ Browser Frame with OS controls & URL /findings ]                            |
| Static findings dashboard view + subtle scrub parallax (-6% to +6%)           |
| "The findings page, with filters, bulk actions, and a detail panel."          |
+-------------------------------------------------------------------------------+
| SECTION 8: PRICING (2-plan structure with accessible monthly/annual toggle)   |
| [ Monthly / Yearly (Save 17%) ] Segmented Control                             |
| +------------------------------------+--------------------------------------+ |
| | Free ($0)                          | Premium ($19/mo or $190/yr) [Primary]| |
| | 1 repository, 30 scans/mo          | 10 repositories, 1000 scans/mo       | |
| | [Connect GitHub - Outline]         | [Connect GitHub - Primary Orange]    | |
| +------------------------------------+--------------------------------------+ |
| Footnote: Prices shown are launch placeholders.                               |
+-------------------------------------------------------------------------------+
| SECTION 9: FAQ (shadcn Accordion, left-aligned, 6 specific answers)          |
| - Does ReviewPilot change my code without asking?                             |
| - What can ReviewPilot read?                                                  |
| - Which Git providers are supported?                                          |
| - What happens if a fix fails its tests?                                      |
| - Can I use it on private repositories?                                       |
| - Where does my code go? (TODO: verify after policy finalized)                 |
+-------------------------------------------------------------------------------+
| SECTION 10: FINAL CTA (Blueprint grid + single sweep on enter)                |
| Connect a repository. Get your first scan in minutes.                         |
| [ Connect GitHub ]                                                            |
+-------------------------------------------------------------------------------+
| SECTION 11: FOOTER (Clean minimal single row)                                 |
| [RP Logo] ReviewPilot   Features   Security   Pricing   FAQ   (c) 2026        |
+-------------------------------------------------------------------------------+
```

---

## 6. The ONE Signature Element: Hero Pipeline Scene
- **Component:** `hero-scene.tsx` (React Three Fiber canvas)
- **Visual Composition:** 6 rectangular isometric planes representing repository files (`query-builder.ts`, `webhook-client.ts`, `preview.ts`, `auth.ts`, `cors.ts`, `event-worker.ts`), rendered with solid off-white fill and 1px hairline edges. Flat code bar lines etched in neutral grey.
- **Timeline Execution (single GSAP master timeline, ~5.0s, plays once on initial load):**
  1. `t = 0.0s`: Header text splits through clip masks; isometric cards glide in from bottom (`y: +40 -> 0`, stagger `0.07s`).
  2. `t = 1.0s`: A solid orange scan sweep plane (`rgba(246,130,31,0.14)`) descends linearly through the stack for `1.2s` (`linear`).
  3. `t = 2.2s`: Flagged code lines turn red (`#C10007`) and orange (`#FFAC00`). Drei `Html` overlays tether readable DOM labels: `CWE-89: SQL injection`, `CWE-798: Hardcoded token`, `CWE-918: SSRF preview`.
  4. `t = 3.2s`: A code diff card slides forward into foreground perspective showing 3-line before/after patch with a green `Tests passed` status checkmark.
  5. `t = 4.4s`: A pull request banner attaches: `PR #128 opened: Fix SQL injection vulnerability` with decorative `Approve and merge` button.
- **Controls & Interaction:**
  - Pointer tilt: subtle max `4°` easing on mouse move. Disabled on touch and reduced motion.
  - Camera scroll scrub: moves camera `6%` forward on initial viewport scroll, then locks.
  - "Replay the scan" button in hero copy triggers `timeline.restart()`.
- **Performance & Fallbacks:**
  - `ssr: false`, dynamic import, mounted only on `min-width: 1024px` and when `prefers-reduced-motion: no-preference`.
  - Capped `dpr = 1.75`. `frameloop="demand"` once timeline completes.
  - `hero-poster.tsx`: Static SVG representation of the final state rendered by default for zero-CLS, instant LCP, mobile screens, and reduced motion users.

---

## 7. Animation Tiers & Complete Motion System
- **Classification:** **Tier 2** (orchestrated UI, layout transitions, scroll progress) + **Tier 3** (the single Hero 3D R3F pipeline scene).
- **Core Rules:**
  - Animate ONLY `transform`, `opacity`, and `clip-path`.
  - Zero `transition: all`, zero infinite loops, zero bounce/elastic easing, zero scroll-jacking.
  - Run once per element (`once: true`). No replays on backward scroll.
  - `prefers-reduced-motion`: Immediately display final states, kill Lenis, and display the SVG poster.

### Motion Registry

| Section / Element | Trigger | Duration | Easing | Properties Animated |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | Page load | `0.40s` (stagger `0.06s`) | `power3.out` | `clip-path: inset(0 0 0% 0)`, `y: 20 -> 0` |
| **Hero Subtitle & CTAs** | Page load (+0.25s) | `0.35s` | `power3.out` | `opacity: 0 -> 1`, `y: 12 -> 0` |
| **Hero 3D Cards** | Page load | `0.50s` (stagger `0.07s`) | `power3.out` | `position.y: -2 -> 0`, `opacity: 0 -> 1` |
| **Hero Scan Plane** | Timeline `t=1.0s` | `1.20s` (linear) | `none` (linear progress) | `position.z: 1.5 -> -1.5` |
| **Hero Flagged Lines** | Scan plane contact | `0.15s` | `power2.out` | `material.color: #E4E4E7 -> #C10007` |
| **Hero Diff Card** | Timeline `t=3.2s` | `0.40s` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | `position.y: -0.5 -> 0.2`, `opacity: 0 -> 1` |
| **Hero PR Land** | Timeline `t=4.4s` | `0.35s` | `power3.out` | `position.y: 0.8 -> 0.5`, `scale: 0.95 -> 1` |
| **Works With Marks** | InView (viewport) | `0.30s` (stagger `0.05s`) | `power2.out` | `opacity: 0 -> 1`, `y: 8 -> 0` |
| **Pinned Story Stage** | ScrollTrigger scrub | `+=300%` scroll | `none` (scrubbed) | Step morphs: commit slide -> file scan -> finding rows -> PR diff |
| **Bento Grid Entry** | InView (viewport) | `0.40s` (stagger `0.06s`) | `power3.out` | `opacity: 0 -> 1`, `y: 16 -> 0` |
| **Bento Findings Filter** | User click/hover | `0.22s` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Motion `layout` repositioning |
| **Bento Chart Path** | InView (viewport) | `0.60s` | `power2.out` | `stroke-dashoffset: length -> 0` |
| **Security Line Draw** | ScrollTrigger scrub | Viewport center | `none` (scrubbed) | `stroke-dashoffset` from top to bottom node |
| **Security Node Fill** | Line reaches node | `0.15s` | `power2.out` | `fill: #FFFFFF -> #111111` |
| **Dashboard Frame** | ScrollTrigger scrub | Viewport passage | `none` (scrubbed) | `y: -6% -> +6%` subtle parallax |
| **Pricing Segment Toggle**| User click | `0.22s` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Motion `layoutId="pricing-active"` |
| **Pricing Price Swap** | Segment toggle | `0.22s` | `power3.out` | `y: 8 -> 0`, `opacity: 0 -> 1` |
| **Final CTA Sweep** | InView (once) | `0.80s` | `power2.out` | `x: -100% -> 100%` hairline sweep |

---

## 8. Review Note: Generic Devtool vs. ReviewPilot Customization
- **What would be the same for any similar product:**
  - Standard top sticky nav with logo and anchor links.
  - Bento feature grid with responsive 2-column or 3-column masonry cards.
  - Two-tier Free vs. Pro pricing card comparison with annual/monthly toggle.
  - Standard expandable accordion for FAQ items.
  - Standard footer with copyright and essential links.

- **What we explicitly customized for ReviewPilot:**
  - **The Hero Isometric 3D Pipeline:** Tailored specifically to represent multi-file code scanning, the literal 1.2s sweep passing through real files, highlighting AST violation lines, and landing a verified Pull Request.
  - **The Pinned Push-to-PR Story:** Replaces standard text bullet lists with a pinned 4-stage morphing stage showing exact ReviewPilot telemetry: Git webhook push → Semgrep/ESLint/gitleaks scan → Interactive finding card review → Sandbox verified pull request creation.
  - **Deterministic Light-Only Theme:** No generic dark-mode AI "aurora purple" glows or marketing fluff. Strict technical light theme modeled after precision developer tools (Cloudflare, GitHub, Stripe CLI).
  - **Audit Guarantee:** Full static DOM mockups with accessible table fallbacks, keyboard navigability, and complete zero-reduced-motion graceful degradation.

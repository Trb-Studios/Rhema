# Rhema (Bible Study Companion)

Claude Code reads this file automatically from the project root.

## What this is

A Windows desktop Bible study app built with Tauri 2 (Rust) and React/TypeScript, local SQLite, fully offline, KJV bundled. The visual design is defined in `design/tokens.json` (source of truth for colors, type, spacing, radius, shadows, motion, layout and component styling; `design/tokens.css` is the CSS form). Read it before building any UI.

Status: the app is built and working well beyond the design tokens. Read `docs/where-we-are.md` first for what works, decisions and known gaps, then `docs/roadmap.md` for build order and `docs/decisions.md` for settled choices. Do not assume a feature is missing without checking the code.

## Rules that must not be broken

- **Never use #D6C2A5 (tan-500, the main color) as text on light backgrounds.** It's 1.73:1 on white. It is a surface and button color only. Tan-colored text uses tan-800 (#6D593B) via `text/tan`.
- tan-700 (#9C7E54) is only for icons and large display text (3.55:1).
- Build UI from the **semantic** tokens (`bg/page`, `text/primary`, `main/fill` and so on), never from raw primitives, so Light and Dark modes both work.
- Every AI-generated overview, quiz card and answer carries the sparkle icon in `ai/sparkle`.
- **Bundle all fonts inside the Windows app.** Do not load them from the internet.
  - Display/serif: Newsreader (fallback Georgia, serif)
  - UI: Figtree (fallback Segoe UI, system-ui, sans-serif)
  - Hebrew: Frank Ruhl Libre
  - Greek: Gentium Plus
- Cards are flat: hairline border (`line/default`), radius 14, no shadow.
- Icons: Lucide (or drawn to match), line style, 1.5 stroke, round caps and joins, sizes 18/20/24.
- Motion feels like macOS/iOS: spring-based (smooth, snappy, bouncy presets in the tokens), interruptible mid-flight, animating only opacity, transform and short blur. With reduced motion turned on, replace movement with a 100 ms fade and no scaling.
- Never put an AI API key in the app bundle. AI calls go through a server the app talks to.
- Dates are local, never UTC; go through `lib/dates.ts`. Shared state goes through `lib/store.ts`. (See `docs/where-we-are.md` for why.)

## Environment notes

- This folder was copied from GitHub (Trb-Studios/Rhema, `main`) as a zip, not cloned, because git was not installed on the dev PC.
- The private updater signing key lives at `C:\Users\Tyler\Documents\rhema-key`. Never move it into this OneDrive-synced folder or commit it.

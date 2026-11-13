---
name: Playful Momentum
colors:
  surface: '#fcf8ff'
  surface-dim: '#dad6ff'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f2ff'
  surface-container: '#efebff'
  surface-container-high: '#e9e5ff'
  surface-container-highest: '#e3dfff'
  on-surface: '#181445'
  on-surface-variant: '#464554'
  inverse-surface: '#2d2a5b'
  inverse-on-surface: '#f3eeff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#fcf8ff'
  on-background: '#181445'
  surface-variant: '#e3dfff'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system delivers a tactile, gamified personal task experience tailored for mobile Android environments. It combines intrinsic reward mechanics (XP, streaks, level progression) with high-utility, friction-free productivity. The aesthetic avoids clinical corporate toolsets and infantilized aesthetics, adopting instead a warm, luminous, and tactile visual style with subtle neomorphic-card depths, fluid interactions, and vibrant feedback.

### Key Tenets
- **Warmth & Encouragement:** Non-punitive visual cues, celebratory micro-moments, and friendly affordances.
- **One-Handed Ergonomics:** Critical controls, creation floats, and task completion triggers anchored within the natural reach of the thumb (bottom 60% of the screen).
- **Sensory Progression:** Visual momentum driven by progressive fills, amber streak glows, and energetic emerald check states.
- **Tactile Polishing:** High radius geometries (`rounded-2xl` to `rounded-3xl`), pill controls, and subtle chromatic drop-shadows that feel physical yet light.

## Colors

The color palette centers on an energetic Indigo-Violet base accompanied by reward-oriented accents that signify accomplishment and momentum.

### Roles & Semantic Mapping
- **Primary (`#6366F1` / `#4F46E5`):** Level cards, primary interaction buttons, system-wide active states, and dominant focal points.
- **Secondary (`#F59E0B`):** Streaks, XP reward badges, multipliers, and achievement sparks. Conveys dynamic warmth and encouragement.
- **Tertiary (`#10B981`):** Task resolution, positive habit counters, progress bar fills, and milestone validation.
- **Surface Canvas (Light):** `#FAFAFD` provides a soft, warm paper feel, avoiding harsh #FFFFFF glare. Elevated card containers rest at `#FFFFFF`.
- **Surface Canvas (Dark):** Deep night sky tones with indigo undertones (`#0F0E17` base with `#1B1A2E` container cards), maintaining brand vibrancy without flat grayscale fatigue.
- **Neutral Accents:** Deep purple-tinted charcoal (`#1E1B4B` in light, `#E2E8F0` in dark) for sharp typographic contrast.

## Typography

The typography leverages **Plus Jakarta Sans** across all roles to reinforce a clean, rounded, and approachable demeanor. Its open counters and geometric balance ensure high legibility at glance speed during mobile task management.

- **Numerics & Badges:** Gamified metrics (XP scores, streak counts, timers) rely on `label-lg` and `display-lg` with tight negative tracking (`-0.03em`) and heavy weights (`700`/`800`) to anchor numeric importance.
- **Hierarchy:** Primary task titles use `headline-sm` with a medium weight to prevent typographic fatigue in dense lists, reserving bold weights for milestone triggers and level-up modals.
- **Micro-labels:** Category tags and priority indicators utilize uppercase `label-sm` with deliberate positive letter-spacing (`0.04em`) to maintain clarity against colorful tag backgrounds.

## Layout & Spacing

The layout is built for native Android single-screen navigation, prioritizing single-thumb zones and fluid vertical stacking.

- **Grid Model:** Fluid 4-column layout on standard mobile viewports with a persistent `margin` of `1.25rem` (20px) and a `gutter` of `1rem` (16px).
- **Thumb Zone Structure:** Primary execution elements (such as the quick-add floating trigger, action sheets, and habit swiping tracks) are anchored inside a bottom action canvas spanning the bottom 80–120px of the viewport.
- **Component Spacing Rhythm:** Internal card padding scales between `space-md` (16px) for standard task cards and `space-lg` (24px) for hero gamification banners (XP level cards).
- **Edge Buffers:** Bottom scroll padding includes a mandatory `space-xl` offset plus navigation bar height to guarantee no task item rests obstructed beneath bottom navigation docks.

## Elevation & Depth

Visual hierarchy uses layered tonal planes paired with colored ambient glows rather than dark, muddy dropshadows.

- **Level 0 (Base Canvas):** Light `#FAFAFD` or Dark `#0F0E17`. Completely flat.
- **Level 1 (Interactive Cards & Lists):** Crisp `#FFFFFF` (or `#1B1A2E` in dark mode) elevated by a low-opacity, chromatic shadow: `0 4px 20px -2px rgba(99, 102, 241, 0.08)`. Gives cards a warm "lifted" appearance without visual dirt.
- **Level 2 (Active Gamification Widgets & Streaks):** Uses an ambient colored halo: `0 8px 24px -4px rgba(245, 158, 11, 0.22)` for streak milestones, and `rgba(99, 102, 241, 0.25)` for ready-to-claim XP containers.
- **Level 3 (Modals, XP Level-Up Takeovers, Bottom Sheets):** Elevated via `0 20px 40px -8px rgba(15, 14, 23, 0.35)` paired with a soft scrim blur (`backdrop-filter: blur(8px)`) over underlying content.

## Shapes

The design system embraces deep, organic curvature to reinforce friendliness, playfulness, and tactile comfort.

- **Cards & Sheets:** Core structural elements use `rounded-2xl` (1rem / 16px) and `rounded-3xl` (1.5rem / 24px) to soften screen boundaries and eliminate sharp, utilitarian edges.
- **Pill Philosophy:** Badges, chips, buttons, streak counters, and input text fields use full pill geometry (`rounded-full` / `9999px`) to create natural tap-targets that feel soft to mobile interaction.
- **XP Progress Tracks:** Outer progress capsules and internal fill bars mirror matching full-radius ends, eliminating visual discordance during completion animations.

## Components

### Buttons & Interactive CTAs
- **Primary Button:** Pill-shaped (`rounded-full`), height of 52px for ergonomic thumb reach. Indigo gradient or solid `#6366F1`, crisp white typography (`label-lg`), and an ambient drop shadow tinted with primary color. Pressed state features a scale transition (`scale(0.97)`).
- **Reward CTA (Claim XP):** Radiant amber background (`#F59E0B`), high-contrast dark text or crisp white, integrated spark micro-icon, and pulsating ambient glow.

### Task Cards
- **Structure:** Rounded container (`rounded-2xl`) with white or `#1B1A2E` background, 16px padding.
- **Completion Checkbox:** 28px circular tap target. Default state has a soft 2px border in light violet. On completion, transitions into an energetic spring animation filling with `#10B981`, revealing a white checkmark accompanied by an immediate "+25 XP" floating pill indicator.
- **Content:** Title in `headline-sm`, subtitle/tags in `body-sm`. Horizontal pill indicators for due time, repeat cycle, and priority tier.

### XP & Streak Trackers
- **Streak Pill:** Compact amber container with an organic flame or bolt icon, bold numeric counter (`label-lg`), and a subtle warm border (`rgba(245, 158, 11, 0.3)`).
- **Level Progression Bar:** Horizontal pill track (height 12px) with light purple background (`#EEF2FF`). Filled dynamically with a dual gradient from Primary (`#6366F1`) to Tertiary (`#10B981`).

### Chips & Filters
- Compact pill elements (height 36px), low-contrast border, flexible text sizing (`label-md`).
- Active state transitions background to soft indigo (`#EEF2FF` in light, `#2E2A56` in dark) with bold colored text and removed outline.

### Input Fields (Quick-Add Sheet)
- Bottom-docked modal card with generous inner padding (`space-lg`).
- Input containers feature continuous pill borders, soft focus rings in `#6366F1`, and embedded rapid-select chips for date, XP reward value, and recurring schedules.

### Empty & Celebration States
- Large, warm illustrative focal points showing dynamic resting moments (e.g., a sleeping companion creature, clean horizon, unlit fireworks) with playful typography (`headline-md`) encouraging the user to build their next streak.
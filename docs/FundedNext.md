---
version: alpha
name: FundedNext
description: >-
  FundedNext is a prop trading firm offering simulated CFD and Futures challenge accounts with up to 95% reward share.
  The system pairs a black, high-contrast hero canvas with a saturated violet accent for conversion actions.
logo:
  src: https://dirslur24ie1a.cloudfront.net/fundednext/short_logo.png
colors:
  surface: '#ffffff'
  surface-dim: '#f6f7f9'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f7f9'
  surface-container: '#f3f2ff'
  surface-container-high: '#efedfb'
  surface-container-highest: '#e3e8ef'
  on-surface: '#181b26'
  on-surface-variant: '#4b5565'
  inverse-surface: '#10121b'
  inverse-on-surface: '#ffffff'
  outline: '#9aa4b2'
  outline-variant: '#cdd5df'
  surface-tint: '#635bff'
  primary: '#635bff'
  on-primary: '#ffffff'
  primary-container: '#f3f2ff'
  on-primary-container: '#432ad8'
  inverse-primary: '#a09bff'
  secondary: '#09e354'
  on-secondary: '#023114'
  secondary-container: '#d7ffe4'
  on-secondary-container: '#111111'
  tertiary: '#2e90fa'
  on-tertiary: '#111111'
  tertiary-container: '#d7dfff'
  on-tertiary-container: '#111111'
  error: '#ff3844'
  on-error: '#111111'
  error-container: '#88141b'
  on-error-container: '#ff9da3'
  primary-fixed: '#efedfb'
  primary-fixed-dim: '#e0defc'
  on-primary-fixed: '#432ad8'
  on-primary-fixed-variant: '#4e36f5'
  secondary-fixed: '#d7ffe4'
  secondary-fixed-dim: '#76ffa4'
  on-secondary-fixed: '#023114'
  on-secondary-fixed-variant: '#0d8838'
  tertiary-fixed: '#d7dfff'
  tertiary-fixed-dim: '#9fccfd'
  on-tertiary-fixed: '#111111'
  on-tertiary-fixed-variant: '#2a83e4'
  background: '#ffffff'
  on-background: '#181b26'
  surface-variant: '#f6f7f9'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 96px
    fontWeight: 800
    lineHeight: 104px
    letterSpacing: '-2px'
  headline-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: '-0.025em'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 800
    lineHeight: 33.6px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: '-0.24px'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
    letterSpacing: '-0.24px'
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.025em
rounded:
  sm: 10px
  DEFAULT: 12px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  unit: 4px
  xs: 12px
  sm: 16px
  md: 25px
  lg: 60px
  xl: 80px
  gutter: 24px
  container-max: 1440px
elevation:
  sm: 0 1px 2px rgba(16,18,27,0.05)
  md: 0 4px 12px rgba(16,18,27,0.08)
  lg: 0 12px 32px rgba(16,18,27,0.12)
layout:
  containerMaxWidth: 1440px
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 0 64px
    height: 56px
  button-primary-hover:
    backgroundColor: '{colors.on-primary-fixed-variant}'
    textColor: '{colors.on-primary}'
  button-secondary:
    backgroundColor: rgba(214,223,255,0.08)
    textColor: '{colors.on-surface}'
    typography: '{typography.label-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 0 64px
    height: 56px
  button-secondary-hover:
    backgroundColor: '{colors.surface-container-high}'
  card:
    backgroundColor: '{colors.surface-container-lowest}'
    rounded: '{rounded.xl}'
    padding: '{spacing.md}'
  card-hover:
    backgroundColor: '{colors.surface-container-high}'
  input-field:
    backgroundColor: '{colors.surface-container-low}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.DEFAULT}'
    padding: '{spacing.sm}'
  list-item:
    backgroundColor: transparent
    rounded: '{rounded.md}'
    padding: '{spacing.sm}'
  list-item-hover:
    backgroundColor: '{colors.surface-container-high}'
    textColor: '#111111'
  nav-link:
    backgroundColor: transparent
    textColor: '{colors.on-surface-variant}'
    typography: '{typography.title-lg}'
    padding: '{spacing.sm}'
  badge:
    backgroundColor: '{colors.secondary-container}'
    textColor: '{colors.on-secondary-container}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
---

## Overview

FundedNext sponsors retail traders through simulated prop challenge accounts for CFDs and Futures, paying out a reward share of up to 95% on funded performance. The brand positions itself as a backer rather than a broker: the interface frames the trader as the protagonist and the firm as the capital behind them. The aesthetic is a high-contrast, near-black hero canvas (#000000) with confident oversized display type, moving to a light, card-based product grid beneath it.

Voice is direct, confident and benefit-led. Copy favours short declaratives and concrete numbers over adjectives: "Rewards in 24h", "One-time fee", "No recurring costs", "in 44 languages". Claims are quantified and trust is signalled through review counts (79k+ reviews) and social proof. Example sentence: "Pass your challenge, keep up to 95% of the profits."

## Colors

Primary (#635bff) is the signature violet used for the primary CTA ("Get Started" and "Login" render as #635bff at 12px radius), focus rings and active nav states. Its deeper variant #4e36f5 is the hover and pressed tone, and #432ad8 is used for text on light purple surfaces. Secondary (#09e354) is reserved for positive signals: success check marks, the vivid green in trust-pill stars and status badges, never for buttons. Tertiary (#2e90fa) supports informational states and links within content.

Surface stack: the hero sits on pure black (#000000, lab(0 0 0)) with off-white text (#ffffff). Body and product sections use #ffffff as surface with #f6f7f9 as surface-container-low and #f3f2ff as the lavender tint for feature containers. Secondary text uses #4b5565 (on-surface-variant) and divid

## Typography

The type system pairs Plus Jakarta Sans for the hero display (96px, weight 800, line-height 104px, letter-spacing -2px) with Inter for everything else. Plus Jakarta Sans is reserved for the single largest statement per view so the headline reads as a brand gesture; Inter at 800 carries section headings (24px) and body copy (16px/24px, weight 400). Apply letter-spacing -0.024em to any heading above 40px to keep tight display rhythm, and keep body at 0 tracking. Label text on buttons uses Inter 600 at 20px with -0.24px tracking. Small labels (14px, weight 600) take letter-spacing 0.025em for legibility on the dark hero.

## Layout

The layout is a fluid, centred container capped at 1440px with a 12-column grid and a 24px gutter. The hero is an inset black panel with a 16px outer margin and roughly 32px corner radius, floating on the white page. Section rhythm uses 60px (lg) between major blocks and 80px (xl) before the footer, while 25px (md) pads cards internally. Use the xs (12px) step for icon-to-label gaps and sm (16px) for list spacing; avoid mixing in arbitrary values outside this scale.

## Elevation & Depth

Depth is minimal and tonal. Cards on the light surface sit flat on #ffffff with a 1px border of #e3e8ef and use surface-container-high (#efedfb) on hover rather than a larger shadow. Where lift is needed (floating chat launcher, sticky navbar) apply 0 12px 32px rgba(16,18,27,0.12). On the black hero, separation comes from tonal contrast of the purple gradient glow rather than shadows.

## Shapes

The shape language is soft-technical: buttons and inputs use 12px radius (rounded-DEFAULT), product cards and feature panels use 20px, and the hero container uses 24px-32px. Pills (trust badge, status chips) use full 9999px rounding. Radii step up with container size so small controls feel precise while large surfaces feel enveloping.

## Components

### Action Elements
The primary button is a solid #635bff fill with white Inter 600 text at 20px, 56px tall, padded 0 64px, radius 12px. On hover the fill shifts to #4e36f5 over 150ms cubic-bezier(.4,0,.2,1). The secondary button is a translucent ghost (rgba(214,223,255,0.08)) with the same metrics, gaining a surface-container-high fill on hover.

### Containers & Surfaces
Cards use #ffffff with a 1px #e3e8ef border and 20px radius, 25px internal padding. Hover raises the fill to #efedfb and the transition runs 200ms ease-out. Trust and status pills are full-radius with 4px vertical padding.

### Inputs & Interaction
Inputs sit on #f6f7f9 with 12px radius and 16px padding, a 1px border of #cdd5df, and a 2px #635bff focus ring at 2px offset. Navigation links are Inter 600 at 20px in #4b5565

## Do's and Don'ts

**Do**
- Use #635bff exclusively for interactive affordances: primary CTA, links, focus rings and active nav.
- Keep the hero on true black (#000000) with off-white (#ffffff) type to preserve the high-contrast opening.
- Apply 12px radius to buttons and inputs and 20px to cards so control and surface shapes stay distinct.
- Reserve #09e354 green for success and positive-metric signals only.

**Don't**
- Don't use #635bff for body text or large background fills outside the CTA system.
- Don't place violet primary buttons on the violet lavender surfaces (#f3f2ff); use on-primary-container instead.
- Don't introduce gradients or glassmorphism beyond the existing purple hero glow.
- Don't mix more than two font families; Plus Jakarta Sans is limited to display-scale headlines.

---
version: alpha
name: Tradeify
description: >-
  Tradeify is a futures proprietary trading firm offering evaluations, simulated funded accounts, and daily payouts. Its
  dark, high-contrast interface pairs a signature neon green accent with expanded grotesque display type.
logo:
  src: https://cdn.prod.website-files.com/679b064a680c614548672a06/6a82f59b2b2b53f7c664d19e_logo-light%20(1).svg
  srcDark: https://cdn.prod.website-files.com/679b064a680c614548672a06/6a82f59b2b2b53f7c664d19e_logo-light%20(1).svg
colors:
  surface: '#08080a'
  surface-dim: '#071a24'
  surface-bright: '#132a3a'
  surface-container-lowest: '#050507'
  surface-container-low: '#0c0c0f'
  surface-container: '#111114'
  surface-container-high: '#1a1a1f'
  surface-container-highest: '#23232a'
  on-surface: '#f0edec'
  on-surface-variant: '#b8b1ae'
  inverse-surface: '#f0edec'
  inverse-on-surface: '#08080a'
  outline: '#9a9aa3'
  outline-variant: '#d4cfcd'
  surface-tint: '#03dc5d'
  primary: '#00ff51'
  on-primary: '#03140a'
  primary-container: '#03dc5d'
  on-primary-container: '#03140a'
  inverse-primary: '#03dc5d'
  secondary: '#10d48e'
  on-secondary: '#031a12'
  secondary-container: '#132a3a'
  on-secondary-container: '#c1c6c8'
  tertiary: '#973efc'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff842a'
  on-tertiary-container: '#1a0c00'
  error: '#d20909'
  on-error: '#ffffff'
  error-container: '#4a0404'
  on-error-container: '#ffb4b4'
  primary-fixed: '#00ff51'
  primary-fixed-dim: '#03dc5d'
  on-primary-fixed: '#03140a'
  on-primary-fixed-variant: '#0a3d1f'
  secondary-fixed: '#10d48e'
  secondary-fixed-dim: '#0fb57a'
  on-secondary-fixed: '#031a12'
  on-secondary-fixed-variant: '#0a4a33'
  tertiary-fixed: '#973efc'
  tertiary-fixed-dim: '#7f2fe0'
  on-tertiary-fixed: '#ffffff'
  on-tertiary-fixed-variant: '#e6d4ff'
  background: '#08080a'
  on-background: '#f0edec'
  surface-variant: '#132a3a'
typography:
  display:
    fontFamily: Monasansexpanded
    fontSize: 14px
    fontWeight: 500
    lineHeight: 18.2px
    letterSpacing: 0.84px
  headline-lg:
    fontFamily: MonasansDisplaySemiExpanded
    fontSize: 38px
    fontWeight: '600'
    lineHeight: 44.08px
    letterSpacing: '-0.01em'
  headline-md:
    fontFamily: MonasansDisplaySemiExpanded
    fontSize: 38px
    fontWeight: 600
    lineHeight: 44.08px
    letterSpacing: '-0.38px'
  title-lg:
    fontFamily: Monasans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: '-0.01em'
  body-lg:
    fontFamily: Monasans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 25.2px
  body-md:
    fontFamily: Monasans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 22.4px
  label-md:
    fontFamily: Arial
    fontSize: 14px
    fontWeight: 600
    lineHeight: 21px
  label-sm:
    fontFamily: Monasansexpanded
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 8px
  DEFAULT: 10px
  md: 12px
  lg: 16px
  xl: 20px
  full: 9999px
spacing:
  unit: 4px
  xs: 8px
  sm: 10px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 40px
  gutter: 20px
  container-max: 1241px
elevation:
  sm: 0 0 0 1px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.10)
  md: '0 0 2px 0px #000'
  lg: '-10px 0 40px rgba(42,122,255,0.12)'
layout:
  containerMaxWidth: 1241px
  gridColumns: 12
components:
  button-primary:
    backgroundColor: '{colors.on-surface}'
    textColor: '{colors.inverse-on-surface}'
    typography: '{typography.label-md}'
    rounded: '{rounded.lg}'
    padding: '{spacing.lg}'
    height: 48px
  button-primary-hover:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
  button-cta-accent:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.lg}'
    padding: '{spacing.lg}'
    height: 48px
  button-cta-accent-hover:
    backgroundColor: '{colors.primary-fixed-dim}'
    textColor: '{colors.on-primary-fixed}'
  button-secondary:
    backgroundColor: '{colors.secondary-container}'
    textColor: '{colors.on-surface}'
    typography: '{typography.label-md}'
    rounded: '{rounded.lg}'
    padding: '{spacing.lg}'
    height: 48px
  button-secondary-hover:
    backgroundColor: '{colors.surface-container-highest}'
  card:
    backgroundColor: '{colors.surface-container}'
    rounded: '{rounded.xl}'
    padding: '{spacing.xl}'
  card-hover:
    backgroundColor: '{colors.surface-container-high}'
  input-field:
    backgroundColor: rgba(255,255,255,0.03)
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.sm}'
    padding: 12px 14px
  input-field-focus:
    backgroundColor: rgba(255,255,255,0.05)
    textColor: '{colors.on-surface}'
  list-item:
    backgroundColor: transparent
    rounded: '{rounded.md}'
    padding: '{spacing.sm}'
  list-item-hover:
    backgroundColor: '{colors.surface-container-high}'
    textColor: '{colors.primary}'
  badge:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: '{spacing.xs}'
  nav-link-active:
    textColor: '{colors.primary}'
    typography: '{typography.body-md}'
---

## Overview

Tradeify is a proprietary futures trading firm that sells evaluations and simulated funded accounts, then pays traders out daily. The interface reads as a night-trading terminal: a near-black canvas (#08080a), a single saturated neon green (#00ff51) reserved for action, and an expanded grotesque (Monasans) that gives headlines a broadcast-style presence. The aesthetic movement is best described as Terminal Minimalism with a sports-broadcast edge, since the hero pairs a high-contrast athlete photograph with a glowing green halo (box-shadow: 0 0 24px rgba(0,255,81,0.35) on CTAs).

The voice is direct, numeric and confident. Copy leads with money and rules ("$750K funding", "no consistency once funded", "End-of-day drawdown") and uses short declarative bullets with a green lightning glyph as the bullet marker. Example sentence: "Trade with $750K funding, and earn daily payouts."

## Colors

The canvas is layered from #050507 (surface-container-lowest) up to #23232a (surface-container-highest), so cards read by lightness step rather than borders. Primary (#00ff51) is the signature accent: it fills the header 'Get funded now' button, the hero 'Get funded - 30% OFF' CTA, the lightning icons, and the active nav underline. Its on-color is #03140a, a near-black green that keeps contrast above 12:1. Secondary (#10d48e) supports success and payout states and hover text on list items. Tertiary (#973efc) is reserved for Perps and campaign highlights, with #ff842a as its warm counterpart for promotional banners. The top promo strip uses a dark green gradient, linear-gradient(90deg, #071a24, #03130b), rather than a flat fill. Text sits at #f0edec for headings and #b8b1ae for supporting c

## Typography

The type system pairs an expanded display cut with a neutral text cut. Headlines use MonasansDisplaySemiExpanded at 38px / 44.08px with letter-spacing -0.38px (-0.01em) and weight 600, so the hero reads as a compact, wide block. Eyebrow labels such as 'THE BEST FUTURES PROP FIRM' use Monasansexpanded 14px, weight 500, tracked at 0.84px (0.06em) in primary green inside a rgba(3,220,93,0.12) pill. Body copy uses Monasans 16px / 22.4px at weight 400. Button labels fall back to Arial 14px weight 600, which is the one deliberate departure from the brand face. Apply font-feature-settings: 'tnum' on, 'lnum' on, 'ss05' on to numeric headings so payout figures align in columns.

## Layout

The grid is fluid with a fixed content ceiling of 1241px; secondary pages cap at 1279px and 991px breakpoints. Desktop uses 12 columns with a 20px gutter (xl spacing) and 40px (2xl) section separation. The hero is a split layout: copy occupies roughly the left 45% while the athlete photograph bleeds to the right edge. Keep white-space generous: lg (16px) between list rows, xl (20px) inside cards, and 2xl (40px) between major sections. Use sm (10px) only for compact badge and chip rhythm.

## Elevation & Depth

Hierarchy is carried primarily by surface lightness, not shadow. Level 1 (base): #08080a canvas. Level 2 (cards and panels): #111114 with a 1px border of rgba(255,255,255,0.08). Level 3 (floating menus and cookie-style overlays): #1a1a1f with box-shadow: 0 0 2px 0px #000 plus a 1px rgba(0,0,0,0.10) ring. Accent glow is the only decorative depth: the hero halo uses box-shadow: -10px 0 40px rgba(42,122,255,0.12) and primary CTAs carry a soft green bloom of roughly 0 0 20px rgba(0,255,81,0.35).

## Shapes

The shape language is Soft-Technical. Buttons and inputs use an 8px to 16px radius (button-primary at 16px, inputs at 8px) so they feel engineered but not sharp. Cards use 16px to 20px, and pill badges and avatar dots use full (9999px). Icon tiles inside feature lists are 10px. The rule is: larger containers get larger radii, interactive controls stay between 8px and 16px.

## Components

### Action Elements
Primary CTAs are filled neon green (#00ff51) with #03140a labels, 16px radius, 48px height and 0 16px horizontal padding. The hover state shifts to #03dc5d with a 150ms ease transition. Header CTAs invert to a light #f0edec fill with dark text, reserved for the top navigation only. Underlined text links use a 1px underline that retracts to 0% width on hover over 300ms ease-in-out.

### Containers & Surfaces
Cards sit on #111114 with 20px radius and 20px internal padding. On hover they lift to #1a1a1f over 300ms. Hero and pricing panels use the Level 3 treatment with a 1px rgba(255,255,255,0.08) border. Dividers are 1px rgba(255,255,255,0.1) rules, never thick bars.

### Inputs & Interaction
Inputs use rgba(255,255,255,0.03) fill, 8px radius, 12px 14px padding and 14px /

## Do's and Don'ts

**Do**
- Do reserve #00ff51 exclusively for the single most important action on each view.
- Do pair expanded display headlines with neutral Monasans body copy for every section.
- Do lead with concrete numbers and rules in copy, such as dollar amounts and drawdown terms.
- Do layer surfaces by lightness steps from #08080a to #23232a instead of adding borders.

**Don't**
- Don't use the neon green as a background fill for large text blocks or long paragraphs.
- Don't add heavy drop shadows; depth comes from surface tone and the accent glow only.
- Don't mix more than one accent hue in a single component.
- Don't set headings in a regular-width cut, since the expanded grotesque is the brand's signature.

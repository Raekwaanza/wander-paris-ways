# Scenic Route design system

This is the canonical reference for Scenic Route's visual foundation. Product screens should use
the semantic tokens and shared primitives in `src/styles.css` rather than introducing local color
systems. Screen composition belongs to M5.2B, cartography to M5.2C, and bespoke landmark art to
M5.2D.

## Design thesis

**Editorial urban exploration + functional navigation.** Scenic Route should feel like
Montmartre after dark: culturally curious, architectural, natural, understated, and confident.
Atmosphere must reinforce direct navigation rather than compete with it.

The foundation responds to two problems in the previous app: it felt boring and corporate, and it
looked like a generic Maps reskin. Night is now the default canvas, with a coherent Day scope ready
for future use.

## Brand principles

- **Adventurous, not outdoorsy:** urban discovery, not wilderness equipment.
- **Parisian, not touristy:** passages, stairways, facades, parks, river, neighborhoods, and quiet
  nightlife—not souvenir imagery.
- **Mature, not luxurious:** intentional and distinctive without concierge polish.
- **Expressive, not cluttered:** personality must preserve hierarchy and legibility.
- **Discovery, not decoration:** visual emphasis should suggest that something is worth noticing.

## Architecture and themes

The visual system flows from raw brand palette to semantic UI tokens to Tailwind theme variables,
then into shared primitives and product screens. Components should prefer `bg-card`,
`text-foreground`, `border-border`, and similar semantics over raw `--brand-*` values.

`:root` is Night. `.dark` remains compatible with that default. A future caller can apply Day with
`data-theme="day"` or `.light`; M5.2A deliberately provides no selector, state library, or stored
theme preference.

## Night core palette

| Primitive    | Hex       | Role                                                  |
| ------------ | --------- | ----------------------------------------------------- |
| Deep Navy    | `#0D1420` | primary canvas and dark CTA text                      |
| Charcoal     | `#1A1F26` | cards and functional panels                           |
| Slate Blue   | `#2B3E52` | secondary controls and selected support surfaces      |
| Forest Green | `#4A5A44` | natural atmosphere and restrained accent surfaces     |
| Stone        | `#D6D2C4` | primary foreground                                    |
| Burnt Gold   | `#C27A2C` | signature primary action, focus, and selection signal |

### Night semantic mapping

| Semantic token          | Mapping                                                     |
| ----------------------- | ----------------------------------------------------------- |
| background / foreground | Deep Navy / Stone                                           |
| card                    | Charcoal with Stone text                                    |
| popover                 | minimally elevated charcoal-derived surface                 |
| primary                 | Burnt Gold with Deep Navy text                              |
| secondary               | Slate Blue with Stone text                                  |
| accent                  | Forest Green with Champagne Mist text                       |
| muted                   | Navy/Charcoal intermediate with subdued Stone-derived text  |
| destructive             | Neon Rouge with Deep Navy text                              |
| border / input          | restrained Slate-derived boundary / stronger Slate boundary |
| ring / selected border  | Burnt Gold                                                  |

Gold is deliberately scarce. Use it for the main action, keyboard focus, selection, and small key
metrics—not as a large decorative fill. Forest is atmospheric and should not be used as small text
on Deep Navy.

## Day palette

| Primitive  | Hex       | Role                            |
| ---------- | --------- | ------------------------------- |
| Warm Paper | `#EEE8DC` | primary canvas                  |
| Pale Stone | `#D8D0C1` | secondary surface               |
| Deep Sky   | `#4D6F8F` | focus and cool secondary signal |
| Sage       | `#6B7F6A` | natural source accent           |
| Ink        | `#0E1A27` | primary foreground              |
| Terracotta | `#C56A3D` | editorial accent                |

Day retains Burnt Gold as primary with Deep Navy text. It uses an accessible Sage-derived light
surface for semantic accent and Deep Sky for focus because unmodified Gold does not reach 3:1
against Warm Paper as an outline. This keeps the themes related without treating Day as an inverse
skin.

## Extended accents

The raw token set also exposes Midnight Ink `#161821`, Neon Rouge `#F0445A`, Electric Violet
`#8E5DE7`, Barlight Amber `#F4A340`, Champagne Mist `#F3E6D4`, Electric Sky `#168BD2`, Forest Walk
`#347A4A`, Fresh Leaf `#73B96B`, River Turquoise `#2AA9B8`, Sunflower `#F5C542`, Terracotta
`#DF684B`, Warm Sand `#F0DFC2`, and Deep Ink `#163044`.

These are contextual ingredients for later discovery and category work, not a general UI palette.
Do not use them all at once or use a decorative accent for body text without checking contrast.

## Typography

- **Functional family:** Sen, weights 400, 500, 600, and selectively 700. Use it for body copy,
  navigation, controls, labels, metrics, and functional headings.
- **Editorial family:** Cormorant Garamond, weights 500 and 600. Use it explicitly for place names,
  landmarks, hero moments, and future editorial collections.
- **Fallbacks:** platform UI sans-serif and established serif stacks keep the app usable if Google
  Fonts is unavailable. Font loading uses a non-blocking Google Fonts stylesheet with `display=swap`.

The active type hierarchy is Display (Cormorant Garamond 600), Title (Sen 600), Body (Sen 400/500),
Label (Sen 500/600), Metric (Sen 600 with tabular numerals), and Eyebrow (small uppercase Sen 600
with wide tracking). `text-display` opts into editorial type; headings are not globally serif.

Both families support French place names such as Sacré-Cœur, Hôtel de Ville, Tuileries, and Opéra.

## Surfaces, radii, borders, and shadows

Deep Navy is the canvas. Charcoal panels use thin boundaries and typography for separation. Slate
and Forest support selected or contextual surfaces. Avoid nested card stacks, white floating panels,
glassmorphism, gradients, and decorative background imagery.

The base radius is 11px. Controls are modest, cards are 14px editorial rectangles, and sheets may
use a larger 20px edge. Pills are reserved for badges, chips, toggles, and controls that are truly
pill-shaped. M5.2B owns migration of screen-local `rounded-2xl` and `rounded-full` classes.

Default borders are visible but quiet. Inputs use a stronger boundary; selected controls may use a
Gold border. Shadows are short, low-opacity separators (`shadow-card`, `shadow-sheet`, and
`shadow-lift`) rather than soft SaaS elevation or glow.

## Controls

Primary buttons use Burnt Gold with Deep Navy text and moderate corners. Secondary buttons use
Slate and a boundary. Outline controls stay transparent; ghost controls add only a quiet hover
surface. Destructive actions use controlled Neon Rouge. The existing button variant API remains
intact.

Badges remain pills. Neutral, secondary, scenic, natural, outline, and destructive variants are
available; category-specific colors wait for a later milestone. Inputs, textareas, selects, command
search, dialogs, alert dialogs, sheets, tabs, toggles, switches, checkboxes, radios, and toasts use
semantic Night/Day surfaces and boundaries. Selected tabs and toggles receive an explicit selected
border.

## Focus and accessibility

Every keyboard-focusable control receives a 2px visible outline with offset. Night uses Burnt Gold;
Day uses Deep Sky because it has stronger boundary contrast on Warm Paper. Do not remove an outline
without a visible replacement.

Representative WCAG contrast ratios:

| Pair                             |   Ratio |
| -------------------------------- | ------: |
| Stone on Deep Navy               | 12.19:1 |
| Stone on Charcoal                | 10.94:1 |
| Deep Navy on Burnt Gold CTA      |  5.37:1 |
| Night muted text on Deep Navy    |  7.60:1 |
| Night input boundary on Charcoal |  3.48:1 |
| Ink on Warm Paper                | 14.39:1 |
| Ink on Day card                  | 15.63:1 |
| Day muted text on Warm Paper     |  4.81:1 |
| Day input boundary on Warm Paper |  3.75:1 |
| Deep Sky focus on Warm Paper     |  4.32:1 |

Normal text should reach 4.5:1 and meaningful large text or UI boundaries 3:1. Decorative raw
colors—especially Forest or Sage as small text—are not automatically accessible.

## Motion

The motion vocabulary is fast interaction (140ms), standard transition (220ms), and editorial
reveal (400ms), using a composed ease-out. Movement should be quick, direct, and non-bouncy. A
global `prefers-reduced-motion` safeguard reduces animation and transition duration without removing
state changes.

## Map and illustration boundaries

M5.2C owns base-map styling, road/building/park/river hierarchy, labels, route lines, and marker
identity. M5.2A defines future `route-*` tokens but does not wire them into MapLibre. The current map
paint values and canonical route geometry remain unchanged.

M5.2D owns bespoke landmark illustrations, hidden-gem symbols, and the illustrated discovery layer.
Lucide remains the functional icon system. Do not introduce generated landmark art or texture here.

## Do / don't

Do use atmosphere with restraint, make the primary action and selected state unmistakable, reserve
Gold for meaningful emphasis, and let typography and borders organize surfaces.

Don't make Scenic Route look like generic SaaS, a Google Maps reskin, luxury concierge software,
cartoon Paris, an over-illustrated tourist map, cyberpunk navigation, or an outdoors/hiking UI. Don't
add berets, baguettes, hearts, cartoon Eiffel Towers, parchment, sepia, distressed paper, excessive
romance, or literal retro-game chrome.

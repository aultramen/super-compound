# Interface Design Catalog

## Summary

Choose a domain or stack, then interpret canonical identity and RTL compatibility
before applying retrieved guidance. The local web/app split remains explicit.

## Domains

| Domain | Use For | Example Keywords |
|--------|---------|------------------|
| `product` | Product type recommendations | SaaS, healthcare, portfolio, restaurant |
| `style` | Visual style and effects | minimal, brutalism, glass, editorial |
| `color` | Product-specific palettes | fintech, ecommerce, medical, service |
| `typography` | Font pairings and font mood | professional, playful, luxury |
| `landing` | Section order and CTA patterns | hero, pricing, testimonial |
| `chart` | Chart type and accessibility | trend, comparison, funnel |
| `ux` | General UX and anti-patterns | loading, animation, mobile, accessibility |
| `web` | Web interface/a11y rules | aria, focus, semantic, preconnect |
| `app` | Mobile app interface rules | touch target, safe area, gestures |
| `icons` | Icon choices | navigation, social, ecommerce |
| `gsap` | Optional motion snippets and safeguards | hover, scroll reveal, stagger, parallax |
| `react` | React/Next.js performance | suspense, memo, bundle, waterfall |
| `google-fonts` | Google Fonts metadata | variable font, serif, latin |

## Catalog identities and RTL

Style results carry `Style ID`, `Aliases`, `Status`, `Parent Style ID`,
`Replacement Domain`, `Replacement ID`, `Preferred Mode`, and `rtl_level`.
Generic style queries rank active styles. Explicit deprecated identities resolve
to their actual replacement; explicit supplemental identities remain searchable.
Check the returned domain and identity before applying a recommendation.

For RTL, use an explicit `--domain style` or `--domain product` with `--rtl`:

| `rtl_level` | Meaning |
|---|---|
| `full` | Direction agnostic; no catalog-specific directional rework |
| `partial` | Mirrorable with component, icon, motion, carousel, and chart checks |
| `caveats` | Encodes reading direction; explain the limitation and offer a mirrorable alternative for strict RTL |

`--rtl` means all three levels; `--rtl=full` keeps only `full` rows. Eligibility
is applied before the result limit, using scores fitted to the full catalog.
Use separate RTL searches from stack or design-system generation. A compatibility
tag still requires the rendered RTL/mixed-script checks in the implementation checklist.

## Stacks

GSAP retrieval is opt-in: use `--domain gsap` or name GSAP/ScrollTrigger in the
query. Generic animation or scroll-reveal wording keeps its UX route.

Use the stack from `.agent/rules/project-config.md` when available. Default to `html-tailwind` for generic web UI.

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `nuxtjs`, `nuxt-ui`, `svelte`, `astro`, `angular`, `laravel`, `threejs`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`, `javafx`, `wpf`, `winui`, `avalonia`, `uno`, `uwp`.

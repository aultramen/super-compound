## Implementation Rules

- Use the app's existing design system and component library before adding new primitives.
- Use real icons from the existing icon set; do not use emoji as UI icons.
- Keep layout stable: fixed control dimensions, no hover-induced layout shift, no text overlap.
- Include keyboard focus states and accessible names for interactive controls.
- Treat loading, empty, error, disabled, and success states as part of the UI, not extras.
- For charts, provide readable labels, accessible fallback or data table where appropriate, and color choices that work without color-only meaning.
- For mobile/app UI, verify touch targets, safe areas, gesture conflicts, and dynamic text behavior.
- Give visual treatments a stated hierarchy, readability, interaction, or brand purpose; retain gradients, motion, and other effects when that purpose holds.
- Use sourced product facts, statistics, testimonials, and security/compliance claims. Link their evidence; remove unsupported claims or clearly label illustrative placeholders without presenting them as real.
- Measure rendered text/background contrast in each shipped theme and relevant state: WCAG AA requires at least 4.5:1 for normal text, or 3:1 for large text (at least 18pt/24px regular or 14pt/about 18.67px bold). Record colors, font size/weight, ratio, and the checked state; do not round a failing ratio up to a pass.

## Direction and mixed-script text

For RTL or mixed-direction surfaces, set the document or owning component's base direction with semantic markup (`dir="rtl"` in HTML), and use logical CSS properties such as `margin-inline-start` and `text-align: start`. Language alone does not set direction.

Inspect directional navigation icons, charts, timelines, carousels, and motion individually. Do not blanket-mirror logos, media, numbers, or every icon. Use `dir="auto"` and bidi isolation such as `bdi` where appropriate for unknown user text; verify Arabic/Hebrew mixed with Latin names, email, numbers, punctuation, and long labels. Preserve the original value when rendering it safely.

Verify visual reading order against DOM/focus order and keyboard operation. Inspect mobile/desktop screenshots with representative mixed-script content and record direction-specific exceptions. A direction flag or passing source inspection alone does not prove rendered behavior.

## Pre-Delivery Checklist

- [ ] Design system or relevant domain search was consulted.
- [ ] Stack search was consulted for framework-specific UI risks.
- [ ] Responsive checks cover mobile and desktop where applicable.
- [ ] Text fits containers and does not overlap adjacent content.
- [ ] Interactive controls have visible hover/focus/pressed states.
- [ ] Accessibility labels, semantic elements, and keyboard navigation are covered.
- [ ] Loading, empty, error, disabled, success, hover, focus, and pressed states work where applicable.
- [ ] Text contrast has measured evidence for shipped themes/states and the correct normal/large-text threshold.
- [ ] Visual treatments have a recorded hierarchy, readability, interaction, or brand reason.
- [ ] Product facts, statistics, testimonials, and security/compliance claims have evidence or honest placeholder labels.
- [ ] Applicable RTL/mixed-script layouts pass direction, isolation, keyboard/focus-order, and screenshot checks.

## Recovery and confirmation

On validation, provider, network, or authorization failure, preserve draft input and selection when safe and allowed by retention/security policy. Explain the problem, the known cause (without inventing one), the recovery action, and which state remains available. Keep field errors associated and focus recovery accessible. Do not discard a safe draft to show an error page.

Retry must not create duplicate side effects; verify the actual idempotency/deduplication boundary when applicable. Distinguish an unsent request from an uncertain outcome and support reconciliation before replay. Product confirmation for destructive or consequential actions follows approved requirements; it is separate from coding-agent approval. AI review/edit/confirm/regenerate controls follow product risk and authority, not a universal output layout.

- [ ] Representative failure preserves safe input/selection and offers actionable recovery.
- [ ] Retry/reconciliation proves the permitted outcome without duplicate side effects.

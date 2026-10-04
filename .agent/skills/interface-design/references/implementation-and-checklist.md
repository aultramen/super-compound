## Implementation Rules

- Use the app's existing design system and component library before adding new primitives.
- Use real icons from the existing icon set; do not use emoji as UI icons.
- Keep layout stable: fixed control dimensions, no hover-induced layout shift, no text overlap.
- Include keyboard focus states and accessible names for interactive controls.
- Treat loading, empty, error, disabled, and success states as part of the UI, not extras.
- For charts, provide readable labels, accessible fallback or data table where appropriate, and color choices that work without color-only meaning.
- For mobile/app UI, verify touch targets, safe areas, gesture conflicts, and dynamic text behavior.

## Pre-Delivery Checklist

- [ ] Design system or relevant domain search was consulted.
- [ ] Stack search was consulted for framework-specific UI risks.
- [ ] Responsive checks cover mobile and desktop where applicable.
- [ ] Text fits containers and does not overlap adjacent content.
- [ ] Interactive controls have visible hover/focus/pressed states.
- [ ] Accessibility labels, semantic elements, and keyboard navigation are covered.
- [ ] Visual choices avoid generic AI-looking gradients, decorative clutter, and ungrounded style mixing.

## Recovery and confirmation

On validation, provider, network, or authorization failure, preserve draft input and selection when safe and allowed by retention/security policy. Explain the problem, the known cause (without inventing one), the recovery action, and which state remains available. Keep field errors associated and focus recovery accessible. Do not discard a safe draft to show an error page.

Retry must not create duplicate side effects; verify the actual idempotency/deduplication boundary when applicable. Distinguish an unsent request from an uncertain outcome and support reconciliation before replay. Product confirmation for destructive or consequential actions follows approved requirements; it is separate from coding-agent approval. AI review/edit/confirm/regenerate controls follow product risk and authority, not a universal output layout.

- [ ] Representative failure preserves safe input/selection and offers actionable recovery.
- [ ] Retry/reconciliation proves the permitted outcome without duplicate side effects.

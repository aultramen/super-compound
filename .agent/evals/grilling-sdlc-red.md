# Grilling and SDLC pressure evaluation — RED

The baseline run exposed one failure and one partial failure among nine fixture
scenarios: it asked only the actor root and omitted question-level recommendation
guidance. Seven existing behaviors passed as regression controls.

Exact initial choices, rationalizations, source context and limitations are in
[the RED transcript](grilling-sdlc-red.json). The immutable shared prompts and
three-source pressure harness are in [the scenario fixture](grilling-sdlc-scenarios.json).

This informed evaluator's baseline is not a blinded reliability trial. Its
fixture actions did not execute a browser, model provider or product mutation.

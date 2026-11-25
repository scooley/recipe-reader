# Targeted assistance model research

Date: 2026-11-24. Status: owner selected GPT-5.4 mini as the initial candidate,
conditional on Azure access, budget, latency, and pattern-accuracy checks.

## Recommendation

Evaluate GPT-5.4 mini on Azure Global Standard as the initial implementation
candidate, rather than start a new dependency on GPT-4.1 mini or GPT-5 mini.
Keep heuristic PyMuPDF as the converter. Use the model for bounded unresolved
text/visual relationships and size-focused working revisions, not routine
whole-document retranscription or every voice question.

This recommendation is based on documented capabilities, published prices, and
model lifecycle, not measured knitting-pattern accuracy. No model was called,
no document was transmitted, and no deployment or subscription access was checked.

## Evidence and trade-offs

* GPT-4.1 mini supports text/image input and structured outputs without a
  reasoning step. It is a plausible latency-focused baseline, but OpenAI's model
  page marks it deprecated. Azure's separate lifecycle documentation lists
  April 14, 2027 retirement for its 2025-04-14 version's active base-model offers.
* GPT-5 mini also supports text/image input and structured outputs, with
  reasoning tokens. Its OpenAI model page is marked deprecated. That label
  does not establish its exact Azure retirement date or this subscription's
  access; those require Azure-specific verification.
* GPT-5.4 mini is listed in Microsoft's Foundry catalog with text/image input.
  Its OpenAI specification supports structured outputs and configurable
  reasoning. Verify Azure's deployed version supports the exact API and
  reasoning settings used; do not copy provider-specific assumptions unchecked.
* The difficult work here is associating size values with instructions,
  preserving cross-column dependencies, and interpreting annotated visuals.
  These justify testing a current image-capable mini model. They do not prove
  any model can resolve every case or replace explicit uncertainty handling.
* GPT-5.4 mini has higher token rates than the older candidates. It could also
  exceed the request deadline or produce plausible errors. Bounded calls,
  source comparisons, deterministic validation, and clarification-before-use
  remain required. Do not add a stronger automatic fallback without a separate
  decision and a shared spending bound.

## Published price comparison

Azure Global prices in USD per million tokens, checked against the public
pricing listing; actual offer and deployment pricing must be verified before use.
No cache discount is assumed.

| Candidate | Input | Output |
| --- | ---: | ---: |
| GPT-4.1 mini | $0.40 | $1.60 |
| GPT-5 mini | $0.25 | $2.00 |
| GPT-5.4 mini | $0.75 | $4.50 |

For illustration only, an aggregate conversion allowance of 20,000 billable
input tokens and 8,000 billable output tokens would cost $0.051 with GPT-5.4
mini at these rates. This is arithmetic, not a document token estimate. Input
must account for image tokens; output must include billed reasoning tokens.
Repeating that token usage would cost $0.102. The owner subsequently replaced
the earlier $0.10 import/size-stage caps with one shared $25 monthly budget for
preparation and all backend model-assisted modifications. The earlier stage
caps are not active requirements. Reserve worst-case cost across all attempts
before sending calls and apply bounded token, image, retry, and deadline limits
to individual requests; retries must not bypass monthly accounting.

For expected 2-10-page patterns with roughly one image per page, $0.05-$0.15 for
preparation including an initial size-focused copy is a planning estimate before
retries, not a measured cost or per-project allowance. It assumes bounded image
examination and output; complex diagrams, reasoning, and repeated calls can
increase usage. Confirm Azure's exact image-token accounting before enforcement.

## Verification before locking the implementation

Confirm Azure version/lifecycle, Global Standard region and subscription access,
quota, managed-identity role, structured-output and image support, permitted
reasoning settings, image token calculation, and retention/abuse monitoring.
Then evaluate representative size associations, column continuations, units,
annotated visuals, and appropriate abstention. Measure combined latency and
cost, including retries, against the request deadline and allowance. Public
benchmarks are not a substitute for these checks.

## Sources

* [Azure deployment types](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types)
* [Azure lifecycle policy and GPT-4.1 mini retirement](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements)
* [Azure OpenAI pricing](https://azure.microsoft.com/en-us/pricing/details/azure-openai/)
* [GPT-5.4 mini in the Microsoft Foundry catalog](https://ai.azure.com/catalog/models/gpt-5.4-mini)
* [GPT-4.1 mini specification](https://developers.openai.com/api/docs/models/gpt-4.1-mini.md)
* [GPT-5 mini specification](https://developers.openai.com/api/docs/models/gpt-5-mini.md)
* [GPT-5.4 mini specification](https://developers.openai.com/api/docs/models/gpt-5.4-mini.md)
* [Azure reasoning-model API guidance](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/reasoning)

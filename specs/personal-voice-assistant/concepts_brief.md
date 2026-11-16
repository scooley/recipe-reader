# Personal Pattern and Recipe Voice Assistant

* **Author:** @scooley
* **Date:** 2026-11-12
* **Status:** First Goldfish review complete; product choices below remain open.

## Overview

A personal voice assistant for following knitting patterns, crochet patterns,
and cooking recipes while the user's hands are occupied. It answers questions
about the relevant part of a source document and supplies the next instruction
without treating an instruction it has spoken as work the user has completed.

At the start of a conversation, it assumes the most recent project, names that
project and its last reported area, and invites correction. It remembers project
details between sessions, finds older projects when requested, and asks focused
questions when missing or conflicting information affects an answer.

The preferred starting point is the user's existing LiveKit Agent Builder agent.
The first interface is Live preview in the logged-in Builder web UI, not a new
application or public embed.
PDFs and web pages provide instructions; read-only Ravelry access and the user's
blog can provide additional context where available. Restricted sources remain
accessible only within the user's authorized personal use. Public portfolio
notes do not grant access to the agent or its source documents.

For project discovery, the desired interaction is a description such as "the
tank top I'm working on." The assistant would find matching in-progress Ravelry
projects and clarify if the match is ambiguous. The user is willing to upload
the pattern once rather than supply it again for every session.

## Analysis

All six Goldfish reviewers completed the first review. The
[full review](goldfish_review.md) preserves the objections, repository evidence,
alternatives, and detailed behavioral checks.

### Three failures the first version must expose

**Answering from the wrong section.** The example pattern contains several
increase sections, multiple sizes, and instructions that continue across pages.
A plausible answer from the wrong section is still wrong. The assistant must
keep follow-up questions attached to the same project and section, include
necessary continuation text, and ask about size only when it changes the answer.
Missing source text is a reason to explain the limitation, not fill the gap from
general craft knowledge.

**Remembering progress that was never reported or saved.** Asking about the next
section is not a progress update. A reported update should be acknowledged as
saved only after storage confirms it. Session summaries alone do not demonstrate
durable memory, especially after an abrupt disconnect. An uncertain save outcome
must be described as unconfirmed rather than as success or definite loss.

**Exposing restricted sources through a personal agent.** Calling the assistant
"personal" does not control who can connect or invoke its tools. Access must be
enforced outside the prompt, including at the source and memory endpoints.
Connected services may also retain transcripts or tool results; their actual
access and retention settings need checking before using restricted material.
The logged-in Builder UI avoids needing a new client login for the first
experiment, but source and memory endpoints still need their own access controls.
This needs a single-owner boundary, not a multi-user permissions platform.

These are checks before relying on the assistant, not reasons to build a large
system before trying the conversation.

### What the platform evidence supports

[LiveKit's Builder documentation](https://docs.livekit.io/agents/start/builder/)
supports authenticated HTTP tools, secret-backed headers, client tools, dynamic
session metadata, remote MCP tools, end-of-call summaries, and Python code export.
Custom API calls therefore do not require leaving Builder.

That documentation does not establish built-in PDF ingestion or durable project
memory. Those capabilities still need a working input and storage path. Open-ended
conversation fits this assistant better than Builder's Data Collection mode,
which can end a call once required fields are collected.

The user's screenshot confirms that the existing agent is in Open ended mode
with Live preview available and an interruptible welcome message enabled. The
visible instructions and greeting still describe a generic coaching assistant;
they are not yet the agreed pattern-and-project behavior. Models, tools, secrets,
and storage settings were not shown or verified.

Builder preview sessions use inference credits and do not appear in production
Agent observability, according to the same documentation. The first experiment
must use the preview's available events and logs plus tool-side outcomes rather
than assume a production session record exists. Verify actual capture and
retention before supplying restricted content.

The [official Ravelry API entry](https://www.ravelry.com/api) redirected to a login
page during research. The user's developer-portal screenshot confirms separate
read-only and personal-account Basic Auth options, alongside OAuth 2.0 and 2.1.
It also shows an existing read-only application.

The [access review](ravelry-access.md) recommends **Basic Auth: read only access**
for the first version. A current third-party client's endpoint documentation
reports successful project list/detail/status reads with that credential type.
This has not been tested with the user's account, and the needed response fields
remain to be checked. Personal-account access is not recommended by default.
Read-only project metadata access must not be treated as writable memory or
document entitlement.

Project discovery and source access are separate: finding the Ravelry project
does not establish access to its full pattern. The proposed connection is to
associate an authorized one-time upload with the selected project, then reuse it
across sessions. Ravelry remains a read-only source of project details; assistant
updates need their own writable store.

The repository reviewer found a Swamp scaffold, not an existing assistant
implementation. The external Builder agent is the main known reuse opportunity;
only the screenshot's visible conversation settings have been inspected.
Before implementing integrations in
this repository, follow its extension-discovery and reuse rules in `AGENTS.md`.
No extension search or integration trial has been completed.

## Goals vs. Non-Goals

**In-scope goals**

- Personal, hands-free questions and next-instruction help for patterns and recipes.
- Answers tied to the user's source and relevant section, including follow-ups.
- Lasting project memory, historical resume greetings, corrections, and retrieval
  of previous projects.
- Clarification when needed, without repeating setup questions unnecessarily.
- Restricted access to purchased or otherwise gated source material.
- Read-only Ravelry and blog lookups where supported and authorized.

**Out-of-scope non-goals for the initial version**

- Automatically observing or counting completed stitches, rows, or cooking steps.
- Multi-user personalization, a public interactive agent, or automatic publishing.
- Writing changes back to Ravelry.
- General web crawling, a large document-search platform, or mandatory SDK migration.
- A custom wake word, offline operation, or support for every device without a
  separate requirement and feasibility check.

## Alternatives Weighed

These are review recommendations, not user-approved implementation decisions.

| Approach | Strongest reason to use it | Limitation and proposed disposition |
| --- | --- | --- |
| Prompt-only Builder | Fastest way to try the conversation and voice behavior. | Does not establish lasting memory or reliable document access. Keep it as a limited experiment, not the finished assistant. |
| Builder with a few source and memory tools | Reuses the existing agent and supported API integrations. | Adds storage, access control, and failure handling. Preferred starting hypothesis if these remain small. |
| Export immediately to the Python SDK | More control and access to SDK-only features and tests. | More code ownership does not solve source accuracy by itself. Defer until a specific Builder limitation matters. |
| Checked full-document context for a short pattern | Can preserve section continuity without a search system. | Extraction order, content size, and model costs still matter. Compare with simple section-based retrieval rather than choosing an index up front. |
| General document indexing and web importing | Could reduce repeated preparation across many sources. | Adds parsing, section-boundary, access, and update problems. Defer until actual document volume or failures justify it. |
| Ravelry as the main project record | Reuses details the user already maintains. | Access is unverified and read-only access cannot save assistant updates. Use as an attributed reference, not the only memory store. |

## Key Decisions & Staging for Next Steps

### Confirmed by the user

- Start with a personal agent; broader personalization is a possible later step.
- Prefer the existing LiveKit Builder agent, without a strict no-code requirement.
- Use the logged-in Builder web UI's Live preview for the first real session.
  A custom client, public embed, or separate client-login implementation is not
  needed for this experiment.
- Resume the most recent project by default. Greet with the project and last
  known area, then invite questions or correction rather than require an intake
  questionnaire.
- Find existing projects instead of recreating them; create a new record when
  the user is starting a new project or recipe.
- Desired setup: resolve a spoken project description against in-progress
  Ravelry projects. A one-time pattern upload is acceptable.
- Read-only Ravelry credentials are acceptable to the user. The access review
  recommends trying that type before requesting broader account access.
- Remember useful project details and clarify ambiguity.
- Treat restricted patterns and recipes as access-gated. Progress and status
  notes may be public, but automatic publication is not part of this version.
- Keep this effort's EGM artifacts together in `specs/personal-voice-assistant/`.

### Proposed first experiment

Keep Builder and connect the smallest suitable source and memory capability.
Use its existing Live preview as the client. Start with one source and two
project records so the trial exercises both the
real question sequence and project switching. Use original synthetic content
until the access boundary is checked; then test the supplied pattern privately.
Synthetic success alone does not demonstrate that the real PDF works.

The experiment should demonstrate:

- The initial section-specific question and follow-up stay in the right context.
- Size questions occur only when the answer depends on size.
- An explicit update survives a new session and appears as last reported progress.
- The opening greeting uses retrieved saved state, not a hardcoded project or
  manually refreshed preview metadata.
- A correction replaces an earlier report; looking ahead does not record completion.
- An older-project lookup does not accidentally redirect a save.
- Missing source text, failed retrieval, and unconfirmed saves produce distinct,
  useful explanations.
- A caller without access cannot obtain restricted source content or change memory.
- The chosen device remains usable during realistic quiet stretches and interruptions.

The first review proposed deferring Ravelry integration until after the
source-and-memory exchange. The user subsequently identified Ravelry discovery
as the desired entry point, so that deferral is not an agreed scope decision.
A manually prepared project can test the conversation but cannot demonstrate
the intended "find what I'm working on" setup. The next access check should use
read-only Basic Auth for a project list and one project's details, following the
[bounded check](ravelry-access.md#smallest-useful-access-check). Only an actual
limitation should trigger a discussion of broader access or a limited substitute.
Blog lookups remain a broader goal.

### Decisions still needed

1. **Browser session behavior:** the client is now chosen; interruption, quiet
   stretches, and reconnecting still need a practical check in Builder preview.
2. **Source intake:** a one-time upload is acceptable; its destination, project
   association, and processing/retention boundary still need defining.
3. **Saving and correcting updates:** whether a clear explicit update receives a
   brief acknowledgment after saving, and when confirmation is needed.
4. **Meaning of most recent project:** the review proposes that merely consulting
   an old project should not switch the working project or next greeting.
5. **Ravelry discovery verification:** read-only Basic Auth is the recommended
   starting point; verify the expected project and required fields before
   promising discovery or deciding to defer it.

Before a paid or unattended trial, agree a resource or spending allowance and
behavior at that limit. Measure the selected configuration rather than inventing
prices, latency promises, or an hour-long listening guarantee.

Before promising Ravelry support, verify authorized read-only access with a
bounded project-list/detail check. No credentials, account changes, deployments,
or implementation work were part of this review.

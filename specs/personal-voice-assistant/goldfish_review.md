# Personal Voice Craft/Recipe Assistant — Concept Brief

> First-review snapshot. Subsequent user decisions, including use of the
> logged-in Builder web UI for the first session, are recorded in
> [the working concept brief](concepts_brief.md).

A fluent conversation would not prove this concept works. The first demonstration must expose three possible failures: answering from the wrong section, claiming an update was saved when it was not, and exposing a restricted source through an otherwise convenient personal agent.

**Recommendation, not an approved design:** retain the existing LiveKit Builder agent and test the smallest private source-and-memory connection that meets those behaviors. No demonstrated limitation currently justifies replacing Builder. A prompt alone is not evidence of durable memory or reliable document ingestion.

This is a concept review only. No implementation, commits, deployment, account changes, or publication were performed. The reviewers did not access the restricted PDF, and this report contains no actual pattern instructions. Actual-answer correctness therefore remains unverified.

## Review participation

All six requested fresh-context reviewers ran in parallel and returned substantive reports. No reviewer failed or required a retry.

| Requested reviewer | Named agent | Status | Principal brainstorm coverage |
| --- | --- | --- | --- |
| `egm-design` | `egm:design_critic` | completed | Cost, quotas, practical feasibility |
| `egm-codebase-details` | `egm:codebase_details` | completed | Existing code/reuse, migration and compatibility |
| `egm-zoom-out` | `egm:zoom_out` | completed | Minimum credible scope, alternatives, unnecessary code |
| `egm-comprehension` | `egm:comprehension` | completed | Voice interaction, clarification, hands-free ergonomics |
| `egm-implementation-readiness` | `egm:implementation_readiness` | completed | Diagnosis, persistence failures, operational visibility |
| `egm-structural` | `egm:structural` | completed | Maintenance, source/memory boundaries, scope consistency |

**Deduplicated findings:** 3 blockers, 4 majors, 2 nits/reversible choices. “Blocker” below means an acceptance gate before claiming the relevant capability works—not an established platform impossibility or a reason to block a synthetic trial.

## Prioritized objections

### B1. Wrong-section answers can sound fully grounded — 🔴 Blocker

**Lenses:** codebase-details, zoom-out, comprehension, implementation-readiness, structural, design.

- **Scenario:** The first question resolves to the intended shoulder section; the follow-up retrieves a similarly named section or misses the continuation across a page boundary. An unnecessary size question can distract from the actual section-selection error.
- **Impact:** Plausible but incorrect instructions, with the second answer compounding the first.
- **Minimum mitigation:** Preserve the project, identifiable source version, intended section, and necessary continuation. Keep related follow-ups anchored to that context. Ask about size or location only when the missing detail changes the answer. Incomplete evidence must not be completed from general knitting knowledge.
- **Smallest credible approach:** For one short document, checked full-document context or bounded, section-aware retrieval are both candidates. Do not select vector search before observing a need. In either case, verify extraction, order, and relevant continuation; successfully opening a PDF is not sufficient.

The supplied Builder documentation does not establish native PDF ingestion. A usable authorized input path remains work to demonstrate, not a feature to assume.[1]

### B2. Conversation continuity is not durable reported progress — 🔴 Blocker

**Lenses:** all six reviewers.

- **Scenario:** The user reports an update, then disconnects before an end-call summary arrives. Alternatively, a question about the next section becomes recorded completion, or a late summary overwrites a correction.
- **Impact:** The next greeting presents fictional or stale progress as remembered fact.
- **Minimum mitigation:** Save explicit user updates during the conversation, with an unambiguous project target and report time. Acknowledge “saved” only after confirmed persistence. Distinguish saved progress from the section currently being discussed and from instructions merely supplied. Corrections supersede earlier reports; a retry must not duplicate an update or undo a newer correction.
- **Failure nuance:** A timeout may leave the save outcome unknown. Say it was not confirmed rather than asserting either success or definite loss; check before retrying when necessary.

End-call summaries can supplement memory, but their existence does not establish durable delivery or authoritative project state. Native durable project memory is not established by the supplied Builder page; supported HTTP tools can connect external persistence without leaving Builder.[1]

### B3. A personal-use label does not enforce private access — 🔴 Blocker

**Lenses:** design, zoom-out, comprehension, implementation-readiness, structural.

- **Scenario:** A shareable client reaches restricted retrieval tools, or private source passages appear in transcripts, summaries, diagnostic exports, or a public portfolio path.
- **Impact:** Purchaser-gated content or private project history becomes accessible outside the intended personal session.
- **Minimum mitigation:** Enforce one-owner access at the client and source/memory endpoints; keep documents and derived private records behind that boundary. Review actual capture, access, retention, and deletion behavior in connected services before introducing restricted material. An outgoing secret-backed tool header does not authenticate the human caller.
- **Scope restraint:** This does not require multi-user permissions infrastructure. No publishing capability belongs in the initial slice. Public progress metadata never implies permission to expose the document or interactive assistant.

### M1. The first client's quiet-session behavior determines usability and cost — 🟡 Major / open product decision

**Lenses:** design, comprehension, zoom-out, implementation-readiness, structural.

- **Scenario:** After a long silent working interval, the phone is locked or the session has ended. Conversely, an idle connection remains active longer than the user intended. “Stop” might interrupt speech or accidentally terminate the session.
- **Impact:** Hands-free assistance becomes unavailable, surprising, or unexpectedly costly.
- **Minimum mitigation:** Choose one real client/device and make interruption, listening suspension, session ending, and resumption understandable on that client. Test representative silence and backgrounding. Do not promise custom wake-word behavior or assume hour-long connections.
- **Cost discipline:** Measure connected time, active conversation, selected speech/model usage, document processing, tool calls/retries, and retained data separately. Actual charges and quotas depend on the chosen services and configuration; no prices, allowance, or latency target were established here. Bound retries and repeated processing rather than building a general scaling system.

A trial spending/resource allowance and behavior at that limit need agreement before a paid or unattended trial, not an invented number in this concept brief.

### M2. Looking up an older project must not silently retarget saved updates — 🟡 Major / open product decision

**Lenses:** codebase-details, zoom-out, comprehension, implementation-readiness, structural.

- **Scenario:** The user retrieves an old project for comparison. The assistant makes it the next-session default or saves the current project's update against it.
- **Impact:** “Most recent” becomes unpredictable and memory is corrupted across projects.
- **Minimum mitigation:** Distinguish lookup from switching the working project, and acknowledge an explicit switch briefly. Keep every save tied to a known project.
- **Proposed interpretation, not a new approved requirement:** “Most recent” could mean the last intentionally selected/used working project, rather than whichever record was most recently read. Confirm this meaning during design; do not silently replace the user's agreed resume behavior.

The confirmed behavior remains: assume the most recent project on connection, name its **last reported** area, and invite correction without a repetitive questionnaire. Reading an instruction, elapsed time, and silence are not progress reports.

### M3. External lookups are conditional references, not competing sources of progress — 🟡 Major / unresolved dependency

**Lenses:** design, codebase-details, zoom-out, implementation-readiness, structural.

- **Scenario:** Ravelry access is unavailable, an external detail conflicts with a user report, or a blog changes. A refreshed value silently overwrites remembered progress; alternatively, integration setup blocks testing the core assistant.
- **Impact:** Local continuity depends on external availability, and the user cannot tell why a remembered fact changed.
- **Minimum mitigation:** Attribute external observations and resolve conflicts only when they affect the requested answer. Preserve explicit local reports rather than silently replacing them. Keep locally available projects and authorized documents usable when an integration fails.
- **Unresolved Ravelry work:** A separately authorized, small read-only project list/detail access check must establish usable fields and actual permitted access. The official entry point redirected to login in the supplied verification; key types, scopes, quotas, and document access were not established.[2] Metadata access would not itself establish purchased-pattern access.

Ravelry and blog lookups remain recognizable scope goals. Deferring them from the first experiment is not permission to drop them, claim they work, or substitute scraping.

### M4. Without lightweight diagnosis, wrong answers and stale memory are indistinguishable — 🟡 Major

**Lenses:** codebase-details, implementation-readiness, structural, design.

- **Scenario:** A wrong greeting could result from failed retrieval, stale metadata, an incorrectly targeted write, or an older summary. A replaced document could leave a remembered source anchor pointing at different text.
- **Impact:** Fixes become prompt guesswork; maintenance or migration can silently alter behavior.
- **Minimum mitigation:** Record enough private, content-minimized information to distinguish operation, result category, correlation identifier, memory revision, selected source/section identifier, and relevant timing. Distinguish missing information, unavailable retrieval, incomplete evidence, denied access, and uncertain writes. Revalidate source references when a source changes without erasing historical user reports.
- **Scope restraint:** A small failure record and repeatable behavioral checks are sufficient initially. No dashboard suite, elaborate event history, or general migration framework is justified. Platform capture must still be checked even if application logs omit source text.

### N1. Exact wording and routine save confirmation can stay reversible — 🟢 Nit / cheap choice

**Lenses:** comprehension, zoom-out.

- **Scenario:** Every answer repeats project, section, and page, or every clear update triggers a second question.
- **Impact:** Unnecessary interruption while the user's hands are occupied.
- **Minimum mitigation:** Speak the section anchor when establishing or changing context; preserve units in numeric answers. After a successful clear update, a concise acknowledgment with easy correction is a plausible default. Clarify genuinely ambiguous updates. Test wording rather than freezing a detailed dialogue script.

### N2. Premature migration and indexing add maintenance without proving the use case — 🟢 Nit / reversible technical choices

**Lenses:** design, codebase-details, zoom-out, structural.

- **Scenario:** The project begins with a new agent stack, generic crawler, vector database, connector framework, or multi-user schema.
- **Impact:** More code and operational burden before validating the real two-question exchange.
- **Minimum mitigation:** Start from Builder's supported tool interfaces and a bounded source. Choose larger machinery only in response to a demonstrated limitation, repeated manual work, or measured resource use. This is a proposal, not a prohibition on code or SDK export.

## Existing implementation and reuse evidence

Only the codebase-details reviewer inspected the repository. Other reviewers relied on the supplied context and platform evidence. Its read-only findings were:

| Evidence | What it supports—and does not support |
| --- | --- |
| `.swamp.yaml:1–7` | Initialization/configuration metadata, not an assistant implementation. |
| `AGENTS.md:4` | The checkout identifies itself as Swamp-managed. This does not establish an existing application service. |
| `AGENTS.md:8–10` | Repository guidance favors searching/extending existing capabilities before custom integration work; the reviewer also identified a prohibition on shell-wrapped integrations. Follow the actual repository instructions if implementation is later authorized. |
| Directory and Git inspection | The reviewer found empty `models/`, `workflows/`, and `grants/`, no application source, and no tracked files. These are inspection observations, not line-addressable implementation evidence. |
| `.gitignore:3–4` | Runtime data is excluded; cloning or versioning the repository must not be assumed to back up durable memory. |

**Conclusion:** No assistant implementation was found in the inspected checkout. Installed/community extension availability remains unverified, not proven absent. The existing external Builder agent is the main known reuse opportunity; its actual configuration was not inspected.

Builder supports instructions, dynamic job metadata, authenticated HTTP tools with secret-backed headers, client RPC, remote MCP, end-call summary delivery, insights, Python Agents SDK export, and normal LiveKit Cloud deployment.[1] Custom HTTP integration does **not** require leaving Builder.

The supplied documentation identifies limitations including vision, workflows/handoffs/tasks, model plugins, and SDK tests. Data Collection mode is not a natural default for this companion: its required-field collection and automatic completion behavior work against an intermittent, open-ended conversation.[1]

## Minimal credible first slice

**Proposed shape:** the existing Builder agent, one private client, one authorized source initially, two project records, and the smallest suitable durable-memory/source capability. A small external service is a candidate, not an approved hosting or database selection.

1. **Check behavior without restricted content first.** Use a wholly original synthetic document with similarly named sections, a cross-page continuation, and both size-relevant and size-irrelevant questions. Use two invented projects to exercise lookup and switching. Do not derive fixtures from the purchased pattern.
2. **Demonstrate the actual persistence boundary.** Save one explicit update, interrupt the session, reconnect, and recover it as historical reported state. Exercise correction and failed/uncertain saving. A manually rewritten prompt between sessions is not a persistence demonstration.
3. **Test the real use case through separately authorized private intake.** Validate the intended shoulder section, frequency question, and follow-up total against the actual source, including its continuation. Check extraction privately; record behavioral outcomes rather than copying instructions into reports or fixtures. Synthetic success alone does not establish correctness on this PDF.
4. **Exercise genuine hands-free use.** On the selected client, test interruption, silence, resumption, and a short answer with clear units. Asking for the next instruction must not advance saved progress.
5. **Keep expansion explicit.** Add a permitted saved blog page or read-only lookup and the bounded Ravelry capability check after the core is demonstrated. Preserve older-project retrieval and lasting memory in the slice; these are not optional future polish.

This tests the user's real workflow without requiring a broad ingestion platform. It is not completion of every recipe, blog, or Ravelry scenario.

## Alternatives and strongest counterarguments

| Alternative | Strongest case for it | Strongest counterargument / proposed disposition |
| --- | --- | --- |
| Prompt-only Builder | Fastest route to test voice wording, clarification, and turn-taking. | Does not establish durable memory or a reliable source-input path. Useful as an explicitly limited conversation experiment, not as the completed concept. |
| Builder plus bounded tools | Reuses the existing agent and supported HTTP integration while supplying missing persistence/source capabilities. | Adds hosting, authentication, and network failures. Preferred starting hypothesis only if a small, maintainable capability meets the trial's behavior. |
| Immediate Python SDK export | More control and an SDK testing path can matter for demonstrated unsupported behavior. | More code ownership does not solve source accuracy or access control by itself. Defer until a concrete Builder limitation is shown. Export is documented; round-trip synchronization is not established.[1] |
| Full short-document context / checked bounded ingestion | May preserve section continuity more simply than general retrieval for a four-page source. | Extraction still needs checking; context costs and processing permissions matter. Avoid manual preparation that merely authors every expected answer. Compare against bounded retrieval using the actual trial. |
| Rich indexing and general web import | Useful when many documents or repeated ingestion labor justify them. | Adds failure modes around chunk boundaries, changed pages, and access. Defer until document volume or measured failures justify the work. |
| Ravelry as the primary project reference | Could avoid re-entering details already maintained there. | Access is unverified, and read-only access cannot provide writable assistant memory. Keep optional initially; do not equate imported metadata with reported progress or source entitlement. |

If migration becomes necessary, preserve tool contracts, project identity, explicit-report semantics, and existing records. Recheck client dispatch compatibility. Code export is not a backup/export of runtime memory and must not automatically bundle restricted documents.

## Behavioral acceptance examples

These are observable checks, not guarantees of absolute accuracy. Bracketed values below are placeholders; no actual pattern instructions are reproduced.

| Case | Expected behavior |
| --- | --- |
| Correct section and continuation | After the user anchors the intended shoulder/increase area, “How often?” resolves to that section and its necessary continuation, not a nearby similarly named heading. First answer briefly names the section. |
| Size irrelevant | The demonstrated frequency and total questions receive verified answers without asking size, because those particular answers are invariant. |
| Size relevant | A different question whose answer varies by size triggers a targeted size question if it is not known. Use the source's labels/order; do not guess a mapping. |
| Follow-up context and units | “How many altogether?” stays attached to the same section/topic. Answer with the applicable unit. Clarify only if competing meanings, such as repetitions versus final stitch count, change the answer. |
| Next instruction | Asking what comes next does not record completion. If the reported location leaves two materially different next steps, ask the specific boundary question rather than infer unreported work. |
| Historical greeting | “Welcome back to [project]. Your last saved note says [area]. Tell me if that's changed.” No assertion that the user is currently there, and no repeated intake questionnaire. |
| Correction and persistence | A clear corrected project detail supersedes the older report and appears correctly after reconnecting. Discussion of a hypothetical section does not become progress. |
| Older project lookup | An old project can be found with its own historical notes; mere lookup does not silently redirect subsequent saves under the proposed lookup/switch distinction. |
| Explicit project switch | Acknowledges the new project once, uses its source/context, and does not contaminate the previous project's record. |
| Incomplete source | If a missing continuation prevents establishing a total, say the available excerpt is insufficient. Do not complete the instruction from general knowledge. |
| Retrieval failure | “I couldn't retrieve your project details” is distinct from “You haven't told me.” Do not create a replacement project or fabricate a source-specific answer. |
| Failed or uncertain save | Do not say “saved.” If the outcome is uncertain, disclose that and resolve it safely; a retry must not duplicate or regress state. In-session recollection is not a durable-save claim. |
| Abrupt disconnect | An acknowledged update is available in a fresh session. An unacknowledged one is not promised merely because it was spoken. |
| Interrupted answer | Stop the unwanted speech; apply a correction to conversational context without inventing completed progress. Interrupting speech does not undo an already saved update. |
| Source replacement | Historical reports remain historical; source references that no longer resolve are identified rather than silently mapped to different instructions. |
| External conflict/unavailability | Attribute conflicting external details and ask only when the answer depends on them. Unavailable Ravelry/blog access does not erase usable local memory. |
| Access isolation | An unauthenticated caller cannot obtain private project names, notes, or restricted answers. Public portfolio metadata does not grant tool, document, or private-agent access. |
| Diagnostic privacy | A failed retrieval/save can be distinguished using restricted, minimal operational records; inspect platform capture separately for unintended content exposure. |

## Choices and dependencies before formal design

Only the following decisions materially shape the first slice:

1. **First client/device and listening lifecycle:** how the user starts, interrupts, pauses/ends, and resumes while hands are occupied. Test this before promising hands-free behavior; no numerical latency commitment is established.
2. **Authorized source intake and private processing boundary:** how a document/page reaches the assistant and which connected services may receive it. Native PDF ingestion and memory cannot simply be assumed.
3. **Update commitment and correction interaction:** whether clear explicit updates receive a post-save acknowledgment by default, how ambiguous updates are confirmed, and how the user corrects a saved detail.
4. **Meaning of “most recent” when older projects are consulted:** retain the agreed greeting, while choosing predictable lookup-versus-switch semantics.

**Before a paid/unattended trial:** agree an acceptable spending/resource allowance and what happens at its limit; check the selected configuration's actual prices and quotas.

**Before promising Ravelry support:** verify authorized read-only access and useful fields. This is an unresolved integration dependency, not a confirmed blocker to the source-and-memory trial. Do not request or expose credentials in a report.

Database brand, exact greeting phrasing, vector indexing, multiple devices, a custom wake mechanism, extensive dashboards, multi-user personalization, and public publishing are not prerequisites to this concept's first test. The review does not choose them on the user's behalf.

## Sources and evidence limits

1. **LiveKit Agent Builder:** https://docs.livekit.io/agents/start/builder/ — canonical Markdown: https://docs.livekit.io/agents/start/builder.md. Platform capabilities and limitations above use official documentation supplied as verified on **2026-11-12**, with the codebase reviewer also consulting that reference. This evidence does not establish the user's existing agent configuration, native PDF ingestion, native durable project memory, actual costs, or successful operation of proposed tools.
2. **Official Ravelry API entry:** https://www.ravelry.com/api. Supplied verification reached login. Official credential requirements, scopes, accessible fields, quotas, and purchased-document access remain unverified; third-party descriptions were not promoted to confirmed facts.
3. **Local reuse evidence:** the codebase-details review cited the repository files above and inspected its scaffold read-only. No application implementation was found; no source pattern, credentials, personal transcripts, or unrelated session history were inspected.

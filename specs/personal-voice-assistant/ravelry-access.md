# Ravelry: Minimum Access for the Personal Assistant

* **Date:** 2026-11-12
* **Status:** Research recommendation; no authenticated requests performed.

## Recommendation

Start with **Basic Auth: read only access**.

The required Ravelry operations are reading public projects and their details.
The assistant saves its own notes elsewhere, and the user can upload the pattern
once. Neither operation requires Ravelry write access or automatic access to
purchased PDFs.

This is the minimum-access candidate supported by the evidence below, not a
claim that the user's credentials or required fields have been tested.

## Available Access Types

The user's developer-portal screenshot shows four choices:

| Type | Evidence and relevance |
| --- | --- |
| Basic Auth: read only access | The existing application shown uses this type. A current third-party client's project endpoint documentation reports successful project list/detail/status reads with this credential type. Start here. |
| Basic Auth: personal account access | The third-party client describes personal credentials as full account access with scopes granted automatically. Broader than the proposed public-project reads; not the default recommendation. |
| OAuth 2.0 | The client documents delegated account access and explicit scopes. Relevant if a later capability needs account authorization or the app supports other users. Not needed just to try public-project discovery. |
| OAuth 2.1 | Offered in the current portal screenshot. Its Ravelry-specific flow and permissions were not verified in accessible documentation; do not assume the OAuth 2.0 client's details fully describe it. |

These are not a simple ladder of permission levels. Basic Auth identifies a
credential scheme; read-only versus personal-account credentials determine
different access. OAuth introduces user authorization and scopes.

## Evidence and Limits

The official [API documentation](https://www.ravelry.com/api) redirects this
research session to login. The portal screenshot establishes the available
credential choices, but not every permission associated with them.

The current third-party
[`ravelpy` project endpoint implementation](https://github.com/weftmark/ravelpy/blob/main/ravelpy/resources/projects.py)
explicitly reports:

- Project search, list, detail, craft, and status endpoints work with read-only
  Basic Auth in its live testing.
- Some of those endpoints are described as authenticated in the official docs,
  despite the reported read-only success.
- Project comments return an authorization error with read-only credentials.
  Comments are separate from notes in a project's own details.

The same client's
[authentication guide](https://github.com/weftmark/ravelpy/blob/main/docs/authentication.md)
describes personal keys as broad account access and documents OAuth scopes
including `library-pdf` for purchased-PDF downloading.

Its general authentication guide describes read-only access as public catalog
access; the endpoint-specific documentation is more precise about project reads.
This difference, and the lack of an authenticated test here, mean the
recommendation needs a small real check rather than a blanket compatibility
claim. Third-party observations are not an official permission guarantee.

## Smallest Useful Access Check

Use the read-only credential and an explicitly configured Ravelry profile
username. The API credential username is not the profile username, and the
assistant need not call a "current account" endpoint to discover identity.

1. Read `GET /projects/{username}/list.json`, including pagination as needed.
   Verify that the expected in-progress project is present and that its status
   can be interpreted.
2. Read `GET /projects/{username}/{id}.json` for that project. Inspect whether
   its name, pattern association, status, and needed project notes are available.
   Do not assume that a successful response includes every desired field.

No mutation is part of this check. Do not fetch messages, comments, purchases,
or library documents just to prove project discovery.

If access or a needed field is missing, identify the specific limitation before
requesting broader credentials. Consider a narrowly authorized OAuth capability
where supported, or keep the missing information in assistant memory. Do not
silently promote the agent to full personal-account access.

## Boundaries for the First Version

- Ravelry is a read-only project reference, not the writable assistant memory.
- Project metadata access does not imply access to purchased pattern files.
  Keep the one-time upload path separate.
- Only expose the required read operations to the assistant, even if a future
  credential can perform more.
- Keep credentials in the selected secret store, not prompts, source files,
  screenshots copied into the repository, or this specification.
- No credential values or account screenshots were copied into these artifacts.

# Converter Isolation Options

**Date:** 2026-11-24
**Scope:** Investigation for review finding M06; no architecture choice made.
**Method:** Public Microsoft and Linux documentation. No resources provisioned,
containers run, dependencies installed, purchased documents transmitted, or
production/design files changed. This research document is not a security test.

## Findings

The original sidecar is not a demonstrated credential-isolation boundary.
Microsoft documents managed identity at Container App scope. Its lifecycle
controls distinguish initialization from running containers, not the Deno
container from a simultaneously running converter sidecar. Main/Init/None cannot
by itself give Deno runtime access while denying only that sidecar.

Microsoft also documents that containers in one app share network resources and
lifecycle. Non-root execution, process timeouts, and memory bounds remain useful,
but do not establish protection from a compromised native PDF parser obtaining
application authority. Removing identity environment variables alone is not a
verified security boundary.

There are three isolation directions. They offer different guarantees; none has
been exercised in this subscription.

## A. Keep the sidecar; restrict the PDF worker process

Linux supports unprivileged restrictions through `no_new_privs`, seccomp system
call filters, and Landlock access rules. In principle, a trusted launcher could
start the converter with only necessary input/output channels, restrict filesystem
access, prevent network connections and process interference, and apply limits
before processing any untrusted PDF bytes.

**Advantage:** Retains one app, local transfer, and existing deployment shape.
No additional managed compute service is inherently required.

**Limitations:** This becomes sandbox engineering, not just a Docker setting.
The Linux documentation explicitly says seccomp filtering alone is not a sandbox.
Environment cleanup does not restrict filesystem/process access; closing inherited
descriptors and covering alternate syscall paths and threads matter. Landlock
features depend on the actual kernel ABI and enabled host policy. Container Apps
does not permit privileged containers, and the reviewed Microsoft documentation
does not establish that the required unprivileged restriction combination works
on this managed host.

**Before selection/release:** Demonstrate the restrictions on the actual Linux
hosting platform with synthetic probes. Test blocked identity-endpoint access,
internet/DNS connections, unwanted file/process access, inherited descriptors,
and child/thread behavior, as well as successful conversion. Refuse conversion
when required isolation cannot be installed; never silently degrade. A local
macOS or Docker result alone does not establish Azure host support. Define who
maintains the policy as Python/native dependencies change.

## B. Run the converter as a separate private Container App

Give its runtime no application storage/model identity or credentials. If private
registry pulls need an identity, keep that identity registry-scoped and unavailable
to runtime code using the documented `None` lifecycle setting. Authenticate and
authorize Deno-to-converter calls; internal ingress alone does not authorize them.
Transfer bounded bytes and results, not general storage credentials or shared
volumes. Keep processing within the initiating request; a separate service does
not require a durable queue or job system.

**Advantage:** Uses an established app boundary rather than a custom parser
sandbox to separate the main service's identity. Independent scaling can stop
conversion compute when unused.

**Limitations:** Adds another deployment, service-authentication path, failure
boundary, and potentially another cold start. A separate app with private ingress
is not an outbound network restriction: it can still transmit its current input
unless separate controls prevent that. Microsoft documents VNet/NSG/UDR/firewall
controls, but their exact topology, scope, platform exceptions, and cost require
design and verification. Do not claim internal ingress means no internet access.

**Before selection/release:** Verify absence of application identity access,
app-to-app authentication, network controls if required, two-app cold/warm latency,
source cleanup, and the full cost envelope. Do not attach the existing broadly
capable app identity to the converter as a shortcut.

## C. Use Azure Container Apps Sandboxes for conversion

The current Microsoft overview and linked product documentation describe a
managed sandbox product, distinct from ordinary sidecars, apps, jobs, and dynamic
sessions. The product documentation labels it generally available. Each sandbox
runs in an isolated microVM; custom container images are supported. An egress
proxy outside the sandbox can enforce a deny-default policy. Without a configured
policy, outbound access is unrestricted.

The service could use a prebuilt converter image in a fresh sandbox, pass one PDF
through the authenticated file data plane, execute the fixed converter, collect
bounded results, and delete the sandbox. The parser needs no storage/model
credentials, exposed application port, mounted project volume, or allowed outbound
destination. Deno's control-plane access must not be passed into the sandbox.
This can remain request-bound; no background job queue is implied.

**Advantage:** Managed microVM and outside-the-sandbox egress enforcement address
both identity separation and outbound containment without maintaining a custom
Linux syscall policy. The documented smallest tier is 0.25 CPU/0.5 GiB, consistent
with the proposed converter resource candidate, not proof it will fit.

**Limitations:** Adds a sandbox group, narrowly scoped management authorization,
image import, SDK/REST integration, and explicit lifecycle cleanup. Subscription
access, supported region/API, identity behavior, file-transfer limits, and actual
latency were not verified. Advertised sub-second startup applies to cached images,
not the complete upload/convert/download path.

CPU and memory use Consumption-style per-second billing. Custom images, snapshots,
and volumes introduce storage categories; the cost document marks storage billing
as forthcoming. Do not assume it will remain free or that ordinary app estimates
cover it. Stopping a sandbox can preserve a source-containing snapshot, so merely
stopping it is not acceptable source cleanup.

**Before selection/release:** Verify tenant/region availability and exact identity
and API contracts; configure deny-default egress before any input is processed;
test blocked internet, DNS/direct-IP and identity access. Verify PDF/result size
limits and request deadline, persistent/snapshot behavior, deletion including
failure recovery, and total compute/image/snapshot/storage cost. Use permission-
cleared synthetic documents; no paid provisioning/test is authorized by research.

## Choices that do not solve the runtime problem

* Converting in an init container cannot handle new documents arriving after
  startup. Identity lifecycle settings are not per-running-container isolation.
* A non-root user and a killable child constrain some failures but do not by
  themselves remove identity/network authority.
* Merely moving to a private second endpoint does not stop outbound exfiltration.
* Privileged nested-container or namespace assumptions are unsuitable without
  documented platform support; ordinary Container Apps prohibit privileged mode.

## Decision boundary

The owner has not chosen A, B, or C. Choosing a direction authorizes a design
revision, not deployment, spending, or sample transmission. Actual platform
validation remains necessary. The additive-instructions decision does not remove
the need to isolate processing of acquired PDFs.

## Sources

* [Container Apps managed identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity#control-managed-identity-availability): app identities and phase-based availability.
* [Containers in Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/containers): multiple-container lifecycle/network sharing, supported resource combinations, and privileged-container prohibition.
* [Secure Container Apps deployment](https://learn.microsoft.com/en-us/azure/container-apps/secure-deployment): service authentication and VNet/NSG/UDR/firewall controls.
* [Linux seccomp](https://docs.kernel.org/userspace-api/seccomp_filter.html): unprivileged filtering prerequisites, limitations, and syscall pitfalls.
* [Linux Landlock](https://docs.kernel.org/userspace-api/landlock.html): unprivileged filesystem/network restrictions and runtime ABI detection.
* [Microsoft Sandbox overview](https://learn.microsoft.com/en-us/azure/container-apps/sandboxes-overview): microVM boundary, custom images, management scope, file data plane, tiers, and lifecycle.
* [Sandbox product documentation](https://sandboxes.azure.com/docs/sandboxes): current GA label and SDK/REST entry points.
* [Sandbox egress policy](https://sandboxes.azure.com/docs/sandboxes/sandbox/egress): explicit deny-default policy; unrestricted outbound access without one.
* [Sandbox file transfer](https://sandboxes.azure.com/docs/sandboxes/sandbox/files): authenticated input/output operations; exact production size limits remain unverified.
* [Sandbox costs](https://sandboxes.azure.com/docs/sandboxes/cost): compute and stored images/snapshots/volumes, including forthcoming storage billing.

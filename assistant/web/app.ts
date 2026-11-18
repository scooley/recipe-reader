/// <reference lib="dom" />
/// <reference lib="dom.iterable" />
import {
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";
import type { PublicProject } from "../src/projects.ts";

function element<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`Missing page element: ${id}`);
  return found;
}
const status = element("status", HTMLParagraphElement);
const workspace = element("workspace", HTMLElement);
const choices = element("projects", HTMLSelectElement);
const progress = element("upload-progress", HTMLProgressElement);
let projects: PublicProject[] = [];
let activeId: string | undefined;
let retryDelete: { id: string; revision: number; title: string } | undefined;

function message(text: string, error = false): void {
  status.textContent = text;
  status.dataset.error = String(error);
}
async function run(action: () => Promise<void>): Promise<void> {
  const buttons = [...document.querySelectorAll("button")];
  buttons.forEach((button) => button.disabled = true);
  try {
    await action();
  } catch (error) {
    message(
      error instanceof Error
        ? error.message
        : "Request failed; refresh before retrying",
      true,
    );
  } finally {
    buttons.forEach((button) => button.disabled = false);
  }
}

await run(async () => {
  const configResponse = await fetch("/manage/config.json");
  if (!configResponse.ok) {
    throw new Error("Could not load sign-in configuration");
  }
  const config: {
    authority: string;
    clientId: string;
    scope: string;
    redirectUri: string;
  } = await configResponse.json();
  const client = new PublicClientApplication({
    auth: {
      clientId: config.clientId,
      authority: config.authority,
      redirectUri: config.redirectUri,
    },
    cache: { cacheLocation: "sessionStorage" },
  });
  await client.initialize();
  await client.handleRedirectPromise();
  async function token(): Promise<string> {
    const account = client.getAllAccounts()[0];
    if (!account) throw new Error("Sign in first");
    try {
      return (await client.acquireTokenSilent({
        account,
        scopes: [config.scope],
      })).accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) throw error;
      throw new Error(
        "Your sign-in needs renewal. Select Sign in with Microsoft again.",
      );
    }
  }
  async function result(response: Response): Promise<unknown> {
    const value = await response.json();
    if (!response.ok) {
      if (value.error?.code === "partial_deletion" && retryDelete) {
        retryDelete.revision = value.error.currentRevision;
      }
      throw new Error(
        `${
          value.error?.message ?? "Request failed"
        } (${response.status}). Refresh before retrying; do not assume the change was saved.`,
      );
    }
    return value;
  }
  async function api(path: string, body?: unknown): Promise<unknown> {
    return await result(
      await fetch(path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          authorization: `Bearer ${await token()}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }
  function chosen(): PublicProject {
    const project = projects.find((item) => item.id === choices.value);
    if (!project) throw new Error("Choose a project first");
    return project;
  }
  function details(): void {
    const project = projects.find((item) => item.id === choices.value);
    element("details", HTMLParagraphElement).textContent = project
      ? `${project.title} — ${project.status}; revision ${project.revision}; ${
        project.source?.available ? "source attached" : "no available source"
      }${
        project.id === activeId ? "; active for voice" : ""
      }. A source cannot be replaced; create a new project instead.`
      : "No projects. Create one to attach a source.";
  }
  async function refresh(preferred = choices.value): Promise<void> {
    const [listing, state] = await Promise.all([
      api("/v1/projects"),
      api("/v1/state"),
    ]);
    projects = (listing as { projects: PublicProject[] }).projects;
    activeId = (state as { activeProject: PublicProject | null }).activeProject
      ?.id;
    choices.replaceChildren(...projects.map((project) => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.title;
      return option;
    }));
    if (projects.some((project) => project.id === preferred)) {
      choices.value = preferred;
    }
    details();
  }
  function form(id: string, action: () => Promise<void>): void {
    element(id, HTMLFormElement).addEventListener("submit", (event) => {
      event.preventDefault();
      void run(action);
    });
  }
  element("signin", HTMLButtonElement).onclick = () =>
    void run(async () => {
      await client.loginPopup({ scopes: [config.scope] });
      workspace.hidden = false;
      element("signout", HTMLButtonElement).hidden = false;
      await refresh();
      message("Signed in. Choose or create a project.");
    });
  element("signout", HTMLButtonElement).onclick = () =>
    void run(async () => {
      await client.logoutPopup({ account: client.getAllAccounts()[0] });
      workspace.hidden = true;
      projects = [];
      choices.replaceChildren();
      element("signout", HTMLButtonElement).hidden = true;
      message("Signed out.");
    });
  choices.onchange = details;
  element("refresh", HTMLButtonElement).onclick = () =>
    void run(async () => {
      await refresh();
      message("Projects refreshed.");
    });
  element("select", HTMLButtonElement).onclick = () =>
    void run(async () => {
      await api(`/v1/projects/${chosen().id}/select`, {});
      await refresh();
      message("Active project saved. Start or resume LiveKit preview.");
    });
  form("create", async () => {
    const project = await api("/v1/projects", {
      title: element("title", HTMLInputElement).value,
    }) as PublicProject;
    await refresh(project.id);
    message("Project created. Attach a source, then select it for voice.");
  });
  form("url", async () => {
    const project = chosen();
    message("Fetching and checking webpage…");
    await api(`/v1/projects/${project.id}/source/url`, {
      expectedRevision: project.revision,
      url: element("page-url", HTMLInputElement).value,
    });
    await refresh();
    message(
      "Webpage text saved. Check it with synthetic content before private use.",
    );
  });
  form("pdf", async () => {
    const project = chosen();
    const file = element("file", HTMLInputElement).files?.[0];
    if (!file || file.size > 25 * 1024 * 1024) {
      throw new Error("Choose a PDF up to 25 MiB");
    }
    const bearer = await token();
    const data = new FormData();
    data.set("file", file);
    data.set("expectedRevision", String(project.revision));
    progress.hidden = false;
    progress.value = 0;
    message("Uploading PDF; extraction follows upload…");
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/v1/projects/${project.id}/source`);
        xhr.timeout = 120_000;
        xhr.setRequestHeader("authorization", `Bearer ${bearer}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            progress.value = event.loaded / event.total * 100;
          }
        };
        xhr.onload = () => {
          result(new Response(xhr.responseText, { status: xhr.status })).then(
            () => resolve(),
            reject,
          );
        };
        xhr.onerror = xhr.ontimeout = () =>
          reject(
            new Error("Upload outcome uncertain. Refresh before retrying."),
          );
        xhr.send(data);
      });
      await refresh();
      message("PDF text and source saved.");
    } finally {
      progress.hidden = true;
    }
  });
  form("delete", async () => {
    const project = retryDelete ?? chosen();
    const title = element("confirm-title", HTMLInputElement).value;
    if (title !== project.title) {
      throw new Error("Type the exact project title to confirm deletion");
    }
    retryDelete = {
      id: project.id,
      revision: project.revision,
      title: project.title,
    };
    await api(`/v1/projects/${project.id}/delete`, {
      expectedRevision: project.revision,
      confirmTitle: title,
    });
    retryDelete = undefined;
    element("confirm-title", HTMLInputElement).value = "";
    await refresh();
    message("Project and its sources deleted.");
  });
  if (client.getAllAccounts().length) {
    workspace.hidden = false;
    element("signout", HTMLButtonElement).hidden = false;
    await refresh();
    message("Choose a project to manage its source.");
  }
});

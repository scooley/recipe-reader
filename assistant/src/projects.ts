import { createHash } from "node:crypto";
import {
  HttpError,
  requireRevision,
  requireText,
  StorageConflict,
} from "./errors.ts";
import type { ObjectStore } from "./storage.ts";

export interface Progress {
  id: string;
  location: string;
  report: string;
  reportedAt: string;
}

export interface FollowUp {
  id: string;
  description: string;
  appliedAt?: string;
  report?: string;
}

export interface Modification {
  id: string;
  location: string;
  change: string;
  consequences: string[];
  followUps: FollowUp[];
  reportedAt: string;
}

export interface Source {
  kind: "pdf" | "web";
  label: string;
  url?: string;
  digest: string;
  checkedAt: string;
  textPath: string;
  pdfPath?: string;
  available: boolean;
}

export interface Project {
  schema: 1;
  id: string;
  title: string;
  status: "open" | "completed" | "deleting";
  revision: number;
  createdAt: string;
  updatedAt: string;
  progress: Progress[];
  modifications: Modification[];
  source?: Source;
}

export interface PublicProject {
  id: string;
  title: string;
  status: "open" | "completed";
  revision: number;
  createdAt: string;
  updatedAt: string;
  progress: Progress | null;
  progressHistory: Progress[];
  modifications: Modification[];
  source: {
    kind: "pdf" | "web";
    label: string;
    checkedAt: string;
    available: boolean;
  } | null;
}

export interface CheckedSource {
  kind: "pdf" | "web";
  label: string;
  url?: string;
  text: string;
  pdf?: Uint8Array;
}

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array): string =>
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);
const recordPath = (id: string): string => `projects/${id}/project.md`;
const sourcePrefix = (id: string): string => `projects/${id}/sources/`;
const activePath = "state/active-project.json";
const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function assertId(id: string): void {
  if (!uuidPattern.test(id)) {
    throw new HttpError(400, "invalid_input", "Invalid project ID");
  }
}

function publicProject(project: Project): PublicProject {
  return {
    id: project.id,
    title: project.title,
    status: project.status === "deleting" ? "completed" : project.status,
    revision: project.revision,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    progress: project.progress.at(-1) ?? null,
    progressHistory: project.progress,
    modifications: project.modifications,
    source: project.source
      ? {
        kind: project.source.kind,
        label: project.source.label,
        checkedAt: project.source.checkedAt,
        available: project.source.available,
      }
      : null,
  };
}

function markdown(project: Project): Uint8Array {
  const progress =
    project.progress.map((entry) =>
      `- ${entry.reportedAt} (${entry.location}): ${entry.report}`
    ).join("\n") || "_No progress reported._";
  const changes = project.modifications.map((entry) => {
    const consequences = entry.consequences.map((item) => `  - ${item}`).join(
      "\n",
    );
    const followUps = entry.followUps.map((item) =>
      `  - ${item.appliedAt ? "Applied" : "Pending"}: ${item.description}${
        item.report ? ` (${item.report})` : ""
      }`
    ).join("\n");
    return `- ${entry.reportedAt} (${entry.location}): ${entry.change}\n${consequences}\n${followUps}`;
  }).join("\n") || "_No modifications reported._";
  return encode(
    `---\n${JSON.stringify(project)}\n---\n\n# ${project.title}\n\n` +
      `## Progress\n${progress}\n\n## Modifications\n${changes}\n`,
  );
}

function parseRecord(bytes: Uint8Array): Project {
  try {
    const match = decode(bytes).match(/^---\n([^\n]+)\n---\n/);
    if (!match) throw new Error("Missing record header");
    const project: unknown = JSON.parse(match[1]);
    if (
      !project || typeof project !== "object" || !("schema" in project) ||
      project.schema !== 1 || !("id" in project) ||
      typeof project.id !== "string" ||
      !("revision" in project) || !Number.isSafeInteger(project.revision) ||
      !("status" in project) || !["open", "completed", "deleting"].includes(
        String(project.status),
      ) ||
      !("progress" in project) || !Array.isArray(project.progress) ||
      !("modifications" in project) || !Array.isArray(project.modifications)
    ) {
      throw new Error("Invalid record header");
    }
    return project as Project;
  } catch {
    throw new HttpError(
      503,
      "invalid_record",
      "Stored project record is invalid",
    );
  }
}

export class Projects {
  constructor(
    private readonly store: ObjectStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async load(id: string): Promise<{ project: Project; etag: string }> {
    assertId(id);
    const saved = await this.store.get(recordPath(id));
    if (!saved) throw new HttpError(404, "not_found", "Project not found");
    const project = parseRecord(saved.bytes);
    if (project.id !== id) {
      throw new HttpError(
        503,
        "invalid_record",
        "Stored project ID does not match",
      );
    }
    return { project, etag: saved.etag };
  }

  private checkRevision(project: Project, revision: unknown): void {
    if (requireRevision(revision) !== project.revision) {
      throw new HttpError(409, "revision_conflict", "Project has changed", {
        currentRevision: project.revision,
      });
    }
  }

  private async save(project: Project, etag: string): Promise<PublicProject> {
    const updated: Project = {
      ...project,
      revision: project.revision + 1,
      updatedAt: this.now().toISOString(),
    };
    try {
      await this.store.put(
        recordPath(project.id),
        markdown(updated),
        "text/markdown",
        {
          ifMatch: etag,
        },
      );
    } catch (error) {
      if (!(error instanceof StorageConflict)) throw error;
      const current = await this.load(project.id);
      throw new HttpError(409, "revision_conflict", "Project has changed", {
        currentRevision: current.project.revision,
      });
    }
    return publicProject(updated);
  }

  async create(titleInput: unknown): Promise<PublicProject> {
    const title = requireText(titleInput, "title", 120);
    if (/[\r\n]/.test(title)) {
      throw new HttpError(
        400,
        "invalid_input",
        "The title must be on one line",
      );
    }
    const timestamp = this.now().toISOString();
    const project: Project = {
      schema: 1,
      id: crypto.randomUUID(),
      title,
      status: "open",
      revision: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      progress: [],
      modifications: [],
    };
    await this.store.put(
      recordPath(project.id),
      markdown(project),
      "text/markdown",
      {
        ifNoneMatch: true,
      },
    );
    return publicProject(project);
  }

  async list(): Promise<PublicProject[]> {
    const paths = (await this.store.list("projects/")).filter((path) =>
      /^projects\/[0-9a-f-]{36}\/project\.md$/.test(path)
    );
    if (paths.length > 1000) {
      throw new HttpError(
        503,
        "too_many_projects",
        "Project listing exceeds the trial limit",
      );
    }
    const projects: PublicProject[] = [];
    for (const path of paths) {
      const saved = await this.store.get(path);
      if (!saved) continue;
      const project = parseRecord(saved.bytes);
      if (project.status !== "deleting") projects.push(publicProject(project));
    }
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async detail(id: string): Promise<PublicProject> {
    const { project } = await this.load(id);
    if (project.status === "deleting") {
      throw new HttpError(404, "not_found", "Project not found");
    }
    return publicProject(project);
  }

  private async active(): Promise<
    { id: string; etag: string } | null
  > {
    const saved = await this.store.get(activePath);
    if (!saved) return null;
    try {
      const parsed: unknown = JSON.parse(decode(saved.bytes));
      if (
        !parsed || typeof parsed !== "object" || !("id" in parsed) ||
        typeof parsed.id !== "string"
      ) throw new Error("Invalid pointer");
      assertId(parsed.id);
      return { id: parsed.id, etag: saved.etag };
    } catch {
      throw new HttpError(
        503,
        "invalid_record",
        "Active-project pointer is invalid",
      );
    }
  }

  async state(): Promise<{ activeProject: PublicProject | null }> {
    const pointer = await this.active();
    if (!pointer) return { activeProject: null };
    const { project } = await this.load(pointer.id);
    if (project.status !== "open") {
      throw new HttpError(
        503,
        "inconsistent_state",
        "Active project is unavailable",
      );
    }
    return { activeProject: publicProject(project) };
  }

  async requireActive(id: string): Promise<void> {
    assertId(id);
    if ((await this.active())?.id !== id) {
      throw new HttpError(
        409,
        "not_selected",
        "Select this project before using voice tools",
      );
    }
  }

  async select(id: string): Promise<{ activeProject: PublicProject }> {
    const { project } = await this.load(id);
    if (project.status !== "open") {
      throw new HttpError(
        409,
        "project_closed",
        "Cannot select a completed project",
      );
    }
    const current = await this.active();
    try {
      await this.store.put(
        activePath,
        encode(JSON.stringify({ id })),
        "application/json",
        current ? { ifMatch: current.etag } : { ifNoneMatch: true },
      );
    } catch (error) {
      if (error instanceof StorageConflict) {
        throw new HttpError(
          409,
          "selection_conflict",
          "Active project changed; retry selection",
        );
      }
      throw error;
    }
    return { activeProject: publicProject(project) };
  }

  private async clearIfActive(id: string): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await this.active();
      if (!current || current.id !== id) return;
      try {
        await this.store.remove(activePath, current.etag);
        return;
      } catch (error) {
        if (!(error instanceof StorageConflict)) throw error;
      }
    }
    throw new StorageConflict("Active-project pointer changed repeatedly");
  }

  async reportProgress(
    id: string,
    revision: unknown,
    locationInput: unknown,
    reportInput: unknown,
  ): Promise<PublicProject> {
    const { project, etag } = await this.load(id);
    this.checkRevision(project, revision);
    if (project.status !== "open") {
      throw new HttpError(409, "project_closed", "Project is not open");
    }
    const entry: Progress = {
      id: crypto.randomUUID(),
      location: requireText(locationInput, "location", 200),
      report: requireText(reportInput, "report", 2000),
      reportedAt: this.now().toISOString(),
    };
    return await this.save({
      ...project,
      progress: [...project.progress, entry],
    }, etag);
  }

  async reportModification(
    id: string,
    revision: unknown,
    input: Record<string, unknown>,
  ): Promise<PublicProject> {
    const { project, etag } = await this.load(id);
    this.checkRevision(project, revision);
    if (project.status !== "open") {
      throw new HttpError(409, "project_closed", "Project is not open");
    }
    const strings = (value: unknown, field: string): string[] => {
      if (!Array.isArray(value) || value.length > 20) {
        throw new HttpError(
          400,
          "invalid_input",
          `${field} must be an array of up to 20 items`,
        );
      }
      return value.map((item) => requireText(item, field, 500));
    };
    const entry: Modification = {
      id: crypto.randomUUID(),
      location: requireText(input.location, "location", 200),
      change: requireText(input.change, "change", 2000),
      consequences: strings(input.consequences, "consequences"),
      followUps: strings(input.pendingFollowUps, "pendingFollowUps").map(
        (description) => ({ id: crypto.randomUUID(), description }),
      ),
      reportedAt: this.now().toISOString(),
    };
    return await this.save({
      ...project,
      modifications: [...project.modifications, entry],
    }, etag);
  }

  async applyFollowUp(
    id: string,
    followUpId: string,
    revision: unknown,
    reportInput: unknown,
  ): Promise<PublicProject> {
    assertId(followUpId);
    const { project, etag } = await this.load(id);
    this.checkRevision(project, revision);
    if (project.status !== "open") {
      throw new HttpError(409, "project_closed", "Project is not open");
    }
    const report = requireText(reportInput, "report", 1000);
    let found = false;
    const modifications = project.modifications.map((entry) => ({
      ...entry,
      followUps: entry.followUps.map((item) => {
        if (item.id !== followUpId) return item;
        if (item.appliedAt) {
          throw new HttpError(
            409,
            "already_applied",
            "Follow-up is already applied",
          );
        }
        found = true;
        return { ...item, appliedAt: this.now().toISOString(), report };
      }),
    }));
    if (!found) throw new HttpError(404, "not_found", "Follow-up not found");
    return await this.save({ ...project, modifications }, etag);
  }

  async attach(
    id: string,
    revision: unknown,
    checked: CheckedSource,
  ): Promise<PublicProject> {
    const { project, etag } = await this.load(id);
    this.checkRevision(project, revision);
    if (project.status !== "open" || project.source) {
      throw new HttpError(
        409,
        "source_exists",
        "Use a new project for a different source",
      );
    }
    if (!checked.text.trim() || checked.text.length > 100_000) {
      throw new HttpError(
        422,
        "unusable_source",
        "Source text is empty or too large for this trial",
      );
    }

    const path = `${sourcePrefix(id)}${crypto.randomUUID()}`;
    const textPath = `${path}/source.txt`;
    const pdfPath = checked.pdf ? `${path}/source.pdf` : undefined;
    const bytes = encode(checked.text);
    const digest = createHash("sha256").update(bytes).digest("hex");
    const source: Source = {
      kind: checked.kind,
      label: checked.label,
      url: checked.url,
      digest,
      checkedAt: this.now().toISOString(),
      textPath,
      pdfPath,
      available: true,
    };
    try {
      if (checked.pdf && pdfPath) {
        await this.store.put(pdfPath, checked.pdf, "application/pdf", {
          ifNoneMatch: true,
        });
      }
      await this.store.put(textPath, bytes, "text/plain; charset=utf-8", {
        ifNoneMatch: true,
      });
      return await this.save({ ...project, source }, etag);
    } catch (error) {
      let current: Project;
      try {
        current = (await this.load(id)).project;
      } catch {
        throw new HttpError(
          502,
          "source_save_uncertain",
          "Could not verify the source save; refresh before retrying. Staged content may remain until project cleanup.",
        );
      }
      if (current.source?.textPath === textPath) {
        return publicProject(current);
      }
      try {
        await this.store.remove(textPath);
        if (pdfPath) await this.store.remove(pdfPath);
      } catch {
        throw new HttpError(
          502,
          "partial_source_upload",
          "Source save failed and staged source cleanup also failed",
        );
      }
      throw error;
    }
  }

  async sourceText(id: string): Promise<{ text: string; revision: number }> {
    const { project } = await this.load(id);
    if (project.status !== "open" || !project.source?.available) {
      throw new HttpError(404, "not_found", "No usable source is attached");
    }
    const stored = await this.store.get(project.source.textPath);
    if (!stored) {
      throw new HttpError(
        503,
        "missing_source",
        "Stored source text is missing",
      );
    }
    return { text: decode(stored.bytes), revision: project.revision };
  }

  async requireAttachable(id: string, revision: unknown): Promise<void> {
    const { project } = await this.load(id);
    this.checkRevision(project, revision);
    if (project.status !== "open" || project.source) {
      throw new HttpError(
        409,
        "source_exists",
        "Use a new project for a different source",
      );
    }
  }

  private async removeSources(id: string): Promise<void> {
    for (const path of await this.store.list(sourcePrefix(id))) {
      await this.store.remove(path);
    }
  }

  async complete(id: string, revision: unknown): Promise<PublicProject> {
    const { project, etag } = await this.load(id);
    this.checkRevision(project, revision);
    if (project.status === "deleting") {
      throw new HttpError(409, "project_deleting", "Project is being deleted");
    }
    const result = project.status === "completed"
      ? publicProject(project)
      : await this.save({
        ...project,
        status: "completed",
        source: project.source
          ? { ...project.source, available: false }
          : undefined,
      }, etag);
    let sourceDeleted = false;
    try {
      await this.removeSources(id);
      sourceDeleted = true;
      await this.clearIfActive(id);
    } catch {
      throw new HttpError(
        502,
        "partial_completion",
        "Completion was saved, but source cleanup or active selection failed; retry completion",
        { saved: true, sourceDeleted, currentRevision: result.revision },
      );
    }
    return result;
  }

  async delete(
    id: string,
    revision: unknown,
    confirmTitle: unknown,
  ): Promise<{ deleted: true }> {
    const { project, etag } = await this.load(id);
    this.checkRevision(project, revision);
    if (confirmTitle !== project.title) {
      throw new HttpError(
        400,
        "title_mismatch",
        "Type the exact project title to delete it",
      );
    }
    let saved = etag;
    if (project.status !== "deleting") {
      try {
        saved = await this.store.put(
          recordPath(id),
          markdown({
            ...project,
            status: "deleting",
            revision: project.revision + 1,
            updatedAt: this.now().toISOString(),
          }),
          "text/markdown",
          { ifMatch: etag },
        );
      } catch (error) {
        if (!(error instanceof StorageConflict)) throw error;
        const latest = await this.load(id);
        throw new HttpError(409, "revision_conflict", "Project has changed", {
          currentRevision: latest.project.revision,
        });
      }
    }
    try {
      await this.removeSources(id);
      await this.clearIfActive(id);
      await this.store.remove(recordPath(id), saved);
    } catch {
      throw new HttpError(
        502,
        "partial_deletion",
        "Project deletion started but did not finish; retry with the current revision",
        {
          deleted: false,
          currentRevision: project.status === "deleting"
            ? project.revision
            : project.revision + 1,
        },
      );
    }
    return { deleted: true };
  }
}

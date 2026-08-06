"use client";

import {
  buildBookProjectFromCanonicalPayload,
  mergeSavedProjectIntoCanonicalPayload,
  type CanonicalBookPayload,
  type CanonicalPublicationStatus,
  type CanonicalPublicationVisibility,
} from "@/lib/canonicalBook";
import type { BookProject } from "@/lib/bookProject";
import {
  assertBookCreationAvailable,
  getBook,
  isPersistedBookId,
  saveBook,
  updatePublication,
  type CloudBookRecord,
} from "@/lib/bookRepository";
import { uploadBookProjectAssets } from "@/lib/bookAssetStorage";
import { saveCanonicalPreview } from "@/lib/canonicalPreviewStorage";
import { logSupabaseIssue } from "@/lib/supabaseDebug";

export type SavedBookResult = {
  bookId: string;
  revision: number;
  project: CanonicalBookPayload;
  updatedAt: string;
};

export type PublishedBookResult = SavedBookResult & {
  publicUrl: string;
};

export class CanonicalBookCommandError extends Error {
  fieldErrors?: Record<string, string>;

  constructor(message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "CanonicalBookCommandError";
    this.fieldErrors = fieldErrors;
  }
}

function projectWithoutAssets(project: BookProject): BookProject {
  return {
    ...project,
    config: {
      ...project.config,
      coverImage: undefined,
      coverImageUrl: undefined,
    },
    images: [],
    contentBlocks: project.contentBlocks?.map((block) =>
      block.type === "image"
        ? {
            ...block,
            storagePath: "",
            publicUrl: undefined,
            uploadState: "ready",
          }
        : block,
    ),
  };
}

function validationError(errors: Record<string, string>) {
  return new CanonicalBookCommandError("Canonical payload validation failed", errors);
}

function revisionFromUpdatedAt(updatedAt: string) {
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function logCommandFailure(operation: string, error: unknown, payload: CanonicalBookPayload) {
  logSupabaseIssue({
    processingName: operation,
    target: "books / book_images / book_external_links / book-assets",
    error,
    context: {
      operation,
      bookId: payload.bookId || null,
      slug: payload.slug || null,
      storageResult: "unknown",
      booksResult: "unknown",
      bookImagesResult: "unknown",
    },
  });
}

function mergeSavedPayload(
  payload: CanonicalBookPayload,
  record: CloudBookRecord,
): CanonicalBookPayload {
  return mergeSavedProjectIntoCanonicalPayload(payload, record.bookProject, {
    id: record.id,
    slug: record.slug,
    status: record.status,
    visibility: record.visibility,
  });
}

/**
 * The only save entry point used by the editor. It accepts CanonicalPayload,
 * converts it to the legacy BookProject adapter internally, and returns the
 * persisted canonical snapshot.
 */
export async function saveCanonicalBookCommand(
  payload: CanonicalBookPayload,
  ownerId: string,
): Promise<SavedBookResult> {
  const build = buildBookProjectFromCanonicalPayload(payload);
  if (!build.ok) throw validationError(build.errors);

  const project = build.project;
  const existingId = payload.bookId && isPersistedBookId(payload.bookId) ? payload.bookId : undefined;

  try {
    let record: CloudBookRecord;

    if (!existingId) {
      // This check intentionally happens before the first books write and
      // before any Storage upload. saveBook repeats the guard defensively.
      await assertBookCreationAvailable(ownerId);
      const baseRecord = await saveBook(
        projectWithoutAssets(project),
        ownerId,
        undefined,
        payload.slug || undefined,
        { skipSideTables: true },
      );
      const projectForUpload: BookProject = {
        ...project,
        config: { ...project.config, bookId: baseRecord.id },
      };
      const projectWithAssets = await uploadBookProjectAssets(projectForUpload, ownerId);
      record = await saveBook(
        projectWithAssets,
        ownerId,
        baseRecord.id,
        payload.slug || baseRecord.slug,
      );
    } else {
      const existing = await getBook(existingId, ownerId);
      if (!existing) throw new CanonicalBookCommandError("The requested book was not found");
      const projectForUpload: BookProject = {
        ...project,
        config: { ...project.config, bookId: existingId },
      };
      const projectWithAssets = await uploadBookProjectAssets(projectForUpload, ownerId);
      record = await saveBook(projectWithAssets, ownerId, existingId, payload.slug || undefined);
    }

    const savedPayload = mergeSavedPayload(payload, record);
    return {
      bookId: record.id,
      revision: revisionFromUpdatedAt(record.updatedAt),
      project: savedPayload,
      updatedAt: record.updatedAt,
    };
  } catch (error) {
    logCommandFailure("saveCanonicalBookCommand", error, payload);
    throw error;
  }
}

export async function previewCanonicalBookCommand(payload: CanonicalBookPayload) {
  const preview = await saveCanonicalPreview(payload);
  if (!preview.ok) throw validationError(preview.errors);
  return {
    project: payload,
    bookProject: preview.project,
    previewId: preview.previewId,
  };
}

export async function publishBookCommand(input: {
  bookId: string;
  ownerId: string;
  revision: number;
  slug: string;
  visibility: CanonicalPublicationVisibility;
}) {
  void input.revision;
  const slug = input.slug.trim();
  if (!slug) throw new CanonicalBookCommandError("公開URLを入力してください。");
  const nextVisibility: CanonicalPublicationVisibility =
    input.visibility === "private" ? "unlisted" : input.visibility;
  return updatePublication(input.bookId, input.ownerId, {
    status: "published",
    visibility: nextVisibility,
    slug,
  });
}

/** Save the latest canonical payload, then publish exactly that saved revision. */
export async function publishCanonicalBookCommand(
  payload: CanonicalBookPayload,
  ownerId: string,
): Promise<PublishedBookResult> {
  let saved: SavedBookResult;
  try {
    saved = await saveCanonicalBookCommand(payload, ownerId);
  } catch (error) {
    logCommandFailure("publishCanonicalBookCommand.save", error, payload);
    throw new CanonicalBookCommandError("保存に失敗したため公開できませんでした。");
  }

  try {
    const record = await publishBookCommand({
      bookId: saved.bookId,
      ownerId,
      revision: saved.revision,
      slug: saved.project.slug,
      visibility: saved.project.publication.visibility,
    });
    const publishedProject: CanonicalBookPayload = {
      ...saved.project,
      slug: record.slug,
      publication: {
        status: record.status as CanonicalPublicationStatus,
        visibility: record.visibility as CanonicalPublicationVisibility,
      },
    };
    return {
      ...saved,
      project: publishedProject,
      updatedAt: record.updatedAt,
      publicUrl: `/books/${record.slug}`,
    };
  } catch (error) {
    logCommandFailure("publishCanonicalBookCommand.publish", error, saved.project);
    throw new CanonicalBookCommandError("公開に失敗しました。");
  }
}

import { getSession } from "./authService.js";
import { restRequest, storageSignedUrl, storageUpload } from "./supabaseAppClient.js";

const DEFAULT_BUCKET = "project-evidence";
const text = (value) => String(value || "").trim();
const newId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function cleanFileName(name = "archivo") {
  return text(name)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "archivo";
}

function buildPath({ companyId, entityType, entityId, fileName }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return [
    encodeURIComponent(companyId),
    encodeURIComponent(entityType),
    encodeURIComponent(entityId),
    `${stamp}-${cleanFileName(fileName)}`,
  ].join("/");
}

export async function uploadAttachment(entityType, entityId, file, metadata = {}) {
  const session = getSession();
  const companyId = session?.companyId || metadata.companyId;
  if (!companyId) throw new Error("No hay empresa activa para subir adjunto.");
  if (!entityType || !entityId) throw new Error("Falta entidad para asociar adjunto.");
  if (!file) throw new Error("Falta archivo para subir.");

  const bucket = metadata.bucket || DEFAULT_BUCKET;
  const storagePath = metadata.storagePath || buildPath({ companyId, entityType, entityId, fileName: file.name });
  await storageUpload(bucket, storagePath, file, { contentType: file.type });

  const rows = await restRequest("/attachments?on_conflict=id", {
    method: "POST",
    body: [{
      id: metadata.id || newId("attachment"),
      company_id: companyId,
      entity_type: entityType,
      entity_id: entityId,
      bucket,
      storage_path: storagePath,
      file_name: file.name || metadata.fileName || "",
      mime_type: file.type || metadata.mimeType || "",
      file_size: file.size || metadata.fileSize || null,
      document_type: metadata.documentType || "evidencia",
      uploaded_by: session?.userId || null,
      metadata,
    }],
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function listAttachments(entityType, entityId) {
  if (!entityType || !entityId) return [];
  const query = `/attachments?entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&deleted_at=is.null&select=*&order=created_at.desc`;
  const rows = await restRequest(query);
  return Array.isArray(rows) ? rows : [];
}

export async function getAttachmentSignedUrl(attachment, expiresIn = 3600) {
  if (!attachment?.bucket || !attachment?.storage_path) return null;
  return storageSignedUrl(attachment.bucket, attachment.storage_path, { expiresIn });
}

export async function softDeleteAttachment(id, reason = "") {
  const session = getSession();
  const rows = await restRequest(`/attachments?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: {
      deleted_at: new Date().toISOString(),
      deleted_by: session?.userId || null,
      delete_reason: reason,
    },
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

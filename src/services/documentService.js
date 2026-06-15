import { getSession } from "./authService.js";
import { restRequest } from "./supabaseAppClient.js";

const newId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function listDocumentTemplates(documentType = "cotizacion") {
  const query = `/document_templates?document_type=eq.${encodeURIComponent(documentType)}&status=eq.Activo&select=*&order=name.asc`;
  const rows = await restRequest(query);
  return Array.isArray(rows) ? rows : [];
}

export async function createGeneratedDocument({ entityType, entityId, documentType = "cotizacion", templateId, attachmentId, status = "Borrador", metadata = {} }) {
  const session = getSession();
  if (!session?.companyId) throw new Error("No hay empresa activa para generar documento.");
  const rows = await restRequest("/generated_documents?on_conflict=id", {
    method: "POST",
    body: [{
      id: metadata.id || newId("doc"),
      company_id: session.companyId,
      template_id: templateId || null,
      attachment_id: attachmentId || null,
      entity_type: entityType,
      entity_id: entityId,
      document_type: documentType,
      status,
      generated_by: session.userId || null,
      generated_at: new Date().toISOString(),
      metadata,
    }],
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function createDocumentVersion(generatedDocumentId, { contentHtml = "", attachmentId, versionNumber, metadata = {} } = {}) {
  const session = getSession();
  if (!session?.companyId) throw new Error("No hay empresa activa para versionar documento.");
  const rows = await restRequest("/document_versions?on_conflict=id", {
    method: "POST",
    body: [{
      id: metadata.id || newId("doc-version"),
      company_id: session.companyId,
      generated_document_id: generatedDocumentId,
      version_number: versionNumber || 1,
      attachment_id: attachmentId || null,
      content_html: contentHtml,
      created_by: session.userId || null,
      metadata,
    }],
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function generateQuoteDocument(quoteId, templateId, metadata = {}) {
  return createGeneratedDocument({
    entityType: "quote",
    entityId: quoteId,
    documentType: "cotizacion",
    templateId,
    metadata,
  });
}

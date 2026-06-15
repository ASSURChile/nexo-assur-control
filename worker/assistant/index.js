const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_ORIGIN = "https://assur-control.pages.dev";

const ROLE_LIMITS = {
  admin: 50,
  gerencia: 50,
  operaciones: 30,
  finanzas: 30,
  jefe_comercial: 30,
  comercial: 15,
  tecnico: 15,
  almacen: 15,
  viewer: 15,
  administrativo_operaciones: 30,
  supervisor: 20,
  monitoreo: 20,
};

const ROLE_NAMES = {
  admin: "Administrador",
  gerencia: "Gerencia",
  comercial: "Comercial",
  jefe_comercial: "Jefe Comercial",
  operaciones: "Operaciones",
  administrativo_operaciones: "Administrativo Operaciones",
  supervisor: "Supervisor",
  tecnico: "Tecnico",
  monitoreo: "Monitoreo",
  finanzas: "Finanzas",
  almacen: "Almacen",
  viewer: "Visualizacion",
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = String(env.ALLOWED_ORIGIN || DEFAULT_ORIGIN)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ? origin
    : allowed[0] || DEFAULT_ORIGIN;
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS, GET",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function normalizeRole(role = "viewer") {
  const clean = String(role || "viewer")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const map = {
    administrador: "admin",
    admin: "admin",
    gerente: "gerencia",
    gerencia: "gerencia",
    comercial: "comercial",
    ventas: "comercial",
    ejecutivo: "comercial",
    jefe_comercial: "jefe_comercial",
    operaciones: "operaciones",
    ops: "operaciones",
    administrativo_operaciones: "administrativo_operaciones",
    supervisor: "supervisor",
    tecnico: "tecnico",
    monitoreo: "monitoreo",
    finanzas: "finanzas",
    almacen: "almacen",
    bodega: "almacen",
    viewer: "viewer",
    lectura: "viewer",
  };
  return map[clean] || clean || "viewer";
}

function assertEnv(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new HttpError(500, "Asistente no configurado: faltan variables Supabase.");
  }
}

class HttpError extends Error {
  constructor(status, message, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function parseSupabaseResponse(response, path) {
  const text = await response.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || data?.error || response.statusText;
    throw new HttpError(response.status, `${path}: ${message}`, data);
  }
  return data;
}

async function supabaseFetch(env, token, path, { method = "GET", body, prefer = "return=representation" } = {}) {
  assertEnv(env);
  const response = await fetch(`${String(env.SUPABASE_URL).replace(/\/+$/, "")}${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token || env.SUPABASE_ANON_KEY}`,
      "content-type": "application/json",
      ...(prefer ? { prefer } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  return parseSupabaseResponse(response, path);
}

function restPath(table, query = "") {
  return `/rest/v1/${table}${query ? `?${query}` : ""}`;
}

function selectLimit(fields = "*", limit = 50, extra = "") {
  const params = [`select=${encodeURIComponent(fields)}`, `limit=${limit}`];
  if (extra) params.push(extra);
  return params.join("&");
}

async function getAuthUser(env, token) {
  const data = await supabaseFetch(env, token, "/auth/v1/user", { prefer: null });
  if (!data?.id) throw new HttpError(401, "Sesion Supabase invalida.");
  return data;
}

async function getProfile(env, token, authUser) {
  const rows = await supabaseFetch(
    env,
    token,
    restPath("profiles", `id=eq.${encodeURIComponent(authUser.id)}&select=*`)
  );
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile || profile.active === false) throw new HttpError(403, "Usuario sin perfil activo.");
  return profile;
}

async function getEffectivePermissions(env, token, profile) {
  const role = normalizeRole(profile.role);
  if (role === "admin") return { role, modules: ["*"], matrix: { "*": { ver: true } } };
  const matrix = {};

  try {
    const roles = await supabaseFetch(
      env,
      token,
      restPath("roles", `code=eq.${encodeURIComponent(role)}&select=id,code&limit=1`)
    );
    const roleId = Array.isArray(roles) ? roles[0]?.id : null;
    if (roleId) {
      const rows = await supabaseFetch(
        env,
        token,
        restPath("role_permissions", `role_id=eq.${encodeURIComponent(roleId)}&allowed=eq.true&select=module_id,action,allowed&limit=500`)
      );
      for (const row of rows || []) {
        if (!matrix[row.module_id]) matrix[row.module_id] = {};
        matrix[row.module_id][row.action || "ver"] = row.allowed !== false;
      }
    }

    const overrides = await supabaseFetch(
      env,
      token,
      restPath("profile_permissions", `profile_id=eq.${encodeURIComponent(profile.id)}&select=module_id,action,allowed&limit=500`)
    );
    for (const row of overrides || []) {
      if (!matrix[row.module_id]) matrix[row.module_id] = {};
      matrix[row.module_id][row.action || "ver"] = row.allowed !== false;
    }
  } catch {
    matrix.dashboard = { ver: true };
    matrix.assistant = { ver: true };
  }

  matrix.assistant = { ...(matrix.assistant || {}), ver: true };
  if (role === "tecnico") matrix.mobile = { ver: true };
  return { role, modules: Object.keys(matrix).filter((key) => matrix[key]?.ver !== false), matrix };
}

function can(perms, moduleId, action = "ver") {
  if (perms.role === "admin") return true;
  const value = perms.matrix?.[moduleId];
  if (!value) return false;
  if (action === "ver") return value.ver !== false;
  return value[action] === true;
}

async function safeRest(env, token, table, query, fallback = []) {
  try {
    return await supabaseFetch(env, token, restPath(table, query));
  } catch {
    return fallback;
  }
}

function money(value) {
  return Number(value || 0).toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
}

function sum(rows, fields) {
  return (rows || []).reduce((total, row) => {
    for (const field of fields) {
      if (row?.[field] != null && Number.isFinite(Number(row[field]))) return total + Number(row[field]);
    }
    return total;
  }, 0);
}

function countBy(rows, field) {
  return (rows || []).reduce((acc, row) => {
    const key = row?.[field] || "Sin estado";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function safeText(value) {
  return String(value || "").slice(0, 180);
}

async function getDailySummary(ctx) {
  const { env, token, profile, perms } = ctx;
  const data = { scope: ROLE_NAMES[perms.role] || perms.role };

  if (can(perms, "proyectos") || can(perms, "dashboard") || can(perms, "supervisor")) {
    const projects = await safeRest(env, token, "projects", selectLimit("id,name,status,progress,client_id,site_id,expected_end_date,net_sale_amount,updated_at", 80, "order=updated_at.desc"));
    data.projects = {
      total: projects.length,
      byStatus: countBy(projects, "status"),
      active: projects.filter((p) => !["Cerrado", "Cerrado tecnico", "Cerrado técnico"].includes(p.status)).slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress || 0,
      })),
    };
  }

  if (can(perms, "solicitudes_cotizacion") || can(perms, "bandeja_cotizaciones") || can(perms, "cotizaciones") || can(perms, "propuestas")) {
    const opportunities = await safeRest(env, token, "opportunities", selectLimit("id,name,status,estimated_amount,probability,owner_id,next_action_date,updated_at", 60, "order=updated_at.desc"));
    const proposals = await safeRest(env, token, "proposals", selectLimit("id,name,status,total_amount,client_id,updated_at", 60, "order=updated_at.desc"));
    data.commercial = {
      opportunities: opportunities.length,
      pipeline: money(sum(opportunities, ["estimated_amount", "amount"])),
      proposals: proposals.length,
      proposalsByStatus: countBy(proposals, "status"),
    };
  }

  if (can(perms, "servicios")) {
    const services = await safeRest(env, token, "recurring_services", selectLimit("id,name,status,monthly_value,client_id,site_id,updated_at", 80, "order=updated_at.desc"));
    data.recurringServices = {
      total: services.length,
      activeMrr: money(sum(services.filter((item) => /activo/i.test(item.status || "")), ["monthly_value", "monthly_fee", "value"])),
      byStatus: countBy(services, "status"),
    };
  }

  if (can(perms, "finanzas") || can(perms, "hitos")) {
    Object.assign(data, await getFinanceSummary(ctx, true));
  }

  if (perms.role === "tecnico") {
    Object.assign(data, await getTechnicianDay(ctx, true));
  }

  return data;
}

async function getProjectStatus(ctx) {
  const { env, token, body, perms, profile } = ctx;
  if (!can(perms, "proyectos") && !can(perms, "supervisor") && perms.role !== "tecnico") {
    return { restricted: true, message: "Tu rol no tiene acceso al detalle de proyectos." };
  }
  const term = encodeURIComponent(`*${String(body.query || body.message || "").slice(0, 80)}*`);
  const projectRows = await safeRest(
    env,
    token,
    "projects",
    `or=(name.ilike.${term},description.ilike.${term})&${selectLimit("id,name,status,progress,client_id,site_id,expected_end_date,updated_at", 8, "order=updated_at.desc")}`
  );
  const project = projectRows?.[0];
  if (!project) return { projectsFound: 0, message: "No encontre un proyecto asociado a esa consulta." };

  let taskQuery = `project_id=eq.${encodeURIComponent(project.id)}&${selectLimit("id,title,status,assigned_to,due_date,updated_at", 40, "order=updated_at.desc")}`;
  if (perms.role === "tecnico") {
    const linked = [profile.id, profile.technician_id].filter(Boolean).map(encodeURIComponent).join(",");
    if (linked) taskQuery += `&assigned_to=in.(${linked})`;
  }
  const tasks = await safeRest(env, token, "project_tasks", taskQuery);
  const incidents = await safeRest(env, token, "incidents", `project_id=eq.${encodeURIComponent(project.id)}&${selectLimit("id,title,status,severity,created_at", 20, "order=created_at.desc")}`);
  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      progress: project.progress || 0,
      expectedEndDate: project.expected_end_date,
      updatedAt: project.updated_at,
    },
    tasks: { total: tasks.length, byStatus: countBy(tasks, "status"), latest: tasks.slice(0, 5).map((t) => ({ title: t.title, status: t.status, dueDate: t.due_date })) },
    incidents: { total: incidents.length, latest: incidents.slice(0, 3).map((i) => ({ title: i.title, status: i.status, severity: i.severity })) },
  };
}

async function getQuotePipeline(ctx) {
  const { env, token, perms } = ctx;
  if (!can(perms, "pipeline") && !can(perms, "solicitudes_cotizacion") && !can(perms, "bandeja_cotizaciones") && !can(perms, "cotizaciones") && !can(perms, "propuestas")) {
    return { restricted: true, message: "Tu rol no tiene acceso al pipeline o cotizaciones." };
  }
  const opportunities = await safeRest(env, token, "opportunities", selectLimit("id,name,status,estimated_amount,probability,next_action_date,updated_at", 80, "order=updated_at.desc"));
  const quotes = await safeRest(env, token, "quotes", selectLimit("id,name,status,total_amount,net_total,updated_at", 80, "order=updated_at.desc"));
  const proposals = await safeRest(env, token, "proposals", selectLimit("id,name,status,total_amount,updated_at", 80, "order=updated_at.desc"));
  return {
    opportunities: {
      total: opportunities.length,
      pipeline: money(sum(opportunities, ["estimated_amount", "amount"])),
      byStatus: countBy(opportunities, "status"),
    },
    quotes: { total: quotes.length, byStatus: countBy(quotes, "status"), amount: money(sum(quotes, ["net_total", "total_amount"])) },
    proposals: { total: proposals.length, byStatus: countBy(proposals, "status"), amount: money(sum(proposals, ["total_amount", "net_total"])) },
  };
}

async function getFinanceSummary(ctx, embedded = false) {
  const { env, token, perms } = ctx;
  if (!can(perms, "finanzas") && !can(perms, "hitos") && !["admin", "gerencia"].includes(perms.role)) {
    return { finance: { restricted: true, message: "Tu rol no tiene acceso a informacion financiera sensible." } };
  }
  const invoices = await safeRest(env, token, "invoices", selectLimit("id,status,total_amount,balance,due_date,issued_at,client_id,project_id", 100, "order=due_date.asc"));
  const payments = await safeRest(env, token, "payments", selectLimit("id,amount,paid_at,invoice_id,status", 100, "order=paid_at.desc"));
  const payables = await safeRest(env, token, "accounts_payable", selectLimit("id,status,total_amount,balance,due_date,supplier_name,project_id", 100, "order=due_date.asc"));
  const now = new Date();
  const overdueInvoices = invoices.filter((item) => item.due_date && new Date(item.due_date) < now && !/pagad|cobrad/i.test(item.status || ""));
  const overduePayables = payables.filter((item) => item.due_date && new Date(item.due_date) < now && !/pagad/i.test(item.status || ""));
  const finance = {
    invoices: invoices.length,
    cxc: money(sum(invoices, ["balance", "total_amount"])),
    overdueCxc: money(sum(overdueInvoices, ["balance", "total_amount"])),
    payments: money(sum(payments, ["amount"])),
    cxp: money(sum(payables, ["balance", "total_amount"])),
    overdueCxp: money(sum(overduePayables, ["balance", "total_amount"])),
    overdueInvoices: overdueInvoices.slice(0, 5).map((item) => ({ id: item.id, status: item.status, dueDate: item.due_date, balance: money(item.balance || item.total_amount) })),
  };
  return embedded ? { finance } : finance;
}

async function getTechnicianDay(ctx, embedded = false) {
  const { env, token, profile, perms } = ctx;
  if (perms.role !== "tecnico" && !can(perms, "proyectos") && !can(perms, "supervisor")) {
    return { technicianDay: { restricted: true, message: "Tu rol no tiene acceso a jornada tecnica." } };
  }
  const linked = [profile.id, profile.technician_id].filter(Boolean).map(encodeURIComponent);
  const assignedFilter = linked.length ? `assigned_to=in.(${linked.join(",")})&` : "";
  const tasks = await safeRest(env, token, "project_tasks", `${assignedFilter}${selectLimit("id,title,status,project_id,due_date,updated_at", 80, "order=due_date.asc")}`);
  const today = new Date().toISOString().slice(0, 10);
  const todays = tasks.filter((task) => !task.due_date || String(task.due_date).slice(0, 10) <= today);
  const technicianDay = {
    assignedTasks: tasks.length,
    dueToday: todays.length,
    byStatus: countBy(tasks, "status"),
    nextTasks: todays.slice(0, 6).map((task) => ({
      title: safeText(task.title),
      status: task.status,
      dueDate: task.due_date,
      projectId: task.project_id,
    })),
  };
  return embedded ? { technicianDay } : technicianDay;
}

function chooseTool(message, role) {
  const clean = String(message || "").toLowerCase();
  if (role === "tecnico") return "get_technician_day";
  if (/\b(tarea|jornada|fichaje|asignad|terreno)\b/.test(clean)) return "get_technician_day";
  if (/\b(proyecto|avance|incidencia|cierre|material)\b/.test(clean)) return "get_project_status";
  if (/\b(cotiz|propuesta|pipeline|comercial|oportunidad|lead)\b/.test(clean)) return "get_quote_pipeline";
  if (/\b(finanza|cxc|cxp|caja|factura|pago|vencid|cobranza|rentabilidad)\b/.test(clean)) return "get_finance_summary";
  return "get_daily_summary";
}

const TOOL_MAP = {
  get_daily_summary: getDailySummary,
  get_project_status: getProjectStatus,
  get_quote_pipeline: getQuotePipeline,
  get_finance_summary: getFinanceSummary,
  get_technician_day: getTechnicianDay,
};

function fallbackAnswer(toolName, toolData, role) {
  if (toolData?.restricted || toolData?.finance?.restricted || toolData?.technicianDay?.restricted) {
    return toolData.message || toolData.finance?.message || toolData.technicianDay?.message || "Tu rol no permite ver ese detalle.";
  }
  const label = ROLE_NAMES[role] || role;
  if (toolName === "get_finance_summary") {
    return `Resumen financiero para ${label}: CxC ${toolData.cxc || "-"}, CxC vencida ${toolData.overdueCxc || "-"}, CxP ${toolData.cxp || "-"}, CxP vencida ${toolData.overdueCxp || "-"}.`;
  }
  if (toolName === "get_quote_pipeline") {
    return `Pipeline: ${toolData.opportunities?.total || 0} oportunidades por ${toolData.opportunities?.pipeline || "$0"}, ${toolData.quotes?.total || 0} cotizaciones y ${toolData.proposals?.total || 0} propuestas.`;
  }
  if (toolName === "get_project_status") {
    if (!toolData.project) return toolData.message || "No encontre proyectos para esa consulta.";
    return `Proyecto ${toolData.project.name}: estado ${toolData.project.status || "sin estado"}, avance ${toolData.project.progress || 0}%, ${toolData.tasks?.total || 0} tareas y ${toolData.incidents?.total || 0} incidencias.`;
  }
  if (toolName === "get_technician_day") {
    return `Tu jornada tiene ${toolData.assignedTasks || 0} tareas asignadas, ${toolData.dueToday || 0} para revisar hoy.`;
  }
  return `Resumen para ${label}: proyectos ${toolData.projects?.total || 0}, oportunidades ${toolData.commercial?.opportunities || 0}, servicios activos ${toolData.recurringServices?.total || 0}.`;
}

async function runAi(env, message, role, toolName, toolData) {
  if (!env.AI) return fallbackAnswer(toolName, toolData, role);
  const system = [
    "Eres Asistente NEXO por ASSUR.",
    "Responde en espanol de Chile, breve, ejecutivo y accionable.",
    "Solo puedes usar los datos resumidos entregados por la herramienta.",
    "No inventes datos, no pidas credenciales, no generes SQL, no modifiques datos.",
    "Si el rol no permite ver algo, explica la limitacion sin revelar informacion.",
    "Cierra con una recomendacion operativa concreta cuando aplique.",
  ].join(" ");
  const prompt = [
    `Rol del usuario: ${ROLE_NAMES[role] || role}.`,
    `Herramienta usada: ${toolName}.`,
    `Datos permitidos: ${JSON.stringify(toolData).slice(0, 9000)}.`,
    `Pregunta: ${message}`,
  ].join("\n");
  try {
    const result = await env.AI.run(env.ASSISTANT_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 420,
    });
    return result?.response || result?.text || result?.choices?.[0]?.message?.content || fallbackAnswer(toolName, toolData, role);
  } catch {
    return fallbackAnswer(toolName, toolData, role);
  }
}

async function insertAudit(env, token, table, rows) {
  try {
    return await supabaseFetch(env, token, restPath(table, "on_conflict=id"), {
      method: "POST",
      body: rows,
    });
  } catch {
    return null;
  }
}

async function countUsageToday(env, token, profile, role) {
  try {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const rows = await supabaseFetch(
      env,
      token,
      restPath("assistant_messages", `profile_id=eq.${encodeURIComponent(profile.id)}&sender=eq.user&created_at=gte.${encodeURIComponent(start.toISOString())}&select=id&limit=200`)
    );
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

async function handleQuery(request, env) {
  const headers = corsHeaders(request, env);
  const auth = request.headers.get("authorization") || "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Falta sesion para usar el asistente.");

  const body = await request.json().catch(() => ({}));
  const message = String(body.message || "").trim();
  if (!message) throw new HttpError(400, "Escribe una consulta para el asistente.");
  if (message.length > 900) throw new HttpError(400, "La consulta es demasiado larga para el MVP del asistente.");

  const started = Date.now();
  const authUser = await getAuthUser(env, token);
  const profile = await getProfile(env, token, authUser);
  const perms = await getEffectivePermissions(env, token, profile);
  if (!can(perms, "assistant") && perms.role !== "admin") throw new HttpError(403, "Tu rol no tiene habilitado el asistente.");

  const used = await countUsageToday(env, token, profile, perms.role);
  const limit = ROLE_LIMITS[perms.role] || 15;
  if (used >= limit) throw new HttpError(429, `Limite diario del asistente alcanzado (${limit} consultas).`);

  const threadId = body.threadId || crypto.randomUUID();
  const userMessageId = crypto.randomUUID();
  const assistantMessageId = crypto.randomUUID();
  const toolCallId = crypto.randomUUID();
  const toolName = chooseTool(message, perms.role);
  const toolStart = Date.now();
  const toolData = await TOOL_MAP[toolName]({ env, token, profile, perms, body: { ...body, message, query: message } });
  const toolLatency = Date.now() - toolStart;
  const answer = await runAi(env, message, perms.role, toolName, toolData);
  const latency = Date.now() - started;

  const common = { company_id: profile.company_id, profile_id: profile.id, role: perms.role };
  const auditThread = await insertAudit(env, token, "assistant_threads", [{
    id: threadId,
    ...common,
    title: message.slice(0, 80),
    status: "Activo",
    metadata: { source: "worker_ai" },
  }]);
  const auditMessages = await insertAudit(env, token, "assistant_messages", [
    { id: userMessageId, ...common, thread_id: threadId, sender: "user", content: message, metadata: { allowed_modules: perms.modules } },
    { id: assistantMessageId, ...common, thread_id: threadId, sender: "assistant", content: answer, metadata: { tool_name: toolName, latency_ms: latency } },
  ]);
  const auditTool = await insertAudit(env, token, "assistant_tool_calls", [{
    id: toolCallId,
    ...common,
    thread_id: threadId,
    message_id: userMessageId,
    tool_name: toolName,
    params: { query: message },
    result_summary: JSON.stringify(toolData).slice(0, 1800),
    latency_ms: toolLatency,
    status: "ok",
    metadata: { model: env.ASSISTANT_MODEL || DEFAULT_MODEL },
  }]);
  const auditStored = Boolean(auditThread && auditMessages && auditTool);

  return json({
    ok: true,
    threadId,
    messageId: assistantMessageId,
    answer,
    role: perms.role,
    toolName,
    limit,
    used: used + 1,
    latencyMs: latency,
    auditStored,
    notice: "El asistente no modifica datos; entrega apoyo de consulta.",
  }, 200, headers);
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/assistant/health")) {
        return json({ ok: true, service: "nexo-assistant", ai: Boolean(env.AI), model: env.ASSISTANT_MODEL || DEFAULT_MODEL }, 200, headers);
      }
      if (request.method === "POST" && url.pathname === "/api/assistant/query") {
        return await handleQuery(request, env);
      }
      return json({ ok: false, error: "Ruta no encontrada." }, 404, headers);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return json({
        ok: false,
        error: status >= 500 ? "No pude procesar la consulta ahora." : error.message,
        detail: status >= 500 ? undefined : error.payload,
      }, status, headers);
    }
  },
};

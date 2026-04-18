import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

app.get("/make-server-3bce8755/health", (c) => {
  return c.json({ status: "ok" });
});

// ─── CRM CRUD Routes ─────────────────────────────────────────────────────────
const CRM_ENTITIES = ['lead', 'account', 'contact', 'opportunity', 'case', 'task', 'event', 'campaign'];

// List all records
app.get("/make-server-3bce8755/crm/:entity", async (c) => {
  const entity = c.req.param('entity');
  if (!CRM_ENTITIES.includes(entity)) {
    return c.json({ error: `Invalid entity: ${entity}` }, 400);
  }
  try {
    const raw = await kv.getByPrefix(`crm:${entity}:`);
    const records = raw.map((r: string) => {
      try { return JSON.parse(r); } catch { return null; }
    }).filter(Boolean);
    return c.json(records);
  } catch (e) {
    console.log(`Error listing ${entity}s: ${e}`);
    return c.json({ error: `Failed to list ${entity}s: ${e}` }, 500);
  }
});

// Create a record
app.post("/make-server-3bce8755/crm/:entity", async (c) => {
  const entity = c.req.param('entity');
  if (!CRM_ENTITIES.includes(entity)) {
    return c.json({ error: `Invalid entity: ${entity}` }, 400);
  }
  try {
    const body = await c.req.json();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const record: Record<string, unknown> = { ...body, id, createdAt: now, updatedAt: now };
    // Auto case number
    if (entity === 'case' && !record.caseNumber) {
      const existing = await kv.getByPrefix('crm:case:');
      record.caseNumber = String(1000 + existing.length + 1);
    }
    await kv.set(`crm:${entity}:${id}`, JSON.stringify(record));
    return c.json(record, 201);
  } catch (e) {
    console.log(`Error creating ${entity}: ${e}`);
    return c.json({ error: `Failed to create ${entity}: ${e}` }, 500);
  }
});

// Get one record
app.get("/make-server-3bce8755/crm/:entity/:id", async (c) => {
  const entity = c.req.param('entity');
  const id = c.req.param('id');
  if (!CRM_ENTITIES.includes(entity)) {
    return c.json({ error: `Invalid entity: ${entity}` }, 400);
  }
  try {
    const record = await kv.get(`crm:${entity}:${id}`);
    if (!record) return c.json({ error: 'Record not found' }, 404);
    return c.json(JSON.parse(record));
  } catch (e) {
    console.log(`Error getting ${entity} ${id}: ${e}`);
    return c.json({ error: `Failed to get ${entity}: ${e}` }, 500);
  }
});

// Update a record
app.put("/make-server-3bce8755/crm/:entity/:id", async (c) => {
  const entity = c.req.param('entity');
  const id = c.req.param('id');
  if (!CRM_ENTITIES.includes(entity)) {
    return c.json({ error: `Invalid entity: ${entity}` }, 400);
  }
  try {
    const existing = await kv.get(`crm:${entity}:${id}`);
    if (!existing) return c.json({ error: 'Record not found' }, 404);
    const body = await c.req.json();
    const record = { ...JSON.parse(existing), ...body, id, updatedAt: new Date().toISOString() };
    await kv.set(`crm:${entity}:${id}`, JSON.stringify(record));
    return c.json(record);
  } catch (e) {
    console.log(`Error updating ${entity} ${id}: ${e}`);
    return c.json({ error: `Failed to update ${entity}: ${e}` }, 500);
  }
});

// Delete a record
app.delete("/make-server-3bce8755/crm/:entity/:id", async (c) => {
  const entity = c.req.param('entity');
  const id = c.req.param('id');
  if (!CRM_ENTITIES.includes(entity)) {
    return c.json({ error: `Invalid entity: ${entity}` }, 400);
  }
  try {
    await kv.del(`crm:${entity}:${id}`);
    return c.json({ success: true, id });
  } catch (e) {
    console.log(`Error deleting ${entity} ${id}: ${e}`);
    return c.json({ error: `Failed to delete ${entity}: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);

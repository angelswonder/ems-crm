import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3bce8755/crm`;

const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
};

export async function listRecords<T>(entity: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${entity}`, { headers: HEADERS });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list ${entity}s: ${err}`);
  }
  return res.json();
}

export async function createRecord<T>(entity: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${BASE}/${entity}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create ${entity}: ${err}`);
  }
  return res.json();
}

export async function updateRecord<T>(entity: string, id: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${BASE}/${entity}/${id}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update ${entity}: ${err}`);
  }
  return res.json();
}

export async function deleteRecord(entity: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/${entity}/${id}`, {
    method: 'DELETE',
    headers: HEADERS,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to delete ${entity}: ${err}`);
  }
}

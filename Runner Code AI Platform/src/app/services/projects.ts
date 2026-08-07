import { apiFetch } from "../context/AuthContext";
import { Project } from "../types/chat";

const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const JSON_HEADERS = { "Content-Type": "application/json" };

function parseTs(val: unknown, fallback = Date.now()): number {
  if (!val) return fallback;
  const n = Number(val);
  if (!isNaN(n) && n > 0) return n;
  const str = String(val).trim();
  const normalized = str.includes("T") || str.endsWith("Z") ? str : str.replace(" ", "T") + "Z";
  const parsed = Date.parse(normalized);
  return isNaN(parsed) ? fallback : parsed;
}

function normalize(raw: any): Project {
  return {
    id: raw.id,
    name: raw.name,
    color: raw.color || "#e31e24",
    instructions: raw.instructions || "",
    createdAt: parseTs(raw.createdAt ?? raw.created_at),
    updatedAt: parseTs(raw.updatedAt ?? raw.updated_at),
  };
}

export async function loadProjectsFromServer(): Promise<Project[]> {
  const res = await apiFetch(`${BACKEND_URL}/api/projects`);
  if (!res.ok) throw new Error("Failed to load projects");
  const data: any[] = await res.json();
  return data.map(normalize);
}

export async function createProjectOnServer(p: {
  id: string;
  name: string;
  color?: string;
  instructions?: string;
}): Promise<Project> {
  const res = await apiFetch(`${BACKEND_URL}/api/projects`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return normalize(await res.json());
}

export async function updateProjectOnServer(
  id: string,
  patch: { name?: string; color?: string; instructions?: string },
): Promise<Project> {
  const res = await apiFetch(`${BACKEND_URL}/api/projects/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return normalize(await res.json());
}

export async function deleteProjectOnServer(id: string): Promise<void> {
  const res = await apiFetch(`${BACKEND_URL}/api/projects/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete project");
}

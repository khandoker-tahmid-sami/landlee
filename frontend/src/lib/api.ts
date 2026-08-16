import { supabase } from "./supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
    ...(options.headers ?? {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface Job {
  id: string;
  source_url: string;
  title: string | null;
  company: string | null;
  location: string | null;
  employment_type: string | null;
  salary_range: string | null;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  raw_description: string;
  application_deadline: string | null;
  status: "saved" | "applied" | "interviewing" | "offer" | "rejected" | "archived";
  created_at: string;
}

export interface GeneratedDocument {
  id: string;
  job_id: string;
  doc_type: "cover_letter" | "cv_suggestions";
  content: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  resume_text: string | null;
  email_notifications: boolean;
}

export const api = {
  jobs: {
    list: () => request<Job[]>("/jobs"),
    get: (id: string) => request<Job>(`/jobs/${id}`),
    extract: (url: string) => request<Job>("/jobs/extract", { method: "POST", body: JSON.stringify({ url }) }),
    update: (id: string, updates: Partial<Job>) =>
      request<Job>(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    remove: (id: string) => request<void>(`/jobs/${id}`, { method: "DELETE" }),
  },
  documents: {
    generate: (jobId: string, docType: "cover_letter" | "cv_suggestions") =>
      request<GeneratedDocument>("/documents/generate", {
        method: "POST",
        body: JSON.stringify({ job_id: jobId, doc_type: docType }),
      }),
    listForJob: (jobId: string) => request<GeneratedDocument[]>(`/documents/job/${jobId}`),
  },
  profile: {
    get: () => request<Profile>("/profile"),
    update: (updates: Partial<Profile>) =>
      request<Profile>("/profile", { method: "PATCH", body: JSON.stringify(updates) }),
  },
};

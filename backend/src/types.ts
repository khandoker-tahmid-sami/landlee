export interface AuthedRequestUser {
  id: string;
  email?: string;
}

export interface ExtractedJobInfo {
  title: string | null;
  company: string | null;
  location: string | null;
  employment_type: string | null;
  salary_range: string | null;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  application_deadline: string | null; // ISO date (YYYY-MM-DD) or null
  raw_description: string;
}

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
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  raw_description: string;
}

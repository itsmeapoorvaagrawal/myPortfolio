export type Project = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  live_url: string | null;
  code_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = {
  title: string;
  description: string;
  tags: string[];
  live_url: string | null;
  code_url: string | null;
  sort_order: number;
};

export type PostType = "ai_output" | "request";
export type PostStatus = "open" | "solved" | "archived";
export type PostLang = "sk" | "cz" | "mix";

export type UserRole = "user" | "moderator" | "admin";

export type PostRow = {
  id: string;
  author_id: string;
  type: PostType;
  status: PostStatus;
  lang: PostLang;
  category: string;
  tags: string[];
  title: string;
  context: string | null;
  prompt: string | null;
  output: string | null;
  image_urls?: string[]; // requires DB migration
  created_at: string;
  updated_at: string;
};

export type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  is_solution: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email?: string | null; // requires DB migration
  role?: UserRole | null; // requires DB migration
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  skills: string[];
  region: string | null;
  links: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

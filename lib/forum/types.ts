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
  is_hidden?: boolean; // requires DB migration 2
  hidden_by?: string | null;
  hidden_at?: string | null;
  hidden_reason?: string | null;
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
  is_hidden?: boolean; // requires DB migration 2
  hidden_by?: string | null;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  created_at: string;
};

export type ReactionTargetType = "post" | "comment";

export type ReactionRow = {
  id: string;
  user_id: string;
  target_type: ReactionTargetType;
  target_id: string;
  kind: "helpful";
  created_at: string;
};

export type ReportRow = {
  id: string;
  target_type: ReactionTargetType;
  target_id: string;
  reporter_id: string;
  reason: string | null;
  status: "open" | "resolved";
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
};

export type ProfileContactRow = {
  profile_id: string;
  contact_email: string;
  updated_at: string;
};

export type PostMetrics = {
  post_id: string;
  comment_count: number;
  helpful_count: number;
};

export type ProfileReputationRow = {
  profile_id: string;
  posts_count: number;
  comments_count: number;
  helpful_received: number;
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

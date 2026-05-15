export type UserRole = "Admin" | "Member";

export type TaskStatus = "Queued" | "Active" | "Done";

/** Canonical ordering for selects and status pickers */
export const TASK_STATUS_OPTIONS: TaskStatus[] = ["Queued", "Active", "Done"];

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
}

export interface ProjectMemberDetail {
  membership_id: number;
  project_id: number;
  user_id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: number | null;
  project_id: number;
  due_date: string | null;
  created_at: string;
}

export interface Dashboard {
  total_tasks: number;
  queued_tasks: number;
  active_tasks: number;
  done_tasks: number;
  overdue_tasks: number;
}

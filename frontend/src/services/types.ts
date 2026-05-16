export type UserRole = "Admin" | "Member";

export type TaskStatus = "Todo" | "In Progress" | "Completed";

export const TASK_STATUS_OPTIONS: TaskStatus[] = ["Todo", "In Progress", "Completed"];

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
  todo_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
}

export interface Comment {
  id: number;
  task_id: number;
  user_id: number;
  user_name: string;
  body: string;
  deleted_at: string | null;
  created_at: string;
}

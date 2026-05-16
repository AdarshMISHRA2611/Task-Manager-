import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const qk = {
  me: ["me"] as const,
  projects: ["projects"] as const,
  project: (id: number) => ["project", id] as const,
  projectMembers: (id: number) => ["projectMembers", id] as const,
  tasks: ["tasks"] as const,
  taskComments: (id: number) => ["taskComments", id] as const,
  dashboard: ["dashboard"] as const,
  users: ["users"] as const,
};

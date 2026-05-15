import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status;
    const cfg = error.config as InternalAxiosRequestConfig & { _skipAuthRedirect?: boolean };
    if (status === 401 && cfg?.headers?.Authorization && !cfg._skipAuthRedirect) {
      localStorage.removeItem("token");
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/signup")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const ax = err as AxiosError<{ detail?: string | { msg: string }[] }>;
    const d = ax.response?.data?.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
    return ax.message || "Request failed";
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

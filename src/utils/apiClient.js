import axios from "axios";
import { getAuthItem } from "utils/authStorage";

export const normalizeApiBaseUrl = (rawUrl) => {
  const fallback = "/api";
  const value = String(rawUrl || "").trim();

  if (!value) return fallback;

  const cleaned = value.replace(/\/+$/, "");
  if (cleaned.toLowerCase().endsWith("/api")) {
    return cleaned;
  }

  return `${cleaned}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const headers = buildAuthHeaders();
  if (headers.Authorization) {
    config.headers = {
      ...(config.headers || {}),
      ...headers,
    };
  }

  return config;
});

export const buildAuthHeaders = () => {
  const token = getAuthItem("token");
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
};

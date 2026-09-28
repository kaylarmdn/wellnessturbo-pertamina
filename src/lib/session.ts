const KEY = "wellness_turbo_user_id";
const USER_PROFILE_KEY = "wellness_turbo_user_profile";
const ADMIN_KEY = "wellness_turbo_admin_authenticated";
const SHEET_KEY = "wellness_turbo_leaderboard_sheet_url";

export function getStoredUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setStoredUserId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
}

export function clearStoredUserId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(USER_PROFILE_KEY);
}

export function getStoredCurrentUser(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredCurrentUser(user: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (user["id"]) {
    setStoredUserId(String(user["id"]));
  }
  window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user));
}

/* -------------------------------- admin auth ------------------------------- */

export function isStoredAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_KEY) === "true";
}

export function setStoredAdmin(authenticated: boolean) {
  if (typeof window === "undefined") return;
  if (authenticated) {
    window.localStorage.setItem(ADMIN_KEY, "true");
  } else {
    window.localStorage.removeItem(ADMIN_KEY);
  }
}

/* ----------------------------- leaderboard sheet ---------------------------- */

export const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1oXQ8Y2fTiXTIeaJid00gmF3l75lg_2S1HCfAKB5TcMk/edit";

export function getStoredSheetUrl(): string | null {
  if (typeof window === "undefined") return DEFAULT_SHEET_URL;
  return window.localStorage.getItem(SHEET_KEY) || DEFAULT_SHEET_URL;
}

export function setStoredSheetUrl(url: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SHEET_KEY, url);
}

export function clearStoredSheetUrl() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SHEET_KEY);
}


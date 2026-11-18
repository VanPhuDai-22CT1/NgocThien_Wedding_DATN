import { useEffect, useState } from "react";
import { getDarkMode, setDarkModeStorage } from "utils/darkMode";

const eventName = "nt-admin-theme";
export default function useAdminTheme() {
  const [dark, setDark] = useState(() => getDarkMode());
  useEffect(() => {
    const sync = () => setDark(getDarkMode());
    window.addEventListener(eventName, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(eventName, sync); window.removeEventListener("storage", sync); };
  }, []);
  const update = (value) => {
    const next = typeof value === "function" ? value(getDarkMode()) : value;
    setDarkModeStorage(next); setDark(next); window.dispatchEvent(new Event(eventName));
  };
  return [dark, update];
}

import { useRef, useState } from "react";
import { getAuthItem } from "utils/authStorage";

const ids = value => Array.isArray(value) ? [...new Set(value.map(String).filter(id => /^[1-9]\d*$/.test(id)))] : [];
const read = key => {
  try { const data = JSON.parse(localStorage.getItem(key) || "{}"); return { key, favorites: ids(data.favorites).slice(0, 50), recent: ids(data.recent).slice(0, 8) }; }
  catch { return { key, favorites: [], recent: [] }; }
};
export default function useStaffProducts() {
  const key = `ntw.staff-products.${getAuthItem("user_id") || "admin"}`;
  const [stored, setStored] = useState(() => read(key));
  const current = useRef(stored);
  if (current.current.key !== key) current.current = read(key);
  const update = change => {
    const next = { ...current.current, ...change(current.current) };
    current.current = next; setStored(next);
    try { localStorage.setItem(key, JSON.stringify({ favorites: next.favorites, recent: next.recent })); } catch { /* Keep shortcuts available for this page if storage is unavailable. */ }
  };
  return {
    favoriteIds: current.current.favorites,
    recentIds: current.current.recent,
    toggleFavorite: id => update(data => { const value = String(id); return { favorites: data.favorites.includes(value) ? data.favorites.filter(item => item !== value) : ids([value, ...data.favorites]).slice(0, 50) }; }),
    recordSent: id => update(data => ({ recent: ids([id, ...data.recent]).slice(0, 8) })),
  };
}

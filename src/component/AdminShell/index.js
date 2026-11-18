import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiArrowUpRight, FiBell, FiCalendar, FiChevronRight, FiClock, FiCode, FiGrid, FiImage, FiLogOut, FiMenu, FiMessageSquare, FiMoon, FiPackage, FiSearch, FiShoppingBag, FiSun, FiUsers, FiX } from "react-icons/fi";
import BrandWordmark from "component/BrandWordmark";
import { getAuthItem, logoutAuthSession } from "utils/authStorage";
import useAdminTheme from "./useAdminTheme";
import "./style.scss";

const groups = [
  { title: "Vận hành", items: [
    { to: "/dashboard", name: "Tổng quan", icon: FiGrid }, { to: "/qldonhang", name: "Đơn hàng", icon: FiShoppingBag },
    { to: "/notification", name: "Lịch tư vấn", icon: FiBell }, { to: "/lichlamviec", name: "Lịch làm việc", icon: FiCalendar },
  ] },
  { title: "Quản lý", items: [
    { to: "/qlsanpham", name: "Dịch vụ & sản phẩm", icon: FiPackage }, { to: "/qlnguoidung", name: "Khách hàng", icon: FiUsers },
    { to: "/qltinnhan", name: "Tin nhắn khách hàng", icon: FiMessageSquare },
  ] },
  { title: "Nội dung & hệ thống", items: [
    { to: "/qlhinhanh", name: "Hình ảnh website", icon: FiImage }, { to: "/qlhoatdong", name: "Nhật ký hoạt động", icon: FiClock },
    { to: "/admin/ho-so-nguoi-code", name: "Hồ sơ phát triển", icon: FiCode },
  ] },
];
const routes = groups.flatMap((group) => group.items);
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const userOrigin = process.env.REACT_APP_USER_URL || `${window.location.protocol}//${window.location.hostname}:3000`;

export default function AdminShell({ children }) {
  const location = useLocation(); const navigate = useNavigate();
  const [dark, setDark] = useAdminTheme(); const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState(""); const [searchOpen, setSearchOpen] = useState(false); const [highlight, setHighlight] = useState(0);
  const search = useRef(null); const searchBox = useRef(null); const sidebar = useRef(null); const menuButton = useRef(null);
  const current = routes.find((item) => item.to === location.pathname) || (location.pathname === "/chatadmin" ? routes.find((item) => item.to === "/qltinnhan") : routes[0]);
  const results = routes.filter((item) => normalize(item.name).includes(normalize(query.trim())));
  const username = getAuthItem("username") || "Quản trị viên";
  useEffect(() => { setMenu(false); setSearchOpen(false); setQuery(""); }, [location.pathname]);
  useEffect(() => {
    const shortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); search.current?.focus(); setSearchOpen(true); }
      if (event.key === "Escape") { setSearchOpen(false); if (menu) { setMenu(false); menuButton.current?.focus(); } }
    };
    const outside = (event) => { if (!searchBox.current?.contains(event.target)) setSearchOpen(false); };
    document.addEventListener("keydown", shortcut); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", shortcut); document.removeEventListener("pointerdown", outside); };
  }, [menu]);
  useEffect(() => {
    if (!menu || !window.matchMedia("(max-width: 1000px)").matches) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    sidebar.current?.querySelector("button")?.focus();
    const trap = (event) => {
      if (event.key !== "Tab") return;
      const elements = [...sidebar.current.querySelectorAll('button, a[href]')].filter((item) => item.getClientRects().length);
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", trap); };
  }, [menu]);
  return <div className={`nt-admin${dark ? " is-dark" : ""}${menu ? " nav-open" : ""}`}>
    <a className="nt-admin-skip" href="#nt-admin-main">Đến nội dung chính</a>
    {menu && <button className="nt-admin-shade" tabIndex={-1} type="button" aria-label="Đóng điều hướng" onClick={() => { setMenu(false); menuButton.current?.focus(); }} />}
    <aside className="nt-admin-sidebar" ref={sidebar} aria-label="Điều hướng quản trị">
      <button className="nt-admin-close" type="button" aria-label="Đóng menu quản trị" onClick={() => { setMenu(false); menuButton.current?.focus(); }}><FiX /></button>
      <Link to="/dashboard" className="nt-admin-brand"><BrandWordmark /><span>Không gian quản trị</span></Link>
      <nav className="nt-admin-nav">{groups.map((group) => <div key={group.title} className="nt-admin-nav-group"><p>{group.title}</p>{group.items.map(({ to, name, icon: Icon }) => <NavLink key={to} to={to} end className={({ isActive }) => isActive || (to === "/qltinnhan" && location.pathname === "/chatadmin") ? "is-active" : ""}><Icon aria-hidden="true" /><span>{name}</span><FiChevronRight aria-hidden="true" className="nt-admin-nav-arrow" /></NavLink>)}</div>)}</nav>
      <div className="nt-admin-sidebar-footer"><a href={userOrigin} target="_blank" rel="noopener noreferrer"><FiArrowUpRight aria-hidden="true" />Xem website</a><button type="button" onClick={() => logoutAuthSession("/login")}><FiLogOut aria-hidden="true" />Đăng xuất</button></div>
    </aside>
    <div className="nt-admin-workspace"><header className="nt-admin-topbar"><div className="nt-admin-topbar-start"><button ref={menuButton} className="nt-admin-menu" type="button" aria-label="Mở menu quản trị" aria-expanded={menu} onClick={() => setMenu(!menu)}><FiMenu /></button><nav aria-label="Đường dẫn quản trị"><span>Quản trị</span><FiChevronRight aria-hidden="true" /><strong>{current.name}</strong></nav></div>
      <div className="nt-admin-global-search" ref={searchBox}><FiSearch aria-hidden="true" /><input ref={search} placeholder="Đi đến chức năng…" aria-label="Tìm chức năng quản trị" role="combobox" aria-expanded={searchOpen} aria-controls="nt-admin-search-results" aria-autocomplete="list" aria-activedescendant={searchOpen && results[highlight] ? `nt-admin-result-${highlight}` : undefined} value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => { setQuery(event.target.value); setHighlight(0); }} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setHighlight((value) => Math.min(value + 1, results.length - 1)); } if (event.key === "ArrowUp") { event.preventDefault(); setHighlight((value) => Math.max(0, value - 1)); } if (event.key === "Enter" && results[highlight]) { event.preventDefault(); navigate(results[highlight].to); setSearchOpen(false); search.current.blur(); } }} /><kbd>Ctrl K</kbd>{searchOpen && <div className="nt-admin-search-results" id="nt-admin-search-results" role="listbox" aria-label="Chức năng phù hợp">{results.length ? results.map((item, index) => <button role="option" aria-selected={highlight === index} id={`nt-admin-result-${index}`} key={item.to} type="button" onClick={() => { navigate(item.to); setSearchOpen(false); }}><item.icon aria-hidden="true" /><span>{item.name}</span><FiChevronRight aria-hidden="true" /></button>) : <p>Không tìm thấy chức năng phù hợp.</p>}</div>}</div>
      <div className="nt-admin-topbar-actions"><button type="button" className="nt-admin-icon-button" onClick={() => setDark(!dark)} aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"} title={dark ? "Giao diện sáng" : "Giao diện tối"}>{dark ? <FiSun /> : <FiMoon />}</button><Link className="nt-admin-icon-button nt-admin-bell" to="/notification" aria-label="Xem lịch tư vấn"><FiBell /></Link><div className="nt-admin-user"><span className="nt-admin-avatar">{username.slice(0, 2).toUpperCase()}</span><span><strong>{username}</strong><small>Quản trị viên</small></span></div></div>
    </header><div className="nt-admin-body" id="nt-admin-main" tabIndex={-1}>{children}</div>
    <footer className="nt-admin-bottom"><span>Ngọc Thiện Wedding</span><span>Trang quản trị</span></footer></div>
  </div>;
}

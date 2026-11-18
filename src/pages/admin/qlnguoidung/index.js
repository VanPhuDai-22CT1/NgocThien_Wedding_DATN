import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaTrash, FaUsers } from "react-icons/fa";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiRefreshCw, FiSearch, FiShield, FiUser, FiX } from "react-icons/fi";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { getAuthItem, setAuthItem } from "utils/authStorage";
import { notify } from "utils/notify";
import "./style.scss";
import "./users.scss";

const active = user => ![false, 0, "0", "false"].includes(user.is_active);
const nameOf = user => user.full_name || user.username || "Chưa có tên";
const initials = user => nameOf(user).trim().split(/\s+/).slice(-2).map(part => part.charAt(0)).join("").toLocaleUpperCase("vi-VN");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const emptyForm = { username: "", full_name: "", email: "", phone: "", address: "", role: "user", is_active: true, password: "" };
const userForm = user => ({ ...emptyForm, username: user.username || "", full_name: user.full_name || "", email: user.email || "", phone: user.phone || "", address: user.address || "", role: user.role === "admin" ? "admin" : "user", is_active: active(user) });
const pageSize = 10;

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [dialogError, setDialogError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const request = useRef(null);
  const busy = useRef(false);
  const editModal = useRef(null);
  const deleteModal = useRef(null);
  const currentId = String(getAuthItem("user_id") || "");
  const modalKind = selectedUser ? "edit" : pendingDeleteUser ? "delete" : "";
  const modalId = selectedUser?.id || pendingDeleteUser?.id;

  const loadUsers = useCallback(async () => {
    if (request.current || busy.current) return;
    const controller = new AbortController(); request.current = controller; setLoading(true);
    try {
      const response = await apiClient.get("/legacy", { params: { action: "getUsers" }, headers: buildAuthHeaders(), signal: controller.signal });
      const data = response.data; const rows = Array.isArray(data) ? data : data?.data || data?.rows;
      if (data?.success === false || !Array.isArray(rows)) throw new Error("Invalid user list");
      if (!controller.signal.aborted) { setUsers(rows); setLoaded(true); setLoadError(""); }
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error.response?.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Không thể tải người dùng. Vui lòng thử lại; danh sách đã tải vẫn được giữ lại.");
    } finally { if (request.current === controller) { request.current = null; if (!controller.signal.aborted) setLoading(false); } }
  }, []);
  useEffect(() => { if (getAuthItem("role") !== "admin") { navigate("/"); return; } loadUsers(); return () => { request.current?.abort(); request.current = null; }; }, [navigate, loadUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);
  const closeModal = useCallback(() => { if (busy.current) return; setSelectedUser(null); setPendingDeleteUser(null); setForm(emptyForm); setFieldErrors({}); setDialogError(""); setShowPassword(false); setPasswordExpanded(false); }, []);
  useEffect(() => {
    if (!modalKind) return;
    const modal = modalKind === "edit" ? editModal.current : deleteModal.current;
    const opener = document.activeElement; const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => modal?.querySelector(modalKind === "edit" ? "input" : "button")?.focus());
    const keyboard = event => {
      if (event.key === "Escape") { event.preventDefault(); closeModal(); }
      if (event.key !== "Tab") return;
      const items = [...modal.querySelectorAll('input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled)')].filter(item => item.getClientRects().length);
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); (opener?.isConnected ? opener : document.getElementById("nt-admin-main"))?.focus({ preventScroll: true }); };
  }, [modalKind, modalId, closeModal]);

  const openEdit = user => { if (busy.current) return; setPendingDeleteUser(null); setSelectedUser(user); setForm(userForm(user)); setFieldErrors({}); setDialogError(""); setShowPassword(false); setPasswordExpanded(false); };
  const openDelete = user => { if (busy.current || String(user.id) === currentId) return; setSelectedUser(null); setPendingDeleteUser(user); setDialogError(""); };
  const change = event => { const { name, value } = event.target; setForm(previous => ({ ...previous, [name]: value })); setFieldErrors(previous => ({ ...previous, [name]: "" })); setDialogError(""); };
  const saveUser = async event => {
    event.preventDefault(); if (!selectedUser || busy.current) return;
    const errors = {};
    if (!form.username.trim()) errors.username = "Vui lòng nhập tên đăng nhập.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Vui lòng nhập email hợp lệ.";
    if (form.password.trim() && form.password.trim().length < 6) errors.password = "Mật khẩu mới cần ít nhất 6 ký tự.";
    setFieldErrors(errors); setDialogError(""); if (errors.password) setPasswordExpanded(true);
    if (Object.keys(errors).length) { requestAnimationFrame(() => editModal.current?.querySelector('[aria-invalid="true"]')?.focus()); return; }
    busy.current = true; setSaving(true);
    request.current?.abort(); request.current = null; setLoading(false);
    try {
      const payload = { ...form, action: "updateUserInfo", user_id: selectedUser.id };
      for (const key of ["username", "full_name", "email", "phone", "address", "password"]) payload[key] = payload[key].trim();
      const response = await apiClient.post("/legacy", payload, { headers: buildAuthHeaders() });
      if (!response.data?.success) throw Object.assign(new Error("Update rejected"), { response: { data: response.data } });
      const updated = { ...selectedUser, ...form, ...response.data.data }; delete updated.password;
      setUsers(previous => previous.map(user => user.id === updated.id ? updated : user));
      if (String(updated.id) === currentId) { setAuthItem("username", updated.username); setAuthItem("email", updated.email); setAuthItem("role", updated.role); }
      setSelectedUser(null); setForm(emptyForm); setShowPassword(false); setPasswordExpanded(false); notify.success("Đã cập nhật thông tin tài khoản.");
    } catch (error) {
      const message = error.response?.data?.message || "";
      if (/username.*exists/i.test(message)) setFieldErrors(previous => ({ ...previous, username: "Tên đăng nhập đã được sử dụng." }));
      else if (/email.*exists/i.test(message)) setFieldErrors(previous => ({ ...previous, email: "Email đã được sử dụng." }));
      else setDialogError("Không thể lưu tài khoản. Vui lòng thử lại; nội dung bạn nhập vẫn được giữ lại.");
    } finally { busy.current = false; setSaving(false); }
  };
  const deleteUser = async () => {
    const id = pendingDeleteUser?.id;
    if (!id || busy.current || String(id) === currentId) return;
    busy.current = true; setSaving(true); setDialogError("");
    request.current?.abort(); request.current = null; setLoading(false);
    try {
      const response = await apiClient.post("/legacy", { action: "deleteUser", user_id: id }, { headers: buildAuthHeaders() });
      if (!response.data?.success) { setDialogError(response.data?.message || "Chưa xóa được tài khoản. Vui lòng thử lại."); return; }
      setUsers(previous => previous.filter(user => user.id !== id)); setPendingDeleteUser(null); notify.success("Đã xóa người dùng.");
    } catch (error) { setDialogError(error.response?.data?.message || "Không thể xóa tài khoản. Vui lòng thử lại."); }
    finally { busy.current = false; setSaving(false); }
  };

  const filtered = users.filter(user => (!roleFilter || user.role === roleFilter) && (!statusFilter || active(user) === (statusFilter === "active")) && normalize(`${user.id} ${nameOf(user)} ${user.username} ${user.email} ${user.phone}`).includes(normalize(search.trim())));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totals = { all: users.length, customer: users.filter(user => user.role !== "admin").length, admin: users.filter(user => user.role === "admin").length, locked: users.filter(user => !active(user)).length };
  const count = value => loaded ? value.toLocaleString("vi-VN") : "—";
  const clear = () => { setSearch(""); setRoleFilter(""); setStatusFilter(""); };
  const field = (name, label, type = "text", maxLength = 255) => <div className="nt-user-field"><label htmlFor={`nt-user-${name}`}>{label}{["username", "email"].includes(name) && <span aria-hidden="true"> *</span>}</label><input id={`nt-user-${name}`} name={name} type={type} value={form[name]} onChange={change} maxLength={maxLength} autoComplete={name === "username" ? "off" : name === "phone" ? "tel" : name === "full_name" ? "name" : name === "email" ? "email" : "off"} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `nt-user-${name}-error` : undefined} />{fieldErrors[name] && <p id={`nt-user-${name}-error`} className="nt-user-field-error" role="alert">{fieldErrors[name]}</p>}</div>;

  return <div className="admin-layout nt-users-page"><main className="admin-content">
    <header className="page-header"><div><h1><FaUsers />Quản lý người dùng</h1><p>Quản lý thông tin khách hàng, vai trò và trạng thái tài khoản.</p></div><button type="button" className="btn-outline nt-user-refresh" disabled={loading || saving} onClick={loadUsers}><FiRefreshCw aria-hidden="true" />{loading ? "Đang tải…" : "Làm mới"}</button></header>
    <div className="nt-users-metrics">{[["Tổng tài khoản", totals.all, FaUsers], ["Khách hàng", totals.customer, FiUser], ["Quản trị viên", totals.admin, FiShield], ["Tạm khóa", totals.locked, FiLock]].map(([label, value, Icon]) => <div key={label}><Icon aria-hidden="true" /><span>{label}</span><strong>{count(value)}</strong></div>)}</div>
    {loadError && <div className="nt-user-alert" role="alert">{loadError}<button type="button" className="btn-outline" onClick={loadUsers} disabled={loading}>Thử lại</button></div>}
    <section className="nt-users-list" aria-label="Danh sách người dùng"><div className="nt-users-filters"><label className="nt-users-search"><span>Tìm tài khoản</span><div><FiSearch aria-hidden="true" /><input placeholder="Họ tên, email, số điện thoại…" value={search} onChange={event => setSearch(event.target.value)} /></div></label><label><span>Vai trò</span><select aria-label="Vai trò tài khoản" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}><option value="">Tất cả vai trò</option><option value="user">Khách hàng</option><option value="admin">Quản trị viên</option></select></label><label><span>Trạng thái</span><select aria-label="Trạng thái tài khoản" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Tất cả trạng thái</option><option value="active">Đang mở</option><option value="inactive">Tạm khóa</option></select></label><button type="button" className="btn-outline" onClick={clear}>Xóa bộ lọc</button></div>
      <div className="nt-users-caption"><h2>Danh sách tài khoản</h2><span aria-live="polite">{loaded ? `${filtered.length} / ${users.length} tài khoản` : "Đang tải dữ liệu…"}</span></div>
      <div className="nt-users-columns" aria-hidden="true"><span>Thông tin tài khoản</span><span>Liên hệ</span><span>Vai trò</span><span>Trạng thái</span><span>Thao tác</span></div>
      {loading && !loaded ? <div className="nt-users-empty" role="status">Đang tải người dùng…</div> : !loaded && loadError ? <div className="nt-users-empty">Chưa tải được dữ liệu. Nhấn “Thử lại” để kết nối lại.</div> : visible.length === 0 ? <div className="nt-users-empty"><FaUsers aria-hidden="true" /><h3>{users.length ? "Không tìm thấy tài khoản phù hợp" : "Chưa có tài khoản"}</h3><p>{users.length ? "Thử thay đổi từ khóa, vai trò hoặc trạng thái tài khoản." : "Tài khoản đã đăng ký sẽ xuất hiện tại đây."}</p></div> : <div aria-busy={loading}>{visible.map(user => <article className="user-card nt-user-row" key={user.id}><div className="nt-user-identity"><span className={`nt-user-avatar${user.role === "admin" ? " is-admin" : ""}`} aria-hidden="true">{initials(user)}</span><div><strong>{nameOf(user)}{String(user.id) === currentId && <small>Bạn</small>}</strong><span>@{user.username || "—"} <i>·</i> #{user.id}</span></div></div><div className="nt-user-contact"><span><FiMail aria-hidden="true" />{user.email || "Chưa có email"}</span><small><FiPhone aria-hidden="true" />{user.phone || "Chưa có số điện thoại"}</small></div><span className={`nt-user-role ${user.role === "admin" ? "admin" : "customer"}`}>{user.role === "admin" ? <FiShield aria-hidden="true" /> : <FiUser aria-hidden="true" />}{user.role === "admin" ? "Quản trị viên" : "Khách hàng"}</span><span className={`nt-user-status ${active(user) ? "active" : "locked"}`}>{active(user) ? "Đang mở" : "Tạm khóa"}</span><div className="nt-user-actions"><button type="button" className="btn-edit" title="Chỉnh sửa" aria-label={`Chỉnh sửa tài khoản ${nameOf(user)}`} onClick={() => openEdit(user)} disabled={saving}><FaEdit aria-hidden="true" /><span>Sửa</span></button><button type="button" className="btn-delete" title={String(user.id) === currentId ? "Không thể xóa tài khoản đang đăng nhập" : "Xóa"} aria-label={`Xóa tài khoản ${nameOf(user)}`} onClick={() => openDelete(user)} disabled={saving || String(user.id) === currentId}><FaTrash aria-hidden="true" /></button></div></article>)}</div>}
      {filtered.length > 0 && <nav className="nt-users-pagination" aria-label="Phân trang người dùng"><span>Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} / {filtered.length} tài khoản</span><div><button type="button" aria-label="Trang trước" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}><FiChevronLeft /></button><span>Trang <strong>{currentPage}</strong> / {pages}</span><button type="button" aria-label="Trang sau" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pages}><FiChevronRight /></button></div></nav>}
    </section>

    {selectedUser && <div className="nt-user-overlay" onClick={closeModal}><div className="modal-box nt-user-edit-modal" role="dialog" aria-modal="true" aria-labelledby="nt-user-edit-title" ref={editModal} onClick={event => event.stopPropagation()}><header><div><span>Thông tin tài khoản #{selectedUser.id}</span><h3 id="nt-user-edit-title">Chỉnh sửa người dùng</h3></div><button type="button" aria-label="Đóng chỉnh sửa người dùng" onClick={closeModal} disabled={saving}><FiX /></button></header><form onSubmit={saveUser} noValidate><div className="nt-user-edit-body">{dialogError && <div className="nt-user-alert" role="alert">{dialogError}</div>}<fieldset disabled={saving}><legend className="nt-user-sr">Thông tin và quyền tài khoản</legend><div className="nt-user-edit-grid"><section><h4>Thông tin cá nhân</h4><div className="nt-user-field-grid">{field("username", "Tên đăng nhập", "text", 100)}{field("full_name", "Họ và tên")}{field("email", "Email", "email", 100)}{field("phone", "Số điện thoại", "tel", 20)}</div><div className="nt-user-field"><label htmlFor="nt-user-address">Địa chỉ</label><textarea id="nt-user-address" name="address" rows={3} value={form.address} onChange={change} maxLength={2000} /></div></section><section className="nt-user-access"><h4>Quyền & trạng thái</h4><div className="nt-user-field"><label htmlFor="nt-user-role">Vai trò tài khoản</label><select id="nt-user-role" name="role" value={form.role} onChange={change}><option value="user">Khách hàng</option><option value="admin">Quản trị viên</option></select></div><label className="nt-user-active-check"><input type="checkbox" checked={form.is_active} onChange={event => setForm(previous => ({ ...previous, is_active: event.target.checked }))} /><span><strong>Mở tài khoản</strong><small>Tắt để tạm khóa quyền đăng nhập.</small></span></label><details className="nt-user-password-section" open={passwordExpanded} onToggle={event => setPasswordExpanded(event.currentTarget.open)}><summary><FiLock aria-hidden="true" />Đổi mật khẩu<FiChevronDown aria-hidden="true" /></summary><label htmlFor="nt-user-password">Mật khẩu mới</label><div className="nt-user-password-input"><input id="nt-user-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={change} maxLength={255} aria-invalid={Boolean(fieldErrors.password)} aria-describedby="nt-user-password-help nt-user-password-error" /><button type="button" aria-label={showPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"} onClick={() => setShowPassword(previous => !previous)}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div><p id="nt-user-password-help">Ít nhất 6 ký tự. Để trống nếu giữ mật khẩu hiện tại.</p>{fieldErrors.password && <p className="nt-user-field-error" id="nt-user-password-error" role="alert">{fieldErrors.password}</p>}</details></section></div></fieldset></div><footer><button type="button" className="btn-outline" onClick={closeModal} disabled={saving}>Hủy</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</button></footer></form></div></div>}
    {pendingDeleteUser && <div className="nt-user-overlay" onClick={closeModal}><div className="nt-user-delete-modal" role="dialog" aria-modal="true" aria-labelledby="nt-user-delete-title" aria-describedby="nt-user-delete-description" ref={deleteModal} onClick={event => event.stopPropagation()}><div className="nt-user-delete-icon"><FaTrash aria-hidden="true" /></div><h3 id="nt-user-delete-title">Xóa tài khoản?</h3><p id="nt-user-delete-description">Bạn đang xóa tài khoản <strong>{nameOf(pendingDeleteUser)}</strong>. Đơn hàng, giỏ hàng, lịch tư vấn, đánh giá và nội dung chat liên quan cũng sẽ bị xóa.</p>{dialogError && <div className="nt-user-alert" role="alert">{dialogError}</div>}<footer><button type="button" className="btn-outline" onClick={closeModal} disabled={saving}>Hủy</button><button type="button" className="btn-primary" onClick={deleteUser} disabled={saving}>{saving ? "Đang xóa…" : "Xóa tài khoản"}</button></footer></div></div>}
  </main></div>;
}

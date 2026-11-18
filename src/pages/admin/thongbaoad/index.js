import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowUpRight, FiCalendar, FiCheckCircle, FiChevronLeft, FiChevronRight, FiClock, FiMail, FiPhone, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { notify } from "utils/notify";
import "./style.scss";
import "./consultations.scss";

const STATUSES = [
  { value: "pending", label: "Chờ tư vấn" }, { value: "confirmed", label: "Đã xác nhận" },
  { value: "processing", label: "Đang xử lý" }, { value: "delivering", label: "Đang triển khai" },
  { value: "completed", label: "Hoàn tất" }, { value: "cancelled", label: "Đã hủy" },
];
const plain = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const statusValue = value => ({ "da xac nhan": "confirmed", done: "confirmed", "dang xu ly": "processing", shipping: "delivering", "dang giao": "delivering", delivered: "completed", "da nhan hang": "completed", "da giao su kien": "completed", "da ban giao su kien": "completed", cancel: "cancelled", "da huy": "cancelled" })[plain(value).trim()] || String(value || "pending").trim().toLowerCase();
const statusMeta = value => STATUSES.find(item => item.value === statusValue(value)) || { value: "unknown", label: "Chưa xác định" };
const unread = item => ![true, 1, "1"].includes(item.is_read);
const dateKey = value => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type).value).join("-");
};
const dateText = value => dateKey(value) ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa chọn ngày";
const pageSize = 8;
const Badge = ({ value }) => { const meta = statusMeta(value); return <span className={`nt-consult-badge ${meta.value}`}>{meta.label}</span>; };

export default function Notification() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelConfirmation, setCancelConfirmation] = useState(false);
  const request = useRef(null);
  const busy = useRef(false);
  const readAttempts = useRef(new Set());
  const drawer = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const selectedId = Number(new URLSearchParams(location.search).get("consultationId") || 0);
  const selected = consultations.find(item => Number(item.id) === selectedId);

  const fetchConsultations = useCallback(async () => {
    if (request.current || busy.current) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true);
    try {
      const response = await apiClient.get("/legacy", { params: { action: "getConsultations" }, headers: buildAuthHeaders(), signal: controller.signal });
      if (response.data?.success !== true || !Array.isArray(response.data.data)) throw new Error("Invalid consultation list");
      if (!controller.signal.aborted) { setConsultations(response.data.data); setLoaded(true); setError(""); }
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.response?.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Không thể tải lịch tư vấn. Vui lòng thử lại; dữ liệu đã tải vẫn được giữ lại.");
    } finally { if (request.current === controller) { request.current = null; if (!controller.signal.aborted) setLoading(false); } }
  }, []);
  useEffect(() => {
    fetchConsultations();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") fetchConsultations(); }, 30000);
    return () => { window.clearInterval(timer); request.current?.abort(); request.current = null; };
  }, [fetchConsultations]);
  useEffect(() => { setPage(1); }, [search, filter, unreadOnly, from, to, sort]);
  useEffect(() => { setDraft(""); setDetailError(""); setCancelConfirmation(false); }, [selectedId]);

  const markRead = useCallback(async id => {
    try {
      const response = await apiClient.post("/legacy", { action: "markConsultationAsRead", id }, { headers: buildAuthHeaders() });
      if (!response.data?.success) throw new Error("Cannot mark read");
      setConsultations(previous => previous.map(item => Number(item.id) === Number(id) ? { ...item, is_read: true } : item));
      setDetailError("");
    } catch { setDetailError("Chưa đánh dấu đã đọc được. Bạn có thể thử lại."); }
  }, []);
  useEffect(() => {
    if (selected && unread(selected) && !readAttempts.current.has(selectedId)) { readAttempts.current.add(selectedId); markRead(selectedId); }
  }, [selected, selectedId, markRead]);
  const closeDetail = useCallback(() => { if (!busy.current) navigate("/notification", { replace: true }); }, [navigate]);
  const openDetail = item => navigate(`/notification?consultationId=${item.id}`, { replace: true });
  const isOpen = Boolean(selected);
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    drawer.current?.querySelector("button")?.focus();
    const keyboard = event => {
      if (event.key === "Escape") { event.preventDefault(); closeDetail(); }
      if (event.key !== "Tab") return;
      const elements = [...drawer.current.querySelectorAll('button:not(:disabled), a[href], select:not(:disabled)')].filter(element => element.getClientRects().length);
      if (!elements.length) return;
      if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); (opener?.isConnected ? opener : document.getElementById("nt-admin-main"))?.focus({ preventScroll: true }); };
  }, [isOpen, selectedId, closeDetail]);

  const saveStatus = async (confirmed = false) => {
    if (!selected || !draft || busy.current || draft === statusValue(selected.status)) return;
    if (draft === "cancelled" && !confirmed) { setCancelConfirmation(true); return; }
    const id = selected.id;
    busy.current = true; setSaving(true); setDetailError("");
    try {
      request.current?.abort(); request.current = null; setLoading(false);
      const response = await apiClient.post("/legacy", { action: "updateConsultationStatus", id, status: draft }, { headers: buildAuthHeaders() });
      if (!response.data?.success) throw new Error("Status update rejected");
      const nextStatus = response.data.data?.status || draft;
      setConsultations(previous => previous.map(item => item.id === id ? { ...item, status: nextStatus } : item));
      setDraft(""); setCancelConfirmation(false); notify.success("Đã cập nhật trạng thái tư vấn.");
      if (response.data.warning) notify.info(response.data.warning);
    } catch { setDetailError("Không thể lưu trạng thái. Thông tin bạn chọn vẫn được giữ lại để thử lại."); }
    finally { busy.current = false; setSaving(false); }
  };

  const today = dateKey(new Date());
  const nextWeek = dateKey(new Date(Date.now() + 7 * 86400000));
  const totals = useMemo(() => ({ total: consultations.length, unread: consultations.filter(unread).length, pending: consultations.filter(item => statusValue(item.status) === "pending").length, completed: consultations.filter(item => statusValue(item.status) === "completed").length, upcoming: consultations.filter(item => { const day = dateKey(item.event_date); return day && day >= today && day <= nextWeek && !["completed", "cancelled"].includes(statusValue(item.status)); }).length }), [consultations, today, nextWeek]);
  const invalidRange = from && to && from > to;
  const filtered = useMemo(() => consultations.filter(item => {
    const day = dateKey(item.event_date);
    return (!filter || statusValue(item.status) === filter) && (!unreadOnly || unread(item)) && (invalidRange || ((!from || day >= from) && (!to || (Boolean(day) && day <= to)))) && plain(`${item.id} ${item.name} ${item.phone} ${item.email} ${item.service}`).includes(plain(search).trim());
  }).sort((a, b) => sort === "event" ? (dateKey(a.event_date) || "9999").localeCompare(dateKey(b.event_date) || "9999") || Number(b.id) - Number(a.id) : (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0) || Number(b.id) - Number(a.id)), [consultations, filter, unreadOnly, invalidRange, from, to, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const countText = value => loaded ? new Intl.NumberFormat("vi-VN").format(value) : "—";
  const clear = () => { setSearch(""); setFilter(""); setUnreadOnly(false); setFrom(""); setTo(""); setSort("newest"); };

  return <div className="admin-layout nt-consult-page"><main className="main-content">
    <header className="page-header"><div><h1><FiCalendar />Quản lý lịch tư vấn khách hàng</h1><p>Theo dõi yêu cầu, liên hệ khách hàng và cập nhật tiến độ tư vấn.</p></div><button type="button" className="btn-outline nt-consult-refresh" onClick={fetchConsultations} disabled={loading || saving}><FiRefreshCw aria-hidden="true" />{loading ? "Đang tải…" : "Làm mới"}</button></header>
    <div className="nt-consult-metrics">{[["Tất cả yêu cầu", totals.total, FiCalendar], ["Chưa đọc", totals.unread, FiMail], ["Chờ tư vấn", totals.pending, FiClock], ["Sắp diễn ra", totals.upcoming, FiCalendar], ["Hoàn tất", totals.completed, FiCheckCircle]].map(([label, count, Icon]) => <div key={label}><Icon aria-hidden="true" /><span>{label}</span><strong>{countText(count)}</strong></div>)}</div>
    {error && <div className="nt-consult-alert" role="alert">{error}<button type="button" className="btn-outline" disabled={loading} onClick={fetchConsultations}>Thử lại</button></div>}
    {selectedId > 0 && loaded && !selected && <div className="nt-consult-alert" role="alert">Không tìm thấy yêu cầu #{selectedId}.<button type="button" className="btn-outline" onClick={closeDetail}>Về danh sách</button></div>}
    <section className="nt-consult-list" aria-label="Danh sách lịch tư vấn">
      <div className="nt-consult-toolbar"><div className="nt-consult-tabs"><button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Tất cả yêu cầu <span>{countText(totals.total)}</span></button><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Chưa đọc <span>{countText(totals.unread)}</span></button></div><span className="nt-consult-sync">Tự cập nhật mỗi 30 giây</span></div>
      <div className="nt-consult-filters"><label className="nt-consult-search"><span>Tìm khách hàng hoặc dịch vụ</span><div><FiSearch aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tên, số điện thoại, email, mã yêu cầu…" /></div></label><label><span>Trạng thái</span><select aria-label="Trạng thái tư vấn" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Tất cả trạng thái</option>{STATUSES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label><span>Ngày tổ chức từ</span><input aria-label="Ngày tổ chức từ" type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} aria-invalid={Boolean(invalidRange)} /></label><label><span>Đến ngày</span><input aria-label="Đến ngày" type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} aria-invalid={Boolean(invalidRange)} /></label></div>
      {invalidRange && <p className="nt-consult-range-error" role="alert">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>}
      <div className="nt-consult-results"><span aria-live="polite">{loaded ? `${filtered.length} / ${totals.total} yêu cầu` : "Đang tải yêu cầu…"}</span><div><button type="button" className="btn-outline" onClick={clear}>Xóa bộ lọc</button><label><span className="nt-consult-sr">Sắp xếp</span><select aria-label="Sắp xếp yêu cầu" value={sort} onChange={event => setSort(event.target.value)}><option value="newest">Mới nhất</option><option value="event">Ngày tổ chức gần nhất</option></select></label></div></div>
      <div className="nt-consult-columns" aria-hidden="true"><span>Yêu cầu</span><span>Khách hàng</span><span>Dịch vụ quan tâm</span><span>Ngày tổ chức</span><span>Trạng thái</span><span /></div>
      {loading && !loaded ? <div className="nt-consult-empty" role="status">Đang tải lịch tư vấn…</div> : error && !loaded ? <div className="nt-consult-empty">Chưa tải được dữ liệu. Nhấn “Thử lại” để kết nối lại.</div> : visible.length === 0 ? <div className="nt-consult-empty"><FiCalendar aria-hidden="true" /><h2>{totals.total ? "Không tìm thấy yêu cầu phù hợp" : "Chưa có yêu cầu tư vấn"}</h2><p>{totals.total ? "Thử thay đổi từ khóa, trạng thái hoặc khoảng ngày." : "Các yêu cầu tư vấn của khách hàng sẽ xuất hiện tại đây."}</p></div> : <div aria-busy={loading}>{visible.map(item => <button type="button" key={item.id} className={`nt-consult-row${unread(item) ? " is-unread" : ""}${Number(item.id) === selectedId ? " is-selected" : ""}`} aria-label={`Xem yêu cầu #${item.id} của ${item.name || "khách hàng"}`} onClick={() => openDetail(item)}><span className="nt-consult-ident"><strong>#{item.id}</strong><small>{unread(item) ? <span className="nt-consult-new">Chưa đọc</span> : "Đã xem"}</small></span><span className="nt-consult-customer"><strong>{item.name || "Khách hàng"}</strong><small>{item.phone || "Chưa có số điện thoại"}</small></span><span className="nt-consult-service" title={item.service}>{item.service || "Chưa chọn dịch vụ"}</span><span className="nt-consult-event"><FiCalendar aria-hidden="true" />{dateText(item.event_date)}</span><Badge value={item.status} /><FiArrowUpRight aria-hidden="true" className="nt-consult-row-arrow" /></button>)}</div>}
      {filtered.length > 0 && <nav className="nt-consult-pagination" aria-label="Phân trang lịch tư vấn"><span>Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} / {filtered.length} yêu cầu</span><div><button type="button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><FiChevronLeft /></button><span>Trang <strong>{currentPage}</strong> / {pages}</span><button type="button" aria-label="Trang sau" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}><FiChevronRight /></button></div></nav>}
    </section>
    {selected && createPortal(<div className="nt-consult-overlay" onClick={closeDetail}><aside className="nt-consult-drawer" role="dialog" aria-modal="true" aria-labelledby="nt-consult-detail-title" ref={drawer} onClick={event => event.stopPropagation()}><header><div><span>Chi tiết yêu cầu #{selected.id}</span><h2 id="nt-consult-detail-title">{selected.name || "Khách hàng"}</h2></div><button type="button" aria-label="Đóng chi tiết tư vấn" onClick={closeDetail} disabled={saving}><FiX /></button></header><div className="nt-consult-drawer-body"><div className="nt-consult-drawer-status"><Badge value={selected.status} /><span>Tiếp nhận {dateText(selected.created_at)}</span></div>{detailError && <div className="nt-consult-alert" role="alert">{detailError}{unread(selected) && <button type="button" className="btn-outline" onClick={() => markRead(selected.id)}>Đánh dấu đã đọc</button>}</div>}<section><h3>Thông tin liên hệ</h3><div className="nt-consult-contact">{selected.phone ? <a href={`tel:${selected.phone}`}><FiPhone aria-hidden="true" /><span><small>Số điện thoại</small>{selected.phone}</span></a> : <p>Chưa có số điện thoại.</p>}{selected.email ? <a href={`mailto:${selected.email}`}><FiMail aria-hidden="true" /><span><small>Email</small>{selected.email}</span></a> : <p>Chưa có email.</p>}</div></section><section><h3>Nhu cầu tư vấn</h3><dl><div><dt>Ngày tổ chức</dt><dd>{dateText(selected.event_date)}</dd></div><div><dt>Dịch vụ</dt><dd>{selected.service || "Chưa chọn dịch vụ"}</dd></div></dl></section><section><h3>Ghi chú & mong muốn</h3><p className="nt-consult-note">{selected.note || "Khách hàng chưa để lại ghi chú."}</p></section><section className="nt-consult-edit"><h3>Cập nhật tiến độ</h3><p>Trạng thái dùng để theo dõi quá trình xử lý yêu cầu tư vấn.</p><label htmlFor="nt-consult-draft">Trạng thái yêu cầu</label><select id="nt-consult-draft" value={draft || statusValue(selected.status)} onChange={event => { setDraft(event.target.value); setCancelConfirmation(false); }} disabled={saving}>{!STATUSES.some(item => item.value === statusValue(selected.status)) && <option value={statusValue(selected.status)}>Chưa xác định</option>}{STATUSES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></section></div><footer>{cancelConfirmation && <p role="alert">Xác nhận hủy yêu cầu #{selected.id}?</p>}<button type="button" className="btn-outline" onClick={cancelConfirmation ? () => setCancelConfirmation(false) : closeDetail} disabled={saving}>{cancelConfirmation ? "Giữ lại" : "Đóng"}</button><button type="button" className="btn-primary" onClick={() => saveStatus(cancelConfirmation)} disabled={saving || !draft || draft === statusValue(selected.status)}>{saving ? "Đang xử lý…" : cancelConfirmation ? "Hủy yêu cầu" : "Lưu trạng thái"}</button></footer></aside></div>, document.getElementById("nt-admin-main") || document.body)}
  </main></div>;
}

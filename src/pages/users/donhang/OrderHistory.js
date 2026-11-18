import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiChevronRight, FiMapPin, FiPackage, FiRefreshCw, FiSearch, FiX } from "react-icons/fi";
import { getAuthItem } from "utils/authStorage";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { getImageUrl, getProductImage } from "utils/image";
import "./style.scss";

const STATUSES = [
  { id: "all", label: "Tất cả" }, { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" }, { id: "processing", label: "Đang chuẩn bị" },
  { id: "shipping", label: "Đang giao" }, { id: "delivered", label: "Đã bàn giao" }, { id: "cancelled", label: "Đã hủy" },
];
const statusLabel = (value) => STATUSES.find((item) => item.id === value)?.label || value || "Chưa cập nhật";
const knownStatus = (value) => STATUSES.some((item) => item.id === value) ? value : "unknown";
const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " ₫";
const date = (value, time = false) => {
  if (!value) return "Chưa cập nhật";
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+07:00` : value);
  if (!Number.isFinite(parsed.getTime())) return "Chưa cập nhật";
  return parsed.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) });
};
const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const selectionOf = (raw) => { try { return typeof raw === "string" ? JSON.parse(raw) || {} : raw || {}; } catch { return {}; } };
const legacyServices = (note) => {
  const match = String(note || "").match(/Danh sách gói đã chọn:\s*([^\n]+)|Dịch vụ:\s*([^|]+)/);
  return match ? (match[1] || match[2]).split(",").map((name) => ({ name: name.trim() })).filter((item) => item.name) : [];
};
const normalizeOrder = (order) => ({ ...order, items: order.OrderItems?.length ? order.OrderItems.map((item) => ({
  name: item.Product?.name || "Dịch vụ cưới", image: getProductImage(item.Product), productId: item.Product?.id,
  price: Number(item.price || 0), quantity: Number(item.quantity || 1), selection: selectionOf(item.selection),
})) : legacyServices(order.note) });
const Status = ({ value }) => <span className={`oh-status oh-status--${knownStatus(value)}`}>{statusLabel(value)}</span>;
const ProductImage = ({ item }) => item?.image ? <img src={getImageUrl(item.image)} alt="" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getImageUrl(null); }} /> : <span className="oh-product-placeholder" aria-hidden="true"><FiPackage /></span>;

export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const modal = useRef(null); const opener = useRef(null); const listTop = useRef(null);
  const request = useRef(null);
  const userId = getAuthItem("user_id");
  const isAdmin = getAuthItem("role") === "admin";
  const fetchOrders = useCallback(async () => {
    request.current?.abort();
    if (!userId) { setLoading(false); setOrders([]); return; }
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(""); setSessionExpired(false);
    try {
      const response = await apiClient.get(`/orders/user/${userId}`, { headers: buildAuthHeaders(), signal: controller.signal });
      if (!response.data.success || !Array.isArray(response.data.orders)) throw new Error();
      if (!controller.signal.aborted) { setOrders(response.data.orders.map(normalizeOrder)); setPage(1); }
    } catch (err) {
      if (!controller.signal.aborted) {
        setSessionExpired(err.response?.status === 401);
        setError(err.response?.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem đơn hàng." : "Chưa tải được đơn hàng. Vui lòng kiểm tra kết nối và thử lại.");
      }
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, [userId]);
  useEffect(() => { fetchOrders(); return () => request.current?.abort(); }, [fetchOrders]);
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    modal.current?.querySelector("button")?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "Tab") {
        const elements = [...modal.current.querySelectorAll('button:not(:disabled), a[href], select')];
        if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0]?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", onKey); opener.current?.focus(); };
  }, [selected]);
  const filtered = useMemo(() => orders.filter((order) => (tab === "all" || order.status === tab) && normalize([order.id, order.order_code, ...order.items.map((item) => item.name)].join(" ")).includes(normalize(search.trim()))), [orders, tab, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  const reset = () => { setSearch(""); setTab("all"); setPage(1); };
  const open = (order, event) => { opener.current = event.currentTarget; setSelected(order); setNewStatus(""); setUpdateMessage(""); };
  const updateStatus = async () => {
    if (saving || !newStatus || !selected) return;
    setSaving(true); setUpdateMessage("");
    try {
      const response = await apiClient.put(`/orders/${selected.id}/status`, { status: newStatus }, { headers: buildAuthHeaders() });
      if (!response.data.success) throw new Error();
      setOrders((previous) => previous.map((order) => order.id === selected.id ? { ...order, status: newStatus } : order));
      setSelected((previous) => previous?.id === selected.id ? { ...previous, status: newStatus } : previous); setNewStatus(""); setUpdateMessage("Đã cập nhật trạng thái đơn hàng.");
    } catch { setUpdateMessage("Chưa cập nhật được trạng thái. Vui lòng thử lại."); }
    finally { setSaving(false); }
  };
  const activeCount = orders.filter((order) => ["pending", "confirmed", "processing", "shipping"].includes(order.status)).length;

  return <main className="oh-page">
    <div className="oh-container">
      <nav className="oh-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><FiChevronRight aria-hidden="true" /><span>Đơn hàng</span></nav>
      <header className="oh-heading"><div><h1>Đơn hàng của tôi</h1><p>Theo dõi dịch vụ đã đặt và thông tin cho ngày trọng đại.</p></div><Link className="oh-button oh-button--outline" to="/sanpham">Khám phá dịch vụ <FiArrowRight aria-hidden="true" /></Link></header>
      <section className="oh-panel" aria-label="Đơn hàng đã đặt" ref={listTop}>
        {userId && <>
          <div className="oh-tabs" role="group" aria-label="Lọc trạng thái đơn hàng">{STATUSES.map((status) => <button key={status.id} type="button" aria-pressed={tab === status.id} onClick={() => { setTab(status.id); setPage(1); }}>{status.label}<span>{loading ? "–" : status.id === "all" ? orders.length : orders.filter((order) => order.status === status.id).length}</span></button>)}</div>
          <div className="oh-toolbar"><div className="oh-summary">{loading ? "Đang cập nhật đơn hàng…" : <><strong>{orders.length}</strong> đơn hàng <span>·</span> {activeCount} đơn đang thực hiện</>}</div><div className="oh-tools"><label className="oh-search"><FiSearch aria-hidden="true" /><input aria-label="Tìm mã đơn hoặc tên dịch vụ" placeholder="Tìm mã đơn, tên dịch vụ…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />{search && <button type="button" onClick={() => { setSearch(""); setPage(1); }} aria-label="Xóa tìm kiếm"><FiX /></button>}</label><button className="oh-refresh" type="button" onClick={fetchOrders} disabled={loading} aria-label="Làm mới đơn hàng" title="Làm mới đơn hàng"><FiRefreshCw className={loading ? "is-spinning" : ""} /></button></div></div>
        </>}
        {!userId ? <div className="oh-state"><span className="oh-state-icon"><FiPackage /></span><h2>Theo dõi đơn hàng của bạn</h2><p>Đăng nhập để xem dịch vụ đã đặt và trạng thái xử lý.</p><Link className="oh-button" to="/login">Đăng nhập</Link></div> : loading ? <div className="oh-skeletons" role="status" aria-label="Đang tải đơn hàng">{[1, 2, 3].map((item) => <div className="oh-skeleton" key={item}><span /><div><i /><i /></div></div>)}</div> : error ? <div className="oh-state" role="alert"><span className="oh-state-icon"><FiRefreshCw /></span><h2>Chưa tải được đơn hàng</h2><p>{error}</p>{sessionExpired ? <Link className="oh-button" to="/login">Đăng nhập lại</Link> : <button className="oh-button" type="button" onClick={fetchOrders}>Thử lại</button>}</div> : !filtered.length ? <div className="oh-state"><span className="oh-state-icon"><FiPackage /></span><h2>{orders.length ? "Không tìm thấy đơn phù hợp" : "Bạn chưa có đơn hàng"}</h2><p>{orders.length ? "Thử tìm mã đơn khác hoặc thay đổi trạng thái đang chọn." : "Các dịch vụ bạn đặt sẽ được hiển thị tại đây."}</p>{orders.length ? <button className="oh-button oh-button--outline" type="button" onClick={reset}>Xóa bộ lọc</button> : <Link className="oh-button" to="/sanpham">Tìm dịch vụ cho ngày cưới</Link>}</div> : <>
          <div className="oh-list">{visible.map((order) => {
            const item = order.items[0];
            return <article className="oh-order" key={order.id}>
              <div className="oh-order-header"><div><strong>{order.order_code || `Đơn #${order.id}`}</strong><span>Đặt ngày {date(order.created_at)}</span></div><Status value={order.status} /></div>
              <div className="oh-order-body"><div className="oh-product-image"><ProductImage item={item} /></div><div className="oh-order-info"><h2>{item?.name || "Gói dịch vụ cưới"}</h2><p className="oh-quantity">{item?.quantity ? `Số lượng: ${item.quantity}${item.selection?.unit ? ` ${item.selection.unit}` : ""}` : "Dịch vụ đã đặt"}{order.items.length > 1 && <span> và {order.items.length - 1} dịch vụ khác</span>}</p><div className="oh-meta">{order.event_date && <span><FiCalendar aria-hidden="true" />Ngày tổ chức: {date(order.event_date)}</span>}<span title={order.delivery_address || "Chưa cập nhật địa điểm"}><FiMapPin aria-hidden="true" />{order.delivery_address || "Chưa cập nhật địa điểm"}</span></div></div><div className="oh-order-total"><span>Tổng tiền</span><strong>{money(order.total_amount)}</strong><button className="oh-button oh-button--outline" type="button" onClick={(event) => open(order, event)}>Xem chi tiết <FiChevronRight aria-hidden="true" /></button></div></div>
            </article>;
          })}</div>
          <footer className="oh-list-footer"><span>Hiển thị {(currentPage - 1) * 6 + 1}–{Math.min(currentPage * 6, filtered.length)} trong {filtered.length} đơn hàng</span>{pages > 1 && <nav className="oh-pagination" aria-label="Phân trang đơn hàng"><button type="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); listTop.current?.scrollIntoView({ block: "start" }); }}>Trước</button><span>{currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => { setPage(currentPage + 1); listTop.current?.scrollIntoView({ block: "start" }); }}>Sau</button></nav>}</footer>
        </>}
      </section>
    </div>
    {selected && <div className="oh-overlay" onClick={() => setSelected(null)}><section className="oh-modal" role="dialog" aria-modal="true" aria-labelledby="oh-modal-title" ref={modal} onClick={(event) => event.stopPropagation()}>
      <header className="oh-modal-header"><div><p>Chi tiết đơn hàng</p><h2 id="oh-modal-title">{selected.order_code || `Đơn #${selected.id}`}</h2></div><button className="oh-icon-button" type="button" onClick={() => setSelected(null)} aria-label="Đóng chi tiết đơn hàng"><FiX /></button></header>
      <div className="oh-modal-status"><Status value={selected.status} /><span>Đặt lúc {date(selected.created_at, true)}</span></div>
      <div className="oh-detail-grid"><section><h3>Thông tin tổ chức</h3><dl><div><dt>Người đặt</dt><dd>{selected.customer_name || "Chưa cập nhật"}</dd></div><div><dt>Điện thoại</dt><dd>{selected.phone || "Chưa cập nhật"}</dd></div><div><dt>Ngày tổ chức</dt><dd>{date(selected.event_date)}</dd></div><div><dt>Địa điểm</dt><dd>{selected.delivery_address || "Chưa cập nhật"}</dd></div></dl></section><section><h3>Thông tin thanh toán</h3><dl><div><dt>Phương thức</dt><dd>{selected.payment_method === "cash" ? "Thanh toán khi bàn giao" : selected.payment_method === "bank_transfer" || selected.payment_method === "bank" ? "Chuyển khoản" : selected.payment_method || "Chưa cập nhật"}</dd></div><div><dt>Thanh toán</dt><dd>{({ paid: "Đã thanh toán", pending: "Chưa thanh toán", failed: "Thanh toán chưa thành công" })[selected.payment_status] || "Chưa cập nhật"}</dd></div></dl></section></div>
      <section className="oh-detail-services"><h3>Dịch vụ đã đặt <span>({selected.items.length})</span></h3>{selected.items.length ? selected.items.map((item, index) => <div className="oh-detail-item" key={index}><div className="oh-product-image"><ProductImage item={item} /></div><div><strong>{item.name}</strong>{item.selection?.package_name && <p>Gói: {item.selection.package_name}</p>}{item.selection?.color && <p>Tông màu: {item.selection.color}</p>}{item.selection?.event_date && <p>Ngày sử dụng: {date(item.selection.event_date)}</p>}{item.selection?.location && <p>Địa điểm: {item.selection.location}</p>}{item.selection?.note && <p>Ghi chú: {item.selection.note}</p>}{item.quantity && <p>Số lượng: {item.quantity}{item.selection?.unit ? ` ${item.selection.unit}` : ""}</p>}</div><span>{item.price === undefined ? "Đã ghi nhận" : money(item.price * item.quantity)}</span></div>) : <p className="oh-note">Chưa có chi tiết dịch vụ cho đơn này.</p>}</section>
      {selected.note && <section className="oh-detail-note"><h3>Ghi chú đơn hàng</h3><p>{selected.note}</p></section>}
      <div className="oh-detail-total"><span>Tổng tiền đơn hàng</span><strong>{money(selected.total_amount)}</strong></div>
      {isAdmin && <div className="oh-status-editor"><label htmlFor="oh-new-status">Cập nhật trạng thái</label><div><select id="oh-new-status" value={newStatus} onChange={(event) => setNewStatus(event.target.value)} disabled={saving}><option value="">Chọn trạng thái</option>{STATUSES.filter((item) => item.id !== "all").map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button className="oh-button" type="button" onClick={updateStatus} disabled={!newStatus || saving}>{saving ? "Đang lưu…" : "Lưu thay đổi"}</button></div>{updateMessage && <p role="status">{updateMessage}</p>}</div>}
      <footer className="oh-modal-footer"><Link className="oh-button" to={`/hoadon/${selected.id}`}>Xem hóa đơn</Link><button className="oh-button oh-button--outline" type="button" onClick={() => setSelected(null)}>Đóng</button></footer>
    </section></div>}
  </main>;
}

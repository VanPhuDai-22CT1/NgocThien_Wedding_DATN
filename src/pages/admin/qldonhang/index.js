import useAdminTheme from "component/AdminShell/useAdminTheme";

import { useEffect, useMemo, useRef, useState } from "react";

import { FaShoppingCart } from "react-icons/fa";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import { apiClient, buildAuthHeaders } from "utils/apiClient";


import { notify } from "utils/notify";
import "./style.scss";
import "./orders.scss";

const STATUS_OPTIONS = [
  { value: "pending", label: "Chờ xác nhận", className: "processing" },
  { value: "confirmed", label: "Đã xác nhận", className: "confirmed" },
  { value: "processing", label: "Đang xử lý", className: "processing" },
  { value: "shipping", label: "Đang giao", className: "shipping" },
  { value: "delivered", label: "Đã bàn giao sự kiện", className: "received" },
  { value: "cancelled", label: "Đã hủy", className: "cancelled" },
];

const LEGACY_STATUS_MAP = {
  pending: "pending",
  confirmed: "confirmed",
  processing: "processing",
  shipping: "shipping",
  delivering: "shipping",
  delivered: "delivered",
  completed: "delivered",
  cancelled: "cancelled",
  cancel: "cancelled",
  "dang xu ly": "processing",
  "dang giao": "shipping",
  "da giao su kien": "delivered",
  "da ban giao su kien": "delivered",
  "da nhan hang": "delivered",
  "huy don": "cancelled",
  "da huy": "cancelled",
};

const stripVietnameseMarks = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalizeOrderStatus = (status = "") => {
  const raw = String(status || "").trim().toLowerCase();
  const plain = stripVietnameseMarks(raw).toLowerCase();
  return LEGACY_STATUS_MAP[raw] || LEGACY_STATUS_MAP[plain] || raw || "processing";
};

const getStatusMeta = (status = "") => {
  const normalized = normalizeOrderStatus(status);
  return (
    STATUS_OPTIONS.find((item) => item.value === normalized) || {
      value: normalized,
      label: status || "Không xác định",
      className: "unknown",
    }
  );
};

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")} VNĐ`;

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : "-";

const formatPayment = (payment) => {
  const normalized = String(payment || "").trim().toLowerCase();
  if (normalized === "cash") return "Tiền mặt";
  if (["bank", "online", "transfer"].includes(normalized)) return "Chuyển khoản";
  return normalized ? payment : "Chưa chọn";
};
const paymentMeta = (status) => status === "paid" ? { label: "Đã thanh toán", tone: "paid" } : status === "failed" ? { label: "Thanh toán chưa thành công", tone: "failed" } : { label: "Chưa thanh toán", tone: "unpaid" };
const PAGE_SIZE = 10;

export default function OrderManagement() {


  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [pendingStatusByOrder, setPendingStatusByOrder] = useState({});
  const [darkMode] = useAdminTheme();
  const mutationBusy = useRef(false);



  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/legacy", {
        params: { action: "getOrders" },
        headers: buildAuthHeaders(),
      });

      if (!res.data?.success || !Array.isArray(res.data.orders)) throw new Error("Invalid orders response");
      const nextOrders = res.data.orders;
      setOrders(nextOrders);
      setLoaded(true);
      setError("");
      setPendingStatusByOrder(
        Object.fromEntries(
          nextOrders.map((order) => [order.order_id, normalizeOrderStatus(order.status)])
        )
      );
    } catch (err) {
      setError(err?.response?.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." : "Không thể tải đơn hàng. Vui lòng thử lại; dữ liệu hiện có vẫn được giữ lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);
  useEffect(() => { setPage(1); }, [search, filter, paymentFilter]);

  const updateStatus = async (orderId) => {
    const status = pendingStatusByOrder[orderId];
    if (!status || mutationBusy.current) return;

    mutationBusy.current = true;
    try {
      setSavingOrderId(orderId);
      const res = await apiClient.post(
        "/legacy",
        { action: "updateStatus", order_id: orderId, status },
        { headers: buildAuthHeaders() }
      );

      if (res.data?.success) {
        notify.success("Đã cập nhật trạng thái đơn hàng");
        await fetchOrders();
      } else {
        notify.info(res.data?.message || "Không thể cập nhật trạng thái");
      }
    } catch (err) {
      console.error("Update order status error:", err);
      notify.info(err?.response?.data?.message || "Lỗi cập nhật trạng thái");
    } finally {
      mutationBusy.current = false;
      setSavingOrderId(null);
    }
  };

  const deleteOrder = async (orderId) => {
    if (mutationBusy.current) return;
    if (!(await notify.confirm("Bạn có chắc muốn xóa đơn hàng này?"))) return;
    if (mutationBusy.current) return;

    mutationBusy.current = true;
    try {
      setSavingOrderId(orderId);
      const res = await apiClient.post(
        "/legacy",
        { action: "deleteOrder", order_id: orderId },
        { headers: buildAuthHeaders() }
      );

      if (res.data?.success) {
        notify.success("Đã xóa đơn hàng");
        await fetchOrders();
      } else {
        notify.info(res.data?.message || "Xóa thất bại");
      }
    } catch (err) {
      console.error("Delete order error:", err);
      notify.info(err?.response?.data?.message || "Lỗi khi xóa đơn hàng");
    } finally {
      mutationBusy.current = false;
      setSavingOrderId(null);
    }
  };

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        const status = normalizeOrderStatus(order.status);
        acc.total += 1;
        acc.revenue += Number(order.total || 0);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { total: 0, revenue: 0, pending: 0, confirmed: 0, processing: 0, shipping: 0, delivered: 0, cancelled: 0 }
    );
  }, [orders]);

  const visibleOrders = orders.filter((order) => (!filter || normalizeOrderStatus(order.status) === filter) && (!paymentFilter || (order.payment_status || "pending") === paymentFilter) && stripVietnameseMarks(`${order.order_id} ${order.order_code || ""} ${order.customer_name || ""} ${order.phone || ""} ${(order.details || []).map((item) => item.product_name).join(" ")}`).toLowerCase().includes(stripVietnameseMarks(search).trim().toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageOrders = visibleOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const clearFilters = () => { setSearch(""); setFilter(""); setPaymentFilter(""); };
  return (
    <div className={`admin-layout nt-order-page ${darkMode ? "dark" : ""}`}>
      <main className="admin-content">
        <div className="admin-header">
          <div><h1><FaShoppingCart /> Quản lý đơn hàng</h1><p className="subtitle">Theo dõi đơn đặt tiệc, thông tin khách hàng và tiến độ phục vụ.</p></div>
          <button className="btn-outline nt-order-refresh" type="button" onClick={fetchOrders} disabled={loading || savingOrderId !== null}><FiRefreshCw aria-hidden="true" />{loading ? "Đang tải…" : "Làm mới"}</button>
        </div>

        <div className="nt-order-metrics" aria-busy={loading}>
          {[
            ["Tổng đơn hàng", totals.total], ["Chờ xác nhận", totals.pending],
            ["Đang triển khai", totals.confirmed + totals.processing + totals.shipping],
            ["Đã hoàn tất", totals.delivered], ["Giá trị đơn hàng", formatMoney(totals.revenue)],
          ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{loaded ? value : "—"}</strong></div>)}
        </div>

        {error && <div className="nt-order-error" role="alert">{error}<button className="btn-outline" type="button" onClick={fetchOrders} disabled={loading}>Thử lại</button></div>}

        <section className="nt-order-list" aria-label="Danh sách đơn hàng">
          <div className="nt-order-tabs" aria-label="Lọc nhanh trạng thái">
            {[{ value: "", label: "Tất cả", count: totals.total }, ...STATUS_OPTIONS.filter(item => ["pending", "confirmed", "delivered", "cancelled"].includes(item.value)).map(item => ({ ...item, count: totals[item.value] }))].map(item =>
              <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}<span>{loaded ? item.count : "—"}</span></button>
            )}
          </div>
          <div className="nt-order-filters">
            <label className="nt-order-search"><span>Tìm đơn hàng</span><div><FiSearch aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Mã đơn, tên khách, số điện thoại…" /></div></label>
            <label><span>Trạng thái đơn</span><select aria-label="Trạng thái đơn" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Tất cả trạng thái</option>{STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label><span>Thanh toán</span><select aria-label="Thanh toán" value={paymentFilter} onChange={event => setPaymentFilter(event.target.value)}><option value="">Tất cả thanh toán</option><option value="pending">Chưa thanh toán</option><option value="paid">Đã thanh toán</option><option value="failed">Chưa thành công</option></select></label>
            <button type="button" className="btn-outline" onClick={clearFilters} disabled={!search && !filter && !paymentFilter}>Xóa bộ lọc</button>
          </div>

          <div className="nt-order-list-caption"><h2>Danh sách đơn hàng</h2><span aria-live="polite">{loaded ? `${visibleOrders.length} / ${orders.length} đơn hàng` : "Đang tải dữ liệu…"}</span></div>
          <div className="nt-order-columns" aria-hidden="true"><span>Mã đơn / Ngày đặt</span><span>Khách hàng</span><span>Dịch vụ / Giá trị</span><span>Trạng thái</span><span /></div>
          {loading && !loaded ? <div className="nt-order-empty" role="status">Đang tải đơn hàng…</div> : !loaded && error ? <div className="nt-order-empty">Chưa tải được dữ liệu. Nhấn “Thử lại” để kết nối lại.</div> : visibleOrders.length === 0 ?
            <div className="nt-order-empty"><FaShoppingCart aria-hidden="true" /><h3>{orders.length ? "Không tìm thấy đơn hàng phù hợp. Hãy thay đổi bộ lọc." : "Chưa có đơn hàng"}</h3><p>{orders.length ? "Thử tìm theo tên khách, mã đơn hoặc xóa bộ lọc hiện tại." : "Các yêu cầu đặt dịch vụ của khách sẽ xuất hiện tại đây."}</p></div> :
            <div className="nt-order-rows" aria-busy={loading}>
              {pageOrders.map(order => {
                const statusMeta = getStatusMeta(order.status);
                const payment = paymentMeta(order.payment_status);
                const selectedStatus = pendingStatusByOrder[order.order_id] || normalizeOrderStatus(order.status);
                const isDirty = selectedStatus !== normalizeOrderStatus(order.status);
                const isSaving = savingOrderId === order.order_id;
                const isBusy = savingOrderId !== null || loading;
                const details = Array.isArray(order.details) ? order.details : [];
                return <article className="order-card nt-order-record" key={order.order_id}>
                  <details className="nt-order-expand">
                    <summary className="nt-order-row" aria-label={`Xem chi tiết đơn hàng #${order.order_id}`}>
                      <div className="nt-order-ident"><strong>#{order.order_id}</strong><small>{formatDate(order.created_at)}</small></div>
                      <div className="nt-order-customer"><strong>{order.customer_name || "Khách lẻ"}</strong><small>{order.phone || "Chưa có số điện thoại"}</small></div>
                      <div className="nt-order-service"><span title={details[0]?.product_name}>{details[0]?.product_name || "Thông tin dịch vụ chưa cập nhật"}</span>{details.length > 1 && <small>+{details.length - 1} dịch vụ khác</small>}<strong>{formatMoney(order.total)}</strong></div>
                      <div className="order-card__title nt-order-state"><span className={`nt-order-badge ${statusMeta.value}`}>{statusMeta.label}</span><span className={`nt-order-payment ${payment.tone}`}>{payment.label}</span></div>
                      <span className="nt-order-expand-label"><FiChevronDown aria-hidden="true" /><small>Chi tiết</small></span>
                    </summary>
                    <div className="nt-order-detail">
                      <div className="nt-order-detail-grid">
                        <section><h3>Thông tin khách hàng</h3><dl><div><dt>Họ tên</dt><dd>{order.customer_name || "Khách lẻ"}</dd></div><div><dt>Điện thoại</dt><dd>{order.phone ? <a href={`tel:${order.phone}`}>{order.phone}</a> : "Chưa cập nhật"}</dd></div>{order.email && <div><dt>Email</dt><dd>{order.email}</dd></div>}<div><dt>Ngày tổ chức</dt><dd>{order.event_date ? new Date(`${String(order.event_date).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</dd></div><div><dt>Địa điểm</dt><dd>{order.delivery_address || "Chưa cập nhật"}</dd></div>{order.note && <div><dt>Ghi chú</dt><dd className="nt-order-note">{order.note}</dd></div>}</dl></section>
                        <section><h3>Thanh toán & đơn hàng</h3><dl>{order.order_code && <div><dt>Mã tham chiếu</dt><dd>{order.order_code}</dd></div>}<div><dt>Phương thức</dt><dd>{formatPayment(order.payment_method)}</dd></div><div><dt>Thanh toán</dt><dd><span className={`nt-order-payment ${payment.tone}`}>{payment.label}</span></dd></div><div><dt>Tổng giá trị</dt><dd className="nt-order-total">{formatMoney(order.total)}</dd></div><div><dt>Cập nhật</dt><dd>{formatDate(order.updated_at)}</dd></div></dl><p className="nt-order-payment-hint">Xác nhận đơn hàng không đồng nghĩa với xác nhận đã nhận tiền.</p></section>
                      </div>
                      <section className="nt-order-services"><h3>Dịch vụ trong đơn <span>({details.length})</span></h3>{details.length ? <ul>{details.map((item, index) => <li key={`${order.order_id}-${index}`}><span>{item.product_name || "Dịch vụ"}<small>Số lượng: {item.quantity || 1}</small></span><strong>{formatMoney(item.product_price)}<small>Đơn giá</small></strong></li>)}</ul> : <p>Chưa có thông tin chi tiết dịch vụ.</p>}</section>
                      <div className="nt-order-actions">
                        <label className="order-status"><span>Cập nhật trạng thái đơn</span><select value={selectedStatus} onChange={event => setPendingStatusByOrder(previous => ({ ...previous, [order.order_id]: event.target.value }))} disabled={isBusy}>{!STATUS_OPTIONS.some(item => item.value === selectedStatus) && <option value={selectedStatus}>{statusMeta.label}</option>}{STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                        <button className="btn-save-status" type="button" onClick={() => updateStatus(order.order_id)} disabled={!isDirty || isBusy}>{isSaving ? "Đang xử lý…" : "Lưu trạng thái"}</button>
                        <button className="btn-delete nt-order-delete" type="button" onClick={() => deleteOrder(order.order_id)} disabled={isBusy || normalizeOrderStatus(order.status) === "cancelled"}><FiTrash2 aria-hidden="true" />Xóa đơn</button>
                      </div>
                    </div>
                  </details>
                </article>;
              })}
            </div>
          }
          {visibleOrders.length > 0 && <nav className="nt-order-pagination" aria-label="Phân trang đơn hàng"><span>Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visibleOrders.length)} / {visibleOrders.length} đơn</span><div><button type="button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><FiChevronLeft /></button><span>Trang <strong>{currentPage}</strong> / {pageCount}</span><button type="button" aria-label="Trang sau" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><FiChevronRight /></button></div></nav>}
        </section>
      </main>
    </div>
  );
}

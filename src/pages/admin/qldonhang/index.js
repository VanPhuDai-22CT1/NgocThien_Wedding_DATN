import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBell,
  FaBox,
  FaChartPie,
  FaComments,
  FaHistory,
  FaMoon,
  FaRegCalendarAlt,
  FaShoppingCart,
  FaSignOutAlt,
  FaSun,
  FaUsers,
} from "react-icons/fa";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { getAuthItem, logoutAuthSession } from "utils/authStorage";
import { getDarkMode, setDarkModeStorage } from "utils/darkMode";
import { notify } from "utils/notify";
import "./style.scss";

const STATUS_OPTIONS = [
  { value: "processing", label: "Đang xử lý", className: "processing" },
  { value: "shipping", label: "Đang giao", className: "shipping" },
  { value: "delivered", label: "Đã bàn giao sự kiện", className: "received" },
  { value: "cancelled", label: "Đã hủy", className: "cancelled" },
];

const LEGACY_STATUS_MAP = {
  pending: "processing",
  confirmed: "processing",
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

export default function OrderManagement() {
  const navigate = useNavigate();
  const role = getAuthItem("role");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingOrderId, setSavingOrderId] = useState(null);
  const [pendingStatusByOrder, setPendingStatusByOrder] = useState({});
  const [darkMode, setDarkMode] = useState(() => getDarkMode());

  useEffect(() => {
    setDarkModeStorage(darkMode);
  }, [darkMode]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/legacy", {
        params: { action: "getOrders" },
        headers: buildAuthHeaders(),
      });

      const nextOrders = res.data?.success ? res.data.orders || [] : [];
      setOrders(nextOrders);
      setPendingStatusByOrder(
        Object.fromEntries(
          nextOrders.map((order) => [order.order_id, normalizeOrderStatus(order.status)])
        )
      );
    } catch (err) {
      console.error("Load orders error:", err);
      notify.info("Không thể tải đơn hàng");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId) => {
    const status = pendingStatusByOrder[orderId];
    if (!status) return;

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
      setSavingOrderId(null);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!(await notify.confirm("Bạn có chắc muốn xóa đơn hàng này?"))) return;

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
      { total: 0, revenue: 0, processing: 0, shipping: 0, delivered: 0, cancelled: 0 }
    );
  }, [orders]);

  return (
    <div className={`admin-layout ${darkMode ? "dark" : ""}`}>
      <aside className="sidebar">
        <div className="logo">
          <h1>NGỌC THIÊN ADMIN</h1>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard">
            <FaChartPie /> Tổng quan
          </NavLink>

          {role === "admin" && (
            <NavLink to="/qlnguoidung">
              <FaUsers /> Người dùng
            </NavLink>
          )}

          <NavLink to="/qlsanpham">
            <FaBox /> Dịch vụ
          </NavLink>

          <NavLink to="/qldonhang" className="active">
            <FaShoppingCart /> Đơn hàng
          </NavLink>

          <NavLink to="/qltinnhan">
            <FaComments /> Tin nhắn
          </NavLink>

          <NavLink to="/notification">
            <FaBell /> Lịch tư vấn
          </NavLink>

          <NavLink to="/lichlamviec">
            <FaRegCalendarAlt /> Lịch làm việc
          </NavLink>

          <NavLink to="/qlhoatdong">
            <FaHistory /> Lịch sử
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button onClick={() => logoutAuthSession("/")} className="logout-btn">
            <FaSignOutAlt /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-header">
          <div>
            <h2>
              <FaShoppingCart /> Quản lý đơn hàng
            </h2>
            <p className="subtitle">
              Theo dõi đơn đặt dịch vụ, xem chi tiết và cập nhật trạng thái xử lý cho khách.
            </p>
          </div>

          <div className="header-actions">
            <button
              className="dark-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title="Chế độ tối"
              type="button"
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>
            <button className="btn-back" onClick={() => navigate("/dashboard")} type="button">
              <FaArrowLeft /> Quay lại
            </button>
          </div>
        </div>

        <div className="order-summary">
          <div>
            <span>Tổng đơn</span>
            <b>{totals.total}</b>
          </div>
          <div>
            <span>Đang xử lý</span>
            <b>{totals.processing}</b>
          </div>
          <div>
            <span>Đang giao</span>
            <b>{totals.shipping}</b>
          </div>
          <div>
            <span>Hoàn tất</span>
            <b>{totals.delivered}</b>
          </div>
          <div>
            <span>Doanh thu</span>
            <b>{formatMoney(totals.revenue)}</b>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading">Đang tải đơn hàng...</div>
          ) : orders.length === 0 ? (
            <div className="empty">Không có đơn hàng</div>
          ) : (
            <div className="orders-scroll">
              {orders.map((order) => {
                const statusMeta = getStatusMeta(order.status);
                const selectedStatus =
                  pendingStatusByOrder[order.order_id] || normalizeOrderStatus(order.status);
                const isDirty = selectedStatus !== normalizeOrderStatus(order.status);
                const isSaving = savingOrderId === order.order_id;
                const details = Array.isArray(order.details) ? order.details : [];

                return (
                  <article className="order-card" key={order.order_id}>
                    <div className="order-card__top">
                      <div className="order-card__title">
                        <span className="id-badge">#{order.order_id}</span>
                        <span className={`status-badge ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <span className="money">{formatMoney(order.total)}</span>
                    </div>

                    <div className="order-card__meta">
                      <div>
                        <span>Ngày đặt</span>
                        <b>{formatDate(order.created_at)}</b>
                      </div>
                      <div>
                        <span>Cập nhật</span>
                        <b>{formatDate(order.updated_at)}</b>
                      </div>
                    </div>

                    <div className="order-card__customer">
                      <p>
                        <span>Khách hàng:</span>
                        <b>{order.customer_name || "Khách lẻ"}</b>
                      </p>
                      <p>
                        <span>Số điện thoại:</span>
                        <b>{order.phone || "-"}</b>
                      </p>
                      <p>
                        <span>Thanh toán:</span>
                        <b>{formatPayment(order.payment_method)}</b>
                      </p>
                      {order.note ? (
                        <p className="note-line" title={order.note}>
                          <span>Ghi chú:</span>
                          <b>{order.note}</b>
                        </p>
                      ) : null}
                    </div>

                    {details.length > 0 && (
                      <div className="order-card__details">
                        <span>Dịch vụ</span>
                        {details.map((item, index) => (
                          <p key={`${order.order_id}-${index}`}>
                            <b>{item.product_name || "Dịch vụ"}</b>
                            <em>
                              x{item.quantity || 1} - {formatMoney(item.product_price)}
                            </em>
                          </p>
                        ))}
                      </div>
                    )}

                    <div className="order-card__actions">
                      <div className="order-status">
                        <span>Đổi trạng thái</span>
                        <select
                          value={selectedStatus}
                          onChange={(e) =>
                            setPendingStatusByOrder((prev) => ({
                              ...prev,
                              [order.order_id]: e.target.value,
                            }))
                          }
                          disabled={isSaving}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        className="btn-save-status"
                        type="button"
                        onClick={() => updateStatus(order.order_id)}
                        disabled={!isDirty || isSaving}
                      >
                        {isSaving ? "Đang lưu..." : "Lưu trạng thái"}
                      </button>

                      <button
                        className="btn-delete"
                        type="button"
                        onClick={() => deleteOrder(order.order_id)}
                        disabled={isSaving || normalizeOrderStatus(order.status) === "cancelled"}
                      >
                        Xóa
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

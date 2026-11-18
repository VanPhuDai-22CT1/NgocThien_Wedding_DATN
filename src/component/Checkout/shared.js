import { Link } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiChevronRight, FiPackage } from "react-icons/fi";
import { getAuthItem } from "utils/authStorage";
import { getImageUrl, getProductImage } from "utils/image";
import ServiceSelection from "component/ServiceSelection";
import { minBookingDate } from "utils/bookingRules";
import "./style.scss";

export const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
export const dateLabel = (value) => {
  if (!value) return "Chưa cập nhật";
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+07:00` : value);
  return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa cập nhật";
};
export { minBookingDate };
export const parseSelection = (raw) => { try { const value = typeof raw === "string" ? JSON.parse(raw) : raw; return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } };
export const normalizeCart = (items) => (Array.isArray(items) ? items : []).map((item) => ({ ...item, quantity: Number(item.quantity || 1), price: Number(item.price || 0), selection: parseSelection(item.selection) }));
export const cartTotal = (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);
export const validCart = (items) => items.length > 0 && items.every((item) => Number.isFinite(item.price) && item.price > 0 && Number.isSafeInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999);
export const readCheckout = () => {
  try {
    const draft = JSON.parse(sessionStorage.getItem("wedding_pending_checkout") || "null");
    const owner = getAuthItem("user_id") || "guest";
    return draft && (draft.ownerId === owner || draft.ownerId === "guest") ? draft : null;
  } catch { return null; }
};
export const saveCheckout = (data) => { try { sessionStorage.setItem("wedding_pending_checkout", JSON.stringify({ ...data, ownerId: getAuthItem("user_id") || "guest" })); return true; } catch { return false; } };
export const restoreCheckout = (routeState) => {
  const saved = readCheckout();
  if (!Array.isArray(routeState?.cartItems)) return saved;
  const signature = (items) => JSON.stringify(normalizeCart(items).map((item) => [item.id, item.productId || item.product_id, item.quantity, item.selection]));
  return saved && signature(saved.cartItems) === signature(routeState.cartItems) ? saved : routeState;
};
export const validateBooking = (form) => {
  const errors = {};
  if (!form.name?.trim()) errors.name = "Vui lòng nhập họ và tên.";
  if (String(form.name || "").length > 255) errors.name = "Họ tên tối đa 255 ký tự.";
  if (!/^(?:0\d{9}|\+84\d{9})$/.test(String(form.phone || "").replace(/[\s().-]/g, ""))) errors.phone = "Nhập số điện thoại Việt Nam hợp lệ (10 số hoặc +84).";
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Địa chỉ email chưa hợp lệ.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.eventDate || "") || !Number.isFinite(new Date(`${form.eventDate}T12:00:00+07:00`).getTime()) || form.eventDate < minBookingDate()) errors.eventDate = "Chọn ngày tổ chức cách hôm nay ít nhất 3 ngày.";
  if (!form.location?.trim()) errors.location = "Vui lòng nhập địa điểm tổ chức.";
  return errors;
};
export const BANK = { bin: process.env.REACT_APP_BANK_BIN?.trim() || "", bankName: process.env.REACT_APP_BANK_NAME?.trim() || "", account: process.env.REACT_APP_BANK_ACCOUNT?.trim() || "", name: process.env.REACT_APP_BANK_ACCOUNT_NAME?.trim() || "" };
export const bankConfigured = /^\d{6}$/.test(BANK.bin) && /^\d{4,30}$/.test(BANK.account) && !!BANK.name;
const depositPercent = Number(process.env.REACT_APP_BANK_DEPOSIT_PERCENT);
export const depositRate = process.env.REACT_APP_BANK_DEPOSIT_PERCENT?.trim() && depositPercent > 0 && depositPercent <= 100 ? depositPercent / 100 : null;
export const orderStatus = (status) => ({ pending: "Chờ xác nhận", confirmed: "Đã xác nhận", processing: "Đang chuẩn bị", shipping: "Đang bàn giao", delivered: "Đã bàn giao", cancelled: "Đã hủy" })[status] || status || "Chưa cập nhật";
export const paymentStatus = (status) => ({ paid: "Đã thanh toán", pending: "Chưa thanh toán", failed: "Thanh toán chưa thành công" })[status] || "Chưa cập nhật";

export function CheckoutLayout({ step, title, description, children }) {
  return <main className="cx-page"><div className="cx-container"><nav className="cx-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><FiChevronRight aria-hidden="true" /><Link to="/giohang">Gói đã chọn</Link>{step > 1 && <><FiChevronRight aria-hidden="true" /><span>{step === 2 ? "Thông tin tổ chức" : "Thanh toán"}</span></>}</nav><div className="cx-heading"><h1>{title}</h1><p>{description}</p></div><ol className="cx-steps" aria-label="Các bước đặt dịch vụ">{["Giỏ hàng", "Thông tin tổ chức", "Thanh toán"].map((name, index) => <li key={name} aria-current={step === index + 1 ? "step" : undefined} className={step > index + 1 ? "is-complete" : ""}><span>{step > index + 1 ? <FiCheck aria-hidden="true" /> : index + 1}</span><strong>{name}</strong></li>)}</ol>{children}</div></main>;
}
export function EmptyState({ title = "Bạn chưa chọn dịch vụ", message = "Khám phá các lựa chọn phù hợp cho ngày trọng đại.", action }) {
  return <div className="cx-panel cx-empty"><span className="cx-empty-icon"><FiPackage /></span><h2>{title}</h2><p>{message}</p>{action || <Link className="cx-button" to="/sanpham">Khám phá dịch vụ</Link>}</div>;
}
export function ItemImage({ item }) {
  return <img className="cx-item-image" src={getImageUrl(getProductImage(item))} alt="" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getImageUrl(null); }} />;
}
export function OrderSummary({ items, children }) {
  return <aside className="cx-panel cx-summary"><h2>Dịch vụ đã chọn <span>({items.length})</span></h2><div className="cx-summary-items">{items.map((item) => <div className="cx-summary-item" key={item.id}><ItemImage item={item} /><div><strong>{item.name}</strong><p>{item.quantity} {item.unit || item.selection?.unit || "gói"} <span>× {money(item.price)}</span></p><details><summary>Tùy chọn dịch vụ</summary><ServiceSelection selection={item.selection} /></details></div><b>{money(item.price * item.quantity)}</b></div>)}</div><div className="cx-total"><span>Tổng tiền tạm tính</span><strong>{money(cartTotal(items))}</strong></div>{children}<p className="cx-fineprint">Hạng mục, chi phí cuối cùng và lịch phục vụ được Ngọc Thiện xác nhận khi tiếp nhận yêu cầu.</p></aside>;
}
export function BackLink({ to = "/giohang", children = "Quay lại giỏ hàng" }) { return <Link className="cx-back" to={to}><FiArrowLeft aria-hidden="true" />{children}</Link>; }

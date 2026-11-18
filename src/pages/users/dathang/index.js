import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import { getAuthItem } from "utils/authStorage";
import { getGuestCart } from "utils/guestCart";
import { apiClient } from "utils/apiClient";
import { BackLink, CheckoutLayout, EmptyState, OrderSummary, minBookingDate, normalizeCart, restoreCheckout, saveCheckout, validCart, validateBooking } from "component/Checkout/shared";

const emptyForm = { name: "", phone: "", email: "", eventDate: "", location: "", note: "" };
export default function BookingPage() {
  const location = useLocation(); const navigate = useNavigate(); const userId = getAuthItem("user_id");
  const initial = useRef(restoreCheckout(location.state));
  const [items, setItems] = useState(() => normalizeCart(initial.current?.cartItems));
  const [form, setForm] = useState(() => ({ ...emptyForm, ...initial.current?.bookingForm }));
  const [errors, setErrors] = useState({}); const [loading, setLoading] = useState(!initial.current?.cartItems); const [error, setError] = useState("");
  const [reload, setReload] = useState(0); const [storageError, setStorageError] = useState(false); const formRef = useRef(null);
  useEffect(() => {
    let stopped = false; const controller = new AbortController();
    const load = async () => {
      if (!initial.current?.cartItems) {
        setLoading(true); setError("");
        try {
          let cart = getGuestCart();
          if (userId) { const response = await apiClient.get("/cart", { signal: controller.signal }); if (!response.data.success) throw new Error(); cart = response.data.data; }
          if (!stopped) { const next = normalizeCart(cart); setItems(next); const details = next[0]?.selection || {}; setForm((previous) => ({ ...previous, eventDate: previous.eventDate || details.event_date || "", location: previous.location || details.location || "", note: previous.note || details.note || "" })); }
        } catch { if (!stopped) setError("Chưa tải được dịch vụ đã chọn. Vui lòng thử lại."); }
        finally { if (!stopped) setLoading(false); }
      }
      if (userId) {
        try { const response = await apiClient.get("/auth/me", { signal: controller.signal }); if (!stopped && response.data.success) { const user = response.data.data || {}; setForm((previous) => ({ ...previous, name: previous.name || user.full_name || user.username || "", email: previous.email || user.email || "", phone: previous.phone || user.phone || "" })); } } catch { /* User can enter contact details directly. */ }
      }
    };
    load(); return () => { stopped = true; controller.abort(); };
  }, [userId, reload]);
  useEffect(() => { if (items.length) setStorageError(!saveCheckout({ cartItems: items, bookingForm: form })); }, [form, items]);
  const change = (event) => { const { name, value } = event.target; setForm((previous) => ({ ...previous, [name]: value })); setErrors((previous) => ({ ...previous, [name]: "" })); };
  const submit = (event) => {
    event.preventDefault(); const nextErrors = validateBooking(form); setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { formRef.current?.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus(); return; }
    if (items.some((item) => item.selection?.event_date && item.selection.event_date < minBookingDate())) { setError("Ngày sử dụng của dịch vụ trong giỏ phải cách hôm nay ít nhất 3 ngày. Vui lòng quay lại giỏ hàng, mở dịch vụ và chọn lại ngày."); return; }
    if (!validCart(items)) { setError("Có dịch vụ cần cập nhật giá hoặc số lượng. Vui lòng kiểm tra lại giỏ hàng."); return; }
    const data = { cartItems: items, bookingForm: Object.fromEntries(Object.entries(form).map(([key, value]) => [key, String(value).trim()])) };
    saveCheckout(data); navigate("/thanhtoan", { state: data });
  };
  const field = (name, label, type = "text", attributes = {}) => <div className={`cx-field${name === "location" || name === "note" ? " cx-field--wide" : ""}`} ><label htmlFor={`cx-${name}`}>{label}{["name", "phone", "eventDate", "location"].includes(name) && <b aria-hidden="true"> *</b>}</label>{name === "note" ? <textarea id={`cx-${name}`} name={name} rows={3} value={form[name]} onChange={change} maxLength={2000} /> : <input id={`cx-${name}`} name={name} type={type} value={form[name]} onChange={change} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `cx-error-${name}` : name === "eventDate" ? "cx-date-help" : undefined} {...attributes} />}{errors[name] && <small className="cx-field-error" id={`cx-error-${name}`}>{errors[name]}</small>}{name === "eventDate" && <small id="cx-date-help">Ngày tổ chức cách hôm nay ít nhất 3 ngày.</small>}</div>;
  return <CheckoutLayout step={2} title="Thông tin tổ chức" description="Điền thông tin để Ngọc Thiện chuẩn bị phương án phù hợp cho bạn.">
    {loading ? <div className="cx-panel cx-loading" role="status">Đang tải thông tin…</div> : error && !items.length ? <EmptyState title="Chưa tải được thông tin" message={error} action={<button className="cx-button" type="button" onClick={() => setReload((value) => value + 1)}>Thử lại</button>} /> : !items.length ? <EmptyState /> : <div className="cx-grid"><form className="cx-panel cx-booking" onSubmit={submit} noValidate ref={formRef}><div className="cx-section-heading"><h2>Thông tin liên hệ & ngày tổ chức</h2><p>Các trường có dấu * là bắt buộc.</p></div>{error && <p className="cx-alert" role="alert">{error}</p>}{storageError && <p className="cx-alert">Trình duyệt chưa lưu được bản nháp. Hãy giữ trang này mở trong khi nhập.</p>}<div className="cx-fields">{field("name", "Họ và tên", "text", { autoComplete: "name", maxLength: 255 })}{field("phone", "Số điện thoại", "tel", { autoComplete: "tel", maxLength: 20 })}{field("email", "Email", "email", { autoComplete: "email", maxLength: 100 })}{field("eventDate", "Ngày tổ chức", "date", { min: minBookingDate() })}{field("location", "Địa điểm tổ chức", "text", { autoComplete: "street-address", maxLength: 500, placeholder: "Số nhà, đường, phường/xã, tỉnh/thành phố" })}{field("note", "Ghi chú và mong muốn riêng")}</div><div className="cx-form-footer"><BackLink /><button className="cx-button" type="submit">Tiếp tục thanh toán <FiArrowRight aria-hidden="true" /></button></div></form><OrderSummary items={items}><p className="cx-inline-note">Lịch phục vụ được kiểm tra khi gửi yêu cầu và cần được nhân viên xác nhận.</p></OrderSummary></div>}
  </CheckoutLayout>;
}

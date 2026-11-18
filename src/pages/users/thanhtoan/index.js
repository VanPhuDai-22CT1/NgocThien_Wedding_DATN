import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCreditCard, FiDollarSign } from "react-icons/fi";
import { getAuthItem } from "utils/authStorage";
import { apiClient } from "utils/apiClient";
import { removeGuestCartItem } from "utils/guestCart";
import BankTransferCard from "component/Checkout/BankTransferCard";
import { CheckoutLayout, EmptyState, OrderSummary, bankConfigured, cartTotal, dateLabel, normalizeCart, restoreCheckout, saveCheckout, validCart, validateBooking } from "component/Checkout/shared";

export default function PaymentPage() {
  const location = useLocation(); const navigate = useNavigate(); const userId = getAuthItem("user_id");
  const data = useRef(restoreCheckout(location.state));
  const items = normalizeCart(data.current?.cartItems); const form = data.current?.bookingForm;
  const [method, setMethod] = useState("cash"); const [sending, setSending] = useState(false); const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    if (!userId) {
      if (data.current) saveCheckout(data.current);
      navigate("/login?returnTo=%2Fthanhtoan", { replace: true });
    } else if (data.current) saveCheckout(data.current);
  }, [userId, navigate]);
  const cleanup = async () => {
    const purchased = items.filter((item) => !String(item.id).startsWith("direct-"));
    if (!purchased.length) return;
    const current = await apiClient.get("/cart"); if (!current.data.success) throw new Error();
    const fields = ["package_id", "color", "event_date", "location", "note"];
    for (const bought of purchased) {
      const line = current.data.data?.find((item) => String(item.id) === String(bought.id) || (Number(item.productId) === Number(bought.productId || bought.product_id) && fields.every((field) => (item.selection?.[field] || "") === (bought.selection?.[field] || ""))));
      if (!line) continue;
      const remaining = Number(line.quantity) - bought.quantity;
      const response = remaining > 0 ? await apiClient.put(`/cart/${line.id}`, { quantity: remaining }) : await apiClient.delete(`/cart/${line.id}`);
      if (!response.data.success) throw new Error();
    }
    purchased.filter((item) => String(item.id).startsWith("guest-")).forEach((item) => removeGuestCartItem(item.id));
  };
  const submit = async () => {
    if (lock.current || !userId) return;
    if (!form || Object.keys(validateBooking(form)).length) { setError("Thông tin tổ chức chưa hợp lệ. Vui lòng quay lại chỉnh sửa."); return; }
    if (!validCart(items)) { setError("Dịch vụ hoặc số lượng chưa hợp lệ. Vui lòng kiểm tra lại giỏ hàng."); return; }
    lock.current = true; setSending(true); setError("");
    try {
      const response = await apiClient.post("/orders", {
        items: items.map((item) => ({ product_id: Number(item.productId || item.product_id), quantity: item.quantity, selection: item.selection })),
        payment_method: method, delivery_address: form.location, phone: form.phone, email: form.email,
        customer_name: form.name, event_date: form.eventDate, note: form.note || "",
      });
      const orderId = response.data?.data?.order_id;
      if (!response.data.success) { setError(response.data.message || "Chưa gửi được yêu cầu. Vui lòng kiểm tra lại thông tin."); lock.current = false; setSending(false); return; }
      if (!Number.isSafeInteger(Number(orderId)) || Number(orderId) <= 0) throw new Error("Chưa xác nhận được mã đơn. Vui lòng kiểm tra mục Đơn hàng trước khi gửi lại.");
      let cartWarning = "";
      try { await cleanup(); } catch { cartWarning = "Yêu cầu đã được tiếp nhận, nhưng giỏ hàng chưa đồng bộ. Vui lòng kiểm tra đơn hàng trước khi đặt lại."; }
      try { sessionStorage.removeItem("wedding_pending_checkout"); } catch { /* Order has already been accepted by the API. */ }
      navigate(`/hoadon/${orderId}`, { replace: true, state: { orderNotice: { message: "Đã tiếp nhận yêu cầu đặt dịch vụ. Ngọc Thiện sẽ liên hệ tư vấn và xác nhận lịch phục vụ." }, cartWarning } });
    } catch (err) { setError(err.response?.data?.message || (err.message?.startsWith("Chưa xác nhận") ? err.message : "Chưa xác nhận được kết quả. Kiểm tra kết nối và mục Đơn hàng trước khi thử lại.")); lock.current = false; setSending(false); }
  };
  if (!userId) return <CheckoutLayout step={3} title="Thanh toán" description="Đăng nhập để tiếp tục yêu cầu đặt dịch vụ."><div className="cx-panel cx-loading" role="status">Đang chuyển đến trang đăng nhập…</div></CheckoutLayout>;
  return <CheckoutLayout step={3} title="Kiểm tra & thanh toán" description="Kiểm tra thông tin và chọn phương thức thanh toán phù hợp.">
    {!form || !items.length ? <EmptyState title="Chưa có thông tin đặt dịch vụ" message="Quay lại giỏ hàng để chọn dịch vụ và nhập thông tin tổ chức." action={<Link className="cx-button" to="/giohang">Về giỏ hàng</Link>} /> : <div className="cx-grid"><div className="cx-payment-main"><section className="cx-panel cx-contact"><div className="cx-section-heading"><h2>Thông tin tổ chức</h2><button className="cx-text-button" type="button" disabled={sending} onClick={() => navigate("/dathang", { state: { cartItems: items, bookingForm: form } })}>Chỉnh sửa</button></div><dl className="cx-details"><div><dt>Người đặt</dt><dd>{form.name}</dd></div><div><dt>Điện thoại</dt><dd>{form.phone}</dd></div>{form.email && <div><dt>Email</dt><dd>{form.email}</dd></div>}<div><dt>Ngày tổ chức</dt><dd>{dateLabel(form.eventDate)}</dd></div><div><dt>Địa điểm</dt><dd>{form.location}</dd></div>{form.note && <div><dt>Ghi chú</dt><dd>{form.note}</dd></div>}</dl></section>
      <section className="cx-panel cx-methods"><h2>Phương thức thanh toán</h2><label className={`cx-method ${method === "cash" ? "is-active" : ""}`}><input type="radio" name="payment_method" value="cash" checked={method === "cash"} disabled={sending} onChange={() => setMethod("cash")} /><FiDollarSign aria-hidden="true" /><span><strong>Thanh toán trực tiếp</strong><small>Trao đổi và thanh toán với nhân viên khi chốt dịch vụ.</small></span></label><label className={`cx-method ${method === "bank" ? "is-active" : ""}`}><input type="radio" name="payment_method" value="bank" checked={method === "bank"} disabled={sending} onChange={() => setMethod("bank")} /><FiCreditCard aria-hidden="true" /><span><strong>Chuyển khoản ngân hàng</strong><small>{bankConfigured ? "Hiển thị mã QR và thông tin tài khoản doanh nghiệp." : "Nhân viên sẽ cung cấp thông tin chuyển khoản khi tiếp nhận yêu cầu."}</small></span></label><p className="cx-inline-note">Chọn phương thức thanh toán chưa có nghĩa tiền đã được nhận. Trạng thái được cập nhật sau khi xác nhận giao dịch.</p></section>
      {method === "bank" && <BankTransferCard total={cartTotal(items)} />}
      <Link className="cx-back" to="/dathang" state={{ cartItems: items, bookingForm: form }}><FiArrowLeft aria-hidden="true" />Quay lại thông tin tổ chức</Link>
    </div><OrderSummary items={items}>{error && <div className="cx-alert" role="alert">{error}<Link to="/donhang">Kiểm tra đơn hàng</Link></div>}<button className="cx-button cx-button--full" type="button" disabled={sending || !validCart(items)} onClick={submit}>{sending ? "Đang gửi yêu cầu…" : <>Gửi yêu cầu đặt dịch vụ <FiArrowRight aria-hidden="true" /></>}</button></OrderSummary></div>}
  </CheckoutLayout>;
}

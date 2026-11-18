import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight, FiMinus, FiPlus, FiTrash2 } from "react-icons/fi";
import { getAuthItem } from "utils/authStorage";
import { apiClient } from "utils/apiClient";
import { getGuestCart, removeGuestCartItem, saveGuestCart } from "utils/guestCart";
import ServiceSelection from "component/ServiceSelection";
import { BackLink, CheckoutLayout, EmptyState, ItemImage, OrderSummary, money, normalizeCart, readCheckout, saveCheckout, validCart } from "component/Checkout/shared";

function Quantity({ item, disabled, onChange }) {
  const [value, setValue] = useState(String(item.quantity));
  const [error, setError] = useState("");
  useEffect(() => { setValue(String(item.quantity)); }, [item.quantity]);
  const commit = async () => {
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 999) { setError("Nhập số lượng từ 1 đến 999."); setValue(String(item.quantity)); return; }
    setError(""); if (Number(value) !== item.quantity && !await onChange(Number(value))) setValue(String(item.quantity));
  };
  return <div><div className="cx-quantity"><button type="button" aria-label={`Giảm số lượng ${item.name}`} disabled={disabled || item.quantity <= 1} onClick={() => { setError(""); onChange(item.quantity - 1); }}><FiMinus /></button><input inputMode="numeric" aria-label={`Số lượng ${item.name}`} aria-invalid={!!error} value={value} disabled={disabled} onChange={(event) => { setValue(event.target.value); setError(""); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /><button type="button" aria-label={`Tăng số lượng ${item.name}`} disabled={disabled || item.quantity >= 999} onClick={() => { setError(""); onChange(item.quantity + 1); }}><FiPlus /></button></div>{error && <p className="cx-field-error" role="alert">{error}</p>}</div>;
}
export default function CartPage() {
  const navigate = useNavigate(); const userId = getAuthItem("user_id");
  const [items, setItems] = useState([]); const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const fetchCart = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let cart = getGuestCart();
      if (userId) { const response = await apiClient.get("/cart", { params: { userid: userId } }); if (!response.data.success || !Array.isArray(response.data.data)) throw new Error(); cart = response.data.data; }
      const normalized = normalizeCart(cart); setItems(normalized); setSelected(normalized.map((item) => String(item.id)));
    } catch { setError("Chưa tải được giỏ hàng. Vui lòng kiểm tra kết nối và thử lại."); }
    finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { fetchCart(); }, [fetchCart]);
  const mutate = async (item, quantity) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (userId) {
        const response = quantity === null ? await apiClient.delete(`/cart/${item.id}`) : await apiClient.put(`/cart/${item.id}`, { quantity });
        if (!response.data.success) throw new Error();
      }
      const next = quantity === null ? items.filter((entry) => entry.id !== item.id) : items.map((entry) => entry.id === item.id ? { ...entry, quantity } : entry);
      if (!userId) { if (quantity === null) removeGuestCartItem(item.id); else saveGuestCart(next); }
      setItems(next); if (quantity === null) setSelected((previous) => previous.filter((id) => id !== String(item.id))); return true;
    } catch (err) { setError(err.response?.data?.message || "Chưa cập nhật được giỏ hàng. Nội dung hiện tại vẫn được giữ lại."); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const chosen = items.filter((item) => selected.includes(String(item.id)));
  const checkout = () => {
    if (busy || !validCart(chosen)) return;
    const previous = readCheckout()?.bookingForm || {}; const details = chosen[0].selection;
    const data = { cartItems: chosen, bookingForm: { ...previous, eventDate: details.event_date || previous.eventDate || "", location: details.location || previous.location || "", note: details.note || previous.note || "" } };
    saveCheckout(data); navigate("/dathang", { state: data });
  };
  return <CheckoutLayout step={1} title="Giỏ hàng của bạn" description="Chọn dịch vụ và kiểm tra thông tin trước khi đặt.">
    {loading ? <div className="cx-panel cx-loading" role="status">Đang tải giỏ hàng…</div> : error && !items.length ? <EmptyState title="Chưa tải được giỏ hàng" message={error} action={<button className="cx-button" type="button" onClick={fetchCart}>Thử lại</button>} /> : !items.length ? <EmptyState /> : <div className="cx-grid">
      <section className="cx-panel cx-cart-list"><div className="cx-section-heading"><label className="cx-check"><input type="checkbox" checked={selected.length === items.length} onChange={(event) => setSelected(event.target.checked ? items.map((item) => String(item.id)) : [])} /><span>Chọn tất cả <small>({items.length} dịch vụ)</small></span></label></div>
        {error && <p className="cx-alert" role="alert">{error}</p>}
        {items.map((item) => <article className="cx-cart-item" key={item.id}><input className="cx-item-check" type="checkbox" checked={selected.includes(String(item.id))} aria-label={`Chọn ${item.name}`} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, String(item.id)] : previous.filter((id) => id !== String(item.id)))} /><ItemImage item={item} /><div className="cx-cart-info"><Link className="cx-product-name" to={`/chitietsanpham/${item.productId || item.product_id}`}>{item.name}</Link><ServiceSelection selection={item.selection} /><div className="cx-unit-price">{item.price > 0 ? <>{money(item.price)} <span>/{item.unit || item.selection.unit || "gói"}</span></> : "Cần liên hệ báo giá"}</div><div className="cx-cart-controls"><Quantity item={item} disabled={busy} onChange={(quantity) => mutate(item, quantity)} /><button type="button" className="cx-remove" disabled={busy} onClick={() => mutate(item, null)}><FiTrash2 aria-hidden="true" />Xóa</button></div></div><strong className="cx-line-price">{item.price > 0 ? money(item.price * item.quantity) : "Liên hệ báo giá"}</strong></article>)}
        <div className="cx-panel-footer"><BackLink to="/sanpham">Tiếp tục chọn dịch vụ</BackLink></div>
      </section>
      <OrderSummary items={chosen}><button className="cx-button cx-button--full" type="button" onClick={checkout} disabled={busy || !validCart(chosen)}>Tiếp tục đặt dịch vụ <FiArrowRight aria-hidden="true" /></button>{!chosen.length && <p className="cx-inline-note">Chọn ít nhất một dịch vụ để tiếp tục.</p>}{chosen.some((item) => item.price <= 0) && <p className="cx-field-error">Có dịch vụ cần báo giá hoặc cập nhật tùy chọn. Vui lòng mở chi tiết để chọn lại.</p>}</OrderSummary>
    </div>}
  </CheckoutLayout>;
}

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { apiClient } from "utils/apiClient";
import { getImageUrl } from "utils/image";
import { normalizeText, todayVietnam } from "utils/weddingCatalog";
import "./style.scss";

export const WeddingCard = ({ product }) => {
  const title = product.name.replace(/\s*[–—]\s*Dịch Vụ Nấu Ăn.*$/iu, "").trim();
  const excerpt = String(product.shortDescription || "")
    .replace(/^[\p{Lu}\p{M}\d &–—,:/()-]{10,}?(?=\p{Lu}\p{Ll})/u, "")
    .replace(/^mô tả chi tiết\s*/iu, "")
    .replace(/([.!?])(?=\p{Lu})/gu, "$1 ").replace(/\s+/g, " ").trim();
  const category = product.category === "Dịch vụ khác" && /thuc don|nau an/.test(normalizeText(product.name)) ? "Ẩm thực tiệc cưới" : product.category;
  const hasPrice = Number(product.price) > 0;
  return (
  <article className="wc-card">
    <Link className="wc-card-photo" to={`/chitietsanpham/${product.id}`} aria-label={`Xem ${product.name}`}>
      <img src={product.images[0]} alt={product.name} loading="lazy" decoding="async" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getImageUrl(null); }} />
      {product.demo && <span className="wc-sample-tag">Mẫu minh họa</span>}
    </Link>
    <div className="wc-card-copy">
      <span className="wc-category">{category}</span>
      <h3><Link to={`/chitietsanpham/${product.id}`} title={product.name} aria-label={product.name}>{title}</Link></h3>
      {excerpt && <p>{excerpt}</p>}
      <div className="wc-card-bottom"><div className="wc-card-price"><strong>{hasPrice ? `${Number(product.price).toLocaleString("vi-VN")} ₫` : "Liên hệ báo giá"}</strong>{hasPrice && <span>/ {product.unit}</span>}</div><Link to={`/chitietsanpham/${product.id}`} aria-label={`Xem chi tiết ${product.name}`}>Chi tiết<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-5-5 5 5-5 5" /></svg></Link></div>
    </div>
  </article>
  );
};

export function CatalogDialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = ref.current?.querySelectorAll('button:not([disabled]), input, select, textarea, a[href]');
        if (!elements?.length) return;
        const first = elements[0]; const last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", handleKey); previous?.focus?.(); };
  }, []);
  return createPortal(
    <div className="wc-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`wc-modal ${wide ? "wc-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="wc-dialog-title" tabIndex={-1} ref={ref}>
        <div className="wc-modal-head"><h2 id="wc-dialog-title">{title}</h2><button type="button" className="wc-close" aria-label="Đóng cửa sổ" onClick={onClose}>×</button></div>
        {children}
      </section>
    </div>, document.body
  );
}

export function QuoteDialog({ product, selection = {}, intent = "quote", onClose }) {
  const [form, setForm] = useState({ name: "", phone: "", event_date: selection.event_date || "", location: selection.location || "", scale: String(selection.quantity || ""), note: [selection.package_name ? `Loại gói: ${selection.package_name}` : "", selection.note].filter(Boolean).join("\n"), color: selection.color || "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const title = intent === "quote" ? "Yêu cầu báo giá" : "Liên hệ tư vấn";
  const change = (event) => { const { name, value } = event.target; setForm((prev) => ({ ...prev, [name]: value })); setErrors((prev) => ({ ...prev, [name]: "" })); };
  const submit = async (event) => {
    event.preventDefault();
    if (status === "sending") return;
    const next = {};
    if (!form.name.trim()) next.name = "Vui lòng nhập họ và tên.";
    if (!/^(?:0\d{9}|\+84\d{9})$/.test(form.phone.replace(/[\s.()-]/g, ""))) next.phone = "Nhập số điện thoại Việt Nam hợp lệ (10 số hoặc +84).";
    if (!form.event_date || form.event_date < todayVietnam()) next.event_date = "Chọn ngày tổ chức từ hôm nay trở đi.";
    if (!form.location.trim()) next.location = "Vui lòng nhập địa điểm tổ chức.";
    if (!form.scale.trim()) next.scale = "Vui lòng nhập số lượng hoặc quy mô dự kiến.";
    setErrors(next);
    if (Object.keys(next).length) { setTimeout(() => document.querySelector(`[name="${Object.keys(next)[0]}"]`)?.focus(), 0); return; }
    setMessage("");
    if (product.demo) { setStatus("demo"); return; }
    setStatus("sending");
    try {
      const response = await apiClient.post("/consultations/quote", { product_id: Number(product.id), intent, ...form, phone: form.phone.replace(/[\s.()-]/g, "") });
      if (!response.data.success) throw new Error("Không thể gửi yêu cầu.");
      setStatus("success");
    } catch (error) {
      setStatus("error"); setErrors(error.response?.data?.errors || {});
      setMessage(error.response?.data?.message || "Không thể kết nối máy chủ. Nội dung của bạn vẫn được giữ lại, vui lòng thử lại.");
    }
  };
  const field = (name, label, type = "text", placeholder = "") => <label className="wc-field" key={name}>{label} <span aria-hidden="true">*</span><input name={name} type={type} value={form[name]} onChange={change} placeholder={placeholder} min={type === "date" ? todayVietnam() : undefined} maxLength={name === "name" ? 120 : name === "phone" ? 24 : 250} aria-required="true" aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `quote-${name}-error` : undefined} autoComplete={name === "name" ? "name" : name === "phone" ? "tel" : "off"} />{errors[name] && <small id={`quote-${name}-error`} className="wc-field-error">{errors[name]}</small>}</label>;
  return <CatalogDialog title={title} onClose={() => { if (status !== "sending") onClose(); }}>
    <div className="wc-quote-product"><img src={product.images[0]} alt="" /><div><strong>{product.name}</strong><p>{product.demo ? "Mẫu và giá minh họa · Biểu mẫu demo" : "Yêu cầu tư vấn, chưa xác nhận đặt dịch vụ"}</p></div></div>
    {status === "success" ? <div className="wc-confirmation" role="status"><span aria-hidden="true">✓</span><h3>Đã tiếp nhận yêu cầu</h3><p>Đã tiếp nhận yêu cầu báo giá. Chúng tôi sẽ liên hệ để tư vấn và xác nhận lịch phục vụ.</p><p>Yêu cầu này chưa phải đơn đặt dịch vụ đã được xác nhận.</p><button className="wc-button" onClick={onClose}>Hoàn tất</button></div> : <form onSubmit={submit} noValidate>
      {product.demo && <p className="wc-notice">Chế độ demo: không gửi hoặc lưu yêu cầu thật. Thông tin mẫu và giá chỉ dùng để minh họa.</p>}
      <div className="wc-form-grid">{field("name", "Họ và tên")}{field("phone", "Số điện thoại", "tel")}{field("event_date", "Ngày tổ chức", "date")}{field("scale", "Số lượng / quy mô", "text", "Ví dụ: 20 bàn, 150 khách")}</div>
      {field("location", "Địa điểm tổ chức", "text", "Địa chỉ, xã / phường, tỉnh / thành")}
      {form.color && <p>Tông màu mong muốn: <strong>{form.color}</strong></p>}
      <label className="wc-field">Ghi chú và mong muốn riêng<textarea name="note" value={form.note} onChange={change} rows={3} maxLength={2000} placeholder="Phong cách yêu thích, không gian, ngân sách dự kiến…" /></label>
      {message && <p className="wc-field-error" role="alert">{message}</p>}
      {status === "demo" && <p className="wc-notice" role="status">Đã tạo bản xem trước yêu cầu cho mẫu minh họa. Không có yêu cầu thật nào được gửi hoặc lưu.</p>}
      <p className="wc-form-note">Chúng tôi sẽ trao đổi về nhu cầu và kiểm tra lịch phục vụ trước khi xác nhận. Các trường * là bắt buộc.</p>
      <button className="wc-button wc-submit" disabled={status === "sending"}>{status === "sending" ? "Đang gửi yêu cầu…" : product.demo ? "Xem trước yêu cầu demo" : "Gửi yêu cầu"}</button>
    </form>}
  </CatalogDialog>;
}

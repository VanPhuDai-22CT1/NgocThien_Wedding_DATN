import ProductReviews from "component/WeddingCatalog/ProductReviews";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "utils/apiClient";
import { getAuthItem } from "utils/authStorage";
import { getImageUrl } from "utils/image";
import { minBookingDate } from "utils/bookingRules";
import { addGuestCartItem } from "utils/guestCart";
import { SAMPLE_PRODUCTS, normalizeProduct, formatPrice } from "utils/weddingCatalog";
import { CatalogDialog, QuoteDialog, WeddingCard } from "component/WeddingCatalog";
import ProductDescription from "component/WeddingCatalog/ProductDescription";
import "./style.scss";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [quote, setQuote] = useState(null);
  const [selection, setSelection] = useState({ package_id: "", color: "", event_date: "", location: "", note: "" });
  const [quantity, setQuantity] = useState("1");
  const [errors, setErrors] = useState({});
  const [reviews, setReviews] = useState([]);
  const [cartStatus, setCartStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const fieldsRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setProduct(null); setRelated([]); setReviews([]);
    setSelectedImage(0); setQuote(null); setZoom(false); setCartStatus(null);
    setQuantity("1"); setErrors({});
    const load = async () => {
      try {
        let current; let catalog;
        if (id.startsWith("mau-")) { current = SAMPLE_PRODUCTS.find((p) => p.id === id); catalog = SAMPLE_PRODUCTS; }
        else {
          const [detail, list] = await Promise.all([
            apiClient.get(`/products/${encodeURIComponent(id)}`, { signal: controller.signal }),
            apiClient.get("/legacy", { params: { action: "getProducts" }, signal: controller.signal }).catch(() => null),
          ]);
          if (!detail.data.success || !detail.data.data) throw new Error("Missing product");
          current = normalizeProduct(detail.data.data); catalog = (list?.data?.data || []).map(normalizeProduct);
          if (!controller.signal.aborted) setReviews(detail.data.data.ProductReviews || []);
        }
        if (controller.signal.aborted) return;
        if (!current) { setError("Mẫu bạn tìm không còn trong danh mục."); return; }
        setProduct(current);
        setSelection({ package_id: "", color: current.colors[0] || "", event_date: "", location: "", note: "" });
        setRelated(catalog.filter((p) => p.category === current.category && p.id !== current.id).slice(0, 3));
      } catch (err) {
        if (!controller.signal.aborted) setError(err.response?.status === 404 ? "Không tìm thấy sản phẩm này." : "Không thể tải chi tiết. Vui lòng kiểm tra kết nối và thử lại.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [id, retry]);

  const packages = product?.packages || [];
  const selectedPackage = packages.find((item) => item.id === selection.package_id);
  const price = Number(packages.length ? selectedPackage?.price : product?.price) || 0;
  const unit = selectedPackage?.unit || product?.unit;
  const change = (event) => {
    const { name, value } = event.target;
    setSelection((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" })); setCartStatus(null);
  };
  const validate = () => {
    const next = {};
    if (packages.length && !selectedPackage) next.package_id = "Vui lòng chọn loại gói.";
    if (product.colors.length && !product.colors.includes(selection.color)) next.color = "Vui lòng chọn tông màu.";
    if (!Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 999) next.quantity = "Nhập số lượng nguyên từ 1 đến 999.";
    if (!selection.event_date || selection.event_date < minBookingDate()) next.event_date = "Chọn ngày tổ chức cách hôm nay ít nhất 3 ngày.";
    if (!selection.location.trim()) next.location = "Vui lòng nhập địa điểm tổ chức.";
    setErrors(next);
    if (Object.keys(next).length) {
      fieldsRef.current?.querySelector(`[name="${Object.keys(next)[0]}"]`)?.focus();
      return false;
    }
    return true;
  };
  const purchase = async (intent) => {
    if (savingRef.current || !validate() || product.demo || !(price > 0)) return;
    const details = { ...selection, package_name: selectedPackage?.name || "", location: selection.location.trim(), note: selection.note.trim() };
    const item = { productId: Number(product.id), name: product.name, price, unit, cover: product.images[0], quantity: Number(quantity), selection: details };
    savingRef.current = true; setSaving(true); setCartStatus(null);
    try {
      if (intent === "buy") {
        navigate("/dathang", { state: { cartItems: [{ ...item, id: `direct-${product.id}` }], bookingForm: { eventDate: details.event_date, location: details.location, note: details.note } } });
      } else {
        if (getAuthItem("token")) {
          const response = await apiClient.post("/cart", { productId: item.productId, quantity: item.quantity, selection: details });
          if (!response.data.success) throw new Error(response.data.message);
        } else addGuestCartItem(item, item.quantity);
        setCartStatus({ success: true, message: "Đã thêm sản phẩm cùng tùy chọn và thông tin tổ chức vào giỏ hàng." });
      }
    } catch (err) { setCartStatus({ success: false, message: err.response?.data?.message || err.message || "Không thể thêm vào giỏ. Vui lòng thử lại." }); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const submitReview = async (rating, comment) => {
    const response = await apiClient.post("/reviews", { productId: Number(product.id), rating, comment });
    if (!response.data.success || !response.data.data) throw new Error("Review not saved");
    const saved = response.data.data;
    setReviews((previous) => [saved, ...previous.filter((review) => review.id !== saved.id)]);
  };
  const fieldError = (name) => errors[name] && <small className="wc-field-error" id={`detail-${name}-error`}>{errors[name]}</small>;
  const fieldProps = (name) => ({ name, value: selection[name], onChange: change, "aria-invalid": !!errors[name], "aria-describedby": errors[name] ? `detail-${name}-error` : undefined });
  const imageError = (event) => { event.currentTarget.onerror = null; if (!event.currentTarget.src.endsWith(getImageUrl(null))) event.currentTarget.src = getImageUrl(null); };

  if (loading) return <div className="wedding-catalog wc-state" role="status">Đang tải chi tiết sản phẩm…</div>;
  if (error || !product) return <div className="wedding-catalog wc-state" role="alert"><h1>Chưa thể mở sản phẩm</h1><p>{error}</p><button className="wc-button" onClick={() => setRetry(retry + 1)}>Thử lại</button><Link to="/sanpham">Trở về sản phẩm</Link></div>;
  return <div className="wedding-catalog wc-detail-page">
    <div className="wc-detail-shell">
      <nav className="wc-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span>/</span><Link to={product.demo ? "/sanpham?source=demo" : "/sanpham"}>Sản phẩm</Link><span>/</span><span>{product.name}</span></nav>
      {product.demo && <p className="wc-notice">Mẫu, hình ảnh và giá minh họa. Biểu mẫu chạy ở chế độ demo và không gửi yêu cầu thật.</p>}
      <div className="wc-detail-top">
        <section className="wc-gallery" aria-label="Bộ ảnh sản phẩm">
          <button className="wc-main-photo" onClick={() => setZoom(true)} aria-label="Phóng to ảnh sản phẩm"><img src={product.images[selectedImage]} alt={`${product.name} – ảnh ${selectedImage + 1}`} onError={imageError} /><span>Phóng to ↗</span></button>
          <div className="wc-thumbnails">{product.images.map((image, index) => <button key={`${image}-${index}`} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={selectedImage === index} onClick={() => setSelectedImage(index)}><img src={image} alt="" loading="lazy" onError={imageError} /></button>)}</div>
          <p className="wc-gallery-note">Mỗi không gian, một dấu ấn ngày chung đôi.</p>
        </section>
        <section className="wc-detail-summary">
          <Link className="wc-category" to={`/sanpham?${product.demo ? "source=demo&" : ""}category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
          <h1>{product.name}</h1>
          <div className="wc-detail-price" aria-live="polite">{packages.length && !selectedPackage ? "Chọn gói để xem giá" : formatPrice({ price, unit })}</div>
          {product.demo && <p className="wc-price-note">Giá minh họa, không phải báo giá chính thức.</p>}
          <p className="wc-detail-intro">{product.shortDescription}</p>
          <div ref={fieldsRef} className="wc-detail-options">
            {packages.length > 0 && <label className="wc-field">Loại gói *<select {...fieldProps("package_id")}><option value="">Chọn loại gói</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{fieldError("package_id")}</label>}
            <div className="wc-detail-field-grid">
              {product.colors.length > 0 && <label className="wc-field">Tông màu *<select {...fieldProps("color")}>{product.colors.map((item) => <option key={item}>{item}</option>)}</select>{fieldError("color")}</label>}
              <label className="wc-field">Số lượng ({unit}) *<input type="number" name="quantity" min={1} max={999} step={1} value={quantity} onChange={(event) => { setQuantity(event.target.value); setErrors((prev) => ({ ...prev, quantity: "" })); }} aria-invalid={!!errors.quantity} aria-describedby={errors.quantity ? "detail-quantity-error" : undefined} />{fieldError("quantity")}</label>
              <label className="wc-field">Ngày tổ chức *<input type="date" min={minBookingDate()} {...fieldProps("event_date")} />{fieldError("event_date")}</label>
            </div>
            <label className="wc-field">Địa điểm tổ chức *<input type="text" maxLength={500} placeholder="Địa chỉ tổ chức lễ hoặc tiệc cưới" {...fieldProps("location")} />{fieldError("location")}</label>
            <label className="wc-field">Ghi chú và mong muốn riêng<textarea rows={3} maxLength={2000} placeholder="Quy mô, phong cách và các yêu cầu của bạn…" {...fieldProps("note")} /></label>
          </div>
          {price > 0 && <p className="wc-detail-total">Tạm tính <strong>{(price * (Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0 && Number(quantity) <= 999 ? Number(quantity) : 0)).toLocaleString("vi-VN")} ₫</strong></p>}
          <div className="wc-detail-actions">
            {!product.demo && (price > 0 || (packages.length > 0 && !selectedPackage)) ? <><button className="wc-button" disabled={saving} onClick={() => purchase("cart")}>{saving ? "Đang xử lý…" : "Thêm vào giỏ hàng"}</button><button className="wc-button" disabled={saving} onClick={() => purchase("buy")}>Đặt ngay</button></> : <button className="wc-button" onClick={() => setQuote("quote")}>Yêu cầu báo giá</button>}
            <button className="wc-button wc-button-outline" onClick={() => setQuote("consultation")}>Liên hệ tư vấn</button>
          </div>
          {cartStatus && <p className={`wc-cart-feedback ${cartStatus.success ? "" : "is-error"}`} role={cartStatus.success ? "status" : "alert"}>{cartStatus.message} {cartStatus.success && <Link to="/giohang">Xem giỏ hàng →</Link>}</p>}
          <p className="wc-calendar-note">Lịch phục vụ sẽ được kiểm tra và xác nhận sau khi tiếp nhận yêu cầu.</p>
          <div className="wc-detail-assurance"><span>Thiết kế theo không gian</span><span>Tư vấn trước khi chốt lịch</span></div>
        </section>
      </div>
      <div className="wc-detail-information"><ProductDescription content={product.descriptionContent || product.description || product.shortDescription} /><div className="wc-detail-info-grid"><section><h3>Hạng mục bao gồm</h3><ul>{product.included.map((item) => <li key={item}>{item}</li>)}</ul></section><section><h3>Chi phí phát sinh</h3><ul>{product.excluded.map((item) => <li key={item}>{item}</li>)}</ul></section></div><section className="wc-terms"><h3>Chính sách thuê và lắp đặt</h3><p>{product.terms}</p></section></div>
      <ProductReviews key={product.id} product={product} reviews={reviews} onSubmit={submitReview} />
      {related.length > 0 && <section className="wc-related"><div><h2>Sản phẩm liên quan</h2><Link className="wc-text-link" to={product.demo ? "/sanpham?source=demo" : "/sanpham"}>Khám phá thêm</Link></div><div className="wc-grid">{related.map((item) => <WeddingCard key={item.id} product={item} />)}</div></section>}
    </div>
    {quote && <QuoteDialog key={`${id}-${quote}`} product={product} selection={{ ...selection, quantity, package_name: selectedPackage?.name || "" }} intent={quote} onClose={() => setQuote(null)} />}
    {zoom && <CatalogDialog title={product.name} onClose={() => setZoom(false)} wide><img className="wc-zoom-image" src={product.images[selectedImage]} onError={imageError} alt={`${product.name} – ảnh phóng to`} /><div className="wc-zoom-actions"><button className="wc-button wc-button-outline" disabled={selectedImage === 0} onClick={() => setSelectedImage(selectedImage - 1)}>Ảnh trước</button><span>{selectedImage + 1} / {product.images.length}</span><button className="wc-button wc-button-outline" disabled={selectedImage === product.images.length - 1} onClick={() => setSelectedImage(selectedImage + 1)}>Ảnh sau</button></div></CatalogDialog>}
  </div>;
};
export default ProductDetail;

import { useEffect, useMemo, useRef, useState } from "react";
import { FiArrowUpRight, FiClock, FiFilePlus, FiPackage, FiRefreshCw, FiSearch, FiSend, FiStar, FiX } from "react-icons/fi";
import { getImageUrl, getProductImage } from "utils/image";
import { productCategory, quickProductPrice } from "utils/quickProducts";
import "./quick-products.scss";

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
export default function QuickProductPanel({ products, loading, error, onReload, onClose, recipient, userOrigin, busy, favoriteIds, recentIds, onToggleFavorite, onSend, onInsert }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [sendingId, setSendingId] = useState("");
  const [notice, setNotice] = useState(null);
  const localBusy = useRef(false);
  const alive = useRef(true);
  const searchField = useRef(null);
  const panel = useRef(null);
  useEffect(() => { alive.current = true; if (window.matchMedia("(min-width: 701px)").matches) searchField.current?.focus(); return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const outside = event => { if (!panel.current?.contains(event.target) && !event.target.closest?.('[data-quick-product-trigger]')) onClose(); };
    document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside);
  }, [onClose]);
  const selected = products.find(product => String(product.id) === selectedId);
  const categories = [...new Set(products.map(productCategory))];
  const favoritesCount = products.filter(product => favoriteIds.includes(String(product.id))).length;
  const recentCount = products.filter(product => recentIds.includes(String(product.id))).length;
  const visible = useMemo(() => products.filter(product => (!category || productCategory(product) === category) && (tab === "all" || (tab === "favorites" ? favoriteIds : recentIds).includes(String(product.id))) && normalize(`${product.id} ${product.name} ${productCategory(product)}`).includes(normalize(search))).sort((a, b) => tab === "recent" ? recentIds.indexOf(String(a.id)) - recentIds.indexOf(String(b.id)) : 0), [products, category, tab, favoriteIds, recentIds, search]);
  const send = async product => {
    if (busy || localBusy.current) return;
    localBusy.current = true; setSendingId(String(product.id)); setNotice(null);
    try {
      const result = await onSend(product);
      if (alive.current) setNotice({ success: result, text: result ? `Đã gửi “${product.name}”.` : "Chưa xác nhận gửi được sản phẩm. Bạn có thể thử lại." });
    } finally { localBusy.current = false; if (alive.current) setSendingId(""); }
  };
  const locked = busy || Boolean(sendingId);
  const insert = product => { if (!onInsert(product)) setNotice({ success: false, text: "Tin nhắn sau khi chèn vượt quá 2.000 ký tự. Hãy rút gọn bản nháp trước." }); };
  const imageFallback = event => { event.currentTarget.onerror = null; event.currentTarget.src = getImageUrl(null); };

  return <section className="nt-quick-products" id="nt-quick-products-panel" ref={panel} aria-label="Sản phẩm gửi nhanh" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); } }}>
    <header><div><h3><FiPackage aria-hidden="true" />Sản phẩm gửi nhanh</h3><p>Gửi cho <strong>{recipient}</strong></p></div><div><button type="button" aria-label="Làm mới danh mục sản phẩm" onClick={onReload} disabled={loading || locked}><FiRefreshCw /></button><button type="button" aria-label="Đóng sản phẩm gửi nhanh" onClick={onClose}><FiX /></button></div></header>
    <div className="nt-quick-product-filters"><label><FiSearch aria-hidden="true" /><input ref={searchField} aria-label="Tìm sản phẩm gửi nhanh" placeholder="Tìm sản phẩm, dịch vụ hoặc mã…" value={search} onChange={event => setSearch(event.target.value)} /></label><select aria-label="Danh mục sản phẩm gửi nhanh" value={category} onChange={event => setCategory(event.target.value)}><option value="">Tất cả danh mục</option>{categories.map(name => <option key={name} value={name}>{name}</option>)}</select></div>
    <nav className="nt-quick-product-tabs" aria-label="Nhóm sản phẩm gửi nhanh">{[["all", "Tất cả", products.length, FiPackage], ["favorites", "Hay gửi", favoritesCount, FiStar], ["recent", "Gần đây", recentCount, FiClock]].map(([id, label, count, Icon]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}><Icon aria-hidden="true" />{label}<span>{count}</span></button>)}</nav>
    {error && <div className="nt-quick-product-error" role="alert">{error}<button type="button" disabled={loading} onClick={onReload}>Thử lại</button></div>}
    <div className="nt-quick-product-list" aria-busy={loading}>{loading && !products.length ? <p className="nt-quick-product-empty" role="status">Đang tải sản phẩm…</p> : !visible.length ? <div className="nt-quick-product-empty"><FiPackage aria-hidden="true" /><strong>{search || category ? "Không tìm thấy sản phẩm phù hợp" : tab === "favorites" ? "Chưa có sản phẩm hay gửi" : tab === "recent" ? "Chưa có sản phẩm gửi gần đây" : error ? "Chưa tải được sản phẩm" : "Chưa có sản phẩm"}</strong><p>{tab === "favorites" && !search && !category ? "Nhấn ngôi sao ở sản phẩm để tạo danh sách riêng." : tab === "recent" && !search && !category ? "Sản phẩm gửi thành công từ công cụ trên thiết bị này sẽ xuất hiện tại đây." : "Thử thay đổi tìm kiếm hoặc danh mục."}</p></div> : visible.map(product => <article className={`nt-quick-product${selectedId === String(product.id) ? " is-selected" : ""}`} key={product.id}><button type="button" className="nt-quick-product-main" aria-label={`Chọn sản phẩm ${product.name}`} aria-pressed={selectedId === String(product.id)} onClick={() => { setSelectedId(String(product.id)); setNotice(null); }}><img src={getImageUrl(getProductImage(product))} alt="" loading="lazy" onError={imageFallback} /><span><strong>{product.name}</strong><small>{productCategory(product)} · #{product.id}</small><b>{quickProductPrice(product)}</b></span></button><div className="nt-quick-product-actions"><button type="button" className={favoriteIds.includes(String(product.id)) ? "is-favorite" : ""} aria-label={`${favoriteIds.includes(String(product.id)) ? "Bỏ" : "Thêm"} sản phẩm ${product.name} ${favoriteIds.includes(String(product.id)) ? "khỏi" : "vào"} mục hay gửi`} aria-pressed={favoriteIds.includes(String(product.id))} onClick={() => onToggleFavorite(product.id)}><FiStar /></button><button type="button" className="nt-quick-product-send" aria-label={`Gửi nhanh sản phẩm ${product.name}`} onClick={() => send(product)} disabled={locked}><FiSend aria-hidden="true" />{sendingId === String(product.id) ? "Đang gửi…" : "Gửi"}</button></div></article>)}</div>
    <footer>{notice && <p className={notice.success ? "nt-quick-product-notice" : "nt-quick-product-error"} role={notice.success ? "status" : "alert"}>{notice.text}</p>}{selected ? <><div className="nt-quick-product-selected"><span>Đang chọn</span><strong>{selected.name}</strong><a href={`${userOrigin}/chitietsanpham/${selected.id}`} target="_blank" rel="noopener noreferrer">Xem chi tiết <FiArrowUpRight aria-hidden="true" /></a></div><div className="nt-quick-product-footer-actions"><button type="button" onClick={() => insert(selected)} disabled={locked}><FiFilePlus aria-hidden="true" />Chèn vào ô chat</button><button type="button" onClick={() => send(selected)} disabled={locked}><FiSend aria-hidden="true" />Gửi sản phẩm</button></div></> : <p className="nt-quick-product-tip">Nhấn “Gửi” để gửi ngay hoặc chọn sản phẩm để chèn vào lời tư vấn.</p>}</footer>
  </section>;
}

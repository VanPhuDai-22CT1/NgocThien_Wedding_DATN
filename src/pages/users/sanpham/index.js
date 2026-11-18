import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiClient } from "utils/apiClient";
import { CATEGORIES, COLORS, SAMPLE_PRODUCTS, normalizeProduct, normalizeText } from "utils/weddingCatalog";
import { WeddingCard } from "component/WeddingCatalog";
import HeroSlideshow from "component/WeddingCatalog/HeroSlideshow";
import CatalogSelect from "component/WeddingCatalog/CatalogSelect";
import "./style.scss";

const PAGE_SIZE = 9;
const ProductList = () => {
  const [params, setParams] = useSearchParams();
  const contentRef = useRef(null);
  useEffect(() => {
    const content = contentRef.current;
    const header = document.querySelector(".header__main");
    if (!content || !header) return;
    const measure = () => content.style.setProperty("--catalog-header-height", `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const demo = params.get("source") === "demo";
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const color = params.get("color") || "";
  const price = params.get("price") || "";
  const sort = params.get("sort") || "newest";
  const change = (name, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value); else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next, { replace: name === "search" });
  };
  const fetchProducts = useCallback(async (signal) => {
    setLoading(true); setError("");
    try {
      const response = await apiClient.get("/legacy", { params: { action: "getProducts" }, signal });
      if (!response.data.success || !Array.isArray(response.data.data)) throw new Error("Invalid catalog");
      setProducts(response.data.data.map(normalizeProduct));
    } catch (err) {
      if (!signal?.aborted) setError("Không thể tải dịch vụ. Vui lòng kiểm tra kết nối và thử lại.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController(); fetchProducts(controller.signal);
    return () => controller.abort();
  }, [demo, fetchProducts]);
  const matches = useMemo(() => {
    const source = demo ? SAMPLE_PRODUCTS : products;
    const selected = source.filter((product) => {
      const matchesCategory = !category || product.category === category || String(product.category_id) === category || normalizeText(product.name).includes(normalizeText(category));
      const amount = Number(product.price);
      return matchesCategory && (!search || normalizeText(`${product.name} ${product.category} ${product.description}`).includes(normalizeText(search))) && (!color || product.colors.includes(color)) &&
        (!price || (price === "quote" ? !(amount > 0) : amount > 0 && (price === "under5" ? amount < 5000000 : price === "5to10" ? amount >= 5000000 && amount <= 10000000 : amount > 10000000)));
    });
    return selected.sort((a, b) => {
      if (sort === "price-up" || sort === "price-down") {
        if (!(a.price > 0)) return b.price > 0 ? 1 : 0;
        if (!(b.price > 0)) return -1;
        return sort === "price-up" ? a.price - b.price : b.price - a.price;
      }
      return (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0) || String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
    });
  }, [products, demo, search, category, color, price, sort]);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const rawPage = Number(params.get("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, pages) : 1;
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || category || color || price;
  return <div className="wedding-catalog wc-list-page">
    <section className="wc-hero">
      <div className="wc-hero-copy"><nav className="wc-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span>/</span><span>Sản phẩm</span></nav><h1>Sản phẩm &amp;<br />dịch vụ cưới hỏi</h1><p>Khám phá những lựa chọn giúp ngày trọng đại của bạn trở nên trọn vẹn.</p><a className="wc-hero-cta" href="#catalog-results"><span>Tìm mẫu cho ngày cưới</span><span className="wc-hero-cta-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m-6-6 6 6 6-6" /></svg></span></a></div>
      <HeroSlideshow />
    </section>
    <section ref={contentRef} className="wc-content" id="catalog-results">
      <div className="wc-source-tabs" aria-label="Nguồn danh sách"><button className={!demo ? "is-active" : ""} aria-pressed={!demo} onClick={() => { const next = new URLSearchParams(); setParams(next); }}>Danh mục hiện có</button><button className={demo ? "is-active" : ""} aria-pressed={demo} onClick={() => setParams({ source: "demo" })}>8 mẫu minh họa</button></div>
      {demo && <p className="wc-notice">Bạn đang xem 8 mẫu và giá minh họa. Hình ảnh chỉ minh họa phong cách; biểu mẫu ở chế độ demo, không gửi yêu cầu thật.</p>}
      <div className="wc-catalog-layout">
        <aside className="wc-filters">
          <button className="wc-mobile-filter" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}>Bộ lọc {hasFilters ? "•" : ""}<span>{filtersOpen ? "−" : "+"}</span></button>
          <div className={`wc-filter-body ${filtersOpen ? "is-open" : ""}`}>
            <div className="wc-filter-heading"><h2>Tìm lựa chọn phù hợp</h2><button onClick={() => setParams(demo ? { source: "demo" } : {})}>Xóa bộ lọc</button></div>
            <CatalogSelect label="Danh mục" value={category} onChange={(value) => change("category", value)} options={[{ value: "", label: "Tất cả danh mục" }, ...[...CATEGORIES, "Dịch vụ khác", ...(category && ![...CATEGORIES, "Dịch vụ khác"].includes(category) ? [category] : [])].map((item) => ({ value: item, label: item }))]} />
            <CatalogSelect label="Khoảng giá" value={price} onChange={(value) => change("price", value)} options={[
              { value: "", label: "Tất cả khoảng giá" },
              { value: "under5", label: "Dưới 5 triệu đồng" },
              { value: "5to10", label: "5 – 10 triệu đồng" },
              { value: "over10", label: "Trên 10 triệu đồng" },
              { value: "quote", label: "Liên hệ báo giá" },
            ]} />
            <fieldset className="wc-color-filter"><legend>Tông màu</legend><label><input type="radio" name="color" checked={!color} onChange={() => change("color", "")} />Tất cả tông màu</label>{COLORS.map((item, index) => <label key={item}><input type="radio" name="color" checked={color === item} onChange={() => change("color", item)} /><span className={`wc-color wc-color-${index}`} />{item}</label>)}</fieldset>
            <p className="wc-filter-help">Tìm hiểu thêm về chúng tôi<br /><Link to="/gioithieu">Ngọc Thiện Wedding</Link></p>
          </div>
        </aside>
        <div className="wc-results">
          <div className="wc-results-toolbar">
            {(demo || (!loading && !error)) && <p className="wc-result-count" aria-live="polite">{matches.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, matches.length)} trong ${matches.length} lựa chọn` : "0 lựa chọn"}{hasFilters && <button onClick={() => setParams(demo ? { source: "demo" } : {})}>Xóa bộ lọc</button>}</p>}
            <div className="wc-search-row"><label className="wc-search"><span className="wc-sr-only">Tìm sản phẩm</span><input type="search" placeholder="Tìm sản phẩm, dịch vụ…" value={search} onChange={(e) => change("search", e.target.value)} /><span aria-hidden="true">⌕</span></label><label className="wc-sort"><span className="wc-sr-only">Sắp xếp</span><select aria-label="Sắp xếp" value={sort} onChange={(e) => change("sort", e.target.value)}><option value="newest">Mới nhất</option><option value="price-up">Giá tăng dần</option><option value="price-down">Giá giảm dần</option></select></label></div>
          </div>
          {!demo && loading ? <div className="wc-state" role="status">Đang tải những lựa chọn dành cho bạn…</div> : !demo && error ? <div className="wc-state" role="alert"><h2>Danh sách tạm thời chưa tải được</h2><p>{error}</p><button className="wc-button" onClick={() => fetchProducts()}>Thử lại</button></div> : <>
            {visible.length ? <div className="wc-grid">{visible.map((product) => <WeddingCard key={product.id} product={product} />)}</div> : <div className="wc-state"><h2>Chưa tìm thấy mẫu phù hợp</h2><p>Thử thay đổi tông màu, khoảng giá hoặc tìm bằng tên ngắn hơn.</p><button className="wc-button" onClick={() => setParams(demo ? { source: "demo" } : {})}>Xóa bộ lọc</button></div>}
            {pages > 1 && <nav className="wc-pagination" aria-label="Phân trang"><button aria-label="Trang trước" disabled={page === 1} onClick={() => change("page", String(page - 1))}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /></svg></button>{Array.from({ length: pages }, (_, i) => <button key={i} aria-current={page === i + 1 ? "page" : undefined} onClick={() => { change("page", String(i + 1)); document.getElementById("catalog-results")?.scrollIntoView({ block: "start" }); }}>{i + 1}</button>)}<button aria-label="Trang sau" disabled={page === pages} onClick={() => change("page", String(page + 1))}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /></svg></button></nav>}
          </>}
        </div>
      </div>
    </section>
    <section className="wc-bottom-invite"><h2>Một ngày của riêng bạn.<br />Một không gian thật riêng.</h2><p>Tìm hiểu câu chuyện và phong cách dịch vụ của Ngọc Thiện Wedding.</p><Link className="wc-button wc-button-outline" to="/gioithieu">Về Ngọc Thiện Wedding</Link></section>
  </div>;
};
export default ProductList;

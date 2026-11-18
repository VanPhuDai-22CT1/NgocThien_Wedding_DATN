import { SERVICE_CATEGORIES } from "utils/serviceCategories";

import { useEffect, useRef, useState } from "react";
import { apiClient, buildAuthHeaders } from "utils/apiClient";

import { getImageUrl } from "../../../utils/image";

import { FaBox, FaSearch, FaPlus, FaTimes, FaStar, FaRegStar, FaEdit, FaTrash } from "react-icons/fa";
import "./style.scss";
import "./service-editor.scss";
import { FiArrowUp, FiCheck, FiImage, FiUploadCloud, FiX } from "react-icons/fi";
import { notify } from "utils/notify";

export default function QLSanPham() {




  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [imageSlots, setImageSlots] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingFeaturedId, setUpdatingFeaturedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [imageError, setImageError] = useState("");
  const fileInput = useRef(null);
  const productForm = useRef(null);
  const previewDialog = useRef(null);
  const submitting = useRef(false);
  const previewUrls = useRef(new Set());
  useEffect(() => {
    if (!previewImage) return;
    const opener = document.activeElement; const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; previewDialog.current?.querySelector("button")?.focus();
    const keyboard = event => { if (event.key === "Escape") setPreviewImage(null); if (event.key === "Tab") { event.preventDefault(); previewDialog.current?.querySelector("button")?.focus(); } };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keyboard); if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, [previewImage]);
  useEffect(() => { const urls = previewUrls.current; return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); }; }, []);
  const releaseSlot = slot => { if (slot?.type === "new" && previewUrls.current.delete(slot.previewUrl)) URL.revokeObjectURL(slot.previewUrl); };
  const newSlot = file => { const previewUrl = URL.createObjectURL(file); previewUrls.current.add(previewUrl); return { type: "new", file, previewUrl }; };

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: 0,
    category_id: 1,
    is_featured: 0,
    service_details: "",
  });

  const categories = SERVICE_CATEGORIES;

  /* ================= FETCH ================= */
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/legacy`, { params: { action: "getProducts" }, headers: buildAuthHeaders() });

      if (res.data?.success) {
        const normalized = (res.data.data || []).map((p) => ({
          ...p,
          price: Number(p.price) || 0,
          stock: Number(p.stock) || 0,
          category_id: Number(p.category_id) || 1,
          is_featured: Number(p.is_featured) || 0,
        }));

        setProducts(normalized);
        setFilteredProducts(normalized);
      } else {
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (err) {
      console.error(err);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /* ================= SEARCH ================= */
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredProducts(
        products.filter((p) =>
          p.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  /* ================= HANDLE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: "" }));
    setSubmitError("");
  };

  const checkImages = files => {
    if (files.some(file => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) { setImageError("Chọn tệp hình ảnh có dung lượng tối đa 10 MB mỗi ảnh."); return false; }
    setImageError(""); return true;
  };
  const addImages = files => {
    if (saving || !files.length) return;
    if (imageSlots.length + files.length > 20) { setImageError("Mỗi dịch vụ có tối đa 20 ảnh. Hãy xóa bớt ảnh trước khi thêm."); return; }
    if (checkImages(files)) setImageSlots(previous => [...previous, ...files.map(newSlot)]);
  };
  const handleAddImages = event => { addImages(Array.from(event.target.files || [])); event.target.value = ""; };

  const handleReplaceSlot = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!checkImages([file])) { e.target.value = ""; return; }
    setImageSlots(prev => prev.map((slot, i) => { if (i !== index) return slot; releaseSlot(slot); return newSlot(file); }));
    e.target.value = '';
  };

  const parseProductImages = (imageUrls) => {
    if (Array.isArray(imageUrls)) return imageUrls.filter(Boolean);
    if (!imageUrls) return [];
    try {
      const parsed = JSON.parse(imageUrls);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return typeof imageUrls === "string" && imageUrls ? [imageUrls] : [];
    }
  };

  const handleRemoveSlot = (index) => {
    releaseSlot(imageSlots[index]);
    setImageSlots((prev) => prev.filter((_, i) => i !== index));
  };
  const setCover = index => setImageSlots(previous => [previous[index], ...previous.filter((_, i) => i !== index)]);

  const resetForm = () => {
    imageSlots.forEach(releaseSlot);
    setErrors({}); setSubmitError(""); setImageError("");
    setEditingId(null);
    setImageSlots([]);
    setForm({
      name: "",
      description: "",
      price: "",
      stock: 0,
      category_id: 1,
      is_featured: 0,
      service_details: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting.current) return;
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Vui lòng nhập tên dịch vụ.";
    else if (form.name.trim().length > 255) nextErrors.name = "Tên dịch vụ không vượt quá 255 ký tự.";
    const priceDong = Math.round(Number(form.price) * 1000000);
    if (String(form.price).trim() === "" || !Number.isFinite(Number(form.price)) || !Number.isSafeInteger(priceDong) || priceDong < 0) nextErrors.price = "Nhập giá hợp lệ từ 0 trở lên, theo đơn vị triệu đồng.";
    setErrors(nextErrors); setSubmitError("");
    if (Object.keys(nextErrors).length) { productForm.current?.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus(); return; }
    submitting.current = true; setSaving(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "price") {
        formData.append(key, priceDong);
      } else if (key === "stock" || key === "category_id" || key === "is_featured") {
        formData.append(key, Number(value) || 0);
      } else {
        formData.append(key, value);
      }
    });

    const newFiles = imageSlots.filter(s => s.type === 'new').map(s => s.file);
    newFiles.forEach(file => formData.append("images[]", file));

    if (editingId) {
      formData.append("id", editingId);
      let newFileIdx = 0;
      const slotsOrder = imageSlots.map(s =>
        s.type === 'existing' ? `existing:${s.filename}` : `new:${newFileIdx++}`
      );
      formData.append('slots_order', JSON.stringify(slotsOrder));
    }

    const action = editingId ? "updateProduct" : "addProduct";

    try {
      const res = await apiClient.post(`/legacy?action=${action}`, formData, { headers: { ...buildAuthHeaders(), "Content-Type": "multipart/form-data" } });

      if (res.data?.success) {
        notify.success(editingId ? "Đã cập nhật dịch vụ." : "Đã thêm dịch vụ.");
        resetForm();
        fetchProducts();
      } else {
        setSubmitError("Chưa lưu được dịch vụ. Vui lòng thử lại; nội dung bạn nhập vẫn được giữ lại.");
      }
    } catch (err) {
      setSubmitError("Không thể lưu dịch vụ. Vui lòng kiểm tra kết nối và thử lại; nội dung bạn nhập vẫn được giữ lại.");
    } finally {
      submitting.current = false; setSaving(false);
    }
  };

  const handleEdit = (p) => {
    if (saving) return;
    imageSlots.forEach(releaseSlot);
    setErrors({}); setSubmitError(""); setImageError("");
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      description: p.description || "",
      price: Number(p.price) > 0 ? Number(p.price) / 1000000 : "",
      stock: Number(p.stock) || 0,
      category_id: Number(p.category_id) || 1,
      is_featured: Number(p.is_featured) || 0,
      service_details: typeof p.service_details === "object" && p.service_details ? JSON.stringify(p.service_details) : p.service_details || "",
    });
    const images = parseProductImages(p.image_urls);
    if (!images.length && p.cover) images.push(p.cover);
    setImageSlots(images.map(img => ({
      type: 'existing', filename: img, previewUrl: getImageUrl(img),
    })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (submitting.current) return;
    if (!(await notify.confirm("Bạn có chắc muốn xóa dịch vụ này?"))) return;

    setLoading(true);
    try {
      const res = await apiClient.get(`/legacy`, { params: { action: "deleteProduct", id }, headers: buildAuthHeaders() });

      if (res.data?.success) {
        notify.info("Xóa thành công!");
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
      notify.info("Xóa thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeatured = async (product) => {
    if (submitting.current || updatingFeaturedId !== null) return;
    const nextFeatured = Number(product.is_featured) === 1 ? 0 : 1;
    setUpdatingFeaturedId(product.id);

    const formData = new FormData();
    formData.append("id", product.id);
    formData.append("name", product.name || "");
    formData.append("description", product.description || "");
    formData.append("price", Number(product.price) || 0);
    formData.append("stock", Number(product.stock) || 0);
    formData.append("category_id", Number(product.category_id) || 1);
    formData.append("is_featured", nextFeatured);
    formData.append("service_details", typeof product.service_details === "object" && product.service_details ? JSON.stringify(product.service_details) : product.service_details || "");

    try {
      const res = await apiClient.post(`/legacy?action=updateProduct`, formData, { headers: { ...buildAuthHeaders(), "Content-Type": "multipart/form-data" } });

      if (res.data?.success) {
        if (editingId === product.id) setForm(previous => ({ ...previous, is_featured: nextFeatured }));
        setProducts((prev) =>
          prev.map((item) =>
            item.id === product.id
              ? { ...item, is_featured: nextFeatured }
              : item
          )
        );
        setFilteredProducts((prev) =>
          prev.map((item) =>
            item.id === product.id
              ? { ...item, is_featured: nextFeatured }
              : item
          )
        );
      } else {
        notify.info(res.data?.message || "Không cập nhật được sản phẩm nổi bật");
      }
    } catch (err) {
      console.error(err);
      notify.info("Có lỗi xảy ra khi cập nhật nổi bật");
    } finally {
      setUpdatingFeaturedId(null);
    }
  };



  /* ================= RENDER ================= */
  return (
    <>
    <div className="admin-layout nt-service-page">
      {/* SIDEBAR */}


      {/* MAIN CONTENT */}
      <div className="admin-content">
        {/* HEADER */}
        <div className="admin-header">
          <div>
            <h1><FaBox /> Quản lý dịch vụ</h1>
            <p className="subtitle">Quản lý các dịch vụ và sản phẩm cưới hỏi</p>
          </div>

        </div>

        {/* SEARCH BAR */}
        <div className="search-bar">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm dịch vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-btn" onClick={() => setSearchQuery("")}>
                <FaTimes />
              </button>
            )}
          </div>
          <div className="stats">
            <strong>{filteredProducts.length}</strong> dịch vụ
          </div>
        </div>

        {/* FORM */}
        <details className="nt-admin-product-editor nt-service-editor" key={editingId || "new"} open={!!editingId}>
          <summary><div><h2><FaPlus aria-hidden="true" />{editingId ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}</h2><p>Thông tin rõ ràng, hình ảnh đẹp giúp khách dễ lựa chọn dịch vụ.</p></div><span className="nt-service-toggle">+</span></summary>
          <form className="product-form nt-service-form" onSubmit={handleSubmit} ref={productForm} noValidate aria-busy={saving}>
            <fieldset disabled={saving}>
              <legend className="nt-service-sr">{editingId ? "Chỉnh sửa dịch vụ" : "Thêm dịch vụ mới"}</legend>
              <div className="nt-service-editor-grid">
                <div className="nt-service-editor-main">
                  <section className="nt-service-section"><header><h3>Thông tin dịch vụ</h3><p>Các trường có dấu <span aria-hidden="true">*</span> là bắt buộc.</p></header>
                    <div className="nt-service-field"><label htmlFor="nt-service-name">Tên dịch vụ <span aria-hidden="true">*</span></label><input id="nt-service-name" name="name" placeholder="Nhập tên dịch vụ" value={form.name} onChange={handleChange} maxLength={255} aria-required="true" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "nt-service-name-error" : undefined} />{errors.name && <p className="nt-service-error" id="nt-service-name-error" role="alert">{errors.name}</p>}</div>
                    <div className="nt-service-fields-row"><div className="nt-service-field"><label htmlFor="nt-service-category">Danh mục</label><select id="nt-service-category" name="category_id" value={form.category_id} onChange={handleChange}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div className="nt-service-field"><label htmlFor="nt-service-price">Giá tham khảo <span aria-hidden="true">*</span></label><div className="nt-service-price-input"><input id="nt-service-price" type="number" inputMode="decimal" name="price" placeholder="Ví dụ: 2.5" value={form.price} onChange={handleChange} min="0" step="any" aria-required="true" aria-invalid={Boolean(errors.price)} aria-describedby="nt-service-price-help nt-service-price-error" /><span>triệu đồng</span></div><p className="nt-service-helper" id="nt-service-price-help">{String(form.price).trim() !== "" && Number.isFinite(Number(form.price)) && Number(form.price) >= 0 ? Number(form.price) === 0 ? "Giá 0: hiển thị liên hệ báo giá." : `Tương đương ${Math.round(Number(form.price) * 1000000).toLocaleString("vi-VN")} đ` : "Nhập 2.5 tương đương 2.500.000 đ. Nhập 0 nếu cần báo giá."}</p><p className="nt-service-error" id="nt-service-price-error" role={errors.price ? "alert" : undefined}>{errors.price || ""}</p></div></div>
                  </section>
                  <section className="nt-service-section"><header><h3>Mô tả dịch vụ</h3><p>Giới thiệu phong cách, các hạng mục và điểm nổi bật của dịch vụ.</p></header><div className="nt-service-field"><label htmlFor="nt-service-description">Nội dung mô tả</label><textarea id="nt-service-description" name="description" placeholder="Nhập mô tả chi tiết về dịch vụ" value={form.description} onChange={handleChange} rows={7} maxLength={10000} /><span className="nt-service-text-count">{form.description.length.toLocaleString("vi-VN")} / 10.000 ký tự</span></div></section>
                </div>
                <div className="nt-service-editor-side">
                  <section className="nt-service-section nt-service-media"><header><h3>Hình ảnh dịch vụ <span>{imageSlots.length} / 20</span></h3><p>Ảnh đầu tiên được dùng làm ảnh đại diện.</p></header>
                    <div className="nt-service-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addImages(Array.from(event.dataTransfer.files || [])); }}><FiUploadCloud aria-hidden="true" /><strong>Kéo ảnh vào đây</strong><span>hoặc chọn ảnh từ thiết bị</span><button type="button" className="btn-outline" onClick={() => fileInput.current?.click()}><FiImage aria-hidden="true" />Chọn hình ảnh</button><small>Tệp ảnh tối đa 10 MB · Tối đa 20 ảnh</small></div><input type="file" id="file-input" ref={fileInput} multiple accept="image/*" onChange={handleAddImages} hidden />
                    {imageError && <p className="nt-service-error" role="alert">{imageError}</p>}
                    {imageSlots.length > 0 ? <div className="nt-service-gallery">{imageSlots.map((slot, index) => <div className="nt-service-photo" key={`${slot.previewUrl}-${index}`}><button type="button" className="nt-service-photo-preview" onClick={() => setPreviewImage(slot.previewUrl)} aria-label={`Phóng to ảnh ${index + 1}`}><img src={slot.previewUrl} alt={`Ảnh dịch vụ ${index + 1}`} /></button>{index === 0 && <span className="nt-service-cover-label"><FiCheck aria-hidden="true" />Ảnh đại diện</span>}<div className="nt-service-photo-tools"><button type="button" onClick={() => setCover(index)} disabled={index === 0} aria-label={`Đặt ảnh ${index + 1} làm ảnh đại diện`} title="Đặt làm ảnh đại diện"><FiArrowUp /></button><button type="button" onClick={() => document.getElementById(`replace-input-${index}`)?.click()} aria-label={`Thay ảnh ${index + 1}`} title="Thay ảnh"><FiImage /></button><button type="button" onClick={() => handleRemoveSlot(index)} aria-label={`Xóa ảnh ${index + 1}`} title="Xóa ảnh"><FiX /></button></div><input type="file" id={`replace-input-${index}`} accept="image/*" onChange={event => handleReplaceSlot(index, event)} hidden /></div>)}</div> : <p className="nt-service-media-empty">Chưa có ảnh. Bạn có thể bổ sung ảnh trước khi lưu.</p>}
                  </section>
                  <section className="nt-service-section nt-service-visibility"><h3>Giới thiệu dịch vụ</h3><label htmlFor="nt-service-featured"><input id="nt-service-featured" type="checkbox" checked={form.is_featured === 1} onChange={event => setForm(previous => ({ ...previous, is_featured: event.target.checked ? 1 : 0 }))} /><span><strong>Dịch vụ nổi bật</strong><small>Đánh dấu để ưu tiên giới thiệu dịch vụ.</small></span><FaStar aria-hidden="true" /></label></section>
                </div>
              </div>
              {submitError && <div className="nt-service-submit-error" role="alert">{submitError}</div>}
              <footer className="nt-service-form-footer"><p>{editingId ? `Đang chỉnh sửa dịch vụ #${editingId}` : "Dịch vụ được thêm vào danh sách sau khi lưu thành công."}</p><div><button type="button" className="btn-outline" onClick={resetForm}>{editingId ? "Hủy chỉnh sửa" : "Làm mới biểu mẫu"}</button><button type="submit" className="btn-submit">{saving ? "Đang lưu…" : editingId ? "Lưu thay đổi" : "Lưu dịch vụ"}</button></div></footer>
            </fieldset>
          </form>
        </details>

        {/* TABLE */}
        <div className="card">
          <div className="card-header">
            <h3>Danh sách dịch vụ</h3>
          </div>

          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Đang tải...</p>
            </div>
          )}

          {!loading && filteredProducts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Chưa có dịch vụ nào</h3>
              <p>
                {searchQuery
                  ? "Không tìm thấy dịch vụ phù hợp"
                  : "Bắt đầu thêm dịch vụ đầu tiên của bạn"}
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="product-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Hình ảnh</th>
                    <th>Tên dịch vụ</th>
                    <th>Danh mục</th>
                    <th>Giá</th>
                    <th>Nổi bật</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((p) => {
                    const images = parseProductImages(p.image_urls);

                    const category = categories.find((c) => c.id === p.category_id);

                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="id-badge">#{p.id}</span>
                        </td>
                        <td>
                          <div className="product-image">
                            {images.length > 0 ? (
                              <>
                                <img
                                  src={getImageUrl(images[0])}
                                  alt={p.name}
                                />
                                {images.length > 1 && (
                                  <span className="image-count">+{images.length - 1}</span>
                                )}
                              </>
                            ) : (
                              <div className="no-image">📷</div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="product-info">
                            <div className="name">{p.name}</div>
                            {p.description && (
                              <div className="desc">
                                {p.description.substring(0, 50)}
                                {p.description.length > 50 && "..."}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="category-badge">
                            {category?.name || "Khác"}
                          </span>
                        </td>
                        <td className="price-col">
                          <strong>{Number(p.price) > 0 ? Number(p.price).toLocaleString("vi-VN") : "Liên hệ báo giá"}</strong>
                          {Number(p.price) > 0 && <span>đ</span>}
                        </td>
                        <td className="center">
                          <button
                            type="button"
                            className={`star-toggle ${Number(p.is_featured) === 1 ? "featured" : ""}`}
                            onClick={() => handleToggleFeatured(p)}
                            title={Number(p.is_featured) === 1 ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                            disabled={saving || updatingFeaturedId === p.id}
                          >
                            {Number(p.is_featured) === 1 ? (
                              <FaStar className="star active" />
                            ) : (
                              <FaRegStar className="star" />
                            )}
                          </button>
                        </td>
                        <td>
                          <div className="actions">
                            <button
                              className="btn-edit"
                              onClick={() => handleEdit(p)}
                              title="Chỉnh sửa" disabled={saving}
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDelete(p.id)}
                              title="Xóa" disabled={saving}
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* LIGHTBOX */}
    {previewImage && (
      <div className="img-lightbox-overlay nt-service-lightbox" onClick={() => setPreviewImage(null)}>
        <div className="img-lightbox-inner" role="dialog" aria-modal="true" aria-label="Xem ảnh dịch vụ" ref={previewDialog} onClick={e => e.stopPropagation()}>
          <button className="lightbox-close" type="button" aria-label="Đóng ảnh phóng to" onClick={() => setPreviewImage(null)}>
            <FaTimes />
          </button>
          <img src={previewImage} alt="Xem ảnh" />
        </div>
      </div>
    )}
    </>
  );
}

import { SERVICE_CATEGORIES } from "./serviceCategories";

export const productCategory = product => product.category_name || SERVICE_CATEGORIES.find(category => category.id === Number(product.category_id))?.name || "Chưa phân loại";
export const quickProductPrice = product => {
  if (!(Number(product?.price) > 0)) return "Liên hệ báo giá";
  let config = {};
  try { config = typeof product.service_details === "string" ? JSON.parse(product.service_details) : product.service_details || {}; } catch { /* Older products may have free-text details. */ }
  const rawUnit = config?.unit || product.unit;
  const unit = typeof rawUnit === "string" ? rawUnit.trim().replace(/^\/+/, "").slice(0, 40) : "";
  return `${Number(product.price).toLocaleString("vi-VN")} đ${unit ? `/${unit}` : ""}`;
};
export const quickProductMessage = (product, userOrigin) => [
  `Gợi ý dịch vụ: ${product.name}`,
  `Giá tham khảo: ${quickProductPrice(product)}`,
  `Xem chi tiết: ${userOrigin.replace(/\/+$/, "")}/chitietsanpham/${product.id}`,
  product.description ? `Mô tả: ${String(product.description).replace(/<[^>]*>/g, "").trim()}` : "",
].filter(Boolean).join("\n").slice(0, 2000);

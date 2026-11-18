import { getImageUrl, parseImageList } from "utils/image";

export const CATEGORIES = ["Trang trí gia tiên", "Cổng hoa cưới", "Trang trí sân khấu", "Mâm quả cưới hỏi", "Bàn ghế và phụ kiện", "Gói cưới trọn gói"];
export const COLORS = ["Đỏ truyền thống", "Trắng tinh khôi", "Hồng pastel", "Vàng champagne"];
export const normalizeText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().trim();

const inferCategory = (name) => {
  const value = normalizeText(name);
  if (/mam|trap|banh dua dau/.test(value)) return CATEGORIES[3];
  if (/cong hoa|cong cuoi/.test(value)) return CATEGORIES[1];
  if (/san khau/.test(value)) return CATEGORIES[2];
  if (/ban ghe|phu kien|khung|rap cuoi/.test(value)) return CATEGORIES[4];
  if (/gia tien|backdrop/.test(value)) return CATEGORIES[0];
  if (/tron goi/.test(value)) return CATEGORIES[5];
  return "Dịch vụ khác";
};

export const normalizeProduct = (product) => {
  let config = {};
  try { const value = typeof product.service_details === "string" ? JSON.parse(product.service_details) : product.service_details; if (value && typeof value === "object" && !Array.isArray(value)) config = value; } catch { /* Existing free-text details remain supported. */ }
  const list = (value, fallback) => Array.isArray(value) ? value.filter((item) => typeof item === "string") : fallback;
  const category = product.category_name || inferCategory(product.name);
  const text = normalizeText(product.name);
  const colors = [];
  if (/\bdo\b|ruby|crimson|hong ngoc/.test(text)) colors.push(COLORS[0]);
  if (/trang|ivory|white/.test(text)) colors.push(COLORS[1]);
  if (/hong|pink|blush/.test(text)) colors.push(COLORS[2]);
  if (/vang|champagne|gold/.test(text)) colors.push(COLORS[3]);
  const images = [...new Set([product.cover, ...parseImageList(product.image_urls)].filter(Boolean))].map(getImageUrl);
  const description = String(product.description || "Khám phá mẫu và trao đổi cùng chúng tôi để điều chỉnh theo không gian ngày cưới.").replace(/<[^>]+>/g, "");
  return {
    ...product, id: String(product.id), category, colors: list(config.colors || product.colors, colors),
    packages: Array.isArray(config.packages) ? config.packages.filter((item) => item && item.id != null && typeof item.name === "string").map((item) => ({ ...item, id: String(item.id), price: Number(item.price) || 0 })) : [],
    price: Number(product.price || 0),
    unit: config.unit || product.unit || (/thuc don|nau an/.test(text) ? "bàn" : /\bxe\b|\brap\b|vay|ao dai/.test(text) ? "ngày" : category === CATEGORIES[3] ? "bộ" : "gói"),
    images: images.length ? images : [getImageUrl(null)],
    description,
    descriptionContent: String(product.description || description),
    shortDescription: config.shortDescription || (description.length > 150 ? `${description.slice(0, 147).replace(/\s+\S*$/, "")}…` : description),
    included: list(config.included || product.included, ["Hạng mục chi tiết được thống nhất theo mẫu, quy mô và địa điểm trong báo giá."]),
    excluded: list(config.excluded || product.excluded, ["Các khoản có thể phát sinh như hoa tươi nâng cấp, vận chuyển ngoài khu vực hoặc yêu cầu bổ sung cần được kiểm tra và báo giá riêng."]),
    terms: config.terms || product.terms || "Chi phí vận chuyển, lắp đặt, thời gian sử dụng và điều kiện thuê sẽ được tư vấn theo địa điểm và xác nhận bằng báo giá trước khi chốt dịch vụ.",
  };
};

const samples = [
  [9, "gia-tien-hong", "Gia tiên Hồng duyên", 0, 2, 6500000, "gói", "Phông hoa hồng pastel, bàn gia tiên và phụ kiện đồng điệu cho lễ đính hôn ấm cúng."],
  [8, "cong-hoa-ivory", "Cổng hoa Ivory Garden", 1, 1, 3800000, "bộ", "Cổng hoa sắc trắng và lá xanh, tạo điểm đón khách thanh lịch trong ngày cưới."],
  [4, "san-khau-hong-phuc", "Sân khấu Hồng phúc", 2, 0, 8500000, "gói", "Phông sân khấu tông đỏ, hoa trang trí và điểm nhấn lễ cưới truyền thống."],
  [18, "mam-qua-long-phung", "Mâm quả Long phụng", 3, 0, 4200000, "bộ", "Bộ lễ vật cưới hỏi, kết hoa long phụng và trang trí khăn phủ đồng bộ."],
  [23, "ban-ghe-champagne", "Bàn tiệc Champagne", 4, 3, 650000, "bộ", "Bàn ghế tiệc, khăn trải và phụ kiện tông champagne cho không gian tiếp khách."],
  [1, "cuoi-tron-goi", "Ngày cưới trọn vẹn", 5, 3, null, "gói", "Phối hợp không gian gia tiên, khu đón khách và sân khấu theo quy mô thực tế."],
  [7, "gia-tien-thanh-sac", "Gia tiên Thanh sắc", 0, 1, 7200000, "gói", "Sắc trắng và lá xanh, kết hợp phông gia tiên và bàn lễ theo tinh thần vườn hoa."],
  [15, "mam-qua-hong-ngoc", "Mâm quả Hồng ngọc", 3, 2, 3200000, "bộ", "Bộ mâm quả với hoa hồng dịu, dành cho buổi lễ đính hôn gần gũi và trang nhã."],
];

export const SAMPLE_PRODUCTS = samples.map(([photo, slug, name, category, color, price, unit, description], index) => ({
  id: `mau-${slug}`, name, category: CATEGORIES[category], colors: [COLORS[color]], price, unit,
  demo: true, description, shortDescription: description, created_at: `2026-01-${String(index + 1).padStart(2, "0")}`,
  images: [0, 1].map((i) => `/images/wedding-samples/${photo}-${i}.${photo === 1 && i === 0 ? "png" : "jpg"}`),
  included: ["Phối cảnh theo mẫu minh họa đã chọn.", "Bộ trang trí và phụ kiện đồng bộ theo gói mẫu.", "Nhân sự lắp đặt và thu dọn trong thời gian đã thỏa thuận."],
  excluded: ["Vận chuyển ngoài khu vực phục vụ, phí địa điểm và điện cấp nguồn.", "Hoa tươi nâng cấp, tăng quy mô hoặc kéo dài thời gian thuê."],
  terms: "Điều kiện minh họa: sử dụng trong một ngày tổ chức; lịch giao, lắp đặt và thu hồi cần được thỏa thuận. Chi phí thực tế phụ thuộc khảo sát địa điểm. Mẫu và giá trên trang không phải cam kết cung cấp dịch vụ.",
}));

export const formatPrice = (product) => Number(product.price) > 0 ? `${Number(product.price).toLocaleString("vi-VN")} ₫ /${product.unit}` : "Liên hệ báo giá";
export const todayVietnam = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

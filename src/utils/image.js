import { API_BASE_URL } from "utils/apiClient";

const PLACEHOLDER_IMAGE = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#f3efeb"/><text x="200" y="200" text-anchor="middle" fill="#7b6b60" font-size="22">Chưa có ảnh</text></svg>');

const getBackendBaseUrl = () => {
  return API_BASE_URL.replace(/\/api\/?$/i, "");
};

export const parseImageList = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch (error) {
      // Some legacy rows store a single image name or comma-separated image names.
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

export const getProductImage = (product) => {
  if (!product) return "";
  const gallery = parseImageList(product.image_urls || product.images);
  return product.cover || gallery[0] || "";
};

export const getImageUrl = (img) => {
  if (!img) {
    return PLACEHOLDER_IMAGE;
  }

  if (Array.isArray(img)) {
    return getImageUrl(img[0]);
  }

  if (typeof img !== "string") {
    return PLACEHOLDER_IMAGE;
  }

  const rawImg = img.trim();
  if (!rawImg) {
    return PLACEHOLDER_IMAGE;
  }

  if (/^(https?:|data:|blob:)/i.test(rawImg)) {
    return rawImg;
  }

  if (rawImg.startsWith("/uploads/")) {
    return `${getBackendBaseUrl()}${rawImg}`;
  }

  if (rawImg.startsWith("uploads/")) {
    return `${getBackendBaseUrl()}/${rawImg}`;
  }

  if (rawImg.startsWith("/")) {
    return rawImg;
  }

  return `${getBackendBaseUrl()}/uploads/${rawImg}`;
};

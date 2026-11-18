import { productCategory, quickProductMessage, quickProductPrice } from "./quickProducts";

test("formats stored price and unit without inventing a unit", () => {
  expect(quickProductPrice({ price: 2250000, service_details: '{"unit":"bàn"}' })).toBe("2.250.000 đ/bàn");
  expect(quickProductPrice({ price: 4500000, service_details: "old text" })).toBe("4.500.000 đ");
  expect(quickProductPrice({ price: 0, service_details: { unit: "gói" } })).toBe("Liên hệ báo giá");
});
test("uses the same category ids as the service editor", () => {
  expect(productCategory({ category_id: "3" })).toBe("Thực đơn tiệc cưới");
  expect(productCategory({ category_id: 99 })).toBe("Chưa phân loại");
  expect(productCategory({ category_name: "Danh mục riêng", category_id: 3 })).toBe("Danh mục riêng");
});
test("quick message carries actual product link and quote label within the API length limit", () => {
  const message = quickProductMessage({ id: 39, name: "Khảo sát trang trí", price: 0, description: "Mô tả ".repeat(1000) }, "http://localhost:3000/");
  expect(message).toContain("Giá tham khảo: Liên hệ báo giá");
  expect(message).toContain("http://localhost:3000/chitietsanpham/39");
  expect(message).not.toContain("0 đ");
  expect(message.length).toBeLessThanOrEqual(2000);
});

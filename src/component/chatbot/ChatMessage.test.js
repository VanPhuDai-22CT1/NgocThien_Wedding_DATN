import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChatMessage from "./ChatMessage";

jest.mock("utils/apiClient", () => ({ API_BASE_URL: "/api" }));

test("customer can open a staff-shared product URL from a support message", () => {
  const html = renderToStaticMarkup(<ChatMessage message={{ id: 9, role: "admin", text: "Gợi ý dịch vụ: Gia tiên\nXem chi tiết: http://localhost:3000/chitietsanpham/39", createdAt: "2026-11-18T08:00:00Z" }} />);
  expect(html).toContain('href="http://localhost:3000/chitietsanpham/39"');
  expect(html).toContain('rel="noopener noreferrer"');
});
test("unsafe URL-like text remains plain text and markup is escaped", () => {
  const html = renderToStaticMarkup(<ChatMessage message={{ id: 10, role: "admin", text: 'javascript:alert(1) <img src=x onerror=alert(1)>', createdAt: "2026-11-18T08:00:00Z" }} />);
  expect(html).not.toContain('href="javascript:');
  expect(html).not.toContain('<img src=x');
  expect(html).toContain('&lt;img');
});

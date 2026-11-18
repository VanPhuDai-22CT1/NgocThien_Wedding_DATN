import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import { toast } from "react-toastify";
import { notify } from "./notify";

jest.mock("react-toastify", () => ({ toast: { warn: jest.fn(), dismiss: jest.fn() } }));
let close;
beforeEach(() => {
  toast.warn.mockImplementation((content, options) => { close = options.onClose; render(content); return "confirmation"; });
  // Toastify may fire onClose immediately when dismiss is called.
  toast.dismiss.mockImplementation(() => close());
});
afterEach(() => { cleanup(); jest.clearAllMocks(); });

test("accepting confirmation resolves true even when dismiss triggers onClose synchronously", async () => {
  const result = notify.confirm("Xóa đơn này?");
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await expect(result).resolves.toBe(true);
});
test("canceling or closing confirmation never approves a deletion", async () => {
  const canceled = notify.confirm("Xóa đơn này?");
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  await expect(canceled).resolves.toBe(false);
  cleanup();
  const dismissed = notify.confirm("Xóa đơn này?");
  close();
  await expect(dismissed).resolves.toBe(false);
});

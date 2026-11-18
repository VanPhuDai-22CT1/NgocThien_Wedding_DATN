import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiPrinter, FiRefreshCw } from "react-icons/fi";
import BrandWordmark from "component/BrandWordmark";
import VietQRImage from "component/Checkout/VietQRImage";
import { apiClient } from "utils/apiClient";
import { BANK, bankConfigured, dateLabel, depositRate, money, orderStatus, parseSelection, paymentStatus } from "component/Checkout/shared";
import "./invoice.scss";

export default function InvoicePage() {
  const { id } = useParams(); const location = useLocation();
  const [order, setOrder] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [reload, setReload] = useState(0);
  useEffect(() => {
    let expanded = [];
    const before = () => { expanded = [...document.querySelectorAll('.cx-invoice-paper details:not([open])')]; expanded.forEach((item) => { item.open = true; }); };
    const after = () => { expanded.forEach((item) => { item.open = false; }); expanded = []; };
    window.addEventListener("beforeprint", before); window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setOrder(null);
    apiClient.get(`/orders/${id}`, { signal: controller.signal }).then((response) => {
      if (!response.data.success || !response.data.data?.id) throw new Error();
      if (!controller.signal.aborted) setOrder(response.data.data);
    }).catch((err) => { if (!controller.signal.aborted) setError(err.response?.status === 401 ? "Vui lòng đăng nhập để xem hóa đơn của bạn." : err.response?.status === 403 || err.response?.status === 404 ? "Không tìm thấy hóa đơn hoặc bạn chưa có quyền xem." : "Chưa tải được hóa đơn. Vui lòng kiểm tra kết nối và thử lại."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload]);
  const items = (order?.OrderItems || []).map((item) => ({ ...item, selection: parseSelection(item.selection) }));
  const amount = order && depositRate ? Math.round(Number(order.total_amount) * depositRate) : null;
  const reference = order?.order_code || `Don ${order?.id || ""}`;
  const showBank = order?.payment_method === "bank" && order?.payment_status !== "paid" && order?.status !== "cancelled" && bankConfigured;
  return <main className="cx-invoice-view"><div className="cx-invoice-container"><nav className="cx-invoice-toolbar" aria-label="Thao tác hóa đơn"><Link className="cx-back" to="/donhang"><FiArrowLeft aria-hidden="true" />Đơn hàng của tôi</Link><button className="cx-button cx-button--outline" type="button" disabled={loading || !order || !!error} onClick={() => window.print()}><FiPrinter aria-hidden="true" />In hóa đơn</button></nav>
    {loading ? <div className="cx-panel cx-loading" role="status">Đang tải hóa đơn…</div> : error ? <div className="cx-panel cx-empty" role="alert"><FiRefreshCw /><h1>Chưa xem được hóa đơn</h1><p>{error}</p><div className="cx-state-actions"><button className="cx-button" type="button" onClick={() => setReload((value) => value + 1)}>Thử lại</button><Link className="cx-button cx-button--outline" to="/login">Đăng nhập</Link></div></div> : order && <><article className="cx-invoice-paper" aria-label="Hóa đơn dịch vụ">
      <header className="cx-invoice-header"><div><BrandWordmark /><span className="cx-invoice-brand-caption">Wedding &amp; Events</span></div><div className="cx-invoice-title"><h1>Hóa đơn dịch vụ</h1><p>{order.order_code || `Đơn #${order.id}`}</p><small>Ngày lập: {dateLabel(order.created_at)}</small></div></header>
      <div className="nt-invoice-content">
      {location.state?.orderNotice && order.status === "pending" && <p className="cx-invoice-notice"><FiCheckCircle aria-hidden="true" />Đã tiếp nhận yêu cầu. Nhân viên sẽ liên hệ xác nhận lịch phục vụ.</p>}
      {location.state?.cartWarning && <p className="cx-alert" role="status">{location.state.cartWarning}</p>}
      <div className="cx-invoice-status"><div><span>Trạng thái đơn hàng</span><strong>{orderStatus(order.status)}</strong></div><div className={order.payment_status === "paid" ? "is-paid" : "is-unpaid"}><span>Trạng thái thanh toán</span><strong>{paymentStatus(order.payment_status)}</strong></div></div>
      <section className="cx-invoice-customer"><div><h2>Thông tin khách hàng</h2><dl className="cx-details"><div><dt>Họ tên</dt><dd>{order.customer_name || "Chưa cập nhật"}</dd></div><div><dt>Điện thoại</dt><dd>{order.phone || "Chưa cập nhật"}</dd></div>{order.email && <div><dt>Email</dt><dd>{order.email}</dd></div>}</dl></div><div><h2>Thông tin tổ chức</h2><dl className="cx-details"><div><dt>Ngày tổ chức</dt><dd>{dateLabel(order.event_date)}</dd></div><div><dt>Địa điểm</dt><dd>{order.delivery_address || "Chưa cập nhật"}</dd></div></dl></div></section>
      <table className="cx-invoice-table"><caption>Dịch vụ đã đặt</caption><thead><tr><th>Dịch vụ</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id || index}><td><strong>{item.Product?.name || "Dịch vụ cưới"}</strong>{(item.selection.package_name || item.selection.color) && <small>{[item.selection.package_name, item.selection.color].filter(Boolean).join(" · ")}</small>}{(item.selection.event_date || item.selection.location || item.selection.note) && <details className="cx-invoice-options"><summary>Thông tin sử dụng</summary>{item.selection.event_date && <p>Ngày: {dateLabel(item.selection.event_date)}</p>}{item.selection.location && <p>Địa điểm: {item.selection.location}</p>}{item.selection.note && <p>Ghi chú: {item.selection.note}</p>}</details>}</td><td data-label="Số lượng">{item.quantity} {item.selection.unit || "gói"}</td><td data-label="Đơn giá">{money(item.price)}</td><td data-label="Thành tiền">{money(Number(item.price) * Number(item.quantity))}</td></tr>)}</tbody></table>
      {!items.length && <p className="cx-inline-note">Hệ thống chưa có chi tiết dịch vụ cho đơn này.</p>}
      <div className={`nt-invoice-payment-layout${showBank ? " has-bank" : ""}`}><section className="cx-invoice-bottom"><div><h2>Phương thức thanh toán</h2><p>{order.payment_method === "bank" ? "Chuyển khoản ngân hàng" : order.payment_method === "cash" ? "Thanh toán trực tiếp" : "Chưa cập nhật"}</p>{order.note && <details className="cx-invoice-options"><summary>Ghi chú đơn hàng</summary><p>{order.note}</p></details>}</div><div className="cx-invoice-total"><span>Tổng tiền đơn hàng</span><strong>{money(order.total_amount)}</strong>{order.payment_status !== "paid" && <small>Chưa phải xác nhận đã thu tiền.</small>}</div></section>
      {showBank && <section className="cx-invoice-bank"><div><VietQRImage bin={BANK.bin} account={BANK.account} amount={amount} reference={reference} downloadable /></div><div><h2>Thanh toán chuyển khoản</h2><p>Chủ tài khoản: <strong>{BANK.name}</strong></p><p>Số tài khoản: <strong>{BANK.account}</strong></p><p>Ngân hàng: {BANK.bankName || BANK.bin}</p><p>Nội dung: <strong>{reference}</strong></p>{amount !== null ? <p>Tiền cọc ({depositRate * 100}%): <strong>{money(amount)}</strong></p> : <p>Vui lòng xác nhận số tiền cần chuyển với nhân viên trước khi thanh toán.</p>}<small>Ngọc Thiện xác nhận giao dịch trước khi cập nhật trạng thái thanh toán.</small></div></section>}
      </div>
      <footer className="cx-invoice-footer"><p>Cảm ơn bạn đã lựa chọn Ngọc Thiện Wedding.</p><small>Lịch phục vụ, hạng mục và chi phí cuối cùng được xác nhận trong thỏa thuận dịch vụ.</small></footer>
      </div>
    </article><div className="cx-invoice-mobile-total"><div><span>Tổng tiền đơn hàng</span><small>{paymentStatus(order.payment_status)}</small></div><strong>{money(order.total_amount)}</strong></div></>}
  </div></main>;
}

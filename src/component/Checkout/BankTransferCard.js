import { useState } from "react";
import { FiCreditCard } from "react-icons/fi";
import { BANK, bankConfigured, depositRate, money } from "./shared";
import VietQRImage from "./VietQRImage";

export default function BankTransferCard({ total = 0 }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const amount = depositRate && Number.isFinite(total) && total > 0 ? Math.round(total * depositRate) : null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(BANK.account); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  };
  return <section className="cx-panel cx-bank-card" aria-label="Mã QR chuyển khoản doanh nghiệp">
    <h2><FiCreditCard aria-hidden="true" />Mã QR của Ngọc Thiện Wedding</h2>
    {!bankConfigured ? <p className="cx-inline-note">Thông tin tài khoản doanh nghiệp đang được cập nhật. Mã QR sẽ hiển thị tại đây sau khi cấu hình ngân hàng và tài khoản nhận tiền.</p> : <>
      <div className="cx-bank-content">
        <div className="cx-bank-qr">
          <VietQRImage bin={BANK.bin} account={BANK.account} amount={amount} reference="NGOC THIEN DAT COC" downloadable />
        </div>
        <dl className="cx-details">
          <div><dt>Ngân hàng</dt><dd>{BANK.bankName || BANK.bin}</dd></div>
          <div><dt>Chủ tài khoản</dt><dd>{BANK.name}</dd></div>
          <div><dt>Số tài khoản</dt><dd><strong>{BANK.account}</strong><button className="cx-text-button" type="button" onClick={copy}>{copied ? "Đã sao chép" : "Sao chép"}</button></dd></div>
          {amount !== null && <><div><dt>Tiền cọc ({depositRate * 100}%)</dt><dd className="cx-bank-amount">{money(amount)}</dd></div><div><dt>Phần còn lại</dt><dd>{money(total - amount)}</dd></div></>}
        </dl>
      </div>
      <p className="cx-inline-note">{amount !== null ? `QR đã điền sẵn tiền cọc ${depositRate * 100}% theo giá trị đang hiển thị. Gửi yêu cầu đặt dịch vụ để nhận hóa đơn có mã đơn và số tiền được hệ thống xác nhận.` : "QR nhận tiền của doanh nghiệp chưa điền số tiền. Vui lòng xác nhận số tiền với nhân viên trước khi thanh toán."}</p>
      {copyError && <p className="cx-field-error" role="status">Trình duyệt chưa cho phép sao chép. Bạn có thể chọn số tài khoản để sao chép thủ công.</p>}
    </>}
  </section>;
}

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildVietQR } from "utils/vietqr";

export default function VietQRImage({ bin, account, amount = null, reference = "", downloadable = false }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let stopped = false; setError(false); setUrl("");
    try {
      const payload = buildVietQR({ bin, account, amount, reference });
      QRCode.toDataURL(payload, { width: 480, margin: 4, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }).then((value) => { if (!stopped) setUrl(value); }).catch(() => { if (!stopped) setError(true); });
    } catch { setError(true); }
    return () => { stopped = true; };
  }, [bin, account, amount, reference]);
  return <div className="cx-vietqr-image">{error ? <p role="status">Chưa tạo được mã QR. Vui lòng kiểm tra lại thông tin tài khoản.</p> : !url ? <span role="status">Đang tạo mã QR…</span> : <><img src={url} alt={amount === null ? "Mã VietQR tài khoản nhận tiền" : `Mã VietQR chuyển khoản ${amount.toLocaleString("vi-VN")} đồng`} data-bank-bin={bin} data-bank-account={account} data-amount={amount === null ? "" : String(amount)} data-reference={reference} />{downloadable && <a className="cx-qr-download" href={url} download={`NgocThien-TPBank-${amount || "nhantien"}.png`}>Tải ảnh QR</a>}</>}</div>;
}

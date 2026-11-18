import { useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import BrandWordmark from "component/BrandWordmark";
import "./style.scss";

export default function AuthLayout({ title, subtitle, children, variant = "login" }) {
  const location = useLocation();
  const returnSearch = new URLSearchParams(location.search).get("returnTo") === "/thanhtoan" ? "?returnTo=%2Fthanhtoan" : "";
  return <main className={`nt-auth nt-auth--${variant}`}>
    <div className="nt-auth-card">
      <aside className="nt-auth-story" aria-label="Ngọc Thiện Wedding">
        <img className="nt-auth-photo" src="/images/auth/wedding-red.webp" alt="Không gian cưới với phông nhung đỏ và hoa trang trí" width="1100" height="668" decoding="async" fetchpriority="high" />
        <Link className="nt-auth-story-brand" to="/" aria-label="Ngọc Thiện Wedding – Trang chủ"><BrandWordmark /><span>Wedding &amp; Events</span></Link>
        <div className="nt-auth-story-copy"><span className="nt-auth-story-line" aria-hidden="true" /><h2>Khởi đầu hạnh phúc,<br />trọn vẹn yêu thương</h2><p>Cùng Ngọc Thiện chuẩn bị từng chi tiết<br />cho ngày vui của riêng bạn.</p></div>
      </aside>
      <section className="nt-auth-panel" aria-labelledby="nt-auth-title">
        <div className="nt-auth-content">
          <Link className="nt-auth-brand" to="/" aria-label="Ngọc Thiện Wedding – Trang chủ"><BrandWordmark /><span>Wedding &amp; Events</span></Link>
          {(variant === "login" || variant === "register") && <nav className="nt-auth-modes" aria-label="Chọn đăng nhập hoặc đăng ký">
            <Link to={`/login${returnSearch}`} aria-current={variant === "login" ? "page" : undefined}>Đăng nhập</Link>
            <Link to={`/dangky${returnSearch}`} aria-current={variant === "register" ? "page" : undefined}>Đăng ký</Link>
          </nav>}
          <header className="nt-auth-heading"><h1 id="nt-auth-title">{title}</h1><p>{subtitle}</p></header>
          {children}
          <Link className="nt-auth-home" to="/"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m6-6-6 6 6 6" /></svg>Về trang chủ</Link>
        </div>
      </section>
    </div>
  </main>;
}

export function AuthField({ label, name, error, hint, type = "text", ...props }) {
  const uid = useId();
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  const ids = [error ? `${uid}-error` : "", hint ? `${uid}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return <div className={`nt-auth-field${error ? " has-error" : ""}`}>
    <label htmlFor={uid}>{label}</label>
    <div className={`nt-auth-input-wrap${password ? " has-toggle" : ""}`}>
      <input {...props} id={uid} name={name} type={password && visible ? "text" : type} aria-invalid={!!error} aria-describedby={ids} />
      {password && <button className="nt-auth-password-toggle" type="button" aria-label={`${visible ? "Ẩn" : "Hiện"} ${label.toLocaleLowerCase("vi-VN")}`} aria-pressed={visible} onClick={() => setVisible((previous) => !previous)} disabled={props.disabled}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg>
      </button>}
    </div>
    {error && <p className="nt-auth-field-error" id={`${uid}-error`} role="alert">{error}</p>}
    {hint && <p className="nt-auth-field-hint" id={`${uid}-hint`}>{hint}</p>}
  </div>;
}

export function AuthMessage({ type = "error", children }) {
  return children ? <p className={`nt-auth-message is-${type}`} role={type === "error" ? "alert" : "status"}>{children}</p> : null;
}

export function focusAuthError(form, errors) {
  const name = Object.keys(errors)[0];
  if (name) form?.elements.namedItem(name)?.focus();
}

export const passwordError = (value) => value.length < 6 ? "Mật khẩu cần có ít nhất 6 ký tự." : new TextEncoder().encode(value).length > 72 ? "Mật khẩu quá dài. Vui lòng rút ngắn và thử lại." : "";
export const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

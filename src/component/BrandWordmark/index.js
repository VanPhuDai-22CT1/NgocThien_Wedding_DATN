import "./style.scss";

export default function BrandWordmark({ admin = false }) {
  return <span className={`brand-wordmark${admin ? " brand-wordmark--admin" : ""}`}>
    <span className="brand-wordmark__name">NGỌC THIỆN</span>
    {admin && <span className="brand-wordmark__caption">Quản trị hệ thống</span>}
  </span>;
}

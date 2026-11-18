import React, { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { clearAuthSession, setAuthSession } from "utils/authStorage";
import { mergeGuestCartToServer } from "utils/guestCart";
import { apiClient } from "utils/apiClient";
import AuthLayout, { AuthField, AuthMessage, emailValid, focusAuthError } from "component/AuthLayout";

const LoginPage = () => {
  const location = useLocation();
  const returnSearch = new URLSearchParams(location.search).get("returnTo") === "/thanhtoan" ? "?returnTo=%2Fthanhtoan" : "";
  const userOrigin = process.env.REACT_APP_USER_URL || "http://localhost:3000";
  const adminOrigin = process.env.REACT_APP_ADMIN_URL || "http://localhost:3001";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    const next = {};
    if (!emailValid(email.trim())) next.email = "Vui lòng nhập địa chỉ email hợp lệ.";
    if (!password) next.password = "Vui lòng nhập mật khẩu.";
    setErrors(next); setMessage(null);
    if (Object.keys(next).length) { focusAuthError(event.currentTarget, next); return; }
    submitting.current = true; setIsLoading(true); clearAuthSession();
    let leaving = false;
    try {
      const response = await apiClient.post("/auth/login", { email: email.trim(), password });
      const data = response.data || {}; const payload = data.data || {};
      if (!data.success) { setMessage({ text: data.message || "Chưa đăng nhập được. Vui lòng thử lại." }); return; }
      const userId = Number(payload.user_id || payload.id || data.user_id || data.id);
      if (!Number.isSafeInteger(userId) || userId < 1 || !payload.token) { setMessage({ text: "Chưa nhận đủ thông tin đăng nhập. Vui lòng thử lại." }); return; }
      const auth = { user_id: String(userId), username: payload.username || "", email: payload.email || "", role: payload.role === "admin" ? "admin" : "user", token: payload.token };
      setAuthSession(auth);
      let merged = true;
      try { await mergeGuestCartToServer(userId); } catch { merged = false; }
      window.name = JSON.stringify(auth);
      setMessage({ type: "success", text: merged ? "Đăng nhập thành công. Đang chuyển trang…" : "Đăng nhập thành công. Một số dịch vụ chưa chuyển được vào giỏ tài khoản và vẫn được giữ trong giỏ khách." });
      const redirect = auth.role === "admin" ? `${adminOrigin}/dashboard` : `${userOrigin}${returnSearch ? "/thanhtoan" : "/"}`;
      leaving = true;
      setTimeout(() => window.location.assign(redirect), 1000);
    } catch (error) {
      const status = error.response?.status;
      if (status === 401) { setErrors({ password: "Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại." }); }
      else setMessage({ text: status === 403 ? "Tài khoản hiện không thể đăng nhập. Vui lòng liên hệ bộ phận hỗ trợ." : error.response?.data?.message || "Chưa kết nối được hệ thống. Vui lòng thử lại, thông tin của bạn vẫn được giữ lại." });
    } finally { if (!leaving) { submitting.current = false; setIsLoading(false); } }
  };

  return <AuthLayout title="Chào mừng bạn trở lại" subtitle="Đăng nhập để tiếp tục chuẩn bị cho ngày trọng đại của bạn">
    <form className="nt-auth-form" onSubmit={handleSubmit} noValidate aria-busy={isLoading}>
      <AuthField label="Email" name="email" type="email" autoComplete="username" inputMode="email" maxLength={100} placeholder="Email của bạn" value={email} onChange={(event) => { setEmail(event.target.value); setErrors((prev) => ({ ...prev, email: "", password: "" })); setMessage(null); }} error={errors.email} disabled={isLoading} required />
      <AuthField label="Mật khẩu" name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((prev) => ({ ...prev, password: "" })); setMessage(null); }} error={errors.password} disabled={isLoading} required />
      <div className="nt-auth-forgot"><Link to={`/quenmatkhau${returnSearch}`}>Quên mật khẩu?</Link></div>
      <AuthMessage type={message?.type}>{message?.text}</AuthMessage>
      <button className="nt-auth-submit" type="submit" disabled={isLoading} aria-busy={isLoading}>{isLoading ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    </form>
    <p className="nt-auth-switch">Chưa có tài khoản?<Link to={`/dangky${returnSearch}`}>Đăng ký ngay</Link></p>
  </AuthLayout>;
};
export default LoginPage;

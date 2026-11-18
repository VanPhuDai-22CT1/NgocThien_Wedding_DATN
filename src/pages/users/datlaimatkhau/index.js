import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "utils/apiClient";
import AuthLayout, { AuthField, AuthMessage, focusAuthError, passwordError } from "component/AuthLayout";

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnSearch = new URLSearchParams(location.search).get("returnTo") === "/thanhtoan" ? "?returnTo=%2Fthanhtoan" : "";
  const [email] = useState(() => localStorage.getItem("reset_email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  useEffect(() => { if (!email) navigate(`/quenmatkhau${returnSearch}`, { replace: true }); }, [email, navigate, returnSearch]);
  const submit = async (event) => {
    event.preventDefault(); if (submitting.current || !email) return;
    const next = {};
    const invalid = passwordError(password);
    if (invalid) next.password = invalid;
    if (!confirmPassword || password !== confirmPassword) next.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
    setErrors(next); setMessage(null);
    if (Object.keys(next).length) { focusAuthError(event.currentTarget, next); return; }
    submitting.current = true; setLoading(true);
    let leaving = false;
    try {
      const response = await apiClient.post("/legacy?action=reset_password", { email, password });
      if (!response.data?.success) { setMessage({ text: response.data?.message || "Chưa đổi được mật khẩu. Vui lòng thử lại." }); return; }
      leaving = true; localStorage.removeItem("reset_email");
      setMessage({ type: "success", text: "Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới." });
      setTimeout(() => navigate(`/login${returnSearch}`, { replace: true }), 1000);
    } catch (error) { setMessage({ text: error.response?.data?.message || "Chưa kết nối được hệ thống. Vui lòng thử lại, thông tin đã nhập vẫn được giữ lại." }); }
    finally { if (!leaving) { submitting.current = false; setLoading(false); } }
  };
  if (!email) return null;
  return <AuthLayout variant="recovery" title="Tạo mật khẩu mới" subtitle="Chọn mật khẩu mới để tiếp tục hành trình chuẩn bị ngày cưới của bạn.">
    <form className="nt-auth-form" onSubmit={submit} noValidate aria-busy={loading}>
      <AuthField label="Email tài khoản" name="email" type="email" value={email} autoComplete="username" readOnly />
      <AuthField label="Mật khẩu mới" name="password" type="password" autoComplete="new-password" placeholder="Nhập mật khẩu mới" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((prev) => ({ ...prev, password: "", confirmPassword: "" })); setMessage(null); }} error={errors.password} hint="Mật khẩu mới cần có ít nhất 6 ký tự." disabled={loading} required />
      <AuthField label="Xác nhận mật khẩu mới" name="confirmPassword" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setErrors((prev) => ({ ...prev, confirmPassword: "" })); }} error={errors.confirmPassword} disabled={loading} required />
      <AuthMessage type={message?.type}>{message?.text}</AuthMessage>
      <button className="nt-auth-submit" type="submit" disabled={loading} aria-busy={loading}>{loading ? "Đang cập nhật…" : "Lưu mật khẩu mới"}</button>
    </form>
    <p className="nt-auth-switch"><Link to={`/login${returnSearch}`}>Quay lại đăng nhập</Link></p>
  </AuthLayout>;
};
export default ResetPassword;

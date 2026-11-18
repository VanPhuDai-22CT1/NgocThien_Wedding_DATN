import React, { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "utils/apiClient";
import AuthLayout, { AuthField, AuthMessage, emailValid, focusAuthError, passwordError } from "component/AuthLayout";

const RegisterPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const returnSearch = new URLSearchParams(location.search).get("returnTo") === "/thanhtoan" ? "?returnTo=%2Fthanhtoan" : "";
  const [form, setForm] = useState({ username: "", email: location.state?.email || "", phone: "", address: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const change = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "", ...(name === "password" ? { confirmPassword: "" } : {}) })); setMessage(null);
  };
  const submit = async (event) => {
    event.preventDefault(); if (submitting.current) return;
    const next = {};
    if (!form.username.trim()) next.username = "Vui lòng nhập tên người dùng.";
    if (!emailValid(form.email.trim())) next.email = "Vui lòng nhập địa chỉ email hợp lệ.";
    if (!form.phone.trim()) next.phone = "Vui lòng nhập số điện thoại.";
    if (!form.address.trim()) next.address = "Vui lòng nhập địa chỉ.";
    const invalidPassword = passwordError(form.password);
    if (invalidPassword) next.password = invalidPassword;
    if (!form.confirmPassword || form.password !== form.confirmPassword) next.confirmPassword = "Mật khẩu xác nhận chưa khớp.";
    setErrors(next); setMessage(null);
    if (Object.keys(next).length) { focusAuthError(event.currentTarget, next); return; }
    submitting.current = true; setLoading(true);
    let leaving = false;
    try {
      const response = await apiClient.post("/auth/register", { ...form, username: form.username.trim(), email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim() });
      if (!response.data?.success) { setMessage({ text: response.data?.message || "Chưa tạo được tài khoản. Vui lòng thử lại." }); return; }
      leaving = true;
      setMessage({ type: "success", text: "Tạo tài khoản thành công! Đang chuyển sang đăng nhập…" });
      setTimeout(() => navigate(`/login${returnSearch}`, { replace: true }), 1500);
    } catch (error) {
      if (error.response?.status === 409) setErrors({ username: "Email hoặc tên người dùng đã được sử dụng.", email: "Email hoặc tên người dùng đã được sử dụng." });
      else setMessage({ text: error.response?.data?.message || "Chưa kết nối được hệ thống. Thông tin đã nhập của bạn vẫn được giữ lại." });
    } finally { if (!leaving) { submitting.current = false; setLoading(false); } }
  };
  const props = (name) => ({ name, value: form[name], onChange: change, error: errors[name], disabled: loading, required: true });
  return <AuthLayout variant="register" title="Bắt đầu hành trình hạnh phúc" subtitle="Tạo tài khoản để khám phá và đặt dịch vụ cưới hỏi tại Ngọc Thiện">
    <form className="nt-auth-form" onSubmit={submit} noValidate aria-busy={loading}>
      <AuthField label="Tên người dùng" autoComplete="username" maxLength={100} placeholder="Tên bạn muốn sử dụng" {...props("username")} />
      <AuthField label="Email" type="email" inputMode="email" autoComplete="email" maxLength={100} placeholder="Email của bạn" {...props("email")} />
      <div className="nt-auth-field-row">
        <AuthField label="Số điện thoại" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="Số điện thoại" {...props("phone")} />
        <AuthField label="Địa chỉ" autoComplete="street-address" placeholder="Địa chỉ của bạn" {...props("address")} />
      </div>
      <AuthField label="Mật khẩu" type="password" autoComplete="new-password" placeholder="Tạo mật khẩu" hint="Ít nhất 6 ký tự. Dùng mật khẩu riêng cho tài khoản của bạn." {...props("password")} />
      <AuthField label="Xác nhận mật khẩu" type="password" autoComplete="new-password" placeholder="Nhập lại mật khẩu" {...props("confirmPassword")} />
      <AuthMessage type={message?.type}>{message?.text}</AuthMessage>
      <button type="submit" className="nt-auth-submit" disabled={loading} aria-busy={loading}>{loading ? "Đang tạo tài khoản…" : "Tạo tài khoản"}</button>
    </form>
    <p className="nt-auth-switch">Đã có tài khoản?<Link to={`/login${returnSearch}`}>Đăng nhập</Link></p>
  </AuthLayout>;
};
export default RegisterPage;

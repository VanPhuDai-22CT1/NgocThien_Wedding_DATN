import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "utils/apiClient";
import AuthLayout, { AuthField, AuthMessage, emailValid, focusAuthError } from "component/AuthLayout";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnSearch = new URLSearchParams(location.search).get("returnTo") === "/thanhtoan" ? "?returnTo=%2Fthanhtoan" : "";
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const submitting = useRef(false);
  const otpInput = useRef(null);
  useEffect(() => { if (step === 2) otpInput.current?.querySelector("input")?.focus(); }, [step]);
  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = setTimeout(() => setRetrySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [retrySeconds]);
  const send = async (event) => {
    event?.preventDefault(); if (submitting.current || retrySeconds > 0) return;
    if (!emailValid(email.trim())) {
      setErrors({ email: "Vui lòng nhập địa chỉ email hợp lệ." });
      if (event?.currentTarget?.tagName === "FORM") focusAuthError(event.currentTarget, { email: true });
      return;
    }
    submitting.current = true; setLoading(true); setErrors({}); setMessage(null);
    try {
      const response = await apiClient.post("/legacy", { action: "forgotPassword", email: email.trim() });
      if (!response.data?.success) {
        const text = response.data?.message || "Chưa gửi được mã. Vui lòng kiểm tra email và thử lại.";
        if (step === 1) setErrors({ email: text }); else setMessage({ text });
        return;
      }
      localStorage.setItem("reset_email", email.trim());
      setStep(2); setOtp(""); setMessage({ type: "success", text: "Mã xác nhận đã được gửi. Vui lòng kiểm tra hộp thư đến hoặc thư rác." });
    } catch (error) {
      if (error.response?.status === 429) {
        const raw = error.response.headers?.["retry-after"];
        const seconds = Number(raw) || Math.ceil((Date.parse(raw) - Date.now()) / 1000);
        if (Number.isFinite(seconds) && seconds > 0) setRetrySeconds(seconds);
      }
      const text = error.response?.data?.code === "SMTP_NOT_CONFIGURED" || error.response?.status === 502
        ? "Chức năng gửi mã hiện chưa sẵn sàng. Vui lòng thử lại sau."
        : error.response?.data?.message || "Chưa kết nối được hệ thống. Vui lòng thử lại.";
      setMessage({ text });
    } finally { submitting.current = false; setLoading(false); }
  };
  const verify = async (event) => {
    event.preventDefault(); if (submitting.current) return;
    if (!/^\d{6}$/.test(otp)) { setErrors({ otp: "Vui lòng nhập đủ 6 chữ số trong email." }); focusAuthError(event.currentTarget, { otp: true }); return; }
    submitting.current = true; setLoading(true); setErrors({}); setMessage(null);
    let leaving = false;
    try {
      const response = await apiClient.post("/legacy", { action: "verifyOtp", email: email.trim(), otp });
      if (!response.data?.success) { setErrors({ otp: response.data?.message || "Mã chưa đúng hoặc đã hết hạn. Vui lòng kiểm tra lại." }); return; }
      leaving = true; navigate(`/datlaimatkhau${returnSearch}`);
    } catch (error) { setErrors({ otp: error.response?.data?.message || "Chưa xác minh được mã. Mã đã nhập vẫn được giữ lại, vui lòng thử lại." }); }
    finally { if (!leaving) { submitting.current = false; setLoading(false); } }
  };
  return <AuthLayout variant="recovery" title={step === 1 ? "Quên mật khẩu?" : "Xác nhận email của bạn"} subtitle={step === 1 ? "Nhập email đã đăng ký để nhận mã xác nhận và tạo mật khẩu mới." : `Nhập mã 6 chữ số đã gửi đến ${email.trim()}. Mã có hiệu lực trong 10 phút.`}>
    <AuthMessage type={message?.type}>{message?.text}</AuthMessage>
    {step === 1 ? <form className="nt-auth-form" onSubmit={send} noValidate aria-busy={loading}>
      <AuthField label="Email đã đăng ký" name="email" type="email" inputMode="email" autoComplete="email" maxLength={100} placeholder="Email của bạn" value={email} onChange={(event) => { setEmail(event.target.value); setErrors({}); setMessage(null); }} error={errors.email} disabled={loading} required />
      <button className="nt-auth-submit" type="submit" disabled={loading || retrySeconds > 0} aria-busy={loading}>{loading ? "Đang gửi mã…" : retrySeconds > 0 ? `Gửi lại sau ${retrySeconds}s` : "Gửi mã xác nhận"}</button>
    </form> : <>
      <form className="nt-auth-form" onSubmit={verify} noValidate aria-busy={loading}>
        <div ref={otpInput} className="nt-auth-otp"><AuthField label="Mã xác nhận (6 chữ số)" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Nhập mã xác nhận" value={otp} onChange={(event) => { setOtp(event.target.value.replace(/\D/g, "").slice(0, 6)); setErrors({}); }} onPaste={(event) => { event.preventDefault(); setOtp(event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)); setErrors({}); }} error={errors.otp} disabled={loading} required /></div>
        <button className="nt-auth-submit" type="submit" disabled={loading} aria-busy={loading}>{loading ? "Đang xác minh…" : "Xác nhận mã"}</button>
      </form>
      <div className="nt-auth-otp-actions"><button type="button" disabled={loading} onClick={() => { setStep(1); setOtp(""); setErrors({}); setMessage(null); }}>Đổi email</button><button type="button" onClick={() => send()} disabled={loading || retrySeconds > 0}>{retrySeconds > 0 ? `Gửi lại sau ${retrySeconds}s` : "Gửi lại mã"}</button></div>
    </>}
    <p className="nt-auth-switch">Đã nhớ mật khẩu?<Link to={`/login${returnSearch}`}>Đăng nhập</Link></p>
  </AuthLayout>;
};
export default ForgotPassword;

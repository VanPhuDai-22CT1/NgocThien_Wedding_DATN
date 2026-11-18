import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAuthItem } from "utils/authStorage";
import { apiClient } from "utils/apiClient";
import "./ProductReviews.scss";

const Star = () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.4l6.2-.9Z" /></svg>;
function Stars({ value }) {
  return <span className="wc-review-stars" aria-label={`${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} trên 5 sao`}>{[1, 2, 3, 4, 5].map((star) => <span className="wc-review-star" key={star}><Star /><span className="wc-review-star-fill" style={{ width: `${Math.max(0, Math.min(1, value - star + 1)) * 100}%` }}><Star /></span></span>)}</span>;
}

export default function ProductReviews({ product, reviews, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const [permission, setPermission] = useState(null);
  const [permissionError, setPermissionError] = useState("");
  const [permissionRetry, setPermissionRetry] = useState(0);
  const token = getAuthItem("token");
  const userId = getAuthItem("user_id");
  useEffect(() => {
    setPermission(null); setPermissionError("");
    if (!token || product.demo) return;
    const controller = new AbortController();
    apiClient.get(`/reviews/product/${product.id}/eligibility`, { signal: controller.signal }).then((response) => {
      if (!response.data.success || typeof response.data.data?.canReview !== "boolean") throw new Error();
      if (!controller.signal.aborted) setPermission(response.data.data);
    }).catch((error) => {
      if (!controller.signal.aborted) setPermissionError(error.response?.status === 401 ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để kiểm tra đơn đặt tiệc." : "Chưa kiểm tra được đơn đặt tiệc. Vui lòng thử lại.");
    });
    return () => controller.abort();
  }, [token, product.id, product.demo, permissionRetry]);
  const valid = reviews.filter((review) => Number.isInteger(Number(review.rating)) && Number(review.rating) >= 1 && Number(review.rating) <= 5);
  const average = valid.length ? valid.reduce((sum, review) => sum + Number(review.rating), 0) / valid.length : 0;
  const existing = !!userId && valid.some((review) => String(review.user_id) === String(userId));
  const ratingLabels = ["Chọn số sao phù hợp", "Rất chưa hài lòng", "Chưa hài lòng", "Bình thường", "Hài lòng", "Rất hài lòng"];
  const submit = async (event) => {
    event.preventDefault();
    if (sending || !permission?.canReview) return;
    if (!rating) { setMessage({ error: true, text: "Vui lòng chọn số sao cho trải nghiệm của bạn." }); return; }
    setSending(true); setMessage(null);
    try {
      await onSubmit(rating, comment.trim());
      setMessage({ error: false, text: "Cảm ơn bạn! Đánh giá của bạn đã được đăng." }); setComment("");
    } catch (error) { setMessage({ error: true, text: error.response?.data?.message || "Chưa gửi được đánh giá. Nội dung của bạn được giữ lại, vui lòng thử lại." }); }
    finally { setSending(false); }
  };
  return <section className="wc-reviews wc-customer-reviews" aria-labelledby="wc-reviews-heading">
    <div className="wc-review-heading"><h2 id="wc-reviews-heading">Đánh giá khách hàng</h2>{!product.demo && <span className="wc-review-count">{valid.length} đánh giá</span>}</div>
    {product.demo ? <p>Mẫu minh họa chưa có đánh giá thực tế.</p> : <div className="wc-review-layout">
      <div className="wc-review-overview">
        <div className="wc-review-summary">
          <div className="wc-review-score"><div><strong>{valid.length ? average.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}</strong><span>/ 5</span></div><Stars value={average} /><p>{valid.length ? `Từ ${valid.length} đánh giá` : "Chưa có đánh giá"}</p></div>
          <div className="wc-review-distribution" aria-label="Phân bố đánh giá">{[5, 4, 3, 2, 1].map((star) => {
            const count = valid.filter((review) => Number(review.rating) === star).length;
            return <div className="wc-review-bar-row" key={star} aria-label={`${star} sao: ${count} đánh giá`}><span>{star}<Star /></span><div className="wc-review-bar" aria-hidden="true"><i style={{ width: `${valid.length ? count / valid.length * 100 : 0}%` }} /></div><small>{count}</small></div>;
          })}</div>
        </div>
        {valid.length ? <div className="wc-review-list">
          {valid.slice(0, visibleCount).map((review) => {
            const date = new Date(review.created_at);
            const name = review.reviewer_name || "Khách hàng";
            return <article className="wc-review-card" key={review.id}>
              <div className="wc-review-author"><span className="wc-review-avatar" aria-hidden="true">{name.trim().charAt(0).toLocaleUpperCase("vi-VN")}</span><div><strong>{name}</strong><Stars value={Number(review.rating)} /></div>{Number.isFinite(date.getTime()) && review.created_at && <time dateTime={date.toISOString()}>{date.toLocaleDateString("vi-VN")}</time>}</div>
              {review.comment && <p>{review.comment}</p>}
            </article>;
          })}
          {visibleCount < valid.length && <button type="button" className="wc-button wc-button-outline wc-review-more" onClick={() => setVisibleCount((count) => count + 3)}>Xem thêm đánh giá</button>}
        </div> : <div className="wc-review-empty"><span className="wc-review-empty-icon" aria-hidden="true"><Star /></span><h3>Chưa có chia sẻ nào</h3><p>Trải nghiệm của bạn sẽ giúp các cặp đôi lựa chọn dịch vụ phù hợp cho ngày cưới.</p></div>}
      </div>
      <div className="wc-review-compose">
        <h3>Chia sẻ trải nghiệm của bạn</h3>
        <p className="wc-review-form-intro">Bạn cảm nhận thế nào về dịch vụ của Ngọc Thiện Wedding?</p>
        {message && <p className={`wc-review-message ${message.error ? "is-error" : "is-success"}`} role={message.error ? "alert" : "status"}>{message.text}</p>}
        {message?.error === false ? null : existing || permission?.reason === "already_reviewed" ? <p className="wc-review-submitted">Bạn đã đánh giá dịch vụ này. Cảm ơn bạn đã chia sẻ trải nghiệm cùng Ngọc Thiện Wedding.</p> : token && !permission ? <div className="wc-review-access"><p role={permissionError ? "alert" : "status"}>{permissionError || "Đang kiểm tra đơn đặt tiệc của bạn…"}</p>{permissionError && <button className="wc-button wc-button-outline" onClick={() => setPermissionRetry((value) => value + 1)}>Kiểm tra lại</button>}</div> : token && !permission.canReview ? <div className="wc-review-access"><p>{permission.message}</p><Link className="wc-button wc-button-outline" to="/donhang">Xem đơn đặt tiệc</Link></div> : token ? <form onSubmit={submit} className="wc-review-form" noValidate aria-busy={sending}>
          <fieldset className="wc-review-rating" disabled={sending}><legend>Mức độ hài lòng <span aria-hidden="true">*</span></legend><div className="wc-review-picker">{[1, 2, 3, 4, 5].map((star) => <label className={star <= rating ? "is-selected" : ""} key={star}><input type="radio" name="review-rating" value={star} checked={rating === star} onChange={() => { setRating(star); setMessage(null); }} aria-label={`${star} sao`} /><Star /></label>)}</div><p className="wc-review-rating-label" aria-live="polite">{ratingLabels[rating]}</p></fieldset>
          <label className="wc-field">Cảm nhận của bạn<textarea rows={4} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} disabled={sending} placeholder="Chia sẻ về cách phục vụ, trang trí hoặc trải nghiệm trong ngày vui của bạn…" /></label>
          <div className="wc-review-form-bottom"><span>{comment.length}/2000 ký tự</span><button className="wc-button" disabled={sending}>{sending ? "Đang gửi…" : "Gửi đánh giá"}</button></div>
        </form> : <div className="wc-review-login"><p>Đăng nhập tài khoản đã đặt dịch vụ để gửi đánh giá của bạn.</p><Link className="wc-button" to="/login">Đăng nhập để đánh giá</Link></div>}
        <p className="wc-review-policy">Chỉ khách hàng có đơn đặt tiệc được xác nhận chứa dịch vụ này mới được gửi đánh giá.</p>
      </div>
    </div>}
  </section>;
}

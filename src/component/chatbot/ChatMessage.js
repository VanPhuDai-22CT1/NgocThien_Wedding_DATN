import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getImageUrl, getProductImage } from "utils/image";

export function AssistantIcon() {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 11.5a8 8 0 0 1-8 8h-3L5 22v-5a8 8 0 1 1 15.5-5.5Z" /><path d="m13 5 1.2 3.3L17.5 9.5l-3.3 1.2L13 14l-1.2-3.3-3.3-1.2 3.3-1.2L13 5Z" /></svg>;
}
const safeSource = (value) => typeof value === "string" && /^https?:\/\//i.test(value);
const safeRoute = (value) => typeof value === "string" && /^\/(?:sanpham(?:\?[^\s]*)?|chitietsanpham\/\d+|donhang|giohang|login|gioithieu)$/.test(value);

function inline(text, sources) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\]|https?:\/\/[^\s<>]+)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (safeSource(part)) return <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
    const id = part.match(/^\[(\d+)\]$/)?.[1];
    const source = id && sources.find((item) => Number(item.id) === Number(id) && safeSource(item.url));
    return source ? <a key={index} className="nt-chat-citation" href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>{part}</a> : <Fragment key={index}>{part}</Fragment>;
  });
}
function RichText({ text, sources = [] }) {
  return <div className="nt-chat-rich">{String(text || "").split(/(```[\s\S]*?```)/g).filter(Boolean).map((part, index) => part.startsWith("```") ? <pre key={index}><code>{part.replace(/^```[^\n]*\n?/, "").replace(/```$/, "")}</code></pre> : <Fragment key={index}>{part.split(/\n\s*\n/).filter(Boolean).map((block, blockIndex) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) return <ul key={blockIndex}>{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\s*[-*]\s+/, ""), sources)}</li>)}</ul>;
    if (/^#{1,3}\s+/.test(block)) return <h4 key={blockIndex}>{inline(block.replace(/^#{1,3}\s+/, ""), sources)}</h4>;
    return <p key={blockIndex}>{inline(block, sources)}</p>;
  })}</Fragment>)}</div>;
}

export default function ChatMessage({ message, onSupport, onNavigate, onAsk, pending, failure, onRetry }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(false), 2500); return () => clearTimeout(timer); }, [copied]);
  const user = message.role === "user";
  const date = new Date(message.createdAt);
  const copy = async () => {
    try { await navigator.clipboard.writeText(message.text); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  };
  return <article data-message-id={message.id} className={`nt-chat-message ${user ? "is-user" : "is-assistant"}${message.failed ? " is-failed" : ""}`} aria-label={user ? "Tin nhắn của bạn" : message.role === "admin" ? "Phản hồi của nhân viên" : "Phản hồi của trợ lý"}>
    {!user && <div className="nt-chat-message-author"><span className="nt-chat-small-avatar" aria-hidden="true">{message.role === "admin" ? "NV" : "NT"}</span><span>{message.role === "admin" ? "Nhân viên Ngọc Thiện" : "Ngọc Thiện"}</span>{message.engine && <small>{message.engine === "openai" ? "Trợ lý AI" : message.engine === "system" ? "Thông tin hệ thống" : message.engine === "knowledge" ? "Kiến thức cưới hỏi" : "Danh mục website"}</small>}</div>}
    <div className="nt-chat-bubble"><RichText text={message.text} sources={message.sources} /></div>
    {failure && <div className="nt-chat-error" role={failure.stopped ? "status" : "alert"}><p>{failure.message}</p><button type="button" onClick={onRetry} disabled={pending}>Thử lại</button></div>}
    {!user && onAsk && Array.isArray(message.followups) && <div className="nt-chat-actions" aria-label="Câu hỏi tiếp theo">{message.followups.filter((item) => typeof item === "string").slice(0, 3).map((question) => <button key={question} type="button" disabled={pending} onClick={() => onAsk(question)}>{question}</button>)}</div>}
    {message.products?.length > 0 && <div className="nt-chat-products">{message.products.filter((product) => /^\d+$/.test(String(product.id))).map((product) => <Link key={product.id} to={`/chitietsanpham/${product.id}`} className="nt-chat-product" onClick={onNavigate}>
      <img src={getImageUrl(getProductImage(product))} alt="" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; if (!event.currentTarget.src.endsWith(getImageUrl(null))) event.currentTarget.src = getImageUrl(null); }} />
      <span><strong>{product.name}</strong><small>{Number(product.price) > 0 ? `${Number(product.price).toLocaleString("vi-VN")} ₫ /${product.unit || "gói"}` : "Liên hệ báo giá"}</small><span className="nt-chat-product-detail">Xem chi tiết <span aria-hidden="true">↗</span></span></span>
    </Link>)}</div>}
    {message.actions?.length > 0 && <div className="nt-chat-actions">{message.actions.map((action, index) => action.type === "support" ? <button key={index} onClick={onSupport} type="button">{action.label}</button> : safeRoute(action.href) ? <Link key={index} to={action.href} onClick={onNavigate}>{action.label}</Link> : null)}</div>}
    {message.sources?.length > 0 && <div className="nt-chat-sources"><span>Nguồn tham khảo</span>{message.sources.filter((source) => safeSource(source.url)).map((source) => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">[{source.id}] {source.title}</a>)}</div>}
    <div className="nt-chat-message-meta">{Number.isFinite(date.getTime()) && <time dateTime={date.toISOString()}>{date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</time>}{message.failed && <span>Chưa hoàn tất</span>}{!user && message.id !== "welcome" && <button type="button" onClick={copy} aria-label="Sao chép câu trả lời">{copied ? "Đã sao chép" : "Sao chép"}</button>}{copyError && <span role="status">Trình duyệt chưa cho phép sao chép.</span>}</div>
  </article>;
}

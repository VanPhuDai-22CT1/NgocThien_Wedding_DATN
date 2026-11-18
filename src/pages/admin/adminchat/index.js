import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FiArrowDown, FiArrowLeft, FiCheck, FiInfo, FiMail, FiMessageCircle, FiPackage, FiRefreshCw, FiSearch, FiSend, FiX } from "react-icons/fi";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { quickProductMessage } from "utils/quickProducts";
import QuickProductPanel from "./QuickProductPanel";
import useStaffProducts from "./useStaffProducts";
import "./style.scss";
import "./inbox.scss";

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim();
const nameOf = session => session?.customer_name || "Khách hàng";
const initials = session => nameOf(session).trim().split(/\s+/).slice(-2).map(part => part.charAt(0)).join("").toLocaleUpperCase("vi-VN");
const validDate = value => value && Number.isFinite(new Date(value).getTime());
const dayKey = value => validDate(value) ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "";
const time = value => validDate(value) ? new Date(value).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }) : "";
const day = value => !validDate(value) ? "" : dayKey(value) === dayKey(new Date()) ? "Hôm nay" : new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const sessionTime = value => dayKey(value) === dayKey(new Date()) ? time(value) : validDate(value) ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" }) : "";
const userOrigin = process.env.REACT_APP_USER_URL || `${window.location.protocol}//${window.location.hostname}:3000`;
const isMobile = () => window.matchMedia("(max-width: 700px)").matches;
const MessageText = ({ text }) => String(text || "").split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a> : <Fragment key={index}>{part}</Fragment>);

export default function AdminChat() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [messages, setMessages] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [keyword, setKeyword] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [readError, setReadError] = useState("");
  const [sendErrors, setSendErrors] = useState({});
  const [sendingSession, setSendingSession] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productError, setProductError] = useState("");
  const { favoriteIds, recentIds, toggleFavorite, recordSent } = useStaffProducts();
  const [newMessages, setNewMessages] = useState(false);
  const selectedRef = useRef("");
  const sessionsRef = useRef([]);
  const mobileRef = useRef(false);
  const sessionRequest = useRef(null);
  const messageRequest = useRef(null);
  const productRequest = useRef(null);
  const loadedMessagesFor = useRef("");
  const loadedSessionsRef = useRef(false);
  const loadedProducts = useRef(false);
  const sendBusy = useRef(false);
  const mounted = useRef(true);
  const readKeys = useRef(new Set());
  const readPending = useRef(new Set());
  const scroll = useRef(null);
  const composer = useRef(null);
  const nearBottom = useRef(true);
  const forceBottom = useRef(true);
  const lastSignature = useRef("");
  const reply = drafts[selectedSession] || "";
  const activeSession = sessions.find(item => item.chat_session === selectedSession);
  const canView = useCallback(() => !isMobile() || mobileRef.current, []);

  const activate = useCallback((id, open = true) => {
    mobileRef.current = open; setMobileOpen(open);
    if (selectedRef.current === id) return;
    selectedRef.current = id; messageRequest.current?.abort(); messageRequest.current = null;
    loadedMessagesFor.current = ""; forceBottom.current = true; nearBottom.current = true; lastSignature.current = "";
    setSelectedSession(id); setMessages([]); setMessagesLoaded(false); setLoadingMessages(Boolean(id)); setMessageError(""); setReadError(""); setShowInfo(false); setShowProducts(false); setNewMessages(false);
  }, []);
  const markRead = useCallback(async (id, signature, retry = false) => {
    if (!id || readPending.current.has(id) || (!retry && readKeys.current.has(signature))) return;
    readKeys.current.add(signature); readPending.current.add(id);
    try {
      const response = await apiClient.post("/legacy", { action: "markLiveChatRead", chat_session: id }, { headers: buildAuthHeaders() });
      if (!response.data?.success) throw new Error("Read update rejected");
      if (mounted.current) {
        setSessions(previous => { const rows = previous.map(item => item.chat_session === id ? { ...item, unread_count: 0 } : item); sessionsRef.current = rows; return rows; });
        if (selectedRef.current === id) setReadError("");
      }
    } catch { if (mounted.current && selectedRef.current === id) setReadError("Chưa đánh dấu đã đọc được."); }
    finally { readPending.current.delete(id); }
  }, []);
  const loadSessions = useCallback(async (quiet = false) => {
    if (sessionRequest.current) return;
    const controller = new AbortController(); sessionRequest.current = controller;
    if (!quiet || !loadedSessionsRef.current) setLoadingSessions(true);
    try {
      const response = await apiClient.get("/legacy", { params: { action: "getLiveChatSessions", _: Date.now() }, headers: buildAuthHeaders(), signal: controller.signal });
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error("Invalid session list");
      if (controller.signal.aborted) return;
      const rows = response.data.data; sessionsRef.current = rows; setSessions(rows); setSessionsLoaded(true); loadedSessionsRef.current = true; setSessionError("");
      if (!selectedRef.current || !rows.some(item => item.chat_session === selectedRef.current)) activate(rows[0]?.chat_session || "", false);
    } catch { if (!controller.signal.aborted) setSessionError("Không thể tải hội thoại. Vui lòng thử lại."); }
    finally { if (sessionRequest.current === controller) { sessionRequest.current = null; if (!controller.signal.aborted) setLoadingSessions(false); } }
  }, [activate]);
  const loadMessages = useCallback(async (id, quiet = false) => {
    if (!id || selectedRef.current !== id || !canView() || messageRequest.current) return;
    const controller = new AbortController(); messageRequest.current = controller;
    if (!quiet && loadedMessagesFor.current !== id) setLoadingMessages(true);
    try {
      const response = await apiClient.get("/legacy", { params: { action: "getLiveChatMessages", chat_session: id, _: Date.now() }, headers: buildAuthHeaders(), signal: controller.signal });
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error("Invalid conversation");
      if (controller.signal.aborted || selectedRef.current !== id) return;
      const rows = response.data.data; setMessages(rows); setMessagesLoaded(true); loadedMessagesFor.current = id; setMessageError("");
      if (Number(sessionsRef.current.find(item => item.chat_session === id)?.unread_count) > 0) markRead(id, `${id}:${rows.at(-1)?.id || "empty"}`);
    } catch { if (!controller.signal.aborted && selectedRef.current === id) setMessageError("Không thể cập nhật tin nhắn. Lịch sử đã tải vẫn được giữ lại."); }
    finally { if (messageRequest.current === controller) { messageRequest.current = null; if (!controller.signal.aborted) setLoadingMessages(false); } }
  }, [canView, markRead]);
  const loadProducts = useCallback(async () => {
    if (productRequest.current) return;
    const controller = new AbortController(); productRequest.current = controller; setProductsLoading(true);
    try {
      const response = await apiClient.get("/legacy", { params: { action: "getProducts" }, headers: buildAuthHeaders(), signal: controller.signal });
      if (!response.data?.success || !Array.isArray(response.data.data)) throw new Error("Invalid products");
      if (!controller.signal.aborted) { setProducts(response.data.data); loadedProducts.current = true; setProductError(""); }
    } catch { if (!controller.signal.aborted) setProductError("Không thể tải dịch vụ. Vui lòng thử lại."); }
    finally { if (productRequest.current === controller) { productRequest.current = null; if (!controller.signal.aborted) setProductsLoading(false); } }
  }, []);
  useEffect(() => { mounted.current = true; loadSessions(); return () => { mounted.current = false; sessionRequest.current?.abort(); messageRequest.current?.abort(); productRequest.current?.abort(); sessionRequest.current = null; messageRequest.current = null; productRequest.current = null; }; }, [loadSessions]);
  useEffect(() => { loadMessages(selectedSession); }, [selectedSession, mobileOpen, loadMessages]);
  useEffect(() => { const timer = window.setInterval(() => { if (document.visibilityState !== "visible") return; loadSessions(true); if (!sendBusy.current) loadMessages(selectedRef.current, true); }, 3000); return () => window.clearInterval(timer); }, [loadSessions, loadMessages]);
  useEffect(() => { if (showProducts && !loadedProducts.current) loadProducts(); }, [showProducts, loadProducts]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)"); const previous = document.body.style.overflow;
    const apply = () => { document.body.style.overflow = media.matches && mobileOpen ? "hidden" : previous; };
    apply(); media.addEventListener("change", apply); return () => { media.removeEventListener("change", apply); document.body.style.overflow = previous; };
  }, [mobileOpen]);
  useLayoutEffect(() => {
    if (!scroll.current) return;
    const signature = `${selectedSession}:${messages.length}:${messages.at(-1)?.id || ""}`;
    if (signature === lastSignature.current) return; lastSignature.current = signature;
    if (forceBottom.current || nearBottom.current) { scroll.current.scrollTop = scroll.current.scrollHeight; forceBottom.current = false; setNewMessages(false); }
    else setNewMessages(true);
  }, [messages, selectedSession]);
  useLayoutEffect(() => { if (composer.current) { composer.current.style.height = "auto"; composer.current.style.height = `${Math.min(128, Math.max(44, composer.current.scrollHeight))}px`; } }, [reply, selectedSession]);

  const sendMessage = async (text, kind = "reply", productId = null) => {
    const content = String(text || "").trim(); const id = selectedRef.current;
    if (!content || !id || sendBusy.current || content.length > 2000) return false;
    const rawDraft = drafts[id] || ""; const customer = sessionsRef.current.find(item => item.chat_session === id);
    sendBusy.current = true; setSendingSession(id); messageRequest.current?.abort(); messageRequest.current = null; setLoadingMessages(false);
    try {
      const response = await apiClient.post("/legacy", { action: "sendLiveChatMessage", chat_session: id, sender: "admin", message: content, customer_name: nameOf(customer), customer_email: customer?.customer_email || "" }, { headers: buildAuthHeaders() });
      if (!response.data?.success) throw new Error("Send rejected");
      if (!mounted.current) return true;
      if (kind === "product" && productId) recordSent(productId);
      setSendErrors(previous => ({ ...previous, [id]: null }));
      if (kind === "reply") setDrafts(previous => previous[id] === rawDraft ? { ...previous, [id]: "" } : previous);
      if (selectedRef.current === id) {
        const row = response.data.data;
        if (row?.id && typeof row.message === "string") setMessages(previous => previous.some(item => item.id === row.id) ? previous : [...previous, row]);
        forceBottom.current = true; nearBottom.current = true;
        loadMessages(id, true);
      }
      loadSessions(true); return true;
    } catch {
      if (mounted.current) setSendErrors(previous => ({ ...previous, [id]: { text: content, kind, productId, message: "Chưa nhận được xác nhận gửi. Nội dung vẫn được giữ để thử lại." } }));
      return false;
    } finally { sendBusy.current = false; if (mounted.current) { setSendingSession(""); if (kind === "reply" && selectedRef.current === id && canView()) composer.current?.focus({ preventScroll: true }); } }
  };
  const sendProduct = product => sendMessage(quickProductMessage(product, userOrigin), "product", String(product.id));
  const insertProduct = product => {
    const id = selectedRef.current;
    if (!id || sendBusy.current) return false;
    const current = drafts[id] || "";
    const content = `${current ? `${current.trimEnd()}\n\n` : ""}${quickProductMessage(product, userOrigin)}`;
    if (content.length > 2000) return false;
    setDrafts(previous => ({ ...previous, [id]: content })); setSendErrors(previous => ({ ...previous, [id]: null })); setShowProducts(false);
    requestAnimationFrame(() => composer.current?.focus()); return true;
  };
  const filtered = useMemo(() => sessions.filter(item => (!unreadOnly || Number(item.unread_count) > 0) && normalize(`${item.customer_name || ""} ${item.customer_email || ""} ${item.latest_message || ""} ${item.chat_session}`).includes(normalize(keyword))), [sessions, keyword, unreadOnly]);
  const unreadCount = sessions.filter(item => Number(item.unread_count) > 0).length;
  const failure = sendErrors[selectedSession];
  const toBottom = () => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; nearBottom.current = true; setNewMessages(false); };

  return <div className="chat-management-layout nt-inbox-page"><main className="chat-management-content"><header className="page-header"><div><h1><FiMessageCircle />Tin nhắn trực tiếp khách hàng</h1><p>Tư vấn và trao đổi với khách hàng ngay trên website.</p></div><span className="nt-inbox-page-note">{sessionsLoaded ? `${sessions.length} hội thoại · ${unreadCount} chưa đọc` : loadingSessions ? "Đang tải hội thoại…" : "Chưa tải được hội thoại"}</span></header>
    <div className={`nt-inbox${mobileOpen ? " show-chat" : ""}`}>
      <aside className="nt-inbox-sidebar" aria-label="Danh sách hội thoại"><div className="nt-inbox-list-head"><h2>Hội thoại</h2><button type="button" aria-label="Làm mới hội thoại" onClick={() => loadSessions()} disabled={loadingSessions}><FiRefreshCw /></button></div><label className="nt-inbox-search"><FiSearch aria-hidden="true" /><input aria-label="Tìm hội thoại" placeholder="Tìm tên, email hoặc tin nhắn…" value={keyword} onChange={event => setKeyword(event.target.value)} /></label><div className="nt-inbox-tabs"><button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Tất cả</button><button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Chưa đọc <span>{unreadCount}</span></button></div>{sessionError && <div className="nt-inbox-alert" role="alert">{sessionError}<button type="button" onClick={() => loadSessions()}>Thử lại</button></div>}<div className="nt-inbox-session-list">{loadingSessions && !sessionsLoaded ? <div className="nt-inbox-empty" role="status">Đang tải hội thoại…</div> : !filtered.length ? <div className="nt-inbox-empty"><FiMessageCircle aria-hidden="true" /><strong>{keyword || unreadOnly ? "Không tìm thấy hội thoại phù hợp" : sessionError ? "Chưa tải được hội thoại" : "Chưa có tin nhắn"}</strong><p>{keyword || unreadOnly ? "Thử tìm kiếm khác hoặc chọn Tất cả." : "Tin nhắn của khách hàng sẽ xuất hiện tại đây."}</p></div> : filtered.map(item => <button className={`nt-inbox-session${selectedSession === item.chat_session ? " is-selected" : ""}${Number(item.unread_count) > 0 ? " is-unread" : ""}`} type="button" key={item.chat_session} aria-pressed={selectedSession === item.chat_session} onClick={() => activate(item.chat_session)}><span className="nt-inbox-avatar" aria-hidden="true">{initials(item)}</span><span className="nt-inbox-session-main"><span><strong>{nameOf(item)}</strong><time>{sessionTime(item.latest_at)}</time></span><span className="nt-inbox-session-preview">{item.latest_message || "Chưa có nội dung tin nhắn"}</span></span>{Number(item.unread_count) > 0 && <span className="nt-inbox-unread" aria-label="Hội thoại chưa đọc" />}</button>)}</div><div className="nt-inbox-list-foot">Hộp thư tư vấn Ngọc Thiện Wedding</div></aside>
      <section className="nt-inbox-conversation" aria-label="Nội dung hội thoại">{!selectedSession ? <div className="nt-inbox-welcome"><span><FiMessageCircle aria-hidden="true" /></span><h2>Chào mừng đến hộp thư tư vấn</h2><p>Chọn khách hàng bên trái để xem tin nhắn và bắt đầu trao đổi.</p></div> : <><header className="nt-inbox-conversation-head"><button type="button" className="nt-inbox-back" aria-label="Về danh sách hội thoại" onClick={() => { mobileRef.current = false; setMobileOpen(false); messageRequest.current?.abort(); messageRequest.current = null; }}><FiArrowLeft /></button><span className="nt-inbox-avatar" aria-hidden="true">{initials(activeSession)}</span><div><h2>{nameOf(activeSession)}</h2><p>{activeSession?.customer_email || "Trao đổi qua website"}</p></div><button type="button" aria-label="Mở sản phẩm gửi nhanh" data-quick-product-trigger="true" aria-controls="nt-quick-products-panel" aria-expanded={showProducts} onClick={() => setShowProducts(previous => !previous)}><FiPackage /></button><button type="button" aria-label="Thông tin khách hàng" aria-expanded={showInfo} onClick={() => setShowInfo(previous => !previous)}><FiInfo /></button></header>
      {showInfo && <div className="nt-inbox-info"><div><strong>Thông tin hội thoại</strong><span>{nameOf(activeSession)}</span>{activeSession?.customer_email && <a href={`mailto:${activeSession.customer_email}`}><FiMail aria-hidden="true" />{activeSession.customer_email}</a>}<small>Mã hội thoại: {selectedSession}</small></div><button type="button" aria-label="Đóng thông tin hội thoại" onClick={() => setShowInfo(false)}><FiX /></button></div>}
      {messageError && <div className="nt-inbox-alert" role="alert">{messageError}<button type="button" onClick={() => loadMessages(selectedSession)}>Thử lại</button></div>}{readError && <div className="nt-inbox-read-error" role="status">{readError}<button type="button" onClick={() => markRead(selectedSession, `${selectedSession}:${messages.at(-1)?.id || "empty"}`, true)}>Thử lại</button></div>}
      <div className="nt-inbox-history-wrap"><div className="nt-inbox-history" ref={scroll} onScroll={() => { const el = scroll.current; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; if (nearBottom.current) setNewMessages(false); }} aria-label="Lịch sử tin nhắn">{loadingMessages && !messagesLoaded ? <div className="nt-inbox-empty" role="status">Đang tải tin nhắn…</div> : !messages.length ? <div className="nt-inbox-empty"><FiMessageCircle aria-hidden="true" /><p>{messageError ? "Nhấn Thử lại để tải lịch sử hội thoại." : "Chưa có tin nhắn trong hội thoại này."}</p></div> : messages.map((item, index) => { const own = (item.sender_type || item.sender) === "admin"; const divider = index === 0 || dayKey(item.created_at) !== dayKey(messages[index - 1].created_at); return <Fragment key={item.id || `${item.created_at}-${index}`}>{divider && validDate(item.created_at) && <div className="nt-inbox-day"><span>{day(item.created_at)}</span></div>}<article className={`nt-inbox-message ${own ? "is-own" : "is-customer"}`} aria-label={own ? "Tin nhắn đã gửi của nhân viên" : "Tin nhắn khách hàng"}>{!own && <span className="nt-inbox-small-avatar" aria-hidden="true">{initials(activeSession)}</span>}<div><div className="nt-inbox-bubble"><MessageText text={item.message} /></div><div className="nt-inbox-message-meta"><time>{time(item.created_at)}</time>{own && <span><FiCheck aria-hidden="true" />Đã gửi</span>}</div></div></article></Fragment>; })}</div>{newMessages && <button type="button" className="nt-inbox-new-messages" onClick={toBottom}><FiArrowDown aria-hidden="true" />Tin nhắn mới</button>}</div>
      {showProducts && <QuickProductPanel products={products} loading={productsLoading} error={productError} onReload={loadProducts} onClose={() => { setShowProducts(false); if (!isMobile()) composer.current?.focus(); }} recipient={nameOf(activeSession)} userOrigin={userOrigin} busy={Boolean(sendingSession)} favoriteIds={favoriteIds} recentIds={recentIds} onToggleFavorite={toggleFavorite} onSend={sendProduct} onInsert={insertProduct} />}
      <div className="nt-inbox-compose">{failure && <div className="nt-inbox-alert" role="alert">{failure.message}<button type="button" onClick={() => sendMessage(failure.text, failure.kind, failure.productId)} disabled={Boolean(sendingSession)}>Thử lại</button></div>}<div className="nt-inbox-compose-tools"><button type="button" data-quick-product-trigger="true" aria-controls="nt-quick-products-panel" aria-expanded={showProducts} onClick={() => setShowProducts(previous => !previous)}><FiPackage aria-hidden="true" />Gửi sản phẩm nhanh</button><span>{sendingSession === selectedSession ? "Đang gửi…" : `${reply.length} / 2.000`}</span></div><form onSubmit={event => { event.preventDefault(); sendMessage(reply); }}><textarea ref={composer} aria-label="Tin nhắn trả lời" placeholder={`Nhập tin nhắn cho ${nameOf(activeSession)}…`} value={reply} maxLength={2000} rows={1} disabled={sendingSession === selectedSession} onChange={event => { setDrafts(previous => ({ ...previous, [selectedSession]: event.target.value })); setSendErrors(previous => ({ ...previous, [selectedSession]: null })); }} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(min-width: 701px) and (pointer: fine)").matches) { event.preventDefault(); sendMessage(reply); } }} /><button type="submit" aria-label="Gửi tin nhắn" disabled={!reply.trim() || Boolean(sendingSession)}><FiSend /></button></form><p className="nt-inbox-compose-hint">Enter để gửi · Shift + Enter để xuống dòng</p></div>
      </>}</section>
    </div>
  </main></div>;
}

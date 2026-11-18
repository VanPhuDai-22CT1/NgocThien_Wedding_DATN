import React, { useCallback, useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import BrandWordmark from "component/BrandWordmark";
import { apiClient } from "utils/apiClient";
import { getAuthItem } from "utils/authStorage";
import ChatMessage, { AssistantIcon } from "./ChatMessage";
import "./style.scss";

const welcome = () => [{ id: "welcome", role: "assistant", text: "Chào bạn, tôi là trợ lý của Ngọc Thiện Wedding. Tôi có thể tìm mẫu, đối chiếu giá trong danh mục và giúp bạn chuẩn bị ngày cưới. Bạn đang cần hỗ trợ điều gì?" }];
const suggestions = ["Tư vấn trang trí gia tiên", "Tìm gói cưới theo ngân sách", "Xem mẫu mâm quả cưới hỏi", "Tìm hiểu quy trình đặt dịch vụ"];
const uuid = () => window.crypto.randomUUID();
const readHistory = (key) => {
  try {
    const items = JSON.parse(sessionStorage.getItem(key) || "null");
    if (Array.isArray(items)) {
      const valid = items.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.text === "string").slice(-60);
      if (valid.length) { if (valid[valid.length - 1].role === "user") valid[valid.length - 1].failed = true; return valid; }
    }
  } catch { /* Storage can be unavailable in private browsing. */ }
  return welcome();
};
const historyFor = (items) => {
  const result = []; let size = 0;
  for (const item of [...items].reverse()) {
    if (item.id === "welcome" || item.failed || item.private || !["assistant", "user"].includes(item.role)) continue;
    const content = item.text.slice(0, 4000); if (size + content.length > 22000 || result.length >= 12) break;
    result.unshift({ role: item.role, content }); size += content.length;
  }
  return result;
};
const readWorkspace = (key) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(`${key}:workspace`) || "null");
    const threads = saved?.threads?.filter((thread) => typeof thread.id === "string" && Array.isArray(thread.messages)).map((thread) => ({ ...thread,
      messages: thread.messages.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.text === "string"),
      draft: typeof thread.draft === "string" ? thread.draft.slice(0, 4000) : "",
    }));
    if (threads?.length) return { threads, activeId: threads.some((thread) => thread.id === saved.activeId) ? saved.activeId : threads[0].id };
  } catch { /* Migrate the existing single conversation below. */ }
  let draft = ""; try { draft = sessionStorage.getItem(`${key}:draft`) || ""; } catch { /* Memory fallback. */ }
  const thread = { id: uuid(), messages: readHistory(key), draft, updatedAt: new Date().toISOString() };
  return { threads: [thread], activeId: thread.id };
};
const failureFor = (items) => items.at(-1)?.role === "user" ? items.at(-1).failure || { text: items.at(-1).text, userId: items.at(-1).id, history: historyFor(items.slice(0, -1)), message: "Tin nhắn trước chưa hoàn tất. Bạn có thể gửi lại.", mode: "ai" } : null;

function WeddingAssistant({ scope, pathname }) {
  const panelId = useId();
  const historyKey = `nt_wedding_ai_v2:${scope}`;
  const workspace = useMemo(() => readWorkspace(historyKey), [historyKey]);
  const archive = useRef(workspace);
  const [threads, setThreads] = useState(workspace.threads);
  const [activeId, setActiveId] = useState(workspace.activeId);
  const initial = workspace.threads.find((thread) => thread.id === workspace.activeId).messages;
  const [aiMessages, setAiMessages] = useState(initial);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState("ai");
  const [input, setInput] = useState(() => workspace.threads.find((thread) => thread.id === workspace.activeId).draft);
  const drafts = useRef({ ai: input, support: "" });
  const [navOpen, setNavOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [storageError, setStorageError] = useState(false);
  const [mobile, setMobile] = useState(window.matchMedia("(max-width: 700px)").matches);
  const sidebar = useRef(null); const menuButton = useRef(null);
  const [pending, setPending] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [notice, setNotice] = useState("");
  const [supportError, setSupportError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [failure, setFailure] = useState(() => failureFor(initial));
  const [viewport, setViewport] = useState({ height: window.innerHeight, offset: 0, top: 0 });
  const [supportSession] = useState(() => {
    const key = `nt_wedding_support_v2:${scope}`;
    try { const value = localStorage.getItem(key); if (/^nt_[a-f0-9-]{36}$/i.test(value)) return value; const session = `nt_${uuid()}`; localStorage.setItem(key, session); return session; }
    catch { return `nt_${uuid()}`; }
  });
  const launcher = useRef(null); const composer = useRef(null); const log = useRef(null);
  const wasOpen = useRef(false); const hadNav = useRef(false);
  const request = useRef(null); const busy = useRef(false); const alive = useRef(true); const autoScroll = useRef(true);
  const messages = mode === "ai" ? aiMessages : supportMessages;
  const lastMessageId = messages.at(-1)?.id;
  const productMatch = pathname.match(/^\/chitietsanpham\/(\d+)$/);
  const productId = productMatch ? Number(productMatch[1]) : undefined;
  useLayoutEffect(() => {
    if (!open && wasOpen.current) launcher.current?.focus();
    if (open && !navOpen && hadNav.current) menuButton.current?.focus();
    wasOpen.current = open; hadNav.current = navOpen;
  }, [open, navOpen]);

  useEffect(() => { alive.current = true; return () => { alive.current = false; request.current?.abort(); }; }, []);
  useEffect(() => {
    const draft = mode === "ai" ? input : drafts.current.ai;
    archive.current = { activeId, threads: archive.current.threads.map((thread) => thread.id === activeId ? { ...thread, messages: aiMessages, draft, updatedAt: new Date().toISOString() } : thread) };
    setThreads(archive.current.threads);
    try { sessionStorage.setItem(`${historyKey}:workspace`, JSON.stringify(archive.current)); setStorageError(false); }
    catch { setStorageError(true); }
  }, [aiMessages, input, activeId, historyKey, mode]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    apiClient.get("/assistant/status", { signal: controller.signal }).then((response) => { if (!controller.signal.aborted && response.data.success) setCapabilities(response.data.data); }).catch(() => { if (!controller.signal.aborted) setCapabilities({ unavailable: true }); });
    return () => controller.abort();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const resize = () => {
      const view = window.visualViewport;
      const offset = Math.max(0, window.innerHeight - (view?.height || window.innerHeight) - (view?.offsetTop || 0));
      setViewport({ height: view?.height || window.innerHeight, offset, top: view?.offsetTop || 0 });
      setMobile(window.matchMedia("(max-width: 700px)").matches);
    };
    resize(); window.addEventListener("resize", resize); window.visualViewport?.addEventListener("resize", resize); window.visualViewport?.addEventListener("scroll", resize);
    const focus = requestAnimationFrame(() => window.matchMedia("(max-width: 700px)").matches ? document.getElementById(panelId)?.focus() : composer.current?.focus());
    return () => { cancelAnimationFrame(focus); window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("scroll", resize); };
  }, [open, panelId]);
  useEffect(() => {
    if (open && autoScroll.current && log.current) { log.current.scrollTop = log.current.scrollHeight; setUnread(false); }
    else if (open && !autoScroll.current) setUnread(true);
  }, [open, lastMessageId, pending, mode]);
  useEffect(() => {
    if (!composer.current) return;
    composer.current.style.height = "auto"; composer.current.style.height = `${Math.min(112, composer.current.scrollHeight)}px`;
  }, [input, open]);
  const close = useCallback(() => { setOpen(false); setNavOpen(false); launcher.current?.focus(); }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (document.getElementById(panelId)?.contains(event.target) || launcher.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open, close, panelId]);
  useEffect(() => {
    if (!open) return;
    const escape = (event) => {
      if (event.key === "Escape") { event.preventDefault(); if (navOpen) { setNavOpen(false); menuButton.current?.focus(); } else close(); }
      if (event.key === "Tab" && navOpen) {
        const root = sidebar.current;
        const buttons = [...(root?.querySelectorAll('button:not(:disabled), a[href], textarea') || [])].filter((item) => item.getClientRects().length);
        const first = buttons[0]; const last = buttons.at(-1);
        if (event.shiftKey && (document.activeElement === first || !root?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !root?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape);
  }, [open, close, navOpen, mobile, panelId]);
  useEffect(() => {
    if (!open || mode !== "support") return;
    setSupportLoading(true);
    let stopped = false; let timer; const controller = new AbortController();
    const poll = async () => {
      try {
        const response = await apiClient.get("/assistant/support/messages", { params: { session: supportSession }, signal: controller.signal });
        if (!response.data.success || !Array.isArray(response.data.data)) throw new Error();
        if (!stopped) {
          setSupportMessages((previous) => [...new Map([...previous, ...response.data.data.map((item) => ({ id: item.id, role: item.sender_type === "admin" ? "admin" : "user", text: item.message, createdAt: item.created_at }))].map((item) => [item.id, item])).values()].sort((a, b) => Number(a.id) - Number(b.id)).slice(-100));
          setSupportError("");
        }
      } catch { if (!stopped) setSupportError("Chưa tải được phản hồi mới. Hệ thống sẽ thử kết nối lại."); }
      finally { if (!stopped) setSupportLoading(false); }
      if (!stopped) timer = setTimeout(poll, 4000);
    };
    poll(); return () => { stopped = true; clearTimeout(timer); controller.abort(); };
  }, [open, mode, supportSession]);

  const ask = async (text, history, append = true, userId) => {
    if (busy.current) return;
    const id = userId || uuid(); const controller = new AbortController(); request.current = controller;
    busy.current = true; setPending(true); setFailure(null); setNotice(""); setFeedback(""); autoScroll.current = true;
    setInput((current) => current.trim() === text ? "" : current);
    setAiMessages((previous) => append ? [...previous, { id, role: "user", text, createdAt: new Date().toISOString() }] : previous.map((item) => item.id === id ? { ...item, failed: false, failure: null } : item));
    try {
      const response = await apiClient.post("/assistant/message", { message: text, history, ...(productId ? { productId } : {}) }, { signal: controller.signal, timeout: 35000 });
      if (!response.data.success || typeof response.data.data?.text !== "string") throw new Error();
      if (!alive.current || controller.signal.aborted) return;
      const answer = response.data.data;
      const answerId = uuid(); const follow = autoScroll.current;
      if (follow) autoScroll.current = false;
      setAiMessages((previous) => [...previous, { ...answer, id: answerId, role: "assistant", createdAt: new Date().toISOString() }]); setNotice(answer.notice || "");
      if (follow) requestAnimationFrame(() => {
        const item = log.current?.querySelector(`[data-message-id="${answerId}"]`);
        if (item && log.current) log.current.scrollTop += item.getBoundingClientRect().top - log.current.getBoundingClientRect().top - 8;
      });
    } catch (error) {
      if (!alive.current) return;
      const failed = { text, userId: id, history, mode: "ai", stopped: controller.signal.aborted, message: controller.signal.aborted ? "Đã dừng câu trả lời. Bạn có thể gửi lại khi muốn." : error.response?.data?.message || "Chưa gửi được câu hỏi. Nội dung vẫn được giữ lại, bạn có thể thử lại." };
      setAiMessages((previous) => previous.map((item) => item.id === id ? { ...item, failed: true, failure: failed } : item));
      setFailure(failed);
      setInput((current) => current || text);
    } finally { if (alive.current) { busy.current = false; setPending(false); } }
  };
  const sendSupport = async (text) => {
    if (busy.current) return;
    busy.current = true; setPending(true); setFailure(null); setFeedback(""); autoScroll.current = true;
    setInput((current) => current.trim() === text ? "" : current);
    const controller = new AbortController(); request.current = controller;
    try {
      const response = await apiClient.post("/assistant/support/message", { session: supportSession, message: text }, { signal: controller.signal });
      if (!response.data.success || !response.data.data?.id) throw new Error();
      if (!alive.current) return;
      const row = response.data.data;
      setSupportMessages((previous) => [...previous.filter((item) => item.id !== row.id), { id: row.id, role: "user", text: row.message, createdAt: row.created_at }]);
      setFeedback("Tin nhắn đã được gửi. Phản hồi của nhân viên sẽ hiển thị tại đây.");
    } catch (error) {
      if (!alive.current) return;
      setFailure({ text, mode: "support", message: error.response?.data?.message || "Tin nhắn chưa gửi được. Vui lòng thử lại." }); setInput((current) => current || text);
    } finally { if (alive.current) { busy.current = false; setPending(false); } }
  };
  const send = (value = input) => {
    const text = String(value).trim(); if (!text || busy.current) return;
    if (!navigator.onLine) { setFeedback("Bạn đang mất kết nối. Nội dung được giữ lại để gửi khi có mạng."); return; }
    if (text.length > (mode === "support" ? 2000 : 4000)) { setFeedback(`Vui lòng rút gọn tin nhắn còn tối đa ${mode === "support" ? 2000 : 4000} ký tự.`); return; }
    if (mode === "support") sendSupport(text);
    else if (failure?.mode === "ai" && failure.text === text) ask(text, failure.history, false, failure.userId);
    else ask(text, historyFor(aiMessages));
  };
  const switchMode = (next) => { if (busy.current || next === mode) return; drafts.current[mode] = input; setInput(drafts.current[next]); setMode(next); setFeedback(""); setNavOpen(false); autoScroll.current = true; composer.current?.focus(); };
  const openThread = (thread) => {
    if (busy.current) return;
    drafts.current[mode] = input;
    setMode("ai"); setActiveId(thread.id); setAiMessages(thread.messages); setInput(thread.draft || ""); drafts.current.ai = thread.draft || "";
    setFailure(failureFor(thread.messages)); setNotice(""); setFeedback(""); setNavOpen(false); setUnread(false); autoScroll.current = true;
    requestAnimationFrame(() => mobile ? document.getElementById(panelId)?.focus() : composer.current?.focus());
  };
  const clearAI = () => {
    if (busy.current) return;
    const thread = { id: uuid(), messages: welcome(), draft: "", updatedAt: new Date().toISOString() };
    archive.current = { ...archive.current, threads: [thread, ...archive.current.threads] };
    openThread(thread);
  };
  const toLatest = () => { if (log.current) log.current.scrollTop = log.current.scrollHeight; autoScroll.current = true; setUnread(false); };
  const retry = () => mode === "ai" ? ask(failure.text, failure.history, false, failure.userId) : sendSupport(failure.text);
  const toggleNav = () => { setNavOpen((value) => !value); if (!navOpen) requestAnimationFrame(() => sidebar.current?.querySelector("button")?.focus()); };

  return <div className={`nt-chat${open ? " is-open" : ""}${expanded ? " is-expanded" : ""}${navOpen ? " nav-open" : ""}${viewport.offset > 80 ? " has-keyboard" : ""}`} style={{ "--nt-chat-view-height": `${viewport.height}px`, "--nt-chat-view-top": `${viewport.top}px` }}>
    {open && <section className="nt-chat-panel" id={panelId} role="dialog" tabIndex={-1} aria-modal="false" aria-labelledby={`${panelId}-title`}>
      <aside className="nt-chat-sidebar" ref={sidebar} aria-label="Lịch sử trò chuyện" {...(!navOpen ? { inert: "" } : {})}>
        <button className="nt-chat-nav-close" type="button" onClick={() => { setNavOpen(false); menuButton.current?.focus(); }} aria-label="Đóng lịch sử">×</button>
        <Link className="nt-chat-wordmark" to="/" onClick={close}><BrandWordmark /><span>Wedding &amp; Events</span></Link>
        <button className="nt-chat-new" type="button" onClick={clearAI} disabled={pending}><span aria-hidden="true">＋</span>Cuộc trò chuyện mới</button>
        <div className="nt-chat-history-heading">Cuộc trò chuyện của bạn</div>
        <nav className="nt-chat-history" aria-label="Các cuộc trò chuyện">{threads.map((thread) => {
          const first = thread.messages.find((item) => item.role === "user");
          const title = (first?.text || (thread.draft ? `Bản nháp: ${thread.draft}` : "Cuộc trò chuyện mới")).replace(/\s+/g, " ").slice(0, 80);
          return <button key={thread.id} type="button" className={thread.id === activeId && mode === "ai" ? "is-active" : ""} aria-label={`Mở cuộc trò chuyện: ${title}`} aria-current={thread.id === activeId && mode === "ai" ? "true" : undefined} title={title} disabled={pending} onClick={() => openThread(thread)}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 11a8 8 0 0 1-8 8H8l-4 3V11a8 8 0 1 1 16 0Z" /></svg><span>{title}</span></button>;
        })}</nav>
        <div className="nt-chat-sidebar-bottom"><p>Lịch sử lưu trong phiên trình duyệt này.</p><button type="button" onClick={() => switchMode("support")} disabled={pending}><AssistantIcon />Liên hệ nhân viên tư vấn</button><Link to="/" onClick={close}><span aria-hidden="true">←</span> Về trang chủ</Link></div>
      </aside>
      {navOpen && <button className="nt-chat-drawer-shade" type="button" tabIndex={-1} aria-label="Thu gọn lịch sử" onClick={() => { setNavOpen(false); menuButton.current?.focus(); }} />}
      <div className="nt-chat-main" {...(navOpen ? { inert: "" } : {})}>
      <header className="nt-chat-header">
        <button ref={menuButton} className="nt-chat-menu" type="button" onClick={toggleNav} aria-label="Mở lịch sử trò chuyện" aria-expanded={navOpen}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
        <div className="nt-chat-brand"><h2 id={`${panelId}-title`}>Ngọc Thiện</h2><span>{mode === "support" ? "Hộp thư nhân viên tư vấn" : "Trợ lý tư vấn cưới hỏi"}</span></div>
        <div className="nt-chat-tools"><button className="nt-chat-expand" type="button" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Thu gọn khung chat" : "Mở rộng khung chat"}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 3H3v5m13 13h5v-5M3 3l6 6m12 12-6-6" /></svg></button><button type="button" onClick={close} aria-label="Đóng trợ lý"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
      </header>
      <div className="nt-chat-subheader"><div className="nt-chat-mode-switch" role="group" aria-label="Chế độ trò chuyện"><button type="button" aria-pressed={mode === "ai"} onClick={() => switchMode("ai")} disabled={pending}>Trợ lý tư vấn</button><button type="button" aria-pressed={mode === "support"} onClick={() => switchMode("support")} disabled={pending}>Nhắn nhân viên</button></div><span className="nt-chat-source-label">{mode === "support" ? "Phản hồi khi nhân viên tiếp nhận" : capabilities === null ? "Đang kiểm tra kết nối…" : capabilities.unavailable ? "Chưa kiểm tra được kết nối" : capabilities.aiConfigured ? "Tư vấn bằng AI" : "Hướng dẫn cưới hỏi & danh mục"}</span></div>
      {!online && <p className="nt-chat-notice" role="status">Bạn đang mất kết nối. Bản nháp vẫn được giữ lại.</p>}
      {storageError && <p className="nt-chat-notice" role="status">Trình duyệt không lưu được lịch sử. Nội dung hiện chỉ được giữ khi trang đang mở.</p>}
      <div className="nt-chat-log" ref={log} role="log" aria-label="Nội dung hội thoại" aria-live="polite" aria-relevant="additions" onScroll={() => { if (log.current) { autoScroll.current = log.current.scrollHeight - log.current.scrollTop - log.current.clientHeight < 80; if (autoScroll.current) setUnread(false); } }}>
        <div className="nt-chat-transcript">
        {mode === "support" && supportLoading && <p className="nt-chat-thinking" role="status">Đang tải cuộc trò chuyện…</p>}
        {mode === "ai" && aiMessages.length === 1 && <div className="nt-chat-welcome"><span className="nt-chat-welcome-icon"><AssistantIcon /></span><h3>Cùng bạn chuẩn bị<br />ngày cưới trọn vẹn</h3><p>Bạn đang tìm dịch vụ hay cần lời khuyên?<br />Ngọc Thiện luôn sẵn lòng hỗ trợ.</p></div>}
        {mode === "support" && supportMessages.length === 0 && <div className="nt-chat-support-intro"><h3>Trao đổi cùng Ngọc Thiện</h3><p>Để lại nội dung cần hỗ trợ. Khi nhân viên phản hồi, tin nhắn sẽ xuất hiện trong cuộc trò chuyện này.</p><p>Gửi tin nhắn chưa xác nhận đơn đặt tiệc hoặc lịch phục vụ.</p></div>}
        {messages.filter((message) => message.id !== "welcome").map((message) => {
          const itemFailure = message.failure || (failure?.mode === "ai" && failure.userId === message.id ? failure : null);
          return <ChatMessage key={message.id} message={message} onSupport={() => switchMode("support")} onNavigate={close} onAsk={mode === "ai" ? send : undefined} pending={pending} failure={itemFailure} onRetry={() => itemFailure && ask(itemFailure.text, itemFailure.history, false, itemFailure.userId)} />;
        })}
        {mode === "ai" && aiMessages.length === 1 && <div className="nt-chat-suggestions">{suggestions.map((text) => <button key={text} type="button" onClick={() => send(text)} disabled={pending}>{text}<span aria-hidden="true">↗</span></button>)}</div>}
        {pending && mode === "ai" && <div className="nt-chat-thinking" role="status"><span aria-hidden="true"><i /><i /><i /></span>Ngọc Thiện đang trả lời…</div>}
        </div>
      </div>
      {unread && <button className="nt-chat-latest" type="button" onClick={toLatest}>Tin nhắn mới <span aria-hidden="true">↓</span></button>}
      <div className="nt-chat-compose-area">
      {(mode === "support" ? supportError : notice) && <p className="nt-chat-notice" role="status">{mode === "support" ? supportError : notice}</p>}
      {failure?.mode === "support" && mode === "support" && <div className="nt-chat-error" role="alert"><p>{failure.message}</p><button type="button" onClick={retry} disabled={pending}>Thử lại</button></div>}
      {feedback && <p className="nt-chat-feedback" role="status">{feedback}</p>}
      <form className="nt-chat-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
        <label className="nt-chat-sr" htmlFor={`${panelId}-input`}>{mode === "support" ? "Tin nhắn cho nhân viên" : "Câu hỏi cho trợ lý"}</label>
        <textarea ref={composer} id={`${panelId}-input`} value={input} rows={1} maxLength={mode === "support" ? 2000 : 4000} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (!mobile && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} placeholder={mode === "support" ? "Nhắn điều bạn cần hỗ trợ…" : "Nhập câu hỏi về dịch vụ cưới hỏi…"} />
        {pending && mode === "ai" ? <button key="stop" className="nt-chat-send" type="button" onClick={(event) => { event.preventDefault(); request.current?.abort(); }} aria-label="Dừng câu trả lời"><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg></button> : <button key="send" className="nt-chat-send" type="submit" disabled={pending || !input.trim()} aria-label="Gửi tin nhắn"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7M12 5v14" /></svg></button>}
      </form>
      <div className="nt-chat-composer-hint"><span>{mode === "support" ? "Hộp thư hỗ trợ khách hàng" : mobile ? "Xuống dòng bằng bàn phím, chạm mũi tên để gửi" : "Enter để gửi · Shift + Enter để xuống dòng"}</span><span>{input.length}/{mode === "support" ? 2000 : 4000}</span></div>
      <p className="nt-chat-disclaimer">Thông tin tư vấn mang tính tham khảo. Giá và lịch phục vụ cần được Ngọc Thiện xác nhận.</p>
      </div></div>
    </section>}
    <button ref={launcher} type="button" className="nt-chat-launcher" onClick={() => setOpen(!open)} aria-label={open ? "Thu gọn trợ lý Ngọc Thiện" : "Mở trợ lý Ngọc Thiện"} aria-expanded={open} aria-controls={open ? panelId : undefined}><AssistantIcon /><span>Hỏi Ngọc Thiện</span></button>
  </div>;
}

export default function ChatBot() {
  const { pathname } = useLocation();
  const scope = getAuthItem("user_id") ? `user_${getAuthItem("user_id")}` : "guest";
  return <WeddingAssistant key={scope} scope={scope} pathname={pathname} />;
}

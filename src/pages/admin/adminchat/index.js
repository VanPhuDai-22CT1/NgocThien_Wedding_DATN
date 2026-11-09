import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBell,
  FaBox,
  FaChartPie,
  FaComments,
  FaHistory,
  FaPaperPlane,
  FaRegCalendarAlt,
  FaSearch,
  FaShoppingCart,
  FaUsers,
} from "react-icons/fa";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { getAuthItem } from "utils/authStorage";
import { notify } from "utils/notify";
import "./style.scss";

const normalizeText = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function AdminChat() {
  const navigate = useNavigate();
  const role = getAuthItem("role");

  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      const res = await apiClient.get("/legacy", {
        params: { action: "getLiveChatSessions", _: Date.now() },
        headers: buildAuthHeaders(),
      });
      const rows = res.data?.success && Array.isArray(res.data.data) ? res.data.data : [];
      setSessions(rows);

      setSelectedSession((current) => {
        if (current && rows.some((item) => item.chat_session === current)) return current;
        return rows[0]?.chat_session || "";
      });
    } catch (error) {
      console.error("Load live sessions error:", error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadMessages = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    try {
      setLoadingMessages(true);
      const res = await apiClient.get("/legacy", {
        params: { action: "getLiveChatMessages", chat_session: sessionId, _: Date.now() },
        headers: buildAuthHeaders(),
      });

      setMessages(res.data?.success && Array.isArray(res.data.data) ? res.data.data : []);
      await apiClient.post(
        "/legacy",
        { action: "markLiveChatRead", chat_session: sessionId },
        { headers: buildAuthHeaders() }
      );
    } catch (error) {
      console.error("Load live messages error:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiClient.get("/legacy", {
        params: { action: "getProducts", _: Date.now() },
        headers: buildAuthHeaders(),
      });
      setProducts(res.data?.success && Array.isArray(res.data.data) ? res.data.data : []);
    } catch (error) {
      console.error("Load products for chat error:", error);
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadProducts();
  }, [loadProducts, loadSessions]);

  useEffect(() => {
    loadMessages(selectedSession);
  }, [selectedSession, loadMessages]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadSessions();
      if (selectedSession) loadMessages(selectedSession);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [loadMessages, loadSessions, selectedSession]);

  const filteredSessions = useMemo(() => {
    const key = normalizeText(keyword);
    if (!key) return sessions;

    return sessions.filter((item) =>
      normalizeText(
        `${item.chat_session || ""} ${item.customer_name || ""} ${item.customer_email || ""} ${item.latest_message || ""}`
      ).includes(key)
    );
  }, [sessions, keyword]);

  const activeSessionInfo = useMemo(
    () => sessions.find((item) => item.chat_session === selectedSession) || null,
    [sessions, selectedSession]
  );

  const sendMessage = async (message) => {
    const content = String(message || "").trim();
    if (!content || !selectedSession || sending) return;

    try {
      setSending(true);
      await apiClient.post(
        "/legacy",
        {
          action: "sendLiveChatMessage",
          chat_session: selectedSession,
          sender: "admin",
          message: content,
          customer_name: activeSessionInfo?.customer_name || "Khách hàng",
          customer_email: activeSessionInfo?.customer_email || "",
        },
        { headers: buildAuthHeaders() }
      );

      setReply("");
      await loadMessages(selectedSession);
      await loadSessions();
    } catch (error) {
      console.error("Send admin message error:", error);
      notify.info("Không thể gửi phản hồi cho khách hàng");
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = () => sendMessage(reply);

  const handleSendProduct = async () => {
    if (!selectedProductId) return;

    const selectedProduct = products.find((item) => String(item.id) === String(selectedProductId));
    if (!selectedProduct) {
      notify.info("Không tìm thấy dịch vụ đã chọn");
      return;
    }

    const productMessage = [
      `Gợi ý dịch vụ: ${selectedProduct.name}`,
      `Giá: ${Number(selectedProduct.price || 0).toLocaleString("vi-VN")} VNĐ`,
      selectedProduct.description ? `Mô tả: ${selectedProduct.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await sendMessage(productMessage);
    setSelectedProductId("");
  };

  return (
    <div className="chat-management-layout">
      <aside className="sidebar">
        <div className="logo">NGỌC THIÊN ADMIN</div>

        <ul>
          <li>
            <NavLink to="/dashboard">
              <FaChartPie /> Tổng quan
            </NavLink>
          </li>
          {role === "admin" && (
            <li>
              <NavLink to="/qlnguoidung">
                <FaUsers /> Người dùng
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/qlsanpham">
              <FaBox /> Dịch vụ
            </NavLink>
          </li>
          <li>
            <NavLink to="/qldonhang">
              <FaShoppingCart /> Đơn hàng
            </NavLink>
          </li>
          <li>
            <NavLink to="/qltinnhan">
              <FaComments /> Tin nhắn
            </NavLink>
          </li>
          <li>
            <NavLink to="/notification">
              <FaBell /> Lịch tư vấn
            </NavLink>
          </li>
          <li>
            <NavLink to="/lichlamviec">
              <FaRegCalendarAlt /> Lịch làm việc
            </NavLink>
          </li>
          <li>
            <NavLink to="/qlhoatdong">
              <FaHistory /> Lịch sử hoạt động
            </NavLink>
          </li>
        </ul>
      </aside>

      <main className="chat-management-content">
        <div className="page-header">
          <div>
            <h2>Tin nhắn trực tiếp khách hàng</h2>
            <p className="subtitle">Theo dõi các phiên chat, trả lời khách và gửi gợi ý dịch vụ.</p>
          </div>
          <button type="button" className="btn-back" onClick={() => navigate("/dashboard")}>
            <FaArrowLeft /> Quay lại Dashboard
          </button>
        </div>

        <div className="toolbar">
          <div className="search-wrap">
            <FaSearch />
            <input
              type="text"
              value={keyword}
              placeholder="Tìm theo tên khách, email hoặc nội dung"
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          <button type="button" className="btn-refresh" onClick={loadSessions}>
            Tải lại
          </button>
        </div>

        <div className="chat-main-panel">
          <div className="chat-session-list">
            {loadingSessions ? (
              <div className="empty">Đang tải phiên chat...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="empty">Chưa có tin nhắn từ khách hàng</div>
            ) : (
              filteredSessions.map((session) => {
                const isActive = selectedSession === session.chat_session;

                return (
                  <button
                    key={session.chat_session}
                    type="button"
                    className={`session-item ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedSession(session.chat_session)}
                  >
                    <div className="session-head">
                      <strong>{session.customer_name || "Khách hàng"}</strong>
                      {Number(session.unread_count || 0) > 0 && (
                        <span className="unread">{session.unread_count}</span>
                      )}
                    </div>
                    <div className="session-email">{session.customer_email || session.chat_session}</div>
                    <div className="session-message">{session.latest_message || "(Không có nội dung)"}</div>
                    <div className="session-time">
                      {session.latest_at ? new Date(session.latest_at).toLocaleString("vi-VN") : "-"}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="chat-conversation-panel">
            {!selectedSession ? (
              <div className="empty">Chọn một phiên chat để bắt đầu phản hồi</div>
            ) : (
              <>
                <div className="conversation-head">
                  <div>
                    <strong>{activeSessionInfo?.customer_name || "Khách hàng"}</strong>
                    <p>{activeSessionInfo?.customer_email || selectedSession}</p>
                  </div>
                </div>

                <div className="conversation-messages">
                  {loadingMessages ? (
                    <div className="empty">Đang tải hội thoại...</div>
                  ) : messages.length === 0 ? (
                    <div className="empty">Khách hàng chưa gửi tin nhắn</div>
                  ) : (
                    messages.map((item) => {
                      const senderType = item.sender_type || item.sender;
                      return (
                        <div
                          key={item.id}
                          className={`chat-bubble ${senderType === "admin" ? "admin" : "customer"}`}
                        >
                          <div className="bubble-label">
                            {senderType === "admin" ? "Nhân viên" : "Khách hàng"}
                          </div>
                          <div className="bubble-text">{item.message}</div>
                          <div className="bubble-time">
                            {item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : ""}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="conversation-reply">
                  <input
                    type="text"
                    value={reply}
                    placeholder="Nhập phản hồi cho khách hàng..."
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSendReply();
                    }}
                    disabled={sending}
                  />
                  <button type="button" onClick={handleSendReply} disabled={sending || !reply.trim()}>
                    <FaPaperPlane /> {sending ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>

                <div className="conversation-product-send">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    disabled={sending}
                  >
                    <option value="">Chọn dịch vụ để gửi cho khách</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {Number(product.price || 0).toLocaleString("vi-VN")} VNĐ
                      </option>
                    ))}
                  </select>

                  <button type="button" onClick={handleSendProduct} disabled={sending || !selectedProductId}>
                    Gửi dịch vụ
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

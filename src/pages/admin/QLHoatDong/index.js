
import { useEffect, useMemo, useState } from "react";
import { apiClient, buildAuthHeaders } from "utils/apiClient";

import { createPortal } from "react-dom";

import { FaSearch, FaChevronDown } from "react-icons/fa";
import "./style.scss";

const QLHoatDong = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchUserId, setSearchUserId] = useState("");
  const [selectedUserGroup, setSelectedUserGroup] = useState(null);



  const normalizeText = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const shouldHideUser = (username) => {
    const normalized = normalizeText(username);
    return (
      !normalized ||
      normalized === "khong xac dinh" ||
      normalized === "test user" ||
      normalized === "testuser" ||
      normalized === "test_user"
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (shouldHideUser(log.username)) return false;
    const keyword = searchUserId.trim();
    if (!keyword) return true;
    return String(log.user_id ?? "").includes(keyword);
  });

  const groupedUsers = useMemo(() => {
    const groups = new Map();

    filteredLogs.forEach((log) => {
      const userId = log.user_id ?? "-";
      const username = log.username || "Không xác định";
      const key = `${userId}-${username}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          userId,
          username,
          logs: [],
        });
      }

      groups.get(key).logs.push(log);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        logs: [...group.logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      }))
      .sort((a, b) => Number(a.userId) - Number(b.userId));
  }, [filteredLogs]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const res = await apiClient.get(`/legacy`, { params: { action: "getActivityLogs" }, headers: buildAuthHeaders() });

      if (res.data?.success) {
        setLogs(res.data.data || []);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.log("Lỗi:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUserGroup && !groupedUsers.some((group) => group.key === selectedUserGroup.key)) {
      setSelectedUserGroup(null);
    }
  }, [groupedUsers, selectedUserGroup]);

  return (
    <div className="admin-layout">

      {/* SIDEBAR */}


      {/* CONTENT */}
      <div className="main-content">
        <div className="page-header">
          <h1>
            <span className="icon">📊</span> Quản lý hoạt động
          </h1>


        </div>

        <div className="card">
          <div className="card-toolbar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Tìm theo USER ID..."
                value={searchUserId}
                onChange={(e) => setSearchUserId(e.target.value)}
              />
            </div>
            <span className="result-count">
              {groupedUsers.length} người • {filteredLogs.length} hoạt động
            </span>
          </div>

          {loading ? (
            <div className="center">Đang tải dữ liệu...</div>
          ) : groupedUsers.length > 0 ? (
            <div className="activity-grid">
              {groupedUsers.map((group) => {
                const latest = group.logs[0];

                return (
                  <div
                    key={group.key}
                    className="activity-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedUserGroup(group)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedUserGroup(group)}
                  >
                    <div className="activity-card-head">
                      <div className="user-meta">
                        <h4>{group.username}</h4>
                        <p>USER ID: {group.userId}</p>
                      </div>
                      <div className="user-stats">
                        <span>{group.logs.length} hoạt động</span>
                        <small>Xem chi tiết</small>
                      </div>
                    </div>

                    <div className="activity-preview">
                      <p><strong>Mới nhất:</strong> {latest?.action || "-"}</p>
                      <p><strong>Thời gian:</strong> {latest?.created_at || "-"}</p>
                    </div>

                    <div className="activity-card-foot">
                      <span className="detail-hint">
                        <FaChevronDown className="chevron-icon" />
                        Nhấn để bung chi tiết
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="center">
              {searchUserId.trim()
                ? "Không tìm thấy USER ID phù hợp"
                : "Không có dữ liệu"}
            </div>
          )}

          {selectedUserGroup &&
            createPortal(
              <div className="activity-modal-overlay" onClick={() => setSelectedUserGroup(null)}>
                <div className="activity-modal" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="modal-close"
                    type="button"
                    onClick={() => setSelectedUserGroup(null)}
                  >
                    ×
                  </button>

                  <div className="activity-card-head modal-head">
                    <div className="user-meta">
                      <h4>{selectedUserGroup.username}</h4>
                      <p>USER ID: {selectedUserGroup.userId}</p>
                    </div>
                    <div className="user-stats">
                      <span>{selectedUserGroup.logs.length} hoạt động</span>
                      <small>Danh sách chi tiết</small>
                    </div>
                  </div>

                  <div className="activity-list modal-list">
                    {selectedUserGroup.logs.map((log) => (
                      <div className="activity-item" key={log.id}>
                        <div className="item-top">
                          <span className="action">{log.action}</span>
                          <span className="time">{log.created_at}</span>
                        </div>
                        <div className="item-bottom">
                          <span>Mã log: #{log.id}</span>
                          <span>Đơn hàng: {log.order_id || "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>,
              document.getElementById("nt-admin-main") || document.body
            )}
        </div>
      </div>
    </div>
  );
};

export default QLHoatDong;

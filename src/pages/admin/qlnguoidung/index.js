import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBell,
  FaBox,
  FaChartPie,
  FaComments,
  FaEdit,
  FaHistory,
  FaImage,
  FaRegCalendarAlt,
  FaSignOutAlt,
  FaShoppingCart,
  FaTrash,
  FaUsers,
} from "react-icons/fa";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { getAuthItem, logoutAuthSession, setAuthItem } from "utils/authStorage";
import "./style.scss";
import { notify } from "utils/notify";

const emptyUserForm = {
  username: "",
  full_name: "",
  email: "",
  phone: "",
  address: "",
  role: "user",
  is_active: true,
  password: "",
};

const buildUserForm = (user = {}) => ({
  username: user.username || "",
  full_name: user.full_name || "",
  email: user.email || "",
  phone: user.phone || "",
  address: user.address || "",
  role: user.role === "admin" ? "admin" : "user",
  is_active: user.is_active !== false,
  password: "",
});

const getDisplayName = (user = {}) => user.full_name || user.username || "Chưa có tên";

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [updatedInfo, setUpdatedInfo] = useState(emptyUserForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

  useEffect(() => {
    const storedRole = getAuthItem("role");
    if (storedRole !== "admin") {
      navigate("/");
      return;
    }

    const loadUsers = async () => {
      try {
        const res = await apiClient.get("/legacy", {
          params: { action: "getUsers" },
          headers: buildAuthHeaders(),
        });
        const data = res?.data;
        const usersPayload = Array.isArray(data) ? data : data?.data || data?.rows || [];
        setUsers(usersPayload);
      } catch (err) {
        console.error("Load users error:", err);
        setErrorMessage(err?.response?.data?.message || err?.message || "Lỗi tải dữ liệu người dùng");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [navigate]);

  const syncCurrentAuthUser = (user) => {
    if (String(getAuthItem("user_id")) !== String(user?.id)) return;
    setAuthItem("username", user.username);
    setAuthItem("email", user.email);
    setAuthItem("role", user.role);
  };

  const mergeUpdatedUser = (updatedUser) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user))
    );
    syncCurrentAuthUser(updatedUser);
  };

  const openDeleteModal = (user) => {
    if (String(getAuthItem("user_id")) === String(user.id)) {
      notify.info("Không thể xóa tài khoản đang đăng nhập");
      return;
    }

    setPendingDeleteUser(user);
  };

  const closeDeleteModal = () => {
    if (deletingUserId) return;
    setPendingDeleteUser(null);
  };

  const handleDeleteUser = async () => {
    const userId = pendingDeleteUser?.id;
    if (!userId) return;

    if (String(getAuthItem("user_id")) === String(userId)) {
      notify.info("Không thể xóa tài khoản đang đăng nhập");
      return;
    }

    try {
      setDeletingUserId(userId);
      const res = await apiClient.post(
        "/legacy",
        { action: "deleteUser", user_id: userId },
        { headers: buildAuthHeaders() }
      );

      if (res.data?.success) {
        setUsers((prev) => prev.filter((user) => user.id !== userId));
        setPendingDeleteUser(null);
        notify.success("Đã xóa người dùng");
      } else {
        notify.info(res.data?.message || "Lỗi khi xóa người dùng");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      notify.info(err?.response?.data?.message || "Lỗi khi xóa người dùng");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleChangeRole = async (userId, role) => {
    const normalizedRole = role === "admin" ? "admin" : "user";

    try {
      const res = await apiClient.post(
        "/legacy",
        { action: "updateUserRole", user_id: userId, role: normalizedRole },
        { headers: buildAuthHeaders() }
      );

      if (res.data?.success) {
        mergeUpdatedUser(res.data.data || { id: userId, role: normalizedRole });
      } else {
        notify.info(res.data?.message || "Lỗi khi cập nhật vai trò");
      }
    } catch (err) {
      console.error("Update role error:", err);
      notify.info(err?.response?.data?.message || "Lỗi khi cập nhật vai trò");
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setUpdatedInfo(buildUserForm(user));
  };

  const closeEditModal = () => {
    setSelectedUser(null);
    setUpdatedInfo(emptyUserForm);
    setSaving(false);
  };

  const handleLogout = () => {
    logoutAuthSession("/");
  };

  const handleUpdateUserInfo = async () => {
    if (!selectedUser || saving) return;

    if (!updatedInfo.username.trim() || !updatedInfo.email.trim()) {
      notify.info("Vui lòng nhập tên đăng nhập và email");
      return;
    }

    try {
      setSaving(true);
      const res = await apiClient.post(
        "/legacy",
        {
          action: "updateUserInfo",
          user_id: selectedUser.id,
          username: updatedInfo.username.trim(),
          full_name: updatedInfo.full_name.trim(),
          email: updatedInfo.email.trim(),
          phone: updatedInfo.phone.trim(),
          address: updatedInfo.address.trim(),
          role: updatedInfo.role,
          is_active: updatedInfo.is_active,
          password: updatedInfo.password.trim(),
        },
        { headers: buildAuthHeaders() }
      );

      if (res.data?.success) {
        mergeUpdatedUser(res.data.data || { ...selectedUser, ...updatedInfo, password: undefined });
        closeEditModal();
      } else {
        notify.info(res.data?.message || "Lỗi khi cập nhật");
      }
    } catch (err) {
      console.error("Update user info error:", err);
      notify.info(err?.response?.data?.message || "Lỗi khi cập nhật");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="logo">NGỌC THIỆN ADMIN</div>
        <ul>
          <li>
            <Link to="/dashboard">
              <FaChartPie /> Tổng quan
            </Link>
          </li>
          <li className="active">
            <Link to="/qlnguoidung">
              <FaUsers /> Người dùng
            </Link>
          </li>
          <li>
            <Link to="/qlsanpham">
              <FaBox /> Dịch vụ
            </Link>
          </li>
          <li>
            <Link to="/qlhinhanh">
              <FaImage /> Ảnh trang chủ
            </Link>
          </li>
          <li>
            <Link to="/qldonhang">
              <FaShoppingCart /> Đơn hàng
            </Link>
          </li>
          <li>
            <Link to="/qltinnhan">
              <FaComments /> Tin nhắn
            </Link>
          </li>
          <li>
            <Link to="/notification">
              <FaBell /> Lịch tư vấn
            </Link>
          </li>
          <li>
            <Link to="/lichlamviec">
              <FaRegCalendarAlt /> Lịch làm việc
            </Link>
          </li>
          <li>
            <Link to="/qlhoatdong">
              <FaHistory /> Lịch sử hoạt động
            </Link>
          </li>
        </ul>
      </aside>

      <div className="admin-content">
        <div className="page-header">
          <h2>
            <FaUsers /> Quản lý người dùng
          </h2>
          <div className="page-actions">
            <button className="back-btn" onClick={() => navigate("/dashboard")}>
              <FaArrowLeft /> Quay lại
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Đăng xuất
            </button>
          </div>
        </div>

        {errorMessage && <div className="error-box">{errorMessage}</div>}

        {loading ? (
          <div className="loading">Đang tải dữ liệu...</div>
        ) : (
          <div className="table-wrapper">
            {users.length === 0 ? (
              <div className="empty">Không có người dùng</div>
            ) : (
              <div className="user-grid">
                {users.map((user) => (
                  <div key={user.id} className="user-card">
                    <div className="user-card-head">
                      <span className="user-id">#{user.id}</span>
                      <div className="action-buttons">
                        <button className="edit-btn" onClick={() => openEditModal(user)} title="Chỉnh sửa">
                          <FaEdit />
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => openDeleteModal(user)}
                          title="Xóa"
                          disabled={deletingUserId === user.id}
                        >
                          {deletingUserId === user.id ? "..." : <FaTrash />}
                        </button>
                      </div>
                    </div>

                    <div className="user-name">{getDisplayName(user)}</div>
                    <div className="user-email">{user.email}</div>
                    <div className="user-meta">
                      <span>{user.phone || "Chưa có SĐT"}</span>
                      <span>{user.is_active === false ? "Tạm khóa" : "Đang hoạt động"}</span>
                    </div>

                    <div className="user-role-row">
                      <span>Vai trò</span>
                      <select
                        className="role-select"
                        value={user.role === "admin" ? "admin" : "user"}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="user">Người dùng</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedUser && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Chỉnh sửa người dùng</h3>

              <input
                type="text"
                placeholder="Tên đăng nhập"
                value={updatedInfo.username}
                onChange={(e) => setUpdatedInfo({ ...updatedInfo, username: e.target.value })}
              />
              <input
                type="text"
                placeholder="Họ và tên"
                value={updatedInfo.full_name}
                onChange={(e) => setUpdatedInfo({ ...updatedInfo, full_name: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                value={updatedInfo.email}
                onChange={(e) => setUpdatedInfo({ ...updatedInfo, email: e.target.value })}
              />
              <input
                type="text"
                placeholder="Số điện thoại"
                value={updatedInfo.phone}
                onChange={(e) => setUpdatedInfo({ ...updatedInfo, phone: e.target.value })}
              />
              <textarea
                placeholder="Địa chỉ"
                value={updatedInfo.address}
                onChange={(e) => setUpdatedInfo({ ...updatedInfo, address: e.target.value })}
              />
              <select
                value={updatedInfo.role}
                onChange={(e) => setUpdatedInfo({ ...updatedInfo, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="user">Người dùng</option>
              </select>
              <label className="modal-check">
                <input
                  type="checkbox"
                  checked={updatedInfo.is_active}
                  onChange={(e) => setUpdatedInfo({ ...updatedInfo, is_active: e.target.checked })}
                />
                Tài khoản đang hoạt động
              </label>
              <input
                type="password"
                placeholder="Mật khẩu mới (bỏ trống nếu không đổi)"
                value={updatedInfo.password}
                onChange={(e) => setUpdatedInfo({ ...updatedInfo, password: e.target.value })}
              />

              <div className="modal-actions">
                <button className="save-btn" disabled={saving} onClick={handleUpdateUserInfo}>
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
                <button className="cancel-btn" disabled={saving} onClick={closeEditModal}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingDeleteUser && (
          <div className="modal-overlay system-modal-overlay">
            <div className="system-modal-box">
              <div className="system-modal-icon">
                <FaTrash />
              </div>
              <div className="system-modal-content">
                <span className="system-modal-kicker">Thông báo hệ thống</span>
                <h3>Xóa người dùng?</h3>
                <p>
                  Bạn đang chuẩn bị xóa tài khoản{" "}
                  <b>{getDisplayName(pendingDeleteUser)}</b>. Dữ liệu đơn hàng, giỏ hàng,
                  lịch tư vấn và chat liên quan cũng sẽ bị xóa.
                </p>
              </div>

              <div className="system-modal-actions">
                <button
                  type="button"
                  className="system-cancel-btn"
                  onClick={closeDeleteModal}
                  disabled={Boolean(deletingUserId)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="system-danger-btn"
                  onClick={handleDeleteUser}
                  disabled={Boolean(deletingUserId)}
                >
                  {deletingUserId ? "Đang xóa..." : "Xóa người dùng"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;

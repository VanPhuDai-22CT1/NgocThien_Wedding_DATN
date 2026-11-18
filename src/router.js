import React, { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ROUTERS } from "./utils/router";
import { getAuthItem, getAuthSession } from "utils/authStorage";
import PageLoadBoundary, { PageLoading } from "./component/PageLoadBoundary";
import AdminShell from "./component/AdminShell";
const MasterLayout = lazy(() => import("./pages/users/theme/masterLayuot"));

// ===== USER =====
const Homepage = lazy(() => import("./pages/users/trangchu"));
const DangNhap = lazy(() => import("./pages/users/dangnhap"));
const DangKy = lazy(() => import("./pages/users/dangky"));
const QuenMatKhau = lazy(() => import("./pages/users/quenmatkhau"));
const DatLaiMatKhau = lazy(() => import("./pages/users/datlaimatkhau"));
const ProductsPage = lazy(() => import("./pages/users/sanpham"));
const ProductDetailPage = lazy(() => import("./pages/users/chitietsanpham"));
const GioHang = lazy(() => import("./pages/users/giohang"));
const TrangThongTin = lazy(() => import("./pages/users/trangthongtin"));
const GioiThieu = lazy(() => import("./pages/users/gioithieu"));
const DatHang = lazy(() => import("./pages/users/dathang"));
const DonHang = lazy(() => import("./pages/users/donhang"));
const ThongBao = lazy(() => import("./pages/users/thongbao"));
const ThanhToan = lazy(() => import("./pages/users/thanhtoan"));
const HoaDon = lazy(() => import("./pages/users/hoadon"));
const CoderProfilePage = lazy(() => import("./pages/users/hosocode"));

// ===== ADMIN =====
const Dashboard = lazy(() => import("./pages/admin/dashboard"));
const OrderManagement = lazy(() => import("./pages/admin/qldonhang"));
const UserList = lazy(() => import("./pages/admin/qlnguoidung"));
const ProductManagement = lazy(() => import("./pages/admin/qlsanpham"));
const HomeImageManagement = lazy(() => import("./pages/admin/qlhinhanh"));
const QLHoatDong = lazy(() => import("./pages/admin/QLHoatDong"));
const Notification = lazy(() => import("./pages/admin/thongbaoad"));
const AdminChat = lazy(() => import("./pages/admin/adminchat"));
const WorkScheduleManagement = lazy(() => import("./pages/admin/lichlamviec"));

const isAdminHost =
  process.env.REACT_APP_APP_MODE === "admin" ||
  (typeof window !== "undefined" && ["3001", "3002"].includes(window.location.port));
const userOrigin = process.env.REACT_APP_USER_URL || "http://localhost:3000";
const adminOrigin = process.env.REACT_APP_ADMIN_URL || "http://localhost:3001";

const redirectWithAuthSession = (url) => {
  if (typeof window === "undefined") return;

  const authSession = getAuthSession();
  if (Object.keys(authSession).length > 0) {
    window.name = JSON.stringify(authSession);
  }

  window.location.replace(url);
};

const UserLanding = () => {
  const role = getAuthItem("role");

  useEffect(() => {
    if (role === "admin") {
      redirectWithAuthSession(`${adminOrigin}/`);
    }
  }, [role]);

  if (role === "admin") {
    return null;
  }

  return <Homepage />;
};

const AdminLanding = () => {
  const role = getAuthItem("role");

  useEffect(() => {
    if (role && role !== "admin") {
      redirectWithAuthSession(`${userOrigin}/`);
    }
  }, [role]);

  if (role && role !== "admin") {
    return null;
  }

  return role === "admin" ? <Navigate to="/dashboard" replace /> : <DangNhap />;
};

const RequireAdmin = ({ children }) => {
  if (!getAuthItem("token") || getAuthItem("role") !== "admin") {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const RouterCustom = () => {
  const { pathname } = useLocation();
  const userRouters = [
    { path: ROUTERS.USER.HOME, element: <UserLanding /> },
    { path: ROUTERS.USER.LOGIN, element: <DangNhap /> },
    { path: ROUTERS.USER.Register, element: <DangKy /> },
    { path: ROUTERS.USER.FORGOT, element: <QuenMatKhau /> },
    { path: ROUTERS.USER.RESET, element: <DatLaiMatKhau /> },
    { path: ROUTERS.USER.ProductsPage, element: <ProductsPage /> },
    { path: "/chitietsanpham/:id", element: <ProductDetailPage /> },
    { path: ROUTERS.USER.PROFILE, element: <GioHang /> },
    { path: ROUTERS.USER.CustomerInfo, element: <TrangThongTin /> },
    { path: "/trangthongtinf", element: <Navigate to={ROUTERS.USER.CustomerInfo} replace /> },
    { path: ROUTERS.USER.FreshVeggiesShop, element: <GioiThieu /> },
    { path: ROUTERS.USER.OrderPage, element: <DatHang /> },
    { path: ROUTERS.USER.Payment, element: <ThanhToan /> },

    // 🔥 HÓA ĐƠN (không dùng layout)
    { path: "/hoadon/:id", element: <HoaDon />, noLayout: true },

    { path: ROUTERS.USER.OrderDetail, element: <DonHang /> },
    { path: ROUTERS.USER.Notification, element: <ThongBao /> },
  ];

  const adminRouters = [
    { path: "/", element: <AdminLanding /> },
    { path: ROUTERS.USER.LOGIN, element: <DangNhap /> },
    { path: ROUTERS.ADMIN.Dashboard, element: <Dashboard /> },
    { path: ROUTERS.ADMIN.OrderManagement, element: <OrderManagement /> },
    { path: ROUTERS.ADMIN.UserList, element: <UserList /> },
    { path: ROUTERS.ADMIN.ProductManagement, element: <ProductManagement /> },
    { path: ROUTERS.ADMIN.HomeImageManagement, element: <HomeImageManagement /> },
    { path: ROUTERS.ADMIN.WorkSchedule, element: <WorkScheduleManagement /> },
    { path: ROUTERS.ADMIN.Activity, element: <QLHoatDong /> },
    { path: ROUTERS.ADMIN.ChatManagement, element: <AdminChat /> },
    { path: ROUTERS.ADMIN.Statistics, element: <Navigate to="/dashboard" replace /> },
    { path: ROUTERS.ADMIN.CoderProfile, element: <CoderProfilePage /> },
    { path: "/chatadmin", element: <AdminChat /> },
    { path: "/notification", element: <Notification /> },
  ];

  const activeRouters = isAdminHost ? adminRouters : userRouters;

  const renderRouteElement = (item) => {
    if (isAdminHost) {
      return item.element;
    }

    return item.noLayout ||
      item.path === ROUTERS.USER.LOGIN ||
      item.path === ROUTERS.USER.Register ||
      item.path === ROUTERS.USER.FORGOT ||
      item.path === ROUTERS.USER.RESET
      ? item.element
      : <MasterLayout>{item.element}</MasterLayout>;
  };

  return (
    <PageLoadBoundary key={pathname}>
      <Suspense fallback={<PageLoading />}>
    <Routes>
      {activeRouters.map((item, index) => (
        <Route
          key={index}
          path={item.path}
          element={
            isAdminHost ? (
              item.path === "/login" || item.path === "/" ? item.element : <RequireAdmin><AdminShell><Suspense fallback={<PageLoading />}>{item.element}</Suspense></AdminShell></RequireAdmin>
            ) : (
              <>
                {renderRouteElement(item)}
              </>
            )
          }
        />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
      </Suspense>
    </PageLoadBoundary>
  );
};

export default RouterCustom;

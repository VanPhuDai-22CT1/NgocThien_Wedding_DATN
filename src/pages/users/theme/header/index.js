import BrandWordmark from "component/BrandWordmark";
import React, { memo, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBell, FaSearch, FaSignOutAlt } from "react-icons/fa";
import { FaBars, FaUser } from "react-icons/fa6";
import { CgMail } from "react-icons/cg";
import { ROUTERS } from "utils/router";
import { clearAuthSession, getAuthItem } from "utils/authStorage";
import "./style.scss";

import nen1 from "assets/users/images/hero/nen1.jpg";
import nen2 from "assets/users/images/hero/nen2.jpg";
import nen3 from "assets/users/images/hero/nen3.jpg";

const CUSTOMIZE_API = "/api/homepage-config";

const serviceCategories = [
  "Trang trí gia tiên",
  "Trang trí tiệc cưới",
  "Chụp ảnh cưới",
  "Quay phim cưới",
  "Thực đơn tiệc cưới",
  "Mâm quả cưới hỏi",
  "Dịch vụ bê tráp",
  "Cho thuê khung rạp",
  "Âm thanh ánh sáng",
  "Trang phục cưới",
  "Xe hoa",
  "Thiệp cưới & quà cưới",
  "Trọn gói ngày cưới",
];

const serviceMenuGroups = [
  {
    title: "Trang trí - tiệc",
    items: ["Trang trí gia tiên", "Trang trí tiệc cưới", "Thực đơn tiệc cưới"],
  },
  {
    title: "Hình ảnh - lưu niệm",
    items: ["Chụp ảnh cưới", "Quay phim cưới", "Thiệp cưới & quà cưới"],
  },
  {
    title: "Lễ vật - nhân sự",
    items: ["Mâm quả cưới hỏi", "Dịch vụ bê tráp", "Trang phục cưới"],
  },
  {
    title: "Vận hành ngày cưới",
    items: ["Cho thuê khung rạp", "Âm thanh ánh sáng", "Xe hoa", "Trọn gói ngày cưới"],
  },
];

const menus = [
  { name: "Trang chủ", path: ROUTERS.USER.HOME },
  { name: "Sản phẩm", path: ROUTERS.USER.ProductsPage },
  { name: "Dịch vụ", path: ROUTERS.USER.ProductsPage },
  { name: "Giới thiệu", path: ROUTERS.USER.FreshVeggiesShop },
  { name: "Đơn hàng", path: ROUTERS.USER.OrderDetail },
  { name: "Gói đã chọn", path: ROUTERS.USER.PROFILE },
];

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sliderRef = useRef(null);

  const [showCategories, setShowCategories] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname, location.hash]);
  const [username, setUsername] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [heroConfig, setHeroConfig] = useState({
    slider: Array(3).fill(""),
    background: "",
  });

  const toSiteImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `/${path.replace(/^\/+/, "")}`;
  };

  const images = [
    toSiteImageUrl(heroConfig.slider[0]) || nen1,
    toSiteImageUrl(heroConfig.slider[1]) || nen2,
    toSiteImageUrl(heroConfig.slider[2]) || nen3,
  ];
  const heroBackground = toSiteImageUrl(heroConfig.background);
  const isHome = location.pathname === ROUTERS.USER.HOME;

  useEffect(() => {
    const storedUser = getAuthItem("username");
    if (storedUser) setUsername(storedUser);
  }, []);

  useEffect(() => {
    axios
      .get(`${CUSTOMIZE_API}?action=getHomepageImages`)
      .then((res) => {
        if (!res.data?.success) return;

        const data = res.data.data || {};
        const slider = Array.isArray(data.headerSliderImages)
          ? [...data.headerSliderImages, ...Array(3).fill("")].slice(0, 3)
          : Array(3).fill("");

        setHeroConfig({
          slider,
          background: data.heroBackgroundImage || "",
        });
      })
      .catch((err) => {
        console.error("Load header images error:", err);
      });
  }, []);

  useEffect(() => {
    sliderRef.current = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(sliderRef.current);
  }, [images.length]);

  useEffect(() => {
    setSearchText(new URLSearchParams(location.search).get("search") || "");
  }, [location.pathname, location.search]);

  const goToServiceCategory = (category) => {
    navigate(`${ROUTERS.USER.ProductsPage}?category=${encodeURIComponent(category)}`);
    setShowCategories(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    setUsername("");
    setShowUserMenu(false);
    navigate(ROUTERS.USER.HOME);
  };

  return (
    <>
      <div className="header__top">
        <div className="header__top-inner">
          <div className="header__top-left">
            <CgMail />
            {username ? (
              <span>Xin chào, {username}</span>
            ) : (
              <span>Dịch vụ cưới hỏi Ngọc Thiện</span>
            )}
          </div>

          <div className="header__top-right">
            {username ? (
              <div className="user-dropdown">
                <button
                  type="button"
                  className="user-icon"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  aria-label="Mở menu tài khoản"
                >
                  <FaUser />
                </button>

                {showUserMenu && (
                  <div className="user-menu">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(ROUTERS.USER.CustomerInfo);
                        setShowUserMenu(false);
                      }}
                    >
                      <FaUser /> Xem thông tin
                    </button>
                    <button type="button" onClick={handleLogout}>
                      <FaSignOutAlt /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to={ROUTERS.USER.LOGIN} className="login-btn">
                <FaUser /> Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </div>

      <header className="header__main">
        <div className="header__main-inner">
          <Link to={ROUTERS.USER.HOME} className="header__logo">
            <BrandWordmark />
          </Link>

          <button type="button" className="header__mobile-toggle" aria-label="Mở menu điều hướng" aria-expanded={mobileMenuOpen} aria-controls="site-navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}><FaBars /></button>
          <nav id="site-navigation" className={`header__menu ${mobileMenuOpen ? "is-open" : ""}`}>
            <ul>
              {menus.map((menu) => {
                const isServiceMenu = menu.name === "Dịch vụ";

                if (!isServiceMenu) {
                  return (
                    <li key={menu.name}>
                      <Link to={menu.path} aria-current={menu.name === "Sản phẩm" && (location.pathname === "/sanpham" || location.pathname.startsWith("/chitietsanpham/")) ? "page" : undefined}>{menu.name}</Link>
                    </li>
                  );
                }

                return (
                  <li key={menu.name} className="menu-item menu-item--services">
                    <Link to={menu.path}>{menu.name}</Link>

                    <div className="service-dropdown">
                      {serviceMenuGroups.map((group) => (
                        <div key={group.title} className="service-dropdown__group">
                          <h4>{group.title}</h4>
                          <ul>
                            {group.items.map((item) => (
                              <li key={item}>
                                <button
                                  type="button"
                                  onClick={() => goToServiceCategory(item)}
                                >
                                  {item}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="header__actions">
          <form className="header__search" role="search" aria-label="Tìm kiếm trên website" onSubmit={(event) => {
            event.preventDefault();
            const keyword = searchText.trim();
            navigate(keyword ? `${ROUTERS.USER.ProductsPage}?search=${encodeURIComponent(keyword)}` : ROUTERS.USER.ProductsPage);
            setMobileMenuOpen(false);
          }}>
            <input
              type="search"
              aria-label="Tìm kiếm dịch vụ"
              placeholder="Tìm kiếm dịch vụ..."
              maxLength={120}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Tìm kiếm"
            >
              <FaSearch />
            </button>
          </form>
          <Link className="header__notification" to={ROUTERS.USER.Notification} aria-label="Thông báo" title="Thông báo" aria-current={location.pathname === ROUTERS.USER.Notification ? "page" : undefined}><FaBell aria-hidden="true" /></Link>
          </div>
        </div>
      </header>

      {isHome && (
        <section className="hero">
          <div className="hero__inner">
            <aside className="hero__categories">
              <button
                type="button"
                className="hero__categories__all"
                onClick={() => setShowCategories((prev) => !prev)}
              >
                <FaBars /> Danh sách dịch vụ
              </button>

              {showCategories && (
                <ul>
                  {serviceCategories.map((category) => (
                    <li key={category}>
                      <button type="button" onClick={() => goToServiceCategory(category)}>
                        {category}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <div
              className="hero__main"
              style={
                heroBackground
                  ? {
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${heroBackground})`,
                      backgroundPosition: "20% 15%",
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                    }
                  : undefined
              }
            >
              <div className="hero__content">
                <span className="hero__badge">Trọn gói cưới hỏi</span>
                <h2 className="wedding-title">Ngọc Thiện Wedding</h2>

                <button
                  className="btn-3d"
                  type="button"
                  onClick={() => navigate(ROUTERS.USER.ProductsPage)}
                >
                  <span className="shadow"></span>
                  <span className="edge"></span>
                  <span className="front text">Xem dịch vụ</span>
                </button>
              </div>

              <div className="hero__image">
                <img src={images[currentImage]} alt="Ngọc Thiện Wedding" />
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default memo(Header);

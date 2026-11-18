import { memo, useState } from "react";
import "./style.scss";
import { Link, useNavigate } from "react-router-dom";
import BrandWordmark from "component/BrandWordmark";

const Footer = () => {
    const navigate = useNavigate();
    const [newsletterEmail, setNewsletterEmail] = useState("");

    const handleSubmitNewsletter = (e) => {
        e.preventDefault();
        navigate("/dangky", {
            state: { email: newsletterEmail.trim() },
        });
    };

    return (
        <footer className="footer">
            <div className="container">
                <div className="row">
                    {/* Footer About */}
                    <div className="col-lg-3 col-md-6 col-xm-6 col-xs-12">
                        <div className="footer__about">
                        <Link className="footer__brand" to="/gioithieu"><BrandWordmark /></Link>
                        <p className="footer__brand-caption">Wedding &amp; Events</p>


                        </div>

                    </div>

                    {/* Footer Widget */}
                    <div className="col-lg-6 col-md-6 col-xs-12">
                        <div className="footer__widget">
                            <ul>
                                <li><Link to="/gioithieu">Giới thiệu</Link></li>
                                <li><Link to="/sanpham">Sản phẩm</Link></li>
                                <li><Link to="/sanpham">Dịch vụ cưới hỏi</Link></li>
                            </ul>
                            <ul>
                                <li><Link to="/donhang">Đơn hàng</Link></li>
                                <li><Link to="/giohang">Gói đã chọn</Link></li>
                                <li><Link to="/dangky">Đăng ký</Link></li>
                            </ul>
                        </div>
                    </div>

                    {/* Footer Subscription & Logout */}
                    <div className="col-lg-3 col-md-12 col-xm-12 col-xs-12">
                        <div className="footer__widget">
                            <h6>Khuyến Mãi & Ưu Đãi</h6>
                            <h6>Đăng ký thông tin tại đây</h6>
                            <form onSubmit={handleSubmitNewsletter}>
                                <div className="input-group input-group-nested">
                                    <input
                                        type="email"
                                        placeholder="Nhập email để nhận ưu đãi"
                                        value={newsletterEmail}
                                        onChange={(e) => setNewsletterEmail(e.target.value)}
                                        required
                                    />
                                    <button type="submit" className="button-submit">
                                        Đăng ký
                                    </button>
                                </div>
                            </form>
                            
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default memo(Footer);

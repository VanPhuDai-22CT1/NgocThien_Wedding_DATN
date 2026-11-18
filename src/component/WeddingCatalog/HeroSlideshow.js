import React, { useEffect, useState } from "react";
import { getImageUrl } from "utils/image";

const slides = [
  { image: "4-0.jpg", caption: "Phông nhung đỏ, hoa tươi và những chi tiết trọn vẹn", position: "center 48%" },
  { image: "1-1.jpg", caption: "Không gian gia tiên ấm cúng cho ngày chung đôi", position: "center 58%" },
  { image: "4-2.jpg", caption: "Một góc lễ cưới, một dấu ấn của riêng bạn", position: "center" },
  { image: "4-3.jpg", caption: "Sắc đỏ truyền thống trong từng chi tiết trang trí", position: "center" },
  { image: "4-4.jpg", caption: "Lưu giữ vẻ đẹp của ngày trọng đại", position: "center" },
];

export default function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [phase, setPhase] = useState(0);
  const [loaded, setLoaded] = useState({});
  const [hidden, setHidden] = useState(document.hidden);
  const cycleLength = (slides.length - 1) * 2;
  const requested = phase < slides.length ? phase : cycleLength - phase;

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => document.removeEventListener("visibilitychange", visibility);
  }, []);

  useEffect(() => {
    if (loaded[requested]) setActive(requested);
  }, [loaded, requested]);

  useEffect(() => {
    if (hidden || requested !== active || !loaded[active]) return;
    const timer = setTimeout(() => setPhase((value) => (value + 1) % cycleLength), 5000);
    return () => clearTimeout(timer);
  }, [hidden, active, requested, phase, loaded, cycleLength]);

  return <section className="wc-hero-image wc-slideshow" aria-label="Ảnh không gian cưới Ngọc Thiện" aria-live="off" data-active-slide={active + 1}>
    <div className="wc-slideshow-stage">
      {slides.map((slide, index) => <div key={slide.image} className={`wc-slide ${active === index ? "is-active" : ""}`} aria-hidden={active !== index}>
        <img src={`/images/wedding-samples/${slide.image}`} alt={slide.caption} style={{ objectPosition: slide.position }} fetchpriority={index === 0 ? "high" : "low"} decoding="async" onLoad={() => setLoaded((previous) => previous[index] ? previous : { ...previous, [index]: true })} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = getImageUrl(null); }} />
      </div>)}
    </div>
  </section>;
}


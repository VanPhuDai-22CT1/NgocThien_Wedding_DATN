import useAdminTheme from "component/AdminShell/useAdminTheme";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./style.scss";
import "./overview.scss";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowUpRight, FiCalendar, FiChevronDown, FiMessageSquare, FiPackage, FiPhone, FiMapPin, FiRefreshCw, FiShoppingBag } from "react-icons/fi";
import { apiClient, buildAuthHeaders } from "utils/apiClient";
import { getAuthItem } from "utils/authStorage";
import { fetchDashboardStats, dashboardStatsError } from "utils/dashboardStats";


import { FaUsers, FaBox, FaShoppingCart, FaChartPie, FaCreditCard, FaDownload, FaBell, FaRobot, FaChevronLeft, FaChevronRight, FaRegCalendarAlt } from "react-icons/fa";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

import { Bar, Doughnut } from "react-chartjs-2";
import { notify } from "utils/notify";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const WEEK_DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const Dashboard = () => {

  const navigate = useNavigate();

  /* ================= STATE ================= */

  const [stats, setStats] = useState({
    total_users: 0,
    total_products: 0,
    total_orders: 0,
    total_consultations: 0,
    total_revenue: 0,
    completed_orders: 0,
    pending_orders: 0,
    cancelled_orders: 0,
    months: [],
    monthly_revenue: []
  });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [statsAuthExpired, setStatsAuthExpired] = useState(false);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState(null);
  const statsRequest = useRef(null);

  const loadDashboard = useCallback(async () => {
    if (statsRequest.current) return;
    const controller = new AbortController();
    statsRequest.current = controller;
    setStatsLoading(true);
    try {
      const data = await fetchDashboardStats(apiClient, {
        headers: buildAuthHeaders(), signal: controller.signal,
      });
      setStats(data);
      setStatsLoaded(true);
      setStatsError("");
      setStatsAuthExpired(false);
      setStatsUpdatedAt(new Date());
    } catch (error) {
      if (!controller.signal.aborted) {
        setStatsError(dashboardStatsError(error));
        setStatsAuthExpired(error?.response?.status === 401);
      }
    } finally {
      if (statsRequest.current === controller) {
        statsRequest.current = null;
        if (!controller.signal.aborted) setStatsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") loadDashboard(); };
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      statsRequest.current?.abort();
      statsRequest.current = null;
    };
  }, [loadDashboard]);

  const [consultations, setConsultations] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [consultationsError, setConsultationsError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [darkMode] = useAdminTheme();
  const [selectedExportType, setSelectedExportType] = useState("day");
  const [revenueRange, setRevenueRange] = useState(12);
  const [, setRole] = useState("");
  const [, setUsername] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState("");

  const toDateKey = (dateValue) => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const normalizedConsultations = useMemo(() => {
    return (consultations || [])
      .map((item) => {
        const dateKey = toDateKey(item.event_date);
        return {
          ...item,
          dateKey,
          dateObject: dateKey ? new Date(item.event_date) : null,
        };
      })
      .filter((item) => item.dateKey);
  }, [consultations]);

  const eventsByDate = useMemo(() => {
    const map = {};
    normalizedConsultations.forEach((item) => {
      if (!map[item.dateKey]) {
        map[item.dateKey] = [];
      }
      map[item.dateKey].push(item);
    });
    return map;
  }, [normalizedConsultations]);

  const monthGridDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstWeekday; i++) {
      days.push({ type: "empty", key: `empty-${i}` });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = toDateKey(date);
      days.push({
        type: "day",
        key: dateKey,
        day,
        dateKey,
        eventCount: (eventsByDate[dateKey] || []).length,
      });
    }

    return days;
  }, [currentMonth, eventsByDate]);

  const selectedScheduleItems = useMemo(() => {
    if (!selectedDateKey) return [];
    return eventsByDate[selectedDateKey] || [];
  }, [eventsByDate, selectedDateKey]);

  const currentMonthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("vi-VN", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstEventInMonth = normalizedConsultations
      .filter((item) => item.dateObject && item.dateObject.getFullYear() === year && item.dateObject.getMonth() === month)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0];

    if (firstEventInMonth) {
      setSelectedDateKey(firstEventInMonth.dateKey);
      return;
    }

    const firstDayKey = toDateKey(new Date(year, month, 1));
    setSelectedDateKey(firstDayKey);
  }, [currentMonth, normalizedConsultations]);



  /* ================= LOAD USER ================= */

  useEffect(() => {

    const storedUser = getAuthItem("username");
    const storedRole = getAuthItem("role");

    if (!storedUser) {
      navigate("/");
      return;
    }

    setUsername(storedUser);
    setRole(storedRole);

    loadDashboard();
    loadConsultations();
    loadAiSuggestions();
    loadUpcomingEvents();

  }, [navigate, loadDashboard]);

  /* ================= LOAD DASHBOARD ================= */

  const loadAiSuggestions = async () => {
    try {
      setAiLoading(true);
      const res = await apiClient.get(`/legacy?action=getAdminAiSuggestions&limit=3`, {
        headers: buildAuthHeaders(),
      });
      const data = res?.data;
      if (data?.success) {
        setAiSuggestions(Array.isArray(data.data) ? data.data : []);
      } else {
        setAiSuggestions([]);
      }
    } catch (error) {
      console.log("AI suggestion error:", error);
      setAiSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  /* ================= LOAD CONSULT ================= */

  const loadConsultations = async () => {

    try {
      setConsultationsLoading(true);

      const res = await apiClient.get(`/legacy?action=getConsultations`, { headers: buildAuthHeaders() });
      const data = res?.data;
      if (!data?.success || !Array.isArray(data.data)) throw new Error("Invalid consultation response");
      setConsultations(data.data);
      setConsultationsError("");

    } catch(error){
      setConsultationsError("Không thể tải lịch tư vấn. Vui lòng thử lại.");
    } finally {
      setConsultationsLoading(false);
    }

  };

  /* ================= LOAD UPCOMING EVENTS ================= */

  const loadUpcomingEvents = async () => {try {const response = await apiClient.get('/legacy?action=getUpcomingEvents', {headers:buildAuthHeaders()});if(response.data?.success && Array.isArray(response.data.data))setUpcomingEvents(response.data.data);} catch {setUpcomingEvents([]);}};

  const exportStatistics = async (type) => {
    if (exporting) return;
    try {
      setExporting(true);
      const res = await apiClient.get(`/legacy`, {
        params: { action: 'exportStatistics', type },
        responseType: 'blob',
        headers: buildAuthHeaders(),
      });

      const blob = new Blob([res.data], {
        type: res.headers['content-type'] || 'text/csv;charset=utf-8',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${type}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      notify.info('Không thể xuất dữ liệu thống kê');
    } finally {
      setExporting(false);
    }
  };

  /* ================= LOGOUT ================= */



  /* ================= MONEY ================= */

  const formatMoney = (money) => {
    return new Intl.NumberFormat("vi-VN").format(money || 0) + " đ";
  };
  const formatCount = (value) => statsLoaded ? new Intl.NumberFormat("vi-VN").format(value) : "—";

  /* ================= BAR CHART ================= */

  const revenueMonths = (stats.months || []).slice(-revenueRange);
  const revenueValues = (stats.monthly_revenue || []).slice(-revenueRange).map(value => Number(value) || 0);
  const periodRevenue = revenueValues.reduce((sum, value) => sum + value, 0);
  const averageRevenue = revenueValues.length ? periodRevenue / revenueValues.length : 0;
  const formatPercent = value => `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)}%`;
  const barData = {

    labels: revenueMonths,

    datasets:[
      {
        label:"Doanh thu",
        data: revenueValues,
        backgroundColor: darkMode ? "#ca8197" : "#8c2038",
        hoverBackgroundColor: darkMode ? "#e3a5b8" : "#6c172c",
        borderRadius: 5,
        maxBarThickness: 34,
        categoryPercentage: .7,
        barPercentage: .65
      }
    ]

  };

  /* ================= PIE ================= */

  const pieData = {

    labels:["Hoàn tất","Đang xử lý","Đã hủy"],

    datasets:[
      {
        data:[
          stats.completed_orders,
          stats.pending_orders,
          stats.cancelled_orders
        ],
        backgroundColor: darkMode
          ? ["#65b48c", "#df8ba5", "#d8aa61"]
          : ["#246b50", "#8c2038", "#a86f22"]
      }
    ]

  };

  const chartPlugins = { legend: { labels: { color: darkMode ? "#cbb7a5" : "#8b7766", boxWidth: 12, padding: 14, font: { family: "Be Vietnam Pro", size: 11 } } } };
  const chartScales = {
    x: { border: { display: false }, ticks: { color: darkMode ? "#bfb0b9" : "#827780", maxRotation: 0, autoSkip: true, font: { family: "Be Vietnam Pro", size: 10 }, callback: index => String(revenueMonths[index] || "").replace(/\/(\d{2})(\d{2})$/, "/$2") }, grid: { display: false } },
    y: { beginAtZero: true, border: { display: false }, ticks: { maxTicksLimit: 5, padding: 10, color: darkMode ? "#bfb0b9" : "#827780", font: { family: "Be Vietnam Pro", size: 10 }, callback: value => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1000000) }, grid: { color: darkMode ? "#3b323c" : "#eee9ed", drawTicks: false } },
  };
  const chartTooltip = { backgroundColor: darkMode ? "#f4eaf0" : "#431c29", titleColor: darkMode ? "#431c29" : "#fff", bodyColor: darkMode ? "#431c29" : "#fff", padding: 12, cornerRadius: 7, displayColors: false, titleFont: { family: "Be Vietnam Pro", size: 11, weight: "500" }, bodyFont: { family: "Be Vietnam Pro", size: 12 }, callbacks: { label: context => formatMoney(context.parsed.y) } };
  const chartMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? false : { duration: 350 };
  const vietnamToday = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());

  /* ================= RENDER ================= */

  return (

    <>
      <div className={`dashboard-layout nt-overview ${darkMode ? "dark":""}`}>

      {/* SIDEBAR */}



      {/* MAIN */}

      <div className="main-content">

        {/* TOPBAR */}

        <header className="topbar">
          <div className="topbar-title-group">

            <h1>Bảng điều khiển</h1>
            <p className="topbar-subtitle">Tổng quan kinh doanh và lịch tư vấn của Ngọc Thiện Wedding.</p>
          </div>



          <div className="nt-overview-date"><FiCalendar aria-hidden="true" /><span>{vietnamToday}</span></div>
        </header>

        <div className="nt-admin-stats-update">
          <span role="status" aria-live="polite">
            {statsLoading ? "Đang cập nhật số liệu…" : statsUpdatedAt ? `Cập nhật lúc ${statsUpdatedAt.toLocaleTimeString("vi-VN")} · Tự làm mới mỗi phút` : "Chưa tải được số liệu"}
          </span>
          <button className="btn-outline" type="button" onClick={loadDashboard} disabled={statsLoading}>
            <FiRefreshCw aria-hidden="true" />{statsLoading ? "Đang tải…" : "Làm mới số liệu"}
          </button>
        </div>
        {statsError && <div className="nt-admin-stats-error" role="alert">{statsError}{statsLoaded && " Đang hiển thị số liệu từ lần cập nhật thành công gần nhất."}{statsAuthExpired && <button type="button" className="btn-outline" onClick={() => navigate("/login")}>Đăng nhập lại</button>}</div>}
        {upcomingEvents.length > 0 && <Link className="nt-overview-upcoming" to="/notification"><FaBell aria-hidden="true" /><span><strong>Có lịch tư vấn sắp tới</strong><small>{upcomingEvents[0].name || "Khách hàng"} · {new Date(upcomingEvents[0].event_date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</small></span><span>Xem lịch <FiArrowUpRight aria-hidden="true" /></span></Link>}
        <nav className="nt-overview-shortcuts" aria-label="Thao tác nhanh"><Link to="/qldonhang"><FiShoppingBag aria-hidden="true" /><span>Quản lý đơn hàng</span><FiArrowUpRight aria-hidden="true" /></Link><Link to="/notification"><FiCalendar aria-hidden="true" /><span>Lịch tư vấn</span><FiArrowUpRight aria-hidden="true" /></Link><Link to="/qlsanpham"><FiPackage aria-hidden="true" /><span>Dịch vụ & sản phẩm</span><FiArrowUpRight aria-hidden="true" /></Link><Link to="/qltinnhan"><FiMessageSquare aria-hidden="true" /><span>Tin nhắn khách hàng</span><FiArrowUpRight aria-hidden="true" /></Link></nav>

        {/* STATS */}

        <div className="stats-grid" aria-busy={statsLoading}>

          <div className="stat-card">
            <div className="stat-icon users">
              <FaUsers />
            </div>
            <div className="stat-content">
              <h4>Người dùng</h4>
              <h2>{formatCount(stats.total_users)}</h2>
              {statsLoaded && Number.isSafeInteger(stats.total_customers) && <p className="online-payment-meta">{formatCount(stats.total_customers)} khách hàng · {formatCount(stats.total_users - stats.total_customers)} quản trị viên</p>}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon products">
              <FaBox />
            </div>
            <div className="stat-content">
              <h4>Dịch vụ</h4>
              <h2>{formatCount(stats.total_products)}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orders">
              <FaShoppingCart />
            </div>
            <div className="stat-content">
              <h4>Đơn hàng</h4>
              <h2>{formatCount(stats.total_orders)}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon consult">
              <FaBell />
            </div>
            <div className="stat-content">
              <h4>Lịch tư vấn</h4>
              <h2>{formatCount(stats.total_consultations)}</h2>
            </div>
          </div>

          <div className="stat-card highlight">
            <div className="stat-icon revenue">
              <FaChartPie />
            </div>
            <div className="stat-content">
              <h4>Doanh thu</h4>
              <h2>{statsLoaded ? formatMoney(stats.total_revenue) : "—"}</h2>

            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FaCreditCard />
            </div>
            <div className="stat-content">
              <h4>Đơn chọn chuyển khoản</h4>
              <h2>{formatCount(stats.online_payments || 0)}</h2>
              {statsLoaded && <p className="online-payment-meta">
                {formatMoney(stats.online_payment_revenue || 0)} đã thanh toán · {stats.online_payment_rate || 0}% tổng đơn
              </p>}
            </div>
          </div>

        </div>

        {/* CHART */}

        {statsLoaded && <div className="charts">

          <div className="chart-box nt-revenue-chart">
            <div className="nt-overview-panel-title"><div><h3>Doanh thu theo tháng</h3><p>Hiệu quả kinh doanh trong {revenueRange} tháng gần nhất</p></div><div className="nt-chart-period" role="group" aria-label="Khoảng thời gian doanh thu">{[6, 12].map(months => <button type="button" key={months} aria-pressed={revenueRange === months} onClick={() => setRevenueRange(months)}>{months} tháng</button>)}</div></div>
            <div className="nt-revenue-summary"><div><span>Doanh thu trong kỳ</span><strong>{formatMoney(periodRevenue)}</strong></div><div><span>Bình quân / tháng</span><strong>{formatMoney(Math.round(averageRevenue))}</strong></div></div>
            <div className="nt-chart-unit">Đơn vị: triệu đồng</div>
            <div className="nt-admin-chart-canvas"><Bar role="img" aria-label={`Biểu đồ doanh thu ${revenueRange} tháng, tổng ${formatMoney(periodRevenue)}`} data={barData} options={{ animation: chartMotion, responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { ...chartPlugins, tooltip: chartTooltip, legend: { display: false } }, scales: chartScales }} /></div>
            <div className="nt-chart-footnote"><span /><span>Doanh thu ghi nhận theo tháng</span></div>
          </div>

          <div className="chart-box nt-status-chart">
            <div className="nt-overview-panel-title"><div><h3>Tiến độ đơn hàng</h3><p>Theo dõi tình trạng phục vụ khách hàng</p></div><Link to="/qldonhang">Xem đơn <FiArrowUpRight aria-hidden="true" /></Link></div>
            {stats.total_orders > 0 ? <div className="nt-overview-donut"><div className="nt-admin-chart-canvas"><Doughnut data={pieData} options={{ animation: chartMotion, cutout: "70%", borderWidth: 0, spacing: 3, responsive: true, maintainAspectRatio: false, plugins: { ...chartPlugins, legend: { display: false } } }} /></div><div className="nt-overview-donut-total"><strong>{formatCount(stats.total_orders)}</strong><span>Tổng đơn hàng</span></div></div> : <div className="nt-overview-chart-empty">Chưa có đơn hàng để thống kê.</div>}
            <div className="nt-status-table"><div className="nt-status-table-head"><span>Trạng thái</span><span>Số đơn</span><span>Tỷ lệ</span></div>{pieData.labels.map((label, index) => { const count = Number(pieData.datasets[0].data[index]) || 0; return <div className="nt-status-table-row" key={label} style={{ "--nt-status-color": pieData.datasets[0].backgroundColor[index] }}><span><i style={{ backgroundColor: pieData.datasets[0].backgroundColor[index] }} />{label}</span><strong>{formatCount(count)}</strong><span>{formatPercent(stats.total_orders ? count / stats.total_orders * 100 : 0)}</span></div>; })}</div>
          </div>

        </div>}

        <div className="export-section">
          <div className="export-card">
            <div className="export-card-head">
              <div className="export-title-group">
                <span className="export-eyebrow">Báo cáo nhanh</span>
                <h3><FaDownload /> Xuất báo cáo</h3>
                <p>Tải dữ liệu CSV để mở bằng Excel hoặc Google Sheets.</p>
              </div>

              <div className="export-summary">
                <span>Kỳ đang chọn</span>
                <strong>
                  {selectedExportType === "day" && "Theo ngày"}
                  {selectedExportType === "month" && "Theo tháng"}
                  {selectedExportType === "year" && "Theo năm"}
                  {selectedExportType === "quarter" && "Theo quý"}
                </strong>
              </div>
            </div>

            <div className="export-options">
              <div className="option-group">
                <label htmlFor="export-type">Loại xuất:</label>
                <select
                  id="export-type"
                  value={selectedExportType}
                  onChange={(e) => setSelectedExportType(e.target.value)}
                >
                  <option value="day">Theo ngày</option>
                  <option value="month">Theo tháng</option>
                  <option value="year">Theo năm</option>
                  <option value="quarter">Theo quý</option>
                </select>
              </div>

              <button
                className="export-btn primary"
                type="button"
                disabled={exporting}
                onClick={() => exportStatistics(selectedExportType)}
                title="Tải file CSV"
              >
                <FaDownload /> {exporting ? "Đang tải…" : "Tải báo cáo CSV"}
              </button>
            </div>

            <div className="export-help">
              <p><strong>📝 Ghi chú:</strong> Dữ liệu sẽ được tải dưới dạng file CSV. Bạn có thể mở nó bằng Excel hoặc Google Sheets.</p>
            </div>

            <div className="export-footer-note">
              <span>Gọn, nhanh, không cần rời trang dashboard.</span>
            </div>
          </div>
        </div>

        <div className="work-schedule-box">
          <div className="calendar-panel">
            <div className="calendar-head">
              <h3><FaRegCalendarAlt /> Lịch tư vấn</h3>
              <div className="month-nav">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth((prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                >
                  <FaChevronLeft aria-label="Tháng trước" />
                </button>
                <span>{currentMonthLabel}</span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth((prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                >
                  <FaChevronRight aria-label="Tháng sau" />
                </button>
              </div>
            </div>

            <div className="weekdays-row">
              {WEEK_DAYS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="days-grid">
              {monthGridDays.map((item) => {
                if (item.type === "empty") {
                  return <div key={item.key} className="day-cell empty" />;
                }

                const isSelected = selectedDateKey === item.dateKey;
                const isToday = item.dateKey === toDateKey(new Date());

                return (
                  <button
                    type="button"
                    key={item.key}
                    aria-label={`${item.day} ${currentMonthLabel}${item.eventCount ? `, ${item.eventCount} lịch tư vấn` : ""}`}
                    aria-pressed={isSelected}
                    className={`day-cell ${item.eventCount > 0 ? "has-event" : ""} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                    onClick={() => setSelectedDateKey(item.dateKey)}
                  >
                    <span className="day-number">{item.day}</span>
                    {item.eventCount > 0 && (
                      <span className="event-count">{item.eventCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="schedule-panel">
            <div className="schedule-head">
              <h3>Lịch trong ngày</h3>
              <span>
                {selectedDateKey
                  ? new Date(selectedDateKey).toLocaleDateString("vi-VN")
                  : "Chưa chọn ngày"}
              </span>
            </div>

            {consultationsLoading ? <div className="schedule-empty" role="status">Đang tải lịch tư vấn…</div> : consultationsError ? <div className="schedule-empty" role="alert">{consultationsError}<button className="btn-outline" type="button" onClick={loadConsultations}>Thử lại</button></div> : selectedScheduleItems.length === 0 ? (
              <div className="schedule-empty">
                Chưa có lịch tư vấn trong ngày đã chọn.
              </div>
            ) : (
              <div className="schedule-list">
                {selectedScheduleItems.map((item) => (
                  <div className="schedule-card" key={`sch-${item.id}`}>
                    <div className="title-row">
                      <strong>{item.name || "Khách hàng"}</strong>
                      <span>{item.service || "Chưa chọn dịch vụ"}</span>
                    </div>
                    <div className="meta-row">
                      <span><FiPhone aria-hidden="true" />{item.phone || "Chưa có số điện thoại"}</span>
                      <span><FiMapPin aria-hidden="true" />{item.address || "Chưa có địa điểm"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <details className="ai-box">
          <summary className="ai-box-header">
            <h3><FaRobot /> Gợi ý dịch vụ</h3>
            <span>Dựa trên số liệu đơn hàng</span><FiChevronDown aria-hidden="true" />
          </summary>

          {aiLoading ? (
            <div className="ai-empty">Đang phân tích dữ liệu sản phẩm...</div>
          ) : aiSuggestions.length === 0 ? (
            <div className="ai-empty">Chưa đủ dữ liệu để gợi ý dịch vụ.</div>
          ) : (
            <div className="ai-grid">
              {aiSuggestions.map((item) => (
                <div className="ai-card" key={`${item.product_name}-${item.product_id || "name"}`}>
                  <div className="ai-card-top">
                    <div className="ai-thumb">
                      {item.cover ? (
                        <img
                          src={`/uploads/${item.cover}`}
                          alt={item.product_name}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <span>{item.product_name?.charAt(0) || "S"}</span>
                      )}
                    </div>

                    <div className="ai-info">
                      <h4>{item.product_name}</h4>
                      <p>AI score: {Number(item.ai_score || 0).toFixed(1)}</p>
                    </div>
                  </div>

                  <div className="ai-metrics">
                    <div>
                      <span>Đã dùng</span>
                      <b>{item.total_quantity}</b>
                    </div>
                    <div>
                      <span>Tỉ lệ hoàn tất</span>
                      <b>{item.completion_rate}%</b>
                    </div>
                    <div>
                      <span>Đánh giá</span>
                      <b>{Number(item.average_rating || 0).toFixed(1)} ⭐</b>
                    </div>
                  </div>

                  <div className="ai-progress-wrap">
                    <div className="ai-progress-label">
                      <span>Mức hoàn tất</span>
                      <b>{item.completion_rate}%</b>
                    </div>
                    <div className="ai-progress-bar">
                      <div
                        className="ai-progress-value"
                        style={{ width: `${Math.min(Math.max(Number(item.completion_rate || 0), 0), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="ai-action">{item.ai_action}</div>
                </div>
              ))}
            </div>
          )}
        </details>

        {/* CONSULT */}

        <div className="consultation-box">

          <div className="consultation-head">
            <h3>Yêu cầu tư vấn mới</h3>
            <Link to="/notification">Xem tất cả <FiArrowUpRight aria-hidden="true" /></Link>
          </div>

          <div className="consult-grid">
            {consultationsLoading && <p className="nt-overview-consult-empty" role="status">Đang tải yêu cầu tư vấn…</p>}
            {!consultationsLoading && consultationsError && <p className="nt-overview-consult-empty" role="alert">{consultationsError}</p>}
            {!consultationsLoading && !consultationsError && consultations.length === 0 && <p className="nt-overview-consult-empty">Chưa có yêu cầu tư vấn.</p>}

            {consultations.slice(0, 3).map(item=>(

              <div
                key={item.id}
                className="consult-card clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/notification?consultationId=${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/notification?consultationId=${item.id}`);
                  }
                }}
              >

                <div className="avatar">
                  {item.name?.charAt(0)}
                </div>

                <div className="info">
                  <div className="name">
                    {item.name || "Khách hàng"}
                  </div>
                  <div className="service">
                    {item.service || "Chưa chọn dịch vụ"}
                  </div>
                </div>

                <div className="date">
                  {item.event_date
                    ? new Date(item.event_date).toLocaleDateString("vi-VN")
                    : "Chưa chọn ngày"}
                </div>

              </div>

            ))}

          </div>

        </div>
      </div>

    </div>
    </>

  );

};

export default Dashboard;

const invalidStats = () => Object.assign(new Error("Invalid dashboard statistics"), { code: "INVALID_DASHBOARD_STATS" });

const readCount = (value) => {
  // COUNT values can be serialized as strings by database/API versions.
  if (typeof value === "string" && /^\d+$/.test(value.trim())) value = Number(value.trim());
  if (!Number.isSafeInteger(value) || value < 0) throw invalidStats();
  return value;
};

export async function fetchDashboardStats(client, options = {}) {
  const response = await client.get("/legacy", { ...options, params: { action: "getDashboardStats" } });
  const data = response.data;
  if (data?.success !== true) throw invalidStats();
  const result = { ...data };
  for (const key of ["total_users", "total_products", "total_orders"]) result[key] = readCount(data[key]);

  if (data.total_consultations === undefined || data.total_consultations === null) {
    // Older backends expose the full consultation list, but not its aggregate yet.
    const consultations = await client.get("/legacy", { ...options, params: { action: "getConsultations" } });
    const payload = consultations.data;
    if (payload?.success !== true) throw invalidStats();
    if (payload.total !== undefined) result.total_consultations = readCount(payload.total);
    else if (Array.isArray(payload.data)) result.total_consultations = payload.data.length;
    else throw invalidStats();
  } else result.total_consultations = readCount(data.total_consultations);

  if (data.total_customers !== undefined) {
    result.total_customers = readCount(data.total_customers);
    if (result.total_customers > result.total_users) throw invalidStats();
  }
  return result;
}

export function dashboardStatsError(error) {
  if (error?.response?.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem số liệu.";
  if (error?.response?.status === 403) return "Tài khoản hiện tại không có quyền xem số liệu quản trị.";
  if (error?.code === "INVALID_DASHBOARD_STATS") return "Dữ liệu thống kê chưa đầy đủ. Vui lòng làm mới số liệu hoặc thử lại sau.";
  if (!error?.response) return "Không thể kết nối máy chủ thống kê. Vui lòng kiểm tra kết nối và thử lại.";
  return "Máy chủ chưa thể tải số liệu. Vui lòng thử lại sau ít phút.";
}

import { fetchDashboardStats, dashboardStatsError } from "./dashboardStats";

const counts = { success: true, total_users: 6, total_products: 36, total_orders: 14, total_consultations: 9 };
const clientFor = (...responses) => ({ get: jest.fn().mockImplementation(() => Promise.resolve({ data: responses.shift() })) });

test("reads actual totals with numeric or string counts, including genuine zeros", async () => {
  const client = clientFor({ ...counts, total_users: "6", total_products: " 36 ", total_orders: "0", total_consultations: "9" });
  expect(await fetchDashboardStats(client)).toMatchObject({ total_users: 6, total_products: 36, total_orders: 0, total_consultations: 9 });
  expect(client.get).toHaveBeenCalledTimes(1);
});

test("older API gets missing consultation count from its real list, retaining authentication and cancellation", async () => {
  const { total_consultations, ...old } = counts;
  const client = clientFor(old, { success: true, data: [{ id: 1 }, { id: 2 }] });
  const options = { headers: { Authorization: "Bearer fixture" }, signal: new AbortController().signal };
  expect(await fetchDashboardStats(client, options)).toMatchObject({ ...old, total_consultations: 2 });
  expect(client.get.mock.calls[1][1]).toMatchObject({ ...options, params: { action: "getConsultations" } });
});

test("uses API total when a consultation response includes pagination", async () => {
  const client = clientFor({ ...counts, total_consultations: null }, { success: true, total: "109", data: [{ id: 1 }] });
  expect((await fetchDashboardStats(client)).total_consultations).toBe(109);
});

test.each([null, undefined, "", " ", false, -1, "NaN", "3 items", 1.5])("rejects missing or invalid core count %p rather than guessing zero", async (value) => {
  await expect(fetchDashboardStats(clientFor({ ...counts, total_orders: value }))).rejects.toMatchObject({ code: "INVALID_DASHBOARD_STATS" });
});

test("failed legacy consultation request never becomes a zero count", async () => {
  await expect(fetchDashboardStats(clientFor({ ...counts, total_consultations: null }, { success: false }))).rejects.toMatchObject({ code: "INVALID_DASHBOARD_STATS" });
});

test("preserves authentication failure and gives an actionable error", async () => {
  const failure = { response: { status: 401 } };
  const client = { get: jest.fn().mockRejectedValue(failure) };
  await expect(fetchDashboardStats(client)).rejects.toEqual(failure);
  expect(dashboardStatsError(failure)).toContain("đăng nhập");
  expect(dashboardStatsError({ response: { status: 403 } })).toContain("quyền");
  expect(dashboardStatsError({ code: "ERR_NETWORK" })).toContain("kết nối");
});

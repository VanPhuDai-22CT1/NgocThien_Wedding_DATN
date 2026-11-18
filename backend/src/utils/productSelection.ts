import { createHash } from 'crypto';

export const serviceConfig = (product: any): any => {
  try {
    const raw = product.service_details;
    const config = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  } catch { return {}; }
};

export const resolveSelection = (product: any, raw: any = {}, validateDate = true) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Tùy chọn dịch vụ không hợp lệ.');
  const config = serviceConfig(product);
  const packages = Array.isArray(config.packages) ? config.packages : [];
  const variant = packages.find((item: any) => String(item.id) === String(raw.package_id));
  if (packages.length && !variant) throw new Error('Vui lòng chọn loại gói hợp lệ.');
  const text = (name: string, max: number) => {
    if (raw[name] !== undefined && (typeof raw[name] !== 'string' || raw[name].length > max)) throw new Error('Thông tin tổ chức không hợp lệ.');
    return String(raw[name] || '').trim();
  };
  const color = text('color', 100);
  if (Array.isArray(config.colors) && config.colors.length && !config.colors.includes(color)) throw new Error('Vui lòng chọn tông màu hợp lệ.');
  const event_date = text('event_date', 10);
  if (event_date && validateDate) {
    const date = new Date(`${event_date}T12:00:00+07:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date) || !Number.isFinite(date.getTime()) || date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) !== event_date || event_date < new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })) throw new Error('Ngày tổ chức phải từ hôm nay trở đi.');
  }
  const name = String(product.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const inferredUnit = /thuc don|nau an/.test(name) ? 'bàn' : /\bxe\b|\brap\b|vay|ao dai/.test(name) ? 'ngày' : /mam|trap|banh dua dau/.test(name) ? 'bộ' : 'gói';
  const unit = String(variant?.unit || config.unit || inferredUnit);
  const selection = {
    package_id: variant ? String(variant.id) : '', package_name: variant ? String(variant.name) : '',
    color, event_date, location: text('location', 500), note: text('note', 2000), unit,
  };
  const price = Number(variant ? variant.price : product.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Dịch vụ này cần liên hệ báo giá trước khi đặt.');
  return {
    selection, price, unit,
    key: createHash('sha256').update(JSON.stringify(selection)).digest('hex'),
  };
};

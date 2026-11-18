// NAPAS account-transfer TLV format (QRIBFTTA), with CRC-16/CCITT-FALSE.
const field = (id, value) => {
  const text = String(value);
  if (text.length > 99 || /[^\x20-\x7e]/.test(text)) throw new Error("Invalid VietQR field");
  return id + String(text.length).padStart(2, "0") + text;
};
export function vietQRChecksum(text) {
  let crc = 0xffff;
  for (let index = 0; index < text.length; index += 1) {
    crc ^= text.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
export function buildVietQR({ bin, account, amount = null, reference = "" }) {
  if (!/^\d{6}$/.test(bin) || !/^\d{4,19}$/.test(account)) throw new Error("Invalid bank account");
  if (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0)) throw new Error("Invalid transfer amount");
  const note = String(reference).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\x20-\x7e]/g, "").trim();
  if (note.length > 25) throw new Error("Transfer reference exceeds 25 characters");
  const recipient = field("00", bin) + field("01", account);
  const bank = field("00", "A000000727") + field("01", recipient) + field("02", "QRIBFTTA");
  const payload = field("00", "01") + field("01", amount === null ? "11" : "12") + field("38", bank) + field("53", "704") + (amount === null ? "" : field("54", amount)) + field("58", "VN") + (note ? field("62", field("08", note)) : "") + "6304";
  return payload + vietQRChecksum(payload);
}

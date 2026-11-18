import { buildVietQR, vietQRChecksum } from "./vietqr";

// Independent public vectors: https://github.com/subiz/vietqr/blob/master/vietqr_test.go
test("CRC and NAPAS account QR match independent known vectors", () => {
  expect(vietQRChecksum("00")).toBe("2EC9");
  expect(vietQRChecksum("01")).toBe("3EE8");
  expect(buildVietQR({ bin: "970423", account: "0099999999" })).toBe("00020101021138540010A00000072701240006970423011000999999990208QRIBFTTA53037045802VN6304CBB4");
  expect(buildVietQR({ bin: "970422", account: "0023457923442", amount: 40123, reference: "test text string" })).toBe("00020101021238570010A00000072701270006970422011300234579234420208QRIBFTTA53037045405401235802VN62200816test text string6304D9C6");
});
const parse = (value) => {
  const result = {}; let offset = 0;
  while (offset < value.length) {
    const id = value.slice(offset, offset + 2); const length = Number(value.slice(offset + 2, offset + 4));
    result[id] = value.slice(offset + 4, offset + 4 + length); offset += 4 + length;
  }
  expect(offset).toBe(value.length); return result;
};
test("TPBank QR contains the supplied account, VND, 20 percent deposit and exact invoice code", () => {
  const qr = buildVietQR({ bin: "970423", account: "24122004079", amount: Math.round(9000000 * .2), reference: "ORD-NTW-9001" });
  const fields = parse(qr); const bank = parse(fields["38"]); const account = parse(bank["01"]);
  expect(account).toEqual({ "00": "970423", "01": "24122004079" });
  expect(bank["02"]).toBe("QRIBFTTA"); expect(fields["53"]).toBe("704"); expect(fields["54"]).toBe("1800000");
  expect(parse(fields["62"])["08"]).toBe("ORD-NTW-9001");
  expect(fields["63"]).toBe(vietQRChecksum(qr.slice(0, -4)));
});
test("invalid accounts, amounts and truncated payment references are rejected", () => {
  for (const amount of [0, -1, 1.5, NaN, Infinity]) expect(() => buildVietQR({ bin: "970423", account: "24122004079", amount })).toThrow();
  expect(() => buildVietQR({ bin: "123", account: "24122004079" })).toThrow();
  expect(() => buildVietQR({ bin: "970423", account: "a24122004079" })).toThrow();
  expect(() => buildVietQR({ bin: "970423", account: "24122004079", reference: "X".repeat(26) })).toThrow();
});

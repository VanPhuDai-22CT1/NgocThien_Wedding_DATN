const assert = require('node:assert/strict');
const { weddingKnowledge } = require('../dist/services/weddingKnowledge');
const { localAnswer } = require('../dist/services/weddingAssistant');
const cases = [
  ['Khám phá tất cả chủ đề cưới hỏi', 'overview'],
  ['Lập kế hoạch đám cưới', 'timeline'],
  ['Lễ dạm ngõ cần gì?', 'dam-ngo'],
  ['Lễ ăn hỏi miền Nam cần gì?', 'an-hoi'],
  ['Sắp xếp lễ rước dâu', 'ruoc-dau'],
  ['Cách quản lý danh sách khách mời', 'guests'],
  ['Cách chọn thực đơn cưới', 'menu'],
  ['Trang trí bàn gia tiên cần lưu ý gì?', 'decoration'],
  ['Chọn hoa cưới như thế nào?', 'flowers'],
  ['Chụp ảnh cưới cần chuẩn bị gì?', 'photos'],
  ['Chọn váy cưới phù hợp', 'attire'],
  ['Trang điểm cô dâu cần gì?', 'makeup'],
  ['Chọn nhạc cưới', 'music'],
  ['Tiệc cưới ngoài trời cần gì?', 'venue'],
  ['Xe đưa đón khách cần gì?', 'logistics'],
  ['Chọn nhẫn cưới', 'rings'],
  ['Đội bê tráp cần chuẩn bị gì?', 'party'],
  ['Khách mời có trẻ nhỏ cần gì?', 'care'],
  ['So sánh báo giá nhà cung cấp', 'vendor'],
  ['Lên kế hoạch tuần trăng mật', 'honeymoon'],
  ['Sau đám cưới cần làm gì?', 'after'],
  ['Viết lời mời cưới', 'invitation'],
  ['Viết lời thề cưới', 'vows'],
  ['Viết lời cảm ơn sau đám cưới', 'thank-you'],
  ['Soạn kịch bản MC lễ cưới', 'script'],
  ['Quản lý ngân sách cưới 100 triệu', 'budget'],
  ['Checklist trước ngày cưới một tuần', 'last-week'],
  ['Lên lịch trình trong ngày cưới', 'wedding-day'],
];
for (const [message, topic] of cases) {
  const answer = localAnswer(message, [], []);
  assert.equal(answer.topic, topic, message);
  assert.ok(answer.text.length > 150, message);
  assert.ok(answer.followups.length > 0, message);
  for (const followup of answer.followups) {
    const reply = localAnswer(followup, [], [{ role: 'user', content: message }]);
    assert.ok(reply.text.length > 30, followup);
  }
}
assert.equal(weddingKnowledge('Giải thích quang hợp'), null);
const invitation = localAnswer('Ngắn gọn hơn', [], [{ role: 'user', content: 'Viết lời mời cưới, cô dâu: Lan, chú rể: Minh' }]);
assert.equal(invitation.topic, 'invitation');
assert.match(invitation.text, /Lan và Minh/);
assert.match(invitation.text, /ngắn gọn/);
assert.match(localAnswer('Ngân sách cưới 100 triệu', [], []).text, /100\.000\.000/);
assert.equal(localAnswer('Ngày đó còn lịch không?', [], []).topic, undefined);
assert.equal(localAnswer('Tìm mẫu trang trí gia tiên', [], []).topic, undefined);
assert.equal(localAnswer('Giá thực đơn 30 bàn', [{ price: 2000000, unit: 'bàn' }], []).topic, undefined);
assert.match(localAnswer('Giá thực đơn 30 bàn', [{ price: 2000000, unit: 'bàn' }], []).text, /60\.000\.000/);
console.log(`PASS: ${cases.length} wedding topics, follow-ups, context, personalization, budget and catalog separation`);

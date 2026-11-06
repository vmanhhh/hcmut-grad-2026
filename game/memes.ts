/** Short one-liners the campus passers-by mutter now and then. Keep each under ~42 chars so the bubble stays small. */
export const MEMES: string[] = [
  // Quotes attributed to HCMUT lecturers (Zing News: "Những câu nói bất hủ của thầy cô ĐH Bách Khoa")
  "Thuộc hết công thức thì về quên hết người thân!",
  "Nói chuyện có 3 lựa chọn: cửa trước, cửa sau, cửa sổ.",
  "Chỉ có tiền học phí là không trở lại...",
  // Student-life classics
  "Giải tích 1 hẹn gặp lại em kỳ sau nhé.",
  "Deadline đồ án: còn 3 tiếng. Code: còn 0 dòng.",
  "Sáng nay 7h học lý thuyết, đến lớp 7h05 ghế đã hết.",
  "Qua môn là thắng, điểm số chỉ là phụ.",
  "Mai nộp báo cáo, tối nay mới mở đề.",
  "Ra trường rồi mới biết gọi 'thầy ơi' là đúng.",
  "Cơm căng-tin BK: ăn là thấy nhớ mẹ.",
  "Nghe nói có người làm hết slide cả nhóm một mình...",
  "Tưởng 4 năm, hóa ra 4 năm rưỡi. Vẫn vui!",
  "Mượn bút ai chưa trả? Khai đi.",
  "Đi BK mà không đóng tiền ký túc, không phải dân thật.",
];

export function randomMeme(prev?: string): string {
  let m = MEMES[Math.floor(Math.random() * MEMES.length)];
  if (m === prev && MEMES.length > 1) m = MEMES[(MEMES.indexOf(m) + 1) % MEMES.length];
  return m;
}

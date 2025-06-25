// src/lib/eventCategories.ts

export interface CategoryOption {
  name: string; // Tên hiển thị (tiếng Việt)
  value: string; // Giá trị gửi lên backend (chuẩn hóa, tiếng Anh)
}

export const eventCategories: CategoryOption[] = [
  { name: 'Âm nhạc', value: 'Music' },
  { name: 'Kinh doanh', value: 'Business' },
  { name: 'Ẩm thực & Đồ uống', value: 'Food & Drink' },
  { name: 'Sức khỏe', value: 'Health' },
  { name: 'Hài kịch', value: 'Comedy' },
  { name: 'Thể thao', value: 'Sports' },
  { name: 'Giáo dục', value: 'Education' },
  { name: 'Nghệ thuật', value: 'Art' },
  { name: 'Trò chơi', value: 'Gaming' },
  { name: 'Thời trang', value: 'Fashion' },
  { name: 'Xã hội', value: 'Social' },
  { name: 'Khác', value: 'Other' },
];
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface EventStatistics {
  eventId: string;
  eventName: string;
  totalSoldTickets: number;
  checkedInTickets: number;
  noShowTickets: number;
  // checkedOutTickets: number; // Chỉ thêm vào nếu bạn đã cập nhật Ticket model và logic backend
}

interface EventStatisticsCardProps {
  eventId: string;
  eventTitle: string; // Truyền title từ component cha để hiển thị
  isDetailedView?: boolean; // Để phân biệt cách hiển thị (ví dụ: trên ProfilePage vs AdminDashboard)
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#FF8042', '#AF19FF']; // Màu sắc cho biểu đồ

const EventStatisticsCard: React.FC<EventStatisticsCardProps> = ({ eventId, eventTitle, isDetailedView = false }) => {
  const [statistics, setStatistics] = useState<EventStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Không có token xác thực. Vui lòng đăng nhập lại.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get<EventStatistics>(`${API_BASE_URL}/events/${eventId}/statistics`, {
          headers: { 'x-auth-token': token },
        });
        setStatistics(response.data);
      } catch (err: any) {
        console.error('Lỗi khi lấy thống kê sự kiện:', err.response?.data || err.message);
        setError(err.response?.data?.msg || 'Không thể tải thống kê sự kiện.');
        toast.error(err.response?.data?.msg || 'Không thể tải thống kê sự kiện.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [eventId]);

  const handleExportExcel = () => {
    if (!statistics) {
      toast.error("Không có dữ liệu thống kê để xuất.");
      return;
    }

    const dataForExcel = [
      { Danh_muc: 'Tổng số vé đã bán', So_luong: statistics.totalSoldTickets },
      { Danh_muc: 'Số vé đã Check-in', So_luong: statistics.checkedInTickets },
      { Danh_muc: 'Số vé vắng mặt', So_luong: statistics.noShowTickets },
      // { Danh_muc: 'Số vé đã Check-out', So_luong: statistics.checkedOutTickets }, // Chỉ thêm nếu có
    ];

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ThongKeSuKien");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `ThongKe_SuKien_${eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    toast.success("Đã xuất file Excel thành công!");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê tham dự: {eventTitle}</CardTitle>
          <CardDescription>Đang tải dữ liệu...</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Đang tải thống kê vé...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê tham dự: {eventTitle}</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Không thể tải thống kê.</p>
        </CardContent>
      </Card>
    );
  }

  if (!statistics || (statistics.totalSoldTickets === 0 && statistics.checkedInTickets === 0 && statistics.noShowTickets === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Thống kê tham dự: {eventTitle}</CardTitle>
          <CardDescription>Chưa có dữ liệu tham dự cho sự kiện này.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Hiện chưa có vé nào được bán hoặc check-in.</p>
        </CardContent>
      </Card>
    );
  }

  // Dữ liệu cho biểu đồ tròn
  const data = [
    { name: 'Vé đã Check-in', value: statistics.checkedInTickets },
    { name: 'Vé vắng mặt', value: statistics.noShowTickets },
    // { name: 'Vé đã Check-out', value: statistics.checkedOutTickets }, // Chỉ thêm nếu có
    { name: 'Tổng số vé bán ra', value: statistics.totalSoldTickets }, // Hiển thị tổng số vé đã bán ở cuối cùng
  ].filter(item => item.value > 0); // Lọc bỏ các mục có giá trị 0 để biểu đồ không bị rối

  return (
    <Card className={isDetailedView ? "w-full" : ""}>
      <CardHeader>
        <CardTitle>Thống kê tham dự: {eventTitle}</CardTitle>
        <CardDescription>Tổng quan về tình hình tham dự sự kiện.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} vé`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
            <p><strong>Tổng số vé đã bán:</strong> {statistics.totalSoldTickets}</p>
            <p><strong>Số vé đã Check-in:</strong> {statistics.checkedInTickets}</p>
            <p><strong>Số vé vắng mặt:</strong> {statistics.noShowTickets}</p>
            {/* {statistics.checkedOutTickets > 0 && <p><strong>Số vé đã Check-out:</strong> {statistics.checkedOutTickets}</p>} */}
        </div>
        <Button onClick={handleExportExcel} className="mt-6 w-full">
          <Download className="h-4 w-4 mr-2" /> Xuất báo cáo Excel
        </Button>
      </CardContent>
    </Card>
  );
};

export default EventStatisticsCard;
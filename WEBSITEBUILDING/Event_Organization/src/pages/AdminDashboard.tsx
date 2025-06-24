import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Star, Clock, PlusCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const API_BASE_URL = import.meta.env.VITE_API_URL;

interface AdminEvent {
  _id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  isFeatured: boolean;
  isUpcoming: boolean;
  organizer: { name: string };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // Trạng thái kiểm tra quyền admin

  // Hàm kiểm tra quyền admin khi component mount
  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user.role === 'admin') {
          setIsAdmin(true);
          fetchEvents(); // Nếu là admin, fetch events
        } else {
          toast.error("Bạn không có quyền truy cập trang này.");
          navigate('/'); // Chuyển hướng nếu không phải admin
        }
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        toast.error("Dữ liệu người dùng bị lỗi. Vui lòng đăng nhập lại.");
        navigate('/signin');
      }
    } else {
      toast.error("Bạn cần đăng nhập để truy cập trang này.");
      navigate('/signin'); // Chuyển hướng nếu chưa đăng nhập
    }
  }, [navigate]);

  // Hàm fetch tất cả sự kiện cho admin
  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Token không tìm thấy. Vui lòng đăng nhập lại.");
        navigate('/signin');
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/events`, {
        headers: { 'x-auth-token': token }
      });
      setEvents(response.data);
    } catch (err: any) {
      console.error('Error fetching events for admin:', err);
      setError(err.response?.data?.msg || 'Không thể tải danh sách sự kiện.');
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý chỉnh sửa sự kiện
  const handleEdit = (eventId: string) => {
    navigate(`/edit-event/${eventId}`);
  };

  // Hàm xử lý xóa sự kiện
  const handleDelete = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/events/${eventId}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success("Sự kiện đã được xóa thành công!");
      fetchEvents(); // Tải lại danh sách sau khi xóa
    } catch (err: any) {
      console.error('Error deleting event:', err);
      toast.error(err.response?.data?.msg || 'Không thể xóa sự kiện.');
    }
  };

  // Hàm xử lý đặt sự kiện nổi bật/sắp tới
  const handleToggleFeaturedUpcoming = async (eventId: string, type: 'featured' | 'upcoming', currentValue: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const updateData = type === 'featured' ? { isFeatured: !currentValue } : { isUpcoming: !currentValue };
      await axios.put(`${API_BASE_URL}/events/${eventId}`, updateData, {
        headers: { 'x-auth-token': token }
      });
      toast.success(`Sự kiện đã được cập nhật ${type === 'featured' ? 'nổi bật' : 'sắp tới'} thành công!`);
      fetchEvents(); // Tải lại danh sách sau khi cập nhật
    } catch (err: any) {
      console.error(`Error toggling ${type} status:`, err);
      toast.error(`Không thể cập nhật trạng thái ${type === 'featured' ? 'nổi bật' : 'sắp tới'}.`);
    }
  };


  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Đang kiểm tra quyền...</div>;
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu sự kiện...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <Button onClick={() => navigate('/create')}>
            <PlusCircle className="h-4 w-4 mr-2" /> Tạo sự kiện mới
          </Button>
        </div>

        {events.length === 0 ? (
          <p className="text-center text-gray-600">Không có sự kiện nào trong hệ thống.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Địa điểm</TableHead>
                  <TableHead>Thể loại</TableHead>
                  <TableHead>Người tổ chức</TableHead>
                  <TableHead className="text-center">Nổi bật</TableHead>
                  <TableHead className="text-center">Sắp tới</TableHead>
                  <TableHead className="text-center">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event._id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>{event.category}</TableCell>
                    <TableCell>{event.organizer.name}</TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant={event.isFeatured ? "default" : "outline"} 
                        size="sm"
                        className={event.isFeatured ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                        onClick={() => handleToggleFeaturedUpcoming(event._id, 'featured', event.isFeatured)}
                      >
                        {event.isFeatured ? <Star className="h-4 w-4 fill-current text-yellow-400" /> : <Star className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant={event.isUpcoming ? "default" : "outline"} 
                        size="sm"
                        className={event.isUpcoming ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                        onClick={() => handleToggleFeaturedUpcoming(event._id, 'upcoming', event.isUpcoming)}
                      >
                        {event.isUpcoming ? <Clock className="h-4 w-4 fill-current" /> : <Clock className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(event._id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Xác nhận xóa sự kiện</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa sự kiện "{event.title}" này không? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(event._id)} className="bg-red-500 hover:bg-red-600">
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
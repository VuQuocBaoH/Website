// AdminDashboard.tsx (đã được cập nhật)
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
import { Pencil, Trash2, Star, PlusCircle, Eye, Check, X, BarChart, Tag, TicketSlash } from 'lucide-react'; 
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventStatisticsCard from '@/components/events/EventStatisticsCard';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface EventStatistics {
  totalTickets: number;
  checkedInCount: number;
}

interface AdminEvent {
  _id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  isFeatured: boolean;
  // isUpcoming: boolean; // Đã xóa
  organizer: { name: string };
  stats?: EventStatistics;
}

interface SpeakerRequest {
  _id: string;
  username: string;
  email: string;
  speakerBio: string;
  speakerTopics: string[];
  speakerImage?: string;
  speakerRequestDate: string;
}

interface DiscountCode {
  _id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expirationDate?: string;
  usageLimit?: number;
  timesUsed: number;
  isActive: boolean;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [pendingSpeakerRequests, setPendingSpeakerRequests] = useState<SpeakerRequest[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    value: '',
    type: 'percentage' as 'percentage' | 'fixed',
    expirationDate: '',
    usageLimit: ''
  });
  const [isCreatingDiscount, setIsCreatingDiscount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user.role === 'admin') {
          setIsAdmin(true);
          fetchAllData();
        } else {
          toast.error("Bạn không có quyền truy cập trang này.");
          navigate('/');
        }
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        toast.error("Dữ liệu người dùng bị lỗi. Vui lòng đăng nhập lại.");
        navigate('/signin');
      }
    } else {
      toast.error("Bạn cần đăng nhập để truy cập trang này.");
      navigate('/signin');
    }
  }, [navigate]);
  
  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error("Token not found");
      
      const [eventsRes, speakersRes, discountsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/events`, { headers: { 'x-auth-token': token } }),
        axios.get(`${API_BASE_URL}/users/speaker-requests`, { headers: { 'x-auth-token': token } }),
        axios.get(`${API_BASE_URL}/discounts`, { headers: { 'x-auth-token': token } }),
        axios.get(`${API_BASE_URL}/events/statistics/all`, { headers: { 'x-auth-token': token } })
      ]);

      const statisticsMap = new Map(statsRes.data.map((stat: any) => [stat.eventId, stat]));
      const eventsWithStats = eventsRes.data.map((event: AdminEvent) => ({
        ...event,
        stats: statisticsMap.get(event._id)
      }));

      setEvents(eventsWithStats);
      setPendingSpeakerRequests(speakersRes.data);
      setDiscountCodes(discountsRes.data);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.msg || 'Không thể tải dữ liệu cho trang quản trị.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchDiscountCodes = async () => {
     try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error("Token not found");
        const response = await axios.get(`${API_BASE_URL}/discounts`, { headers: { 'x-auth-token': token } });
        setDiscountCodes(response.data);
     } catch (err: any) {
        toast.error(err.response?.data?.msg || "Không thể tải lại danh sách mã giảm giá.");
     }
  }

  const handleEdit = (eventId: string) => {
    navigate(`/edit-event/${eventId}`);
  };

  const handleDelete = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/events/${eventId}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success("Sự kiện đã được xóa thành công!");
      fetchAllData();
    } catch (err: any) {
      console.error('Error deleting event:', err);
      toast.error(err.response?.data?.msg || 'Không thể xóa sự kiện.');
    }
  };
  
  const handleDiscountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewDiscount(prev => ({ ...prev, [name]: value }));
  };

  const handleDiscountTypeChange = (value: 'percentage' | 'fixed') => {
    setNewDiscount(prev => ({ ...prev, type: value }));
  };

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiscount.code || !newDiscount.value) {
      toast.error("Mã và giá trị là bắt buộc.");
      return;
    }
    setIsCreatingDiscount(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...newDiscount,
        value: Number(newDiscount.value),
        usageLimit: newDiscount.usageLimit ? Number(newDiscount.usageLimit) : undefined,
        expirationDate: newDiscount.expirationDate || undefined,
      };
      await axios.post(`${API_BASE_URL}/discounts`, payload, {
        headers: { 'x-auth-token': token }
      });
      toast.success("Tạo mã giảm giá thành công!");
      setNewDiscount({
          code: '', value: '', type: 'percentage', expirationDate: '', usageLimit: ''
      });
      fetchDiscountCodes();
    } catch (err: any) {
      console.error('Error creating discount code:', err);
      toast.error(err.response?.data?.msg || 'Không thể tạo mã giảm giá.');
    } finally {
      setIsCreatingDiscount(false);
    }
  };
  
  const handleDeleteDiscount = async (discountId: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/discounts/${discountId}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success("Mã giảm giá đã được xóa!");
      fetchDiscountCodes();
    } catch (err: any)
    {
      console.error('Error deleting discount code:', err);
      toast.error(err.response?.data?.msg || 'Không thể xóa mã giảm giá.');
    }
  };

  // START CHANGE: Xóa logic 'upcoming' khỏi hàm này
  const handleToggleFeatured = async (eventId: string, currentValue: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/events/${eventId}`, { isFeatured: !currentValue }, {
        headers: { 'x-auth-token': token }
      });
      toast.success(`Sự kiện đã được cập nhật nổi bật thành công!`);
      fetchAllData();
    } catch (err: any) {
      console.error(`Error toggling featured status:`, err);
      toast.error(`Không thể cập nhật trạng thái nổi bật.`);
    }
  };
  // END CHANGE

  const handleApproveRejectSpeaker = async (id: string, action: 'approve' | 'reject') => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error("Bạn chưa đăng nhập.");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/users/speaker-requests/${id}/${action}`, {}, {
        headers: { 'x-auth-token': token }
      });
      toast.success(`Yêu cầu đã được ${action === 'approve' ? 'duyệt' : 'từ chối'} thành công.`);
      fetchAllData();
    } catch (err: any) {
      console.error(`Lỗi khi ${action} yêu cầu diễn giả:`, err);
      toast.error(err.response?.data?.msg || `Không thể ${action === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu.`);
    }
  };

  const handleViewUserProfile = (userId: string) => {
    navigate(`/users/${userId}/profile`);
  };

  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Đang kiểm tra quyền...</div>;
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu bảng điều khiển...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  const eventsWithStats = events.filter(event => event.stats && event.stats.totalTickets > 0);
  const eventsWithoutStats = events.filter(event => !event.stats || event.stats.totalTickets === 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bảng điều khiển quản trị</h1>
          <Button onClick={() => navigate('/create-event')}>
            <PlusCircle className="h-4 w-4 mr-2" /> Tạo sự kiện mới
          </Button>
        </div>

        <Tabs defaultValue="event-management" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="event-management">Quản lý Sự kiện</TabsTrigger>
            <TabsTrigger value="speaker-requests">Yêu cầu Diễn giả</TabsTrigger>
            <TabsTrigger value="discount-management">
                <Tag className="h-4 w-4 mr-2" /> Quản lý Mã giảm giá
            </TabsTrigger>
            <TabsTrigger value="event-statistics">
                <BarChart className="h-4 w-4 mr-2" /> Thống kê Chi tiết
            </TabsTrigger>
            <TabsTrigger value="unsold-events">
                <TicketSlash className="h-4 w-4 mr-2" /> Sự kiện chưa bán vé
            </TabsTrigger>
          </TabsList>

          <TabsContent value="event-management">
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-4">Danh sách Sự kiện</h2>
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
                      <TableHead className="text-center">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event._id}>
                        <TableCell className="font-medium">{event.title}</TableCell>
                        <TableCell>{new Date(event.date).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell>{event.location}</TableCell>
                        <TableCell>{event.category}</TableCell>
                        <TableCell>{event.organizer.name}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={event.isFeatured ? "default" : "outline"}
                            size="sm"
                            className={event.isFeatured ? "bg-green-500 hover:bg-green-600 text-white" : ""}
                            onClick={() => handleToggleFeatured(event._id, event.isFeatured)}
                          >
                            {event.isFeatured ? <Star className="h-4 w-4 fill-current text-yellow-400" /> : <Star className="h-4 w-4" />}
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
          </TabsContent>

          {/* ... Các TabsContent khác giữ nguyên ... */}
          <TabsContent value="speaker-requests">
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-4">Yêu cầu làm Diễn giả đang chờ duyệt</h2>
            {pendingSpeakerRequests.length === 0 ? (
              <p className="text-center text-gray-600">Không có yêu cầu làm diễn giả nào đang chờ duyệt.</p>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tiểu sử (Tóm tắt)</TableHead>
                      <TableHead>Chủ đề</TableHead>
                      <TableHead>Ngày gửi</TableHead>
                      <TableHead className="text-center">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSpeakerRequests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell className="font-medium">{request.username}</TableCell>
                        <TableCell>{request.email}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{request.speakerBio}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {request.speakerTopics.map((topic, idx) => (
                              <Badge key={idx} variant="secondary">{topic}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{new Date(request.speakerRequestDate).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewUserProfile(request._id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="default" size="sm" onClick={() => handleApproveRejectSpeaker(request._id, 'approve')}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleApproveRejectSpeaker(request._id, 'reject')}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="discount-management">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Tạo mã giảm giá mới</CardTitle>
                    <CardDescription>Điền thông tin để tạo mã mới cho các sự kiện.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateDiscount} className="space-y-4">
                      <div>
                        <Label htmlFor="code">Mã <span className="text-red-500">*</span></Label>
                        <Input id="code" name="code" value={newDiscount.code} onChange={handleDiscountInputChange} placeholder="VD: TET2025" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="value">Giá trị <span className="text-red-500">*</span></Label>
                          <Input id="value" name="value" type="number" value={newDiscount.value} onChange={handleDiscountInputChange} placeholder="VD: 15 hoặc 50000" required />
                        </div>
                        <div>
                          <Label htmlFor="type">Loại</Label>
                           <Select value={newDiscount.type} onValueChange={handleDiscountTypeChange}>
                              <SelectTrigger id="type">
                                <SelectValue placeholder="Chọn loại giảm giá" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Phần trăm (%)</SelectItem>
                                <SelectItem value="fixed">Số tiền cố định (VND)</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                      </div>
                       <div>
                        <Label htmlFor="expirationDate">Ngày hết hạn (tùy chọn)</Label>
                        <Input id="expirationDate" name="expirationDate" type="date" value={newDiscount.expirationDate} onChange={handleDiscountInputChange} />
                      </div>
                       <div>
                        <Label htmlFor="usageLimit">Giới hạn sử dụng (tùy chọn)</Label>
                        <Input id="usageLimit" name="usageLimit" type="number" value={newDiscount.usageLimit} onChange={handleDiscountInputChange} placeholder="VD: 100 (lượt)" />
                      </div>
                      <Button type="submit" className="w-full" disabled={isCreatingDiscount}>
                        {isCreatingDiscount ? 'Đang tạo...' : 'Tạo mã'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                 <h2 className="text-2xl font-bold text-gray-900 mb-4">Danh sách mã giảm giá</h2>
                 {discountCodes.length === 0 ? (
                    <p className="text-center text-gray-600 py-8">Chưa có mã giảm giá nào.</p>
                 ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Mã</TableHead>
                              <TableHead>Giá trị</TableHead>
                              <TableHead>Hết hạn</TableHead>
                              <TableHead>Sử dụng</TableHead>
                              <TableHead>Trạng thái</TableHead>
                              <TableHead className="text-center">Hành động</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                          {discountCodes.map((d) => {
                            const isDateExpired = d.expirationDate && new Date(d.expirationDate).setHours(23, 59, 59, 999) < Date.now();
                            
                            const isTrulyActive = d.isActive && !isDateExpired;

                            let statusText = 'Tắt';
                            if (isTrulyActive) {
                              statusText = 'Hoạt động';
                            } else if (isDateExpired) {
                              statusText = 'Hết hạn';
                            }

                            return (
                              <TableRow key={d._id}>
                                <TableCell className="font-medium">{d.code}</TableCell>
                                <TableCell>
                                  {d.type === 'percentage'
                                    ? `${d.value}%`
                                    : `${d.value.toLocaleString('vi-VN')} VND`}
                                </TableCell>
                                <TableCell>{d.expirationDate ? new Date(d.expirationDate).toLocaleDateString('vi-VN') : 'Không'}</TableCell>
                                <TableCell>
                                  {d.timesUsed} / {d.usageLimit || '∞'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={isTrulyActive ? 'default' : 'destructive'} className={isTrulyActive ? 'bg-green-500' : ''}>
                                    {statusText}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Xác nhận xóa mã</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Bạn có chắc chắn muốn xóa mã "{d.code}"? Hành động này không thể hoàn tác.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteDiscount(d._id)} className="bg-red-500 hover:bg-red-600">Xóa</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        </Table>
                    </div>
                 )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="event-statistics">
              <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-4">Thống kê Chi tiết các Sự kiện</h2>
              {eventsWithStats.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {eventsWithStats.map((event) => (
                          <EventStatisticsCard
                              key={event._id}
                              eventId={event._id}
                              eventTitle={event.title}
                          />
                      ))}
                  </div>
              ) : (
                  <p className="text-center text-gray-600 py-8">Không có sự kiện nào có dữ liệu thống kê để hiển thị.</p>
              )}
          </TabsContent>

          <TabsContent value="unsold-events">
            <h2 className="text-2xl font-bold text-gray-900 mt-6 mb-4">Danh sách sự kiện chưa bán vé</h2>
             {eventsWithoutStats.length > 0 ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên sự kiện</TableHead>
                        <TableHead>Ngày diễn ra</TableHead>
                        <TableHead>Người tổ chức</TableHead>
                        <TableHead className="text-center">Tổng vé đã bán</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventsWithoutStats.map((event) => (
                        <TableRow key={event._id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>{new Date(event.date).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>{event.organizer.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="destructive">0</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
            ) : (
                <p className="text-center text-gray-600 py-8">Tất cả các sự kiện đều đã bán được vé.</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
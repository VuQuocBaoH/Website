import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Import EventCard để tái sử dụng
import EventCard, { EventCardProps } from '@/components/home/EventCard';

const API_BASE_URL = 'http://localhost:5000/api';

// Schema cho cập nhật profile
const profileSchema = z.object({
  username: z.string().min(3, "Tên người dùng phải có ít nhất 3 ký tự").optional().or(z.literal('')),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal('')),
});

// Schema cho đổi mật khẩu
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Mật khẩu hiện tại phải có ít nhất 6 ký tự"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
  confirmNewPassword: z.string().min(6, "Xác nhận mật khẩu mới phải có ít nhất 6 ký tự"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
  path: ["confirmNewPassword"],
});


const ProfilePage = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [myEvents, setMyEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      email: ''
    }
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  // Fetch thông tin người dùng và các sự kiện đã tạo
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("Bạn cần đăng nhập để xem hồ sơ.");
        navigate('/signin');
        return;
      }

      try {
        const requests = [
          axios.get(`${API_BASE_URL}/users/me`, { headers: { 'x-auth-token': token } }),
          axios.get(`${API_BASE_URL}/events/my-events`, { headers: { 'x-auth-token': token } })
        ];

        const [profileResponse, eventsResponse] = await Promise.all(requests);

        setUserProfile(profileResponse.data);
        profileForm.reset({
          username: profileResponse.data.username,
          email: profileResponse.data.email,
        });

        const formattedEvents = eventsResponse.data.map((event: any) => ({
            id: event._id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            location: event.location,
            image: event.image,
            price: event.price,
            category: event.category,
            organizer: event.organizer.name
        }));
        setMyEvents(formattedEvents);

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.msg || 'Không thể tải dữ liệu trang hồ sơ.');
        if (err.response?.status === 401) {
            toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/signin');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, profileForm]);

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/users/me`, values, {
        headers: { 'x-auth-token': token }
      });
      toast.success(response.data.msg || "Hồ sơ đã được cập nhật thành công!");
      setUserProfile(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('storage')); 
    } catch (error: any) {
      console.error('Lỗi cập nhật hồ sơ:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || "Không thể cập nhật hồ sơ.");
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/auth/change-password`, {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }, {
        headers: { 'x-auth-token': token }
      });
      toast.success(response.data.msg || "Mật khẩu đã được đổi thành công!");
      passwordForm.reset();
    } catch (error: any) {
      console.error('Lỗi đổi mật khẩu:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || "Không thể đổi mật khẩu.");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải hồ sơ...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!userProfile) return <div className="min-h-screen flex items-center justify-center text-gray-500">Không tìm thấy hồ sơ người dùng.</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Hồ sơ cá nhân</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Cập nhật thông tin cá nhân */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin hồ sơ</CardTitle>
              <CardDescription>Cập nhật tên người dùng và địa chỉ email của bạn.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên người dùng</FormLabel>
                        <FormControl>
                          <Input placeholder="Tên người dùng" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Email" {...field} disabled={true} />
                        </FormControl>
                        <FormDescription>
                          Email của bạn không thể thay đổi.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Cập nhật hồ sơ</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Đổi mật khẩu */}
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>Đổi mật khẩu của bạn.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu hiện tại</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Mật khẩu hiện tại" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mật khẩu mới</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Mật khẩu mới" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Xác nhận mật khẩu mới</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Xác nhận mật khẩu mới" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Đổi mật khẩu</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Khu vực mới: Các sự kiện đã tạo */}
        <div className="mt-12 border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Các sự kiện tôi đã tạo</h2>
            {myEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myEvents.map((event) => (
                        <EventCard key={event.id} {...event} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 px-6 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-600">Bạn chưa tạo sự kiện nào.</p>
                    <Button className="mt-4" onClick={() => navigate('/create-event')}>
                        Tạo sự kiện ngay
                    </Button>
                </div>
            )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
// D:\code\DACNTT2\WEBSITEBUILDING\Event_Organization\src\pages\ProfilePage.tsx
import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Mail, CheckCircle, XCircle } from "lucide-react"; // Thêm Mail, CheckCircle, XCircle icons
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs component

import EventCard, { EventCardProps } from '@/components/home/EventCard';
import EventStatisticsCard from '@/components/events/EventStatisticsCard';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Interface cho Lời mời diễn giả
interface SpeakerInvitation {
  _id: string;
  eventId: {
    _id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    address?: string;
    image?: string;
    schedule?: { time: string; title: string; description?: string; }[];
  };
  speakerId: string;
  organizerId: {
    _id: string;
    username: string;
    email: string;
  };
  status: 'pending' | 'accepted' | 'declined';
  invitationDate: string;
  responseDate?: string;
  message?: string;
}

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

// Định nghĩa schema cho form đăng ký diễn giả
const speakerRequestSchema = z.object({
  speakerBio: z.string().min(50, "Tiểu sử phải có ít nhất 50 ký tự.").max(500, "Tiểu sử không được vượt quá 500 ký tự."),
  speakerTopics: z.array(z.string().min(2, "Chủ đề không được trống")).min(1, "Vui lòng thêm ít nhất một chủ đề."),
  speakerImage: z.string().url("Vui lòng nhập một URL hình ảnh hợp lệ.").optional().or(z.literal('')),
});

// Định nghĩa interface cho User từ API backend, bao gồm các trường diễn giả mới
interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  speakerStatus: 'none' | 'pending' | 'approved' | 'rejected';
  speakerBio?: string;
  speakerTopics?: string[];
  speakerImage?: string;
  speakerRequestDate?: string;
  speakerApprovalDate?: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [myEvents, setMyEvents] = useState<EventCardProps[]>([]);
  const [speakerInvitations, setSpeakerInvitations] = useState<SpeakerInvitation[]>([]); // State cho lời mời diễn giả
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpeakerRequestSubmitting, setIsSpeakerRequestSubmitting] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [activeTab, setActiveTab] = useState("profile"); // State để quản lý tab hiện tại

  const currentLoggedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
  const currentUserId = currentLoggedUser ? currentLoggedUser._id : null;
  const currentUserRole = currentLoggedUser ? currentLoggedUser.role : 'user';
  const token = localStorage.getItem('token');

  const isMyProfile = !userId || userId === currentUserId;

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

  const speakerForm = useForm<z.infer<typeof speakerRequestSchema>>({
    resolver: zodResolver(speakerRequestSchema),
    defaultValues: {
      speakerBio: "",
      speakerTopics: [],
      speakerImage: "",
    },
  });

  // Hàm fetch lời mời diễn giả
  const fetchSpeakerInvitations = async () => {
    if (!isMyProfile || !token || userProfile?.speakerStatus !== 'approved') { // Chỉ fetch nếu là profile của mình và đã là diễn giả được duyệt
        setSpeakerInvitations([]); // Đảm bảo làm rỗng nếu không đủ điều kiện
        return;
    }
    try {
      const response = await axios.get<SpeakerInvitation[]>(`${API_BASE_URL}/users/me/speaker-invitations`, {
        headers: { 'x-auth-token': token },
      });
      setSpeakerInvitations(response.data);
    } catch (err: any) {
      console.error('Lỗi khi tải lời mời diễn giả:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Không thể tải lời mời diễn giả.');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      let userApiUrl = '';

      if (isMyProfile) {
        userApiUrl = `${API_BASE_URL}/users/me`;
        if (!token) {
          toast.error("Bạn cần đăng nhập để xem hồ sơ của mình.");
          navigate('/signin');
          setLoading(false);
          return;
        }
      } else {
        userApiUrl = `${API_BASE_URL}/users/${userId}/profile`;
        if (currentUserRole !== 'admin' && !token) {
            toast.error("Bạn không có quyền xem hồ sơ này.");
            navigate('/');
            setLoading(false);
            return;
        }
      }

      try {
        const headers = token ? { 'x-auth-token': token } : {};
        const profileResponse = await axios.get<UserProfile>(userApiUrl, { headers });
        setUserProfile(profileResponse.data);

        if (isMyProfile) {
            profileForm.reset({
                username: profileResponse.data.username,
                email: profileResponse.data.email,
            });

            if (profileResponse.data.speakerStatus !== 'none') {
                speakerForm.reset({
                    speakerBio: profileResponse.data.speakerBio || "",
                    speakerTopics: profileResponse.data.speakerTopics || [],
                    speakerImage: profileResponse.data.speakerImage || "",
                });
            }

            const eventsResponse = await axios.get(`${API_BASE_URL}/events/my-events`, { headers: { 'x-auth-token': token! } });
            const formattedEvents = eventsResponse.data.map((event: any) => ({
                id: event._id,
                title: event.title,
                date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
                location: event.location,
                image: event.image,
                price: event.price,
                category: event.category,
                organizer: event.organizer.name
            }));
            setMyEvents(formattedEvents);

            // Fetch lời mời diễn giả nếu người dùng là diễn giả được duyệt
            if (profileResponse.data.speakerStatus === 'approved') {
                fetchSpeakerInvitations(); // Gọi hàm fetch riêng
            } else {
                setSpeakerInvitations([]); // Đảm bảo rỗng nếu không phải diễn giả
            }

        } else {
            profileForm.reset();
            speakerForm.reset();
            setMyEvents([]);
            setSpeakerInvitations([]); // Cũng làm rỗng nếu xem profile người khác
        }

      } catch (err: any) {
        console.error('Lỗi khi tải dữ liệu:', err);
        setError(err.response?.data?.msg || 'Không thể tải dữ liệu trang hồ sơ.');
        if (axios.isAxiosError(err)) {
            if (err.response?.status === 401) {
                toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/signin');
            } else if (err.response?.status === 403) {
                toast.error("Bạn không có quyền xem hồ sơ này.");
                navigate('/');
            } else if (err.response?.status === 404) {
                toast.error("Không tìm thấy người dùng này.");
                navigate('/not-found');
            }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, userId, isMyProfile, profileForm, speakerForm, token, currentUserRole, currentUserId, userProfile?.speakerStatus]); // Thêm userProfile.speakerStatus vào dependencies

    // Re-fetch invitations if the activeTab changes to 'speaker-invitations' and user is approved speaker
    useEffect(() => {
        if (activeTab === 'speaker-invitations' && isMyProfile && userProfile?.speakerStatus === 'approved') {
            fetchSpeakerInvitations();
        }
    }, [activeTab, isMyProfile, userProfile?.speakerStatus]);


  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_BASE_URL}/users/me`, values, {
        headers: { 'x-auth-token': token }
      });
      toast.success(response.data.msg || "Hồ sơ đã được cập nhật thành công!");
      setUserProfile(prev => prev ? { ...prev, ...response.data.user } : response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.dispatchEvent(new Event('storage'));
    } catch (error: any) {
      console.error('Lỗi cập nhật hồ sơ:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || "Không thể cập nhật hồ hồ sơ.");
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

  const onSpeakerRequestSubmit = async (values: z.infer<typeof speakerRequestSchema>) => {
    setIsSpeakerRequestSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/users/request-speaker`, values, {
        headers: { 'x-auth-token': token }
      });
      toast.success(response.data.msg || "Yêu cầu làm diễn giả đã được gửi thành công!");
      setUserProfile(prev => ({
        ...prev!,
        speakerStatus: 'pending',
        speakerBio: values.speakerBio,
        speakerTopics: values.speakerTopics,
        speakerImage: values.speakerImage,
        speakerRequestDate: new Date().toISOString(),
      }));
    } catch (error: any) {
      console.error("Lỗi khi gửi yêu cầu diễn giả:", error);
      toast.error(error.response?.data?.msg || "Gửi yêu cầu thất bại.");
    } finally {
      setIsSpeakerRequestSubmitting(false);
    }
  };

  const handleAddTopic = () => {
    if (newTopic.trim() && !speakerForm.getValues("speakerTopics").includes(newTopic.trim())) {
      const currentTopics = speakerForm.getValues("speakerTopics") || [];
      speakerForm.setValue("speakerTopics", [...currentTopics, newTopic.trim()], { shouldValidate: true });
      setNewTopic("");
    } else if (newTopic.trim() && speakerForm.getValues("speakerTopics").includes(newTopic.trim())) {
      toast.info("Chủ đề này đã tồn tại.");
    }
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    const currentTopics = speakerForm.getValues("speakerTopics") || [];
    speakerForm.setValue("speakerTopics", currentTopics.filter(topic => topic !== topicToRemove), { shouldValidate: true });
  };

  const handleRespondToInvitation = async (invitationId: string, action: 'accept' | 'decline') => { 
    const confirmMessage = action === 'accept'
        ? 'Bạn có chắc chắn muốn CHẤP NHẬN lời mời này không?'
        : 'Bạn có chắc chắn muốn TỪ CHỐI lời mời này không?';

    if (!window.confirm(confirmMessage)) {
        return;
    }

    const backendAction = action === 'accept' ? 'accepted' : 'declined'; 

    try {
        const token = localStorage.getItem('token');
        const response = await axios.put(`${API_BASE_URL}/users/speaker-invitations/${invitationId}/respond`,
            { action: backendAction },
            { headers: { 'x-auth-token': token } }
        );
        toast.success(response.data.msg || `Đã ${action === 'accept' ? 'chấp nhận' : 'từ chối'} lời mời.`);

        setSpeakerInvitations(prev => {
            const updatedInvitations: SpeakerInvitation[] = prev.map((inv: SpeakerInvitation) => {
                if (inv._id === invitationId) {
                    const newStatus: 'accepted' | 'declined' = backendAction as 'accepted' | 'declined'; 
                    const updatedInv: SpeakerInvitation = {
                        ...inv,
                        status: newStatus,
                        responseDate: new Date().toISOString()
                    };
                    return updatedInv;
                }
                return inv;
            });
            return updatedInvitations;
        });
    } catch (err: any) {
        console.error(`Lỗi khi ${action} lời mời:`, err.response?.data || err.message);
        toast.error(err.response?.data?.msg || `Không thể ${action === 'accept' ? 'chấp nhận' : 'từ chối'} lời mời.`);
    }
};



  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải hồ sơ...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!userProfile) return <div className="min-h-screen flex items-center justify-center text-gray-500">Không tìm thấy hồ sơ người dùng.</div>;

  const isSpeakerApproved = userProfile.speakerStatus === 'approved';
  const isSpeakerPending = userProfile.speakerStatus === 'pending';
  const isSpeakerRejected = userProfile.speakerStatus === 'rejected';


  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Hồ sơ {isMyProfile ? 'cá nhân' : userProfile.username}</h1>

        {/* Thông tin cơ bản của người dùng (luôn hiển thị) */}
        <div className="mb-8 p-6 border rounded-lg bg-gray-50">
            <h2 className="text-2xl font-semibold mb-4">Thông tin {isMyProfile ? 'cá nhân của bạn' : 'người dùng'}</h2>
            <p className="text-lg mb-2"><span className="font-medium">Tên người dùng:</span> {userProfile.username}</p>
            {isMyProfile && <p className="text-lg mb-2"><span className="font-medium">Email:</span> {userProfile.email}</p>}
            <p className="text-lg"><span className="font-medium">Vai trò:</span> {userProfile.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</p>
        </div>

        {/* Tabs for Profile, My Events, Speaker Invitations */}
        {isMyProfile && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-3"> {/* Thay đổi số cột nếu cần */}
                    <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
                    <TabsTrigger value="my-events">Sự kiện của tôi</TabsTrigger>
                    {isSpeakerApproved && ( // Chỉ hiển thị tab này nếu đã là diễn giả được duyệt
                        <TabsTrigger value="speaker-invitations">
                            Lời mời Diễn giả <Mail className="ml-2 h-4 w-4" />
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Tab Content: Hồ sơ cá nhân */}
                <TabsContent value="profile" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
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
                </TabsContent>

                {/* Tab Content: Sự kiện của tôi */}
                <TabsContent value="my-events" className="mt-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Các sự kiện tôi đã tạo</h2>
                    {myEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {myEvents.map((event) => (
                                <div key={event.id} className="flex flex-col gap-4">
                                    <EventCard {...event} />
                                    <EventStatisticsCard eventId={event.id} eventTitle={event.title} />
                                </div>
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
                </TabsContent>

                {/* Tab Content: Lời mời Diễn giả */}
                {isSpeakerApproved && (
                    <TabsContent value="speaker-invitations" className="mt-4">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Lời mời làm Diễn giả</h2>
                        {speakerInvitations.length === 0 ? (
                            <p className="text-center text-gray-600">Bạn chưa có lời mời làm diễn giả nào.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {speakerInvitations.map(invitation => (
                                    <Card key={invitation._id}>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                            <CardTitle className="text-lg font-medium">
                                                Lời mời từ sự kiện: <span className="text-blue-600">{invitation.eventId.title}</span>
                                            </CardTitle>
                                            <Badge
                                              className={`
                                                  ${invitation.status === 'pending' && 'bg-yellow-500 text-yellow-50'}
                                                  ${invitation.status === 'accepted' && 'bg-green-500 text-green-50'} 
                                                  ${invitation.status === 'declined' && 'bg-red-500 text-red-50'}  
                                              `}
                                          >
                                              {invitation.status === 'pending' ? 'Đang chờ' :
                                              invitation.status === 'accepted' ? 'Đã chấp nhận' : 
                                              'Đã từ chối'}
                                          </Badge>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-600 mb-2">Người tổ chức: {invitation.organizerId.username}</p>
                                            <p className="text-sm text-gray-600 mb-2">Email liên hệ: {invitation.organizerId.email}</p>
                                            <p className="text-sm text-gray-600 mb-2">Ngày mời: {new Date(invitation.invitationDate).toLocaleDateString('vi-VN')}</p>
                                            {invitation.message && (
                                                <p className="text-sm text-gray-700 mt-2">Lời nhắn: <span className="italic">"{invitation.message}"</span></p>
                                            )}

                                            <div className="mt-4 border-t pt-3">
                                                <h4 className="text-md font-semibold mb-2">Thông tin sự kiện:</h4>
                                                <p className="text-sm">Ngày: {new Date(invitation.eventId.date).toLocaleDateString('vi-VN')}</p>
                                                <p className="text-sm">Thời gian: {invitation.eventId.time}</p>
                                                <p className="text-sm">Địa điểm: {invitation.eventId.location}, {invitation.eventId.address || ''}</p>
                                                {invitation.eventId.schedule && invitation.eventId.schedule.length > 0 && (
                                                    <div className="mt-2">
                                                        <h5 className="text-xs font-semibold">Lịch trình nổi bật:</h5>
                                                        <ul className="list-disc list-inside text-xs ml-2">
                                                            {invitation.eventId.schedule.slice(0, 2).map((item, idx) => ( // Chỉ hiển thị 2 mục đầu
                                                                <li key={idx}><strong>{item.time}</strong>: {item.title}</li>
                                                            ))}
                                                            {invitation.eventId.schedule.length > 2 && (
                                                                <li className="text-gray-500">... và nhiều hơn nữa.</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                                <Button
                                                    variant="link"
                                                    className="p-0 h-auto text-blue-600 hover:text-blue-800 text-sm mt-1"
                                                    onClick={() => navigate(`/events/${invitation.eventId._id}`)}
                                                >
                                                    Xem chi tiết sự kiện
                                                </Button>
                                            </div>

                                            {invitation.status === 'pending' && (
                                                <div className="mt-4 flex space-x-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleRespondToInvitation(invitation._id, 'accept')}
                                                    >
                                                        <CheckCircle className="h-4 w-4 mr-1" /> Chấp nhận
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRespondToInvitation(invitation._id, 'decline')}
                                                    >
                                                        <XCircle className="h-4 w-4 mr-1" /> Từ chối
                                                    </Button>
                                                </div>
                                            )}
                                            {invitation.status !== 'pending' && invitation.responseDate && (
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Phản hồi ngày: {new Date(invitation.responseDate).toLocaleString('vi-VN')}
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                )}
            </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ProfilePage;
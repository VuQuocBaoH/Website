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
import { Plus, X, Mail, CheckCircle, XCircle, BarChart, Ticket, TicketSlash } from "lucide-react"; 
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import EventCard, { EventCardProps } from '@/components/home/EventCard';
import EventStatisticsCard from '@/components/events/EventStatisticsCard';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface EventStatisticsData {
    totalSoldTickets: number;
    checkedInTickets: number;
    noShowTickets: number;
}

interface MyEvent extends EventCardProps {
    stats?: EventStatisticsData;
}

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
const profileSchema = z.object({
  username: z.string().min(3, "Tên người dùng phải có ít nhất 3 ký tự").optional().or(z.literal('')),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal('')),
});
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Mật khẩu hiện tại phải có ít nhất 6 ký tự"),
  newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
  confirmNewPassword: z.string().min(6, "Xác nhận mật khẩu mới phải có ít nhất 6 ký tự"),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Mật khẩu mới và xác nhận mật khẩu không khớp",
  path: ["confirmNewPassword"],
});
const speakerRequestSchema = z.object({
  speakerBio: z.string().min(50, "Tiểu sử phải có ít nhất 50 ký tự.").max(500, "Tiểu sử không được vượt quá 500 ký tự."),
  speakerTopics: z.array(z.string().min(2, "Chủ đề không được trống")).min(1, "Vui lòng thêm ít nhất một chủ đề."),
  speakerImage: z.string().url("Vui lòng nhập một URL hình ảnh hợp lệ.").optional().or(z.literal('')),
});
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
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [speakerInvitations, setSpeakerInvitations] = useState<SpeakerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpeakerRequestSubmitting, setIsSpeakerRequestSubmitting] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

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

  const fetchSpeakerInvitations = async () => {
    if (!isMyProfile || !token || userProfile?.speakerStatus !== 'approved') {
        setSpeakerInvitations([]);
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
            const rawEvents = eventsResponse.data;

            if (rawEvents && rawEvents.length > 0) {
                const statsPromises = rawEvents.map((event: any) =>
                    axios.get(`${API_BASE_URL}/events/${event._id}/statistics`, { headers: { 'x-auth-token': token! } })
                );

                const statsResults = await Promise.allSettled(statsPromises);
                const statsMap = new Map<string, EventStatisticsData>();
                statsResults.forEach(result => {
                    if (result.status === 'fulfilled' && result.value.data) {
                        statsMap.set(result.value.data.eventId, result.value.data);
                    }
                });

               const combinedEvents = rawEvents.map((event: any): MyEvent => ({
                    id: event._id,
                    title: event.title,
                    date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
                    location: event.location,
                    image: event.image,
                    price: event.price,
                    category: event.category,
                    organizer: event.organizer.name,
                    startTime: event.startTime, 
                    endTime: event.endTime,    
                    stats: statsMap.get(event._id)
                }));
                setMyEvents(combinedEvents);
            } else {
                setMyEvents([]);
            }

            if (profileResponse.data.speakerStatus === 'approved') {
                fetchSpeakerInvitations();
            } else {
                setSpeakerInvitations([]);
            }

        } else {
            profileForm.reset();
            speakerForm.reset();
            setMyEvents([]);
            setSpeakerInvitations([]);
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
  }, [navigate, userId, isMyProfile, profileForm, speakerForm, token, currentUserRole, currentUserId]);

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

  const eventsWithStats = myEvents.filter(e => e.stats && e.stats.totalSoldTickets > 0);
  const eventsWithoutStats = myEvents.filter(e => !e.stats || e.stats.totalSoldTickets === 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Hồ sơ {isMyProfile ? 'cá nhân' : userProfile.username}</h1>

        <div className="mb-8 p-6 border rounded-lg bg-gray-50">
            <h2 className="text-2xl font-semibold mb-4">Thông tin {isMyProfile ? 'cá nhân của bạn' : 'người dùng'}</h2>
            <p className="text-lg mb-2"><span className="font-medium">Tên người dùng:</span> {userProfile.username}</p>
            {isMyProfile && <p className="text-lg mb-2"><span className="font-medium">Email:</span> {userProfile.email}</p>}
            <p className="text-lg"><span className="font-medium">Vai trò:</span> {userProfile.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</p>
        </div>

        {isMyProfile && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-4">
                    <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
                    <TabsTrigger value="my-events">Sự kiện của tôi</TabsTrigger>
                    <TabsTrigger value="my-events-stats">
                        <BarChart className="mr-2 h-4 w-4" />
                        Thống kê
                    </TabsTrigger>
                    {isSpeakerApproved && (
                        <TabsTrigger value="speaker-invitations">
                            Lời mời Diễn giả <Mail className="ml-2 h-4 w-4" />
                        </TabsTrigger>
                    )}
                </TabsList>

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

                    {isMyProfile && (!isSpeakerApproved && !isSpeakerPending) && (
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Đăng ký làm diễn giả</CardTitle>
                                <CardDescription>Gửi yêu cầu để trở thành diễn giả và chia sẻ kiến thức của bạn.</CardDescription>
                                {isSpeakerRejected && (
                                    <p className="text-red-500 text-sm mt-2 flex items-center">
                                        <XCircle className="h-4 w-4 mr-1" /> Yêu cầu diễn giả của bạn đã bị từ chối. Bạn có thể gửi lại yêu cầu mới.
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent>
                                <Form {...speakerForm}>
                                    <form onSubmit={speakerForm.handleSubmit(onSpeakerRequestSubmit)} className="space-y-6">
                                        <FormField
                                            control={speakerForm.control}
                                            name="speakerBio"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tiểu sử của bạn (tối thiểu 50 ký tự, tối đa 500 ký tự)</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Mô tả kinh nghiệm, chuyên môn và những gì bạn muốn chia sẻ..."
                                                            className="min-h-[120px]"
                                                            {...field}
                                                            disabled={isSpeakerRequestSubmitting}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={speakerForm.control}
                                            name="speakerTopics"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Chủ đề chuyên môn (ví dụ: Marketing, Lập trình, Nghệ thuật)</FormLabel>
                                                    <div className="flex space-x-2 mb-2">
                                                        <Input
                                                            placeholder="Thêm chủ đề..."
                                                            value={newTopic}
                                                            onChange={(e) => setNewTopic(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddTopic();
                                                                }
                                                            }}
                                                            disabled={isSpeakerRequestSubmitting}
                                                        />
                                                        <Button type="button" onClick={handleAddTopic} disabled={isSpeakerRequestSubmitting}>
                                                            <Plus className="h-4 w-4 mr-2" /> Thêm
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {field.value.map((topic, index) => (
                                                            <Badge key={index} variant="secondary" className="pr-1 flex items-center gap-1">
                                                                {topic}
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-5 w-5 hover:bg-red-100"
                                                                    onClick={() => handleRemoveTopic(topic)}
                                                                    disabled={isSpeakerRequestSubmitting}
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={speakerForm.control}
                                            name="speakerImage"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>URL Hình ảnh đại diện (tùy chọn)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="https://your-image-url.com/profile.jpg"
                                                            {...field}
                                                            disabled={isSpeakerRequestSubmitting}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="flex justify-end">
                                            <Button type="submit" disabled={isSpeakerRequestSubmitting}>
                                                {isSpeakerRequestSubmitting ? "Đang gửi..." : "Gửi yêu cầu làm diễn giả"}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </CardContent>
                        </Card>
                    )}

                    {isMyProfile && isSpeakerPending && (
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Yêu cầu làm diễn giả của bạn</CardTitle>
                                <CardDescription>Trạng thái yêu cầu làm diễn giả của bạn.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center space-x-2 text-yellow-600">
                                    <Mail className="h-5 w-5" />
                                    <p className="font-semibold">Yêu cầu của bạn đang chờ xử lý.</p>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    Chúng tôi đang xem xét yêu cầu của bạn. Bạn sẽ nhận được thông báo khi có cập nhật về trạng thái.
                                </p>
                                {userProfile.speakerRequestDate && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Ngày gửi: {new Date(userProfile.speakerRequestDate).toLocaleDateString('vi-VN')}
                                    </p>
                                )}
                                <div className="mt-4 p-4 border rounded-md bg-gray-50">
                                    <h4 className="font-medium text-gray-700 mb-2">Thông tin bạn đã gửi:</h4>
                                    <p className="text-sm mb-1"><strong>Tiểu sử:</strong> {userProfile.speakerBio}</p>
                                    <p className="text-sm mb-1"><strong>Chủ đề:</strong> {userProfile.speakerTopics?.join(', ')}</p>
                                    {userProfile.speakerImage && (
                                        <p className="text-sm"><strong>Hình ảnh:</strong> <a href={userProfile.speakerImage} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{userProfile.speakerImage}</a></p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="my-events" className="mt-4">
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
                </TabsContent>

                <TabsContent value="my-events-stats" className="mt-4">
                    <Tabs defaultValue="with-data" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="with-data">
                                <Ticket className="mr-2 h-4 w-4" /> Có dữ liệu
                            </TabsTrigger>
                            <TabsTrigger value="without-data">
                                <TicketSlash className="mr-2 h-4 w-4" /> Chưa có dữ liệu
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="with-data" className="mt-4">
                             <h3 className="text-xl font-semibold text-gray-800 mb-4">Sự kiện đã bán vé</h3>
                             {eventsWithStats.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {eventsWithStats.map((event) => (
                                        <EventStatisticsCard key={event.id} eventId={event.id} eventTitle={event.title} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-6">Không có sự kiện nào có dữ liệu thống kê.</p>
                            )}
                        </TabsContent>
                        <TabsContent value="without-data" className="mt-4">
                             <h3 className="text-xl font-semibold text-gray-800 mb-4">Sự kiện chưa bán được vé</h3>
                             {eventsWithoutStats.length > 0 ? (
                                <ul className="space-y-2 list-disc list-inside">
                                    {eventsWithoutStats.map((event) => (
                                        <li key={event.id}>{event.title}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-gray-500 py-6">Tất cả sự kiện của bạn đều đã có người tham gia!</p>
                            )}
                        </TabsContent>
                    </Tabs>
                </TabsContent>

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
                                                            {invitation.eventId.schedule.slice(0, 2).map((item, idx) => (
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
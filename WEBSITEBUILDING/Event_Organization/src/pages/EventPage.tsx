// EventPage.tsx
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EventDetail from '@/components/events/EventDetail';
import EventCard, { EventCardProps } from '@/components/home/EventCard';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

const API_BASE_URL = 'http://localhost:5000/api';

interface AppNotification {
  id: string;
  message: string;
  date: string;
  read: boolean;
}

const EventPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [relatedEvents, setRelatedEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

  // State dùng để kích hoạt fetch lại dữ liệu
  const [refreshKey, setRefreshKey] = useState(0);

  // Các hàm quản lý notification
  const getNotificationsForUser = (userId: string): AppNotification[] => {
    const stored = localStorage.getItem(`notifications_${userId}`);
    return stored ? JSON.parse(stored) : [];
  };

  const saveNotificationsForUser = (userId: string, notifs: AppNotification[]) => {
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs));
  };

  const addNotification = (userId: string, message: string) => {
    const currentNotifs = getNotificationsForUser(userId);
    const newNotification: AppNotification = {
      id: Date.now().toString(),
      message,
      date: new Date().toLocaleString(),
      read: false,
    };
    const updatedNotifs = [newNotification, ...currentNotifs];
    saveNotificationsForUser(userId, updatedNotifs);
    window.dispatchEvent(new Event('notificationAdded'));
  };

  // CẬP NHẬT: Kiểm tra đăng ký bằng cách tìm vé của người dùng trong eventData.tickets
  const checkRegistrationStatus = (eventData: any, user: any) => {
    if (user && eventData?.tickets) {
      // eventData.tickets là mảng các Ticket objects (vì backend đã populate tickets.userId)
      const isUserRegistered = eventData.tickets.some((ticket: any) => ticket.userId === user.id);
      setIsRegistered(isUserRegistered);
    } else {
      setIsRegistered(false);
    }
  };

  const checkOrganizerStatus = (eventData: any, user: any) => {
    if (user && eventData) {
      const isUserAdmin = user.role === 'admin';
      const isUserEventOrganizer = eventData.organizerId && (user.id === eventData.organizerId);
      setIsOrganizer(isUserAdmin || isUserEventOrganizer);
    } else {
      setIsOrganizer(false);
    }
  };


  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!id) {
            setError('Thiếu ID sự kiện.'); // Việt hóa
            setLoading(false);
            return;
        }
        const eventRes = await axios.get(`${API_BASE_URL}/events/${id}`);
        const eventData = eventRes.data;

        const userString = localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;

        checkRegistrationStatus(eventData, user);
        checkOrganizerStatus(eventData, user);

        const organizerDetails = eventData.organizer ? {
            name: eventData.organizer.name || 'Người tổ chức không xác định', // Việt hóa
            image: eventData.organizer.image || null,
            description: eventData.organizer.description || `Sự kiện tổ chức bởi ${eventData.organizer.name}.`
        } : {
            name: 'Người tổ chức không xác định', // Việt hóa
            image: null,
            description: 'Thông tin người tổ chức không khả dụng.' // Việt hóa
        };

        setCurrentEvent({
          id: eventData._id,
          title: eventData.title,
          date: new Date(eventData.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }), // Việt hóa định dạng ngày
          time: eventData.time,
          location: eventData.location,
          address: eventData.address || eventData.location,
          image: eventData.image,
          isFree: eventData.isFree, // <-- Đảm bảo thuộc tính này được truyền vào
          price: eventData.isFree
            ? 'Miễn phí' // Việt hóa
            : `${eventData.price?.amount?.toLocaleString()} ${eventData.price?.currency?.toUpperCase()}`,
          category: eventData.category,
          organizer: organizerDetails,
          organizerId: eventData.organizerId,
          description: eventData.description,
          longDescription: eventData.longDescription,
          // CẬP NHẬT: registeredAttendeesCount sẽ là số lượng tickets
          registeredAttendeesCount: eventData.tickets ? eventData.tickets.length : 0,
          // XÓA DÒNG NÀY: registeredAttendees: eventData.registeredAttendees || [],
          capacity: eventData.capacity,
          schedule: eventData.schedule || [],
        });

        const allEventsRes = await axios.get(`${API_BASE_URL}/events`);
        const related = allEventsRes.data
            .filter((e: any) => e._id !== id && e.category === eventData.category)
            .slice(0, 3)
            .map((event: any) => ({
                id: event._id,
                title: event.title,
                date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }), // Việt hóa định dạng ngày
                time: event.time,
                location: event.location,
                image: event.image,
                price: event.isFree ? 'Miễn phí' : `${event.price?.amount?.toLocaleString()} ${event.price?.currency?.toUpperCase()}`, // Việt hóa
                category: event.category,
                organizer: event.organizer?.name || 'Người tổ chức không xác định' // Việt hóa
            }));
        setRelatedEvents(related);

      } catch (err) {
        console.error('Lỗi khi lấy chi tiết sự kiện:', err); // Việt hóa
        setError('Không thể tải chi tiết sự kiện. Có thể sự kiện không tồn tại hoặc đã bị xóa.'); // Việt hóa
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, refreshKey]);

  useEffect(() => {
    if (location.state?.fromEdit) {
      toast.info("Chi tiết sự kiện đã được làm mới."); // Việt hóa
      setRefreshKey(prevKey => prevKey + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);


  const handleRegisterForEvent = async (discountCode?: string) => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    if (!token || !userString) {
      toast.error('Bạn cần đăng nhập để đăng ký sự kiện.'); // Việt hóa
      navigate('/signin');
      return;
    }
    const userId = JSON.parse(userString).id;

    try {
      let response;
      // Dựa vào thuộc tính `isFree` của `currentEvent` để quyết định API gọi
      if (currentEvent.isFree) {
        response = await axios.post(
          `${API_BASE_URL}/events/${id}/register`,
          { discountCode },
          { headers: { 'x-auth-token': token } }
        );
      } else { // Sự kiện có phí
        response = await axios.post(
          `${API_BASE_URL}/events/${id}/purchase-ticket`,
          { discountCode },
          { headers: { 'x-auth-token': token } }
        );
      }

      toast.success(response.data.msg);

      setRefreshKey(prevKey => prevKey + 1);

      if (userId && currentEvent?.title) {
        addNotification(userId, `Bạn đã ${currentEvent.isFree ? 'đăng ký' : 'mua vé'} thành công sự kiện: "${currentEvent.title}"!`); // Việt hóa
      }
    } catch (error: any) {
      console.error('Lỗi trong quá trình đăng ký/mua vé sự kiện:', error.response?.data || error.message); // Việt hóa
      toast.error(error.response?.data?.msg || 'Hoàn thành hành động thất bại.'); // Việt hóa
    }
  };

  const handleDeleteEvent = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Bạn cần đăng nhập để xóa sự kiện.'); // Việt hóa
      navigate('/signin');
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/events/${id}`, {
        headers: { 'x-auth-token': token },
      });
      toast.success('Sự kiện đã được xóa thành công!'); // Việt hóa
      navigate('/events');
    } catch (error: any) {
      console.error('Lỗi khi xóa sự kiện:', error.response?.data || error.message); // Việt hóa
      toast.error(error.response?.data?.msg || 'Xóa sự kiện thất bại.'); // Việt hóa
    }
  };

  const handleEditEvent = () => {
    if (id) {
      navigate(`/edit-event/${id}`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải thông tin sự kiện...</div>; // Việt hóa
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;


  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />
      <main className="flex-grow">
        {currentEvent ? (
          <>
            {/* TRUYỀN THUỘC TÍNH isFree XUỐNG EventDetail */}
            <EventDetail
                {...currentEvent}
                onRegister={handleRegisterForEvent}
                isRegistered={isRegistered}
                isOrganizer={isOrganizer}
                isFree={currentEvent.isFree}
            />

            {isOrganizer && (
              <div className="container mx-auto px-4 py-4 flex justify-end gap-4 border-t">
                 {/* Nút để tổ chức viên xem danh sách người đăng kí/check-in */}
                <Button variant="outline" onClick={() => navigate(`/event/${id}/attendees`)}>
                  Quản lý người tham gia
                </Button>
                <Button variant="outline" onClick={handleEditEvent}>
                  Chỉnh sửa sự kiện
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Xóa sự kiện</Button> {/* Việt hóa */}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bạn có chắc chắn muốn xóa sự kiện này không?</AlertDialogTitle> {/* Việt hóa */}
                      <AlertDialogDescription>
                        Hành động này không thể hoàn tác, sự kiện sẽ bị xóa vĩnh viễn khỏi hệ thống. {/* Việt hóa */}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel> {/* Việt hóa */}
                      <AlertDialogAction onClick={handleDeleteEvent} className="bg-red-600 hover:bg-red-700">
                        Xóa {/* Việt hóa */}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {relatedEvents.length > 0 && (
                <section className="py-12 bg-white border-t">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Sự kiện bạn có thể thích</h2> {/* Việt hóa */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {relatedEvents.map((event) => (
                        <EventCard key={event.id} {...event} />
                    ))}
                    </div>
                </div>
                </section>
            )}
          </>
        ) : (
          <div className="container mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy sự kiện</h2> {/* Việt hóa */}
            <p className="text-gray-600 mb-8">Sự kiện bạn tìm kiếm có thể không tồn tại hoặc đã bị xóa.</p> {/* Việt hóa */}
            <Button onClick={() => navigate('/events')}>Trở về trang sự kiện</Button> {/* Việt hóa */}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EventPage;
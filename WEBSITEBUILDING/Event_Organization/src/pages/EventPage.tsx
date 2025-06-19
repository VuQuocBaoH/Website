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

  const checkRegistrationStatus = (eventData: any, user: any) => {
    if (user && eventData?.registeredAttendees) {
      const isUserRegistered = eventData.registeredAttendees.includes(user.id);
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
            setError('Event ID is missing.');
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
            name: eventData.organizer.name || 'Unknown Organizer',
            image: eventData.organizer.image || null,
            description: eventData.organizer.description || `Sự kiện tổ chức bởi ${eventData.organizer.name}.`
        } : {
            name: 'Unknown Organizer',
            image: null,
            description: 'Organizer information is not available.'
        };
        
        setCurrentEvent({
          id: eventData._id,
          title: eventData.title,
          date: new Date(eventData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          time: eventData.time,
          location: eventData.location,
          address: eventData.address || eventData.location,
          image: eventData.image,
          // Đảm bảo truyền isFree từ backend xuống frontend
          isFree: eventData.isFree, 
          // Format giá cho hiển thị. Backend sẽ xử lý price object.
          price: eventData.isFree
            ? 'Free'
            : `${eventData.price?.amount?.toLocaleString()} ${eventData.price?.currency?.toUpperCase()}`,
          category: eventData.category,
          organizer: organizerDetails,
          organizerId: eventData.organizerId,
          description: eventData.description,
          longDescription: eventData.longDescription,
          registeredAttendeesCount: eventData.registeredAttendees ? eventData.registeredAttendees.length : 0,
          registeredAttendees: eventData.registeredAttendees || [],
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
                date: new Date(event.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                time: event.time,
                location: event.location,
                image: event.image,
                price: event.isFree ? 'Free' : `${event.price?.amount?.toLocaleString()} ${event.price?.currency?.toUpperCase()}`, // Cập nhật cách lấy price cho EventCard
                category: event.category,
                organizer: event.organizer?.name || 'Unknown Organizer'
            }));
        setRelatedEvents(related);

      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details. It might not exist or has been removed.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, refreshKey]);

  useEffect(() => {
    if (location.state?.fromEdit) {
      toast.info("Event details have been refreshed.");
      setRefreshKey(prevKey => prevKey + 1);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);


  const handleRegisterForEvent = async (discountCode?: string) => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    if (!token || !userString) {
      toast.error('You need to be logged in to register for an event.');
      navigate('/signin');
      return;
    }
    const userId = JSON.parse(userString).id;

    try {
      let response;
      // Dựa vào thuộc tính `isFree` của `currentEvent` để quyết định API gọi
      if (currentEvent.isFree) { 
        // Gọi API đăng ký sự kiện miễn phí
        response = await axios.post(
          `${API_BASE_URL}/events/${id}/register`,
          { discountCode }, // discountCode (nếu có)
          { headers: { 'x-auth-token': token } }
        );
        toast.success(response.data.msg || 'Successfully registered for the free event!');
      } else {
        // Gọi API mua vé sự kiện có phí (giả lập thanh toán)
        response = await axios.post(
          `${API_BASE_URL}/events/${id}/purchase-ticket`,
          { discountCode }, // discountCode (nếu có)
          { headers: { 'x-auth-token': token } }
        );
        toast.success(response.data.msg || 'Ticket purchase initiated!');
        // Trong thực tế, bạn có thể kiểm tra response.data.redirectUrl và chuyển hướng tại đây
      }
      
      // Cập nhật lại dữ liệu event sau khi đăng ký/mua vé thành công
      setRefreshKey(prevKey => prevKey + 1);

      // Thêm thông báo
      if (userId && currentEvent?.title) {
        addNotification(userId, `Bạn đã ${currentEvent.isFree ? 'đăng ký' : 'mua vé'} thành công sự kiện: "${currentEvent.title}"!`);
      }
    } catch (error: any) {
      console.error('Error during event registration/purchase:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || 'Failed to complete action.');
    }
  };

  const handleDeleteEvent = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('You need to be logged in to delete an event.');
      navigate('/signin');
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/events/${id}`, {
        headers: { 'x-auth-token': token },
      });
      toast.success('Event deleted successfully!');
      navigate('/events');
    } catch (error: any) {
      console.error('Error deleting event:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || 'Failed to delete event.');
    }
  };

  const handleEditEvent = () => {
    if (id) {
      navigate(`/edit-event/${id}`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải thông tin sự kiện...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;


  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />
      <main className="flex-grow">
        {currentEvent ? (
          <>
            <EventDetail
                {...currentEvent}
                onRegister={handleRegisterForEvent}
                isRegistered={isRegistered}
                isOrganizer={isOrganizer}
            />

            {isOrganizer && (
              <div className="container mx-auto px-4 py-4 flex justify-end gap-4 border-t">
                <Button variant="outline" onClick={handleEditEvent}>
                  Chỉnh sửa sự kiện
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Xóa sự kiện</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bạn có chắc chắn muốn xóa sự kiện này không?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hành động này không thể hoàn tác, sự kiện sẽ bị xóa vĩnh viễn khỏi hệ thống.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteEvent} className="bg-red-600 hover:bg-red-700">
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {relatedEvents.length > 0 && (
                <section className="py-12 bg-white border-t">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Sự kiện bạn có thể thích</h2>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy sự kiện</h2>
            <p className="text-gray-600 mb-8">Sự kiện bạn tìm kiếm có thể không tồn tại hoặc đã bị xóa.</p>
            <Button onClick={() => navigate('/events')}>Trở về trang sự kiện</Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EventPage;
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

// Đổi tên interface Notification thành AppNotification
interface AppNotification { // <-- ĐÃ ĐỔI TÊN Ở ĐÂY
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

  const [refreshKey, setRefreshKey] = useState(0);

  // Hàm để quản lý notifications trong localStorage theo user ID
  // Các hàm này bây giờ sử dụng AppNotification
  const getNotificationsForUser = (userId: string): AppNotification[] => {
    const stored = localStorage.getItem(`notifications_${userId}`);
    return stored ? JSON.parse(stored) : [];
  };

  const saveNotificationsForUser = (userId: string, notifs: AppNotification[]) => {
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs));
  };

  const addNotification = (userId: string, message: string) => {
    const currentNotifs = getNotificationsForUser(userId);
    const newNotification: AppNotification = { // <-- Dùng AppNotification ở đây
      id: Date.now().toString(),
      message,
      date: new Date().toLocaleString(),
      read: false,
    };
    const updatedNotifs = [newNotification, ...currentNotifs];
    saveNotificationsForUser(userId, updatedNotifs);
    // Kích hoạt sự kiện tùy chỉnh (Navbar sẽ lắng nghe)
    window.dispatchEvent(new Event('notificationAdded'));
  };

  const checkRegistrationStatus = (eventData: any) => {
    const userString = localStorage.getItem('user');
    if (userString && eventData.registeredAttendees) {
      try {
        const user = JSON.parse(userString);
        const isUserRegistered = eventData.registeredAttendees.includes(user.id);
        setIsRegistered(isUserRegistered);
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        setIsRegistered(false);
      }
    } else {
      setIsRegistered(false);
    }
  };

  const checkOrganizerStatus = (eventData: any) => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        const isUserAdmin = user.role === 'admin';
        const isUserEventOrganizer = eventData.organizerId && (user.id === eventData.organizerId);
        setIsOrganizer(isUserAdmin || isUserEventOrganizer);
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        setIsOrganizer(false);
      }
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

        checkRegistrationStatus(eventData);
        checkOrganizerStatus(eventData);

        setCurrentEvent({
          id: eventData._id,
          title: eventData.title,
          date: new Date(eventData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          time: eventData.time,
          location: eventData.location,
          image: eventData.image,
          price: eventData.price || 'Free',
          category: eventData.category,
          organizer: {
            name: eventData.organizer.name,
            image: eventData.organizer.image || null,
            description: eventData.organizer.description || `Event organized by ${eventData.organizer.name}.`
          },
          organizerId: eventData.organizerId,
          description: eventData.description,
          longDescription: eventData.longDescription || eventData.description,
          address: eventData.address || eventData.location,
          registeredAttendeesCount: eventData.registeredAttendees ? eventData.registeredAttendees.length : 0,
          registeredAttendees: eventData.registeredAttendees || [],
          capacity: eventData.capacity,
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
                price: event.price,
                category: event.category,
                organizer: event.organizer.name
            }));
        setRelatedEvents(related);

      } catch (err) {
        console.error('Error fetching event details:', err);
        setError('Failed to load event details. It might not exist.');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id, navigate, refreshKey]);

  const handleRegisterForEvent = async (discountCode?: string) => {
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    let userId: string | undefined;

    if (userString) {
      try {
        userId = JSON.parse(userString).id;
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
      }
    }

    if (!token || !userId) {
      toast.error('You need to be logged in to register for an event.');
      navigate('/signin');
      return;
    }

    if (!currentEvent || !id) {
        toast.error('Event not found or invalid ID.');
        return;
    }

    try {
    const response = await axios.post(
      `${API_BASE_URL}/events/${id}/register`,
      { discountCode },
      {
        headers: {
          'x-auth-token': token,
        },
      });

      toast.success(response.data.msg || 'Successfully registered for the event!');
      setIsRegistered(true);

      setCurrentEvent((prev: any) => ({
        ...prev,
        registeredAttendeesCount: (prev.registeredAttendeesCount || 0) + 1,
        registeredAttendees: [...(prev.registeredAttendees || []), JSON.parse(localStorage.getItem('user') || '{}').id]
      }));

      // THÊM THÔNG BÁO KHI ĐĂNG KÝ THÀNH CÔNG
      if (userId && currentEvent?.title) {
        addNotification(userId, `Bạn đã đăng ký thành công sự kiện: "${currentEvent.title}"!`);
      }


    } catch (error: any) {
      console.error('Error registering for event:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || 'Failed to register for the event.');
    }
  };

  const handleDeleteEvent = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('You need to be logged in to delete an event.');
      navigate('/signin');
      return;
    }

    if (!id) {
        toast.error('Event ID is missing.');
        return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/events/${id}`, {
        headers: {
          'x-auth-token': token,
        },
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
      navigate(`/edit-event/${id}`, { state: { fromEdit: true } });
    }
  };

  useEffect(() => {
    const locationState = location.state as any;
    if (locationState && locationState.fromEdit) {
      setRefreshKey(prevKey => prevKey + 1);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location.state]);


  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading event details...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;


  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {currentEvent ? (
          <>
            <EventDetail
                {...currentEvent}
                onRegister={handleRegisterForEvent}
                isRegistered={isRegistered}
                registeredAttendees={currentEvent.registeredAttendees}
                registeredAttendeesCount={currentEvent.registeredAttendeesCount}
                capacity={currentEvent.capacity}
                isOrganizer={isOrganizer}
            />

            {/* Các nút Chỉnh sửa/Xóa */}
            {isOrganizer && (
              <div className="container mx-auto px-4 py-4 flex justify-end gap-4">
                <Button variant="outline" onClick={handleEditEvent}>
                  Chỉnh sửa sự kiện
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Xóa sự kiện</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bạn có chắc chắn muốn xóa sự kiện này?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Sự kiện sẽ bị xóa vĩnh viễn khỏi hệ thống.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteEvent} className="bg-red-500 hover:bg-red-600">
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* Phần "Similar Events You May Like" */}
            {relatedEvents.length > 0 && (
                <section className="py-12 bg-gray-50">
                <div className="container mx-auto px-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Similar Events You May Like</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h2>
            <p className="text-gray-600 mb-8">The event you're looking for doesn't exist or has been removed.</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EventPage;
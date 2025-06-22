// src/pages/OrganizerProfilePage.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EventCard, { EventCardProps } from '@/components/home/EventCard';
import { User } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const OrganizerProfilePage = () => {
  const { organizerId } = useParams<{ organizerId: string }>();
  const [organizer, setOrganizer] = useState<any>(null);
  const [events, setEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizerId) return;

    const fetchOrganizerData = async () => {
      setLoading(true);
      setError(null);
      try {
        const profilePromise = axios.get(`${API_BASE_URL}/users/${organizerId}/profile`);
        const eventsPromise = axios.get(`${API_BASE_URL}/events/organizer/${organizerId}`);

        const [profileResponse, eventsResponse] = await Promise.all([profilePromise, eventsPromise]);

        setOrganizer(profileResponse.data);

        const formattedEvents = eventsResponse.data.map((event: any) => ({
            id: event._id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }), // Việt hóa định dạng ngày
            location: event.location,
            image: event.image,
            price: event.price,
            category: event.category,
            organizer: event.organizer.name
        }));
        setEvents(formattedEvents);

      } catch (err) {
        setError('Không thể tải thông tin người tổ chức. Người dùng có thể không tồn tại.'); // Việt hóa
        console.error("Lỗi khi lấy dữ liệu người tổ chức:", err); // Việt hóa
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerData();
  }, [organizerId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>; // Việt hóa
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="container mx-auto px-4">

          {organizer && (
            <div className="flex items-center gap-6 mb-12 p-6 bg-white rounded-lg shadow-sm">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                    {/* Placeholder for organizer image */}
                    <User className="w-12 h-12 text-gray-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{organizer.name || organizer.username}</h1>
                    <p className="text-md text-gray-600 mt-1">{organizer.description || 'Không có mô tả.'}</p> {/* Việt hóa */}
                </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Các sự kiện được tổ chức bởi {organizer?.name || organizer?.username}</h2> {/* Việt hóa */}
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">Người này chưa tổ chức sự kiện nào.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrganizerProfilePage;
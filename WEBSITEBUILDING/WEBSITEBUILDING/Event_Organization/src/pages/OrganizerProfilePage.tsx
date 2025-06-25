// src/pages/OrganizerProfilePage.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EventCard, { EventCardProps } from '@/components/home/EventCard';
import { User as UserIcon, Mail } from 'lucide-react'; // Import Mail icon

const API_BASE_URL = import.meta.env.VITE_API_URL;

// NEW: Interface cho profile người tổ chức, khớp với UserProfile đã populate
interface OrganizerProfile {
  _id: string;
  username: string;
  email?: string; // email có thể có nếu là admin xem hoặc được populate
  speakerBio?: string; // Mô tả từ field speakerBio của User
  speakerImage?: string; // URL ảnh từ field speakerImage của User
  role: 'user' | 'admin'; // để biết quyền hiện tại của user xem
}

const OrganizerProfilePage = () => {
  const { organizerId } = useParams<{ organizerId: string }>();
  // Đổi tên state để rõ ràng hơn và sử dụng interface mới
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [organizerEvents, setOrganizerEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizerId) {
      setError("Không có ID người tổ chức được cung cấp.");
      setLoading(false);
      return;
    }

    const fetchOrganizerData = async () => {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token'); // Lấy token để xác thực nếu là admin
      const headers = token ? { 'x-auth-token': token } : {};

      try {
        // Fetch thông tin profile của người tổ chức (dùng API users/:id/profile)
        const profileResponse = await axios.get<OrganizerProfile>(`${API_BASE_URL}/users/${organizerId}/profile`, { headers });
        setOrganizerProfile(profileResponse.data);

        // Fetch các sự kiện do người tổ chức này tạo
        const eventsResponse = await axios.get(`${API_BASE_URL}/events/organizer/${organizerId}`, { headers });
        const formattedEvents = eventsResponse.data.map((event: any) => ({
            id: event._id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
            location: event.location,
            image: event.image,
            // Giá cần được định dạng lại vì backend chỉ trả về object price
            price: event.isFree ? 'Miễn phí' : `${event.price?.amount?.toLocaleString('vi-VN')} ${event.price?.currency?.toUpperCase()}`,
            category: event.category,
            organizer: event.organizer.name // Tên organizer hiển thị từ event
        }));
        setOrganizerEvents(formattedEvents);

      } catch (err: any) {
        console.error("Lỗi khi lấy dữ liệu người tổ chức:", err);
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 404) {
            setError('Không tìm thấy người tổ chức này.');
          } else if (err.response?.status === 403) {
            setError('Bạn không có quyền xem hồ sơ này.');
          } else {
            setError('Không thể tải thông tin người tổ chức. Vui lòng thử lại sau.');
          }
        } else {
          setError('Đã xảy ra lỗi không mong muốn.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizerData();
  }, [organizerId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải hồ sơ người tổ chức...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!organizerProfile) return <div className="min-h-screen flex items-center justify-center text-gray-500">Không tìm thấy thông tin người tổ chức.</div>;

  const organizerDisplayImage = organizerProfile.speakerImage && organizerProfile.speakerImage !== "" ? organizerProfile.speakerImage : null;


  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="container mx-auto px-4">

          {organizerProfile && ( // Đảm bảo organizerProfile tồn tại trước khi render
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12 p-6 bg-white rounded-lg shadow-sm">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    {organizerDisplayImage ? (
                        <img
                            src={organizerDisplayImage}
                            alt={organizerProfile.username}
                            className="w-full h-full rounded-full object-cover"
                        />
                    ) : (
                        <UserIcon className="w-12 h-12 text-gray-500" />
                    )}
                </div>
                <div className="text-center md:text-left flex-grow">
                    <h1 className="text-3xl font-bold text-gray-900">{organizerProfile.username}</h1>
                    <p className="text-md text-gray-600 mt-1">Người tổ chức</p>
                    {organizerProfile.email && ( // Chỉ hiển thị email nếu có
                        <p className="text-sm text-gray-600 mt-1 flex items-center justify-center md:justify-start">
                            <Mail className="h-4 w-4 mr-2" /> {organizerProfile.email}
                        </p>
                    )}
                    <p className="text-gray-700 text-sm mt-3 whitespace-pre-wrap">
                        {organizerProfile.speakerBio || "Người tổ chức này chưa cung cấp tiểu sử chi tiết."}
                    </p>
                </div>
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-6">Các sự kiện được tổ chức bởi {organizerProfile?.username}</h2>
          {organizerEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {organizerEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 px-6 bg-white rounded-lg shadow-sm">
                <p className="text-gray-600">Người này chưa tổ chức sự kiện nào.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrganizerProfilePage;
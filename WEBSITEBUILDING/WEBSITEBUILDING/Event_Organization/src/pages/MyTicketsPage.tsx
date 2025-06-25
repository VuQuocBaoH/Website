// src/pages/MyTicketsPage.tsx
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import axios from 'axios';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, Calendar, MapPin, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface TicketDisplayProps {
  id: string;
  ticketCode: string;
  qrCodeUrl: string;
  purchaseDate: string; // ISO String
  isPaid: boolean;
  isFreeTicket: boolean;
  checkInStatus: 'pending' | 'checkedIn' | 'noShow';
  checkInTime?: string; // ISO String
  event: {
    id: string;
    title: string;
    date: string; // ISO String
    time: string;
    location: string;
    address?: string;
    image: string;
    price: string; // Đã format
    category: string;
    organizerName: string;
  };
}

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState<TicketDisplayProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // State mới để quản lý modal QR code
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentQrCodeUrl, setCurrentQrCodeUrl] = useState('');

  useEffect(() => {
    const fetchMyTickets = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Bạn cần đăng nhập để xem vé của mình.');
        navigate('/signin');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/events/my-tickets`, {
          headers: { 'x-auth-token': token },
        });
        setTickets(response.data);
      } catch (err: any) {
        console.error('Lỗi khi lấy vé của tôi:', err.response?.data || err.message);
        setError(err.response?.data?.msg || 'Không thể tải vé của bạn.');
        toast.error('Không thể tải vé của bạn.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyTickets();
  }, []);

  // Hàm mở modal QR
  const openQrModal = (qrUrl: string) => {
    setCurrentQrCodeUrl(qrUrl);
    setIsQrModalOpen(true);
  };

  // Hàm đóng modal QR
  const closeQrModal = () => {
    setIsQrModalOpen(false);
    setCurrentQrCodeUrl('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải vé của bạn...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Vé của tôi</h1>

        {tickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <Ticket className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Bạn chưa có vé nào được đăng ký hoặc mua.</p>
            <Button onClick={() => navigate('/events')}>
              Khám phá sự kiện
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <Link to={`/events/${ticket.event.id}`}>
                  <img src={ticket.event.image} alt={ticket.event.title} className="w-full h-48 object-cover" />
                </Link>
                <div className="p-5">
                  <Link to={`/events/${ticket.event.id}`} className="block text-xl font-semibold text-gray-900 hover:text-event-purple transition-colors mb-2">
                    {ticket.event.title}
                  </Link>
                  <p className="text-sm text-gray-600 mb-4">Mã vé: <span className="font-medium text-gray-800">{ticket.ticketCode}</span></p>

                  <div className="flex items-center text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 mr-2 text-event-purple" />
                    <span>
                        {new Date(ticket.event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {' - '}
                        {ticket.event.time}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-700 mb-4">
                    <MapPin className="h-4 w-4 mr-2 text-event-purple" />
                    <span>{ticket.event.location}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-sm text-gray-500">Trạng thái Check-in</p>
                      <span className={`font-semibold ${
                        ticket.checkInStatus === 'checkedIn' ? 'text-green-600' :
                        ticket.checkInStatus === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {ticket.checkInStatus === 'checkedIn' ? 'Đã Check-in' :
                         ticket.checkInStatus === 'pending' ? 'Chờ Check-in' :
                         'Vắng mặt'}
                      </span>
                    </div>
                    {/* Hiển thị QR Code */}
                    {ticket.qrCodeUrl && (
                      <div className="relative"> 
                        <img
                          src={ticket.qrCodeUrl}
                          alt="Mã QR"
                          className="w-16 h-16 border rounded-sm cursor-pointer"
                          onClick={() => openQrModal(ticket.qrCodeUrl)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal hiển thị QR Code lớn */}
      {isQrModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeQrModal}
        >
          <div
            className="bg-white p-6 rounded-lg shadow-xl relative"
            onClick={(e) => e.stopPropagation()} 
          >
            <button
              onClick={closeQrModal}
              className="absolute top-3 right-3 text-gray-700 hover:text-gray-900 text-2xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center">Mã QR của bạn</h2>
            {currentQrCodeUrl && (
              <img src={currentQrCodeUrl} alt="Mã QR Lớn" className="w-80 h-80 mx-auto" />
            )}
            <p className="text-center text-sm text-gray-500 mt-4">Nhấn vào bất kỳ đâu bên ngoài để đóng</p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default MyTicketsPage;
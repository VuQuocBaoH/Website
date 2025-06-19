// src/pages/MyTicketsPage.tsx
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import axios from 'axios';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, Calendar, MapPin, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE_URL = 'http://localhost:5000/api';

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

  useEffect(() => {
    const fetchMyTickets = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('You need to be logged in to view your tickets.');
        navigate('/signin');
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/events/my-tickets`, {
          headers: { 'x-auth-token': token },
        });
        setTickets(response.data);
      } catch (err: any) {
        console.error('Error fetching my tickets:', err.response?.data || err.message);
        setError(err.response?.data?.msg || 'Failed to load your tickets.');
        toast.error('Failed to load your tickets.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyTickets();
  }, []);

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
                <Link to={`/event/${ticket.event.id}`}>
                  <img src={ticket.event.image} alt={ticket.event.title} className="w-full h-48 object-cover" />
                </Link>
                <div className="p-5">
                  <Link to={`/event/${ticket.event.id}`} className="block text-xl font-semibold text-gray-900 hover:text-event-purple transition-colors mb-2">
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
                      <div className="relative group">
                        <img
                          src={ticket.qrCodeUrl}
                          alt="QR Code"
                          className="w-16 h-16 border rounded-sm cursor-pointer"
                        />
                        <div className="absolute left-1/2 transform -translate-x-1/2 -top-20 bg-white p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                            <img src={ticket.qrCodeUrl} alt="QR Code Large" className="w-48 h-48" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyTicketsPage;
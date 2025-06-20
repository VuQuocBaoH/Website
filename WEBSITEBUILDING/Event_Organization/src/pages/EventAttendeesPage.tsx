// D:/code/DACNTT2/WEBSITEBUILDING/Event_Organization/src/pages/EventAttendeesPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, CheckCircle, XCircle, Search, ScanLine, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

interface AttendeeTicket {
  id: string;
  ticketCode: string;
  qrCodeUrl: string;
  purchaseDate: string;
  isPaid: boolean;
  isFreeTicket: boolean;
  checkInStatus: 'pending' | 'checkedIn' | 'noShow';
  checkInTime?: string;
  user: {
    id: string;
    username: string;
    email: string;
  } | null; // Có thể null nếu user bị xóa
}

const EventAttendeesPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState('');
  const [allTickets, setAllTickets] = useState<AttendeeTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedTicketCode, setScannedTicketCode] = useState('');
  const [currentScanResult, setCurrentScanResult] = useState<AttendeeTicket | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventTickets = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;

      if (!token || !user) {
        toast.error('Bạn cần đăng nhập để xem trang này.');
        navigate('/signin');
        return;
      }

      try {
        const eventRes = await axios.get(`<span class="math-inline">\{API\_BASE\_URL\}/events/</span>{eventId}`);
        const eventData = eventRes.data;
        setEventTitle(eventData.title);

        const isUserAdmin = user.role === 'admin';
        const isUserEventOrganizer = eventData.organizerId && (user.id === eventData.organizerId);

        if (!isUserAdmin && !isUserEventOrganizer) {
          toast.error('Bạn không có quyền truy cập trang này.');
          navigate('/');
          return;
        }

        const ticketsRes = await axios.get(`<span class="math-inline">\{API\_BASE\_URL\}/events/</span>{eventId}/tickets`, {
          headers: { 'x-auth-token': token },
        });
        setAllTickets(ticketsRes.data);
      } catch (err: any) {
        console.error('Error fetching event tickets:', err.response?.data || err.message);
        setError(err.response?.data?.msg || 'Failed to load event tickets.');
        toast.error(err.response?.data?.msg || 'Failed to load event tickets.');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventTickets();
    }
  }, [eventId, navigate]);

  const handleCheckIn = async (ticketCode: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/tickets/check-in`,
        { ticketCode, eventId },
        { headers: { 'x-auth-token': token } }
      );
      toast.success(response.data.msg);
      setAllTickets(prev => prev.map(ticket =>
        ticket.ticketCode === ticketCode ? { ...ticket, checkInStatus: 'checkedIn', checkInTime: new Date().toISOString() } : ticket
      ));
      setCurrentScanResult(prev => prev ? { ...prev, checkInStatus: 'checkedIn', checkInTime: new Date().toISOString() } : null);
    } catch (err: any) {
      console.error('Check-in error:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Failed to check in ticket.');
      setScanError(err.response?.data?.msg || 'Failed to check in ticket.');
    }
  };

  const handleCheckOut = async (ticketCode: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required.');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/tickets/check-out`,
        { ticketCode, eventId },
        { headers: { 'x-auth-token': token } }
      );
      toast.success(response.data.msg);
      setAllTickets(prev => prev.map(ticket =>
        ticket.ticketCode === ticketCode ? { ...ticket, checkInStatus: 'pending', checkInTime: undefined } : ticket
      ));
      setCurrentScanResult(prev => prev ? { ...prev, checkInStatus: 'pending', checkInTime: undefined } : null);
    } catch (err: any) {
      console.error('Check-out error:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Failed to check out ticket.');
      setScanError(err.response?.data?.msg || 'Failed to check out ticket.');
    }
  };

  const handleScanOrSearch = async () => {
    setScanError(null);
    setCurrentScanResult(null);

    if (!scannedTicketCode) {
      setScanError('Vui lòng nhập mã vé hoặc quét QR.');
      return;
    }

    const foundTicket = allTickets.find(t => t.ticketCode === scannedTicketCode);
    if (foundTicket) {
      setCurrentScanResult(foundTicket);
    } else {
      setScanError('Không tìm thấy vé với mã này cho sự kiện này.');
    }
  };

  const filteredTickets = allTickets.filter(ticket =>
    (ticket.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ticket.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ticket.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingTickets = allTickets.filter(t => t.checkInStatus === 'pending');
  const checkedInTickets = allTickets.filter(t => t.checkInStatus === 'checkedIn');

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải danh sách người tham gia...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý người tham gia</h1>
        <h2 className="text-xl text-gray-700 mb-8">Sự kiện: {eventTitle}</h2>

        <Tabs defaultValue="checkin" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="checkin">Check-in / Quét vé</TabsTrigger>
            <TabsTrigger value="pending">Chưa Check-in ({pendingTickets.length})</TabsTrigger>
            <TabsTrigger value="checkedIn">Đã Check-in ({checkedInTickets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="checkin" className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">Quét hoặc nhập mã vé</h3>
            <div className="flex space-x-2 mb-4">
              <Input
                type="text"
                placeholder="Nhập mã vé hoặc quét QR code"
                value={scannedTicketCode}
                onChange={(e) => setScannedTicketCode(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleScanOrSearch}>
                <Search className="h-4 w-4 mr-2" /> Tìm kiếm
              </Button>
              <Button variant="outline" disabled>
                <ScanLine className="h-4 w-4 mr-2" /> Quét QR
              </Button>
            </div>

            {scanError && (
              <div className="text-red-500 flex items-center mb-4">
                <AlertCircle className="h-4 w-4 mr-2" /> {scanError}
              </div>
            )}

            {currentScanResult && (
              <div className="border p-4 rounded-md bg-gray-50">
                <h4 className="font-semibold text-lg mb-2">Thông tin vé:</h4>
                <p><strong>Mã vé:</strong> {currentScanResult.ticketCode}</p>
                <p><strong>Người dùng:</strong> {currentScanResult.user?.username || 'N/A'} ({currentScanResult.user?.email || 'N/A'})</p>
                <p><strong>Trạng thái:</strong> <span className={`font-semibold ${
                        currentScanResult.checkInStatus === 'checkedIn' ? 'text-green-600' :
                        currentScanResult.checkInStatus === 'pending' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {currentScanResult.checkInStatus === 'checkedIn' ? 'Đã Check-in' :
                         currentScanResult.checkInStatus === 'pending' ? 'Chờ Check-in' :
                         'Vắng mặt'}
                    </span>
                </p>
                {currentScanResult.checkInTime && <p><strong>Thời gian Check-in:</strong> {new Date(currentScanResult.checkInTime).toLocaleString('vi-VN')}</p>}

                <div className="mt-4 flex space-x-2">
                  {currentScanResult.checkInStatus === 'pending' ? (
                    <Button onClick={() => handleCheckIn(currentScanResult.ticketCode)}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Check-in
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => handleCheckOut(currentScanResult.ticketCode)}>
                      <XCircle className="h-4 w-4 mr-2" /> Check-out
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">Danh sách chưa Check-in</h3>
            {pendingTickets.length === 0 ? (
              <p className="text-gray-600">Không có vé nào đang chờ check-in.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã vé</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTickets.map(ticket => (
                    <TableRow key={ticket.id}>
                      <TableCell>{ticket.ticketCode}</TableCell>
                      <TableCell>{ticket.user?.username || 'N/A'}</TableCell>
                      <TableCell>{ticket.user?.email || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="secondary" size="sm" onClick={() => handleCheckIn(ticket.ticketCode)}>
                          Check-in
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="checkedIn" className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold mb-4">Danh sách đã Check-in</h3>
            {checkedInTickets.length === 0 ? (
              <p className="text-gray-600">Không có vé nào đã check-in.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã vé</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Thời gian Check-in</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedInTickets.map(ticket => (
                    <TableRow key={ticket.id}>
                      <TableCell>{ticket.ticketCode}</TableCell>
                      <TableCell>{ticket.user?.username || 'N/A'}</TableCell>
                      <TableCell>{ticket.user?.email || 'N/A'}</TableCell>
                      <TableCell>{ticket.checkInTime ? new Date(ticket.checkInTime).toLocaleString('vi-VN') : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleCheckOut(ticket.ticketCode)}>
                          Check-out
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default EventAttendeesPage;
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, CheckCircle, XCircle, Search, ScanLine, AlertCircle, MailPlus, ListTodo } from 'lucide-react'; // Thêm MailPlus, ListTodo icons
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeResult } from "html5-qrcode";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { Textarea } from '@/components/ui/textarea'; // Import Textarea

const API_BASE_URL = import.meta.env.VITE_API_URL;

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
  } | null;
}

// Interface cho diễn giả được duyệt (từ API /api/speakers/approved)
interface ApprovedSpeaker {
  _id: string;
  username: string;
  email: string;
  speakerBio?: string;
  speakerTopics?: string[];
  speakerImage?: string;
}

interface EventInvitation {
  _id: string;
  eventId: string;
  speakerId: { // Populate từ backend
    _id: string;
    username: string;
    email: string;
    speakerBio?: string;
  };
  organizerId: string;
  status: 'pending' | 'accepted' | 'declined';
  invitationDate: string;
  responseDate?: string;
  message?: string;
}


const EventAttendeesPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState('');
  const [allTickets, setAllTickets] = useState<AttendeeTicket[]>([]);//Danh sách tất cả các vé
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedTicketCode, setScannedTicketCode] = useState('');
  const [currentScanResult, setCurrentScanResult] = useState<AttendeeTicket | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false); // State để kiểm tra quyền người tổ chức

  // States cho chức năng mời diễn giả
  const [approvedSpeakers, setApprovedSpeakers] = useState<ApprovedSpeaker[]>([]); // Danh sách diễn giả được duyệt
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>(''); // ID diễn giả được chọn để mời
  const [invitationMessage, setInvitationMessage] = useState<string>(''); // Lời nhắn mời diễn giả
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>([]); // Danh sách lời mời đã gửi cho sự kiện này

  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Hàm fetch dữ liệu chính cho trang
  useEffect(() => {
    const fetchEventData = async () => {
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
        const eventRes = await axios.get(`${API_BASE_URL}/events/${eventId}`, {
          headers: { 'x-auth-token': token },
        });
        const eventData = eventRes.data;
        setEventTitle(eventData.title);

        const isUserAdmin = user.role === 'admin';
        const isUserEventOrganizer = eventData.organizerId && user.id && (user.id.toString() === eventData.organizerId.toString());

        if (!isUserAdmin && !isUserEventOrganizer) {
          toast.error('Bạn không có quyền truy cập trang này.');
          navigate('/');
          return;
        }
        setIsOrganizer(isUserAdmin || isUserEventOrganizer); // Đặt quyền truy cập

        // Fetch danh sách vé
        const ticketsRes = await axios.get(`${API_BASE_URL}/events/${eventId}/tickets`, {
          headers: { 'x-auth-token': token },
        });
        setAllTickets(ticketsRes.data);

        // Fetch danh sách diễn giả được duyệt (chỉ nếu là người tổ chức/admin)
        if (isUserAdmin || isUserEventOrganizer) {
          const speakersRes = await axios.get<ApprovedSpeaker[]>(`${API_BASE_URL}/events/speakers/approved`, {
            headers: { 'x-auth-token': token },
          });
          setApprovedSpeakers(speakersRes.data);

          // Fetch danh sách lời mời diễn giả cho sự kiện này
          const invitationsRes = await axios.get<EventInvitation[]>(`${API_BASE_URL}/events/${eventId}/invitations`, {
            headers: { 'x-auth-token': token },
          });
          setEventInvitations(invitationsRes.data);
        }

      } catch (err: any) {
        console.error('Error fetching event data:', err.response?.data || err.message);
        setError(err.response?.data?.msg || 'Failed to load event data.');
        toast.error(err.response?.data?.msg || 'Failed to load event data.');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId, navigate]);

  // Logic khởi tạo và dọn dẹp Html5QrcodeScanner
  useEffect(() => {
    const readerId = "reader";
    const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
      setScannedTicketCode(decodedText);
      setIsScanning(false);

      if (qrScannerRef.current) {
        qrScannerRef.current.clear().then(() => {
        }).catch(err => {
          console.warn("Failed to stop QR scanning:", err);
        });
        qrScannerRef.current = null;
      }
      setTimeout(() => {
        handleScanOrSearch(decodedText);
      }, 50);
    };

    const onScanError = (errorMessage: string) => {
      // console.error(`QR Code scan error = ${errorMessage}`);
    };

    if (isScanning && !qrScannerRef.current) {
      const scanner = new Html5QrcodeScanner(
        readerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        },
        /* verbose= */ false
      );
      scanner.render(onScanSuccess, onScanError);
      qrScannerRef.current = scanner;
    } else if (!isScanning && qrScannerRef.current) {
      qrScannerRef.current.clear().then(() => {
      }).catch(err => {
        console.warn("Failed to stop QR scanning via useEffect cleanup:", err);
      });
      qrScannerRef.current = null;
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().then(() => {
        }).catch(err => {
          console.warn("Failed to stop QR scanning on component unmount:", err);
        });
        qrScannerRef.current = null;
      }
    };
  }, [isScanning, allTickets]);

  // Hàm xử lý check-in
  const handleCheckIn = async (ticketCode: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Xác thực yêu cầu.');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/events/tickets/check-in`,
        { ticketCode, eventId },
        { headers: { 'x-auth-token': token } }
      );
      toast.success(response.data.msg);
      setAllTickets(prev => prev.map(ticket =>
        ticket.ticketCode === ticketCode ? { ...ticket, checkInStatus: 'checkedIn', checkInTime: new Date().toISOString() } : ticket
      ));
      setCurrentScanResult(prev => prev ? { ...prev, checkInStatus: 'checkedIn', checkInTime: new Date().toISOString() } : null);
      setScanError(null);
    } catch (err: any) {
      console.error('Check-in error:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Check-in thất bại.');
      setScanError(err.response?.data?.msg || 'Check-in thất bại.');
    }
  };

  // Hàm xử lý check-out
  const handleCheckOut = async (ticketCode: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Xác thực yêu cầu.');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/events/tickets/check-out`,
        { ticketCode, eventId },
        { headers: { 'x-auth-token': token } }
      );
      toast.success(response.data.msg);
      setAllTickets(prev => prev.map(ticket =>
        ticket.ticketCode === ticketCode ? { ...ticket, checkInStatus: 'pending', checkInTime: undefined } : ticket
      ));
      setCurrentScanResult(prev => prev ? { ...prev, checkInStatus: 'pending', checkInTime: undefined } : null);
      setScanError(null);
    } catch (err: any) {
      console.error('Check-out error:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Check-out thất bại.');
      setScanError(err.response?.data?.msg || 'Check-out thất bại.');
    }
  };

  const extractTicketCodeFromQRString = (qrString: string): string | null => {
    const ticketCodeMatch = qrString.match(/Mã vé: ([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
    if (ticketCodeMatch && ticketCodeMatch[1]) {
      return ticketCodeMatch[1];
    }
    return null;
  };

  const handleScanOrSearch = async (scannedValue?: string) => {
    setScanError(null);
    setCurrentScanResult(null);

    const inputValue = scannedValue || scannedTicketCode;

    if (!inputValue) {
      setScanError('Vui lòng nhập mã vé hoặc quét QR.');
      return;
    }

    const actualTicketCode = extractTicketCodeFromQRString(inputValue);

    if (!actualTicketCode) {
      setScanError('Định dạng mã QR không hợp lệ hoặc không tìm thấy mã vé.');
      return;
    }

    const foundTicket = allTickets.find(t => t.ticketCode === actualTicketCode);

    if (foundTicket) {
      setCurrentScanResult(foundTicket);
      setScanError(null);
    } else {
      setScanError('Không tìm thấy vé với mã này cho sự kiện hiện tại.');
    }
  };

  // Hàm xử lý mời diễn giả
  const handleInviteSpeaker = async () => {
    if (!selectedSpeakerId) {
      toast.error('Vui lòng chọn một diễn giả để mời.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Xác thực yêu cầu.');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/events/${eventId}/invite-speaker`,
        { speakerId: selectedSpeakerId, message: invitationMessage },
        { headers: { 'x-auth-token': token } }
      );
      toast.success(response.data.msg);
      setSelectedSpeakerId(''); // Reset lựa chọn
      setInvitationMessage(''); // Reset lời nhắn

      // Cập nhật danh sách lời mời đã gửi
      // Lấy thông tin diễn giả đã chọn để thêm vào eventInvitations
      const invitedSpeaker = approvedSpeakers.find(s => s._id === selectedSpeakerId);
      if (invitedSpeaker) {
          const newInvitation: EventInvitation = {
              _id: response.data.invitation._id, // Lấy ID lời mời từ response backend
              eventId: eventId!, // Giả định eventId luôn có
              speakerId: {
                  _id: invitedSpeaker._id,
                  username: invitedSpeaker.username,
                  email: invitedSpeaker.email,
                  speakerBio: invitedSpeaker.speakerBio, // Bao gồm các trường được populate
              },
              organizerId: 'currentUserId', // Đây là placeholder, bạn có thể lấy từ localStorage user
              status: 'pending',
              invitationDate: new Date().toISOString(),
              message: invitationMessage,
          };
          setEventInvitations(prev => [...prev, newInvitation]);
      }

    } catch (err: any) {
      console.error('Lỗi khi mời diễn giả:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Không thể gửi lời mời diễn giả.');
    }
  };


  const filteredTickets = allTickets.filter(ticket =>
    (ticket.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ticket.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ticket.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingTickets = filteredTickets.filter(t => t.checkInStatus === 'pending');
  const checkedInTickets = filteredTickets.filter(t => t.checkInStatus === 'checkedIn');

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu sự kiện...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  // Render trang nếu không có lỗi và đã tải xong
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Quản lý sự kiện</h1>
        <h2 className="text-xl text-gray-700 mb-8">Sự kiện: {eventTitle}</h2>

        <Tabs defaultValue="checkin" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4"> {/* Mở rộng số cột cho tabs */}
            <TabsTrigger value="checkin">Check-in / Quét vé</TabsTrigger>
            <TabsTrigger value="pending">Chưa Check-in ({pendingTickets.length})</TabsTrigger>
            <TabsTrigger value="checkedIn">Đã Check-in ({checkedInTickets.length})</TabsTrigger>
            {isOrganizer && ( // Chỉ hiển thị tab này nếu là người tổ chức/admin
                <TabsTrigger value="manage-speakers">
                    Mời & Quản lý Diễn giả <MailPlus className="ml-2 h-4 w-4" />
                </TabsTrigger>
            )}
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleScanOrSearch();
                  }
                }}
              />
              <Button onClick={() => handleScanOrSearch()}>
                <Search className="h-4 w-4 mr-2" /> Tìm kiếm
              </Button>
              <Button variant="outline" onClick={() => setIsScanning(prev => !prev)}>
                <ScanLine className="h-4 w-4 mr-2" /> {isScanning ? 'Dừng quét' : 'Quét QR'}
              </Button>
            </div>

            {isScanning && (
              <div className="mb-4 flex flex-col items-center">
                <p className="text-gray-600 mb-2">Đặt mã QR vào giữa khung hình:</p>
                <div id="reader" style={{ width: '100%', maxWidth: '300px' }}></div>
                {!qrScannerRef.current && <p className="text-sm text-gray-500 mt-2">Đang khởi tạo camera...</p>}
              </div>
            )}

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
                <p><strong>Loại vé:</strong> {currentScanResult.isFreeTicket ? 'Miễn phí' : (currentScanResult.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán')}</p>
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
            <Input
              type="text"
              placeholder="Tìm kiếm vé chờ (tên, email, mã vé)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
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
            <Input
              type="text"
              placeholder="Tìm kiếm vé đã check-in (tên, email, mã vé)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
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

          {/* Tab Content: Mời & Quản lý Diễn giả */}
          {isOrganizer && (
            <TabsContent value="manage-speakers" className="p-4 bg-white rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Mời Diễn giả</h3>
                {approvedSpeakers.length === 0 ? (
                    <p className="text-gray-600 mb-4">Chưa có diễn giả nào được phê duyệt hoặc không thể tải danh sách diễn giả.</p>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-end gap-3">
                            <div className="flex-grow">
                                <label htmlFor="select-speaker" className="block text-sm font-medium text-gray-700 mb-1">
                                    Chọn diễn giả để mời:
                                </label>
                                <Select onValueChange={setSelectedSpeakerId} value={selectedSpeakerId}>
                                    <SelectTrigger id="select-speaker" className="w-full">
                                        <SelectValue placeholder="Chọn một diễn giả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {approvedSpeakers.map(speaker => (
                                            <SelectItem key={speaker._id} value={speaker._id}>
                                                {speaker.username} ({speaker.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleInviteSpeaker} disabled={!selectedSpeakerId}>
                                <MailPlus className="h-4 w-4 mr-2" /> Gửi lời mời
                            </Button>
                        </div>
                        <div className="w-full">
                            <label htmlFor="invitation-message" className="block text-sm font-medium text-gray-700 mb-1">
                                Lời nhắn (Tùy chọn):
                            </label>
                            <Textarea
                                id="invitation-message"
                                placeholder="Ghi lời nhắn của bạn cho diễn giả..."
                                value={invitationMessage}
                                onChange={(e) => setInvitationMessage(e.target.value)}
                                className="min-h-[80px]"
                            />
                        </div>
                    </div>
                )}

                <h3 className="text-xl font-semibold mt-8 mb-4">Lời mời đã gửi</h3>
                {eventInvitations.length === 0 ? (
                    <p className="text-gray-600">Chưa có lời mời nào được gửi cho sự kiện này.</p>
                ) : (
                    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Diễn giả</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Lời nhắn</TableHead>
                                    <TableHead>Ngày mời</TableHead>
                                    <TableHead className="text-center">Trạng thái</TableHead>
                                    {/* <TableHead className="text-center">Hành động</TableHead> // Tùy chọn: nút hủy lời mời */}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {eventInvitations.map(inv => (
                                    <TableRow key={inv._id}>
                                        <TableCell className="font-medium">{inv.speakerId.username}</TableCell>
                                        <TableCell>{inv.speakerId.email}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{inv.message || 'Không có'}</TableCell>
                                        <TableCell>{new Date(inv.invitationDate).toLocaleDateString('vi-VN')}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                className={`
                                                    ${inv.status === 'pending' && 'bg-yellow-500 text-yellow-50'}
                                                    ${inv.status === 'accepted' && 'bg-green-500 text-green-50'}
                                                    ${inv.status === 'declined' && 'bg-red-500 text-red-50'}
                                                `}
                                            >
                                                {inv.status === 'pending' ? 'Đang chờ' :
                                                 inv.status === 'accepted' ? 'Đã chấp nhận' : 'Đã từ chối'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </TabsContent>
          )}
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default EventAttendeesPage;
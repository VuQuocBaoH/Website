// D:/code/DACNTT2/WEBSITEBUILDING/Event_Organization/src/pages/EventAttendeesPage.tsx
import { useEffect, useState, useRef } from 'react';
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
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats, Html5QrcodeResult } from "html5-qrcode";

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
  } | null;
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
  const [isScanning, setIsScanning] = useState(false);

  const qrScannerRef = useRef<Html5QrcodeScanner | null>(null);

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
        console.log("DEBUG: Current User from localStorage:", user);
        console.log("DEBUG: Current User ID from localStorage:", user.id);

        const eventRes = await axios.get(`${API_BASE_URL}/events/${eventId}`, {
          headers: { 'x-auth-token': token },
        });
        const eventData = eventRes.data;
        setEventTitle(eventData.title);

        console.log("DEBUG: Event Data fetched:", eventData);
        console.log("DEBUG: Event Organizer ID:", eventData.organizerId);

        const isUserAdmin = user.role === 'admin';

        const isUserEventOrganizer = eventData.organizerId && user.id && (user.id.toString() === eventData.organizerId.toString());

        if (!isUserAdmin && !isUserEventOrganizer) {
          toast.error('Bạn không có quyền truy cập trang này.');
          navigate('/');
          return;
        }

        const ticketsRes = await axios.get(`${API_BASE_URL}/events/${eventId}/tickets`, {
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

  // Logic khởi tạo và dọn dẹp Html5QrcodeScanner
  useEffect(() => {
    const readerId = "reader"; // ID của div để render camera

    // Hàm callback khi quét thành công
    const onScanSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
      // console.log(`QR Code scanned: ${decodedText}`, decodedResult);
      setScannedTicketCode(decodedText); // Đưa kết quả quét vào ô input
      setIsScanning(false); // Tắt camera sau khi quét thành công

      // Ngừng quét sau khi có kết quả
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().then(() => {
          // console.log("QR scanning stopped.");
        }).catch(err => {
          console.warn("Failed to stop QR scanning:", err);
        });
        qrScannerRef.current = null; // Xóa tham chiếu
      }

      // Tự động tìm kiếm kết quả trong danh sách vé
      // Gọi handleScanOrSearch để xử lý chuỗi đã quét
      // Đảm bảo handleScanOrSearch được gọi sau khi setScannedTicketCode
      // Để đảm bảo state cập nhật trước khi handleScanOrSearch chạy, có thể dùng setTimeout nhỏ
      setTimeout(() => {
        handleScanOrSearch(decodedText); // Truyền trực tiếp decodedText
      }, 50);
    };

    // Hàm callback khi quét lỗi
    const onScanError = (errorMessage: string) => {
      // console.error(`QR Code scan error = ${errorMessage}`);
      // Chỉ setScanError cho các lỗi nghiêm trọng, bỏ qua lỗi "NotAllowedError" ban đầu
      // if (errorMessage !== "NotAllowedError" && !errorMessage.includes("Permission denied")) {
      //   setScanError('Lỗi khi quét QR: ' + errorMessage);
      // }
    };

    if (isScanning && !qrScannerRef.current) {
      // Khởi tạo scanner nếu đang quét và chưa có instance
      const scanner = new Html5QrcodeScanner(
        readerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          // enableTorch: true, // Nếu muốn bật đèn flash (có thể cần quyền)
        },
        /* verbose= */ false
      );
      scanner.render(onScanSuccess, onScanError);
      qrScannerRef.current = scanner; // Lưu tham chiếu

    } else if (!isScanning && qrScannerRef.current) {
      // Dọn dẹp scanner khi không quét nữa
      qrScannerRef.current.clear().then(() => {
        // console.log("QR scanning stopped via useEffect cleanup.");
      }).catch(err => {
        console.warn("Failed to stop QR scanning via useEffect cleanup:", err);
      });
      qrScannerRef.current = null;
    }

    // Hàm cleanup của useEffect: đảm bảo scanner được giải phóng khi component unmount
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().then(() => {
          // console.log("QR scanning stopped on component unmount.");
        }).catch(err => {
          console.warn("Failed to stop QR scanning on component unmount:", err);
        });
        qrScannerRef.current = null;
      }
    };
  }, [isScanning, allTickets]); // allTickets được thêm vào dependency để đảm bảo logic tìm vé hoạt động với dữ liệu mới nhất


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
      // Cập nhật trạng thái vé trong state mà không cần fetch lại toàn bộ
      setAllTickets(prev => prev.map(ticket =>
        ticket.ticketCode === ticketCode ? { ...ticket, checkInStatus: 'checkedIn', checkInTime: new Date().toISOString() } : ticket
      ));
      // Cập nhật kết quả quét hiện tại nếu có
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
      // Cập nhật trạng thái vé trong state mà không cần fetch lại toàn bộ
      setAllTickets(prev => prev.map(ticket =>
        ticket.ticketCode === ticketCode ? { ...ticket, checkInStatus: 'pending', checkInTime: undefined } : ticket
      ));
      // Cập nhật kết quả quét hiện tại nếu có
      setCurrentScanResult(prev => prev ? { ...prev, checkInStatus: 'pending', checkInTime: undefined } : null);
      setScanError(null);
    } catch (err: any) {
      console.error('Check-out error:', err.response?.data || err.message);
      toast.error(err.response?.data?.msg || 'Check-out thất bại.');
      setScanError(err.response?.data?.msg || 'Check-out thất bại.');
    }
  };

  // Hàm helper để trích xuất mã vé từ chuỗi QR
  const extractTicketCodeFromQRString = (qrString: string): string | null => {
    console.log("DEBUG: Input QR string to extract:", qrString);
    // Regex để tìm một UUID hợp lệ sau "Mã vé: "
    const ticketCodeMatch = qrString.match(/Mã vé: ([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
    if (ticketCodeMatch && ticketCodeMatch[1]) {
      console.log("DEBUG: Extracted Ticket Code:", ticketCodeMatch[1]);
      return ticketCodeMatch[1];
    }
    console.log("DEBUG: Failed to extract Ticket Code. Match result:", ticketCodeMatch);
    return null;
  };

  // Hàm xử lý khi quét QR hoặc nhập mã thủ công và nhấn nút tìm kiếm
  const handleScanOrSearch = async (scannedValue?: string) => { // Thêm tham số optional scannedValue
    setScanError(null);
    setCurrentScanResult(null);

    const inputValue = scannedValue || scannedTicketCode; // Ưu tiên giá trị từ quét nếu có

    if (!inputValue) {
      setScanError('Vui lòng nhập mã vé hoặc quét QR.');
      return;
    }

    console.log("DEBUG: Input value for search:", inputValue);

    const actualTicketCode = extractTicketCodeFromQRString(inputValue);

    if (!actualTicketCode) {
      setScanError('Định dạng mã QR không hợp lệ hoặc không tìm thấy mã vé.');
      return;
    }

    console.log("DEBUG: Actual Ticket Code for search:", actualTicketCode);

    const foundTicket = allTickets.find(t => t.ticketCode === actualTicketCode);

    if (foundTicket) {
      console.log("DEBUG: Ticket found:", foundTicket);
      setCurrentScanResult(foundTicket);
      setScanError(null);
      // Tự động check-in nếu vé đang chờ và event chưa kết thúc (cần kiểm tra event.status hoặc date)
      // Hiện tại, logic check-in/out vẫn cần được kích hoạt bằng button
    } else {
      console.log("DEBUG: Ticket NOT found. Searching for:", actualTicketCode, "in allTickets:", allTickets);
      setScanError('Không tìm thấy vé với mã này cho sự kiện hiện tại.');
    }
  };

  const filteredTickets = allTickets.filter(ticket =>
    (ticket.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ticket.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ticket.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingTickets = filteredTickets.filter(t => t.checkInStatus === 'pending');
  const checkedInTickets = filteredTickets.filter(t => t.checkInStatus === 'checkedIn');

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải danh sách người tham gia...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  // Render trang nếu không có lỗi và đã tải xong
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
                onKeyPress={(e) => { // Thêm onKeyPress để tìm kiếm khi nhấn Enter
                  if (e.key === 'Enter') {
                    handleScanOrSearch();
                  }
                }}
              />
              <Button onClick={() => handleScanOrSearch()}> {/* Gọi không tham số, dùng scannedTicketCode */}
                <Search className="h-4 w-4 mr-2" /> Tìm kiếm
              </Button>
              <Button variant="outline" onClick={() => setIsScanning(prev => !prev)}>
                <ScanLine className="h-4 w-4 mr-2" /> {isScanning ? 'Dừng quét' : 'Quét QR'}
              </Button>
            </div>

            {/* HIỂN THỊ CAMERA ĐỂ QUÉT QR */}
            {isScanning && (
              <div className="mb-4 flex flex-col items-center">
                <p className="text-gray-600 mb-2">Đặt mã QR vào giữa khung hình:</p>
                {/* DIV NÀY SẼ LÀ NƠI Html5QrcodeScanner render video feed */}
                <div id="reader" style={{ width: '100%', maxWidth: '300px' }}></div>
                {/* Loader nếu camera đang khởi tạo */}
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
                <p><strong>Loại vé:</strong> {currentScanResult.isFreeTicket ? 'Miễn phí' : (currentScanResult.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán')}</p> {/* NEW: Hiển thị loại vé */}
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
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default EventAttendeesPage;
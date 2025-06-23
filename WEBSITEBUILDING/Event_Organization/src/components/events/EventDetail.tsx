// src/components/events/EventDetail.tsx
import { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Share2,
  Heart,
  Ticket,
  ChevronRight,
  AlertCircle,
  User as UserIcon,
  Mail,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { isPast, parseISO } from 'date-fns'; // Import isPast và parseISO từ date-fns

const API_BASE_URL = 'http://localhost:5000/api';

// Định nghĩa kiểu cho một mục trong lịch trình
interface ScheduleItem {
  time: string;
  title: string;
  description?: string;
}

export interface EventDetailProps {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  date: string; // date là chuỗi ISO (từ backend), EventDetail sẽ tự định dạng và parse
  time: string;
  location: string;
  address: string;
  image: string;
  price: string; // Đã là chuỗi định dạng (ví dụ: "Miễn phí" hoặc "100.000 VND")
  isFree: boolean;
  category: string;
  organizer: {
    name: string;
    image?: string;
    description?: string;
  };
  organizerId: string;
  onRegister: (discountCode?: string) => void;
  isRegistered: boolean;
  registeredAttendeesCount?: number;
  capacity?: number;
  isOrganizer: boolean;
  schedule?: ScheduleItem[];
}

const EventDetail = ({
  id,
  title,
  description,
  longDescription,
  date, // date là chuỗi ISO (từ backend), EventDetail sẽ tự định dạng và parse
  time,
  location,
  address,
  image,
  price,
  isFree,
  category,
  organizer,
  organizerId,
  onRegister,
  isRegistered,
  registeredAttendeesCount = 0,
  capacity,
  isOrganizer,
  schedule = [],
}: EventDetailProps) => {
  const [liked, setLiked] = useState(false);
  const [attendeesDetails, setAttendeesDetails] = useState<any[]>([]);
  const [fetchingAttendees, setFetchingAttendees] = useState(false);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');

  const organizerDisplayImage = organizer.image && organizer.image !== "" ? organizer.image : null;

  // Tính toán trạng thái sự kiện đã kết thúc hay chưa
  // Sử dụng parseISO để chuyển đổi chuỗi ngày ISO từ props thành đối tượng Date
  const eventDate = parseISO(date); 
  // isPast sẽ trả về true nếu eventDate đã qua thời điểm hiện tại
  const isEventOver = isPast(eventDate); 

  useEffect(() => {
    const fetchAttendees = async () => {
      if (isOrganizer) {
        setFetchingAttendees(true);
        setAttendeesError(null);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setAttendeesError('Yêu cầu xác thực để xem danh sách người tham dự.'); 
            return;
          }
          // Gọi API để lấy danh sách vé của sự kiện, có populate thông tin user
          const response = await axios.get(`${API_BASE_URL}/events/${id}/tickets`, {
            headers: { 'x-auth-token': token },
          });
          // response.data sẽ là mảng các ticket object, mỗi ticket có thuộc tính user (đã populate)
          setAttendeesDetails(response.data.map((ticket: any) => ({
            id: ticket.user?._id || ticket.userId, // ID của người dùng (dùng _id nếu có)
            username: ticket.user?.username || 'Người dùng ẩn danh',
            email: ticket.user?.email || 'N/A',
            ticketCode: ticket.ticketCode, // Để có thể hiển thị mã vé trong danh sách này
            isPaid: ticket.isPaid,
            isFreeTicket: ticket.isFreeTicket,
            checkInStatus: ticket.checkInStatus,
            checkInTime: ticket.checkInTime,
          })));
        } catch (err: any) {
          console.error('Lỗi khi lấy thông tin người tham dự:', err); 
          setAttendeesError(err.response?.data?.msg || 'Không thể tải danh sách người tham dự.'); 
        } finally {
          setFetchingAttendees(false);
        }
      } else { 
        setAttendeesDetails([]);
        setAttendeesError(null);
      }
    };

    // Gọi lại khi isOrganizer thay đổi hoặc ID sự kiện thay đổi
    // Cần thêm `date` vào dependency nếu muốn `isEventOver` được re-evaluate khi `date` prop thay đổi
    fetchAttendees();
  }, [id, isOrganizer, date]); // Thêm 'date' vào dependency array để cập nhật trạng thái sự kiện kết thúc

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="lg:w-2/3">
          {/* Header */}
          <div className="mb-8">
            {/* Hiển thị badge "Đã kết thúc" nếu sự kiện đã qua ngày */}
            {isEventOver ? (
                <Badge className="mb-4 bg-gray-500">Đã kết thúc</Badge>
            ) : (
                <Badge className="mb-4 bg-event-purple">{category}</Badge>
            )}
            
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
            <div className="flex flex-wrap items-center text-gray-700 mb-6 gap-x-6 gap-y-2">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-event-purple" />
                {/* Format ngày để hiển thị thân thiện với người dùng */}
                <span>{new Date(date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</span> 
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-event-purple" />
                <span>{time}</span>
              </div>
            </div>
            <div className="flex items-center text-gray-700 mb-6">
              <MapPin className="h-5 w-5 mr-2 text-event-purple" />
              <span>{location} • {address}</span>
            </div>
            {organizer && (
              <div className="flex items-center space-x-2">
                {organizerDisplayImage ? (
                  <img
                    src={organizerDisplayImage}
                    alt={organizer.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Tổ chức bởi</p>
                  <p className="font-medium">{organizer.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Event image */}
          <div className="mb-8">
            <img
              src={image}
              alt={title}
              className="w-full h-auto max-h-[500px] object-cover rounded-lg border"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="about">
            <TabsList className={`grid w-full mb-8 ${isOrganizer ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <TabsTrigger value="about">Thông tin</TabsTrigger>
              <TabsTrigger value="schedule">Các mốc sự kiện</TabsTrigger>
              <TabsTrigger value="organizer">Ban tổ chức</TabsTrigger>
              {isOrganizer && (
                <TabsTrigger value="attendees">Người đăng kí({registeredAttendeesCount})</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="about" className="space-y-6">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4">Mô tả sự kiện</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{longDescription || description}</p>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <h3 className="text-xl font-semibold mb-4">Thời gian các hoạt động</h3>
              {schedule && schedule.length > 0 ? (
                <div className="border-l-2 border-event-purple pl-6 space-y-8">
                  {schedule.map((item, index) => (
                    <div key={index} className="relative">
                      <div className="absolute top-1 left-[-1.8rem] w-4 h-4 rounded-full bg-event-purple border-4 border-white"></div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">{item.time}</p>
                        <h4 className="font-semibold text-lg">{item.title}</h4>
                        {item.description && (
                          <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Tạm thời chưa có mốc thời gian cho sự kiện</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="organizer">
              <div className="space-y-4">
                {organizer && (
                  <>
                    <div className="flex items-center space-x-3 mb-4">
                      {organizerDisplayImage ? (
                        <img
                          src={organizerDisplayImage}
                          alt={organizer.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-10 w-10 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">{organizer.name}</h3>
                        <p className="text-sm text-gray-500">Người tổ chức</p>
                      </div>
                    </div>
                    <p className="text-gray-700">{organizer.description || `Tìm hiểu về ${organizer.name}, người tổ chức sự kiện này.`}</p> 
                    <Link to={`/organizers/${organizerId}`}>
                        <Button variant="outline" className="mt-4">
                            Xem hồ sơ
                            <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                  </>
                )}
              </div>
            </TabsContent>

            {isOrganizer && (
              <TabsContent value="attendees">
                <h3 className="text-xl font-semibold mb-4">Người đăng kí</h3>
                {fetchingAttendees ? (
                  <p>Đang tải...</p>
                ) : attendeesError ? (
                  <p className="text-red-500">{attendeesError}</p>
                ) : attendeesDetails.length > 0 ? (
                  <ul className="space-y-3">
                    {attendeesDetails.map((attendee) => (
                      <li key={attendee.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{attendee.username}</p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {attendee.email}
                          </p>
                          {/* Hiển thị mã vé và trạng thái check-in */}
                          {attendee.ticketCode && <p className="text-xs text-gray-500">Mã vé: {attendee.ticketCode}</p>}
                          {attendee.checkInStatus && <p className={`text-xs font-semibold ${
                              attendee.checkInStatus === 'checkedIn' ? 'text-green-600' :
                              attendee.checkInStatus === 'pending' ? 'text-yellow-600' :
                              'text-red-600'
                          }`}>
                              Trạng thái: {attendee.checkInStatus === 'checkedIn' ? 'Đã Check-in' :
                                           attendee.checkInStatus === 'pending' ? 'Chờ Check-in' :
                                           'Vắng mặt'}
                          </p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">Chưa có người đăng kí.</p>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:w-1/3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <div className="mb-6 pb-6 border-b border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-sm text-gray-500">Giá tiền</p>
                  <p className="text-xl font-semibold">
                    {price === 'Free' ? 'Miễn phí' : price} 
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`p-2 rounded-full border ${liked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-400'} hover:bg-gray-100 transition-colors`}
                  >
                    <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                  </button>
                  <button className="p-2 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {!isOrganizer ? (
                <>
                  {/* Mã giảm giá chỉ hiển thị cho sự kiện CÓ PHÍ, dùng isFree prop */}
                  {!isFree && (
                    <div className="mb-4">
                      <label htmlFor="discountCode" className="block text-sm font-medium text-gray-700 mb-2">
                        Mã giảm giá
                      </label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="discountCode"
                          type="text"
                          placeholder="Nhập mã giảm giá (tùy chọn)"
                          className="pl-10"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value)}
                          disabled={isEventOver} 
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-event-purple hover:bg-event-dark-purple"
                    onClick={() => onRegister(discountCode)}
                    disabled={isRegistered || isEventOver} 
                  >
                    <Ticket className="mr-2 h-5 w-5" />
                    {isEventOver ? ( 
                        'Sự kiện đã kết thúc'
                    ) : (
                        isRegistered
                        ? 'Đã đăng ký'
                        : (isFree ? 'Đăng ký miễn phí' : 'Mua vé')
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center p-4 bg-gray-100 rounded-md">
                  <p className="text-sm font-medium text-gray-700">Bạn là người tổ chức sự kiện này.</p>
                  {isEventOver && (
                      <p className="text-sm text-gray-500 mt-1">Sự kiện này đã kết thúc.</p>
                  )}
                </div>
              )}

            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Thông tin sự kiện</h3>
              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Số lượng đăng kí</p>
                  <p className="text-sm text-gray-600">
                    {registeredAttendeesCount} người đã đăng ký {capacity ? ` / ${capacity} người` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Thời gian</p>
                  {/* Format ngày để hiển thị thân thiện với người dùng */}
                  <p className="text-sm text-gray-600">{new Date(date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}</p> 
                  <p className="text-sm text-gray-600">{time}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Địa điểm</p>
                  <p className="text-sm text-gray-600">{location}</p>
                  <p className="text-sm text-gray-600">{address}</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Chính sách hoàn trả</p>
                  <p className="text-sm text-amber-700">
                    Hoàn trả trong vòng 7 ngày trước khi diễn ra sự kiện.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
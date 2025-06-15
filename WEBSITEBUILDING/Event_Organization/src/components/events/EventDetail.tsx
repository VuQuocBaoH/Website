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
  User as UserIcon, // Đổi tên User thành UserIcon
  Mail, // Import Mail icon
  Tag // Import Tag icon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input'; // Import Input component
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export interface EventDetailProps {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  date: string;
  time: string;
  location: string;
  address: string;
  image: string;
  price: string;
  category: string;
  organizer: {
    name: string;
    image?: string;
    description?: string;
  };
  organizerId: string; // Đảm bảo organizerId có ở đây
  onRegister: (discountCode?: string) => void; // Hàm đăng ký nhận discountCode
  isRegistered: boolean; // Trạng thái đã đăng ký
  registeredAttendeesCount?: number; // Số lượng người đã đăng ký
  registeredAttendees: string[]; // Mảng ID người đăng ký
  capacity?: number; // Sức chứa
  isOrganizer: boolean; // Trạng thái organizer/admin
}

const EventDetail = ({
  id,
  title,
  description,
  longDescription,
  date,
  time,
  location,
  address,
  image,
  price,
  category,
  organizer,
  organizerId,
  onRegister,
  isRegistered,
  registeredAttendeesCount = 0,
  registeredAttendees,
  capacity,
  isOrganizer,
}: EventDetailProps) => {
  const [liked, setLiked] = useState(false);
  const [attendeesDetails, setAttendeesDetails] = useState<any[]>([]); // State cho chi tiết người tham gia
  const [fetchingAttendees, setFetchingAttendees] = useState(false); // Trạng thái fetch attendees
  const [attendeesError, setAttendeesError] = useState<string | null>(null); // Lỗi fetch attendees
  const [discountCode, setDiscountCode] = useState(''); // State cho mã giảm giá

  const organizerDisplayImage = organizer.image && organizer.image !== "" ? organizer.image : null;

  useEffect(() => {
    const fetchAttendees = async () => {
      // Chỉ fetch nếu là organizer VÀ có ít nhất 1 người đăng ký
      if (isOrganizer && registeredAttendees.length > 0) {
        setFetchingAttendees(true);
        setAttendeesError(null);
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setAttendeesError('Authentication required to view attendee list.');
            return;
          }
          const idsString = registeredAttendees.join(','); // Chuyển mảng IDs thành chuỗi
          const response = await axios.get(`${API_BASE_URL}/users/details?ids=${idsString}`, {
            headers: {
              'x-auth-token': token,
            },
          });
          setAttendeesDetails(response.data);
        } catch (err: any) {
          console.error('Error fetching attendees details:', err);
          setAttendeesError(err.response?.data?.msg || 'Failed to load attendee list.');
        } finally {
          setFetchingAttendees(false);
        }
      } else if (isOrganizer && registeredAttendees.length === 0) {
        // Nếu là organizer nhưng không có người đăng ký, xóa danh sách và lỗi
        setAttendeesDetails([]);
        setAttendeesError(null);
      }
    };

    fetchAttendees(); // Gọi hàm fetch
  }, [registeredAttendees, isOrganizer]); // Dependencies: fetch lại khi mảng IDs hoặc quyền organizer thay đổi


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="lg:w-2/3">
          {/* Header */}
          <div className="mb-8">
            <Badge className="mb-4 bg-event-purple">{category}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
            <div className="flex items-center text-gray-700 mb-6">
              <div className="flex items-center mr-6">
                <Calendar className="h-5 w-5 mr-2 text-event-purple" />
                <span>{date}</span>
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
            <div className="flex items-center space-x-2">
              {organizerDisplayImage ? (
                <img
                  src={organizerDisplayImage}
                  alt={organizer.name}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-gray-500" />
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Organized by</p>
                <p className="font-medium">{organizer.name}</p>
              </div>
            </div>
          </div>

          {/* Event image */}
          <div className="mb-8">
            <img
              src={image}
              alt={title}
              className="w-full h-[400px] object-cover rounded-lg"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="about">
            <TabsList className="grid grid-cols-3 mb-8"> {/* THAY ĐỔI CỘT TÙY VÀO SỐ LƯỢNG TAB */}
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="organizer">Organizer</TabsTrigger>
              {isOrganizer && ( // Chỉ hiển thị tab Attendees nếu người dùng là organizer
                <TabsTrigger value="attendees">Attendees ({registeredAttendeesCount})</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="about" className="space-y-6">
              <div className="prose max-w-none">
                <h3 className="text-xl font-semibold mb-4">About this event</h3>
                <p className="text-gray-700">{longDescription}</p>
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <h3 className="text-xl font-semibold mb-4">Event Schedule</h3>

              <div className="border-l-2 border-event-purple pl-4 space-y-6">
                <div className="relative">
                  <div className="absolute top-0 left-[-1.625rem] w-4 h-4 rounded-full bg-event-purple"></div>
                  <div>
                    <p className="text-sm text-gray-500">9:00 AM - 10:00 AM</p>
                    <h4 className="font-medium">Registration & Welcome</h4>
                    <p className="text-gray-600 text-sm">Check-in and welcome refreshments</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute top-0 left-[-1.625rem] w-4 h-4 rounded-full bg-event-purple"></div>
                  <div>
                    <p className="text-sm text-gray-500">10:00 AM - 12:00 PM</p>
                    <h4 className="font-medium">Main Event</h4>
                    <p className="text-gray-600 text-sm">Featured presentations and activities</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute top-0 left-[-1.625rem] w-4 h-4 rounded-full bg-event-purple"></div>
                  <div>
                    <p className="text-sm text-gray-500">12:00 PM - 1:30 PM</p>
                    <h4 className="font-medium">Lunch Break</h4>
                    <p className="text-gray-600 text-sm">Catered lunch and networking</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute top-0 left-[-1.625rem] w-4 h-4 rounded-full bg-event-purple"></div>
                  <div>
                    <p className="text-sm text-gray-500">1:30 PM - 4:00 PM</p>
                    <h4 className="font-medium">Workshops</h4>
                    <p className="text-gray-600 text-sm">Interactive sessions and breakout groups</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute top-0 left-[-1.625rem] w-4 h-4 rounded-full bg-event-purple"></div>
                  <div>
                    <p className="text-sm text-gray-500">4:00 PM - 5:00 PM</p>
                    <h4 className="font-medium">Closing Remarks</h4>
                    <p className="text-gray-600 text-sm">Summary and next steps</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="organizer">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  {organizerDisplayImage ? (
                    <img
                      src={organizerDisplayImage}
                      alt={organizer.name}
                      className="h-16 w-16 rounded-full"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserIcon className="h-10 w-10 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{organizer.name}</h3>
                    <p className="text-sm text-gray-500">Event Organizer</p>
                  </div>
                </div>
                <p className="text-gray-700">{organizer.description || `Meet ${organizer.name}, the organizer of this event.`}</p>
                <Button variant="outline" className="mt-4">
                  View Profile
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            {isOrganizer && (
              <TabsContent value="attendees">
                <h3 className="text-xl font-semibold mb-4">Registered Attendees</h3>
                {fetchingAttendees ? (
                  <p>Loading attendees...</p>
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
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">No attendees registered yet.</p>
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
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-xl font-semibold">
                    {price === 'Free' ? 'Free' : price}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`p-2 rounded-full border ${liked ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-gray-400'} hover:bg-gray-100`}
                  >
                    <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
                  </button>
                  <button className="p-2 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100">
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {/* Discount Code Input */}
              {price !== 'Free' && (
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
                    />
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-event-purple hover:bg-event-dark-purple"
                onClick={() => onRegister(discountCode)}
                disabled={isRegistered}
              >
                <Ticket className="mr-2 h-5 w-5" />
                {isRegistered ? 'Đã đăng ký' : 'Đăng ký vé'}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Event Information</h3>

              <div className="flex items-start space-x-3">
                <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Attendees</p>
                  <p className="text-sm text-gray-600">
                    {registeredAttendeesCount} đã đăng ký {capacity ? ` / ${capacity} chỗ` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Date and Time</p>
                  <p className="text-sm text-gray-600">{date}</p>
                  <p className="text-sm text-gray-600">{time}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-gray-600">{location}</p>
                  <p className="text-sm text-gray-600">{address}</p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Refund Policy</p>
                  <p className="text-sm text-amber-700">
                    Refunds available up to 7 days before the event.
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
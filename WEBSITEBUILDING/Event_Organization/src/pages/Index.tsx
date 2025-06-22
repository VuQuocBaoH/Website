import { useEffect, useState } from 'react';
import Hero from '@/components/home/Hero';
import CategorySection from '@/components/home/CategorySection';
import EventCard, { EventCardProps } from '@/components/home/EventCard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios'; // Import axios

const API_BASE_URL = 'http://localhost:5000/api'; // <-- Định nghĩa URL backend

const Index = () => {
  const [featuredEvents, setFeaturedEvents] = useState<EventCardProps[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch featured events
        const featuredRes = await axios.get(`${API_BASE_URL}/events/featured`);
        setFeaturedEvents(featuredRes.data.map((event: any) => ({
            id: event._id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }), // Việt hóa định dạng ngày
            time: event.time,
            location: event.location,
            image: event.image,
            price: event.price,
            category: event.category,
            organizer: event.organizer.name
        })));

        // Fetch upcoming events
        const upcomingRes = await axios.get(`${API_BASE_URL}/events/upcoming`);
        setUpcomingEvents(upcomingRes.data.map((event: any) => ({
            id: event._id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }), // Việt hóa định dạng ngày
            time: event.time,
            location: event.location,
            image: event.image,
            price: event.price,
            category: event.category,
            organizer: event.organizer.name
        })));
      } catch (err) {
        console.error('Lỗi khi lấy sự kiện:', err); // Việt hóa
        setError('Không thể tải sự kiện.'); // Việt hóa
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []); // [] đảm bảo chỉ chạy một lần khi component mount

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải sự kiện...</div>; {/* Việt hóa */}
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Hero component với thanh tìm kiếm */}
        <Hero />

        {/* Featured Events Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Sự kiện nổi bật</h2> {/* Việt hóa */}
              <Button variant="outline" className="flex items-center">
                <Link to="/events">Xem tất cả</Link> <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredEvents.length > 0 ? featuredEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              )) : <p>Không tìm thấy sự kiện nổi bật nào. Hãy thử tạo một số và đặt chúng làm nổi bật ở backend.</p>} {/* Việt hóa */}
            </div>
          </div>
        </section>

        {/* Category Section */}
        <CategorySection />

        {/* Upcoming Events Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Sự kiện sắp tới</h2>
              <Button variant="outline" className="flex items-center">
              <Link to="/events">Xem tất cả</Link> <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
                <EventCard key={event.id} {...event} />
              )) : <p>Không tìm thấy sự kiện sắp tới nào. Hãy thử tạo một số với ngày trong tương lai và đặt chúng làm sắp tới ở backend.</p>} {/* Việt hóa */}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tạo sự kiện dành riêng cho bạn?</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Tạo và quản lý sự kiện của bạn ngay trong hôm nay.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button className="bg-event-purple hover:bg-event-cyan text-lg button-hover" size="lg">
                <Link to="/create">Tạo sự kiện</Link>
              </Button>
              <Button variant="outline" className="text-lg" size="lg">
                Xem thêm
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
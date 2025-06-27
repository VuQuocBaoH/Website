import { useEffect, useState, useRef } from 'react';
import Hero from '@/components/home/Hero';
import CategorySection from '@/components/home/CategorySection';
import EventCard, { EventCardProps } from '@/components/home/EventCard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Đảm bảo biến môi trường được định nghĩa và truy cập đúng cách
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Hàm kiểm tra và render phần sự kiện (để tránh lặp code)
interface EventSectionProps {
  title: string;
  events: EventCardProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  emptyMessage: string;
}

const EventScrollSection: React.FC<EventSectionProps> = ({
  title,
  events,
  scrollRef,
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
  emptyMessage,
}) => (
  <section className="py-12">
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <Button variant="outline" className="flex items-center" asChild>
          <Link to="/events">Xem tất cả <ChevronRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={onScrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md z-10 opacity-80 hover:opacity-100 transition-opacity hidden md:block"
            aria-label={`Cuộn ${title} sang trái`}
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory"
        >
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="min-w-[280px] sm:min-w-[320px] lg:min-w-[300px] xl:min-w-[300px] max-w-[300px] snap-center">
                <EventCard {...event} />
              </div>
            ))
          ) : (
            <p className="text-gray-600 w-full text-center py-8">{emptyMessage}</p>
          )}
        </div>

        {canScrollRight && (
          <button
            onClick={onScrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md z-10 opacity-80 hover:opacity-100 transition-opacity hidden md:block"
            aria-label={`Cuộn ${title} sang phải`}
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>
        )}
      </div>
    </div>
  </section>
);


const Index = () => {
  const [featuredEvents, setFeaturedEvents] = useState<EventCardProps[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const featuredScrollRef = useRef<HTMLDivElement>(null);
  const upcomingScrollRef = useRef<HTMLDivElement>(null);

  const [canScrollFeaturedLeft, setCanScrollFeaturedLeft] = useState(false);
  const [canScrollFeaturedRight, setCanScrollFeaturedRight] = useState(false);
  const [canScrollUpcomingLeft, setCanScrollUpcomingLeft] = useState(false);
  const [canScrollUpcomingRight, setCanScrollUpcomingRight] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const featuredRes = await axios.get(`${API_BASE_URL}/events/featured`);
        setFeaturedEvents(featuredRes.data.map((event: any) => ({
            id: event._id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: event.time,
            location: event.location,
            image: event.image,
            price: event.price,
            category: event.category,
            organizer: event.organizer.name
        })));

        const upcomingRes = await axios.get(`${API_BASE_URL}/events/upcoming`);
        setUpcomingEvents(upcomingRes.data.map((event: any) => ({
            id: event._id,
            title: event.title,
            date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
            time: event.time,
            location: event.location,
            image: event.image,
            price: event.price,
            category: event.category,
            organizer: event.organizer.name
        })));
      } catch (err: any) { // Cải thiện kiểu lỗi
        console.error('Lỗi khi lấy sự kiện:', err);
        // Kiểm tra lỗi mạng/kết nối
        if (axios.isAxiosError(err) && !err.response) {
          setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại backend.');
        } else {
          setError('Không thể tải sự kiện. Vui lòng thử lại sau.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const checkScrollability = (ref: React.RefObject<HTMLDivElement>, setCanLeft: Function, setCanRight: Function) => {
    if (ref.current) {
      const { scrollWidth, clientWidth, scrollLeft } = ref.current;
      setCanLeft(scrollLeft > 0);
      setCanRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollHorizontally = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8; // Cuộn 80% chiều rộng hiển thị
      if (direction === 'left') {
        ref.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    const handleScrollAndResize = () => {
      checkScrollability(featuredScrollRef, setCanScrollFeaturedLeft, setCanScrollFeaturedRight);
      checkScrollability(upcomingScrollRef, setCanScrollUpcomingLeft, setCanScrollUpcomingRight);
    };

    // Đặt một timeout nhỏ để đảm bảo các thẻ đã render xong trước khi tính toán scrollWidth
    // và gọi lần đầu tiên
    const timer = setTimeout(() => {
      handleScrollAndResize();
    }, 100);


    const featuredEl = featuredScrollRef.current;
    const upcomingEl = upcomingScrollRef.current;

    // Thêm event listeners
    if (featuredEl) featuredEl.addEventListener('scroll', handleScrollAndResize);
    if (upcomingEl) upcomingEl.addEventListener('scroll', handleScrollAndResize);
    window.addEventListener('resize', handleScrollAndResize);

    // Clean up
    return () => {
      clearTimeout(timer);
      if (featuredEl) featuredEl.removeEventListener('scroll', handleScrollAndResize);
      if (upcomingEl) upcomingEl.removeEventListener('scroll', handleScrollAndResize);
      window.removeEventListener('resize', handleScrollAndResize);
    };
  }, [featuredEvents, upcomingEvents, loading]); // Thêm 'loading' vào dependency array

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-700 text-lg">Đang tải sự kiện...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 text-lg">{error}</div>;


  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <Hero />

        {/* Featured Events Section - Sử dụng component tái sử dụng */}
        <EventScrollSection
          title="Sự kiện nổi bật"
          events={featuredEvents}
          scrollRef={featuredScrollRef}
          canScrollLeft={canScrollFeaturedLeft}
          canScrollRight={canScrollFeaturedRight}
          onScrollLeft={() => scrollHorizontally(featuredScrollRef, 'left')}
          onScrollRight={() => scrollHorizontally(featuredScrollRef, 'right')}
          emptyMessage="Không tìm thấy sự kiện nổi bật nào. Hãy thử tạo một số và đặt chúng làm nổi bật ở backend."
        />

        <CategorySection />

        {/* Upcoming Events Section - Sử dụng component tái sử dụng */}
        <EventScrollSection
          title="Sự kiện sắp tới"
          events={upcomingEvents}
          scrollRef={upcomingScrollRef}
          canScrollLeft={canScrollUpcomingLeft}
          canScrollRight={canScrollUpcomingRight}
          onScrollLeft={() => scrollHorizontally(upcomingScrollRef, 'left')}
          onScrollRight={() => scrollHorizontally(upcomingScrollRef, 'right')}
          emptyMessage="Không tìm thấy sự kiện sắp tới nào. Hãy thử tạo một số với ngày trong tương lai và đặt chúng làm sắp tới ở backend."
        />

        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tạo sự kiện dành riêng cho bạn?</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Tạo và quản lý sự kiện của bạn ngay trong hôm nay.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button className="bg-event-purple hover:bg-event-cyan text-lg button-hover" size="lg" asChild>
                <Link to="/create">Tạo sự kiện</Link>
              </Button>
              <Button variant="outline" className="text-lg" size="lg" asChild>
                 <Link to="/events">Xem thêm</Link>
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
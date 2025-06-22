import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import EventCard, { EventCardProps } from '@/components/home/EventCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
Search,
Filter,
ChevronDown,
X
} from 'lucide-react';
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

const Events = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [allEvents, setAllEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'Âm nhạc', 'Kinh doanh', 'Ẩm thực & Đồ uống', 'Sức khỏe', 'Hài kịch', // Việt hóa
    'Thể thao', 'Giáo dục', 'Nghệ thuật', 'Trò chơi', 'Thời trang', 'Khác' // Việt hóa
  ];

  const dateOptions = [
    'Hôm nay', 'Ngày mai', 'Cuối tuần này', 'Tuần này', 'Tháng này', 'Tháng sau', 'Tất cả sắp tới' // Việt hóa
  ];

  const fetchEvents = useCallback(async (
    currentSearchTerm: string,
    currentSelectedCategory: string | null,
    currentSelectedDate: string | null
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (currentSearchTerm) params.search = currentSearchTerm;
      if (currentSelectedCategory) params.category = currentSelectedCategory;
      if (currentSelectedDate) params.dateFilter = currentSelectedDate;

      const response = await axios.get(`${API_BASE_URL}/events`, { params });
      setAllEvents(response.data.map((event: any) => ({
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
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchFromUrl = queryParams.get('search') || '';
    const categoryFromUrl = queryParams.get('category') || null;
    const dateFromUrl = queryParams.get('dateFilter') || null;

    let needsStateUpdate = false;
    if (searchFromUrl !== searchTerm) {
      setSearchTerm(searchFromUrl);
      needsStateUpdate = true;
    }
    if (categoryFromUrl !== selectedCategory) {
      setSelectedCategory(categoryFromUrl);
      needsStateUpdate = true;
    }
    if (dateFromUrl !== selectedDate) {
        setSelectedDate(dateFromUrl);
        needsStateUpdate = true;
    }

    const newQueryParams = new URLSearchParams();
    if (searchTerm || searchFromUrl) newQueryParams.set('search', searchTerm || searchFromUrl);
    if (selectedCategory || categoryFromUrl) newQueryParams.set('category', selectedCategory || categoryFromUrl);
    if (selectedDate || dateFromUrl) newQueryParams.set('dateFilter', selectedDate || dateFromUrl);

    const newUrlSearch = newQueryParams.toString();
    const currentUrlSearch = location.search.substring(1);

    if (newUrlSearch !== currentUrlSearch) {
      navigate({ search: newQueryParams.toString() }, { replace: true });
    }

    fetchEvents(
      searchFromUrl,
      categoryFromUrl,
      dateFromUrl
    );

  }, [location.search, fetchEvents, navigate]);


  const handleApplyFilters = () => {
    fetchEvents(searchTerm, selectedCategory, selectedDate);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setPriceRange([0, 500]);
    setSelectedDate(null);
  };

  const filteredEvents = allEvents;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow bg-gray-50">
        {/* Header section */}
        <section className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Khám phá sự kiện</h1> {/* Việt hóa */}

            {/* Search and filter bar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm sự kiện" // Việt hóa
                  className="pl-10 pr-4"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Select onValueChange={(val) => setSelectedDate(val)} value={selectedDate || ""}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Thời gian" /> {/* Việt hóa */}
                  </SelectTrigger>
                  <SelectContent>
                    {dateOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Bộ lọc {/* Việt hóa */}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg animate-fade-in">
                <div className="flex justify-between mb-4">
                  <h3 className="font-medium">Bộ lọc nâng cao</h3> {/* Việt hóa */}
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 h-auto py-1">
                    <X className="mr-1 h-3 w-3" />
                    Xóa bộ lọc {/* Việt hóa */}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Categories */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Danh mục</h4> {/* Việt hóa */}
                    <div className="grid grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category}`}
                            checked={selectedCategory === category}
                            onCheckedChange={() =>
                              setSelectedCategory(selectedCategory === category ? null : category)
                            }
                          />
                          <label htmlFor={`category-${category}`} className="text-sm">
                            {category}
                        </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h4 className="text-sm font-medium mb-2">Khoảng giá</h4> {/* Việt hóa */}
                <div className="px-2">
                  <Slider
                    defaultValue={priceRange}
                    max={500}
                    step={10}
                    minStepsBetweenThumbs={1}
                    onValueChange={setPriceRange}
                    className="my-6"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <div>${priceRange[0]}</div>
                    <div>${priceRange[1]}+</div>
                  </div>
                </div>
              </div>

              {/* More filters */}
              <div>
                <h4 className="text-sm font-medium mb-2">Tùy chọn khác</h4> {/* Việt hóa */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="free-events" />
                    <label htmlFor="free-events" className="text-sm">Chỉ sự kiện miễn phí</label> {/* Việt hóa */}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="online-events" />
                    <label htmlFor="online-events" className="text-sm">Sự kiện trực tuyến</label> {/* Việt hóa */}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="accessible-events" />
                    <label htmlFor="accessible-events" className="text-sm">Địa điểm dễ tiếp cận</label> {/* Việt hóa */}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="bg-event-purple hover:bg-event-dark-purple" onClick={handleApplyFilters}>
                Áp dụng bộ lọc {/* Việt hóa */}
              </Button>
            </div>
          </div>
        )}

        {/* Applied filters */}
        {(searchTerm || selectedCategory || selectedDate) && (
          <div className="flex flex-wrap gap-2 mt-4">
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                Tìm kiếm: {searchTerm} {/* Việt hóa */}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setSearchTerm('')}
                />
              </Badge>
            )}

            {selectedCategory && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                Danh mục: {selectedCategory} {/* Việt hóa */}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                />
              </Badge>
            )}

            {selectedDate && (
              <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                Ngày: {selectedDate} {/* Việt hóa */}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => setSelectedDate(null)}
                />
              </Badge>
            )}

            {(searchTerm || selectedCategory || selectedDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-auto py-1 px-2 text-xs"
              >
                Xóa tất cả {/* Việt hóa */}
              </Button>
            )}
          </div>
        )}
      </div>
    </section>

        {/* Events grid */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {loading ? 'Đang tải...' : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'Sự kiện' : 'Sự kiện'} được tìm thấy`} {/* Việt hóa */}
              </h2>
              <Select defaultValue="recommended">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sắp xếp theo" /> {/* Việt hóa */}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Đề xuất</SelectItem> {/* Việt hóa */}
                  <SelectItem value="date-asc">Ngày: Sớm nhất</SelectItem> {/* Việt hóa */}
                  <SelectItem value="date-desc">Ngày: Muộn nhất</SelectItem> {/* Việt hóa */}
                  <SelectItem value="price-asc">Giá: Thấp đến cao</SelectItem> {/* Việt hóa */}
                  <SelectItem value="price-desc">Giá: Cao đến thấp</SelectItem> {/* Việt hóa */}
                </SelectContent>
              </Select>
            </div>

            {error && <div className="text-red-500 text-center">{error}</div>}

            {!loading && filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} {...event} />
                ))}
              </div>
            ) : !loading && (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">Không tìm thấy sự kiện nào</h3> {/* Việt hóa */}
                <p className="text-gray-500 mb-6">Hãy thử điều chỉnh tìm kiếm hoặc bộ lọc để tìm thứ bạn đang tìm kiếm.</p> {/* Việt hóa */}
                <Button onClick={clearFilters}>Xóa tất cả bộ lọc</Button> {/* Việt hóa */}
              </div>
            )}

            {!loading && filteredEvents.length > 0 && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" size="lg">Tải thêm sự kiện</Button> {/* Việt hóa */}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Events;
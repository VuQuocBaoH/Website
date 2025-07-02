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
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

import { eventCategories } from "@/lib/eventCategories";

const API_BASE_URL = import.meta.env.VITE_API_URL;

interface CategoryOption {
  name: string; 
  value: string; 
}

const Events = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localSelectedCategory, setLocalSelectedCategory] = useState<string | null>(null);
  const [localSelectedDate, setLocalSelectedDate] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const [allEvents, setAllEvents] = useState<EventCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateOptions = [
    'Hôm nay', 'Ngày mai', 'Cuối tuần này', 'Tuần này', 'Tháng này', 'Tháng sau', 'Tất cả sắp tới'
  ];

  const getCategoryNameByValue = (value: string | null): string | null => {
    if (!value) return null;
    const found = eventCategories.find(cat => cat.value === value);
    return found ? found.name : null;
  };

  const mapDateOptionToBackendValue = (option: string | null): string | null => {
    if (!option) return null;
    switch (option) {
      case 'Hôm nay': return 'Today';
      case 'Ngày mai': return 'Tomorrow';
      case 'Cuối tuần này': return 'This Weekend';
      case 'Tuần này': return 'This Week';
      case 'Tháng này': return 'This Month';
      case 'Tháng sau': return 'Next Month';
      case 'Tất cả sắp tới': return 'All Upcoming';
      default: return option; // Trường hợp khác
    }
  };

  const mapBackendValueToDateOption = (value: string | null): string | null => {
    if (!value) return null;
    switch (value) {
      case 'Today': return 'Hôm nay';
      case 'Tomorrow': return 'Ngày mai';
      case 'This Weekend': return 'Cuối tuần này';
      case 'This Week': return 'Tuần này';
      case 'This Month': return 'Tháng này';
      case 'Next Month': return 'Tháng sau';
      case 'All Upcoming': return 'Tất cả sắp tới';
      default: return value;
    }
  };


  // useCallback cho fetchEvents để tránh tạo lại hàm liên tục
  const fetchEvents = useCallback(async (
    searchTermParam: string,
    categoryParam: string | null,
    dateFilterParam: string | null
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchTermParam) params.search = searchTermParam;
      if (categoryParam) params.category = categoryParam;
      if (dateFilterParam) params.dateFilter = dateFilterParam;

      const response = await axios.get(`${API_BASE_URL}/events`, { params });
      setAllEvents(response.data.map((event: any) => ({
          id: event._id,
          title: event.title,
          date: new Date(event.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
          // time: event.time, 
          startTime: event.startTime,
          endTime: event.endTime, 
          location: event.location,
          image: event.image,
          price: event.isFree ? { amount: 0, currency: 'vnd' } : event.price, 
          category: event.category,
          organizer: event.organizer.name
      })));
    } catch (err) {
      console.error('Lỗi khi lấy sự kiện:', err);
      setError('Không thể tải sự kiện.');
    } finally {
      setLoading(false);
    }
  }, []); 
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchFromUrl = queryParams.get('search') || '';
    const categoryFromUrl = queryParams.get('category') || null; 
    const dateFilterFromUrl = queryParams.get('dateFilter') || null; 

    setLocalSearchTerm(searchFromUrl);
    setLocalSelectedCategory(categoryFromUrl);
    setLocalSelectedDate(mapBackendValueToDateOption(dateFilterFromUrl)); 

    // Gọi fetchEvents với các giá trị từ URL để đảm bảo dữ liệu được tải đúng
    fetchEvents(searchFromUrl, categoryFromUrl, dateFilterFromUrl);

  }, [location.search, fetchEvents]); 


  // Hàm chung để cập nhật URL khi có thay đổi bộ lọc
  const updateUrlParams = useCallback((
    newSearchTerm: string,
    newSelectedCategory: string | null,
    newSelectedDate: string | null
  ) => {
    const newQueryParams = new URLSearchParams();
    if (newSearchTerm) newQueryParams.set('search', newSearchTerm);
    if (newSelectedCategory) newQueryParams.set('category', newSelectedCategory);
    
    const backendDateValue = mapDateOptionToBackendValue(newSelectedDate);
    if (backendDateValue) newQueryParams.set('dateFilter', backendDateValue);

    const newUrlSearch = newQueryParams.toString();
    const currentUrlSearch = location.search.substring(1); // Lấy phần query string hiện tại

    // Chỉ navigate nếu URL thực sự thay đổi
    if (newUrlSearch !== currentUrlSearch) {
      navigate({ search: newQueryParams.toString() }, { replace: true });
    }
  }, [location.search, navigate]);


  // Handlers cho các bộ lọc để cập nhật local state và sau đó cập nhật URL
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setLocalSearchTerm(newSearchTerm);
    // Khi người dùng gõ, không cần update URL ngay, chỉ update khi apply filters hoặc onBlur
    // Hoặc có thể thêm debounce nếu muốn search real-time
  };

  const handleCategoryChange = (value: string) => {
    const newCategory = value === localSelectedCategory ? null : value; 
    setLocalSelectedCategory(newCategory);
    updateUrlParams(localSearchTerm, newCategory, localSelectedDate); 
  };

  const handleDateChange = (value: string) => {
    const newDate = value === localSelectedDate ? null : value;
    updateUrlParams(localSearchTerm, localSelectedCategory, newDate); 
  };

  const handleApplyFilters = () => {
    updateUrlParams(localSearchTerm, localSelectedCategory, localSelectedDate);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setLocalSearchTerm('');
    setLocalSelectedCategory(null);
    setLocalSelectedDate(null);
    updateUrlParams('', null, null); 
  };

  const filteredEvents = allEvents;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow bg-gray-50">
        <section className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Khám phá sự kiện</h1>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm sự kiện"
                  className="pl-10 pr-4"
                  value={localSearchTerm}
                  onChange={handleSearchChange}
                  onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                          handleApplyFilters();
                      }
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Select onValueChange={handleDateChange} value={localSelectedDate || ""}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Thời gian" />
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
                  Bộ lọc
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg animate-fade-in">
                <div className="flex justify-between mb-4">
                  <h3 className="font-medium">Bộ lọc nâng cao</h3>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 h-auto py-1">
                    <X className="mr-1 h-3 w-3" />
                    Xóa bộ lọc
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Categories */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Danh mục</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {eventCategories.map((category) => (
                        <div key={category.value} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`category-${category.value}`}
                            name="category-filter"
                            checked={localSelectedCategory === category.value}
                            onChange={() => handleCategoryChange(category.value)} 
                            className="form-radio h-4 w-4 text-event-purple"
                          />
                          <label htmlFor={`category-${category.value}`} className="text-sm">
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button className="bg-event-purple hover:bg-event-dark-purple" onClick={handleApplyFilters}>
                    Áp dụng bộ lọc
                  </Button>
                </div>
              </div>
            )}

            {(localSearchTerm || localSelectedCategory || localSelectedDate) && (
              <div className="flex flex-wrap gap-2 mt-4">
                {localSearchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    Tìm kiếm: {localSearchTerm}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => { setLocalSearchTerm(''); updateUrlParams('', localSelectedCategory, localSelectedDate); }}
                    />
                  </Badge>
                )}

                {localSelectedCategory && (
                  <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    Danh mục: {getCategoryNameByValue(localSelectedCategory)}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => { setLocalSelectedCategory(null); updateUrlParams(localSearchTerm, null, localSelectedDate); }}
                    />
                  </Badge>
                )}

                {localSelectedDate && (
                  <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    Ngày: {localSelectedDate}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => { setLocalSelectedDate(null); updateUrlParams(localSearchTerm, localSelectedCategory, null); }}
                    />
                  </Badge>
                )}

                {(localSearchTerm || localSelectedCategory || localSelectedDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-auto py-1 px-2 text-xs"
                  >
                    Xóa tất cả
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {loading ? 'Đang tải...' : `${filteredEvents.length} ${filteredEvents.length === 1 ? 'Sự kiện' : 'Sự kiện'} được tìm thấy`}
              </h2>
              {/* <Select defaultValue="recommended">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sắp xếp theo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Đề xuất</SelectItem>
                  <SelectItem value="date-asc">Ngày: Sớm nhất</SelectItem>
                  <SelectItem value="date-desc">Ngày: Muộn nhất</SelectItem>
                </SelectContent>
              </Select> */}
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
                <h3 className="text-xl font-medium mb-2">Không tìm thấy sự kiện nào</h3>
                <p className="text-gray-500 mb-6">Hãy thử điều chỉnh tìm kiếm hoặc bộ lọc để tìm thứ bạn đang tìm kiếm.</p>
                <Button onClick={clearFilters}>Xóa tất cả bộ lọc</Button>
              </div>
            )}

            {!loading && filteredEvents.length > 0 && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" size="lg">Tải thêm sự kiện</Button>
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
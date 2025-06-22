import { useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { Search } from 'lucide-react';
    import { Button } from '@/components/ui/button';

    const Hero = () => {
      const [searchTerm, setSearchTerm] = useState('');
      const navigate = useNavigate();

      const handleSearch = () => {
        if (searchTerm.trim()) {
          navigate(`/events?search=${encodeURIComponent(searchTerm.trim())}`);
        } else {
          navigate('/events');
        }
      };

      const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          handleSearch();
        }
      };

      return (
        <div className="relative bg-gradient-to-r from-event-dark-purple to-event-purple text-white">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 right-0 h-32 bg-white opacity-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-white opacity-10 transform rotate-180"></div>
          </div>

          <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in">
                Nơi tìm kiếm và tạo các sự kiện thú vị của riêng bạn
              </h1>

              <p className="text-xl md:text-2xl mb-8 opacity-90 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Khám phá các sự kiện phù hợp với sở thích của bạn hoặc tự tổ chức sự kiện với nền tảng mạnh mẽ của chúng tôi.
              </p>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="relative w-full sm:w-auto flex-1 max-w-lg">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Tìm sự kiện" // Thay đổi từ "Tìm sự kiện" (đã có sẵn tiếng Việt)
                    className="pl-12 pr-4 py-3 rounded-full w-full text-black focus:outline-none focus:ring-2 focus:ring-white/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                </div>
                <Button
                  className="bg-white text-event-purple hover:bg-gray-100 w-full sm:w-auto button-hover"
                  size="lg"
                  onClick={handleSearch}
                >
                  Tìm kiếm
                </Button>
              </div>

              {/* <div className="mt-8 pt-6 border-t border-white border-opacity-20 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div>
                  <div className="text-3xl font-bold">5000+</div>
                  <div className="text-sm opacity-80">Events</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">250+</div>
                  <div className="text-sm opacity-80">Cities</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">1M+</div>
                  <div className="text-sm opacity-80">Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">10K+</div>
                  <div className="text-sm opacity-80">Organizers</div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      );
    };

    export default Hero;
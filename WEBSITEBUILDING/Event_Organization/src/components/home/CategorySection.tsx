import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
    import { Music, Utensils, Briefcase, GraduationCap, Gamepad2, Users, HeartPulse, MicVocal, Palette, Shirt, Zap } from 'lucide-react';

    interface CategoryProps {
      icon: React.ReactNode;
      name: string;
      color: string;
    }

    // Component Category được sửa để sử dụng useNavigate
    const Category = ({ icon, name, color }: CategoryProps) => {
      const navigate = useNavigate();

      const handleCategoryClick = () => {
        navigate(`/events?category=${encodeURIComponent(name)}`); // Điều hướng với query param
      };

      return (
        <div onClick={handleCategoryClick} className="block cursor-pointer"> {/* Thêm onClick và cursor-pointer */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${color}`}>
              {icon}
            </div>
            <h3 className="font-medium text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">Tìm sự kiện</p> {/* Hoặc giữ lại text tĩnh */}
          </div>
        </div>
      );
    };

    const CategorySection = () => {
      // Dữ liệu categories này vẫn là tĩnh. Nếu muốn count động, cần fetch từ backend
      const categories = [
        { icon: <Music size={24} className="text-white" />, name: "Âm nhạc", color: "bg-event-purple" }, // Music -> Âm nhạc
        { icon: <Utensils size={24} className="text-white" />, name: "Ẩm thực & Đồ uống", color: "bg-event-pink" }, // Food & Drink -> Ẩm thực & Đồ uống
        { icon: <Briefcase size={24} className="text-white" />, name: "Kinh doanh", color: "bg-event-teal" }, // Business -> Kinh doanh
        { icon: <GraduationCap size={24} className="text-white" />, name: "Giáo dục", color: "bg-event-orange" }, // Education -> Giáo dục
        { icon: <Gamepad2 size={24} className="text-white" />, name: "Trò chơi", color: "bg-green-500" }, // Gaming -> Trò chơi
        { icon: <Users size={24} className="text-white" />, name: "Xã hội", color: "bg-blue-500" }, // Social -> Xã hội
        { icon: <HeartPulse size={24} className="text-white" />, name: "Sức khỏe", color: "bg-red-500" }, // Health -> Sức khỏe
        { icon: <MicVocal size={24} className="text-white" />, name: "Hài kịch", color: "bg-yellow-500" }, // Comedy -> Hài kịch
        { icon: <Palette size={24} className="text-white" />, name: "Nghệ thuật", color: "bg-indigo-500" }, // Arts -> Nghệ thuật
        { icon: <Zap size={24} className="text-white" />, name: "Thể thao", color: "bg-orange-500" }, // Sports -> Thể thao
        { icon: <Shirt size={24} className="text-white" />, name: "Thời trang", color: "bg-fuchsia-500" }, // Fashion -> Thời trang
        { icon: <MicVocal size={24} className="text-white" />, name: "Khác", color: "bg-gray-500" }, // Other -> Khác
      ];

      return (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Khám phá sự kiện</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Tìm kiếm sự kiện dựa trên sở thích và đam mê của bạn
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {categories.map((category, index) => (
                <Category
                  key={index}
                  icon={category.icon}
                  name={category.name}
                  color={category.color}
                />
              ))}
            </div>
          </div>
        </section>
      );
    };

    export default CategorySection;
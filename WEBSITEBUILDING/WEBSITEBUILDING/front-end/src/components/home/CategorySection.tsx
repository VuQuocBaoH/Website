import { Link, useNavigate } from 'react-router-dom';
import { Music, Utensils, Briefcase, GraduationCap, Gamepad2, Users, HeartPulse, MicVocal, Palette, Shirt, Zap } from 'lucide-react';

// Cập nhật interface CategoryProps để bao gồm 'value'
interface CategoryProps {
  icon: React.ReactNode;
  name: string; 
  value: string; 
  color: string;
}

const Category = ({ icon, name, value, color }: CategoryProps) => {
  const navigate = useNavigate();

  const handleCategoryClick = () => {
      navigate(`/events?category=${encodeURIComponent(value)}`);
  };

  return (
    <div onClick={handleCategoryClick} className="block cursor-pointer">
      <div className="bg-white rounded-xl border border-gray-100 p-6 text-center hover:shadow-md transition-shadow">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-4 ${color}`}>
          {icon}
        </div>
        <h3 className="font-medium text-gray-900">{name}</h3>
        <p className="text-sm text-gray-500">Tìm sự kiện</p>
      </div>
    </div>
  );
};

const CategorySection = () => {
  const categoriesData = [
    { icon: <Music size={24} className="text-white" />, name: "Âm nhạc", value: "Music", color: "bg-event-purple" },
    { icon: <Utensils size={24} className="text-white" />, name: "Ẩm thực & Đồ uống", value: "Food & Drink", color: "bg-event-pink" },
    { icon: <Briefcase size={24} className="text-white" />, name: "Kinh doanh", value: "Business", color: "bg-event-teal" },
    { icon: <GraduationCap size={24} className="text-white" />, name: "Giáo dục", value: "Education", color: "bg-event-orange" },
    { icon: <Gamepad2 size={24} className="text-white" />, name: "Trò chơi", value: "Gaming", color: "bg-green-500" }, 
    { icon: <Users size={24} className="text-white" />, name: "Xã hội", value: "Social", color: "bg-blue-500" },
    { icon: <HeartPulse size={24} className="text-white" />, name: "Sức khỏe", value: "Health", color: "bg-red-500" },
    { icon: <MicVocal size={24} className="text-white" />, name: "Hài kịch", value: "Comedy", color: "bg-yellow-500" },
    { icon: <Palette size={24} className="text-white" />, name: "Nghệ thuật", value: "Art", color: "bg-indigo-500" },
    { icon: <Zap size={24} className="text-white" />, name: "Thể thao", value: "Sports", color: "bg-orange-500" },
    { icon: <Shirt size={24} className="text-white" />, name: "Thời trang", value: "Fashion", color: "bg-fuchsia-500" },
    { icon: <MicVocal size={24} className="text-white" />, name: "Khác", value: "Other", color: "bg-gray-500" },
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
          {categoriesData.map((category, index) => (
            <Category
              key={index}
              icon={category.icon}
              name={category.name}
              value={category.value} 
              color={category.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
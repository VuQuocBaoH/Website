import { Link } from 'react-router-dom';
import { Calendar, Instagram, Twitter, Facebook, Mail } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 pt-12 pb-8 border-t border-gray-200">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand column */}
          <div className="col-span-1">
            <Link to="/" className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-event-purple" />
              <span className="text-xl font-bold text-gray-800">Tổ Chức Sự Kiện</span>
            </Link>
            <p className="text-gray-500 mt-4">
              Giúp bạn quản lý, tổ chức sự kiện tuyệt vời của bạn.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="text-gray-400 hover:text-event-purple transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-event-purple transition-colors">
                <Twitter size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-event-purple transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="text-gray-400 hover:text-event-purple transition-colors">
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Links columns */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Quản lý</h3>
            <ul className="space-y-3">
              <li><Link to="/about" className="text-gray-500 hover:text-event-purple transition-colors">Về chúng tôi</Link></li>
              <li><Link to="/careers" className="text-gray-500 hover:text-event-purple transition-colors">Cơ hội nghề nghiệp</Link></li>
              <li><Link to="/press" className="text-gray-500 hover:text-event-purple transition-colors">Báo chí</Link></li>
              <li><Link to="/blog" className="text-gray-500 hover:text-event-purple transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-4">Điều khoản</h3>
            <ul className="space-y-3">
              <li><Link to="/support" className="text-gray-500 hover:text-event-purple transition-colors">Hỗ trợ</Link></li>
              <li><Link to="/organizers" className="text-gray-500 hover:text-event-purple transition-colors">Dành cho nhà tổ chức</Link></li>
              <li><Link to="/faqs" className="text-gray-500 hover:text-event-purple transition-colors">Câu hỏi thường gặp</Link></li>
              <li><Link to="/contact" className="text-gray-500 hover:text-event-purple transition-colors">Liên hệ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-4">Chính sách</h3>
            <ul className="space-y-3">
              <li><Link to="/terms" className="text-gray-500 hover:text-event-purple transition-colors">Điều khoản dịch vụ</Link></li>
              <li><Link to="/privacy" className="text-gray-500 hover:text-event-purple transition-colors">Chính sách bảo mật</Link></li>
              <li><Link to="/cookies" className="text-gray-500 hover:text-event-purple transition-colors">Chính sách Cookie</Link></li>
              <li><Link to="/security" className="text-gray-500 hover:text-event-purple transition-colors">Bảo mật</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-6">
          <p className="text-gray-500 text-sm text-center">
            &copy; {currentYear} Tổ Chức Sự Kiện. Mọi quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
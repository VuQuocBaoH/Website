// src/components/layout/Navbar.tsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, Calendar, User, Search, LogOut, Bell, Settings, Ticket } from "lucide-react";

// Định nghĩa kiểu cho một thông báo
interface AppNotification {
  id: string;
  message: string; // Nội dung thông báo
  date: string; // Ngày/giờ tạo thông báo
  read: boolean; // Trạng thái đã đọc hay chưa
}

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const getNotificationsForUser = (userId: string): AppNotification[] => {
    const stored = localStorage.getItem(`notifications_${userId}`);
    return stored ? JSON.parse(stored) : [];
  };

  const saveNotificationsForUser = (userId: string, notifs: AppNotification[]) => {
    localStorage.setItem(`notifications_${userId}`, JSON.stringify(notifs));
  };

  const markNotificationAsRead = (userId: string, notifId: string) => {
    const currentNotifs = getNotificationsForUser(userId);
    const updatedNotifs = currentNotifs.map(n =>
      n.id === notifId ? { ...n, read: true } : n
    );
    saveNotificationsForUser(userId, updatedNotifs);
    setNotifications(updatedNotifs);
    setUnreadCount(updatedNotifs.filter(n => !n.read).length);
  };

  const markAllNotificationsAsRead = (userId: string) => {
    const currentNotifs = getNotificationsForUser(userId);
    const updatedNotifs = currentNotifs.map(n => ({ ...n, read: true }));
    saveNotificationsForUser(userId, updatedNotifs);
    setNotifications(updatedNotifs);
    setUnreadCount(0);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  useEffect(() => {
    const checkLoginStatus = () => {
      const token = localStorage.getItem('token');
      const userString = localStorage.getItem('user');

      if (token && userString) {
        try {
          const user = JSON.parse(userString);
          setIsLoggedIn(true);
          setUsername(user.username || user.email);
          setIsAdminUser(user.role === 'admin');
          const userNotifications = getNotificationsForUser(user.id);
          setNotifications(userNotifications);
          setUnreadCount(userNotifications.filter(n => !n.read).length);
        } catch (e) {
          console.error("Không thể phân tích dữ liệu người dùng từ localStorage", e);
          setIsLoggedIn(false);
          setUsername(null);
          setIsAdminUser(false);
          setNotifications([]);
          setUnreadCount(0);
        }
      } else {
        setIsLoggedIn(false);
        setUsername(null);
        setIsAdminUser(false);
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    checkLoginStatus();
    window.addEventListener('notificationAdded', checkLoginStatus);
    window.addEventListener('storage', checkLoginStatus);

    return () => {
      window.removeEventListener('notificationAdded', checkLoginStatus);
      window.removeEventListener('storage', checkLoginStatus);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const userString = localStorage.getItem('user');
    if (userString) {
        try {
            const user = JSON.parse(userString);
            localStorage.removeItem(`notifications_${user.id}`);
        } catch (e) {
            console.error("Lỗi khi phân tích dữ liệu người dùng trong quá trình đăng xuất", e);
        }
    }
    setIsLoggedIn(false);
    setUsername(null);
    setIsAdminUser(false);
    setNotifications([]);
    setUnreadCount(0);
    navigate('/signin');
    window.dispatchEvent(new Event('storage'));
  };

  const handleNotificationClick = (notifId: string) => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        markNotificationAsRead(user.id, notifId);
      } catch (e) {
        console.error("Lỗi khi đánh dấu thông báo đã đọc", e);
      }
    }
  };

  const toggleNotificationsDropdown = () => {
    setShowNotifications(prev => !prev);
    if (!showNotifications && isLoggedIn && notifications.length > 0) {
      const userString = localStorage.getItem('user');
      if (userString) {
        try {
          const user = JSON.parse(userString);
          markAllNotificationsAsRead(user.id);
        } catch (e) {
          console.error("Lỗi khi đánh dấu tất cả thông báo đã đọc", e);
        }
      }
    }
  };


  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and brand */}
          <Link to="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-event-purple" />
            <span className="text-xl font-bold text-gray-800">EventWizard</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 hover:text-event-purple transition-colors">Trang chủ</Link>
            <Link to="/events" className="text-gray-600 hover:text-event-purple transition-colors">Sự kiện</Link>
            {isLoggedIn && (
              <Link to="/create" className="text-gray-600 hover:text-event-purple transition-colors">Tạo sự kiện</Link>
            )}
            {/* Search input (commented out) */}
          </div>

          {/* Auth Buttons / User Info / Notifications - Desktop */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Admin Dashboard Button */}
            {isAdminUser && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <Settings className="h-5 w-5 text-gray-600 mr-2" /> Quản trị
                </Link>
              </Button>
            )}

            {isLoggedIn ? (
              <> {/* This Fragment is correctly placed */}
                {/* Vé của tôi Button */}
                <Button variant="ghost" size="sm" asChild>
                  {/* Sửa lỗi: đảm bảo Link chỉ có MỘT child */}
                  <Link to="/my-tickets" className="flex items-center">
                    <Ticket className="h-5 w-5 text-gray-600 mr-2" /> Vé của tôi
                  </Link>
                </Button>

                <div className="relative" ref={notificationRef}>
                  <Button variant="ghost" size="sm" onClick={toggleNotificationsDropdown} className="relative">
                    <Bell className="h-5 w-5 text-gray-600" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-100">
                      <h3 className="px-3 py-2 text-sm font-semibold text-gray-800 border-b border-gray-100">Thông báo</h3>
                      {notifications.length > 0 ? (
                        <ul>
                          {notifications.map(notif => (
                            <li key={notif.id} className={`px-3 py-2 text-sm cursor-pointer ${notif.read ? 'text-gray-500' : 'font-medium text-gray-900 bg-blue-50'} hover:bg-gray-100`} onClick={() => handleNotificationClick(notif.id)}>
                              <p>{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{notif.date}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-3 py-2 text-sm text-gray-500">Không có thông báo mới.</p>
                      )}
                      {notifications.length > 0 && (
                        <div className="px-3 py-2 border-t border-gray-100">
                           <Button variant="link" size="sm" onClick={() => markAllNotificationsAsRead(JSON.parse(localStorage.getItem('user') || '{}').id)}>Đánh dấu tất cả đã đọc</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Profile Link */}
                <Button variant="ghost" size="sm" asChild>
                  {/* Sửa lỗi: đảm bảo Link chỉ có MỘT child */}
                  <Link to="/profile" className="flex items-center">
                    <User className="h-5 w-5 text-gray-600 mr-1" />
                    <span>Chào, {username}!</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to="/signin">Đăng nhập</Link>
                </Button>
                <Button asChild className="bg-event-purple hover:bg-event-dark-purple" size="sm">
                  <Link to="/signup">Đăng ký</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button onClick={toggleMenu} className="text-gray-600 hover:text-event-purple">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 animate-fade-in">
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-gray-600 hover:text-event-purple px-2 py-2" onClick={toggleMenu}>Trang chủ</Link>
              <Link to="/events" className="text-gray-600 hover:text-event-purple px-2 py-2" onClick={toggleMenu}>Sự kiện</Link>
              {isLoggedIn && (
                <Link to="/create" className="text-gray-600 hover:text-event-purple px-2 py-2" onClick={toggleMenu}>Tạo sự kiện</Link>
              )}
              {isAdminUser && (
                <Button variant="ghost" size="sm" asChild className="w-full justify-start px-2">
                  <Link to="/admin" onClick={toggleMenu}>
                    <Settings className="h-5 w-5 text-gray-600 mr-2" /> Bảng điều khiển Admin
                  </Link>
                </Button>
              )}
              {isLoggedIn && (
                <> {/* This Fragment is correctly placed */}
                  {/* Vé của tôi Button (Mobile) */}
                  <Button variant="ghost" size="sm" asChild className="w-full justify-start px-2">
                    {/* Sửa lỗi: đảm bảo Link chỉ có MỘT child */}
                    <Link to="/my-tickets" onClick={toggleMenu} className="flex items-center">
                      <Ticket className="h-5 w-5 text-gray-600 mr-2" /> Vé của tôi
                    </Link>
                  </Button>

                  <div className="relative">
                    <Button variant="ghost" size="sm" onClick={toggleNotificationsDropdown} className="relative w-full justify-start px-2">
                      <Bell className="h-5 w-5 text-gray-600 mr-2" />
                      Thông báo
                      {unreadCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                    {showNotifications && (
                      <div className="mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 z-100">
                        <h3 className="px-3 py-2 text-sm font-semibold text-gray-800 border-b border-gray-100">Thông báo</h3>
                        {notifications.length > 0 ? (
                          <ul>
                            {notifications.map(notif => (
                              <li key={notif.id} className={`px-3 py-2 text-sm cursor-pointer ${notif.read ? 'text-gray-500' : 'font-medium text-gray-900 bg-blue-50'} hover:bg-gray-100`} onClick={() => handleNotificationClick(notif.id)}>
                                <p>{notif.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{notif.date}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="px-3 py-2 text-sm text-gray-500">Không có thông báo mới.</p>
                        )}
                        {notifications.length > 0 && (
                          <div className="px-3 py-2 border-t border-gray-100">
                             <Button variant="link" size="sm" onClick={() => markAllNotificationsAsRead(JSON.parse(localStorage.getItem('user') || '{}').id)}>Đánh dấu tất cả đã đọc</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
              {isLoggedIn && (
                <Button variant="ghost" size="sm" asChild className="w-full justify-start px-2">
                  <Link to="/profile" onClick={toggleMenu} className="flex items-center">
                    <User className="h-5 w-5 text-gray-600 mr-2" />
                    <span>Hồ sơ</span>
                  </Link>
                </Button>
              )}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm sự kiện"
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-event-purple/20"
                />
              </div>
              <div className="flex space-x-2 pt-2">
                {isLoggedIn ? (
                  <>
                    <div className="flex items-center space-x-2 text-gray-600 px-2">
                        <User className="h-5 w-5" />
                        <span>Chào, {username}!</span>
                    </div>
                    <Button variant="outline" size="sm" className="flex-1" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to="/signin" onClick={toggleMenu}>Đăng nhập</Link>
                    </Button>
                    <Button asChild className="bg-event-purple hover:bg-event-dark-purple flex-1" size="sm">
                      <Link to="/signup" onClick={toggleMenu}>Đăng ký</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
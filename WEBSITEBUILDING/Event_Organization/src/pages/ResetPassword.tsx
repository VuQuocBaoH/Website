// Event_Organization/src/pages/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // Thêm useParams
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const API_BASE_URL = 'http://localhost:5000/api'; // Đảm bảo đúng URL backend của bạn

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [loadingToken, setLoadingToken] = useState(true);
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>(); // Lấy token từ URL params

  useEffect(() => {
    // Kiểm tra xem token có tồn tại trong URL params hay không
    if (token) {
      // Bạn có thể thêm một bước xác thực token ở đây nếu muốn,
      // ví dụ: gửi token đến backend để kiểm tra tính hợp lệ mà không cần mật khẩu mới
      // Đối với demo, chúng ta sẽ giả định token là hợp lệ nếu có.
      setIsValidToken(true);
    } else {
      toast.error('Token đặt lại mật khẩu không hợp lệ hoặc bị thiếu.');
      navigate('/forgot-password');
    }
    setLoadingToken(false);
  }, [token, navigate]); // Thêm token vào dependency array

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      setIsSubmitting(false);
      return;
    }
    if (!token) { // Kiểm tra lại token
        toast.error('Không tìm thấy token đặt lại mật khẩu.');
        setIsSubmitting(false);
        return;
    }
    if (password.length < 6) { // Thêm điều kiện kiểm tra độ dài mật khẩu
      toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
      setIsSubmitting(false);
      return;
    }


    try {
      // Gửi mật khẩu mới và token đến backend
      // Đảm bảo method là PUT và URL là /reset-password/:token
      const response = await axios.put(`${API_BASE_URL}/auth/reset-password/${token}`, {
        newPassword: password, // Đổi tên key thành 'newPassword' để khớp với backend
      });
      toast.success(response.data.msg || 'Mật khẩu của bạn đã được đặt lại thành công.');
      navigate('/signin'); // Chuyển hướng về trang đăng nhập
    } catch (error: any) {
      console.error('Lỗi khi đặt lại mật khẩu:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || 'Đặt lại mật khẩu thất bại. Token có thể đã hết hạn hoặc không hợp lệ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingToken) {
    return <div className="min-h-screen flex items-center justify-center">Đang tải...</div>;
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Token không hợp lệ
            </h2>
            <p className="text-gray-600">
              Liên kết đặt lại mật khẩu của bạn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một liên kết mới.
            </p>
            <Button onClick={() => navigate('/forgot-password')} className="mt-4 bg-event-purple hover:bg-event-dark-purple">
              Yêu cầu đặt lại mật khẩu mới
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Đặt lại mật khẩu
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Nhập mật khẩu mới của bạn.
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="password">Mật khẩu mới</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-event-purple focus:border-event-purple sm:text-sm"
                placeholder="Mật khẩu mới"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-event-purple focus:border-event-purple sm:text-sm"
                placeholder="Xác nhận mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div>
              <Button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-event-purple hover:bg-event-dark-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-event-purple"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
              </Button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
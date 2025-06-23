import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const API_BASE_URL = 'http://localhost:5000/api'; // Đảm bảo đúng URL backend của bạn

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Gửi yêu cầu đặt lại mật khẩu đến backend
      const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      console.log(response)
      toast.success(response.data.msg || 'Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn.');
      navigate('/signin'); // Có thể chuyển hướng về trang đăng nhập
    } catch (error: any) {
      console.error('Lỗi khi gửi yêu cầu quên mật khẩu:', error.response?.data || error.message);
      toast.error(error.response?.data?.msg || 'Gửi yêu cầu thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Quên mật khẩu
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Nhập địa chỉ email đã đăng ký của bạn để đặt lại mật khẩu.
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email" className="sr-only">Địa chỉ Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-event-purple focus:border-event-purple sm:text-sm"
                placeholder="Địa chỉ Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-event-purple hover:bg-event-dark-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-event-purple"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu đặt lại mật khẩu'}
              </Button>
            </div>
          </form>
          <div className="text-sm text-center">
            <a href="/signin" className="font-medium text-event-purple hover:text-event-dark-purple">
              Quay lại trang đăng nhập
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
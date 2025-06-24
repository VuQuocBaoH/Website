import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import axios from 'axios';
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL;

    const SignUp = () => {
      const [showPassword, setShowPassword] = useState(false);
      const [username, setUsername] = useState('');
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const navigate = useNavigate();

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/register`, { username, email, password });
          localStorage.setItem('token', response.data.token);
          // Đảm bảo user object lưu vào localStorage CÓ role
          localStorage.setItem('user', JSON.stringify(response.data.user));

          localStorage.removeItem(`notifications_${response.data.user.id}`);
          window.dispatchEvent(new Event('storage'));
          toast.success("Registration successful! You are now logged in.");
          navigate('/');
        } catch (error: any) {
          console.error("Registration failed:", error.response?.data || error.message);
          toast.error(error.response?.data?.msg || "Registration failed. Please try again.");
        } finally {
          setLoading(false);
        }
      };

      return (
        <div>
          <Navbar />
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-lg">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900">Đăng ký tài khoản</h2>
                <p className="mt-2 text-gray-600">
                  Tạo tài khoản để trải nghiệm đầy đủ tính năng
                </p>
              </div>

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Họ và tên</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Họ và tên của bạn"
                        className="pl-10"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Email của bạn"
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Mật khẩu</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mật khẩu của bạn"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                </div>
                </div>
                <Button className="w-full bg-event-purple hover:bg-event-dark-purple" type="submit" disabled={loading}>
                  {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                </Button>

                <p className="text-center text-sm text-gray-600">
                  Đã có tài khoản?{" "}
                  <Link to="/signin" className="text-event-purple hover:underline">
                    Đăng nhập
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      );
    };

    export default SignUp;
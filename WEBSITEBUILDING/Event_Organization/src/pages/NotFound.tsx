import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "Lỗi 404: Người dùng đã cố gắng truy cập tuyến đường không tồn tại:", // Việt hóa
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Không tìm thấy trang</p> {/* Việt hóa */}
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Quay về Trang chủ
        </a> {/* Việt hóa */}
      </div>
    </div>
  );
};

export default NotFound;
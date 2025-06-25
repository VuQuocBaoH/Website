// D:\code\DACNTT2\WEBSITEBUILDING\event-backend\src\utils\emailService.ts
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config(); // Đảm bảo biến môi trường được tải

// Cấu hình transporter (cài đặt gửi email)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'), // Sử dụng cổng mặc định 587 nếu không có
    secure: process.env.EMAIL_SECURE === 'true', // true cho 465, false cho các cổng khác (như 587)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/**
 * Gửi email đến người dùng.
 * @param {EmailOptions} options - Đối tượng chứa thông tin email (to, subject, text, html).
 */
export const sendEmail = async (options: EmailOptions) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM, // Địa chỉ email gửi đi
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html || options.text, // Ưu tiên HTML nếu có, nếu không thì dùng text
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email đã được gửi thành công đến ${options.to}`);
    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
        // Có thể throw lỗi hoặc xử lý thêm tại đây
        throw new Error('Không thể gửi email.');
    }
};
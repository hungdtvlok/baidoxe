// ✅ Import thư viện cần thiết
const express = require('express');               // Express dùng để tạo web server
const mongoose = require('mongoose');             // Mongoose để kết nối và tương tác MongoDB
const cors = require('cors');                     // Cho phép gọi API từ domain khác (CORS policy)
const bodyParser = require('body-parser');        // Middleware để phân tích JSON từ request body
const bcrypt = require('bcrypt');                 // Thư viện mã hóa mật khẩu

// ✅ Khởi tạo ứng dụng Express và cấu hình cổng
const app = express();
const PORT = 3000;

// ✅ Middleware cho phép CORS và đọc JSON request body
app.use(cors());
app.use(bodyParser.json());



// ✅ Kết nối MongoDB thông qua URI từ MongoDB Atlas
mongoose.connect('mongodb+srv://chuong:maihuychuong@cluster0.wcohcgr.mongodb.net/parkinglotdb?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('✅ Đã kết nối MongoDB thành công'))
    .catch((err) => console.error('❌ Lỗi MongoDB:', err));

// ✅ Khai báo Schema người dùng, sử dụng để login, đổi mật khẩu, quản lý tài khoản
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },    // Tên đăng nhập (duy nhất)
    password: { type: String, required: true, select: false },   // Mật khẩu (ẩn khi truy vấn)
    fullName: String,                                            // Tên đầy đủ
    email: String,                                               // Email
    phone: String                                                // Số điện thoại
}, { timestamps: true });                                        // Thêm createdAt và updatedAt tự động

// ✅ Tự động mã hóa mật khẩu trước khi lưu (nếu password bị thay đổi)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10); // Hash password với độ mạnh 10
    next();
});

// ✅ Tạo model người dùng từ schema
const User = mongoose.model('User', userSchema, 'users');

// ✅ Schema động cho các bảng khác (strict: false nghĩa là chấp nhận mọi trường)
const dynamicSchema = new mongoose.Schema({}, { strict: false });

const Vehicle = mongoose.model('Vehicle', dynamicSchema, 'vehicles');
const Parkinglogs = mongoose.model('Parkinglogs', dynamicSchema, 'parking_logs');
const Parkingslots = mongoose.model('Parkingslots', dynamicSchema, 'parking_slots');
const SystemConfig = mongoose.model('SystemConfig', dynamicSchema, 'parking_lots');
const Alert = mongoose.model('Alert', dynamicSchema, 'alerts');
const Shifts = mongoose.model('Shifts', dynamicSchema, 'shifts');
const transactions = mongoose.model('transactions', dynamicSchema, 'transactions');

// ✅ API: Đăng nhập người dùng
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Tìm user theo username và lấy thêm trường password (vì mặc định select: false)
        const user = await User.findOne({ username }).select('+password');
        if (!user) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

        // So sánh password nhập vào với password đã hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu' });

        // Thành công: trả về thông tin user
        res.json({ message: 'Đăng nhập thành công', user });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
});

// ✅ API: Đổi mật khẩu
app.post('/api/change-password', async (req, res) => {
    const { userId, oldPassword, newPassword } = req.body;

    try {
        // Tìm user theo ID và lấy thêm mật khẩu
        const user = await User.findById(userId).select('+password');
        if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại' });

        // Kiểm tra mật khẩu cũ
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });

        // Cập nhật mật khẩu mới (sẽ được hash lại do schema)
        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server', error });
    }
});

// ✅ API: Lấy danh sách người dùng
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});

// ✅ API: Lấy danh sách xe vào
app.get('/api/vehicles', async (req, res) => {
    try {
        const data = await Vehicle.find({});
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});

// ✅ API: Lấy lịch sử xe ra
app.get('/api/parking_logs', async (req, res) => {
    try {
        const data = await Parkinglogs.find(); 
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});

// ✅ API: Lấy danh sách vị trí đỗ xe
app.get('/api/parking_slots', async (req, res) => {
    try {
        const data = await Parkingslots.find({}); 
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});



// ✅ API: Lấy cấu hình hệ thống
app.get('/api/system_config', async (req, res) => {
    try {
        const data = await SystemConfig.find({});
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});

// ✅ API: Cập nhật thông tin người dùng
app.put('/api/users/:username', async (req, res) => {
    const { username } = req.params;
    const { fullName, email, phone } = req.body;

    try {
        // Tìm người dùng theo username và cập nhật thông tin
        const updatedUser = await User.findOneAndUpdate(
            { username },
            { fullName, email, phone },
            { new: true } // Trả về user mới sau khi cập nhật
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        res.json({ message: 'Cập nhật thành công', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: 'Cập nhật thất bại', err });
    }
});
// ✅ API: Cảnh báo
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await Alert.find({}).sort({ created_at: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});

// ✅ API: Lấy danh sách lịch làm việc (Shifts)
app.get('/api/shifts', async (req, res) => {
    try {
        const data = await Shifts.find({});
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});
// ✅ API: Lấy danh sách xe trả tiền
app.get('/api/transactions', async (req, res) => {
    try {
        const data = await transactions.find({});
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', err });
    }
});



// ✅ Khởi động server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại http://0.0.0.0:${PORT}`);
});

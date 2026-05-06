import { generateToken } from "../config/generateToken.js";
import { publishToQueue } from "../config/rabbitmq.js";
import TryCatch from "../config/TryCatch.js";
import { redisClient } from "../index.js";
import { User } from "../model/User.js";
import bcrypt from "bcryptjs";
export const registerUser = TryCatch(async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        res.status(400).json({ message: "Username, password and email are required." });
        return;
    }
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
        res.status(400).json({ message: "Username or Email already exists." });
        return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
        username,
        password: hashedPassword,
        email
    });
    res.status(201).json({
        message: "User registered successfully. Please login to receive OTP.",
        user: { id: newUser._id, username: newUser.username }
    });
});
export const loginUser = TryCatch(async (req, res) => {
    const { username, password, email } = req.body;
    const user = await User.findOne({ username, email });
    if (!user || !user.password) {
        res.status(400).json({ message: "Invalid username or email." });
        return;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(400).json({ message: "Invalid username or password." });
        return;
    }
    const rateLimitKey = `otp:ratelimit:${user.email}`;
    if (await redisClient.get(rateLimitKey)) {
        res.status(429).json({ message: "Please wait 1 minute before requesting another OTP." });
        return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`login_otp:${user.email}`, otp, { EX: 5 * 60 });
    await redisClient.set(rateLimitKey, '1', { EX: 60 });
    const message = {
        to: user.email,
        subject: "Login Verification Code",
        body: `Your login OTP code is ${otp}. It is valid for 5 minutes.`,
    };
    await publishToQueue("send-otp", message);
    res.status(200).json({
        message: "OTP sent to your email. Please verify to login.",
        email: user.email
    });
});
export const verifyUser = TryCatch(async (req, res) => {
    const { email, otp: enteredOtp } = req.body;
    if (!email || !enteredOtp) {
        res.status(400).json({ message: "Email and OTP are required." });
        return;
    }
    const otpKey = `login_otp:${email}`;
    const storedOtp = await redisClient.get(otpKey);
    if (!storedOtp) {
        res.status(400).json({ message: "Invalid or expired OTP." });
        return;
    }
    if (storedOtp !== enteredOtp) {
        res.status(400).json({ message: "Invalid OTP." });
        return;
    }
    await redisClient.del(otpKey);
    const user = await User.findOne({ email });
    if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
    }
    const userPayload = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
    };
    const token = generateToken(userPayload);
    res.json({
        message: "User verified successfully.",
        token,
        user: userPayload,
    });
});
export const myProfile = TryCatch(async (req, res) => {
    const user = req.user;
    res.status(200).json({
        user,
    });
});
export const updateName = TryCatch(async (req, res) => {
    // vì đã gắn req.user = decodedValue.user; trong middleware isAuth nên ở đây có thể dùng req.user để lấy thông tin user đã đăng nhập
    const user = await User.findById(req.user?._id);
    if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
    }
    if (req.body.username) {
        user.username = req.body.username;
        await user.save();
    }
    const token = generateToken(user);
    res.status(200).json({
        message: "Username updated successfully.",
        user,
        token,
    });
});
export const getAllUsers = TryCatch(async (req, res) => {
    const users = await User.find();
    res.status(200).json({
        users,
    });
});
export const getAUser = TryCatch(async (req, res) => {
    const user = await User.findById(req.params.id);
    res.status(200).json({
        user,
    });
});
//# sourceMappingURL=user.js.map
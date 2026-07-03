import TryCatch from "../config/TryCatch.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import { User } from "../model/User.js";
// Tạo profile của User khi Auth Service thông báo đăng ký thành công
export const createProfileInternal = TryCatch(async (req, res) => {
    const { userId, username, email } = req.body;
    if (!userId || !username || !email) {
        res.status(400).json({ message: "userId, username and email are required." });
        return;
    }
    const existingUser = await User.findById(userId);
    if (existingUser) {
        res.status(400).json({ message: "User profile already exists." });
        return;
    }
    const newUser = await User.create({
        _id: userId, // Dùng chung _id được sinh ra từ Auth Service
        username,
        email
    });
    res.status(201).json({
        message: "User profile created successfully.",
        user: newUser
    });
});
export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
    res.status(200).json({
        user: req.user,
    });
});
export const updateName = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = await User.findById(req.user?._id);
    if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
    }
    if (req.body.username) {
        user.username = req.body.username;
        await user.save();
    }
    res.status(200).json({
        message: "Username updated successfully.",
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }
    });
});
export const getAllUsers = TryCatch(async (req: AuthenticatedRequest, res) => {
    const users = await User.find();
    res.status(200).json({
        users,
    });
});
export const getAUser = TryCatch(async (req: AuthenticatedRequest, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
    }
    res.status(200).json({
        user,
    });
});
import TryCatch from "../config/TryCatch.js";
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
export const myProfile = TryCatch(async (req, res) => {
    res.status(200).json({
        user: req.user,
    });
});
export const updateName = TryCatch(async (req, res) => {
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
export const getAllUsers = TryCatch(async (req, res) => {
    const users = await User.find();
    res.status(200).json({
        users,
    });
});
export const getAUser = TryCatch(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        res.status(404).json({ message: "User not found." });
        return;
    }
    res.status(200).json({
        user,
    });
});
export const updateRoleInternal = TryCatch(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) {
        res.status(400).json({ message: "role is required." });
        return;
    }
    const user = await User.findById(id);
    if (!user) {
        res.status(404).json({ message: "User profile not found." });
        return;
    }
    user.role = role;
    await user.save();
    res.status(200).json({
        message: "User role updated successfully.",
        user
    });
});
export const handleProfileSync = async (message) => {
    const { action, userId, username, email, role } = message;
    try {
        if (action === 'CREATE') {
            const existingUser = await User.findById(userId);
            if (!existingUser) {
                await User.create({
                    _id: userId,
                    username,
                    email,
                    role: role || 'user'
                });
                console.log(`[RabbitMQ Sync] Created user profile: ${userId}`);
            }
            else {
                console.log(`[RabbitMQ Sync] User profile already exists: ${userId}`);
            }
        }
        else if (action === 'UPDATE_EMAIL') {
            const user = await User.findById(userId);
            if (user) {
                user.email = email;
                await user.save();
                console.log(`[RabbitMQ Sync] Updated user email: ${userId} -> ${email}`);
            }
            else {
                console.warn(`[RabbitMQ Sync] User profile not found for email update: ${userId}`);
            }
        }
        else if (action === 'UPDATE_ROLE') {
            const user = await User.findById(userId);
            if (user) {
                user.role = role;
                await user.save();
                console.log(`[RabbitMQ Sync] Updated user role: ${userId} -> ${role}`);
            }
            else {
                console.warn(`[RabbitMQ Sync] User profile not found for role update: ${userId}`);
            }
        }
        else if (action === 'DELETE') {
            await User.findByIdAndDelete(userId);
            console.log(`[RabbitMQ Sync] Deleted user profile: ${userId}`);
        }
    }
    catch (error) {
        console.error(`[RabbitMQ Sync] Error processing action ${action}:`, error.message);
        throw error;
    }
};
//# sourceMappingURL=user.js.map
import TryCatch from "../config/TryCatch.js";
import type { RabbitMessageMetadata } from "../config/rabbitmq.js";
import { structuredLogger } from "../common/observability/structured-logger.service.js";
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
    const user = await User.findById(req.user?._id);
    if (!user) {
        res.status(401).json({ message: "Phiên đăng nhập không còn hợp lệ." });
        return;
    }
    res.status(200).json({
        user,
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

export const handleProfileSync = async (
    message: any,
    metadata: RabbitMessageMetadata,
) => {
    const { action, userId, username, email, role } = message;
    const logContext = {
        requestId: metadata.requestId ?? "unknown",
        queueName: metadata.queueName,
        action,
        ...(userId ? { userId: String(userId) } : {}),
    };
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
                structuredLogger.info("rabbitmq_message_processed", {
                    ...logContext,
                    outcome: "profile_created",
                });
            } else {
                structuredLogger.info("rabbitmq_message_processed", {
                    ...logContext,
                    outcome: "profile_already_exists",
                });
            }
        } else if (action === 'UPDATE_EMAIL') {
            const user = await User.findById(userId);
            if (user) {
                user.email = email;
                await user.save();
                structuredLogger.info("rabbitmq_message_processed", {
                    ...logContext,
                    outcome: "email_updated",
                });
            } else {
                structuredLogger.warn("rabbitmq_message_rejected", {
                    ...logContext,
                    reason: "profile_not_found",
                });
            }
        } else if (action === 'UPDATE_ROLE') {
            const user = await User.findById(userId);
            if (user) {
                user.role = role;
                await user.save();
                structuredLogger.info("rabbitmq_message_processed", {
                    ...logContext,
                    outcome: "role_updated",
                });
            } else {
                structuredLogger.warn("rabbitmq_message_rejected", {
                    ...logContext,
                    reason: "profile_not_found",
                });
            }
        } else if (action === 'DELETE') {
            await User.findByIdAndDelete(userId);
            structuredLogger.info("rabbitmq_message_processed", {
                ...logContext,
                outcome: "profile_deleted",
            });
        }
    } catch (error: unknown) {
        const typedError = error instanceof Error ? error : new Error(String(error));
        structuredLogger.error(
            "rabbitmq_message_failed",
            {
                ...logContext,
                errorName: typedError.name,
                message: typedError.message,
            },
            typedError.stack,
        );
        throw error;
    }
};

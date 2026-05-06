import express from "express";
import { getAllUsers, getAUser, loginUser, registerUser, myProfile, updateName, verifyUser } from "../controllers/user.js";
import { isAuth } from "../middleware/isAuth.js";
const router = express.Router();
/**
 * @swagger
 * /register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [USER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng ký thành công
 */
router.post("/register", registerUser);
/**
 * @swagger
 * /login:
 *   post:
 *     summary: Đăng nhập vào hệ thống
 *     tags: [USER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 */
router.post("/login", loginUser);
/**
 * @swagger
 * /verify:
 *   post:
 *     summary: Xác thực tài khoản (OTP)
 *     tags: [USER]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Xác thực thành công
 */
router.post("/verify", verifyUser);
/**
 * @swagger
 * /me:
 *   get:
 *     summary: Lấy thông tin tài khoản đang đăng nhập
 *     tags: [USER]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/me", isAuth, myProfile);
/**
 * @swagger
 * /user/all:
 *   get:
 *     summary: Lấy toàn bộ danh sách người dùng
 *     tags: [USER]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/user/all", isAuth, getAllUsers);
/**
 * @swagger
 * /user/{id}:
 *   get:
 *     summary: Lấy thông tin user bằng ID
 *     tags: [USER]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/user/:id", getAUser);
/**
 * @swagger
 * /update/user:
 *   post:
 *     summary: Cập nhật thông tin cá nhân (VD tên)
 *     tags: [USER]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post("/update/user", isAuth, updateName);
export default router;
//# sourceMappingURL=user.js.map
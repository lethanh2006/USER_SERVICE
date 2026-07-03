import express from "express";
import { getAllUsers, getAUser, myProfile, createProfileInternal, updateName } from "../controllers/user.js";
import { isAuth } from "../middleware/isAuth.js";
const router = express.Router();
// 1. API nội bộ (Internal) dành riêng cho Auth Service gọi qua REST HTTP
router.post("/internal/create-profile", createProfileInternal);
router.get("/internal/:id", getAUser); // API lấy profile theo ID để phục vụ đính kèm token
// 2. API Public cho Client (đi qua Gateway)
router.get("/me", isAuth, myProfile);
router.get("/user/all", isAuth, getAllUsers);
router.get("/user/:id", isAuth, getAUser);
router.post("/update/user", isAuth, updateName);
export default router;
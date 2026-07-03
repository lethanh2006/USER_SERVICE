export const isAuth = async (req, res, next) => {
    try {
        const base64Payload = req.headers['x-user-payload'];
        if (!base64Payload) {
            res.status(401).json({ message: "Unauthorized: Missing identity payload" });
            return;
        }
        // Giải mã payload Base64 do Gateway inject
        const jsonString = Buffer.from(base64Payload, 'base64').toString('utf8');
        const userData = JSON.parse(jsonString);
        req.user = userData;
        next();
    }
    catch (error) {
        res.status(401).json({ message: "Unauthorized: Invalid identity payload" });
    }
};
//# sourceMappingURL=isAuth.js.map
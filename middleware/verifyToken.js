import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Access Denied. No token provided.",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
        req.user = decoded; // Attach decoded payload to request
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};

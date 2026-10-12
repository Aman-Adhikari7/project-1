import jwt from "jsonwebtoken";

export const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

export function requireAuth(...roles) {
  return (req, res, next) => {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Please log in again." });
    }
    if (roles.length && !roles.includes(req.user.role))
      return res.status(403).json({ error: "You don't have access to this." });
    next();
  };
}

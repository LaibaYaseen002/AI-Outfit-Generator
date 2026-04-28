import { supabaseAdmin } from "../services/supabase.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: { message: "Missing or invalid Authorization header", status: 401 }
      });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        error: { message: "Invalid or expired token", status: 401 }
      });
    }

    req.user = data.user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

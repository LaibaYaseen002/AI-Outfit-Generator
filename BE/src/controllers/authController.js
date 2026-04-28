import { supabaseAdmin, supabaseAnon } from "../services/supabase.js";

function badRequest(res, message) {
  return res.status(400).json({ error: { message, status: 400 } });
}

export async function signup(req, res, next) {
  try {
    const { email, password, fullName } = req.body ?? {};
    if (!email || !password) {
      return badRequest(res, "email and password are required");
    }

    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? null } }
    });

    if (error) return res.status(400).json({ error: { message: error.message, status: 400 } });

    res.status(201).json({
      user: data.user,
      session: data.session,
      message: data.session
        ? "Signup successful — you are logged in."
        : "Signup successful. Check your email to confirm your account."
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return badRequest(res, "email and password are required");
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password
    });

    if (error) return res.status(401).json({ error: { message: error.message, status: 401 } });

    res.json({ user: data.user, session: data.session });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token = req.token;
    if (token) {
      // Revoke this specific access token's session
      await supabaseAdmin.auth.admin.signOut(token);
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

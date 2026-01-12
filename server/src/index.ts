import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ping } from "./db.js";
import menu from "./routes/menu.js";
import drinks from "./routes/drinks.js";
import orders from "./routes/orders.js";
import employees from "./routes/employee.js";
import inventory from "./routes/inventory.js";
import rewards from "./routes/rewards.js";
import weather from "./routes/weather.js";
import history from "./routes/history.js";
import session, { SessionOptions } from "express-session";
import { RequestHandler } from "express";
import passport from "passport";
import reportsRouter from './routes/reports.js';
import happyHourRoutes from './routes/happyHour.js'
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    //"https://gooeytea-qky4.onrender.com",
    //for running locally
    "http://localhost:3000"
  ],
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

app.set('trust proxy', 1);
const sessionOptions: SessionOptions = {
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
};

app.use(session(sessionOptions) as unknown as RequestHandler);

app.use(passport.initialize() as unknown as RequestHandler);
app.use(passport.session() as unknown as RequestHandler);


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: process.env.OAUTH_CALLBACK_URL as string,
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value || "";

      const allowedManagers = [
        "reveille.bubbletea@gmail.com",
        "birkelbachs@tamu.edu",
        "marciv@tamu.edu", //added my email so i can check my pages for now
        "royer_carrigan@tamu.edu",
        "sohniballard@tamu.edu"
      ]

      const user = {
        id: profile.id,
        name: profile.displayName,
        email,
        isManager: allowedManagers.includes(email)
      };

      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj as any);
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/fail" }),
  (req, res) => {
    const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
    res.redirect(`${frontend}/manager`);
  }
);

app.get("/auth/fail", (_req, res) => {
  res.status(401).send("Authentication failed");
});

app.get("/api/me", (req, res) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, user });
});

app.post("/api/logout", (req, res, next) => {
  (req as any).logout((err: any) => {
    if (err) return next(err);
    (req as any).session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });
});

app.get("/api/health", async (_req, res) => {
  try { await ping(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

app.use("/api/menu", menu);
app.use("/api/drinks", drinks);
app.use("/api/orders", orders);
app.use("/api/employees", employees);
app.use("/api/inventory", inventory);
app.use("/api/rewards", rewards);
app.use("/api/weather", weather);
app.use('/api/reports', reportsRouter);
app.use("/api/order-history",history);
app.use('/api', happyHourRoutes);

const port = parseInt(process.env.PORT ?? "8080", 10);
app.listen(port, () => console.log(`API listening on :${port}`));


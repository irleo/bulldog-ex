import dashboardRoutes from "./routes/dashboardRoutes.js";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { fileURLToPath } from "node:url";
import { CLIENT_ORIGIN, NODE_ENV, TRUST_PROXY } from "./config/config.js";
import { HttpStatus } from "./config/constants.js";
import {
  notFoundHandler,
  serverErrorHandler,
} from "./middleware/errorHandlers.js";
import cartRoutes from "./routes/cartRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { auditLoggerMiddleware } from "./middleware/auditLoggerMiddleware.js";
import {
  apiLimiter,
  mutationLimiter,
} from "./middleware/rateLimiterMiddleware.js";

const app = express();
app.set("trust proxy", TRUST_PROXY.length ? TRUST_PROXY : false);

const corsOptions = {
  origin: CLIENT_ORIGIN,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Idempotency-Key"],
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  exposedHeaders: ["Retry-After", "RateLimit", "RateLimit-Policy"],
  optionsSuccessStatus: 204,
};

// Middleware
app.disable("x-powered-by");
app.use(auditLoggerMiddleware);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    frameguard: { action: "sameorigin" },
    strictTransportSecurity: NODE_ENV === "production",
  }),
);
app.use(cors(corsOptions));
app.use("/api/v1", apiLimiter, mutationLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(morgan(":method :status :response-time ms"));
app.use(
  "/uploads",
  express.static(fileURLToPath(new URL("./uploads/", import.meta.url)), {
    dotfiles: "deny",
    index: false,
    maxAge: NODE_ENV === "production" ? "7d" : 0,
  }),
);

// Health Check
app.get("/api/v1/health", (_request, response) => {
  response.status(HttpStatus.OK).json({
    success: true,
    message: "Bulldogs Exchange API is healthy.",
    count: 1,
    data: { status: "ok", environment: NODE_ENV },
  });
});

// API V1
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/carts", cartRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/users", userRoutes);

app.use("/api/v1/dashboard", dashboardRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(serverErrorHandler);

export default app;

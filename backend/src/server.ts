import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.ts";
import usersRoutes from "./routes/usersRoutes.ts";
import inviteRoutes from "./routes/invitesRoutes.ts";
import inventoryEventsRoutes from "./routes/inventoryEventsRoutes.ts";
import itemsRoutes from "./routes/itemsRoutes.ts";
import salesRoutes from "./routes/salesRoutes.ts";
import inventoryRoutes from "./routes/inventoryRoutes.ts";
import categoriesRoutes from "./routes/categoriesRoutes.ts";
import errorHandler from "./middleware/errorHandler.ts";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.ts";
import { getAllowedOrigins } from "../env.ts";

const app = express();

// cors() with no options (the previous setup) allows every origin and
// never sends credentials -- which silently breaks the cookie-based
// refresh-token flow the moment frontend and backend are on different
// origins. ALLOWED_ORIGINS is read from env (see env.ts) so it can differ
// between dev/test/production without a code change.
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/invites", inviteRoutes);
app.use("/api/v1/events", inventoryEventsRoutes);
app.use("/api/v1/items", itemsRoutes);
app.use("/api/v1/sales", salesRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/categories", categoriesRoutes);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);
export { app };
export default app;

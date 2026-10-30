import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import peerRoutes from "./routes/peer.js";
import emergencyRoutes from "./routes/emergency.js";
import accessibilityRoutes from "./routes/accessibility.js";
import unipalRoutes from "./routes/unipal.js";
import authRoutes from "./routes/auth.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req,res)=>res.json({status:"ok",service:"UniAble API"}));
app.use("/api/peer", peerRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/accessibility", accessibilityRoutes);
app.use("/api/unipal", unipalRoutes);
app.use("/api/auth", authRoutes);

const port = process.env.PORT || 4000;
app.listen(port, ()=>console.log(`UniAble API running on http://localhost:${port}`));


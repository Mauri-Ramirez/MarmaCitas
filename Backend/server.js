import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import specialtyRoutes from "./routes/specialtyRoutes.js";

dotenv.config(); // PRIMERO

import connectDB from "./config/db.js";
connectDB(); // DESPUÉS

//import { useReducer } from "react";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes); //PUBLICO
app.use("/api/user", userRoutes); //PROTEGIDO
app.use("/api/specialties", specialtyRoutes); //Especialidades

app.get("/", (req, res) => {
  res.send("API MarmaCitas funcionando correctamente");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

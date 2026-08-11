import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import specialtyRoutes from "./routes/specialtyRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";

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
app.use("/api/services", serviceRoutes); //Servicios
app.use("/api/doctors", doctorRoutes); //Doctores
app.use("/api/schedules", scheduleRoutes); //Horarios

app.get("/", (req, res) => {
  res.send("API MarmaCitas funcionando correctamente");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

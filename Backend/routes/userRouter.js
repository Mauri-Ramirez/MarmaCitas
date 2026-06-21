import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/profile", verifyToken, (req, res) => {

  res.json({
    message: "Acceso permitido",
    user: req.user
  });

});


export default router;

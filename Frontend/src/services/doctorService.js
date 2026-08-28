import axios from "../api/axios";

export const getDoctors = async () => {
  const res = await axios.get("/doctors");

  return res.data;
};

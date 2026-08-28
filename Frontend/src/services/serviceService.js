import axios from "../api/axios";

export const getServices = async () => {
  const res = await axios.get("/services");

  return res.data;
};

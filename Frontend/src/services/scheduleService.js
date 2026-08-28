import axios from "../api/axios";

export const getMySchedule = async () => {
  const res = await axios.get("/schedules/my");

  return res.data;
};

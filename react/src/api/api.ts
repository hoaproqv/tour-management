import Cookies from "js-cookie";

import axiosInstance from "./axiosInstance";

// Hàm GET
export const fetchData = async (endpoint: string) => {
  const response = await axiosInstance.get(endpoint);
  return response.data;
};

// Hàm POST
export const postData = async <T>(endpoint: string, data: T) => {
  const csrfToken = Cookies.get("csrftoken") || "";

  const response = await axiosInstance.post(endpoint, data, {
    headers: {
      "X-CSRFToken": csrfToken,
    },
  });

  return response.data;
};

// Hàm PUT
export const putData = async <T>(endpoint: string, data: T) => {
  const response = await axiosInstance.put(endpoint, data);
  return response.data;
};

// Hàm DELETE
export const deleteData = async <T>(endpoint: string, data?: T) => {
  if (data) {
    const response = await axiosInstance.delete(endpoint, data);
    return response.data;
  } else {
    const response = await axiosInstance.delete(endpoint);
    return response.data;
  }
};

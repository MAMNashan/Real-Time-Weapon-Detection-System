import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authService } from "../services/api";

const Home = ({ isLoggedin, setIsLoggedIn }) => {
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setIsLoggedIn(true);
      setUsername(user.username);
    }
  }, []);

  return (
    <div className="h-[calc(100vh-64px)] home_background ">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 h-full flex justify-center items-center ">
        <div className="mt-10 bg-gradient-to-br from-gray-50 via-indigo-100 to-purple-100 p-12 rounded-xl shadow-lg">
          {isLoggedin ? (
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Welcome back, {username}!
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Choose a detection method below to get started.
              </p>

              <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-4">
                {/* Image Detection Card */}
                <div className="bg-white col-span-2  overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="">
                      <div className="flex items-center">
                        <div className="bg-indigo-500   w-12 rounded-md p-3">
                          <svg
                            className="h-6 w-6 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="ml-8  ">
                          <dt className="text-lg font-medium text-gray-900">
                            Image Detection
                          </dt>
                        </div>
                      </div>
                      <div className=" mt-4 text-sm text-gray-500">
                        Upload an image to detect weapons in static images.
                      </div>
                    </div>
                    <div className="mt-5">
                      <Link
                        to="/image-detection"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Start Image Detection
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Video Detection Card */}
                <div className="bg-white col-span-2 overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="">
                      <div className="flex items-center">
                        <div className="bg-indigo-500 rounded-md p-3">
                          <svg
                            className="h-6 w-6 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 ">
                          <dt className="text-lg font-medium text-gray-900">
                            Video Detection
                          </dt>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        Upload a video to detect weapons in video content.
                      </div>
                    </div>
                    <div className="mt-5">
                      <Link
                        to="/video-detection"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Start Video Detection
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center h-full bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50 px-10 py-10 shadow-xl border border-indigo-200 rounded-2xl transition-all duration-300">
              <h3 className="text-lg font-medium text-gray-900">
                Get started today
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create an account to start using our application.
              </p>
              <div className="mt-5 flex justify-center space-x-4">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;

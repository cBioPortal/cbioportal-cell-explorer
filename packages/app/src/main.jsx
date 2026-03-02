import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import App, { ViewerLayout, ViewerTabs } from "./App.jsx";
import LoadPage from "./pages/LoadPage";
import { ProfilePage } from "@cbioportal-zarr-loader/profiler";

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      { path: "load", Component: LoadPage },
      { path: "profile", Component: ProfilePage },
      {
        Component: ViewerLayout,
        children: [
          { index: true, Component: ViewerTabs },
          { path: "*", Component: ViewerTabs },
        ],
      },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});

ReactDOM.createRoot(document.getElementById("app")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);

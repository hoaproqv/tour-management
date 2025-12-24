import React from "react";

import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import "./pages/styles/main.css";
import "./pages/styles/styles.scss";

import App from "./App";
import FirebaseAuthProvider from "./provider/FirebaseAuthProvider";
import QueryProvider from "./provider/QueryProvider";
import store from "./redux/store";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);
root.render(
  <BrowserRouter>
    <Provider store={store}>
      <QueryProvider>
        <FirebaseAuthProvider>
          <App />
        </FirebaseAuthProvider>
      </QueryProvider>
    </Provider>
  </BrowserRouter>,
);

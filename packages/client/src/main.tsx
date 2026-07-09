import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { QueryClientAtomProvider } from "jotai-tanstack-query/react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
});

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565c0"
    },
    secondary: {
      main: "#2e7d32"
    }
  },
  shape: {
    borderRadius: 8
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientAtomProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </QueryClientAtomProvider>
  </StrictMode>
);

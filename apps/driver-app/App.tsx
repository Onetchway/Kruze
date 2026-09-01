import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/auth";
import LoginScreen from "./src/screens/LoginScreen";
import ClaimAccountScreen from "./src/screens/ClaimAccountScreen";
import HomeScreen from "./src/screens/HomeScreen";

function Root() {
  const { session, ready } = useAuth();
  const [mode, setMode] = useState<"login" | "claim">("login");

  if (!ready) {
    return null;
  }
  if (session) {
    return <HomeScreen />;
  }
  return mode === "login" ? (
    <LoginScreen onGoToClaim={() => setMode("claim")} />
  ) : (
    <ClaimAccountScreen onBackToLogin={() => setMode("login")} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

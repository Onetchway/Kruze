import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/lib/auth";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import HomeScreen from "./src/screens/HomeScreen";

function Root() {
  const { session, ready } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");

  if (!ready) {
    return null;
  }
  if (session) {
    return <HomeScreen />;
  }
  return mode === "login" ? (
    <LoginScreen onGoToSignup={() => setMode("signup")} />
  ) : (
    <SignupScreen onBackToLogin={() => setMode("login")} />
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

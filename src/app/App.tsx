import { AppProvider, useApp } from "./contexts/AppContext";
import { LoginPage } from "./components/LoginPage";
import { Layout } from "./components/Layout";

function AppInner() {
  const { currentUser } = useApp();
  return currentUser ? <Layout /> : <LoginPage />;
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

import "./styles.css";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { GenerateOrdersScreen } from "./screens/GenerateOrdersScreen";
import { ConvertPdfScreen } from "./screens/ConvertPdfScreen";
import { SendDraftsScreen } from "./screens/SendDraftsScreen";

export default function App() {
  return (
    <MemoryRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<GenerateOrdersScreen />} />
          <Route path="/convert" element={<ConvertPdfScreen />} />
          <Route path="/send" element={<SendDraftsScreen />} />
        </Routes>
      </Layout>
    </MemoryRouter>
  );
}

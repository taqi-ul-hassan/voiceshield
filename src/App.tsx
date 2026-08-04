import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Overview from "./pages/Overview";
import Policies from "./pages/Policies";
import TestBench from "./pages/TestBench";
import TestRuns from "./pages/TestRuns";
import TestRunDetail from "./pages/TestRunDetail";
import RiskReport from "./pages/RiskReport";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="policies" element={<Policies />} />
          <Route path="test-bench" element={<TestBench />} />
          <Route path="test-runs" element={<TestRuns />} />
          <Route path="test-runs/:id" element={<TestRunDetail />} />
          <Route path="risk-report" element={<RiskReport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

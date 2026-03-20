import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { isAuthenticated } from "../lib/auth";

type Props = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

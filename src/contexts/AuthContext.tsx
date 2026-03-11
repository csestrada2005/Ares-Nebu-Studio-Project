import { createContext, useContext, useState, type ReactNode } from "react";

export type Role = "admin" | "vendedor" | "dev" | "cliente";

interface AuthContextType {
  role: Role;
  setRole: (role: Role) => void;
  hasAccess: (pageId: string) => boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  role: "admin",
  setRole: () => {},
  hasAccess: () => true,
  setIsLoggedIn: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>("admin");
  const [, setIsLoggedIn] = useState(true);

  const hasAccess = (_pageId: string) => {
    // Basic access control logic can go here, for now allowing everything.
    return true;
  };

  return (
    <AuthContext.Provider value={{ role, setRole, hasAccess, setIsLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

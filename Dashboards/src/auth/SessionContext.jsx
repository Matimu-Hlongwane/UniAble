import { createContext, useContext, useMemo, useState } from "react";
import { ROLES } from "./roles.js";
import { recordAudit } from "../services/auditLog.js";
import { isUsingMockAuth } from "../services/firebase.js";
import { useDirectory } from "../services/directory.js";

const KEY = "uniable.session.v2";
const SessionContext = createContext(null);

function readStored() {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }) {
  const [stored, setStored] = useState(readStored);
  const directory = useDirectory();

  // In demo mode the live directory is authoritative, so a role change or
  // suspension made by an administrator takes effect immediately. With
  // real Firebase, revoke refresh tokens server-side when status changes.
  const user = useMemo(() => {
    if (!stored) return null;
    if (!isUsingMockAuth) return stored;
    const live = directory.users.find((u) => u.uid === stored.uid);
    if (!live || live.status !== "active") return null;
    return { ...stored, role: live.role, name: live.name };
  }, [stored, directory]);

  const api = useMemo(
    () => ({
      user,
      signIn(signedInUser) {
        setStored(signedInUser);
        try {
          window.sessionStorage.setItem(KEY, JSON.stringify(signedInUser));
        } catch {
          // Session lives in memory only.
        }
        if (signedInUser.role !== ROLES.STUDENT) {
          recordAudit({ actor: signedInUser, action: "auth.signin", target: `user:${signedInUser.uid}` });
        }
      },
      signOut() {
        if (user && user.role !== ROLES.STUDENT) {
          recordAudit({ actor: user, action: "auth.signout", target: `user:${user.uid}` });
        }
        setStored(null);
        try {
          window.sessionStorage.removeItem(KEY);
        } catch {
          // Nothing to clear.
        }
      },
    }),
    [user]
  );

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

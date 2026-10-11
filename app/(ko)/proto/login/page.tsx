import { notFound } from "next/navigation";
import LoginPrototype from "./LoginPrototype";

/**
 * A look at the class-channel login window (docs/LOGIN_DECISIONS.md, 11), not a
 * login. Production renders the 404 page, development keeps it open, the same
 * way as app/proto/bread. Nothing links here.
 */
export default function LoginPrototypePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <LoginPrototype />;
}

import { notFound } from "next/navigation";
import BreadPrototype from "./BreadPrototype";

/**
 * A design thought experiment, kept out of public builds: production renders
 * the 404 page, development keeps the prototype open. A private `_folder`
 * would hide it in development too, so the check lives here instead.
 */
export default function BreadPrototypePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <BreadPrototype />;
}

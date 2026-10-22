"use client";

import { createContext, useContext } from "react";

type Role = "admin" | "editor" | "viewer";

const RoleContext = createContext<Role>("viewer");

export function RoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

/** Esconde os botões de escrita para `viewer`. O servidor continua sendo a autoridade: recebe 403. */
export function useCanWrite() {
  return useContext(RoleContext) !== "viewer";
}

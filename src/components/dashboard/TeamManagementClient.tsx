"use client";

import { useState } from "react";

import { Header } from "./Header";
import { TeamManagement } from "./TeamManagement";

export function TeamManagementClient() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <TeamManagement />
    </>
  );
}

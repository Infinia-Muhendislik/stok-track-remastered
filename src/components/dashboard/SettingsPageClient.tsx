"use client";

import { useState } from "react";

import { Header } from "./Header";
import { SettingsPage } from "./SettingsPage";

export function SettingsPageClient() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      <SettingsPage />
    </>
  );
}

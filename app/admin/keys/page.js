"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function KeysPage() {
  const [keys, setKeys] = useState([]);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    const { data, error } = await supabase
      .from("keys")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setKeys(data || []);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        padding: "30px",
        fontFamily: "Arial",
      }}
    >
      <h1>🔑 Quản lý KEY</h1>

      <p>
        Tổng số KEY: {keys.length}
      </p>

      {keys.map((key) => (
        <div
          key={key.id}
          style={{
            background: "#151515",
            padding: "15px",
            marginTop: "10px",
            borderRadius: "10px",
          }}
        >
          <b>{key.key_code}</b>

          <div>
            Trạng thái: {key.status}
          </div>
        </div>
      ))}
    </main>
  );
}

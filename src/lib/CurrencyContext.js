"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState("£"); // Default

  useEffect(() => {
    const fetchCurrency = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get profile
      let { data, error } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user.id)
        .single();

      // If profile exists, use it. If not, we will create it later on save.
      if (data) setCurrency(data.currency);
    };

    fetchCurrency();
  }, []);

  const updateCurrency = (newSymbol) => {
    setCurrency(newSymbol); // Update locally immediately
  };

  return (
    <CurrencyContext.Provider value={{ currency, updateCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

// Custom hook to use it easily in other files
export function useCurrency() {
  return useContext(CurrencyContext);
}

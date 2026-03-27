// hooks/use-cart-page.ts
"use client";
import { useState } from "react";

export const useCartPage = () => {
  const [isCartPageOpen, setIsCartPageOpen] = useState(false);
  
  const openCartPage = () => setIsCartPageOpen(true);
  const closeCartPage = () => setIsCartPageOpen(false);
  
  return {
    isCartPageOpen,
    openCartPage,
    closeCartPage
  };
};

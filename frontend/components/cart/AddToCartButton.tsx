"use client";
import { useCart } from "@/contexts/CardContext";
import { ShoppingCart, Star } from "lucide-react";

type CartButtonProps = {
  onOpenCart: () => void;
};

export const CartButton = ({ onOpenCart }: CartButtonProps) => {
  const { state } = useCart();

  return (
    <button
      onClick={onOpenCart}
      className="group relative p-4 rounded-xl bg-card border-2 border-border hover:border-primary transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl"
      aria-label="Open shopping cart"
    >
      <ShoppingCart className="h-6 w-6 text-foreground group-hover:text-primary transition-colors duration-300" />

      {state.itemCount > 0 && (
        <>
          <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full red-gradient text-xs text-primary-foreground flex items-center justify-center font-bold shadow-lg animate-bounce">
            {state.itemCount > 99 ? "99+" : state.itemCount}
          </span>
          <Star className="absolute -top-1 -left-1 h-4 w-4 text-primary animate-pulse" />
        </>
      )}
    </button>
  );
};

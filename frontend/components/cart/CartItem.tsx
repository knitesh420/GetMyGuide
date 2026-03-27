"use client";
import { useState } from "react";
import { useCart, TourItem } from "@/contexts/CardContext";
import { Minus, Plus, Trash2, Package, MapPin, Calendar } from "lucide-react";
import Image from "next/image";

type CartItemProps = {
  item: TourItem;
};

export const CartItem = ({ item }: CartItemProps) => {
  const { dispatch } = useCart();
  const [isRemoving, setIsRemoving] = useState(false);

  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) {
      setIsRemoving(true);
      setTimeout(() => {
        dispatch({ type: "REMOVE_ITEM", payload: item.id });
      }, 300);
      return;
    }
    dispatch({
      type: "UPDATE_QUANTITY",
      payload: { id: item.id, quantity: newQuantity },
    });
  };

  const removeItem = () => {
    setIsRemoving(true);
    setTimeout(() => {
      dispatch({ type: "REMOVE_ITEM", payload: item.id });
    }, 300);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl bg-white/10 backdrop-blur-lg border border-white/20 hover:border-primary/40 transition-all duration-500 ${
        isRemoving ? "animate-scale-out opacity-0" : ""
      }`}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative p-6">
        <div className="flex items-start gap-6">
          {/* Item Image with Glassmorphism */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-lg border border-white/20 group-hover:scale-105 transition-transform duration-300">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Floating badges */}
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
              <MapPin className="h-3 w-3 text-white" />
            </div>
          </div>

          {/* Item Details */}
          <div className="flex-1 min-w-0">
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                  {item.name}
                </h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Premium Tour Package
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    ₹{item.price.toLocaleString()}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Total: ₹{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-end gap-4">
            {/* Quantity Controls */}
            <div className="flex items-center bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-1">
              <button
                onClick={() => updateQuantity(item.quantity - 1)}
                className="p-2 rounded-xl hover:bg-white/20 transition-colors duration-200 group/btn"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
              </button>

              <div className="px-4 py-2 min-w-[3rem] text-center">
                <span className="text-lg font-bold text-foreground">
                  {item.quantity}
                </span>
              </div>

              <button
                onClick={() => updateQuantity(item.quantity + 1)}
                className="p-2 rounded-xl hover:bg-white/20 transition-colors duration-200 group/btn"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
              </button>
            </div>

            {/* Remove Button */}
            <button
              onClick={removeItem}
              className="p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 group/remove"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4 text-red-500 group-hover/remove:scale-110 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

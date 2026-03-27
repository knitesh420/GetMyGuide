"use client";

import { useState } from "react";
// YAHAN SE 'useCart' IMPORT HATA DIYA GAYA HAI
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Plus, Minus } from "lucide-react";

type CartItemType = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

// Placeholder data jab tak aap Redux ya naya context nahi jodte
const getDummyCartState = () => {
  const dummyItems: CartItemType[] = [
    // Aap isko khali `[]` bhi kar sakte hain empty cart dekhne ke liye
    { id: '1', name: 'Heritage Tour', price: 2500, quantity: 1, image: '' },
    { id: '2', name: 'Cooking Class', price: 1800, quantity: 2, image: '' },
  ];
  
  const total = dummyItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return {
    items: dummyItems,
    total: total,
  };
};

export function Cart() {
  // YAHAN 'useCart' KI JAGAH DUMMY DATA USE KIYA GAYA HAI
  const state = getDummyCartState(); 
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-4 w-4" />
          {state.items.length > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
              {state.items.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          {state.items.length === 0 ? (
            <div className="text-center">
              <p>Your cart is empty</p>
            </div>
          ) : (
            <ScrollArea className="h-[80vh]">
              <div className="space-y-4">
                {state.items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between mb-2">
                  <span>Total:</span>
                  <span>₹{state.total.toLocaleString()}</span>
                </div>
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  Checkout
                </Button>
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CartItem({ item }: { item: CartItemType }) {
  // YAHAN SE 'useCart' AUR 'dispatch' HATA DIYA GAYA HAI

  return (
    <div className="flex items-center justify-between space-x-4">
      <div>
        <h4 className="font-medium">{item.name}</h4>
        <p className="text-sm text-gray-500">₹{item.price.toLocaleString()}</p>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Yahan se dispatch ka logic hata diya gaya hai
            alert("Decrement quantity logic needs to be connected.");
          }}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span>{item.quantity}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Yahan se dispatch ka logic hata diya gaya hai
            alert("Increment quantity logic needs to be connected.");
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
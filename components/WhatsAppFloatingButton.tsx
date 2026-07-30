"use client"
import { MessageCircle } from "lucide-react"

interface WhatsAppFloatingButtonProps {
  phoneNumber: string // Format: country code + number (e.g., "919876543210")
  message?: string // Optional pre-filled message
}

export function WhatsAppFloatingButton({ 
  phoneNumber, 
  message = "Hi, I'm interested in booking a tour guide" 
}: WhatsAppFloatingButtonProps) {
  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    window.open(whatsappUrl, "_blank")
  }

  // z-40 is the floating-furniture band (see the z-index scale in globals.css).
  // At z-50 this tied with the navbar and with every inline modal — and because
  // the layout renders it *after* the page, DOM order broke the tie in its
  // favour: the green bubble floated on top of the full-screen image lightbox
  // and the service image modal.
  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-green-600 hover:shadow-xl"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="h-7 w-7" />
      <span className="absolute -top-1 -right-1 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
      </span>
    </button>
  )
}
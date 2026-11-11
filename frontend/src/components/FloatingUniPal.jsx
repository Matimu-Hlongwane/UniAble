import React from "react";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./FloatingUniPal.css";

export default function FloatingUniPal() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="floating-unipal-launcher"
      onClick={() => navigate("/unipal")}
      aria-label="Open UniPal AI Assistant"
      title="Open UniPal AI Assistant"
    >
      <MessageCircle size={25} />
      <span>UniPal AI Assistant</span>
    </button>
  );
}

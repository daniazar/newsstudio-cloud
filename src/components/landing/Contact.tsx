"use client";

import { Mail } from "lucide-react";
import React from "react";
import { ContactModal } from "./ContactModal";

export function Contact() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <section className="relative z-10 py-16 px-6 max-w-4xl mx-auto text-center">
      <h2 
        className="text-[3rem] font-bold tracking-tight mb-6"
        style={{ color: "#e2e8f0" }}
      >
        Selectively Onboarding
      </h2>
      <p className="text-[20px] text-[#cbd5e1] font-medium mb-12">
        We are carefully selecting our first cohort of enterprise customers to ensure the highest quality of service. Contact us to apply for early access.
      </p>
      
      <button 
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-8 py-4 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-[0_0_30px_rgba(59,130,246,0.3)] mx-auto"
        style={{ background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)", fontSize: "18px" }}
      >
        <Mail className="w-5 h-5" /> Contact Sales
      </button>
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}

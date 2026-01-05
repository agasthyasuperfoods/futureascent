"use client";
import { useRouter } from "next/router";

export default function OperationsHome() {
  const router = useRouter();

  /* 🔐 XERO AUTH GUARD */
  async function goToXeroPage(path) {
    const res = await fetch("/api/xero/status");
    const data = await res.json();

    if (!data.connected) {
      window.location.href =
        `/api/xero/login?returnTo=${encodeURIComponent(path)}`;
      return;
    }

    router.push(path);
  }

  return (
    <div className="min-h-screen bg-[#faf7fb]">

      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-violet-200">
        <div className="flex items-center gap-3">
          <img
            src="/fa.jpeg"
            alt="Future Ascent"
            className="h-10 w-auto rounded-lg"
          />
          <h1 className="text-xl font-bold text-violet-700">
            Operations Control Center
          </h1>
        </div>
      </header>

      {/* BODY */}
      <main className="px-8 py-10 max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-8 text-gray-800">
          Core Operations
        </h2>

        {/* OPERATIONS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* 🔥 XERO – BULK INVOICES */}
          <OpCard
            title="Bulk Invoice Creation (Xero)"
            desc="Generate, review and approve bulk invoices for multiple orders."
            
            button="Create Bulk Invoices"
            onClick={() => goToXeroPage("/xero/invoices")}
          />

          {/* 🔥 XERO – CREATE CUSTOMER */}
          <OpCard
            title="Create Customer (Xero)"
            desc="Create & sync customers with billing and delivery details."
            button="Create Customer"
            onClick={() => goToXeroPage("/Createcustomers")}
          />

          {/* 🧠 RETAILER MASTER DATA */}
          <OpCard
            title="Retailer Master Data"
            desc="Maintain retailer address,  contact & delivery master data."
            button="Manage Retailers"
            onClick={() => router.push("/Manageretailer")}
          />

          {/* SORTED – BULK TURN IN */}
          <OpCard
            title="Bulk Turn-In Order Creation (Sorted)"
            desc="Create turn-in orders in bulk for inbound warehouse processing."
            button="Create Turn-In Orders"
            onClick={() => router.push("/sorted/turnin/create")}
          />

          {/* SORTED – ACCEPT TURN IN */}
          <OpCard
            title="Accept Turn-In Orders (Sorted)"
            desc="Accept and confirm pending turn-in orders."
            button="Accept Turn-In Orders"
            onClick={() => router.push("/sorted/turnin/accept")}
          />

          {/* COGHLAN */}
          <OpCard
            title="Create Orders (Coghlan)"
            desc="Create outbound orders and attach shipping labels."
            button="Create Orders"
            onClick={() => router.push("/coghlan/orders")}
          />

          {/* EMAIL */}
          <OpCard
            title="Email Automation"
            desc="Send invoices, order confirmations and shipment notifications."
            button="Send Emails"
            onClick={() => router.push("/emails")}
          />

        </div>
      </main>
    </div>
  );
}

/* ----------------- CARD COMPONENT ----------------- */

function OpCard({ title, desc, button, onClick, primary }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition
      ${primary ? "border-pink-400" : "border-violet-200"}`}
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {title}
      </h3>

      <p className="text-sm text-gray-600 mb-6">
        {desc}
      </p>

      <button
        onClick={onClick}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition
        ${
          primary
            ? "bg-pink-600 text-white hover:bg-pink-700"
            : "bg-violet-600 text-white hover:bg-violet-700"
        }`}
      >
        {button}
      </button>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ManageRetailers() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [retailers, setRetailers] = useState([]);

  useEffect(() => {
    fetchRetailers();
  }, []);

  async function fetchRetailers() {
    try {
      const res = await fetch("/api/retailers/list");
      const data = await res.json();
      setRetailers(data.retailers || []);
    } catch (err) {
      console.error("Failed to fetch retailers", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf7fb]">

      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-5 bg-white border-b border-violet-200">
        <h1 className="text-xl font-bold text-violet-700">
          Manage Retailers
        </h1>

        <button
          onClick={() => router.push("/")}
          className="text-sm text-violet-600 hover:underline"
        >
          ← Home
        </button>
      </header>

      <main className="px-8 py-10 max-w-7xl mx-auto">

        {loading ? (
          <p className="text-sm">⏳ Loading retailers…</p>
        ) : (
          <div className="bg-white rounded-2xl shadow p-6">

            <h2 className="text-lg font-semibold mb-4">
              Retailer Master List
            </h2>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Account ID</th>
                  <th className="p-2 text-left">Retailer Name</th>
                  <th className="p-2 text-left">City</th>
                  <th className="p-2 text-left">State</th>
                  <th className="p-2 text-left">Postcode</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Source</th>
                </tr>
              </thead>

              <tbody>
                {retailers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-4 text-center text-gray-500">
                      No retailers found
                    </td>
                  </tr>
                )}

                {retailers.map((r) => (
                  <tr key={r.account_id} className="border-t">
                    <td className="p-2">{r.account_id}</td>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2">{r.city || "-"}</td>
                    <td className="p-2">{r.region || "-"}</td>
                    <td className="p-2">{r.postal_code || "-"}</td>
                    <td className="p-2">
                      {r.is_active ? (
                        <span className="text-green-600 font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="text-red-600 font-semibold">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-2">{r.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>
        )}
      </main>
    </div>
  );
}

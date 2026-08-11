"use client";

import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Building2, Clock3, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import SearchBar from "@/components/ui/SearchBar";

const stats = [
  { label: "Verified listings", value: "1,200+" },
  { label: "Fast-track cases", value: "24h" },
  { label: "Manager response SLA", value: "10m" },
];

export default function HomePage() {
  const location = useLocation();
  const marketParam = new URLSearchParams(location.search).get("market");
  const _searchHref = marketParam ? `/search?market=${encodeURIComponent(marketParam)}` : "/search";

  return (
    <div className="bg-white text-gray-950">
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden sm:min-h-[calc(100vh-5rem)]">
        <img
          src="/modern-apartment.png"
          alt="Modern apartment interior"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/58" />
        <div className="page-shell relative flex min-h-[calc(100vh-4rem)] flex-col justify-center py-16 text-white sm:min-h-[calc(100vh-5rem)] sm:py-20">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <BadgeCheck className="h-4 w-4 text-orange-200" />
              Property journeys with live manager workflows
            </div>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Find verified spaces and move faster from search to completion.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 sm:text-lg">
              Estospaces connects public property discovery with fast-track booking, evidence review, messaging, contracts, and manager operations.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <SearchBar variant="hero" className="max-w-3xl" />
              <Link
                to="/contact"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-white"
              >
                List your property
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div
            data-testid="home-hero-stats"
            className="mt-10 w-full border-t border-white/15 bg-black/25 backdrop-blur sm:mt-12"
          >
            <div className="grid gap-0 divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {stats.map((item) => (
                <div key={item.label} className="py-5">
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="mt-1 text-sm text-white/80">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-5 py-14 md:grid-cols-3">
        {[
          {
            icon: Building2,
            title: "Public discovery",
            copy: "Search verified sale and rental listings with clear filters, saved searches, and property detail pages.",
          },
          {
            icon: Clock3,
            title: "Fast-track progress",
            copy: "Move from selected property to document review, viewing, application, and contract milestones.",
          },
          {
            icon: ShieldCheck,
            title: "Managed operations",
            copy: "Give property managers the tools to respond, audit, message, and keep cases moving.",
          },
        ].map((item) => (
          <article key={item.title} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <item.icon className="h-6 w-6 text-orange-500" />
            <h2 className="mt-5 text-lg font-bold text-gray-950">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">{item.copy}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

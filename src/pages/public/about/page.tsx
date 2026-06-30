"use client";

import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Compass, MessagesSquare, ShieldCheck } from "lucide-react";

const pillars = [
  "Search and compare verified listings without signing in.",
  "Start a fast-track journey when a property is ready to move.",
  "Keep users, brokers, and property managers aligned through messaging and audit history.",
];

export default function AboutPage() {
  return (
    <div className="bg-white text-gray-950">
      <section className="relative overflow-hidden bg-[#17120f] text-white">
        <img
          src="/city-blur.png"
          alt="City skyline"
          className="absolute inset-0 h-full w-full object-cover opacity-48"
        />
        <div className="absolute inset-0 bg-black/52" />
        <div className="page-shell relative py-20 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">About Estospaces</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
              A property platform built for live journeys, not static listings.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/78 sm:text-lg">
              Estospaces brings discovery, fast-track progression, document evidence, viewing coordination, contracts, and property manager operations into one connected workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-10 py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-950">What we are solving</h2>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            Property decisions usually span search, documents, appointments, applications, sale offers, contracts, and handover steps. Estospaces gives users and property managers one place to keep that work visible and moving.
          </p>
          <div className="mt-6 space-y-3">
            {pillars.map((pillar) => (
              <div key={pillar} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                <p className="text-sm leading-6 text-gray-700">{pillar}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: Compass,
              title: "Search",
              copy: "Public users can browse and inspect listings before creating an account.",
            },
            {
              icon: ShieldCheck,
              title: "Evidence",
              copy: "Verification and case-file steps are tracked instead of scattered across inboxes.",
            },
            {
              icon: MessagesSquare,
              title: "Messaging",
              copy: "Conversations stay close to the property, case, and next action.",
            },
            {
              icon: ArrowRight,
              title: "Handoff",
              copy: "Managers can advance applications, viewings, offers, and contracts from one workspace.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <item.icon className="h-5 w-5 text-orange-500" />
              <h3 className="mt-4 text-base font-bold text-gray-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-shell pb-16">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Work with Estospaces</h2>
            <p className="mt-2 text-sm text-white/68">Talk to us about listings, workflows, or platform partnerships.</p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Contact us
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

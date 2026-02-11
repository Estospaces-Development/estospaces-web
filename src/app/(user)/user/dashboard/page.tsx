import { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: "Dashboard | EstoSpaces",
  description: "Manage your property journey, track applications, and discover new spaces near you.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}

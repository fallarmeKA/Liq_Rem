import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Settings,
  User,
  Receipt,
  FileText,
  Clock,
  CheckCircle,
  Upload,
  Filter,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../supabase/auth";

export default function LandingPage() {
  const { user, signOut } = useAuth();

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Clean navigation */}
      <header className="fixed top-0 z-50 w-full bg-[rgba(255,255,255,0.95)] backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center">
            <Link to="/" className="font-semibold text-xl text-gray-900">
              Liquidation Portal
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 hover:cursor-pointer">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                        alt={user.email || ""}
                      />
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-xl border-none shadow-lg"
                  >
                    <DropdownMenuLabel className="text-xs text-gray-500">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => signOut()}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-sm px-6 h-10">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero section */}
        <section className="py-24 px-6 text-center bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Liquidation & Reimbursement
              <span className="block text-gray-600">Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
              A clean, minimalist portal for submitting, tracking, and managing
              your liquidation and reimbursement requests with ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <Link to="/dashboard">
                  <Button className="bg-gray-900 text-white hover:bg-gray-800 px-8 py-3 text-lg rounded-lg">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/signup">
                    <Button className="bg-gray-900 text-white hover:bg-gray-800 px-8 py-3 text-lg rounded-lg">
                      Get Started
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="outline"
                      className="px-8 py-3 text-lg rounded-lg border-gray-300"
                    >
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Streamline your expense management with our comprehensive suite
                of tools
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center p-6">
                <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Smart Forms
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Intuitive liquidation and reimbursement forms with itemized
                  entry fields and validation
                </p>
              </div>

              <div className="text-center p-6">
                <div className="h-16 w-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Receipt Upload
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Seamless receipt upload functionality with drag-and-drop
                  support and file validation
                </p>
              </div>

              <div className="text-center p-6">
                <div className="h-16 w-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Real-time Tracking
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Track submission status in real-time with detailed approval
                  workflows and notifications
                </p>
              </div>

              <div className="text-center p-6">
                <div className="h-16 w-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Filter className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Smart History
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Filterable, sortable submission history with detailed views
                  and export capabilities
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Preview */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Centralized Dashboard
              </h2>
              <p className="text-xl text-gray-600">
                Your central hub for managing all liquidation and reimbursement
                activities
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                      Recent Submissions
                    </h4>
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">12</p>
                  <p className="text-sm text-gray-600">This month</p>
                </div>

                <div className="bg-green-50 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Approved</h4>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">8</p>
                  <p className="text-sm text-gray-600">Processed</p>
                </div>

                <div className="bg-orange-50 p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">Pending</h4>
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">4</p>
                  <p className="text-sm text-gray-600">Under review</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="flex-1 bg-gray-900 text-white hover:bg-gray-800 py-3">
                  <Receipt className="h-4 w-4 mr-2" />
                  New Liquidation
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-300 py-3"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  New Reimbursement
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Security & Trust */}
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Secure & Reliable
            </h2>
            <p className="text-xl text-gray-600 mb-12">
              Built with enterprise-grade security and powered by Supabase for
              reliable data management
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6">
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Secure Authentication
                </h3>
                <p className="text-gray-600 text-sm">
                  Multi-factor authentication and secure user management
                </p>
              </div>

              <div className="p-6">
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Data Protection
                </h3>
                <p className="text-gray-600 text-sm">
                  End-to-end encryption and compliance with data regulations
                </p>
              </div>

              <div className="p-6">
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="h-6 w-6 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  High Performance
                </h3>
                <p className="text-gray-600 text-sm">
                  Fast, responsive interface with real-time updates
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">
                Liquidation Portal
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Streamline your expense management with our intuitive
                liquidation and reimbursement platform.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Forms
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    History
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Reports
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Status
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/"
                    className="hover:text-gray-900 transition-colors"
                  >
                    Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500 text-center">
              © 2025 Liquidation Portal. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

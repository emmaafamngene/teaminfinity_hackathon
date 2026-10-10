"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Package,
  Search,
  UserRound,
} from "lucide-react";
import { useMarket } from "@/components/market-provider";
import { Button } from "@/components/ui/button";
import { isStudent, isVendorAccount } from "@/lib/permissions";
export function MarketShell({ children }: { children: ReactNode }) {
  const { error, user, ready } = useMarket();
  const [search, setSearch] = useState("");
  return (
    <>
      <div className="market-topline">
        <span>Made for PAU. Built by students.</span>
        <Link
          href={
            isStudent(user)
              ? "/account/orders"
              : isVendorAccount(user)
                ? "/vendor/application-status"
                : user?.role === "admin"
                  ? "/admin"
                  : "/register/vendor"
          }
        >
          {isStudent(user)
            ? "Track your orders"
            : user?.role === "admin"
              ? "Administrator workspace"
              : "Your vendor workspace"}
          <ArrowUpRight size={12} />
        </Link>
      </div>
      <header className="market-header">
        <Link href="/" className="brand">
          <span className="brand-mark">✳</span>campus
          <span className="font-normal -ml-2">connect</span>
        </Link>
        <form action="/search" className="header-search">
          <Search size={19} />
          <input
            name="q"
            aria-label="Search marketplace"
            placeholder="Search products, services and businesses"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button size="sm">Search</Button>
        </form>
        <Link href={user ? "/account" : "/login"} className="account-link">
          <UserRound size={20} />
          <span>{user ? user.full_name.split(" ")[0] : "Sign in"}</span>
        </Link>
        {(!user || isStudent(user)) && (
          <Link href="/marketplace?saved=1" className="account-link">
            <Bookmark size={19} />
            <span>Saved</span>
          </Link>
        )}
      </header>
      <nav className="market-nav">
        <Link href="/marketplace">
          <Package size={14} />
          Marketplace
        </Link>
        <Link href="/businesses">Businesses</Link>
        {(!user || isStudent(user)) && <Link href="/compare">Compare picks</Link>}
        
        <Link href="/categories/food-drinks">Food & drinks</Link>
        <Link href="/categories/fashion-beauty">Fashion & beauty</Link>
        <Link href="/categories/design-tech">Design & tech</Link>
        <Link href="/categories/learning">Academic services</Link>
        {(isVendorAccount(user) || !user) && (
          <Link
            href={
              user
                ? user.role === "vendor"
                  ? "/vendor/dashboard"
                  : "/vendor/application-status"
                : "/register/vendor"
            }
            className="nav-vendor"
          >
            Vendor portal
            <ArrowUpRight size={13} />
          </Link>
        )}
        {isStudent(user) && <Link href="/account/orders">My orders</Link>}
        {user?.role === "admin" && <Link href="/admin">Admin</Link>}
      </nav>
      {error && (
        <p className="market-error" role="alert">
          {error}
        </p>
      )}
      {!ready && (
        <div className="market-loading" role="status">
          Loading your campus marketplace…
        </div>
      )}
      <main className="market-main">{children}</main>
      <footer className="market-footer">
        <div>
          <Link className="brand" href="/">
            ✳ campusconnect
          </Link>
          <p>
            Your campus marketplace.
            <br />
            Discover local talent. Support student businesses.
          </p>
        </div>
        <div>
          <strong>Explore</strong>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/businesses">Student businesses</Link>
        </div>
        <div>
          <strong>Build with us</strong>
          {(isVendorAccount(user) || !user) && (
            <Link href={user ? "/vendor/apply" : "/register/vendor"}>
              Become a vendor
            </Link>
          )}
          {isVendorAccount(user) && (
            <Link href="/vendor/application-status">Application status</Link>
          )}
          <Link href="/account">Your account</Link>
        </div>
        <p>
          Campus Connect · PAU
          <br />
          Student-owned. Campus-grown.
        </p>
      </footer>
    </>
  );
}

import Link from "next/link";
import { ShoppingBag, Star, Truck, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Landing() {
  return <div className="landing">
    <header className="landing-header"><Link className="landing-brand" href="/">Campus<span>Connect</span></Link><nav><Link href="/marketplace">Explore</Link><Link href="/login">Log in</Link><Button asChild><Link href="/register">Sign up <ArrowUpRight size={16} /></Link></Button></nav></header>
    <main>
      <section className="landing-hero"><div><span className="eyebrow">MADE FOR THE PAU COMMUNITY</span><h1>Your campus.<br />Your people.<br /><em>Your marketplace.</em></h1><p>Find your next favourite meal, a designer for your event, or a service that makes student life easier. Discover what students around you have to offer.</p><div className="form-actions"><Button asChild><Link href="/register">Join Campus Connect <ArrowUpRight size={18} /></Link></Button><Button variant="outline" asChild><Link href="/marketplace">Browse the marketplace</Link></Button></div><small>Shop as a student. Grow your business as a vendor.</small></div><div className="landing-feature"><span className="eyebrow">GOOD FINDS. RIGHT ON CAMPUS.</span><ShoppingBag size={64} strokeWidth={1.3}/><h2>A little closer.<br />A lot more connected.</h2><p>Food · Fashion · Design · Tutoring · Everyday services</p><div className="landing-note"><Star size={20}/><span>Real buyer ratings.<br />Student-owned businesses.</span></div></div></section>
      <section className="landing-benefits"><article><ShoppingBag/><h2>Find what you need</h2><p>Explore products and services from student sellers in one place.</p></article><article><Truck/><h2>Choose how you receive it</h2><p>Pick up on campus or add a delivery location. Pay when you receive your order.</p></article><article><Star/><h2>Share your experience</h2><p>Rate sellers after your order and help other students find their favourites.</p></article></section>
      <section className="landing-join"><div><h2>Something to sell? You belong here too.</h2><p>Create a vendor account, set up your storefront, and reach your campus community.</p></div><Button asChild><Link href="/register?type=vendor">Become a vendor <ArrowUpRight size={17}/></Link></Button></section>
    </main><footer className="landing-footer">Campus Connect · Built for students, by students.<Link href="/login">Already a member? Log in</Link></footer>
  </div>;
}

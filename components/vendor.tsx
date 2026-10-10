"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Clock3,
  FileCheck2,
  Package,
  Plus,
  ShieldCheck,
  Store,
} from "lucide-react";
import { MarketShell } from "@/components/market-shell";
import { useMarket } from "@/components/market-provider";
import { Button } from "@/components/ui/button";
import { Reviews } from "@/components/reviews";

import { ProductImage } from "@/components/product-image";
import { categories, formatPrice } from "@/lib/businesses";
import { api } from "@/lib/api-client";
import { validateUploadMeta } from "@/lib/security";
export function VendorNav() {
  return (
    <div className="dashboard-tabs">
      <Link href="/vendor/dashboard">Overview</Link>
      <Link href="/vendor/products">Products</Link>
      <Link href="/vendor/orders">Orders</Link>
      <Link href="/vendor/business">Business profile</Link>
      <Link href="/vendor/reviews">Customer reviews</Link>
    </div>
  );
}
export function VendorApply() {
  const { state, user, ready, refresh } = useMarket();
  const router = useRouter();
  const existing = state.vendors.find((v) => v.ownerId === user?.id);
  const [step, setStep] = useState(1);
  const [id, setId] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (existing?.status === "pending" && !existing.evidence.length) {
      setId(existing.id);
      setStep(2);
    }
  }, [existing?.id, existing?.status]);
  async function details(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = new FormData(e.currentTarget);
      const values = Object.fromEntries(d.entries());
      const result = await api<{ id: string }>("/api/applications", "POST", {
        ...values,
        phone: String(values.phone).replace(/^\+/, ""),
      });
      setId(result.id);
      setStep(2);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your application.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File, kind: string) {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    body.set("entity_id", id);
    return (await api<{ path: string }>("/api/uploads", "POST", body)).path;
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!logo || !files.length) {
      setError("Select a logo and at least one ownership evidence file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const logoPath = await upload(logo, "logo");
      const paths: string[] = [];
      for (const file of files) paths.push(await upload(file, "evidence"));
      await api(`/api/applications/${id}`, "PATCH", {
        logo_path: logoPath,
        evidence_paths: paths,
      });
      await refresh();
      router.push("/vendor/application-status");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Upload failed. You can resume verification from this page.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <MarketShell>
        <p role="status">Loading application…</p>
      </MarketShell>
    );
  if (
    existing &&
    !["rejected", "needs_information"].includes(existing.status) &&
    !(existing.status === "pending" && !existing.evidence.length) &&
    !(id && step === 2)
  )
    return <ApplicationStatus />;
  return (
    <MarketShell>
      <div className="application-layout">
        <aside>
          <span className="eyebrow">BECOME A CAMPUS VENDOR</span>
          <h1>
            Your business.
            <br />
            Your storefront.
            <br />
            <span>Your campus.</span>
          </h1>
          <p>
            Introduce your business, provide ownership evidence, and get
            reviewed before publication.
          </p>
          <ol className="application-steps">
            <li className={step === 1 ? "current" : "done"}>
              <span>{step === 2 ? <Check size={15} /> : "1"}</span>
              <div>
                <strong>Business details</strong>
                <small>Introduce your business</small>
              </div>
            </li>
            <li className={step === 2 ? "current" : ""}>
              <span>2</span>
              <div>
                <strong>Verification</strong>
                <small>Private ownership evidence</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Admin review</strong>
                <small>Approval before publication</small>
              </div>
            </li>
          </ol>
          <div className="application-note">
            <ShieldCheck size={21} />
            <p>
              Your evidence is stored privately and accessible to you and
              authorized administrators.
            </p>
          </div>
        </aside>
        <section className="application-card">
          <span className="eyebrow">STEP {step} OF 2</span>
          <h2>
            {step === 1
              ? "Tell us about your business"
              : "Verify your business"}
          </h2>
          <p className="dialog-description">
            {step === 1
              ? `Applying as ${user?.full_name}. Your identity comes from your account.`
              : "JPEG, PNG, WebP or PDF evidence, up to 5 MB each. Use a portfolio or ownership statement; avoid unnecessary personal documents."}
          </p>
          {step === 1 ? (
            <form className="listing-form" onSubmit={details}>
              <label>
                Business name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={60}
                  defaultValue={existing?.name}
                />
              </label>
              <label>
                Category
                <select name="category" defaultValue={existing?.category}>
                  {categories.slice(1).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  required
                  minLength={10}
                  maxLength={1000}
                  defaultValue={existing?.description}
                />
              </label>
              <label>
                WhatsApp contact
                <input
                  name="phone"
                  type="tel"
                  required
                  pattern="[+]?[0-9]{10,15}"
                  defaultValue={existing?.phone}
                  placeholder="2348012345678"
                />
              </label>
              <div className="form-columns">
                <label>
                  Location
                  <input
                    name="location"
                    required
                    minLength={2}
                    maxLength={120}
                    defaultValue={existing?.location}
                  />
                </label>
                <label>
                  Opening hours
                  <input
                    name="hours"
                    maxLength={80}
                    defaultValue={existing?.hours || "Mon–Fri · 9am–6pm"}
                  />
                </label>
              </div>
              <label className="checkbox-label consent">
                <input type="checkbox" required />I understand my business needs
                approval before publication.
              </label>
              <Button disabled={busy} className="w-full">
                {busy ? "Saving…" : "Continue to verification"}
                <ArrowRight size={15} />
              </Button>
            </form>
          ) : (
            <form className="listing-form" onSubmit={submit}>
              <label className="upload-field">
                <Store size={25} />
                <strong>Business logo</strong>
                <small>{logo?.name || "JPEG, PNG or WebP · up to 5 MB"}</small>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setLogo(e.target.files?.[0] || null)}
                />
              </label>
              <label className="upload-field">
                <FileCheck2 size={25} />
                <strong>Ownership evidence</strong>
                <small>
                  {files.map((f) => f.name).join(", ") ||
                    "Up to four images or PDFs · 5 MB each"}
                </small>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const f = Array.from(e.target.files || []);
                    if (f.length > 4) {
                      setError("Select up to four evidence files.");
                      return;
                    }
                    setFiles(f);
                  }}
                />
              </label>
              <Button disabled={busy} className="w-full">
                {busy ? "Uploading verification…" : "Submit for review"}
                <ArrowRight size={15} />
              </Button>
            </form>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
    </MarketShell>
  );
}
export function ApplicationStatus() {
  const { state, user, ready } = useMarket();
  const vendor = state.vendors.find((v) => v.ownerId === user?.id);
  const history = state.history.filter((h) => h.businessId === vendor?.id);
  return (
    <MarketShell>
      <div className="status-page">
        <span className="eyebrow">VENDOR PORTAL</span>
        <h1>Your application</h1>
        {!ready ? (
          <p>Loading…</p>
        ) : !vendor ? (
          <div className="status-card">
            <Store size={35} />
            <h2>Bring your business to campus.</h2>
            <p>You haven’t applied yet.</p>
            <Button asChild>
              <Link href="/vendor/apply">Start your application</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="status-card">
              <span className={`status-badge ${vendor.status}`}>
                {vendor.status.replaceAll("_", " ")}
              </span>
              <h2>{vendor.name}</h2>
              <p>
                {vendor.status === "approved"
                  ? "Your business is approved. Manage your products and storefront."
                  : vendor.status === "pending"
                    ? "Your business stays private during review. Product publishing is locked."
                    : vendor.status === "suspended"
                      ? "Your business is suspended and no longer publicly discoverable."
                      : "Review the feedback below, update your application, and resubmit."}
              </p>
              <div className="status-next">
                <Clock3 size={16} />
                Submitted{" "}
                {new Date(vendor.submittedAt).toLocaleDateString("en-GB", {
                  timeZone: "Africa/Lagos",
                })}
              </div>
              {vendor.status === "approved" ? (
                <Button asChild>
                  <Link href="/vendor/dashboard">
                    Open vendor dashboard
                    <ArrowRight size={15} />
                  </Link>
                </Button>
              ) : ["rejected", "needs_information"].includes(vendor.status) ? (
                <Button asChild>
                  <Link href="/vendor/apply">Revise and resubmit</Link>
                </Button>
              ) : vendor.status === "pending" && !vendor.evidence.length ? (
                <Button asChild>
                  <Link href="/vendor/apply">Complete verification upload</Link>
                </Button>
              ) : null}
            </div>
            {history.length > 0 && (
              <section className="review-history">
                <h3>Review history</h3>
                {history.map((h) => (
                  <div key={h.id}>
                    <span className={`status-badge ${h.status}`}>
                      {h.status.replaceAll("_", " ")}
                    </span>
                    <p>{h.note || "Application approved."}</p>
                    <small>
                      Reviewed{" "}
                      {new Date(h.at).toLocaleString("en-GB", {
                        timeZone: "Africa/Lagos",
                      })}
                    </small>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </MarketShell>
  );
}
export function VendorDashboard({
  view = "overview",
}: {
  view?: "overview" | "products" | "business" | "reviews";
}) {
  const { state, user, ready, mutate } = useMarket();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const vendor = state.vendors.find((v) => v.ownerId === user?.id);
  if (!ready)
    return (
      <MarketShell>
        <p>Loading vendor workspace…</p>
      </MarketShell>
    );
  if (!vendor || vendor.status !== "approved") return <ApplicationStatus />;
  const products = state.products.filter((p) => p.businessId === vendor.id);
  async function profile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    if (
      await mutate("/api/vendor/business", "PATCH", {
        ...data,
        phone: String(data.phone).replace(/^\+/, ""),
      })
    )
      setMessage("Your storefront details are saved.");
    setBusy(false);
  }
  async function remove(id: string) {
    if (
      !window.confirm(
        "Permanently delete this product and queue its unused images for removal?",
      )
    )
      return;
    if (await mutate(`/api/vendor/products/${id}`, "DELETE")) {
      try {
        await api("/api/cleanup", "POST");
      } catch {
        setMessage("Product deleted. Image cleanup is queued for retry.");
      }
    }
  }
  return (
    <MarketShell>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">VENDOR WORKSPACE</span>
          <h1>
            {view === "overview"
              ? `Welcome, ${user?.full_name.split(" ")[0]}.`
              : view === "products"
                ? "Your products & services"
                : view === "business"
                  ? "Your business profile"
                  : "Customer reviews"}
          </h1>
          <p>{vendor.name} · Approved business</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/businesses/${vendor.slug}`}>View storefront</Link>
        </Button>
      </div>
      <VendorNav />
      {message && (
        <p className="success-banner" role="status">
          {message}
        </p>
      )}
      {view === "overview" ? (
        <>
          
          <div className="dashboard-stats">
            <div>
              <Package />
              <strong>{products.filter((p) => p.active).length}</strong>
              <span>Published products</span>
            </div>
            <div>
              <Store />
              <strong>{products.filter((p) => !p.active).length}</strong>
              <span>Draft or archived products</span>
            </div>
            <div>
              <ShieldCheck />
              <strong>Approved</strong>
              <span>Business status</span>
            </div>
          </div>
          <section className="workspace-panel mt-6">
            <h2>Make your storefront yours.</h2>
            <p className="dialog-description">
              Add products with photos, keep your details current, and read
              customer feedback.
            </p>
            <div className="form-actions">
              <Button asChild>
                <Link href="/vendor/products/new">
                  <Plus size={15} />
                  Add product
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/vendor/products">Manage products</Link>
              </Button>
            </div>
          </section>
        </>
      ) : view === "products" ? (
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>Your listings</h2>
            <Button asChild>
              <Link href="/vendor/products/new">
                <Plus size={15} />
                Add product
              </Link>
            </Button>
          </div>
          {products.length === 0 ? (
            <div className="empty-state">
              <Package size={30} />
              <h3>Add your first product or service</h3>
              <p>Publish with images and a clear description.</p>
            </div>
          ) : (
            <div className="managed-products">
              {products.map((p) => (
                <article key={p.id}>
                  <span className="managed-art relative">
                    <ProductImage src={p.images?.[0]} alt={p.name} />
                  </span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {formatPrice(p.price)} ·{" "}
                      {p.active ? "Published" : "Draft / archived"}
                    </small>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/vendor/products/${p.id}/edit`}>Edit</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      mutate(`/api/vendor/products/${p.id}`, "PATCH", {
                        active: !p.active,
                      })
                    }
                  >
                    {p.active ? "Archive" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(p.id)}
                  >
                    Delete
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : view === "business" ? (
        <section className="workspace-panel">
          <h2>Business details</h2>
          <form className="listing-form narrow-form" onSubmit={profile}>
            <label>
              Description
              <textarea
                name="description"
                required
                minLength={10}
                maxLength={1000}
                defaultValue={vendor.description}
              />
            </label>
            <label>
              WhatsApp contact
              <input
                name="phone"
                required
                pattern="[+]?[0-9]{10,15}"
                defaultValue={vendor.phone}
              />
            </label>
            <label>
              Location
              <input
                name="location"
                required
                minLength={2}
                maxLength={120}
                defaultValue={vendor.location}
              />
            </label>
            <label>
              Opening hours
              <input
                name="hours"
                required
                minLength={2}
                maxLength={80}
                defaultValue={vendor.hours}
              />
            </label>
            <Button disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
          </form>
        </section>
      ) : (
        <Reviews businessId={vendor.id} vendorView />
      )}
    </MarketShell>
  );
}
type ImageChoice = { key: string; preview: string; path?: string; file?: File };
export function ProductEditor({ id }: { id?: string }) {
  const { state, user, ready, refresh } = useMarket();
  const router = useRouter();
  const vendor = state.vendors.find((v) => v.ownerId === user?.id);
  const product = state.products.find(
    (p) => p.id === id && p.businessId === vendor?.id,
  );
  const [choices, setChoices] = useState<ImageChoice[]>([]);
  const previewUrls = useRef<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draftId, setDraftId] = useState(id || "");
  useEffect(() => {
    if (ready && !initialized) {
      setChoices(
        product?.imagePaths?.map((path, i) => ({
          key: path,
          path,
          preview: product.images?.[i] || "/product-fallback.svg",
        })) || [],
      );
      setInitialized(true);
    }
  }, [ready, product?.id, initialized]);
  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  function selectFiles(files: File[]) {
    try {
      if (files.length + choices.length > 6)
        throw new Error("Use at most six product images.");
      files.forEach((f) => validateUploadMeta(f.size, f.type));
      setChoices([
        ...choices,
        ...files.map((file) => {
          const preview = URL.createObjectURL(file);
          previewUrls.current.push(preview);
          return { key: crypto.randomUUID(), file, preview };
        }),
      ]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid image.");
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = new FormData(e.currentTarget);
    const input = {
      name: String(d.get("name")),
      description: String(d.get("description")),
      category: String(d.get("category")),
      price: Number(d.get("price")),
      available: d.get("available") === "on",
    };
    let target = draftId;
    const uploaded: string[] = [];
    try {
      if (!target) {
        target = (
          await api<{ id: string }>("/api/vendor/products", "POST", input)
        ).id;
        setDraftId(target);
      }
      const paths: string[] = [];
      for (const choice of choices) {
        if (choice.path) paths.push(choice.path);
        else if (choice.file) {
          const form = new FormData();
          form.set("file", choice.file);
          form.set("kind", "product");
          form.set("entity_id", target);
          const result = await api<{ path: string }>(
            "/api/uploads",
            "POST",
            form,
          );
          uploaded.push(result.path);
          paths.push(result.path);
        }
      }
      await api(`/api/vendor/products/${target}`, "PATCH", {
        ...input,
        image_paths: paths,
        active: true,
      });
      try {
        await api("/api/cleanup", "POST");
      } catch {
        /* Persisted cleanup jobs can be retried safely. */
      }
      await refresh();
      router.push("/vendor/products");
    } catch (e) {
      if (uploaded.length) {
        try {
          await api("/api/uploads", "DELETE", { paths: uploaded });
        } catch {
          /* Unreferenced uploads stay private; removal can be retried. */
        }
      }
      setError(e instanceof Error ? e.message : "Could not save this product.");
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <MarketShell>
        <p>Loading product editor…</p>
      </MarketShell>
    );
  if (!vendor || vendor.status !== "approved") return <ApplicationStatus />;
  if (id && !product)
    return (
      <MarketShell>
        <div className="empty-state">
          <h1>Product not found</h1>
          <p>You may only edit products owned by your approved business.</p>
          <Link href="/vendor/products">Back to your products</Link>
        </div>
      </MarketShell>
    );
  return (
    <MarketShell>
      <div className="dashboard-heading">
        <h1>{id ? "Edit your product" : "Add a product or service"}</h1>
      </div>
      <VendorNav />
      <section className="workspace-panel">
        <form className="listing-form narrow-form" onSubmit={save}>
          <label>
            Product name
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={product?.name}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={2000}
              defaultValue={product?.description}
            />
          </label>
          <div className="form-columns">
            <label>
              Category
              <select
                name="category"
                defaultValue={product?.category || vendor.category}
              >
                {categories.slice(1).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Price (₦)
              <input
                name="price"
                type="number"
                step="0.01"
                min="0"
                max="10000000"
                required
                defaultValue={product?.price}
              />
            </label>
          </div>
          <label>
            Product images
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                selectFiles(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <small>
              Up to six images, 5 MB each. The first image is your primary
              image.
            </small>
          </label>
          <div className="upload-previews">
            {choices.map((choice, i) => (
              <div key={choice.key}>
                <div className="upload-preview">
                  <ProductImage
                    src={choice.preview}
                    alt={`Product preview ${i + 1}`}
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={i === 0}
                    onClick={() =>
                      setChoices([
                        choice,
                        ...choices.filter((c) => c.key !== choice.key),
                      ])
                    }
                  >
                    {i === 0 ? "Primary" : "Make primary"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setChoices(choices.filter((c) => c.key !== choice.key))
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="available"
              defaultChecked={product?.available ?? true}
            />
            Available now
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button disabled={busy}>
              {busy ? "Saving product and images…" : "Save and publish"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/vendor/products">Cancel</Link>
            </Button>
          </div>
        </form>
      </section>
    </MarketShell>
  );
}

"use client";

import {
calculateImpactScore,
classifyObjection,
EnrichedCustomerReview,
extractHighlightPhrase,
ObjectionCategory,
synthesizeUgcReviews
} from "@/lib/ecommerce/reviewHarvester";
import { AdScript,ProductSpec } from "@/lib/types/ecommerce";
import {
Bell,
Check,
CheckCircle2,
Plus,
Sparkles,
Star,
X
} from "lucide-react";
import React,{ useEffect,useState } from "react";

interface ReviewStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductSpec;
  script: AdScript;
  onApplyReviewToScene4: (review: EnrichedCustomerReview) => void;
  onApplyToSocialPopup: (review: EnrichedCustomerReview) => void;
  onUpdateProductReviews: (reviews: EnrichedCustomerReview[]) => void;
}

export const ReviewStudioModal: React.FC<ReviewStudioModalProps> = ({
  isOpen,
  onClose,
  product,
  script: _script,
  onApplyReviewToScene4,
  onApplyToSocialPopup,
  onUpdateProductReviews,
}) => {
  const [reviews, setReviews] = useState<EnrichedCustomerReview[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state for custom review
  const [formAuthor, setFormAuthor] = useState("");
  const [formRating] = useState(5);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formLocation, setFormLocation] = useState("Verified Buyer");
  const [formObjection, setFormObjection] = useState<ObjectionCategory>("durability");

  // Initial load or when product changes
  useEffect(() => {
    if (!isOpen) return;

    let initialReviews: EnrichedCustomerReview[] = [];

    if (product.topReviews && product.topReviews.length > 0) {
      initialReviews = product.topReviews.map((r, i) => {
        const objection = classifyObjection(r.body, product.typology);
        const highlight = extractHighlightPhrase(r.body);
        const item: EnrichedCustomerReview = {
          ...r,
          id: r.id || `rev_${i}`,
          source: (r as Partial<EnrichedCustomerReview>).source || "shopify",
          objectionSolved: (r as Partial<EnrichedCustomerReview>).objectionSolved || objection,
          impactScore: (r as Partial<EnrichedCustomerReview>).impactScore || 0,
          highlightPhrase: (r as Partial<EnrichedCustomerReview>).highlightPhrase || highlight,
          location: (r as Partial<EnrichedCustomerReview>).location || "Verified Buyer",
        };
        item.impactScore = calculateImpactScore(item);
        return item;
      });
    } else {
      // Synthesize default 3 UGC reviews if empty
      initialReviews = synthesizeUgcReviews(product, 3);
    }

    setReviews(initialReviews);
    if (initialReviews.length > 0) {
      setSelectedReviewId(initialReviews[0].id);
    }
  }, [isOpen, product]);

  if (!isOpen) return null;

  const handleSynthesizeMore = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const fresh = synthesizeUgcReviews(product, 3);
      const combined = [...reviews, ...fresh];
      setReviews(combined);
      onUpdateProductReviews(combined);
      setIsGenerating(false);
    }, 450);
  };

  const handleAddCustomReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBody.trim()) return;

    const highlight = extractHighlightPhrase(formBody);
    const newReview: EnrichedCustomerReview = {
      id: `custom_${Date.now()}`,
      author: formAuthor.trim() || "Verified Customer",
      rating: formRating,
      title: formTitle.trim() || undefined,
      body: formBody.trim(),
      verifiedBuyer: true,
      location: formLocation.trim() || "Verified Buyer",
      source: "shopify",
      objectionSolved: formObjection,
      impactScore: 0,
      highlightPhrase: highlight,
    };

    newReview.impactScore = calculateImpactScore(newReview);
    const updated = [newReview, ...reviews];
    setReviews(updated);
    setSelectedReviewId(newReview.id);
    onUpdateProductReviews(updated);

    // Reset form
    setFormBody("");
    setFormTitle("");
    setShowAddForm(false);
  };

  const selectedReview = reviews.find((r) => r.id === selectedReviewId) || reviews[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#121216] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#16161b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Customer Reviews & UGC Testimonials
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-semibold">
                  {reviews.length} Available
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Objection-handling social proof engineered for short-form video conversion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSynthesizeMore}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              ⚡ Synthesize UGC
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Review
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add Review Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddCustomReview}
              className="p-4 rounded-xl bg-zinc-900/90 border border-amber-500/30 space-y-3 animate-in slide-in-from-top-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Add Real Customer Quote
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-zinc-400">Customer Name</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="e.g. Jessica M."
                    className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400">Location Tag</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Verified Buyer • Austin, TX"
                    className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-zinc-400">Objection Solved</label>
                  <select
                    value={formObjection}
                    onChange={(e) => setFormObjection(e.target.value as ObjectionCategory)}
                    className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="durability">Durability & Quality</option>
                    <option value="ease_of_use">Ease of Setup / Use</option>
                    <option value="value_for_money">Value for Money</option>
                    <option value="sizing_and_fit">Sizing & Dimensions</option>
                    <option value="aesthetic_design">Aesthetic & Appearance</option>
                    <option value="customer_support">Shipping & Support</option>
                    <option value="general_satisfaction">General 5-Star</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400">Headline / Short Hook</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Saved over $2,000 on installation!"
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-400">Review Body</label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  rows={2}
                  placeholder="e.g. Honestly exceeded all expectations. We have two dogs and not a single scratch after 6 months."
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors"
                >
                  Save & Add to Vault
                </button>
              </div>
            </form>
          )}

          {/* Reviews List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => {
              const isSelected = selectedReviewId === rev.id;
              return (
                <div
                  key={rev.id}
                  onClick={() => setSelectedReviewId(rev.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "bg-zinc-900 border-amber-500 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30"
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80"
                  }`}
                >
                  <div>
                    {/* Header: Stars & Objection Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {rev.objectionSolved.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Impact {rev.impactScore}
                        </span>
                      </div>
                    </div>

                    {/* Pull Quote Highlight */}
                    {rev.highlightPhrase && (
                      <div className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">
                        <span>✦</span>
                        <span>&ldquo;{rev.highlightPhrase}&rdquo;</span>
                      </div>
                    )}

                    {/* Review Body */}
                    <p className="text-xs text-zinc-300 leading-relaxed italic line-clamp-3">
                      &ldquo;{rev.body}&rdquo;
                    </p>
                  </div>

                  {/* Footer Meta */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-200">
                        {rev.author.charAt(0)}
                      </div>
                      <span className="font-semibold text-zinc-300 truncate max-w-[120px]">
                        {rev.author}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      {rev.source === "synthetic_ugc" ? "AI UGC Verified" : "Verified Order"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        {selectedReview && (
          <div className="px-6 py-4 border-t border-zinc-800 bg-[#16161b] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Selected:</span>
              <span className="text-xs font-bold text-white">
                {selectedReview.author} — &ldquo;{selectedReview.highlightPhrase}&rdquo;
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onApplyToSocialPopup(selectedReview);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors"
                title="Updates sticky corner social proof card"
              >
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                Sync Corner Popup
              </button>

              <button
                onClick={() => {
                  onApplyReviewToScene4(selectedReview);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
              >
                <Check className="w-4 h-4" />
                Apply as Scene 4 in Video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from "react";
import { ProductSpec } from "@/lib/types/ecommerce";
import { Sliders } from "lucide-react";

export interface EditorSpecsInspectorProps {
  product?: ProductSpec | null;
  onUpdateProduct?: (updater: Partial<ProductSpec>) => void;
}

export const EditorSpecsInspector: React.FC<EditorSpecsInspectorProps> = ({
  product,
  onUpdateProduct,
}) => {
  if (!product) {
    return <div className="p-4 text-xs text-zinc-500">No product metadata loaded.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
        <Sliders className="w-4 h-4 text-cyan-400" />
        Product Specifications & Metadata
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Product Title</label>
        <input
          type="text"
          value={product.title || ""}
          onChange={(e) => onUpdateProduct && onUpdateProduct({ title: e.target.value })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={product.price || 0}
            onChange={(e) => onUpdateProduct && onUpdateProduct({ price: parseFloat(e.target.value) || 0 })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Compare Price ($)</label>
          <input
            type="number"
            step="0.01"
            value={product.compareAtPrice || 0}
            onChange={(e) => onUpdateProduct && onUpdateProduct({ compareAtPrice: parseFloat(e.target.value) || 0 })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Vendor / Brand</label>
        <input
          type="text"
          value={product.vendor || ""}
          onChange={(e) => onUpdateProduct && onUpdateProduct({ vendor: e.target.value })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Product Typology</label>
        <select
          value={product.typology || "discrete_object"}
          onChange={(e) => onUpdateProduct && onUpdateProduct({ typology: e.target.value as ProductSpec["typology"] })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="discrete_object">Discrete Packaged Object</option>
          <option value="surface_material">Surface / Flooring / Wall Material</option>
          <option value="apparel_wearable">Apparel / Footwear</option>
          <option value="digital_saas">Digital Service / App</option>
        </select>
      </div>
    </div>
  );
};

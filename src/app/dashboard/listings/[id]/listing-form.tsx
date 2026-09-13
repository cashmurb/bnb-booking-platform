"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateListing, type UpdateListingState } from "./actions";

type Resource = {
  id: string;
  label: string;
  is_active: boolean;
  nightly_rate_php: number | null;
  base_occupancy: number | null;
  max_occupancy: number | null;
  extra_guest_fee_php: number | null;
  cleaning_fee_php: number | null;
  overview: string | null;
  amenities: string[] | null;
};

const initialState: UpdateListingState = { error: null, success: false };

export function ListingForm({ resource }: { resource: Resource }) {
  const updateListingWithId = updateListing.bind(null, resource.id);
  const [state, formAction, pending] = useActionState(
    updateListingWithId,
    initialState
  );

  return (
    <div className="rounded-[14px] bg-white p-6">
      <div className="mb-5 flex h-[220px] items-center justify-center rounded-[10px] bg-guest-band text-sm text-guest-muted">
        Main photo
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block text-xs text-[#4a4a4a]">
            Listing Name
          </label>
          <input
            name="label"
            defaultValue={resource.label}
            required
            className="w-full rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs text-[#4a4a4a]">
              Price per Night (PHP)
            </label>
            <input
              name="nightly_rate_php"
              type="number"
              min={0}
              step="0.01"
              defaultValue={resource.nightly_rate_php ?? ""}
              className="w-full rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-[#4a4a4a]">
              Cleaning Fee (PHP)
            </label>
            <input
              name="cleaning_fee_php"
              type="number"
              min={0}
              step="0.01"
              defaultValue={resource.cleaning_fee_php ?? ""}
              className="w-full rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs text-[#4a4a4a]">
              Base Occupancy
            </label>
            <input
              name="base_occupancy"
              type="number"
              min={1}
              defaultValue={resource.base_occupancy ?? ""}
              className="w-full rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-[#4a4a4a]">
              Max Guests
            </label>
            <input
              name="max_occupancy"
              type="number"
              min={1}
              defaultValue={resource.max_occupancy ?? ""}
              className="w-full rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-[#4a4a4a]">
              Extra Guest Fee
            </label>
            <input
              name="extra_guest_fee_php"
              type="number"
              min={0}
              step="0.01"
              defaultValue={resource.extra_guest_fee_php ?? ""}
              className="w-full rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs text-[#4a4a4a]">
            Overview
          </label>
          <textarea
            name="overview"
            rows={3}
            defaultValue={resource.overview ?? ""}
            className="w-full resize-y rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-[#4a4a4a]">
            Amenities (comma-separated)
          </label>
          <input
            name="amenities"
            defaultValue={(resource.amenities ?? []).join(", ")}
            placeholder="e.g. Air Conditioning, Wi-Fi, Kitchenette"
            className="w-full rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-[#4a4a4a]">Status</label>
          <select
            name="is_active"
            defaultValue={resource.is_active ? "active" : "inactive"}
            className="w-[220px] rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-[#1e7d3c]">Saved.</p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <Link
            href="/dashboard/listings"
            className="rounded-md border border-guest-border px-5 py-2.5 text-sm text-guest-ink hover:bg-guest-band"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="guest-btn rounded-md bg-guest-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-guest-navy-dark disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

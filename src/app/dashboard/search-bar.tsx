import { SearchIcon } from "../icons";

export function SearchBar({ defaultValue }: { defaultValue?: string }) {
  return (
    <form
      action="/dashboard/bookings"
      method="get"
      className="flex max-w-[480px] flex-1 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-[18px] py-2.5 text-[13px] text-guest-muted shadow-sm backdrop-blur-md"
    >
      <SearchIcon className="h-[15px] w-[15px] flex-none text-[#8a8a8a]" />
      <input
        type="text"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search for bookings, guests, ..."
        className="w-full bg-transparent text-guest-ink placeholder:text-guest-muted focus:outline-none"
      />
    </form>
  );
}

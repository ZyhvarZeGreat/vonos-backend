"use client";

/** DataTables-style search field + Search button (HQ6 / UPOS list chrome). */
export function Hq6DtSearchFilter({
  value,
  onChange,
  onCommit,
  placeholder = "Search ...",
  id,
  disabled,
  ariaControls,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Apply the current draft (button / Enter). Defaults to no-op when omitted. */
  onCommit?: () => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  ariaControls?: string;
}) {
  const commit = () => onCommit?.();

  return (
    <div id={id} className="dataTables_filter hq6-dt-search-filter">
      <label>
        <span className="sr-only">Search</span>
        <input
          type="search"
          className="form-control input-sm"
          placeholder={placeholder}
          title={placeholder}
          aria-controls={ariaControls}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
      </label>
      <button
        type="button"
        className="hq6-search-btn"
        aria-label="Search"
        disabled={disabled}
        onClick={commit}
      >
        Search
      </button>
    </div>
  );
}

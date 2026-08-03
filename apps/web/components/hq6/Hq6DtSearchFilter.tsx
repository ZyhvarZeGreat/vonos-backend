"use client";

/**
 * HQ6 list search — live typing; filters the already-loaded page in memory
 * via `useServerListPage` (`searchMode: "local"` + match-sorter). No Search button.
 */
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
  /** Optional: Enter flushes immediately (same as onChange for live search). */
  onCommit?: () => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  ariaControls?: string;
}) {
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
              onCommit?.();
            }
          }}
        />
      </label>
    </div>
  );
}

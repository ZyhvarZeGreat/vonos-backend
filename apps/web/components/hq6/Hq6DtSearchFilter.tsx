"use client";

/**
 * HQ6 list search — live typing. Optional `isSearching` shows a spinner while
 * debounce/server fetch catches up so results don't feel stuck.
 */
export function Hq6DtSearchFilter({
  value,
  onChange,
  onCommit,
  placeholder = "Search ...",
  id,
  disabled,
  ariaControls,
  isSearching = false,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Optional: Enter flushes immediately (same as onChange for live search). */
  onCommit?: () => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  ariaControls?: string;
  isSearching?: boolean;
}) {
  return (
    <div
      id={id}
      className={`dataTables_filter hq6-dt-search-filter${isSearching ? " is-searching" : ""}`}
    >
      <label>
        <span className="sr-only">Search</span>
        <span className="hq6-dt-search-filter__field">
          <input
            type="search"
            className="form-control input-sm"
            placeholder={placeholder}
            title={placeholder}
            aria-controls={ariaControls}
            aria-busy={isSearching || undefined}
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
          {isSearching ? (
            <span
              className="hq6-dt-search-filter__spinner"
              aria-hidden
              title="Searching"
            >
              <i className="fa fa-spinner fa-spin" />
            </span>
          ) : null}
        </span>
      </label>
    </div>
  );
}

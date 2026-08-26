import { LoadingState } from "./LoadingState";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  empty?: { title: string; message: string };
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;
}

export function Table<T>({
  columns,
  data,
  loading,
  empty,
  onRowClick,
  keyExtractor,
}: TableProps<T>) {
  if (loading) return <LoadingState message="Loading data..." />;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary-bg">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center"
              >
                {empty ? (
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {empty.title}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {empty.message}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No data</p>
                )}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-border last:border-b-0 transition-colors ${
                  onRowClick
                    ? "cursor-pointer hover:bg-secondary-bg"
                    : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(item)
                      : String(
                          (item as Record<string, unknown>)[col.key] ?? "",
                        )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

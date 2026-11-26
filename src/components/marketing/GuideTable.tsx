import type { ReactNode } from "react";

export function GuideTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-foundation-700/15">
      <table className="w-full border-collapse text-left text-sm leading-relaxed">
        <caption className="bg-paper-deep/60 px-4 py-3 text-left text-sm font-semibold text-foundation-700">
          {caption}
        </caption>
        <thead className="bg-white">
          <tr>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-t border-foundation-700/10 px-4 py-3 align-top font-semibold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-foundation-700/10 bg-white">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) =>
                column === 0 ? (
                  <th
                    key={column}
                    scope="row"
                    className="px-4 py-3 align-top font-medium"
                  >
                    {cell}
                  </th>
                ) : (
                  <td key={column} className="px-4 py-3 align-top">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

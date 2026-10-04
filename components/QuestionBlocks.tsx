import type { Block } from '@/lib/types';

function Record({ title, rows }: { title?: string; rows: [string, string][] }) {
  return (
    <div className="card">
      {title && <div className="card-title">{title}</div>}
      {rows.map(([k, v], i) => (
        <div className="record-row" key={i}>
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** The scenario content above a question. Used by the candidate view and the recruiter review. */
export function QuestionBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'text':
            return <p className="q-text" key={i}>{b.text}</p>;
          case 'list':
            return (
              <div className="card" key={i}>
                {b.title && <div className="card-title">{b.title}</div>}
                <ul>{b.items.map((item, j) => <li key={j}>{item}</li>)}</ul>
              </div>
            );
          case 'record':
            return <Record key={i} title={b.title} rows={b.rows} />;
          case 'columns':
            return (
              <div className="columns" key={i}>
                {b.records.map((r, j) => <Record key={j} title={r.title} rows={r.rows} />)}
              </div>
            );
          case 'table':
            return (
              <div className="card table-card" key={i}>
                <table className="q-table">
                  <thead>
                    <tr>
                      <th />
                      {b.columns.map((c, j) => <th key={j} scope="col">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map(([label, ...values], j) => (
                      <tr key={j}>
                        <th scope="row">{label}</th>
                        {values.map((v, k) => <td key={k}>{v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

export const LETTERS = 'ABCDEFGH';

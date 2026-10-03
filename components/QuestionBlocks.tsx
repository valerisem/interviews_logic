import type { Block } from '@/lib/types';

function Record({ title, rows }: { title?: string; rows: [string, string][] }) {
  return (
    <div className="record">
      {title && <div className="record-title">{title}</div>}
      {rows.map(([k, v], i) => (
        <div className="record-row" key={i}>
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </div>
  );
}

/** Renders the scenario content shown above a question prompt. Used by both candidate and recruiter views. */
export function QuestionBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'text':
            return <p className="q-text" key={i}>{b.text}</p>;
          case 'list':
            return (
              <ul className="q-list" key={i}>
                {b.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            );
          case 'record':
            return <Record key={i} title={b.title} rows={b.rows} />;
          case 'columns':
            return (
              <div className="columns" key={i}>
                {b.records.map((r, j) => <Record key={j} title={r.title} rows={r.rows} />)}
              </div>
            );
        }
      })}
    </>
  );
}

export const LETTERS = 'ABCDEFGH';

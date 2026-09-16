export default function ConstrainedPillEditor({
  label, values, options, onSave,
}: {
  label: string;
  values: string[];
  options: string[];           // fixed list
  onSave: (next: string[]) => Promise<void>;
}) {
  const available = options.filter((o) => !values.includes(o));

  const add = (v: string) => onSave([...values, v]);
  const remove = (v: string) => onSave(values.filter((x) => x !== v));

  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 py-3 border-b">
      <span className="text-sm text-gray-500">{label}</span>

      <div>
        {/* Selected */}
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((v) => (
            <span key={v} className="pill-selected">
              {v}
              <button onClick={() => remove(v)}>×</button>
            </span>
          ))}
        </div>

        {/* Available */}
        <div className="flex flex-wrap gap-2">
          {available.map((o) => (
            <button
              key={o}
              onClick={() => add(o)}
              className="pill-available"
            >
              + {o}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
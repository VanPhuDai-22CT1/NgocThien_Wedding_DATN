export default function ServiceSelection({ selection = {} }) {
  const values = [selection.package_name, selection.color, selection.event_date ? `Ngày tổ chức: ${selection.event_date.split("-").reverse().join("/")}` : "", selection.location, selection.note].filter(Boolean);
  if (!values.length) return null;
  return <div style={{ fontSize: 12, fontWeight: 400, lineHeight: 1.7, color: "#766661", marginTop: 6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{values.map((value, index) => <div key={index}>{value}</div>)}</div>;
}

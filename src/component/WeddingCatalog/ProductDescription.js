import { useMemo } from "react";

const readableText = (value) => {
  const document = new DOMParser().parseFromString(String(value || ""), "text/html");
  document.querySelectorAll("script, style, iframe, object, template").forEach((node) => node.remove());
  document.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  document.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li, blockquote").forEach((node) => {
    node.before("\n\n"); node.after("\n\n");
  });
  return (document.body.textContent || "").replace(/\u00a0/g, " ").replace(/([^\S\n])+/g, " ").replace(/([.!?…])(?=\p{Lu})/gu, "$1\n\n").trim();
};

function descriptionParts(value) {
  let text = readableText(value);
  // Older descriptions have their uppercase heading and first sentence joined together.
  const heading = text.match(/^([\p{Lu}\p{M}\d &–—,:/()-]{10,}?)(?=\p{Lu}\p{Ll}|\n|$)/u);
  const title = heading?.[1]?.trim() || "";
  if (title) text = text.slice(heading[1].length).trim();
  const closing = text.match(/Ngọc Thiện Wedding\s*[–—-][\s\S]+$/u)?.[0] || "";
  if (closing) text = text.slice(0, -closing.length).trim();
  const [intro, ...features] = text.split(/[✓✔✅]/u);
  const paragraphs = intro.split(/\n\s*\n/).filter((part) => part.trim()).flatMap((part) => {
    const sentences = part.trim().split(/(?<=[.!?…])\s+(?=\p{Lu})/u);
    const chunks = [];
    for (const sentence of sentences) {
      if (!chunks.length || chunks[chunks.length - 1].length > 260) chunks.push(sentence);
      else chunks[chunks.length - 1] += ` ${sentence}`;
    }
    return chunks;
  });
  return { title, paragraphs, features: features.map((item) => item.trim()).filter(Boolean), closing };
}

export default function ProductDescription({ content }) {
  const { title, paragraphs, features, closing } = useMemo(() => descriptionParts(content), [content]);
  return <section className="wc-description-section" aria-labelledby="wc-description-heading">
    <h2 id="wc-description-heading">Mô tả chi tiết</h2>
    <div className={`wc-description-layout${features.length ? " has-features" : ""}`}>
      <div className="wc-description-copy">
        {title && <h3>{title}</h3>}
        {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
      {features.length > 0 && <aside className="wc-description-features" aria-label="Điểm nổi bật">
        <h3>Điểm nổi bật</h3>
        <ul>{features.map((feature, index) => <li key={index}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg><span>{feature}</span></li>)}</ul>
      </aside>}
    </div>
    {closing && <p className="wc-description-signature">{closing}</p>}
  </section>;
}

export function JsonLd({ data }: { data: object }) {
  // Escape "<" so user-generated content (blog/guide descriptions) can never
  // break out of the script tag via "</script>" or similar.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

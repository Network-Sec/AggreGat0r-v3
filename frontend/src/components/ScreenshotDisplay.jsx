/* src/components/ScreenshotDisplay.jsx */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

/* ---------- Light‑box – unchanged -------------------------------------- */
const Lightbox = ({ src, onClose }) => (
  <div
    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
  >
    <img
      src={src}                     /* <‑‑  string (the full‑size image)   */
      alt="Enlarged screenshot"
      className="max-h-full max-w-full object-contain shadow-lg rounded"
    />
  </div>
);
Lightbox.propTypes = {
  src: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

/* ---------- ScreenshotDisplay – main component ----------------------- */
export default function ScreenshotDisplay({ record }) {
  /* `images` now holds `{url, port, orientation}` objects  */
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState(null);

  /* ----- fetch the screenshots --------------------------------------- */
  useEffect(() => {
    if (!record) return setImages([]);

    const load = async () => {
      const apiUrl = new URL(
        'http://localhost:5000/api/records/screenshots'
      );
      if (record.ipv4) apiUrl.searchParams.set('ip', record.ipv4);
      if (record.domain) apiUrl.searchParams.set('domain', record.domain);

      try {
        const res = await fetch(apiUrl.toString());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        /* flatten the two arrays (ipv4 + domain) */
        const all = [...(data.ipv4 || []), ...(data.domain || [])];

        /* map to `{url, port, orientation}` – keep the fields from the API */
        const imgs = all.map((s) => ({
          url: `/public/screenshots/${s.filename}`,   /*  <-- URL on disk  */
          port: s.port,
          orientation: s.orientation,
        }));

        /* portrait first, then landscape */
        const sorted = imgs.sort((a, b) =>
          a.orientation === b.orientation
            ? 0
            : a.orientation === 'portrait'
            ? -1
            : 1
        );

        setImages(sorted);
      } catch (e) {
        console.warn('Could not load screenshots:', e);
        setImages([]);
      }
    };

    load();
  }, [record]);

  if (!record) return null;

  return (
    <div className="h-full flex flex-col max-h-[520px] overflow-y-hidden">
      <div className="flex flex-col gap-4 h-full">
        {/* ---- light‑box (only the URL is needed) ----------------------- */}
        {selected !== null && (
          <Lightbox
            src={images[selected].url}
            onClose={() => setSelected(null)}
          />
        )}

        {images.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No screenshots available.
          </p>
        ) : (
          /* --------‑ CSS‑grid “fixed 3‑col” layout --------------------- */
          <div className="flex flex-wrap h-full overflow-y-auto">
            {images.map((img, i) => (
              <div
                key={i}
                className="w-[45%] flex justify-center items-center cursor-pointer group bg-gray-800 p-2 mx-3 mb-2 relative"
                onClick={() => setSelected(i)}
                style={{ height: `${90 / (images.length / 2)}%` }}   /* rows × 100 %  */
              >
                <img
                  src={img.url}
                  alt={`Screenshot ${i + 1}`}
                  className="max-w-full max-h-full object-contain"
                />

                {/* ----- Port badge (top‑left) -------------------------------- */}
                <div className="absolute -bottom-2 -right-2 bg-gray-600/80 text-white text-[30px] px-1 box-shadow">
                  {img.port}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

ScreenshotDisplay.propTypes = {
  record: PropTypes.shape({
    ipv4: PropTypes.string,
    domain: PropTypes.string,
  }).isRequired,
};

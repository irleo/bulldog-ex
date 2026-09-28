import { useEffect, useRef, useState } from 'react';
import { ProductImage } from './StoreUI.jsx';

/** @param {{product: {name?: string, images?: string[]} | null, className: string}} props */
export default function ProductImageInput({ product, className }) {
  const objectUrl = useRef('');
  const input = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  /** @param {import('react').ChangeEvent<HTMLInputElement>} event */
  const chooseImage = (event) => {
    const next = event.currentTarget.files?.[0] ?? null;
    const invalid = next && (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)
      || next.size === 0 || next.size > 5 * 1024 * 1024);
    const message = invalid ? 'Choose a non-empty JPG, PNG, or WebP image up to 5 MB.' : '';
    setError(message);
    event.currentTarget.setCustomValidity(message);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = next && !invalid ? URL.createObjectURL(next) : '';
    setPreview(objectUrl.current);
    // Clear rejected files so they cannot be submitted accidentally.
    if (invalid) event.currentTarget.value = '';
  };

  return (
    <div className="md:col-span-2">
      <label htmlFor="product-image" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Product image</label>
      <input ref={input} id="product-image" name="image" type="file" accept="image/jpeg,image/png,image/webp"
        onChange={chooseImage} aria-describedby="product-image-help product-image-error" aria-invalid={Boolean(error)}
        className={`${className} w-full file:mr-4 file:rounded-md file:border-0 file:bg-[#0b1b46] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`} />
      <p id="product-image-help" className="mt-1.5 text-xs text-[#64748b]">One static JPG, PNG, or WebP up to 5 MB and 20 megapixels. Leave empty to keep the current image.</p>
      <p id="product-image-error" role="alert" className="mt-1 text-sm text-red-700">{error}</p>
      {(preview || error) && <button type="button" className="mt-2 text-sm font-semibold text-[#0b1b46] underline"
        onClick={() => {
          if (input.current) {
            input.current.value = '';
            input.current.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }}>Clear selection and keep current image</button>}
      <div className="mt-3 rounded-lg border border-[#e3e7f0] p-3">
        <p className="mb-2 text-xs text-[#64748b]">{preview ? 'Selected image preview' : product?.images?.length ? 'Current image' : 'Default image'}</p>
        {preview ? <img src={preview} alt="Selected product image preview" className="h-40 w-full object-contain"
          onError={() => {
            const message = 'This image cannot be previewed. Choose another file.';
            setError(message);
            input.current?.setCustomValidity(message);
          }} />
          : <ProductImage product={product} className="h-40 w-full object-contain" />}
      </div>
    </div>
  );
}

import { useState } from 'react';

const TINTS = ['#0E6B4E', '#B4531F', '#2F4B8A', '#7A3E65', '#8A6A0B', '#1F6F78'];
const tint = (s = '') => TINTS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

// Shows the product photo, or a woven-pattern tile when there is none (or it fails to load).
export default function ProductImage({ product, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (product.image && !failed) {
    return <img className={`pimg ${className}`} src={product.image} alt={product.name} loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className={`pimg pimg-fallback ${className}`} style={{ '--tint': tint(product.category) }} role="img" aria-label={product.name}>
      <span>{product.name.trim().charAt(0)}</span>
    </div>
  );
}

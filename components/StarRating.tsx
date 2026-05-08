export default function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          style={{ color: i < rating ? '#36F4A4' : '#3F3F46', fontSize: '14px' }}
        >
          ★
        </span>
      ))}
    </span>
  )
}

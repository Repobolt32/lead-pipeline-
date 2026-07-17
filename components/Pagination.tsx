import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export default function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  return (
    <div className={styles.pagination}>
      <button
        id="pagination-prev"
        className={styles.btn}
        onClick={onPrev}
        disabled={page <= 1}
      >
        ← Previous
      </button>
      <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
      <button
        id="pagination-next"
        className={styles.btn}
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Next →
      </button>
    </div>
  )
}

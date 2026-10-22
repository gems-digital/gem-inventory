import { useNavigate } from 'react-router-dom';
import { GemIcon } from '../components/icons';
import './PlaceholderPage.css';

interface PlaceholderPageProps {
  title: string;
  note: string;
}

/** Màn tạm cho /detail/:id và /add — hoàn thiện ở slice sau. */
export function PlaceholderPage({ title, note }: PlaceholderPageProps) {
  const navigate = useNavigate();
  return (
    <div className="placeholder">
      <header className="placeholder__topbar safe-top">
        <button type="button" className="placeholder__back" onClick={() => navigate(-1)}>
          ‹ Quay lại
        </button>
        <h1 className="placeholder__title">{title}</h1>
        <span className="placeholder__spacer" />
      </header>
      <div className="placeholder__body">
        <GemIcon size={48} className="placeholder__icon" />
        <p className="placeholder__note">{note}</p>
      </div>
    </div>
  );
}

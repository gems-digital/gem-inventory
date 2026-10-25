import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Item } from '../api/types';
import { deleteItem, fetchItem } from '../api/inventory';
import { ApiError } from '../api/client';
import { Spinner } from '../components/Spinner';
import { GemIcon, BackIcon, WarnIcon, CheckIcon, EyeOffIcon } from '../components/icons';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Snackbar } from '../components/Snackbar';
import { formatVnd, formatPercent } from '../lib/format';
import { productTypeLabel, menhLabel, dimensionsSummary } from '../lib/labels';
import {
  dimensionRows,
  optionLabel,
  TREATMENT_OPTIONS,
  TRANSPARENCY_OPTIONS,
  ORIGIN_OPTIONS,
  type SpecRow,
} from '../lib/attributes';
import './DetailPage.css';

type Status = 'loading' | 'ready' | 'error';

export function DetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const [showHideConfirm, setShowHideConfirm] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [hideError, setHideError] = useState('');

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    try {
      const data = await fetchItem(id, controller.signal);
      if (controller.signal.aborted) return;
      setItem(data);
      setStatus('ready');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (controller.signal.aborted) return;
      setErrorMessage(err instanceof ApiError ? err.message : 'Không tải được món. Vui lòng thử lại.');
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  async function confirmHide() {
    if (!item) return;
    setShowHideConfirm(false);
    setHiding(true);
    try {
      await deleteItem(item.id);
      navigate('/list', { state: { undoItem: item } });
    } catch (err) {
      setHiding(false);
      setHideError(err instanceof ApiError ? err.message : 'Không ẩn được món. Vui lòng thử lại.');
    }
  }

  return (
    <div className="detail">
      <header className="topbar safe-top">
        <button type="button" className="topbar__btn" onClick={() => navigate('/list')} aria-label="Quay lại">
          <BackIcon size={22} />
        </button>
        <h1 className="topbar__title">Chi tiết món</h1>
        {status === 'ready' ? (
          <button type="button" className="topbar__action" onClick={() => navigate(`/add/${id}`)}>
            Sửa
          </button>
        ) : (
          <span className="topbar__spacer" />
        )}
      </header>

      {status === 'loading' && (
        <div className="detail__center">
          <Spinner />
        </div>
      )}

      {status === 'error' && (
        <div className="detail__center detail__state">
          <p className="detail__state-msg">{errorMessage}</p>
          <button type="button" className="btn-retry" onClick={load}>
            Thử lại
          </button>
        </div>
      )}

      {status === 'ready' && item && (
        <>
          <DetailContent item={item} />
          <div className="detail__danger-zone">
            <button
              type="button"
              className="btn-danger-outline"
              disabled={hiding}
              onClick={() => setShowHideConfirm(true)}
            >
              <EyeOffIcon size={18} />
              Ẩn món
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={showHideConfirm}
        title="Ẩn món này?"
        message="Món sẽ ẩn khỏi danh sách. Ảnh, giá và lịch sử vẫn được giữ lại, bạn có thể hoàn tác sau."
        confirmLabel="Ẩn món"
        busy={hiding}
        onCancel={() => setShowHideConfirm(false)}
        onConfirm={confirmHide}
      />

      {hideError && (
        <Snackbar message={hideError} tone="danger" onDismiss={() => setHideError('')} />
      )}
    </div>
  );
}

function DetailContent({ item }: { item: Item }) {
  const tags = [
    productTypeLabel(item.productType),
    item.jadeType?.trim() || null,
    item.color?.trim() || null,
    dimensionsSummary(item.productType, item.dimensions),
  ].filter((t): t is string => Boolean(t));

  const headroom = headroomPercent(item);
  const dimRows = dimensionRows(item.productType, item.dimensions);

  const attrRows: SpecRow[] = [
    labelRow('Phân loại', optionLabel(TREATMENT_OPTIONS, item.treatment)),
    labelRow('Độ trong', optionLabel(TRANSPARENCY_OPTIONS, item.transparency)),
    labelRow('Nguồn gốc', optionLabel(ORIGIN_OPTIONS, item.origin)),
    labelRow('Trọng lượng', item.weightGram != null ? `${item.weightGram} g` : null),
    labelRow('Mã kiểm định', item.certificateCode),
  ].filter((r): r is SpecRow => r !== null);

  const menhText = item.menh.length > 0 ? item.menh.map(menhLabel).join(' · ') : null;

  return (
    <div className="detail__body">
      <Gallery photoUrls={item.photoUrls} />

      <div className="detail__head">
        <span className="detail__code">{item.code}</span>
        {item.name && <h2 className="detail__name">{item.name}</h2>}
        {tags.length > 0 && (
          <div className="detail__tags">
            {tags.map((t) => (
              <span key={t} className="tag-pill">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <section className="card-surface">
        <PriceLine label="Giá bán niêm yết" value={formatVnd(item.salePriceVnd)} />
        <PriceLine label="Giá sàn" value={formatVnd(item.floorPriceVnd)} internal />
        <PriceLine label="Giá nhập" value={formatVnd(item.costPriceVnd)} internal />
        <hr className="divider" />
        <p className="detail__margin num">
          Lời hiện tại {signedVnd(item.marginVnd)} · {formatPercent(item.marginPct)}
        </p>
      </section>

      <SafetyBlock belowFloor={item.belowFloorWarn} headroom={headroom} />

      {(dimRows.length > 0 || attrRows.length > 0 || menhText || item.note) && (
        <section className="card-surface specs">
          <SpecLine label="Loại SP" value={productTypeLabel(item.productType)} />
          {dimRows.map((r) => (
            <SpecLine key={`dim-${r.label}`} label={r.label} value={r.value} />
          ))}
          {menhText && <SpecLine label="Mệnh" value={menhText} />}
          {attrRows.map((r) => (
            <SpecLine key={`attr-${r.label}`} label={r.label} value={r.value} />
          ))}
          {item.note && <SpecLine label="Ghi chú" value={item.note} />}
        </section>
      )}
    </div>
  );
}

function Gallery({ photoUrls }: { photoUrls: string[] }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(photoUrls.length - 1, 0));
  const current = photoUrls[index];

  return (
    <div className="gallery">
      <div className="gallery__main">
        {current ? (
          <img className="gallery__img" src={current} alt="" />
        ) : (
          <GemIcon size={56} className="gallery__placeholder" />
        )}
        {photoUrls.length > 1 && (
          <span className="gallery__counter">
            {index + 1} / {photoUrls.length}
          </span>
        )}
      </div>
      {photoUrls.length > 1 && (
        <div className="gallery__thumbs">
          {photoUrls.map((url, i) => (
            <button
              key={url}
              type="button"
              className={`gallery__thumb ${i === index ? 'gallery__thumb--on' : ''}`}
              onClick={() => setSelected(i)}
              aria-label={`Ảnh ${i + 1}`}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PriceLine({ label, value, internal }: { label: string; value: string; internal?: boolean }) {
  return (
    <div className="price-line">
      <span className="price-line__label">{label}</span>
      {internal && <span className="chip-internal">NỘI BỘ</span>}
      <span className="price-line__spacer" />
      <span className="price-line__value num">{value}</span>
    </div>
  );
}

function SafetyBlock({ belowFloor, headroom }: { belowFloor: boolean; headroom: number | null }) {
  if (headroom === null) return null;

  if (headroom < 0) {
    return (
      <div className="safety safety--warn">
        <WarnIcon size={18} />
        <span>Giá sàn đang ≥ giá bán — kiểm tra lại giá</span>
      </div>
    );
  }
  if (belowFloor) {
    return (
      <div className="safety safety--warn">
        <WarnIcon size={18} />
        <span>Sát sàn ~{headroom}%</span>
      </div>
    );
  }
  return (
    <div className="safety safety--ok">
      <CheckIcon size={18} />
      <span>Còn dư địa giảm ~{Math.min(headroom, 100)}%</span>
    </div>
  );
}

function SpecLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec-line">
      <span className="spec-line__label">{label}</span>
      <span className="spec-line__value">{value}</span>
    </div>
  );
}

function labelRow(label: string, value: string | null | undefined): SpecRow | null {
  return value ? { label, value } : null;
}

function signedVnd(amount: number | null): string {
  if (amount === null) return '—';
  return amount >= 0 ? `+${formatVnd(amount)}` : formatVnd(amount);
}

/** round((sale-floor)/sale*100); null khi không tính được. */
function headroomPercent(item: Item): number | null {
  const floor = item.floorPriceVnd;
  if (floor === null || item.salePriceVnd <= 0) return null;
  return Math.round(((item.salePriceVnd - floor) / item.salePriceVnd) * 100);
}

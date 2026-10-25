import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Item } from '../api/types';
import { formatVnd } from '../lib/format';
import { buildTags, itemKindLabel } from '../lib/labels';
import { GemIcon, WarnIcon, CameraIcon, EyeOffIcon } from './icons';
import './ItemCard.css';

interface ItemCardProps {
  item: Item;
  onClick: () => void;
  /** Gọi khi người dùng xác nhận bấm "Ẩn" (sau khi vuốt trái lộ action, hoặc qua bàn phím). */
  onHide: (item: Item) => void;
}

/** Bề rộng action "Ẩn" lộ ra khi vuốt trái (nằm trong khoảng gợi ý 64–96px). */
const ACTION_WIDTH = 88;
/** Vuốt quá mốc này khi thả tay → tự mở hẳn action; dưới mốc → đóng lại. */
const COMMIT_THRESHOLD = 56;
/** Di chuyển dưới mốc này (px) chưa tính là vuốt ngang. */
const AXIS_SLOP = 8;

interface DragInfo {
  pointerId: number;
  startX: number;
  startY: number;
  baseOffset: number;
  axis: 'none' | 'horizontal' | 'vertical';
}

export function ItemCard({ item, onClick, onHide }: ItemCardProps) {
  const photo = item.photoUrls[0];
  const tags = buildTags(item);
  const marginClass = item.belowFloorWarn ? 'price__value--warn' : 'price__value--positive';

  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragInfo = useRef<DragInfo | null>(null);
  // Click đi kèm sau một lần vuốt ngang thật (mouse/touch có thể vẫn phát click
  // dù đã preventDefault trên pointermove) — bỏ qua click đó để không ghi đè
  // trạng thái open/close mà pointerup vừa quyết định.
  const suppressNextClick = useRef(false);

  function close() {
    setOpen(false);
    setDragX(0);
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragInfo.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseOffset: open ? -ACTION_WIDTH : 0,
      axis: 'none',
    };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const info = dragInfo.current;
    if (!info || info.pointerId !== e.pointerId) return;

    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;

    if (info.axis === 'none') {
      if (Math.abs(dx) < AXIS_SLOP && Math.abs(dy) < AXIS_SLOP) return;
      info.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (info.axis === 'horizontal') setDragging(true);
    }
    if (info.axis !== 'horizontal') return;

    e.preventDefault();
    setDragX(Math.min(0, Math.max(-ACTION_WIDTH, info.baseOffset + dx)));
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const info = dragInfo.current;
    if (!info || info.pointerId !== e.pointerId) return;
    dragInfo.current = null;
    setDragging(false);

    if (info.axis === 'horizontal') {
      suppressNextClick.current = true;
      const shouldOpen = dragX <= -COMMIT_THRESHOLD;
      setOpen(shouldOpen);
      setDragX(shouldOpen ? -ACTION_WIDTH : 0);
    } else {
      // Không vuốt ngang: giữ nguyên trạng thái hiện có (đóng/mở).
      setDragX(open ? -ACTION_WIDTH : 0);
    }
  }

  function handlePointerCancel() {
    dragInfo.current = null;
    setDragging(false);
    setDragX(open ? -ACTION_WIDTH : 0);
  }

  function handleCardClick() {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    // Thẻ đang mở action (do vuốt hoặc focus): tap để đóng, không điều hướng.
    if (open) {
      close();
      return;
    }
    onClick();
  }

  function handleHideClick() {
    close();
    onHide(item);
  }

  return (
    <div className="card-swipe">
      <button
        type="button"
        className="card-swipe__action"
        style={{ width: ACTION_WIDTH }}
        onClick={handleHideClick}
        onFocus={() => {
          setOpen(true);
          setDragX(-ACTION_WIDTH);
        }}
        onBlur={close}
      >
        <EyeOffIcon size={20} />
        Ẩn
      </button>

      <div
        className={`card-swipe__face ${dragging ? 'card-swipe__face--dragging' : ''}`}
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <button type="button" className="card" onClick={handleCardClick}>
          <div className="card__thumb">
            {photo ? (
              <img className="card__img" src={photo} alt={item.name ?? item.code} loading="lazy" />
            ) : (
              <GemIcon size={32} className="card__placeholder" />
            )}
            {item.photoUrls.length > 1 && (
              <span className="card__count">
                <CameraIcon size={12} />
                {item.photoUrls.length}
              </span>
            )}
          </div>

          <div className="card__body">
            <div className="card__head">
              <span className="card__code">{item.code}</span>
              {item.belowFloorWarn && (
                <span className="badge-warn">
                  <WarnIcon size={12} />
                  SÁT SÀN
                </span>
              )}
            </div>

            <p className="card__stock">
              Tồn {item.quantity} · {itemKindLabel(item.itemKind)}
            </p>

            {item.name && <p className="card__name">{item.name}</p>}

            {tags.length > 0 && (
              <div className="card__tags">
                {tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="price-row">
              <PriceCell label="Giá bán" value={formatVnd(item.salePriceVnd)} valueClass="price__value--ink" />
              <PriceCell
                label="Giá sàn"
                value={formatVnd(item.floorPriceVnd)}
                valueClass="price__value--muted"
              />
              <PriceCell label="Lời" value={formatVnd(item.marginVnd)} valueClass={marginClass} />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function PriceCell({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="price">
      <span className="price__label">{label}</span>
      <span className={`price__value num ${valueClass}`}>{value}</span>
    </div>
  );
}

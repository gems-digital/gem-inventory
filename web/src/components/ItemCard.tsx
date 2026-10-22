import type { Item } from '../api/types';
import { formatVnd } from '../lib/format';
import { buildTags, itemKindLabel } from '../lib/labels';
import { GemIcon, WarnIcon, CameraIcon } from './icons';
import './ItemCard.css';

interface ItemCardProps {
  item: Item;
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const photo = item.photoUrls[0];
  const tags = buildTags(item);
  const marginClass = item.belowFloorWarn ? 'price__value--warn' : 'price__value--positive';

  return (
    <button type="button" className="card" onClick={onClick}>
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
          <PriceCell label="Giá sàn" value={formatVnd(item.floorPriceVnd)} valueClass="price__value--muted" />
          <PriceCell label="Lời" value={formatVnd(item.marginVnd)} valueClass={marginClass} />
        </div>
      </div>
    </button>
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

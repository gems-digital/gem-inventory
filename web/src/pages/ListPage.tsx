import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Item, ProductType } from '../api/types';
import { fetchItems } from '../api/inventory';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ItemCard } from '../components/ItemCard';
import { Spinner } from '../components/Spinner';
import { SearchIcon, PlusIcon } from '../components/icons';
import { PRODUCT_TYPE_FILTERS, roleLabel } from '../lib/labels';
import './ListPage.css';

type Status = 'loading' | 'ready' | 'error';

export function ListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [query, setQuery] = useState('');
  const [filterKey, setFilterKey] = useState<string>('all');

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (opts: { productType: ProductType | null; q: string }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('loading');
      try {
        const data = await fetchItems({
          productType: opts.productType,
          q: opts.q,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setItems(data);
        setStatus('ready');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (controller.signal.aborted) return;
        setErrorMessage(
          err instanceof ApiError ? err.message : 'Không tải được danh sách. Vui lòng thử lại.',
        );
        setStatus('error');
      }
    },
    [],
  );

  const currentFilter = PRODUCT_TYPE_FILTERS.find((f) => f.key === filterKey) ?? PRODUCT_TYPE_FILTERS[0];

  // Tải lại khi đổi filter. Search chạy qua submit/Enter (debounce-free, gọn).
  useEffect(() => {
    load({ productType: currentFilter.apiValue, q: query });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    load({ productType: currentFilter.apiValue, q: query });
  }

  function retry() {
    load({ productType: currentFilter.apiValue, q: query });
  }

  return (
    <div className="list">
      <header className="list__topbar safe-top">
        <h1 className="list__title">Kho &amp; Giá</h1>
        {user && <span className="list__role">{roleLabel(user.role)}</span>}
      </header>

      <form className="list__search" onSubmit={handleSearchSubmit} role="search">
        <span className="search-box">
          <SearchIcon size={20} className="search-box__icon" />
          <input
            className="search-box__input"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Tìm theo mã hoặc tên"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </span>
      </form>

      <div className="list__filters" role="tablist" aria-label="Lọc theo loại">
        {PRODUCT_TYPE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            role="tab"
            aria-selected={filter.key === filterKey}
            className={`chip ${filter.key === filterKey ? 'chip--on' : ''}`}
            onClick={() => setFilterKey(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <main className="list__content">
        {status === 'loading' && (
          <div className="list__center">
            <Spinner />
          </div>
        )}

        {status === 'error' && (
          <div className="list__center list__state">
            <p className="list__state-msg">{errorMessage}</p>
            <button type="button" className="btn-retry" onClick={retry}>
              Thử lại
            </button>
          </div>
        )}

        {status === 'ready' && items.length === 0 && (
          <div className="list__center list__state">
            <p className="list__state-title">Chưa có món nào</p>
            <p className="list__state-msg">Nhấn ＋ để thêm món đầu tiên.</p>
          </div>
        )}

        {status === 'ready' && items.length > 0 && (
          <ul className="list__grid">
            {items.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} onClick={() => navigate(`/detail/${item.id}`)} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <button
        type="button"
        className="fab safe-bottom"
        aria-label="Thêm món"
        onClick={() => navigate('/add')}
      >
        <PlusIcon size={26} />
      </button>
    </div>
  );
}

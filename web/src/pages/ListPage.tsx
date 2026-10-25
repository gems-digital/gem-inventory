import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Item, ProductType } from '../api/types';
import { deleteItem, fetchItems, restoreItem } from '../api/inventory';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ItemCard } from '../components/ItemCard';
import { Spinner } from '../components/Spinner';
import { SearchIcon, PlusIcon } from '../components/icons';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Snackbar } from '../components/Snackbar';
import { PRODUCT_TYPE_FILTERS, roleLabel } from '../lib/labels';
import './ListPage.css';

type Status = 'loading' | 'ready' | 'error';

interface UndoState {
  item: Item;
  index: number;
}

/** Nhãn ngắn cho snackbar: mã + tên (nếu có). */
function itemTag(item: Item): string {
  return item.name ? `${item.code} · ${item.name}` : item.code;
}

export function ListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [query, setQuery] = useState('');
  const [filterKey, setFilterKey] = useState<string>('all');

  const [pendingHide, setPendingHide] = useState<Item | null>(null);
  const [hiding, setHiding] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

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

  // Đến từ DetailPage sau khi ẩn món ở đó (step 4): hiện lại snackbar hoàn tác ở đây.
  // Xoá state ngay để back/forward hoặc F5 không lặp lại snackbar.
  useEffect(() => {
    const state = location.state as { undoItem?: Item } | null;
    if (state?.undoItem) {
      setUndo({ item: state.undoItem, index: 0 });
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    load({ productType: currentFilter.apiValue, q: query });
  }

  function retry() {
    load({ productType: currentFilter.apiValue, q: query });
  }

  function requestHide(item: Item) {
    setPendingHide(item);
  }

  async function confirmHide() {
    const item = pendingHide;
    if (!item) return;
    setPendingHide(null);
    setHiding(true);

    const index = items.findIndex((i) => i.id === item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    try {
      await deleteItem(item.id);
      setUndo({ item, index: index < 0 ? 0 : index });
    } catch (err) {
      // Rollback: chèn lại đúng vị trí cũ.
      setItems((prev) => {
        const next = [...prev];
        next.splice(Math.min(index < 0 ? 0 : index, next.length), 0, item);
        return next;
      });
      setToastError(err instanceof ApiError ? err.message : 'Không ẩn được món. Vui lòng thử lại.');
    } finally {
      setHiding(false);
    }
  }

  async function handleUndo() {
    const pending = undo;
    if (!pending) return;
    setUndo(null);

    // Chèn lại ngay cho mượt, xác nhận với server sau.
    setItems((prev) => {
      if (prev.some((i) => i.id === pending.item.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(pending.index, next.length), 0, pending.item);
      return next;
    });

    try {
      await restoreItem(pending.item.id);
    } catch (err) {
      setItems((prev) => prev.filter((i) => i.id !== pending.item.id));
      setToastError(err instanceof ApiError ? err.message : 'Không hoàn tác được. Vui lòng thử lại.');
    }
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
                <ItemCard
                  item={item}
                  onClick={() => navigate(`/detail/${item.id}`)}
                  onHide={requestHide}
                />
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

      <ConfirmDialog
        open={pendingHide !== null}
        title="Ẩn món này?"
        message="Món sẽ ẩn khỏi danh sách. Ảnh, giá và lịch sử vẫn được giữ lại, bạn có thể hoàn tác sau."
        confirmLabel="Ẩn món"
        busy={hiding}
        onCancel={() => setPendingHide(null)}
        onConfirm={confirmHide}
      />

      {undo && (
        <Snackbar
          message={`Đã ẩn ${itemTag(undo.item)}`}
          actionLabel="HOÀN TÁC"
          onAction={handleUndo}
          onDismiss={() => setUndo(null)}
        />
      )}

      {!undo && toastError && (
        <Snackbar message={toastError} tone="danger" onDismiss={() => setToastError(null)} />
      )}
    </div>
  );
}

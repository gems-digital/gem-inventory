import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Item, ItemInput, ProductType } from '../api/types';
import { fetchItem, createItem, updateItem } from '../api/inventory';
import { uploadPhotos } from '../api/photos';
import { ApiError } from '../api/client';
import { Spinner } from '../components/Spinner';
import { BackIcon, PlusIcon, CloseIcon, CameraIcon } from '../components/icons';
import { TextField, SelectField, Segmented, ChipGroup } from '../components/FormFields';
import { productTypeLabel } from '../lib/labels';
import {
  dimensionFields,
  buildDimensionsPayload,
  dimensionsToInputMap,
  TREATMENT_OPTIONS,
  TRANSPARENCY_OPTIONS,
  ORIGIN_OPTIONS,
  type Option,
  type FieldKind,
} from '../lib/attributes';
import './AddEditPage.css';

const MAX_PHOTOS = 8;

const PRODUCT_TYPE_OPTIONS: Option[] = (['ring', 'bracelet', 'beads', 'pendant'] as ProductType[]).map(
  (t) => ({ value: t, label: productTypeLabel(t) }),
);
const KIND_OPTIONS: Option[] = [
  { value: 'unique', label: 'Độc bản' },
  { value: 'batch', label: 'Hàng loạt' },
];
const YES_NO_OPTIONS: Option[] = [
  { value: 'true', label: 'Có' },
  { value: 'false', label: 'Không' },
];
const MENH_OPTIONS: Option[] = [
  { value: 'Kim', label: 'Kim' },
  { value: 'Moc', label: 'Mộc' },
  { value: 'Thuy', label: 'Thủy' },
  { value: 'Hoa', label: 'Hỏa' },
  { value: 'Tho', label: 'Thổ' },
];

type PhotoRef =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; file: File; preview: string };

interface FormState {
  code: string;
  name: string;
  itemKind: string;
  quantity: string;
  productType: ProductType;
  jadeType: string;
  color: string;
  note: string;
  menh: string[];
  dim: Record<string, string>;
  treatment: string;
  transparency: string;
  origin: string;
  weightGram: string;
  certificateCode: string;
  costPrice: string;
  salePrice: string;
  floorPrice: string;
  photos: PhotoRef[];
}

const EMPTY: FormState = {
  code: '',
  name: '',
  itemKind: 'unique',
  quantity: '1',
  productType: 'ring',
  jadeType: '',
  color: '',
  note: '',
  menh: [],
  dim: {},
  treatment: '',
  transparency: '',
  origin: '',
  weightGram: '',
  certificateCode: '',
  costPrice: '',
  salePrice: '',
  floorPrice: '',
  photos: [],
};

const digits = (v: string) => v.replace(/\D/g, '');
const isNonNegInt = (v: string) => /^\d+$/.test(v) && Number(v) >= 0;

export function AddEditPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Giữ các object URL đã tạo để thu hồi khi rời trang (tránh leak bộ nhớ).
  const createdUrls = useRef<string[]>([]);

  const patch = useCallback((changes: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...changes }));
  }, []);

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const loadExisting = useCallback(async (itemId: string) => {
    setLoadingExisting(true);
    setLoadError(null);
    try {
      const item = await fetchItem(itemId);
      setForm(prefill(item));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được món để sửa.');
    } finally {
      setLoadingExisting(false);
    }
  }, []);

  useEffect(() => {
    if (id) loadExisting(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Cleanup các preview URL khi unmount.
    return () => {
      createdUrls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setForm((prev) => {
      const room = MAX_PHOTOS - prev.photos.length;
      if (room <= 0) return prev;
      const picked = Array.from(files)
        .slice(0, room)
        .map((file) => {
          const preview = URL.createObjectURL(file);
          createdUrls.current.push(preview);
          return { kind: 'local' as const, file, preview };
        });
      return { ...prev, photos: [...prev.photos, ...picked] };
    });
    clearFieldError('photos');
  }

  function removePhoto(index: number) {
    setForm((prev) => {
      const ref = prev.photos[index];
      if (ref && ref.kind === 'local') URL.revokeObjectURL(ref.preview);
      return { ...prev, photos: prev.photos.filter((_, i) => i !== index) };
    });
  }

  function onItemKind(value: string) {
    // Độc bản: tồn mặc định 1.
    patch({ itemKind: value, quantity: value === 'unique' ? '1' : form.quantity });
  }

  function setDim(key: string, value: string) {
    setForm((prev) => {
      const dim = { ...prev.dim };
      if (value.trim() === '') delete dim[key];
      else dim[key] = value;
      return { ...prev, dim };
    });
  }

  function toggleMenh(value: string) {
    setForm((prev) => ({
      ...prev,
      menh: prev.menh.includes(value) ? prev.menh.filter((m) => m !== value) : [...prev.menh, value],
    }));
  }

  const priceWarning = computePriceWarning(form);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.code.trim()) errors.code = 'Vui lòng nhập mã món';
    if (form.photos.length === 0) errors.photos = 'Cần ít nhất 1 ảnh';
    else if (form.photos.length > MAX_PHOTOS) errors.photos = `Tối đa ${MAX_PHOTOS} ảnh`;
    if (!isNonNegInt(form.quantity)) errors.quantity = 'Số lượng phải là số nguyên ≥ 0';
    if (!isNonNegInt(form.costPrice)) errors.costPrice = 'Giá nhập phải là số ≥ 0';
    if (!isNonNegInt(form.salePrice)) errors.salePrice = 'Giá bán phải là số ≥ 0';
    if (!isNonNegInt(form.floorPrice)) errors.floorPrice = 'Giá sàn phải là số ≥ 0';
    return errors;
  }

  async function handleSave() {
    if (saving || loadingExisting) return;
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Vui lòng kiểm tra các trường còn thiếu.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 1) Upload ảnh mới (local) → publicUrl theo thứ tự.
      const localFiles = form.photos.filter((p): p is Extract<PhotoRef, { kind: 'local' }> => p.kind === 'local');
      const uploaded = await uploadPhotos(localFiles.map((p) => p.file));

      // 2) Ghép photoUrls theo đúng thứ tự hiển thị (ảnh cũ giữ nguyên).
      const queue = [...uploaded];
      const photoUrls = form.photos.map((p) => (p.kind === 'remote' ? p.url : (queue.shift() as string)));

      // 3) Dựng body & gọi create/update.
      const input = buildInput(form, photoUrls);
      const saved = id ? await updateItem(id, input) : await createItem(input);

      // 4) Quay về chi tiết (sửa) hoặc danh sách (tạo) — remount → refresh.
      navigate(id ? `/detail/${saved.id}` : '/list', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFieldErrors((prev) => ({ ...prev, code: err.message }));
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : 'Lưu món thất bại. Vui lòng thử lại.');
      }
      setSaving(false);
    }
  }

  if (loadingExisting) {
    return (
      <div className="form-page">
        <TopBar title="Sửa món" onBack={() => navigate(-1)} />
        <div className="form-page__center">
          <Spinner />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="form-page">
        <TopBar title="Sửa món" onBack={() => navigate(-1)} />
        <div className="form-page__center">
          <p className="form-page__error-msg">{loadError}</p>
          <button type="button" className="btn-retry" onClick={() => id && loadExisting(id)}>
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const fields = dimensionFields(form.productType);

  return (
    <div className="form-page">
      <TopBar title={isEdit ? 'Sửa món' : 'Thêm món'} onBack={() => navigate(-1)} />

      <div className="form-page__body">
        {/* ẢNH */}
        <section className="form-section">
          <h2 className="form-section__title">Ảnh ({form.photos.length}/{MAX_PHOTOS})</h2>
          <div className="photo-grid">
            {form.photos.map((p, i) => (
              <div className="photo-cell" key={p.kind === 'remote' ? p.url : p.preview}>
                <img src={p.kind === 'remote' ? p.url : p.preview} alt="" />
                <button
                  type="button"
                  className="photo-cell__remove"
                  aria-label="Xóa ảnh"
                  onClick={() => removePhoto(i)}
                >
                  <CloseIcon size={14} />
                </button>
                {i === 0 && <span className="photo-cell__badge">Đại diện</span>}
              </div>
            ))}
            {form.photos.length < MAX_PHOTOS && (
              <>
                <button type="button" className="photo-add" onClick={() => fileInputRef.current?.click()}>
                  <PlusIcon size={22} />
                  <span>Thư viện</span>
                </button>
                <button type="button" className="photo-add" onClick={() => cameraInputRef.current?.click()}>
                  <CameraIcon size={20} />
                  <span>Chụp</span>
                </button>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onPickFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              onPickFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {fieldErrors.photos && <p className="form-field-error">{fieldErrors.photos}</p>}
        </section>

        {/* CƠ BẢN */}
        <div className="form-row">
          <TextField
            label="Mã *"
            value={form.code}
            onChange={(v) => {
              patch({ code: v });
              clearFieldError('code');
            }}
            error={fieldErrors.code}
          />
          <TextField label="Tên" value={form.name} onChange={(v) => patch({ name: v })} />
        </div>

        <Segmented value={form.itemKind} onChange={onItemKind} options={KIND_OPTIONS} />

        <div className="form-row">
          <TextField
            label="Số lượng tồn"
            value={form.quantity}
            onChange={(v) => {
              patch({ quantity: digits(v) });
              clearFieldError('quantity');
            }}
            inputMode="numeric"
            error={fieldErrors.quantity}
          />
          <SelectField
            label="Loại sản phẩm"
            value={form.productType}
            onChange={(v) => patch({ productType: v as ProductType })}
            options={PRODUCT_TYPE_OPTIONS}
            allowEmpty={false}
          />
        </div>

        <div className="form-row">
          <TextField label="Loại ngọc / chất liệu" value={form.jadeType} onChange={(v) => patch({ jadeType: v })} />
          <TextField label="Màu" value={form.color} onChange={(v) => patch({ color: v })} />
        </div>

        {/* KÍCH THƯỚC (đổi theo loại) */}
        <section className="form-section">
          <h2 className="form-section__title">Kích thước</h2>
          <p className="form-section__hint">ly = mm</p>
          <div className="dim-grid">
            {fields.map((field) => {
              const value = form.dim[field.key] ?? '';
              if (field.kind === 'enum') {
                return (
                  <SelectField
                    key={field.key}
                    label={field.label}
                    value={value}
                    onChange={(v) => setDim(field.key, v)}
                    options={field.options ?? []}
                  />
                );
              }
              if (field.kind === 'bool') {
                return (
                  <SelectField
                    key={field.key}
                    label={field.label}
                    value={value}
                    onChange={(v) => setDim(field.key, v)}
                    options={YES_NO_OPTIONS}
                  />
                );
              }
              return (
                <TextField
                  key={field.key}
                  label={field.unit ? `${field.label} (${field.unit})` : field.label}
                  value={value}
                  onChange={(v) => setDim(field.key, sanitizeNum(v, field.kind))}
                  inputMode={field.kind === 'text' ? 'text' : field.kind === 'int' ? 'numeric' : 'decimal'}
                />
              );
            })}
          </div>
        </section>

        {/* ĐẶC ĐIỂM (tùy chọn) */}
        <section className="form-section">
          <h2 className="form-section__title">Đặc điểm (tùy chọn)</h2>
          <div className="form-row">
            <SelectField label="Phân loại" value={form.treatment} onChange={(v) => patch({ treatment: v })} options={TREATMENT_OPTIONS} />
            <SelectField label="Độ trong (nước)" value={form.transparency} onChange={(v) => patch({ transparency: v })} options={TRANSPARENCY_OPTIONS} />
          </div>
          <div className="form-row">
            <SelectField label="Nguồn gốc" value={form.origin} onChange={(v) => patch({ origin: v })} options={ORIGIN_OPTIONS} />
            <TextField
              label="Trọng lượng (g)"
              value={form.weightGram}
              onChange={(v) => patch({ weightGram: v.replace(/[^\d.]/g, '') })}
              inputMode="decimal"
            />
          </div>
          <TextField label="Mã kiểm định" value={form.certificateCode} onChange={(v) => patch({ certificateCode: v })} />
        </section>

        <ChipGroup label="Mệnh" selected={form.menh} options={MENH_OPTIONS} onToggle={toggleMenh} />

        <TextField label="Ghi chú" value={form.note} onChange={(v) => patch({ note: v })} multiline />

        {/* GIÁ */}
        <section className="form-section card-surface">
          <PriceField
            label="Giá nhập (VND)"
            internal
            value={form.costPrice}
            onChange={(v) => {
              patch({ costPrice: digits(v) });
              clearFieldError('costPrice');
            }}
            error={fieldErrors.costPrice}
          />
          <PriceField
            label="Giá bán (VND)"
            value={form.salePrice}
            onChange={(v) => {
              patch({ salePrice: digits(v) });
              clearFieldError('salePrice');
            }}
            error={fieldErrors.salePrice}
          />
          <PriceField
            label="Giá sàn (VND)"
            internal
            value={form.floorPrice}
            onChange={(v) => {
              patch({ floorPrice: digits(v) });
              clearFieldError('floorPrice');
            }}
            error={fieldErrors.floorPrice}
          />
          {priceWarning && <p className="price-warning">{priceWarning}</p>}
        </section>

        {error && <p className="form-field-error form-field-error--block">{error}</p>}

        <button type="button" className="form-save" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size={22} color="var(--ivory)" stroke={2} /> : 'Lưu món'}
        </button>
      </div>
    </div>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="topbar safe-top">
      <button type="button" className="topbar__btn" onClick={onBack} aria-label="Quay lại">
        <BackIcon size={22} />
      </button>
      <h1 className="topbar__title">{title}</h1>
      <span className="topbar__spacer" />
    </header>
  );
}

function PriceField({
  label,
  value,
  onChange,
  error,
  internal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  internal?: boolean;
}) {
  return (
    <div className="price-field">
      <div className="price-field__head">
        <span className="price-field__label">{label}</span>
        {internal && <span className="chip-internal">NỘI BỘ</span>}
      </div>
      <span className={`ff__box ${error ? 'ff__box--error' : ''}`}>
        <input
          className="ff__input num"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
      {error && <span className="ff__error">{error}</span>}
    </div>
  );
}

function sanitizeNum(v: string, kind: FieldKind): string {
  if (kind === 'int') return v.replace(/\D/g, '');
  if (kind === 'number') return v.replace(/[^\d.,]/g, '');
  return v; // text (enum/bool không đi qua đây)
}

function computePriceWarning(form: FormState): string | null {
  const sale = Number(form.salePrice);
  if (!form.salePrice || !Number.isFinite(sale)) return null;
  const issues: string[] = [];
  if (form.floorPrice && Number(form.floorPrice) > sale) issues.push('giá sàn cao hơn giá bán');
  if (form.costPrice && Number(form.costPrice) > sale) issues.push('giá nhập cao hơn giá bán');
  return issues.length > 0 ? `Kiểm tra lại: ${issues.join(' và ')}` : null;
}

function prefill(item: Item): FormState {
  return {
    code: item.code,
    name: item.name ?? '',
    itemKind: item.itemKind,
    quantity: String(item.quantity),
    productType: item.productType,
    jadeType: item.jadeType ?? '',
    color: item.color ?? '',
    note: item.note ?? '',
    dim: dimensionsToInputMap(item.dimensions),
    treatment: item.treatment ?? '',
    transparency: item.transparency ?? '',
    origin: item.origin ?? '',
    weightGram: item.weightGram != null ? String(item.weightGram) : '',
    certificateCode: item.certificateCode ?? '',
    costPrice: item.costPriceVnd != null ? String(item.costPriceVnd) : '',
    salePrice: String(item.salePriceVnd),
    floorPrice: item.floorPriceVnd != null ? String(item.floorPriceVnd) : '',
    photos: item.photoUrls.map((url) => ({ kind: 'remote', url })),
    menh: item.menh,
  };
}

function buildInput(form: FormState, photoUrls: string[]): ItemInput {
  const input: ItemInput = {
    code: form.code.trim(),
    name: form.name.trim() || null,
    itemKind: form.itemKind as ItemInput['itemKind'],
    productType: form.productType,
    jadeType: form.jadeType.trim() || null,
    color: form.color.trim() || null,
    note: form.note.trim() || null,
    menh: form.menh,
    photoUrls,
    quantity: Number(form.quantity) || 0,
    costPriceVnd: Number(form.costPrice) || 0,
    salePriceVnd: Number(form.salePrice) || 0,
    floorPriceVnd: Number(form.floorPrice) || 0,
  };
  const dimensions = buildDimensionsPayload(form.productType, form.dim);
  if (dimensions) input.dimensions = dimensions;
  if (form.treatment) input.treatment = form.treatment;
  if (form.transparency) input.transparency = form.transparency;
  if (form.origin) input.origin = form.origin;
  const weight = Number.parseFloat(form.weightGram);
  if (form.weightGram && Number.isFinite(weight)) input.weightGram = weight;
  if (form.certificateCode.trim()) input.certificateCode = form.certificateCode.trim();
  return input;
}

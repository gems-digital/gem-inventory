/**
 * Lỗi nghiệp vụ dùng chung giữa repository/service/routes của module items.
 */

export class ItemNotFoundError extends Error {
  constructor() {
    super('Không tìm thấy món hàng');
  }
}

export class DuplicateItemCodeError extends Error {
  constructor(code: string) {
    super(`Mã "${code}" đã tồn tại`);
  }
}

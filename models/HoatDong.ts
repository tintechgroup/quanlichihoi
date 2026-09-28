import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type PhamViHoatDong =
  | "LIEN_CHI_HOI"
  | "CHI_HOI";

export type TrangThaiHoatDong =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "SAP_DIEN_RA"
  | "DANG_DIEN_RA"
  | "DA_KET_THUC"
  | "DA_HUY";

export interface IHoatDong
  extends Document {
  maHoatDong: string;
  tenHoatDong: string;

  moTa: string;
  noiDung: string;

  phamVi: PhamViHoatDong;
  chiHoiId?: Types.ObjectId | null;

  donViToChuc: string;
  diaDiem: string;

  thoiGianBatDau: Date;
  thoiGianKetThuc: Date;
  hanDangKy?: Date | null;

  soLuongToiDa?: number | null;

  trangThai: TrangThaiHoatDong;

  nguoiTaoId: Types.ObjectId;
  nguoiDuyetId?: Types.ObjectId | null;

  ngayDuyet?: Date | null;
  lyDoHuy: string;

  createdAt: Date;
  updatedAt: Date;
}

const HoatDongSchema =
  new Schema<IHoatDong>(
    {
      maHoatDong: {
        type: String,
        required: [
          true,
          "Mã hoạt động không được để trống",
        ],
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: [
          50,
          "Mã hoạt động không được vượt quá 50 ký tự",
        ],
      },

      tenHoatDong: {
        type: String,
        required: [
          true,
          "Tên hoạt động không được để trống",
        ],
        trim: true,
        maxlength: [
          255,
          "Tên hoạt động không được vượt quá 255 ký tự",
        ],
      },

      moTa: {
        type: String,
        trim: true,
        maxlength: [
          2000,
          "Mô tả không được vượt quá 2000 ký tự",
        ],
        default: "",
      },

      noiDung: {
        type: String,
        trim: true,
        maxlength: [
          10000,
          "Nội dung không được vượt quá 10000 ký tự",
        ],
        default: "",
      },

      phamVi: {
        type: String,
        enum: {
          values: [
            "LIEN_CHI_HOI",
            "CHI_HOI",
          ],
          message:
            "Phạm vi hoạt động không hợp lệ",
        },
        required: [
          true,
          "Phạm vi hoạt động không được để trống",
        ],
        default: "LIEN_CHI_HOI",
        index: true,
      },

      chiHoiId: {
        type: Schema.Types.ObjectId,
        ref: "ChiHoi",
        default: null,
        index: true,
      },

      donViToChuc: {
        type: String,
        trim: true,
        maxlength: [
          255,
          "Đơn vị tổ chức không được vượt quá 255 ký tự",
        ],
        default: "",
      },

      diaDiem: {
        type: String,
        required: [
          true,
          "Địa điểm không được để trống",
        ],
        trim: true,
        maxlength: [
          500,
          "Địa điểm không được vượt quá 500 ký tự",
        ],
      },

      thoiGianBatDau: {
        type: Date,
        required: [
          true,
          "Thời gian bắt đầu không được để trống",
        ],
        index: true,
      },

      thoiGianKetThuc: {
        type: Date,
        required: [
          true,
          "Thời gian kết thúc không được để trống",
        ],
        index: true,
      },

      hanDangKy: {
        type: Date,
        default: null,
      },

      soLuongToiDa: {
        type: Number,
        min: [
          1,
          "Số lượng tối đa phải lớn hơn 0",
        ],
        default: null,
      },

      trangThai: {
        type: String,
        enum: {
          values: [
            "CHO_DUYET",
            "DA_DUYET",
            "SAP_DIEN_RA",
            "DANG_DIEN_RA",
            "DA_KET_THUC",
            "DA_HUY",
          ],
          message:
            "Trạng thái hoạt động không hợp lệ",
        },
        default: "CHO_DUYET",
        required: true,
        index: true,
      },

      nguoiTaoId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Người tạo hoạt động không được để trống",
        ],
        index: true,
      },

      nguoiDuyetId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      ngayDuyet: {
        type: Date,
        default: null,
      },

      lyDoHuy: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Lý do hủy không được vượt quá 1000 ký tự",
        ],
        default: "",
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

/*
 * Tương thích Mongoose 9:
 * pre middleware không sử dụng next().
 */
HoatDongSchema.pre(
  "validate",
  function () {
    if (
      this.thoiGianBatDau &&
      this.thoiGianKetThuc &&
      this.thoiGianKetThuc <=
        this.thoiGianBatDau
    ) {
      this.invalidate(
        "thoiGianKetThuc",
        "Thời gian kết thúc phải sau thời gian bắt đầu"
      );
    }

    if (
      this.hanDangKy &&
      this.thoiGianBatDau &&
      this.hanDangKy >
        this.thoiGianBatDau
    ) {
      this.invalidate(
        "hanDangKy",
        "Hạn đăng ký không được sau thời gian bắt đầu"
      );
    }

    if (
      this.phamVi === "CHI_HOI" &&
      !this.chiHoiId
    ) {
      this.invalidate(
        "chiHoiId",
        "Hoạt động cấp Chi hội phải chọn Chi hội"
      );
    }

    /*
     * Hoạt động toàn Liên Chi hội
     * không gắn với một Chi hội cụ thể.
     */
    if (
      this.phamVi === "LIEN_CHI_HOI"
    ) {
      this.chiHoiId = null;
    }
  }
);

/*
 * Tăng tốc lọc hoạt động theo
 * trạng thái và thời gian bắt đầu.
 */
HoatDongSchema.index({
  trangThai: 1,
  thoiGianBatDau: 1,
});

/*
 * Tăng tốc lọc hoạt động theo Chi hội.
 */
HoatDongSchema.index({
  phamVi: 1,
  chiHoiId: 1,
  trangThai: 1,
});

/*
 * Tăng tốc lấy hoạt động
 * theo người tạo.
 */
HoatDongSchema.index({
  nguoiTaoId: 1,
  createdAt: -1,
});

/*
 * Hỗ trợ tìm kiếm hoạt động.
 */
HoatDongSchema.index({
  maHoatDong: "text",
  tenHoatDong: "text",
  moTa: "text",
  donViToChuc: "text",
  diaDiem: "text",
});

const HoatDong: Model<IHoatDong> =
  (mongoose.models
    .HoatDong as Model<IHoatDong>) ||
  mongoose.model<IHoatDong>(
    "HoatDong",
    HoatDongSchema
  );

export default HoatDong;
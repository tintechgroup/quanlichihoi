import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

/* =========================================================
 * TYPES
 * ======================================================= */

export type LoaiSaoLuu =
  | "THU_CONG"
  | "TU_DONG";

export type TrangThaiSaoLuu =
  | "DANG_XU_LY"
  | "HOAN_THANH"
  | "THAT_BAI";

export interface IChiTietCollectionSaoLuu {
  tenCollection: string;
  soBanGhi: number;
  dungLuong?: number;
}

export interface ISaoLuu extends Document {
  maSaoLuu: string;
  tenTep: string;

  loaiSaoLuu: LoaiSaoLuu;
  trangThai: TrangThaiSaoLuu;

  /*
   * ID file được lưu trong MongoDB GridFS.
   */
  gridFsFileId?: Types.ObjectId;

  mimeType: string;
  phienBan: string;

  tongSoBanGhi: number;
  dungLuong: number;

  danhSachCollection: IChiTietCollectionSaoLuu[];

  nguoiTaoId?: Types.ObjectId;
  tenDangNhap?: string;
  hoTenNguoiTao?: string;

  thoiGianBatDau: Date;
  thoiGianHoanThanh?: Date;

  checksum?: string;
  ghiChu?: string;
  loi?: string;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================================================
 * COLLECTION DETAIL SCHEMA
 * ======================================================= */

const ChiTietCollectionSchema =
  new Schema<IChiTietCollectionSaoLuu>(
    {
      tenCollection: {
        type: String,
        required: [
          true,
          "Tên collection không được để trống",
        ],
        trim: true,
        maxlength: [
          150,
          "Tên collection không được vượt quá 150 ký tự",
        ],
      },

      soBanGhi: {
        type: Number,
        required: true,
        min: [
          0,
          "Số bản ghi không được nhỏ hơn 0",
        ],
        default: 0,
      },

      dungLuong: {
        type: Number,
        min: [
          0,
          "Dung lượng không được nhỏ hơn 0",
        ],
        default: 0,
      },
    },
    {
      _id: false,
    },
  );

/* =========================================================
 * BACKUP SCHEMA
 * ======================================================= */

const SaoLuuSchema = new Schema<ISaoLuu>(
  {
    maSaoLuu: {
      type: String,
      required: [
        true,
        "Mã sao lưu không được để trống",
      ],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [
        100,
        "Mã sao lưu không được vượt quá 100 ký tự",
      ],
      index: true,
    },

    tenTep: {
      type: String,
      required: [
        true,
        "Tên tệp sao lưu không được để trống",
      ],
      trim: true,
      maxlength: [
        255,
        "Tên tệp không được vượt quá 255 ký tự",
      ],
    },

    loaiSaoLuu: {
      type: String,
      enum: {
        values: ["THU_CONG", "TU_DONG"],
        message: "Loại sao lưu không hợp lệ",
      },
      default: "THU_CONG",
      index: true,
    },

    trangThai: {
      type: String,
      enum: {
        values: [
          "DANG_XU_LY",
          "HOAN_THANH",
          "THAT_BAI",
        ],
        message: "Trạng thái sao lưu không hợp lệ",
      },
      default: "DANG_XU_LY",
      index: true,
    },

    gridFsFileId: {
      type: Schema.Types.ObjectId,
      default: undefined,
      index: true,
    },

    mimeType: {
      type: String,
      trim: true,
      default: "application/json",
      maxlength: [
        150,
        "MIME type không được vượt quá 150 ký tự",
      ],
    },

    phienBan: {
      type: String,
      trim: true,
      default: "1.0",
      maxlength: [
        30,
        "Phiên bản không được vượt quá 30 ký tự",
      ],
    },

    tongSoBanGhi: {
      type: Number,
      default: 0,
      min: [
        0,
        "Tổng số bản ghi không được nhỏ hơn 0",
      ],
    },

    dungLuong: {
      type: Number,
      default: 0,
      min: [
        0,
        "Dung lượng không được nhỏ hơn 0",
      ],
    },

    danhSachCollection: {
      type: [ChiTietCollectionSchema],
      default: [],
    },

    nguoiTaoId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
      index: true,
    },

    tenDangNhap: {
      type: String,
      trim: true,
      maxlength: [
        100,
        "Tên đăng nhập không được vượt quá 100 ký tự",
      ],
      default: undefined,
    },

    hoTenNguoiTao: {
      type: String,
      trim: true,
      maxlength: [
        150,
        "Họ tên người tạo không được vượt quá 150 ký tự",
      ],
      default: undefined,
    },

    thoiGianBatDau: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    thoiGianHoanThanh: {
      type: Date,
      default: undefined,
    },

    checksum: {
      type: String,
      trim: true,
      maxlength: [
        128,
        "Checksum không được vượt quá 128 ký tự",
      ],
      default: undefined,
    },

    ghiChu: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Ghi chú không được vượt quá 1000 ký tự",
      ],
      default: undefined,
    },

    loi: {
      type: String,
      trim: true,
      maxlength: [
        3000,
        "Nội dung lỗi không được vượt quá 3000 ký tự",
      ],
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: "sao_luu",
    versionKey: false,
  },
);

/* =========================================================
 * INDEXES
 * ======================================================= */

SaoLuuSchema.index({
  createdAt: -1,
});

SaoLuuSchema.index({
  trangThai: 1,
  createdAt: -1,
});

SaoLuuSchema.index({
  loaiSaoLuu: 1,
  createdAt: -1,
});

SaoLuuSchema.index({
  nguoiTaoId: 1,
  createdAt: -1,
});

/* =========================================================
 * VIRTUAL FIELDS
 * ======================================================= */

SaoLuuSchema.virtual("coTepSaoLuu").get(
  function () {
    return Boolean(this.gridFsFileId);
  },
);

SaoLuuSchema.virtual("thoiGianXuLy").get(
  function () {
    if (
      !this.thoiGianBatDau ||
      !this.thoiGianHoanThanh
    ) {
      return null;
    }

    return (
      this.thoiGianHoanThanh.getTime() -
      this.thoiGianBatDau.getTime()
    );
  },
);

SaoLuuSchema.set("toJSON", {
  virtuals: true,
});

SaoLuuSchema.set("toObject", {
  virtuals: true,
});

/* =========================================================
 * MODEL
 * ======================================================= */

const SaoLuu: Model<ISaoLuu> =
  mongoose.models.SaoLuu ||
  mongoose.model<ISaoLuu>(
    "SaoLuu",
    SaoLuuSchema,
  );

export default SaoLuu;
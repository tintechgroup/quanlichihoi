import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

/* =========================================================
   TYPES
========================================================= */

export type PhamViHoatDong =
  | "LIEN_CHI_HOI"
  | "CHI_HOI";

export type TrangThaiHoatDong =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "SAP_DIEN_RA"
  | "DANG_DIEN_RA"
  | "DA_KET_THUC"
  | "DA_HUY";

export interface IFileKeHoach {
  tenTep: string;

  duongDan: string;

  pathname?: string;

  mimeType?: string;

  kichThuoc?: number;
}

export interface IHoatDong
  extends Document {
  maHoatDong: string;

  tenHoatDong: string;

  moTa: string;

  noiDung: string;

  /*
   * Dùng riêng cho đề xuất
   * hoạt động cấp Chi hội.
   */
  mucDich: string;

  phamVi: PhamViHoatDong;

  chiHoiId?:
    | Types.ObjectId
    | null;

  donViToChuc: string;

  diaDiem: string;

  thoiGianBatDau: Date;

  thoiGianKetThuc: Date;

  hanDangKy?:
    | Date
    | null;

  soLuongToiDa?:
    | number
    | null;

  /*
   * Dự trù kinh phí.
   */
  duTruKinhPhi: number;

  /*
   * File kế hoạch lưu trên
   * Private Vercel Blob.
   */
  fileKeHoach?:
    | IFileKeHoach
    | null;

  /*
   * Phân biệt hoạt động được tạo
   * trực tiếp bởi Admin/BCH
   * và đề xuất do Chi hội trưởng gửi.
   */
  laDeXuatChiHoi: boolean;

  trangThai:
    TrangThaiHoatDong;

  nguoiTaoId:
    Types.ObjectId;

  nguoiDuyetId?:
    | Types.ObjectId
    | null;

  ngayGuiPheDuyet?:
    | Date
    | null;

  ngayDuyet?:
    | Date
    | null;

  lyDoTuChoi: string;

  lyDoHuy: string;

  createdAt: Date;

  updatedAt: Date;
}

/* =========================================================
   FILE KẾ HOẠCH SCHEMA
========================================================= */

const FileKeHoachSchema =
  new Schema<IFileKeHoach>(
    {
      tenTep: {
        type: String,

        required: [
          true,
          "Tên file kế hoạch không được để trống",
        ],

        trim: true,

        maxlength: [
          500,
          "Tên file không được vượt quá 500 ký tự",
        ],
      },

      duongDan: {
        type: String,

        required: [
          true,
          "Đường dẫn file kế hoạch không được để trống",
        ],

        trim: true,
      },

      pathname: {
        type: String,

        trim: true,

        default: "",
      },

      mimeType: {
        type: String,

        trim: true,

        default: "",
      },

      kichThuoc: {
        type: Number,

        min: [
          0,
          "Kích thước file không hợp lệ",
        ],

        default: 0,
      },
    },
    {
      _id: false,

      versionKey: false,
    },
  );

/* =========================================================
   ACTIVITY SCHEMA
========================================================= */

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

      /* ===================================================
         MỤC ĐÍCH
      =================================================== */

      mucDich: {
        type: String,

        trim: true,

        maxlength: [
          3000,
          "Mục đích không được vượt quá 3000 ký tự",
        ],

        default: "",
      },

      /* ===================================================
         PHẠM VI
      =================================================== */

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

        default:
          "LIEN_CHI_HOI",

        index: true,
      },

      chiHoiId: {
        type:
          Schema.Types.ObjectId,

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

      /* ===================================================
         THỜI GIAN
      =================================================== */

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

      /* ===================================================
         KINH PHÍ DỰ TRÙ
      =================================================== */

      duTruKinhPhi: {
        type: Number,

        min: [
          0,
          "Dự trù kinh phí không được âm",
        ],

        default: 0,
      },

      /* ===================================================
         FILE KẾ HOẠCH
      =================================================== */

      fileKeHoach: {
        type:
          FileKeHoachSchema,

        default: null,
      },

      /* ===================================================
         ĐỀ XUẤT CẤP CHI HỘI
      =================================================== */

      laDeXuatChiHoi: {
        type: Boolean,

        default: false,

        index: true,
      },

      /* ===================================================
         TRẠNG THÁI
      =================================================== */

      trangThai: {
        type: String,

        enum: {
          values: [
            "CHO_DUYET",
            "DA_DUYET",
            "TU_CHOI",
            "SAP_DIEN_RA",
            "DANG_DIEN_RA",
            "DA_KET_THUC",
            "DA_HUY",
          ],

          message:
            "Trạng thái hoạt động không hợp lệ",
        },

        default:
          "CHO_DUYET",

        required: true,

        index: true,
      },

      /* ===================================================
         NGƯỜI TẠO / DUYỆT
      =================================================== */

      nguoiTaoId: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: [
          true,
          "Người tạo hoạt động không được để trống",
        ],

        index: true,
      },

      nguoiDuyetId: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      ngayGuiPheDuyet: {
        type: Date,

        default: null,
      },

      ngayDuyet: {
        type: Date,

        default: null,
      },

      /* ===================================================
         TỪ CHỐI
      =================================================== */

      lyDoTuChoi: {
        type: String,

        trim: true,

        maxlength: [
          2000,
          "Lý do từ chối không được vượt quá 2000 ký tự",
        ],

        default: "",
      },

      /* ===================================================
         HỦY
      =================================================== */

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

      collection:
        "hoat_dong",

      toJSON: {
        virtuals: true,
      },

      toObject: {
        virtuals: true,
      },
    },
  );

/* =========================================================
   VALIDATION
========================================================= */

/*
 * Mongoose 9:
 * middleware không dùng next().
 */
HoatDongSchema.pre(
  "validate",
  function () {
    /* =====================================================
       THỜI GIAN
    ===================================================== */

    if (
      this.thoiGianBatDau &&
      this.thoiGianKetThuc &&
      this.thoiGianKetThuc <=
        this.thoiGianBatDau
    ) {
      this.invalidate(
        "thoiGianKetThuc",

        "Thời gian kết thúc phải sau thời gian bắt đầu",
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

        "Hạn đăng ký không được sau thời gian bắt đầu",
      );
    }

    /* =====================================================
       CHI HỘI
    ===================================================== */

    if (
      this.phamVi ===
        "CHI_HOI" &&
      !this.chiHoiId
    ) {
      this.invalidate(
        "chiHoiId",

        "Hoạt động cấp Chi hội phải chọn Chi hội",
      );
    }

    /*
     * Hoạt động toàn Liên Chi hội
     * không gắn Chi hội cụ thể.
     */
    if (
      this.phamVi ===
      "LIEN_CHI_HOI"
    ) {
      this.chiHoiId =
        null;

      /*
       * Đề xuất của Chi hội
       * bắt buộc phải là CHI_HOI.
       */
      this.laDeXuatChiHoi =
        false;
    }

    /* =====================================================
       ĐỀ XUẤT CHI HỘI
    ===================================================== */

    if (
      this.laDeXuatChiHoi
    ) {
      if (
        this.phamVi !==
        "CHI_HOI"
      ) {
        this.invalidate(
          "phamVi",

          "Đề xuất hoạt động của Chi hội phải có phạm vi Chi hội",
        );
      }

      if (
        !this.chiHoiId
      ) {
        this.invalidate(
          "chiHoiId",

          "Đề xuất hoạt động phải thuộc một Chi hội",
        );
      }

      if (
        !this.mucDich?.trim()
      ) {
        this.invalidate(
          "mucDich",

          "Vui lòng nhập mục đích hoạt động",
        );
      }

      if (
        this.duTruKinhPhi ===
          undefined ||
        this.duTruKinhPhi ===
          null ||
        this.duTruKinhPhi <
          0
      ) {
        this.invalidate(
          "duTruKinhPhi",

          "Dự trù kinh phí không hợp lệ",
        );
      }

      /*
       * Đề xuất mới gửi lên
       * mặc định chờ BCH duyệt.
       */
      if (
        this.isNew &&
        !this.ngayGuiPheDuyet
      ) {
        this.ngayGuiPheDuyet =
          new Date();
      }
    }

    /* =====================================================
       TRẠNG THÁI
    ===================================================== */

    if (
      this.trangThai !==
      "TU_CHOI"
    ) {
      /*
       * Không tự xóa lý do khi đang
       * chỉnh sửa hồ sơ cũ nếu không cần.
       * Chỉ bảo đảm null/undefined về "".
       */
      this.lyDoTuChoi =
        this.lyDoTuChoi ||
        "";
    }

    if (
      this.trangThai !==
      "DA_HUY"
    ) {
      this.lyDoHuy =
        this.lyDoHuy ||
        "";
    }
  },
);

/* =========================================================
   INDEXES
========================================================= */

/*
 * Trạng thái + thời gian.
 */
HoatDongSchema.index({
  trangThai: 1,

  thoiGianBatDau: 1,
});

/*
 * Hoạt động theo Chi hội.
 */
HoatDongSchema.index({
  phamVi: 1,

  chiHoiId: 1,

  trangThai: 1,
});

/*
 * Hoạt động theo người tạo.
 */
HoatDongSchema.index({
  nguoiTaoId: 1,

  createdAt: -1,
});

/*
 * Danh sách đề xuất
 * cần BCH phê duyệt.
 */
HoatDongSchema.index({
  laDeXuatChiHoi: 1,

  trangThai: 1,

  createdAt: -1,
});

/*
 * Đề xuất của từng Chi hội.
 */
HoatDongSchema.index({
  chiHoiId: 1,

  laDeXuatChiHoi: 1,

  createdAt: -1,
});

/*
 * Search.
 */
HoatDongSchema.index({
  maHoatDong:
    "text",

  tenHoatDong:
    "text",

  mucDich:
    "text",

  moTa:
    "text",

  donViToChuc:
    "text",

  diaDiem:
    "text",
});

/* =========================================================
   MODEL
========================================================= */

const HoatDong:
  Model<IHoatDong> =
  (mongoose.models
    .HoatDong as Model<IHoatDong>) ||
  mongoose.model<IHoatDong>(
    "HoatDong",

    HoatDongSchema,
  );

export default HoatDong;
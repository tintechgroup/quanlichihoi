import mongoose, {
  Model,
  Schema,
  Types,
  models,
} from "mongoose";

/* =========================================================
   TYPES
========================================================= */

export type TrangThaiMinhChung =
  | "DA_GUI"
  | "DA_NHAN"
  | "DA_XET_DUYET"
  | "YEU_CAU_BO_SUNG";

export interface ITepMinhChung {
  tenTep: string;

  duongDan: string;

  pathname?: string;

  mimeType?: string;

  kichThuoc?: number;
}

export interface IMinhChungHoatDong {
  hoatDongId: Types.ObjectId;

  nguoiGuiId: Types.ObjectId;

  nguoiGuiTen: string;

  chiHoiId?:
    | Types.ObjectId
    | null;

  tieuDe: string;

  moTa?: string;

  ghiChu?: string;

  tepDinhKem: ITepMinhChung[];

  trangThai: TrangThaiMinhChung;

  /*
   * Người tiếp nhận / xử lý hồ sơ.
   */
  nguoiXuLyId?:
    | Types.ObjectId
    | null;

  nguoiXuLyTen?: string;
// tôi cần giải quyết những vanas đề trên nên các bạn lưu ý nha // ddd
  /*
   * Nội dung BCH/Admin yêu cầu
   * Chi hội bổ sung.
   */
  noiDungYeuCauBoSung?: string;

  ngayNhan?:
    | Date
    | null;

  ngayXetDuyet?:
    | Date
    | null;

  /*
   * Các field legacy.
   *
   * Giữ lại để dữ liệu cũ trong MongoDB
   * vẫn có thể đọc được.
   */
  fileUrl?: string;

  tenFile?: string;

  nguoiDuyetId?:
    | Types.ObjectId
    | null;

  nguoiDuyetTen?: string;

  lyDoTuChoi?: string;

  ngayDuyet?:
    | Date
    | null;

  createdAt?: Date;

  updatedAt?: Date;
}

/* =========================================================
   FILE SCHEMA
========================================================= */

const TepMinhChungSchema =
  new Schema<ITepMinhChung>(
    {
      tenTep: {
        type: String,

        required: [
          true,
          "Tên tệp không được để trống",
        ],

        trim: true,

        maxlength: [
          500,
          "Tên tệp không được vượt quá 500 ký tự",
        ],
      },

      duongDan: {
        type: String,

        required: [
          true,
          "Đường dẫn tệp không được để trống",
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
          "Kích thước tệp không hợp lệ",
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
   MAIN SCHEMA
========================================================= */

const MinhChungHoatDongSchema =
  new Schema<IMinhChungHoatDong>(
    {
      hoatDongId: {
        type: Schema.Types.ObjectId,

        ref: "HoatDong",

        required: [
          true,
          "Hoạt động không được để trống",
        ],

        index: true,
      },

      nguoiGuiId: {
        type: Schema.Types.ObjectId,

        ref: "User",

        required: [
          true,
          "Người gửi không được để trống",
        ],

        index: true,
      },

      nguoiGuiTen: {
        type: String,

        required: [
          true,
          "Tên người gửi không được để trống",
        ],

        trim: true,

        maxlength: [
          255,
          "Tên người gửi không được vượt quá 255 ký tự",
        ],
      },

      chiHoiId: {
        type: Schema.Types.ObjectId,

        ref: "ChiHoi",

        default: null,

        index: true,
      },

      tieuDe: {
        type: String,

        required: [
          true,
          "Tiêu đề minh chứng không được để trống",
        ],

        trim: true,

        maxlength: [
          255,
          "Tiêu đề minh chứng không được vượt quá 255 ký tự",
        ],
      },

      moTa: {
        type: String,

        trim: true,

        default: "",

        maxlength: [
          3000,
          "Mô tả không được vượt quá 3000 ký tự",
        ],
      },

      ghiChu: {
        type: String,

        trim: true,

        default: "",

        maxlength: [
          2000,
          "Ghi chú không được vượt quá 2000 ký tự",
        ],
      },

      tepDinhKem: {
        type: [
          TepMinhChungSchema,
        ],

        default: [],

        validate: {
          validator(
            value:
              ITepMinhChung[],
          ) {
            return (
              Array.isArray(
                value,
              ) &&
              value.length >=
                1 &&
              value.length <=
                10
            );
          },

          message:
            "Minh chứng phải có từ 1 đến 10 tệp",
        },
      },

      trangThai: {
        type: String,

        enum: {
          values: [
            "DA_GUI",
            "DA_NHAN",
            "DA_XET_DUYET",
            "YEU_CAU_BO_SUNG",
          ],

          message:
            "Trạng thái minh chứng không hợp lệ",
        },

        default:
          "DA_GUI",

        required: true,

        index: true,
      },

      nguoiXuLyId: {
        type: Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      nguoiXuLyTen: {
        type: String,

        trim: true,

        default: "",

        maxlength: 255,
      },

      noiDungYeuCauBoSung: {
        type: String,

        trim: true,

        default: "",

        maxlength: [
          2000,
          "Nội dung yêu cầu bổ sung không được vượt quá 2000 ký tự",
        ],
      },

      ngayNhan: {
        type: Date,

        default: null,
      },

      ngayXetDuyet: {
        type: Date,

        default: null,
      },

      /* ===================================================
         LEGACY FIELDS
      =================================================== */

      fileUrl: {
        type: String,

        trim: true,

        default: "",
      },

      tenFile: {
        type: String,

        trim: true,

        default: "",
      },

      nguoiDuyetId: {
        type: Schema.Types.ObjectId,

        ref: "User",

        default: null,
      },

      nguoiDuyetTen: {
        type: String,

        trim: true,

        default: "",
      },

      lyDoTuChoi: {
        type: String,

        trim: true,

        default: "",

        maxlength: 1000,
      },

      ngayDuyet: {
        type: Date,

        default: null,
      },
    },
    {
      timestamps: true,

      versionKey: false,

      collection:
        "minh_chung_hoat_dong",

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

MinhChungHoatDongSchema.pre(
  "validate",
  function () {
    /*
     * Dữ liệu legacy:
     *
     * nếu chưa có tepDinhKem
     * nhưng còn fileUrl cũ,
     * tự chuyển sang cấu trúc mới.
     */
    if (
      (!Array.isArray(
        this.tepDinhKem,
      ) ||
        this.tepDinhKem
          .length === 0) &&
      this.fileUrl
    ) {
      this.tepDinhKem = [
        {
          tenTep:
            this.tenFile ||
            "Minh chứng",

          duongDan:
            this.fileUrl,

          pathname: "",

          mimeType: "",

          kichThuoc: 0,
        },
      ];
    }
  },
);

/* =========================================================
   INDEXES
========================================================= */

MinhChungHoatDongSchema.index(
  {
    createdAt: -1,
  },
);

MinhChungHoatDongSchema.index(
  {
    hoatDongId: 1,

    createdAt: -1,
  },
);

MinhChungHoatDongSchema.index(
  {
    chiHoiId: 1,

    trangThai: 1,

    createdAt: -1,
  },
);

MinhChungHoatDongSchema.index(
  {
    nguoiGuiId: 1,

    createdAt: -1,
  },
);

MinhChungHoatDongSchema.index(
  {
    trangThai: 1,

    createdAt: -1,
  },
);

/* =========================================================
   MODEL
========================================================= */

const MinhChungHoatDong:
  Model<IMinhChungHoatDong> =
  (models.MinhChungHoatDong as
    Model<IMinhChungHoatDong>) ||
  mongoose.model<IMinhChungHoatDong>(
    "MinhChungHoatDong",

    MinhChungHoatDongSchema,
  );

export default MinhChungHoatDong;
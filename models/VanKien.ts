import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export type LoaiVanKien =
  | "THONG_BAO"
  | "KE_HOACH"
  | "QUYET_DINH"
  | "BIEN_BAN"
  | "BIEU_MAU"
  | "KHAC";

export type PhamViVanKien =
  | "TOAN_HE_THONG"
  | "CHI_HOI"
  | "VAI_TRO";

export type TrangThaiVanKien =
  | "NHAP"
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI"
  | "DA_AN";

export type VaiTroNhanVanKien =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

export interface IVanKien {
  tieuDe: string;

  moTa?: string;

  loai: LoaiVanKien;

  soKyHieu?: string;

  ngayBanHanh?: Date | null;

  fileUrl?: string;

  tenFile?: string;

  phamVi: PhamViVanKien;

  chiHoiIds?: Types.ObjectId[];

  vaiTroNhan?: VaiTroNhanVanKien[];

  nguoiTaoId: Types.ObjectId;

  nguoiTaoTen: string;

  trangThai: TrangThaiVanKien;

  nguoiDuyetId?: Types.ObjectId | null;

  nguoiDuyetTen?: string;

  ngayGuiDuyet?: Date | null;

  ngayDuyet?: Date | null;

  lyDoTuChoi?: string;

  isActive: boolean;

  createdAt?: Date;

  updatedAt?: Date;
}

const VanKienSchema =
  new Schema<IVanKien>(
    {
      tieuDe: {
        type: String,

        required: [
          true,
          "Tiêu đề không được để trống",
        ],

        trim: true,

        maxlength: [
          255,
          "Tiêu đề không được vượt quá 255 ký tự",
        ],
      },

      moTa: {
        type: String,

        trim: true,

        default: "",

        maxlength: [
          2000,
          "Mô tả không được vượt quá 2000 ký tự",
        ],
      },

      loai: {
        type: String,

        enum: [
          "THONG_BAO",
          "KE_HOACH",
          "QUYET_DINH",
          "BIEN_BAN",
          "BIEU_MAU",
          "KHAC",
        ],

        required: true,
      },

      soKyHieu: {
        type: String,

        trim: true,

        default: "",
      },

      ngayBanHanh: {
        type: Date,

        default: null,
      },

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

      phamVi: {
        type: String,

        enum: [
          "TOAN_HE_THONG",
          "CHI_HOI",
          "VAI_TRO",
        ],

        default: "TOAN_HE_THONG",
      },

      chiHoiIds: [
        {
          type:
            Schema.Types.ObjectId,

          ref:
            "ChiHoi",
        },
      ],

      vaiTroNhan: [
        {
          type: String,

          enum: [
            "ADMIN",
            "BAN_CHAP_HANH",
            "CHI_HOI_TRUONG",
            "HOI_VIEN",
          ],
        },
      ],

      nguoiTaoId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required: true,
      },

      nguoiTaoTen: {
        type: String,

        required: true,

        trim: true,
      },

      trangThai: {
        type: String,

        enum: [
          "NHAP",
          "CHO_DUYET",
          "DA_DUYET",
          "TU_CHOI",
          "DA_AN",
        ],

        default:
          "NHAP",

        index: true,
      },

      nguoiDuyetId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },

      nguoiDuyetTen: {
        type: String,

        trim: true,

        default: "",
      },

      ngayGuiDuyet: {
        type: Date,

        default:
          null,
      },

      ngayDuyet: {
        type: Date,

        default:
          null,
      },

      lyDoTuChoi: {
        type: String,

        trim: true,

        maxlength: [
          1000,
          "Lý do từ chối không được vượt quá 1000 ký tự",
        ],

        default: "",
      },

      isActive: {
        type: Boolean,

        default:
          true,
      },
    },
    {
      timestamps: true,
    },
  );

VanKienSchema.pre(
  "validate",
  function () {
    if (
      this.phamVi !==
      "CHI_HOI"
    ) {
      this.chiHoiIds =
        [];
    }

    if (
      this.phamVi !==
      "VAI_TRO"
    ) {
      this.vaiTroNhan =
        [];
    }

    if (
      this.phamVi ===
        "CHI_HOI" &&
      (
        !Array.isArray(
          this.chiHoiIds,
        ) ||
        this.chiHoiIds.length ===
          0
      )
    ) {
      this.invalidate(
        "chiHoiIds",
        "Vui lòng chọn ít nhất một Chi hội",
      );
    }

    if (
      this.phamVi ===
        "VAI_TRO" &&
      (
        !Array.isArray(
          this.vaiTroNhan,
        ) ||
        this.vaiTroNhan.length ===
          0
      )
    ) {
      this.invalidate(
        "vaiTroNhan",
        "Vui lòng chọn ít nhất một vai trò nhận",
      );
    }

    if (
      this.trangThai ===
        "TU_CHOI" &&
      !this.lyDoTuChoi?.trim()
    ) {
      this.invalidate(
        "lyDoTuChoi",
        "Vui lòng nhập lý do từ chối",
      );
    }
  },
);

VanKienSchema.index({
  tieuDe:
    "text",

  soKyHieu:
    "text",
});

VanKienSchema.index({
  loai: 1,

  createdAt:
    -1,
});

VanKienSchema.index({
  trangThai: 1,

  createdAt:
    -1,
});

VanKienSchema.index({
  nguoiTaoId: 1,

  trangThai: 1,
});

VanKienSchema.index({
  phamVi: 1,

  trangThai: 1,
});

VanKienSchema.index({
  chiHoiIds: 1,

  trangThai: 1,
});

VanKienSchema.index({
  vaiTroNhan: 1,

  trangThai: 1,
});

const VanKien:
  Model<IVanKien> =
  (models.VanKien as
    Model<IVanKien>) ||
  mongoose.model<IVanKien>(
    "VanKien",
    VanKienSchema,
  );

export default VanKien;
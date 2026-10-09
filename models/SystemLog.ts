import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export type LogAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "RESET_PASSWORD"
  | "CHANGE_PASSWORD"
  | "BACKUP"
  | "RESTORE"
  | "OTHER";

export type LogModule =
  | "AUTH"
  | "CHI_HOI"
  | "HOI_VIEN"
  | "BAN_CHAP_HANH"
  | "HOAT_DONG"
  | "TAI_CHINH"
  | "HOI_PHI"
  | "THONG_BAO"
  | "VAN_KIEN"
  | "HO_TRO"
  | "MINH_CHUNG"
  | "DANH_GIA"
  | "SAO_LUU"
  | "HE_THONG";

export interface ISystemLog {
  userId?: Types.ObjectId | null;

  username?: string;

  fullName?: string;

  role?: string;

  action: LogAction;

  module: LogModule;

  description: string;

  targetId?: string;

  targetName?: string;

  metadata?: Record<
    string,
    unknown
  >;

  ipAddress?: string;

  userAgent?: string;

  createdAt?: Date;
}

const SystemLogSchema =
  new Schema<ISystemLog>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      username: {
        type: String,
        trim: true,
        default: "",
      },

      fullName: {
        type: String,
        trim: true,
        default: "",
      },

      role: {
        type: String,
        trim: true,
        default: "",
      },

      action: {
        type: String,
        enum: [
          "LOGIN",
          "LOGOUT",
          "CREATE",
          "UPDATE",
          "DELETE",
          "APPROVE",
          "REJECT",
          "RESET_PASSWORD",
          "CHANGE_PASSWORD",
          "BACKUP",
          "RESTORE",
          "OTHER",
        ],
        required: true,
        index: true,
      },

      module: {
        type: String,
        enum: [
          "AUTH",
          "CHI_HOI",
          "HOI_VIEN",
          "BAN_CHAP_HANH",
          "HOAT_DONG",
          "TAI_CHINH",
          "HOI_PHI",
          "THONG_BAO",
          "VAN_KIEN",
          "HO_TRO",
          "MINH_CHUNG",
          "DANH_GIA",
          "SAO_LUU",
          "HE_THONG",
        ],
        required: true,
        index: true,
      },

      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
      },

      targetId: {
        type: String,
        trim: true,
        default: "",
      },

      targetName: {
        type: String,
        trim: true,
        default: "",
      },

      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },

      ipAddress: {
        type: String,
        trim: true,
        default: "",
      },

      userAgent: {
        type: String,
        trim: true,
        default: "",
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    },
  );

SystemLogSchema.index({
  createdAt: -1,
});

SystemLogSchema.index({
  module: 1,
  action: 1,
  createdAt: -1,
});

const SystemLog: Model<ISystemLog> =
  (models.SystemLog as Model<ISystemLog>) ||
  mongoose.model<ISystemLog>(
    "SystemLog",
    SystemLogSchema,
  );

export default SystemLog;
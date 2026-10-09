"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Laptop,
  Loader2,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

/* =========================================================
   TYPES
========================================================= */

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type TabType =
  | "HOAT_DONG"
  | "HE_THONG";

type SessionUser = {
  id: string;

  username: string;

  fullName: string;

  role: UserRole;
};

/* =========================================================
   ACTIVITY TYPES
========================================================= */

type HoatDong = {
  id?: string;

  _id?: string;

  maHoatDong: string;

  tenHoatDong: string;

  diaDiem?: string;

  thoiGianBatDau?:
    string
    | null;

  thoiGianKetThuc?:
    string
    | null;

  trangThai?: string;
};

type ChiHoi = {
  id?: string;

  _id?: string;

  maChiHoi?: string;

  tenChiHoi?: string;
};

type HoiVien = {
  id?: string;

  _id?: string;

  maHoiVien?: string;

  hoTen?: string;

  lop?: string;

  chiHoiId?:
    | ChiHoi
    | string
    | null;
};

type DanhGiaHoatDong = {
  id?: string;

  _id?: string;

  hoatDongId?:
    | HoatDong
    | string;

  hoiVienId?:
    | HoiVien
    | string;

  diemChatLuong:
    number;

  diemNoiDung:
    number;

  diemToChuc:
    number;

  noiDungDanhGia:
    string;

  deXuatCaiThien?: string;

  createdAt?: string;

  updatedAt?: string;
};

type MemberActivityItem = {
  hoatDong:
    HoatDong;

  coTheDanhGia:
    boolean;

  daDanhGia:
    boolean;

  danhGia?:
    DanhGiaHoatDong
    | null;
};

type MemberActivityStats = {
  tongDaThamGia:
    number;

  daDanhGia:
    number;

  chuaDanhGia:
    number;
};

type ManagerActivityStats = {
  tongDanhGia:
    number;

  diemChatLuongTrungBinh:
    number;

  diemNoiDungTrungBinh:
    number;

  diemToChucTrungBinh:
    number;
};

/* =========================================================
   SYSTEM RATING TYPES
========================================================= */

type LoaiNguoiDanhGia =
  | "HOI_VIEN"
  | "BAN_CHAP_HANH";

type UserRef = {
  id?: string;

  _id?: string;

  username?: string;

  fullName?: string;

  role?: UserRole;
};

type DanhGiaHeThong = {
  id?: string;

  _id?: string;

  nguoiDungId?:
    | UserRef
    | string;

  loaiNguoiDung:
    LoaiNguoiDanhGia;

  mucDoHaiLong:
    number;

  deSuDung:
    number;

  tinhHieuQua:
    number;

  mucDoPhuHop:
    number;

  noiDungGopY:
    string;

  deXuatCaiThien?:
    string;

  createdAt?: string;

  updatedAt?: string;
};

type SystemStats = {
  tongDanhGia:
    number;

  mucDoHaiLongTrungBinh:
    number;

  deSuDungTrungBinh:
    number;

  tinhHieuQuaTrungBinh:
    number;

  mucDoPhuHopTrungBinh:
    number;

  hoiVien:
    number;

  banChapHanh:
    number;
};

/* =========================================================
   API
========================================================= */

type ApiResponse = {
  success:
    boolean;

  message?:
    string;

  user?:
    SessionUser;

  data?:
    unknown;
};

type Notice = {
  type:
    | "success"
    | "error";

  text:
    string;
};

/* =========================================================
   FORMS
========================================================= */

type ActivityRatingForm = {
  diemChatLuong:
    number;

  diemNoiDung:
    number;

  diemToChuc:
    number;

  noiDungDanhGia:
    string;

  deXuatCaiThien:
    string;
};

type SystemRatingForm = {
  mucDoHaiLong:
    number;

  deSuDung:
    number;

  tinhHieuQua:
    number;

  mucDoPhuHop:
    number;

  noiDungGopY:
    string;

  deXuatCaiThien:
    string;
};

const EMPTY_ACTIVITY_FORM:
  ActivityRatingForm = {
    diemChatLuong:
      0,

    diemNoiDung:
      0,

    diemToChuc:
      0,

    noiDungDanhGia:
      "",

    deXuatCaiThien:
      "",
  };

const EMPTY_SYSTEM_FORM:
  SystemRatingForm = {
    mucDoHaiLong:
      0,

    deSuDung:
      0,

    tinhHieuQua:
      0,

    mucDoPhuHop:
      0,

    noiDungGopY:
      "",

    deXuatCaiThien:
      "",
  };

/* =========================================================
   HELPERS
========================================================= */

function getId(
  value?:
    | string
    | {
        id?: string;
        _id?: string;
      }
    | null,
) {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  return (
    value.id ||
    value._id ||
    ""
  );
}

function getHoiVien(
  value?:
    | HoiVien
    | string,
) {
  return value &&
    typeof value ===
      "object"
    ? value
    : null;
}

function getHoatDong(
  value?:
    | HoatDong
    | string,
) {
  return value &&
    typeof value ===
      "object"
    ? value
    : null;
}

function getChiHoi(
  value?:
    | ChiHoi
    | string
    | null,
) {
  return value &&
    typeof value ===
      "object"
    ? value
    : null;
}

function getUser(
  value?:
    | UserRef
    | string,
) {
  return value &&
    typeof value ===
      "object"
    ? value
    : null;
}

function formatDateTime(
  value?:
    string
    | null,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",
    },
  ).format(
    date,
  );
}

function normalizeText(
  value?:
    string
    | null,
) {
  return (
    value ||
    ""
  )
    .normalize(
      "NFD",
    )
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /đ/g,
      "d",
    )
    .replace(
      /Đ/g,
      "D",
    )
    .toLowerCase()
    .trim();
}

function averageActivity(
  item:
    DanhGiaHoatDong,
) {
  return Number(
    (
      (
        Number(
          item.diemChatLuong,
        ) +
        Number(
          item.diemNoiDung,
        ) +
        Number(
          item.diemToChuc,
        )
      ) /
      3
    ).toFixed(
      1,
    ),
  );
}

function averageSystem(
  item:
    DanhGiaHeThong,
) {
  return Number(
    (
      (
        Number(
          item.mucDoHaiLong,
        ) +
        Number(
          item.deSuDung,
        ) +
        Number(
          item.tinhHieuQua,
        ) +
        Number(
          item.mucDoPhuHop,
        )
      ) /
      4
    ).toFixed(
      1,
    ),
  );
}

async function parseResponse(
  response:
    Response,
): Promise<ApiResponse> {
  const text =
    await response.text();

  if (!text.trim()) {
    return {
      success:
        false,

      message:
        "Máy chủ không trả dữ liệu",
    };
  }

  try {
    return JSON.parse(
      text,
    ) as ApiResponse;
  } catch {
    return {
      success:
        false,

      message:
        "Dữ liệu máy chủ trả về không hợp lệ",
    };
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function DanhGiaPage() {
  const router =
    useRouter();

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<SessionUser | null>(
      null,
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabType>(
      "HOAT_DONG",
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );

  const [
    notice,
    setNotice,
  ] =
    useState<Notice | null>(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );

  /* =======================================================
     ACTIVITY STATE
  ======================================================= */

  const [
    memberActivityList,
    setMemberActivityList,
  ] =
    useState<
      MemberActivityItem[]
    >([]);

  const [
    managerActivityList,
    setManagerActivityList,
  ] =
    useState<
      DanhGiaHoatDong[]
    >([]);

  const [
    memberActivityStats,
    setMemberActivityStats,
  ] =
    useState<MemberActivityStats>({
      tongDaThamGia:
        0,

      daDanhGia:
        0,

      chuaDanhGia:
        0,
    });

  const [
    managerActivityStats,
    setManagerActivityStats,
  ] =
    useState<ManagerActivityStats>({
      tongDanhGia:
        0,

      diemChatLuongTrungBinh:
        0,

      diemNoiDungTrungBinh:
        0,

      diemToChucTrungBinh:
        0,
    });

  const [
    activityStatusFilter,
    setActivityStatusFilter,
  ] =
    useState<
      | ""
      | "CHUA_DANH_GIA"
      | "DA_DANH_GIA"
    >(
      "",
    );

  const [
    activityRatingTarget,
    setActivityRatingTarget,
  ] =
    useState<MemberActivityItem | null>(
      null,
    );

  const [
    activityDetail,
    setActivityDetail,
  ] =
    useState<DanhGiaHoatDong | null>(
      null,
    );

  const [
    activityForm,
    setActivityForm,
  ] =
    useState<ActivityRatingForm>(
      EMPTY_ACTIVITY_FORM,
    );

  /* =======================================================
     SYSTEM STATE
  ======================================================= */

  const [
    systemRatings,
    setSystemRatings,
  ] =
    useState<
      DanhGiaHeThong[]
    >([]);

  const [
    systemStats,
    setSystemStats,
  ] =
    useState<SystemStats>({
      tongDanhGia:
        0,

      mucDoHaiLongTrungBinh:
        0,

      deSuDungTrungBinh:
        0,

      tinhHieuQuaTrungBinh:
        0,

      mucDoPhuHopTrungBinh:
        0,

      hoiVien:
        0,

      banChapHanh:
        0,
    });

  const [
    showSystemForm,
    setShowSystemForm,
  ] =
    useState(
      false,
    );

  const [
    systemDetail,
    setSystemDetail,
  ] =
    useState<DanhGiaHeThong | null>(
      null,
    );

  const [
    systemForm,
    setSystemForm,
  ] =
    useState<SystemRatingForm>(
      EMPTY_SYSTEM_FORM,
    );

  /* =======================================================
     ROLES
  ======================================================= */

  const isMember =
    currentUser?.role ===
    "HOI_VIEN";

  const isBCH =
    currentUser?.role ===
    "BAN_CHAP_HANH";

  const isAdmin =
    currentUser?.role ===
    "ADMIN";

  const isCHT =
    currentUser?.role ===
    "CHI_HOI_TRUONG";

  const canViewActivityRatings =
    Boolean(
      isMember ||
        isAdmin ||
        isBCH,
    );

  const canSendSystemRating =
    Boolean(
      isMember ||
        isBCH,
    );

  /* =======================================================
     LOAD USER
  ======================================================= */

  const loadCurrentUser =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/auth/me",
            {
              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        const result =
          await parseResponse(
            response,
          );

        if (
          response.status ===
            401 ||
          !result.success
        ) {
          router.replace(
            "/login",
          );

          return null;
        }

        let user =
          result.user;

        if (
          !user &&
          result.data &&
          typeof result.data ===
            "object"
        ) {
          const raw =
            result.data as {
              user?:
                SessionUser;

              id?:
                string;

              _id?:
                string;

              userId?:
                string;

              username?:
                string;

              fullName?:
                string;

              role?:
                UserRole;
            };

          if (
            raw.user
          ) {
            user =
              raw.user;
          } else if (
            raw.role
          ) {
            user = {
              id:
                String(
                  raw.id ||
                    raw._id ||
                    raw.userId ||
                    "",
                ),

              username:
                raw.username ||
                "",

              fullName:
                raw.fullName ||
                "",

              role:
                raw.role,
            };
          }
        }

        if (!user) {
          router.replace(
            "/login",
          );

          return null;
        }

        setCurrentUser(
          user,
        );

        return user;
      },
      [
        router,
      ],
    );

  /* =======================================================
     LOAD ACTIVITY RATINGS
  ======================================================= */

  const loadActivityRatings =
    useCallback(
      async (
        user:
          SessionUser,
      ) => {
        if (
          ![
            "HOI_VIEN",
            "ADMIN",
            "BAN_CHAP_HANH",
          ].includes(
            user.role,
          )
        ) {
          setMemberActivityList(
            [],
          );

          setManagerActivityList(
            [],
          );

          return;
        }

        const response =
          await fetch(
            "/api/danh-gia/hoat-dong",
            {
              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        const result =
          await parseResponse(
            response,
          );

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Không thể tải đánh giá hoạt động",
          );
        }

        if (
          !result.data ||
          typeof result.data !==
            "object"
        ) {
          return;
        }

        const data =
          result.data as {
            danhSach?:
              unknown[];

            thongKe?:
              Record<
                string,
                unknown
              >;
          };

        const stats =
          data.thongKe ||
          {};

        if (
          user.role ===
          "HOI_VIEN"
        ) {
          setMemberActivityList(
            Array.isArray(
              data.danhSach,
            )
              ? data.danhSach as
                  MemberActivityItem[]
              : [],
          );

          setMemberActivityStats({
            tongDaThamGia:
              Number(
                stats.tongDaThamGia ||
                  0,
              ),

            daDanhGia:
              Number(
                stats.daDanhGia ||
                  0,
              ),

            chuaDanhGia:
              Number(
                stats.chuaDanhGia ||
                  0,
              ),
          });

          return;
        }

        setManagerActivityList(
          Array.isArray(
            data.danhSach,
          )
            ? data.danhSach as
                DanhGiaHoatDong[]
            : [],
        );

        setManagerActivityStats({
          tongDanhGia:
            Number(
              stats.tongDanhGia ||
                0,
            ),

          diemChatLuongTrungBinh:
            Number(
              stats.diemChatLuongTrungBinh ||
                0,
            ),

          diemNoiDungTrungBinh:
            Number(
              stats.diemNoiDungTrungBinh ||
                0,
            ),

          diemToChucTrungBinh:
            Number(
              stats.diemToChucTrungBinh ||
                0,
            ),
        });
      },
      [],
    );

  /* =======================================================
     LOAD SYSTEM RATINGS
  ======================================================= */

  const loadSystemRatings =
    useCallback(
      async (
        user:
          SessionUser,
      ) => {
        if (
          ![
            "HOI_VIEN",
            "BAN_CHAP_HANH",
            "ADMIN",
          ].includes(
            user.role,
          )
        ) {
          setSystemRatings(
            [],
          );

          return;
        }

        const response =
          await fetch(
            "/api/danh-gia/he-thong",
            {
              credentials:
                "include",

              cache:
                "no-store",
            },
          );

        const result =
          await parseResponse(
            response,
          );

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Không thể tải đánh giá hệ thống",
          );
        }

        if (
          !result.data ||
          typeof result.data !==
            "object"
        ) {
          return;
        }

        const data =
          result.data as {
            danhSach?:
              DanhGiaHeThong[];

            thongKe?:
              Partial<SystemStats>;

            tongSo?:
              number;
          };

        setSystemRatings(
          Array.isArray(
            data.danhSach,
          )
            ? data.danhSach
            : [],
        );

        if (
          user.role ===
          "ADMIN"
        ) {
          setSystemStats({
            tongDanhGia:
              Number(
                data.thongKe
                  ?.tongDanhGia ||
                  0,
              ),

            mucDoHaiLongTrungBinh:
              Number(
                data.thongKe
                  ?.mucDoHaiLongTrungBinh ||
                  0,
              ),

            deSuDungTrungBinh:
              Number(
                data.thongKe
                  ?.deSuDungTrungBinh ||
                  0,
              ),

            tinhHieuQuaTrungBinh:
              Number(
                data.thongKe
                  ?.tinhHieuQuaTrungBinh ||
                  0,
              ),

            mucDoPhuHopTrungBinh:
              Number(
                data.thongKe
                  ?.mucDoPhuHopTrungBinh ||
                  0,
              ),

            hoiVien:
              Number(
                data.thongKe
                  ?.hoiVien ||
                  0,
              ),

            banChapHanh:
              Number(
                data.thongKe
                  ?.banChapHanh ||
                  0,
              ),
          });
        }
      },
      [],
    );

  /* =======================================================
     LOAD PAGE
  ======================================================= */

  const loadPage =
    useCallback(
      async (
        showRefresh =
          false,
      ) => {
        try {
          if (
            showRefresh
          ) {
            setRefreshing(
              true,
            );
          } else {
            setLoading(
              true,
            );
          }

          setNotice(
            null,
          );

          const user =
            await loadCurrentUser();

          if (!user) {
            return;
          }

          await Promise.all([
            loadActivityRatings(
              user,
            ),

            loadSystemRatings(
              user,
            ),
          ]);

          /*
           * CHT hiện chưa có API
           * cho 2 nghiệp vụ này.
           */
          if (
            user.role ===
            "CHI_HOI_TRUONG"
          ) {
            setActiveTab(
              "HOAT_DONG",
            );
          }
        } catch (
          error
        ) {
          setNotice({
            type:
              "error",

            text:
              error instanceof
              Error
                ? error.message
                : "Không thể tải dữ liệu đánh giá",
          });
        } finally {
          setLoading(
            false,
          );

          setRefreshing(
            false,
          );
        }
      },
      [
        loadActivityRatings,
        loadCurrentUser,
        loadSystemRatings,
      ],
    );

  useEffect(
    () => {
      /*
       * Defer một tick để tránh
       * react-hooks/set-state-in-effect
       * trong cấu hình ESLint mới.
       */
      const timer =
        window.setTimeout(
          () => {
            void loadPage();
          },
          0,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [
      loadPage,
    ],
  );

  /* =======================================================
     FILTER ACTIVITY MEMBER
  ======================================================= */

  const filteredMemberActivity =
    useMemo(
      () => {
        const keyword =
          normalizeText(
            search,
          );

        return memberActivityList.filter(
          (
            item,
          ) => {
            const activity =
              item.hoatDong;

            const source =
              normalizeText(
                [
                  activity.maHoatDong,

                  activity.tenHoatDong,

                  activity.diaDiem,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    " ",
                  ),
              );

            const searchOk =
              !keyword ||
              source.includes(
                keyword,
              );

            const statusOk =
              !activityStatusFilter ||
              (
                activityStatusFilter ===
                  "DA_DANH_GIA"
                  ? item.daDanhGia
                  : !item.daDanhGia &&
                    item.coTheDanhGia
              );

            return (
              searchOk &&
              statusOk
            );
          },
        );
      },
      [
        memberActivityList,
        search,
        activityStatusFilter,
      ],
    );

  /* =======================================================
     FILTER ACTIVITY MANAGER
  ======================================================= */

  const filteredManagerActivity =
    useMemo(
      () => {
        const keyword =
          normalizeText(
            search,
          );

        if (
          !keyword
        ) {
          return managerActivityList;
        }

        return managerActivityList.filter(
          (
            item,
          ) => {
            const activity =
              getHoatDong(
                item.hoatDongId,
              );

            const member =
              getHoiVien(
                item.hoiVienId,
              );

            const chiHoi =
              getChiHoi(
                member?.chiHoiId,
              );

            const source =
              normalizeText(
                [
                  activity?.maHoatDong,

                  activity?.tenHoatDong,

                  member?.maHoiVien,

                  member?.hoTen,

                  member?.lop,

                  chiHoi?.maChiHoi,

                  chiHoi?.tenChiHoi,

                  item.noiDungDanhGia,

                  item.deXuatCaiThien,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    " ",
                  ),
              );

            return source.includes(
              keyword,
            );
          },
        );
      },
      [
        managerActivityList,
        search,
      ],
    );

  /* =======================================================
     FILTER SYSTEM
  ======================================================= */

  const filteredSystemRatings =
    useMemo(
      () => {
        const keyword =
          normalizeText(
            search,
          );

        if (
          !keyword
        ) {
          return systemRatings;
        }

        return systemRatings.filter(
          (
            item,
          ) => {
            const user =
              getUser(
                item.nguoiDungId,
              );

            return normalizeText(
              [
                user?.fullName,

                user?.username,

                item.loaiNguoiDung,

                item.noiDungGopY,

                item.deXuatCaiThien,
              ]
                .filter(
                  Boolean,
                )
                .join(
                  " ",
                ),
            ).includes(
              keyword,
            );
          },
        );
      },
      [
        systemRatings,
        search,
      ],
    );

  /* =======================================================
     SUBMIT ACTIVITY RATING
  ======================================================= */

  async function submitActivityRating(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !activityRatingTarget
    ) {
      return;
    }

    if (
      activityForm.diemChatLuong <
        1 ||
      activityForm.diemNoiDung <
        1 ||
      activityForm.diemToChuc <
        1
    ) {
      setNotice({
        type:
          "error",

        text:
          "Vui lòng đánh giá đầy đủ Chất lượng, Nội dung và Công tác tổ chức.",
      });

      return;
    }

    if (
      !activityForm.noiDungDanhGia.trim()
    ) {
      setNotice({
        type:
          "error",

        text:
          "Vui lòng nhập nội dung đánh giá.",
      });

      return;
    }

    try {
      setSubmitting(
        true,
      );

      setNotice(
        null,
      );

      const response =
        await fetch(
          "/api/danh-gia/hoat-dong",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                hoatDongId:
                  getId(
                    activityRatingTarget
                      .hoatDong,
                  ),

                diemChatLuong:
                  activityForm
                    .diemChatLuong,

                diemNoiDung:
                  activityForm
                    .diemNoiDung,

                diemToChuc:
                  activityForm
                    .diemToChuc,

                noiDungDanhGia:
                  activityForm
                    .noiDungDanhGia
                    .trim(),

                deXuatCaiThien:
                  activityForm
                    .deXuatCaiThien
                    .trim(),
              }),
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể gửi đánh giá",
        );
      }

      setActivityRatingTarget(
        null,
      );

      setActivityForm(
        EMPTY_ACTIVITY_FORM,
      );

      setNotice({
        type:
          "success",

        text:
          result.message ||
          "Gửi đánh giá hoạt động thành công",
      });

      if (
        currentUser
      ) {
        await loadActivityRatings(
          currentUser,
        );
      }
    } catch (
      error
    ) {
      setNotice({
        type:
          "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể gửi đánh giá",
      });
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     SUBMIT SYSTEM RATING
  ======================================================= */

  async function submitSystemRating(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      systemForm.mucDoHaiLong <
        1 ||
      systemForm.deSuDung <
        1 ||
      systemForm.tinhHieuQua <
        1 ||
      systemForm.mucDoPhuHop <
        1
    ) {
      setNotice({
        type:
          "error",

        text:
          "Vui lòng đánh giá đầy đủ tất cả các tiêu chí.",
      });

      return;
    }

    if (
      !systemForm.noiDungGopY.trim()
    ) {
      setNotice({
        type:
          "error",

        text:
          "Vui lòng nhập nội dung góp ý.",
      });

      return;
    }

    try {
      setSubmitting(
        true,
      );

      setNotice(
        null,
      );

      const response =
        await fetch(
          "/api/danh-gia/he-thong",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                mucDoHaiLong:
                  systemForm
                    .mucDoHaiLong,

                deSuDung:
                  systemForm
                    .deSuDung,

                tinhHieuQua:
                  systemForm
                    .tinhHieuQua,

                mucDoPhuHop:
                  systemForm
                    .mucDoPhuHop,

                noiDungGopY:
                  systemForm
                    .noiDungGopY
                    .trim(),

                deXuatCaiThien:
                  systemForm
                    .deXuatCaiThien
                    .trim(),
              }),
          },
        );

      const result =
        await parseResponse(
          response,
        );

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể gửi đánh giá hệ thống",
        );
      }

      setShowSystemForm(
        false,
      );

      setSystemForm(
        EMPTY_SYSTEM_FORM,
      );

      setNotice({
        type:
          "success",

        text:
          result.message ||
          "Gửi đánh giá hệ thống thành công",
      });

      if (
        currentUser
      ) {
        await loadSystemRatings(
          currentUser,
        );
      }
    } catch (
      error
    ) {
      setNotice({
        type:
          "error",

        text:
          error instanceof
          Error
            ? error.message
            : "Không thể gửi đánh giá hệ thống",
      });
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2
          size={34}
          className="animate-spin text-[#123b68]"
        />
      </div>
    );
  }

  /* =======================================================
     CHT
  ======================================================= */

  if (
    isCHT
  ) {
    return (
      <main className="min-h-full bg-[#f4f7fb] px-4 py-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Star
              size={48}
              className="mx-auto text-slate-300"
            />

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Đánh giá
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Tài khoản Chi hội trưởng hiện chưa có nghiệp vụ đánh giá trong module này.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-full bg-[#f4f7fb] px-3 py-5 sm:px-5 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#123b68]">
              Đánh giá & phản hồi
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Trung tâm đánh giá
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isMember
                ? "Đánh giá các hoạt động đã tham gia và gửi góp ý để cải thiện hệ thống."
                : isBCH
                  ? "Theo dõi đánh giá hoạt động từ Hội viên và gửi phản hồi về hệ thống."
                  : "Theo dõi đánh giá hoạt động và tổng hợp phản hồi về hệ thống."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeTab ===
              "HE_THONG" &&
              canSendSystemRating && (
                <button
                  type="button"
                  onClick={() => {
                    setSystemForm(
                      EMPTY_SYSTEM_FORM,
                    );

                    setShowSystemForm(
                      true,
                    );
                  }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-4 text-sm font-semibold text-white hover:bg-[#0e3158]"
                >
                  <MessageSquareText
                    size={17}
                  />

                  Đánh giá hệ thống
                </button>
              )}

            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadPage(
                  true,
                )
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Làm mới
            </button>
          </div>
        </div>

        {/* NOTICE */}

        {notice && (
          <div
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              notice.type ===
              "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {notice.type ===
              "success" ? (
                <CheckCircle2
                  size={18}
                />
              ) : (
                <AlertCircle
                  size={18}
                />
              )}

              <span>
                {
                  notice.text
                }
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setNotice(
                  null,
                )
              }
            >
              <X
                size={17}
              />
            </button>
          </div>
        )}

        {/* TABS */}

        <div className="mb-5 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          {canViewActivityRatings && (
            <button
              type="button"
              onClick={() => {
                setActiveTab(
                  "HOAT_DONG",
                );

                setSearch(
                  "",
                );
              }}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${
                activeTab ===
                "HOAT_DONG"
                  ? "bg-[#123b68] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Star
                size={17}
              />

              Đánh giá hoạt động
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab(
                "HE_THONG",
              );

              setSearch(
                "",
              );
            }}
            className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${
              activeTab ===
              "HE_THONG"
                ? "bg-[#123b68] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Laptop
              size={17}
            />

            Đánh giá hệ thống
          </button>
        </div>

        {/* =================================================
            ACTIVITY TAB
        ================================================= */}

        {activeTab ===
          "HOAT_DONG" && (
          <>
            {/* MEMBER STATS */}

            {isMember && (
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Đã tham gia"
                  value={
                    memberActivityStats
                      .tongDaThamGia
                  }
                  icon={
                    <CalendarDays
                      size={21}
                    />
                  }
                />

                <StatCard
                  label="Đã đánh giá"
                  value={
                    memberActivityStats
                      .daDanhGia
                  }
                  icon={
                    <CheckCircle2
                      size={21}
                    />
                  }
                />

                <StatCard
                  label="Chờ đánh giá"
                  value={
                    memberActivityStats
                      .chuaDanhGia
                  }
                  icon={
                    <Clock3
                      size={21}
                    />
                  }
                />
              </div>
            )}

            {/* ADMIN/BCH STATS */}

            {(isAdmin ||
              isBCH) && (
              <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                <StatCard
                  label="Tổng đánh giá"
                  value={
                    managerActivityStats
                      .tongDanhGia
                  }
                  icon={
                    <MessageSquareText
                      size={21}
                    />
                  }
                />

                <ScoreStatCard
                  label="Chất lượng TB"
                  value={
                    managerActivityStats
                      .diemChatLuongTrungBinh
                  }
                />

                <ScoreStatCard
                  label="Nội dung TB"
                  value={
                    managerActivityStats
                      .diemNoiDungTrungBinh
                  }
                />

                <ScoreStatCard
                  label="Tổ chức TB"
                  value={
                    managerActivityStats
                      .diemToChucTrungBinh
                  }
                />
              </div>
            )}

            {/* FILTER */}

            <div
              className={`mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
                isMember
                  ? "lg:grid-cols-[1fr_220px]"
                  : ""
              }`}
            >
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    isMember
                      ? "Tìm hoạt động, địa điểm..."
                      : "Tìm Hội viên, Chi hội, hoạt động..."
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-[#123b68]"
                />
              </div>

              {isMember && (
                <select
                  value={
                    activityStatusFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setActivityStatusFilter(
                      event.target
                        .value as
                        typeof activityStatusFilter,
                    )
                  }
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">
                    Tất cả
                  </option>

                  <option value="CHUA_DANH_GIA">
                    Chưa đánh giá
                  </option>

                  <option value="DA_DANH_GIA">
                    Đã đánh giá
                  </option>
                </select>
              )}
            </div>

            {/* MEMBER LIST */}

            {isMember &&
              (
                filteredMemberActivity.length ===
                0 ? (
                  <EmptyState
                    text="Không có hoạt động phù hợp."
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredMemberActivity.map(
                      (
                        item,
                      ) => (
                        <MemberActivityCard
                          key={getId(
                            item.hoatDong,
                          )}
                          item={
                            item
                          }
                          onRate={() => {
                            setActivityForm(
                              EMPTY_ACTIVITY_FORM,
                            );

                            setActivityRatingTarget(
                              item,
                            );
                          }}
                          onView={() =>
                            setActivityDetail(
                              item.danhGia ||
                                null,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                )
              )}

            {/* MANAGER LIST */}

            {(isAdmin ||
              isBCH) &&
              (
                filteredManagerActivity.length ===
                0 ? (
                  <EmptyState
                    text="Chưa có đánh giá hoạt động."
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredManagerActivity.map(
                      (
                        item,
                      ) => (
                        <ManagerActivityCard
                          key={getId(
                            item,
                          )}
                          item={
                            item
                          }
                        />
                      ),
                    )}
                  </div>
                )
              )}
          </>
        )}

        {/* =================================================
            SYSTEM TAB
        ================================================= */}

        {activeTab ===
          "HE_THONG" && (
          <>
            {/* ADMIN STATS */}

            {isAdmin && (
              <>
                <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
                  <StatCard
                    label="Tổng phản hồi"
                    value={
                      systemStats
                        .tongDanhGia
                    }
                    icon={
                      <MessageSquareText
                        size={21}
                      />
                    }
                  />

                  <ScoreStatCard
                    label="Hài lòng TB"
                    value={
                      systemStats
                        .mucDoHaiLongTrungBinh
                    }
                  />

                  <ScoreStatCard
                    label="Dễ sử dụng TB"
                    value={
                      systemStats
                        .deSuDungTrungBinh
                    }
                  />

                  <ScoreStatCard
                    label="Hiệu quả TB"
                    value={
                      systemStats
                        .tinhHieuQuaTrungBinh
                    }
                  />

                  <ScoreStatCard
                    label="Phù hợp TB"
                    value={
                      systemStats
                        .mucDoPhuHopTrungBinh
                    }
                  />
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3 md:max-w-xl">
                  <StatCard
                    label="Hội viên phản hồi"
                    value={
                      systemStats.hoiVien
                    }
                    icon={
                      <Users
                        size={21}
                      />
                    }
                  />

                  <StatCard
                    label="BCH phản hồi"
                    value={
                      systemStats
                        .banChapHanh
                    }
                    icon={
                      <Users
                        size={21}
                      />
                    }
                  />
                </div>
              </>
            )}

            {/* OWN DESCRIPTION */}

            {canSendSystemRating && (
              <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <Laptop
                    size={21}
                    className="mt-0.5 shrink-0 text-blue-700"
                  />

                  <div>
                    <p className="font-semibold text-blue-950">
                      Góp ý để cải thiện hệ thống
                    </p>

                    <p className="mt-1 text-sm leading-6 text-blue-800">
                      Bạn có thể gửi nhiều phản hồi theo thời gian, đặc biệt sau khi hệ thống có cập nhật hoặc thay đổi chức năng.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH */}

            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative max-w-2xl">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder={
                    isAdmin
                      ? "Tìm người dùng hoặc nội dung phản hồi..."
                      : "Tìm trong lịch sử góp ý của tôi..."
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-[#123b68]"
                />
              </div>
            </div>

            {/* SYSTEM LIST */}

            {filteredSystemRatings.length ===
            0 ? (
              <EmptyState
                text={
                  canSendSystemRating
                    ? "Bạn chưa gửi đánh giá hệ thống."
                    : "Chưa có phản hồi hệ thống."
                }
              />
            ) : (
              <div className="space-y-3">
                {filteredSystemRatings.map(
                  (
                    item,
                  ) => {
                    const user =
                      getUser(
                        item.nguoiDungId,
                      );

                    return (
                      <article
                        key={getId(
                          item,
                        )}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <RatingDisplay
                                value={averageSystem(
                                  item,
                                )}
                              />

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                {item.loaiNguoiDung ===
                                "BAN_CHAP_HANH"
                                  ? "Ban Chấp hành"
                                  : "Hội viên"}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                                {formatDateTime(
                                  item.createdAt,
                                )}
                              </span>
                            </div>

                            {isAdmin &&
                              user && (
                                <p className="mt-3 text-sm font-semibold text-slate-800">
                                  {user.fullName ||
                                    user.username ||
                                    "Người dùng"}
                                </p>
                              )}

                            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                              <SmallScore
                                label="Hài lòng"
                                value={
                                  item.mucDoHaiLong
                                }
                              />

                              <SmallScore
                                label="Dễ sử dụng"
                                value={
                                  item.deSuDung
                                }
                              />

                              <SmallScore
                                label="Hiệu quả"
                                value={
                                  item.tinhHieuQua
                                }
                              />

                              <SmallScore
                                label="Phù hợp"
                                value={
                                  item.mucDoPhuHop
                                }
                              />
                            </div>

                            <div className="mt-4 rounded-xl bg-slate-50 p-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Nội dung góp ý
                              </p>

                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {
                                  item.noiDungGopY
                                }
                              </p>
                            </div>

                            {item.deXuatCaiThien && (
                              <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                                  Đề xuất cải thiện
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-800">
                                  {
                                    item.deXuatCaiThien
                                  }
                                </p>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSystemDetail(
                                item,
                              )
                            }
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <MessageSquareText
                              size={16}
                            />

                            Chi tiết
                          </button>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===================================================
          ACTIVITY RATING MODAL
      =================================================== */}

      {activityRatingTarget && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
          <form
            onSubmit={
              submitActivityRating
            }
            className="max-h-[96vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <ModalHeader
              title="Đánh giá hoạt động"
              subtitle={`${activityRatingTarget.hoatDong.maHoatDong} - ${activityRatingTarget.hoatDong.tenHoatDong}`}
              disabled={
                submitting
              }
              onClose={() =>
                setActivityRatingTarget(
                  null,
                )
              }
            />

            <div className="space-y-6 p-4 sm:p-6">
              <RatingField
                label="Chất lượng hoạt động"
                value={
                  activityForm.diemChatLuong
                }
                onChange={(
                  value,
                ) =>
                  setActivityForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      diemChatLuong:
                        value,
                    }),
                  )
                }
              />

              <RatingField
                label="Nội dung hoạt động"
                value={
                  activityForm.diemNoiDung
                }
                onChange={(
                  value,
                ) =>
                  setActivityForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      diemNoiDung:
                        value,
                    }),
                  )
                }
              />

              <RatingField
                label="Công tác tổ chức"
                value={
                  activityForm.diemToChuc
                }
                onChange={(
                  value,
                ) =>
                  setActivityForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      diemToChuc:
                        value,
                    }),
                  )
                }
              />

              <TextArea
                label="Nội dung đánh giá"
                required
                maxLength={
                  2000
                }
                value={
                  activityForm.noiDungDanhGia
                }
                onChange={(
                  value,
                ) =>
                  setActivityForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      noiDungDanhGia:
                        value,
                    }),
                  )
                }
                placeholder="Chia sẻ cảm nhận về hoạt động..."
              />

              <TextArea
                label="Đề xuất cải thiện"
                maxLength={
                  2000
                }
                value={
                  activityForm.deXuatCaiThien
                }
                onChange={(
                  value,
                ) =>
                  setActivityForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      deXuatCaiThien:
                        value,
                    }),
                  )
                }
                placeholder="Đề xuất cho các hoạt động sau..."
              />
            </div>

            <ModalFooter
              submitting={
                submitting
              }
              submitText="Gửi đánh giá"
              onCancel={() =>
                setActivityRatingTarget(
                  null,
                )
              }
            />
          </form>
        </div>
      )}

      {/* ===================================================
          SYSTEM RATING MODAL
      =================================================== */}

      {showSystemForm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4">
          <form
            onSubmit={
              submitSystemRating
            }
            className="max-h-[96vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          >
            <ModalHeader
              title="Đánh giá hệ thống"
              subtitle="Phản hồi của bạn giúp cải thiện trải nghiệm sử dụng."
              disabled={
                submitting
              }
              onClose={() =>
                setShowSystemForm(
                  false,
                )
              }
            />

            <div className="space-y-6 p-4 sm:p-6">
              <RatingField
                label="Mức độ hài lòng"
                value={
                  systemForm.mucDoHaiLong
                }
                onChange={(
                  value,
                ) =>
                  setSystemForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      mucDoHaiLong:
                        value,
                    }),
                  )
                }
              />

              <RatingField
                label="Mức độ dễ sử dụng"
                value={
                  systemForm.deSuDung
                }
                onChange={(
                  value,
                ) =>
                  setSystemForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      deSuDung:
                        value,
                    }),
                  )
                }
              />

              <RatingField
                label="Hiệu quả hỗ trợ công việc"
                value={
                  systemForm.tinhHieuQua
                }
                onChange={(
                  value,
                ) =>
                  setSystemForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      tinhHieuQua:
                        value,
                    }),
                  )
                }
              />

              <RatingField
                label="Mức độ phù hợp nhu cầu"
                value={
                  systemForm.mucDoPhuHop
                }
                onChange={(
                  value,
                ) =>
                  setSystemForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      mucDoPhuHop:
                        value,
                    }),
                  )
                }
              />

              <TextArea
                label="Nội dung góp ý"
                required
                maxLength={
                  3000
                }
                value={
                  systemForm.noiDungGopY
                }
                onChange={(
                  value,
                ) =>
                  setSystemForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      noiDungGopY:
                        value,
                    }),
                  )
                }
                placeholder="Hãy cho chúng tôi biết điều gì đang tốt hoặc chưa thuận tiện..."
              />

              <TextArea
                label="Đề xuất cải thiện"
                maxLength={
                  3000
                }
                value={
                  systemForm.deXuatCaiThien
                }
                onChange={(
                  value,
                ) =>
                  setSystemForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      deXuatCaiThien:
                        value,
                    }),
                  )
                }
                placeholder="Bạn muốn hệ thống cải thiện hoặc bổ sung chức năng gì?"
              />
            </div>

            <ModalFooter
              submitting={
                submitting
              }
              submitText="Gửi phản hồi"
              onCancel={() =>
                setShowSystemForm(
                  false,
                )
              }
            />
          </form>
        </div>
      )}

      {/* ===================================================
          ACTIVITY DETAIL
      =================================================== */}

      {activityDetail && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <ModalHeader
              title="Đánh giá của bạn"
              subtitle={formatDateTime(
                activityDetail.createdAt,
              )}
              onClose={() =>
                setActivityDetail(
                  null,
                )
              }
            />

            <div className="space-y-4 p-5">
              <RatingDisplay
                value={averageActivity(
                  activityDetail,
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <SmallScore
                  label="Chất lượng"
                  value={
                    activityDetail.diemChatLuong
                  }
                />

                <SmallScore
                  label="Nội dung"
                  value={
                    activityDetail.diemNoiDung
                  }
                />

                <SmallScore
                  label="Tổ chức"
                  value={
                    activityDetail.diemToChuc
                  }
                />
              </div>

              <ContentBox
                label="Nhận xét"
                content={
                  activityDetail.noiDungDanhGia
                }
              />

              {activityDetail.deXuatCaiThien && (
                <ContentBox
                  label="Đề xuất cải thiện"
                  content={
                    activityDetail.deXuatCaiThien
                  }
                  blue
                />
              )}
            </div>

            <SimpleCloseFooter
              onClose={() =>
                setActivityDetail(
                  null,
                )
              }
            />
          </div>
        </div>
      )}

      {/* ===================================================
          SYSTEM DETAIL
      =================================================== */}

      {systemDetail && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <ModalHeader
              title="Chi tiết đánh giá hệ thống"
              subtitle={formatDateTime(
                systemDetail.createdAt,
              )}
              onClose={() =>
                setSystemDetail(
                  null,
                )
              }
            />

            <div className="space-y-4 p-5">
              <RatingDisplay
                value={averageSystem(
                  systemDetail,
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <SmallScore
                  label="Hài lòng"
                  value={
                    systemDetail.mucDoHaiLong
                  }
                />

                <SmallScore
                  label="Dễ sử dụng"
                  value={
                    systemDetail.deSuDung
                  }
                />

                <SmallScore
                  label="Hiệu quả"
                  value={
                    systemDetail.tinhHieuQua
                  }
                />

                <SmallScore
                  label="Phù hợp"
                  value={
                    systemDetail.mucDoPhuHop
                  }
                />
              </div>

              <ContentBox
                label="Nội dung góp ý"
                content={
                  systemDetail.noiDungGopY
                }
              />

              {systemDetail.deXuatCaiThien && (
                <ContentBox
                  label="Đề xuất cải thiện"
                  content={
                    systemDetail.deXuatCaiThien
                  }
                  blue
                />
              )}
            </div>

            <SimpleCloseFooter
              onClose={() =>
                setSystemDetail(
                  null,
                )
              }
            />
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   MEMBER ACTIVITY CARD
========================================================= */

function MemberActivityCard({
  item,

  onRate,

  onView,
}: {
  item:
    MemberActivityItem;

  onRate:
    () => void;

  onView:
    () => void;
}) {
  const activity =
    item.hoatDong;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {item.daDanhGia ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Đã đánh giá
              </span>
            ) : item.coTheDanhGia ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Chờ đánh giá
              </span>
            ) : (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                Chưa mở
              </span>
            )}
          </div>

          <h2 className="mt-3 text-base font-bold text-slate-950">
            {
              activity.maHoatDong
            }{" "}
            -{" "}
            {
              activity.tenHoatDong
            }
          </h2>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <CalendarDays
                size={16}
              />

              {formatDateTime(
                activity.thoiGianBatDau,
              )}
            </span>

            <span className="flex items-center gap-2">
              <MapPin
                size={16}
              />

              {activity.diaDiem ||
                "—"}
            </span>
          </div>

          {item.danhGia && (
            <div className="mt-4">
              <RatingDisplay
                value={averageActivity(
                  item.danhGia,
                )}
              />
            </div>
          )}
        </div>

        <div>
          {item.daDanhGia &&
          item.danhGia ? (
            <button
              type="button"
              onClick={
                onView
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700"
            >
              <MessageSquareText
                size={16}
              />

              Xem đánh giá
            </button>
          ) : item.coTheDanhGia ? (
            <button
              type="button"
              onClick={
                onRate
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#123b68] px-4 text-sm font-semibold text-white"
            >
              <Star
                size={16}
              />

              Đánh giá
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   MANAGER ACTIVITY CARD
========================================================= */

function ManagerActivityCard({
  item,
}: {
  item:
    DanhGiaHoatDong;
}) {
  const activity =
    getHoatDong(
      item.hoatDongId,
    );

  const member =
    getHoiVien(
      item.hoiVienId,
    );

  const chiHoi =
    getChiHoi(
      member?.chiHoiId,
    );

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <RatingDisplay
          value={averageActivity(
            item,
          )}
        />

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
          {formatDateTime(
            item.createdAt,
          )}
        </span>
      </div>

      <h2 className="mt-3 font-bold text-slate-950">
        {activity
          ? `${activity.maHoatDong} - ${activity.tenHoatDong}`
          : "Hoạt động"}
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        {member?.maHoiVien ||
          "—"}{" "}
        -{" "}
        {member?.hoTen ||
          "Hội viên"}

        {member?.lop
          ? ` • ${member.lop}`
          : ""}

        {chiHoi?.tenChiHoi
          ? ` • ${chiHoi.tenChiHoi}`
          : ""}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <SmallScore
          label="Chất lượng"
          value={
            item.diemChatLuong
          }
        />

        <SmallScore
          label="Nội dung"
          value={
            item.diemNoiDung
          }
        />

        <SmallScore
          label="Tổ chức"
          value={
            item.diemToChuc
          }
        />
      </div>

      <ContentBox
        label="Nhận xét"
        content={
          item.noiDungDanhGia
        }
      />

      {item.deXuatCaiThien && (
        <ContentBox
          label="Đề xuất cải thiện"
          content={
            item.deXuatCaiThien
          }
          blue
        />
      )}
    </article>
  );
}

/* =========================================================
   RATING FIELD
========================================================= */

function RatingField({
  label,

  value,

  onChange,
}: {
  label:
    string;

  value:
    number;

  onChange:
    (
      value:
        number,
    ) => void;
}) {
  const [
    hover,
    setHover,
  ] =
    useState(
      0,
    );

  const labels = [
    "",
    "Rất chưa hài lòng",
    "Chưa hài lòng",
    "Bình thường",
    "Hài lòng",
    "Rất hài lòng",
  ];

  const visible =
    hover ||
    value;

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">
        {label}{" "}

        <span className="text-red-500">
          *
        </span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {[
          1,
          2,
          3,
          4,
          5,
        ].map(
          (
            score,
          ) => (
            <button
              key={
                score
              }
              type="button"
              onMouseEnter={() =>
                setHover(
                  score,
                )
              }
              onMouseLeave={() =>
                setHover(
                  0,
                )
              }
              onClick={() =>
                onChange(
                  score,
                )
              }
              className="rounded-lg p-1.5"
            >
              <Star
                size={30}
                className={
                  score <=
                  visible
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-300"
                }
              />
            </button>
          ),
        )}

        <span className="ml-3 text-sm font-medium text-slate-600">
          {visible
            ? `${visible}/5 - ${labels[visible]}`
            : "Chưa đánh giá"}
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   TEXTAREA
========================================================= */

function TextArea({
  label,

  value,

  onChange,

  placeholder,

  maxLength,

  required,
}: {
  label:
    string;

  value:
    string;

  onChange:
    (
      value:
        string,
    ) => void;

  placeholder:
    string;

  maxLength:
    number;

  required?:
    boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="text-red-500">
            {" "}
            *
          </span>
        )}
      </span>

      <textarea
        rows={5}
        required={
          required
        }
        maxLength={
          maxLength
        }
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={
          placeholder
        }
        className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#123b68]"
      />

      <p className="mt-1 text-right text-xs text-slate-400">
        {
          value.length
        }
        /
        {
          maxLength
        }
      </p>
    </label>
  );
}

/* =========================================================
   COMMON COMPONENTS
========================================================= */

function RatingDisplay({
  value,
}: {
  value:
    number;
}) {
  const rounded =
    Math.round(
      Number(
        value ||
          0,
      ),
    );

  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex">
        {[
          1,
          2,
          3,
          4,
          5,
        ].map(
          (
            score,
          ) => (
            <Star
              key={
                score
              }
              size={15}
              className={
                score <=
                rounded
                  ? "fill-amber-400 text-amber-400"
                  : "text-slate-300"
              }
            />
          ),
        )}
      </div>

      <span className="text-sm font-bold text-slate-800">
        {Number(
          value ||
            0,
        ).toFixed(
          1,
        )}
      </span>
    </div>
  );
}

function StatCard({
  label,

  value,

  icon,
}: {
  label:
    string;

  value:
    number
    | string;

  icon:
    ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#123b68]">
        {icon}
      </div>
    </div>
  );
}

function ScoreStatCard({
  label,

  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <div className="mt-2">
        <RatingDisplay
          value={
            value
          }
        />
      </div>
    </div>
  );
}

function SmallScore({
  label,

  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <div className="mt-1 flex items-center gap-1">
        <Star
          size={15}
          className="fill-amber-400 text-amber-400"
        />

        <span className="font-bold text-slate-900">
          {value}/5
        </span>
      </div>
    </div>
  );
}

function ContentBox({
  label,

  content,

  blue =
    false,
}: {
  label:
    string;

  content:
    string;

  blue?:
    boolean;
}) {
  return (
    <div
      className={`mt-4 rounded-xl p-4 ${
        blue
          ? "border border-blue-200 bg-blue-50"
          : "bg-slate-50"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          blue
            ? "text-blue-600"
            : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p
        className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
          blue
            ? "text-blue-800"
            : "text-slate-700"
        }`}
      >
        {content}
      </p>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text:
    string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
      <Star
        size={42}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-sm text-slate-500">
        {text}
      </p>
    </div>
  );
}

function ModalHeader({
  title,

  subtitle,

  disabled,

  onClose,
}: {
  title:
    string;

  subtitle?:
    string;

  disabled?:
    boolean;

  onClose:
    () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:px-6">
      <div>
        <h2 className="text-lg font-bold text-slate-950">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={
          disabled
        }
        onClick={
          onClose
        }
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      >
        <X
          size={20}
        />
      </button>
    </div>
  );
}

function ModalFooter({
  submitting,

  submitText,

  onCancel,
}: {
  submitting:
    boolean;

  submitText:
    string;

  onCancel:
    () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:px-6">
      <button
        type="button"
        disabled={
          submitting
        }
        onClick={
          onCancel
        }
        className="h-11 rounded-lg border border-slate-300 px-5 text-sm font-medium text-slate-700"
      >
        Hủy
      </button>

      <button
        type="submit"
        disabled={
          submitting
        }
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {submitting ? (
          <Loader2
            size={17}
            className="animate-spin"
          />
        ) : (
          <Send
            size={17}
          />
        )}

        {submitText}
      </button>
    </div>
  );
}

function SimpleCloseFooter({
  onClose,
}: {
  onClose:
    () => void;
}) {
  return (
    <div className="flex justify-end border-t border-slate-200 p-4">
      <button
        type="button"
        onClick={
          onClose
        }
        className="h-10 rounded-lg bg-[#123b68] px-5 text-sm font-semibold text-white"
      >
        Đóng
      </button>
    </div>
  );
}
"use client";

import Link from "next/link";

import {
  Award,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
  ReactNode,
} from "react";

import * as XLSX from "xlsx";

import ResetMatKhauHoiVienModal from "@/components/hoi-vien/ResetMatKhauHoiVienModal";

/* =========================================================
   TYPES
========================================================= */

type GioiTinh =
  | "NAM"
  | "NU"
  | "KHAC";

type TrangThaiHoiVien =
  | "DANG_HOAT_DONG"
  | "TAM_NGUNG";

type XepLoai =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

type UserRole =
  | "ADMIN"
  | "BAN_CHAP_HANH"
  | "CHI_HOI_TRUONG"
  | "HOI_VIEN";

type CurrentUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
};

type ChiHoi = {
  _id: string;
  maChiHoi: string;
  tenChiHoi: string;
};

type TaiKhoan = {
  _id: string;
  username: string;
  isActive?: boolean;
};

type DanhGia = {
  _id?: string;
  xepLoai: XepLoai;
  nhanXet?: string;
};

type HoiVien = {
  _id: string;

  maHoiVien: string;
  hoTen: string;

  ngaySinh?: string;
  gioiTinh?: GioiTinh;

  email?: string;
  soDienThoai?: string;

  lop?: string;
  khoaHoc?: string;
  diaChi?: string;

  chiHoiId:
    | ChiHoi
    | string;

  taiKhoanId?:
    | TaiKhoan
    | string
    | null;

  trangThai: TrangThaiHoiVien;

  danhGia?:
    | DanhGia
    | null;

  createdAt?: string;
};

type HoiVienForm = {
  maHoiVien: string;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: GioiTinh;
  email: string;
  soDienThoai: string;
  lop: string;
  khoaHoc: string;
  diaChi: string;
  chiHoiId: string;
  trangThai: TrangThaiHoiVien;
};

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_FORM: HoiVienForm = {
  maHoiVien: "",
  hoTen: "",
  ngaySinh: "",
  gioiTinh: "NAM",
  email: "",
  soDienThoai: "",
  lop: "",
  khoaHoc: "",
  diaChi: "",
  chiHoiId: "",
  trangThai:
    "DANG_HOAT_DONG",
};

/* =========================================================
   HELPERS
========================================================= */

function getChiHoi(
  hoiVien: HoiVien,
): ChiHoi | null {
  if (
    hoiVien.chiHoiId &&
    typeof hoiVien.chiHoiId ===
      "object" &&
    "_id" in hoiVien.chiHoiId
  ) {
    return hoiVien.chiHoiId;
  }

  return null;
}

function getTaiKhoan(
  hoiVien: HoiVien,
): TaiKhoan | null {
  if (
    hoiVien.taiKhoanId &&
    typeof hoiVien.taiKhoanId ===
      "object" &&
    "_id" in hoiVien.taiKhoanId
  ) {
    return hoiVien.taiKhoanId;
  }

  return null;
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "vi-VN",
  ).format(date);
}

function formatGender(
  value?: GioiTinh,
) {
  if (value === "NAM") {
    return "Nam";
  }

  if (value === "NU") {
    return "Nữ";
  }

  if (value === "KHAC") {
    return "Khác";
  }

  return "—";
}

function formatRating(
  value?: XepLoai,
) {
  const labels: Record<
    XepLoai,
    string
  > = {
    XUAT_SAC: "Xuất sắc",
    TOT: "Tốt",
    KHA: "Khá",
    TRUNG_BINH:
      "Trung bình",
    YEU: "Yếu",
  };

  return value
    ? labels[value]
    : "Chưa đánh giá";
}

function normalizeSearchText(
  value?: string | null,
) {
  return (value || "")
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function extractCurrentUser(
  result: Record<
    string,
    unknown
  >,
): CurrentUser | null {
  const data = result.data as Record<string, unknown> | undefined;
  const raw = (result.user ?? data?.user ?? data) as
    Record<string, unknown> | null | undefined;

  if (
    !raw ||
    !raw.role
  ) {
    return null;
  }

  return {
    id: String(
      raw.id ??
        raw._id ??
        raw.userId ??
        "",
    ),

    username: String(
      raw.username ?? "",
    ),

    fullName: String(
      raw.fullName ??
        raw.hoTen ??
        "",
    ),

    role:
      raw.role as UserRole,
  };
}

/* =========================================================
   PAGE
========================================================= */

export default function HoiVienPage() {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );

  const [
    members,
    setMembers,
  ] = useState<HoiVien[]>([]);

  const [
    branches,
    setBranches,
  ] = useState<ChiHoi[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    branchFilter,
    setBranchFilter,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  /* FORM */

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    editingMember,
    setEditingMember,
  ] =
    useState<HoiVien | null>(
      null,
    );

  const [
    form,
    setForm,
  ] =
    useState<HoiVienForm>(
      EMPTY_FORM,
    );

  /* MODALS */

  const [
    viewMember,
    setViewMember,
  ] =
    useState<HoiVien | null>(
      null,
    );

  const [
    deleteMember,
    setDeleteMember,
  ] =
    useState<HoiVien | null>(
      null,
    );

  const [
    statusMember,
    setStatusMember,
  ] =
    useState<HoiVien | null>(
      null,
    );

  const [
    ratingMember,
    setRatingMember,
  ] =
    useState<HoiVien | null>(
      null,
    );

  const [
    accountMember,
    setAccountMember,
  ] =
    useState<HoiVien | null>(
      null,
    );

  const [
    resetMember,
    setResetMember,
  ] =
    useState<HoiVien | null>(
      null,
    );

  const [
    refreshConfirmOpen,
    setRefreshConfirmOpen,
  ] = useState(false);

  /* RATING */

  const [
    ratingForm,
    setRatingForm,
  ] = useState<{
    xepLoai: XepLoai;
    nhanXet: string;
  }>({
    xepLoai: "TOT",
    nhanXet: "",
  });

  /* ACCOUNT */

  const [
    accountForm,
    setAccountForm,
  ] = useState({
    username: "",
    password: "",
  });

  const [
    showAccountPassword,
    setShowAccountPassword,
  ] = useState(false);

  /* =======================================================
     ROLE
  ======================================================= */

  const isAdmin =
    currentUser?.role ===
    "ADMIN";

  const isBCH =
    currentUser?.role ===
    "BAN_CHAP_HANH";

  const isChiHoiTruong =
    currentUser?.role ===
    "CHI_HOI_TRUONG";

  /*
   * ADMIN/BCH:
   * Có thể thêm trực tiếp,
   * cấp tài khoản, khóa, xóa...
   *
   * Chi hội trưởng:
   * dùng luồng đề xuất thành viên mới.
   */
  const canDirectManageMember =
    isAdmin || isBCH;

  const canEditMember =
    canDirectManageMember ||
    isChiHoiTruong;

  const canRateMember =
    canDirectManageMember ||
    isChiHoiTruong;

  const proposalButtonLabel =
    isChiHoiTruong
      ? "Đề xuất Hội viên mới"
      : "Duyệt đề xuất";

  /* =======================================================
     COMMON
  ======================================================= */

  function clearNotice() {
    setMessage("");
    setError("");
  }

  /* =======================================================
     LOAD DATA
  ======================================================= */

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      /*
       * Lấy user trước để biết role.
       */
      const userResponse =
        await fetch(
          "/api/auth/me",
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "include",
          },
        );

      const userResult =
        await userResponse.json();

      if (
        !userResponse.ok ||
        !userResult.success
      ) {
        throw new Error(
          userResult.message ||
            "Không thể tải thông tin người dùng",
        );
      }

      const user =
        extractCurrentUser(
          userResult,
        );

      if (!user) {
        throw new Error(
          "Không xác định được quyền người dùng",
        );
      }

      setCurrentUser(user);

      /*
       * API Hội viên phải tự phân quyền:
       *
       * ADMIN/BCH -> toàn bộ
       * CHT -> Hội viên Chi hội mình
       */
      const memberResponse =
        await fetch(
          "/api/hoi-vien",
          {
            method: "GET",
            cache: "no-store",
            credentials:
              "include",
          },
        );

      const memberResult =
        await memberResponse.json();

      if (
        !memberResponse.ok ||
        !memberResult.success
      ) {
        throw new Error(
          memberResult.message ||
            "Không thể tải danh sách Hội viên",
        );
      }

      const memberList: HoiVien[] =
        Array.isArray(
          memberResult.data,
        )
          ? memberResult.data
          : [];

      setMembers(
        memberList,
      );

      /*
       * ADMIN / BCH có quyền gọi
       * /api/chi-hoi.
       */
      if (
        user.role === "ADMIN" ||
        user.role ===
          "BAN_CHAP_HANH"
      ) {
        const branchResponse =
          await fetch(
            "/api/chi-hoi",
            {
              method: "GET",
              cache: "no-store",
              credentials:
                "include",
            },
          );

        const branchResult =
          await branchResponse.json();

        if (
          !branchResponse.ok ||
          !branchResult.success
        ) {
          throw new Error(
            branchResult.message ||
              "Không thể tải danh sách Chi hội",
          );
        }

        setBranches(
          Array.isArray(
            branchResult.data,
          )
            ? branchResult.data
            : [],
        );

        return;
      }

      /*
       * CHI_HOI_TRUONG không gọi
       * /api/chi-hoi để tránh 403.
       *
       * Lấy Chi hội từ danh sách
       * Hội viên đã populate.
       */
      if (
        user.role ===
        "CHI_HOI_TRUONG"
      ) {
        const map =
          new Map<
            string,
            ChiHoi
          >();

        memberList.forEach(
          (member) => {
            const branch =
              getChiHoi(member);

            if (
              branch?._id
            ) {
              map.set(
                branch._id,
                branch,
              );
            }
          },
        );

        setBranches(
          Array.from(
            map.values(),
          ),
        );

        return;
      }

      setBranches([]);
    } catch (loadError) {
      setMembers([]);
      setBranches([]);

      setError(
        loadError instanceof
          Error
          ? loadError.message
          : "Đã xảy ra lỗi khi tải dữ liệu",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu khi mở trang.
    void loadData();
  }, []);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredMembers =
    useMemo(() => {
      const keyword =
        normalizeSearchText(
          search,
        );

      return members.filter(
        (member) => {
          const memberBranchId =
            typeof member.chiHoiId ===
            "string"
              ? member.chiHoiId
              : member
                  .chiHoiId?._id;

          const searchable =
            [
              member.maHoiVien,
              member.hoTen,
              member.email,
              member.soDienThoai,
              member.lop,
              member.khoaHoc,
              getChiHoi(
                member,
              )?.maChiHoi,
              getChiHoi(
                member,
              )?.tenChiHoi,
              getTaiKhoan(
                member,
              )?.username,
            ]
              .map((value) =>
                normalizeSearchText(
                  value,
                ),
              )
              .join(" ");

          const matchesSearch =
            !keyword ||
            searchable.includes(
              keyword,
            );

          const matchesBranch =
            !branchFilter ||
            memberBranchId ===
              branchFilter;

          const matchesStatus =
            !statusFilter ||
            member.trangThai ===
              statusFilter;

          return (
            matchesSearch &&
            matchesBranch &&
            matchesStatus
          );
        },
      );
    }, [
      members,
      search,
      branchFilter,
      statusFilter,
    ]);

  const statistics =
    useMemo(
      () => ({
        total:
          members.length,

        active:
          members.filter(
            (member) =>
              member.trangThai ===
              "DANG_HOAT_DONG",
          ).length,

        accounts:
          members.filter(
            (member) =>
              Boolean(
                member.taiKhoanId,
              ),
          ).length,

        ratings:
          members.filter(
            (member) =>
              Boolean(
                member.danhGia,
              ),
          ).length,
      }),
      [members],
    );

  /* =======================================================
     CREATE / EDIT
  ======================================================= */

  function openCreateForm() {
    if (
      !canDirectManageMember
    ) {
      return;
    }

    clearNotice();

    setEditingMember(
      null,
    );

    setForm(
      EMPTY_FORM,
    );

    setFormOpen(true);
  }

  function openEditForm(
    member: HoiVien,
  ) {
    if (!canEditMember) {
      return;
    }

    const branchId =
      typeof member.chiHoiId ===
      "string"
        ? member.chiHoiId
        : member
            .chiHoiId?._id ||
          "";

    clearNotice();

    setEditingMember(
      member,
    );

    setForm({
      maHoiVien:
        member.maHoiVien ||
        "",

      hoTen:
        member.hoTen || "",

      ngaySinh:
        member.ngaySinh
          ? new Date(
              member.ngaySinh,
            )
              .toISOString()
              .slice(0, 10)
          : "",

      gioiTinh:
        member.gioiTinh ||
        "NAM",

      email:
        member.email || "",

      soDienThoai:
        member.soDienThoai ||
        "",

      lop:
        member.lop || "",

      khoaHoc:
        member.khoaHoc || "",

      diaChi:
        member.diaChi || "",

      chiHoiId:
        branchId,

      trangThai:
        member.trangThai ||
        "DANG_HOAT_DONG",
    });

    setFormOpen(true);
  }

  async function handleSaveMember(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !canEditMember
    ) {
      setError(
        "Bạn không có quyền cập nhật Hội viên",
      );

      return;
    }

    /*
     * Chi hội trưởng không được
     * tạo trực tiếp Hội viên.
     */
    if (
      !editingMember &&
      isChiHoiTruong
    ) {
      setError(
        "Chi hội trưởng phải sử dụng chức năng Đề xuất Hội viên mới",
      );

      return;
    }

    const maHoiVien =
      form.maHoiVien
        .trim()
        .toUpperCase();

    const hoTen =
      form.hoTen.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const phone =
      form.soDienThoai.trim();

    if (!maHoiVien) {
      setError(
        "Mã Hội viên không được để trống",
      );

      return;
    }

    if (!hoTen) {
      setError(
        "Họ và tên không được để trống",
      );

      return;
    }

    /*
     * Feedback yêu cầu kiểm tra
     * định dạng số điện thoại.
     */
    if (
      phone &&
      !/^0\d{9}$/.test(
        phone,
      )
    ) {
      setError(
        "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0",
      );

      return;
    }

    /*
     * Kiểm tra email.
     */
    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      setError(
        "Email không đúng định dạng",
      );

      return;
    }

    if (!form.chiHoiId) {
      setError(
        "Vui lòng chọn Chi hội",
      );

      return;
    }

    try {
      setSubmitting(true);

      clearNotice();

      const url =
        editingMember
          ? `/api/hoi-vien/${editingMember._id}`
          : "/api/hoi-vien";

      const response =
        await fetch(
          url,
          {
            method:
              editingMember
                ? "PUT"
                : "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...form,

                maHoiVien,

                hoTen,

                email,

                soDienThoai:
                  phone,

                lop:
                  form.lop.trim(),

                khoaHoc:
                  form.khoaHoc.trim(),

                diaChi:
                  form.diaChi.trim(),

                ngaySinh:
                  form.ngaySinh ||
                  null,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể lưu thông tin Hội viên",
        );
      }

      setFormOpen(false);

      setEditingMember(
        null,
      );

      setForm(
        EMPTY_FORM,
      );

      setMessage(
        result.message ||
          (editingMember
            ? "Cập nhật Hội viên thành công"
            : "Thêm Hội viên thành công"),
      );

      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Đã xảy ra lỗi khi lưu Hội viên",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDeleteMember() {
    if (
      !deleteMember ||
      !canDirectManageMember
    ) {
      return;
    }

    const id =
      deleteMember._id;

    try {
      setSubmitting(true);

      clearNotice();

      const response =
        await fetch(
          `/api/hoi-vien/${id}`,
          {
            method:
              "DELETE",

            credentials:
              "include",

            cache:
              "no-store",
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể xóa Hội viên",
        );
      }

      setDeleteMember(
        null,
      );

      setMessage(
        result.message ||
          "Xóa Hội viên thành công",
      );

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Đã xảy ra lỗi khi xóa Hội viên",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     RATING
  ======================================================= */

  function openRating(
    member: HoiVien,
  ) {
    if (!canRateMember) {
      return;
    }

    clearNotice();

    setRatingMember(
      member,
    );

    setRatingForm({
      xepLoai:
        member.danhGia
          ?.xepLoai ||
        "TOT",

      nhanXet:
        member.danhGia
          ?.nhanXet ||
        "",
    });
  }

  async function handleSaveRating(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !ratingMember ||
      !canRateMember
    ) {
      return;
    }

    try {
      setSubmitting(true);

      clearNotice();

      const response =
        await fetch(
          `/api/hoi-vien/${ratingMember._id}/danh-gia`,
          {
            method: "PUT",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                xepLoai:
                  ratingForm.xepLoai,

                nhanXet:
                  ratingForm.nhanXet.trim(),
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể lưu đánh giá",
        );
      }

      setRatingMember(
        null,
      );

      setMessage(
        result.message ||
          "Đánh giá Hội viên thành công",
      );

      await loadData();
    } catch (ratingError) {
      setError(
        ratingError instanceof
          Error
          ? ratingError.message
          : "Đã xảy ra lỗi khi đánh giá Hội viên",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     CREATE ACCOUNT
  ======================================================= */

  function openCreateAccount(
    member: HoiVien,
  ) {
    if (
      !canDirectManageMember
    ) {
      return;
    }

    clearNotice();

    setAccountMember(
      member,
    );

    setAccountForm({
      username:
        member.maHoiVien.toLowerCase(),

      password: "",
    });

    setShowAccountPassword(
      false,
    );
  }

  async function handleCreateAccount(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !accountMember ||
      !canDirectManageMember
    ) {
      return;
    }

    const username =
      accountForm.username.trim();

    if (!username) {
      setError(
        "Tên đăng nhập không được để trống",
      );

      return;
    }

    if (
      accountForm.password
        .length < 6
    ) {
      setError(
        "Mật khẩu phải có ít nhất 6 ký tự",
      );

      return;
    }

    try {
      setSubmitting(true);

      clearNotice();

      const response =
        await fetch(
          `/api/hoi-vien/${accountMember._id}/cap-tai-khoan`,
          {
            method: "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                username,

                password:
                  accountForm.password,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể cấp tài khoản",
        );
      }

      setAccountMember(
        null,
      );

      setAccountForm({
        username: "",
        password: "",
      });

      setShowAccountPassword(
        false,
      );

      setMessage(
        result.message ||
          "Cấp tài khoản thành công",
      );

      await loadData();
    } catch (accountError) {
      setError(
        accountError instanceof
          Error
          ? accountError.message
          : "Đã xảy ra lỗi khi cấp tài khoản",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     RESET PASSWORD
  ======================================================= */

  function openResetPassword(
    member: HoiVien,
  ) {
    if (
      !canDirectManageMember
    ) {
      return;
    }

    clearNotice();

    const account =
      getTaiKhoan(member);

    if (!account) {
      setError(
        "Không lấy được thông tin tài khoản Hội viên. Vui lòng làm mới dữ liệu.",
      );

      return;
    }

    setResetMember(
      member,
    );
  }

  /* =======================================================
     STATUS
  ======================================================= */

  async function handleChangeStatus() {
    if (
      !statusMember ||
      !canDirectManageMember
    ) {
      return;
    }

    const nextStatus: TrangThaiHoiVien =
      statusMember.trangThai ===
      "DANG_HOAT_DONG"
        ? "TAM_NGUNG"
        : "DANG_HOAT_DONG";

    try {
      setSubmitting(true);

      clearNotice();

      const response =
        await fetch(
          `/api/hoi-vien/${statusMember._id}/trang-thai`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                trangThai:
                  nextStatus,
              }),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Không thể cập nhật trạng thái",
        );
      }

      setStatusMember(
        null,
      );

      setMessage(
        result.message ||
          (nextStatus ===
          "TAM_NGUNG"
            ? "Ngừng hoạt động Hội viên thành công"
            : "Mở lại hoạt động Hội viên thành công"),
      );

      await loadData();
    } catch (statusError) {
      setError(
        statusError instanceof
          Error
          ? statusError.message
          : "Đã xảy ra lỗi khi cập nhật trạng thái",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     REFRESH
  ======================================================= */

  async function handleRefresh() {
    setRefreshConfirmOpen(
      false,
    );

    setSearch("");

    setBranchFilter("");

    setStatusFilter("");

    clearNotice();

    await loadData();

    setMessage(
      "Đã làm mới danh sách Hội viên",
    );
  }

  /* =======================================================
     EXPORT EXCEL
  ======================================================= */

  function handleExportExcel() {
    if (
      filteredMembers.length ===
      0
    ) {
      setMessage("");

      setError(
        "Không có dữ liệu để xuất Excel",
      );

      return;
    }

    const rows =
      filteredMembers.map(
        (
          member,
          index,
        ) => {
          const branch =
            getChiHoi(member);

          const account =
            getTaiKhoan(
              member,
            );

          return {
            STT: index + 1,

            "Mã Hội viên":
              member.maHoiVien,

            "Họ và tên":
              member.hoTen,

            "Ngày sinh":
              formatDate(
                member.ngaySinh,
              ),

            "Giới tính":
              formatGender(
                member.gioiTinh,
              ),

            "Chi hội":
              branch
                ? `${branch.maChiHoi} - ${branch.tenChiHoi}`
                : "Chưa xác định",

            Lớp:
              member.lop ||
              "",

            "Khóa học":
              member.khoaHoc ||
              "",

            Email:
              member.email ||
              "",

            "Số điện thoại":
              member.soDienThoai ||
              "",

            "Địa chỉ":
              member.diaChi ||
              "",

            "Tên đăng nhập":
              account?.username ||
              "Chưa cấp",

            "Xếp loại":
              formatRating(
                member.danhGia
                  ?.xepLoai,
              ),

            "Trạng thái":
              member.trangThai ===
              "DANG_HOAT_DONG"
                ? "Đang hoạt động"
                : "Tạm ngừng",
          };
        },
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        rows,
      );

    const workbook =
      XLSX.utils.book_new();

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 26 },
      { wch: 14 },
      { wch: 12 },
      { wch: 28 },
      { wch: 14 },
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Hội viên",
    );

    XLSX.writeFile(
      workbook,
      `danh-sach-hoi-vien-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`,
    );

    setError("");

    setMessage(
      "Xuất Excel thành công",
    );
  }

  const resetAccount =
    resetMember
      ? getTaiKhoan(
          resetMember,
        )
      : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-full bg-[#F3F6FA] px-3 py-5 font-sans sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        {/* HEADER */}

        <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#12345B]">
              Quản trị hệ thống
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Quản lý Hội viên
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {isChiHoiTruong
                ? "Quản lý Hội viên thuộc Chi hội phụ trách và gửi đề xuất Hội viên mới lên Ban Chấp hành."
                : "Quản lý hồ sơ, Chi hội trực thuộc, tài khoản và kết quả đánh giá Hội viên."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              onClick={
                handleExportExcel
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-white px-5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              <Download
                size={18}
              />

              Xuất Excel
            </button>

            {(isChiHoiTruong ||
              canDirectManageMember) && (
              <Link
                href="/dashboard/hoi-vien/de-xuat"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#12345B] bg-white px-5 text-sm font-semibold text-[#12345B] transition hover:bg-blue-50"
              >
                <ClipboardCheck
                  size={18}
                />

                {
                  proposalButtonLabel
                }
              </Link>
            )}

            {canDirectManageMember && (
              <button
                type="button"
                onClick={
                  openCreateForm
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white transition hover:bg-[#0D2947]"
              >
                <Plus
                  size={18}
                />

                Thêm Hội viên
              </button>
            )}
          </div>
        </header>

        {/* NOTICE */}

        {message && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* STATISTICS */}

        <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Tổng Hội viên"
            value={
              statistics.total
            }
            icon={
              <Users
                size={23}
              />
            }
            iconClass="bg-blue-50 text-[#12345B]"
          />

          <StatCard
            label="Đang hoạt động"
            value={
              statistics.active
            }
            icon={
              <UserCheck
                size={23}
              />
            }
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            label="Đã cấp tài khoản"
            value={
              statistics.accounts
            }
            icon={
              <KeyRound
                size={23}
              />
            }
            iconClass="bg-amber-50 text-amber-700"
          />

          <StatCard
            label="Đã đánh giá"
            value={
              statistics.ratings
            }
            icon={
              <Award
                size={23}
              />
            }
            iconClass="bg-violet-50 text-violet-700"
          />
        </section>

        {/* FILTERS + LIST */}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div
            className={`grid grid-cols-1 gap-3 border-b border-slate-200 p-4 ${
              isChiHoiTruong
                ? "xl:grid-cols-[minmax(300px,1fr)_210px_auto]"
                : "xl:grid-cols-[minmax(300px,1fr)_250px_210px_auto]"
            }`}
          >
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                className="control pr-10"
                style={{
                  paddingLeft:
                    "48px",
                }}
                placeholder="Tìm mã, họ tên, email, số điện thoại..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                >
                  <X
                    size={16}
                  />
                </button>
              )}
            </div>

            {!isChiHoiTruong && (
              <select
                value={
                  branchFilter
                }
                onChange={(
                  event,
                ) =>
                  setBranchFilter(
                    event.target
                      .value,
                  )
                }
                className="control"
              >
                <option value="">
                  Tất cả Chi hội
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={
                        branch._id
                      }
                      value={
                        branch._id
                      }
                    >
                      {
                        branch.maChiHoi
                      }{" "}
                      -{" "}
                      {
                        branch.tenChiHoi
                      }
                    </option>
                  ),
                )}
              </select>
            )}

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target
                    .value,
                )
              }
              className="control"
            >
              <option value="">
                Tất cả trạng thái
              </option>

              <option value="DANG_HOAT_DONG">
                Đang hoạt động
              </option>

              <option value="TAM_NGUNG">
                Tạm ngừng
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                setRefreshConfirmOpen(
                  true,
                )
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw
                size={18}
              />

              Làm mới
            </button>
          </div>

          {/* DESKTOP TABLE */}

          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[1380px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs font-bold uppercase text-slate-600">
                  <th className="px-5 py-4">
                    STT
                  </th>

                  <th className="px-5 py-4">
                    Mã Hội viên
                  </th>

                  <th className="px-5 py-4">
                    Họ và tên
                  </th>

                  <th className="px-5 py-4">
                    Chi hội
                  </th>

                  <th className="px-5 py-4">
                    Lớp
                  </th>

                  <th className="px-5 py-4">
                    Liên hệ
                  </th>

                  <th className="px-5 py-4">
                    Tài khoản
                  </th>

                  <th className="px-5 py-4">
                    Xếp loại
                  </th>

                  <th className="px-5 py-4">
                    Trạng thái
                  </th>

                  <th className="px-5 py-4 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-14 text-center text-sm text-slate-500"
                    >
                      Đang tải danh sách Hội viên...
                    </td>
                  </tr>
                ) : filteredMembers.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-5 py-14 text-center text-sm text-slate-500"
                    >
                      Chưa tìm thấy Hội viên phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map(
                    (
                      member,
                      index,
                    ) => {
                      const branch =
                        getChiHoi(
                          member,
                        );

                      const account =
                        getTaiKhoan(
                          member,
                        );

                      return (
                        <tr
                          key={
                            member._id
                          }
                          className="text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            {index +
                              1}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-md bg-blue-50 px-2.5 py-1 font-semibold text-[#12345B]">
                              {
                                member.maHoiVien
                              }
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {
                                member.hoTen
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatGender(
                                member.gioiTinh,
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            {branch
                              ? `${branch.maChiHoi} - ${branch.tenChiHoi}`
                              : "Chưa xác định"}
                          </td>

                          <td className="px-5 py-4">
                            {member.lop ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            <p>
                              {member.soDienThoai ||
                                "—"}
                            </p>

                            <p className="mt-1 max-w-[210px] truncate text-xs text-slate-500">
                              {member.email ||
                                "—"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            {account ? (
                              <>
                                <p className="font-medium text-slate-900">
                                  {
                                    account.username
                                  }
                                </p>

                                <p className="mt-1 text-xs text-emerald-600">
                                  Đã cấp
                                </p>
                              </>
                            ) : (
                              <span className="text-slate-500">
                                Chưa cấp
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <RatingBadge
                              value={
                                member
                                  .danhGia
                                  ?.xepLoai
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              value={
                                member.trangThai
                              }
                            />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {canDirectManageMember &&
                                (account ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openResetPassword(
                                        member,
                                      )
                                    }
                                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#12345B] bg-white px-3 text-xs font-semibold text-[#12345B] hover:bg-blue-50"
                                  >
                                    <KeyRound
                                      size={
                                        16
                                      }
                                    />

                                    Đặt lại MK
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openCreateAccount(
                                        member,
                                      )
                                    }
                                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-500 bg-white px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                  >
                                    <KeyRound
                                      size={
                                        16
                                      }
                                    />

                                    Cấp tài khoản
                                  </button>
                                ))}

                              {canRateMember && (
                                <IconButton
                                  title="Đánh giá Hội viên"
                                  onClick={() =>
                                    openRating(
                                      member,
                                    )
                                  }
                                >
                                  <Award
                                    size={
                                      17
                                    }
                                  />
                                </IconButton>
                              )}

                              <IconButton
                                title="Xem chi tiết"
                                onClick={() =>
                                  setViewMember(
                                    member,
                                  )
                                }
                              >
                                <Eye
                                  size={
                                    17
                                  }
                                />
                              </IconButton>

                              {canEditMember && (
                                <IconButton
                                  title="Chỉnh sửa"
                                  onClick={() =>
                                    openEditForm(
                                      member,
                                    )
                                  }
                                >
                                  <Pencil
                                    size={
                                      17
                                    }
                                  />
                                </IconButton>
                              )}

                              {canDirectManageMember && (
                                <>
                                  <IconButton
                                    title={
                                      member.trangThai ===
                                      "DANG_HOAT_DONG"
                                        ? "Ngừng hoạt động"
                                        : "Kích hoạt lại"
                                    }
                                    onClick={() =>
                                      setStatusMember(
                                        member,
                                      )
                                    }
                                    danger={
                                      member.trangThai ===
                                      "DANG_HOAT_DONG"
                                    }
                                  >
                                    <Power
                                      size={
                                        17
                                      }
                                    />
                                  </IconButton>

                                  <IconButton
                                    title="Xóa Hội viên"
                                    onClick={() =>
                                      setDeleteMember(
                                        member,
                                      )
                                    }
                                    danger
                                  >
                                    <Trash2
                                      size={
                                        17
                                      }
                                    />
                                  </IconButton>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE */}

          <div className="divide-y divide-slate-200 lg:hidden">
            {loading ? (
              <p className="p-10 text-center text-sm text-slate-500">
                Đang tải danh sách Hội viên...
              </p>
            ) : filteredMembers.length ===
              0 ? (
              <p className="p-10 text-center text-sm text-slate-500">
                Chưa tìm thấy Hội viên phù hợp.
              </p>
            ) : (
              filteredMembers.map(
                (member) => {
                  const branch =
                    getChiHoi(
                      member,
                    );

                  const account =
                    getTaiKhoan(
                      member,
                    );

                  return (
                    <article
                      key={
                        member._id
                      }
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-[#12345B]">
                            {
                              member.maHoiVien
                            }
                          </span>

                          <h2 className="mt-3 font-semibold text-slate-900">
                            {
                              member.hoTen
                            }
                          </h2>
                        </div>

                        <StatusBadge
                          value={
                            member.trangThai
                          }
                        />
                      </div>

                      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Info
                          label="Chi hội"
                          value={
                            branch
                              ? `${branch.maChiHoi} - ${branch.tenChiHoi}`
                              : "Chưa xác định"
                          }
                        />

                        <Info
                          label="Lớp"
                          value={
                            member.lop ||
                            "—"
                          }
                        />

                        <Info
                          label="Số điện thoại"
                          value={
                            member.soDienThoai ||
                            "—"
                          }
                        />

                        <Info
                          label="Tài khoản"
                          value={
                            account?.username ||
                            "Chưa cấp"
                          }
                        />
                      </dl>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {canDirectManageMember &&
                          (account ? (
                            <MobileButton
                              onClick={() =>
                                openResetPassword(
                                  member,
                                )
                              }
                            >
                              <KeyRound
                                size={
                                  16
                                }
                              />

                              Đặt lại mật khẩu
                            </MobileButton>
                          ) : (
                            <MobileButton
                              onClick={() =>
                                openCreateAccount(
                                  member,
                                )
                              }
                            >
                              <KeyRound
                                size={
                                  16
                                }
                              />

                              Cấp tài khoản
                            </MobileButton>
                          ))}

                        {canRateMember && (
                          <MobileButton
                            onClick={() =>
                              openRating(
                                member,
                              )
                            }
                          >
                            <Award
                              size={
                                16
                              }
                            />

                            Đánh giá
                          </MobileButton>
                        )}

                        <MobileButton
                          onClick={() =>
                            setViewMember(
                              member,
                            )
                          }
                        >
                          <Eye
                            size={
                              16
                            }
                          />

                          Xem
                        </MobileButton>

                        {canEditMember && (
                          <MobileButton
                            onClick={() =>
                              openEditForm(
                                member,
                              )
                            }
                          >
                            <Pencil
                              size={
                                16
                              }
                            />

                            Sửa
                          </MobileButton>
                        )}

                        {canDirectManageMember && (
                          <>
                            <MobileButton
                              onClick={() =>
                                setStatusMember(
                                  member,
                                )
                              }
                              danger={
                                member.trangThai ===
                                "DANG_HOAT_DONG"
                              }
                            >
                              <Power
                                size={
                                  16
                                }
                              />

                              {member.trangThai ===
                              "DANG_HOAT_DONG"
                                ? "Ngừng"
                                : "Kích hoạt"}
                            </MobileButton>

                            <MobileButton
                              onClick={() =>
                                setDeleteMember(
                                  member,
                                )
                              }
                              danger
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />

                              Xóa
                            </MobileButton>
                          </>
                        )}
                      </div>
                    </article>
                  );
                },
              )
            )}
          </div>
        </section>
      </div>

      {/* ===================================================
          CREATE / EDIT
      =================================================== */}

      {formOpen && (
        <Modal
          title={
            editingMember
              ? "Cập nhật Hội viên"
              : "Thêm Hội viên"
          }
          description={
            isChiHoiTruong
              ? "Chi hội trưởng chỉ được cập nhật Hội viên thuộc Chi hội phụ trách."
              : "Vui lòng nhập đầy đủ và chính xác thông tin Hội viên."
          }
          onClose={() => {
            if (
              !submitting
            ) {
              setFormOpen(
                false,
              );
            }
          }}
        >
          <form
            onSubmit={
              handleSaveMember
            }
          >
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Field
                label="Mã Hội viên"
                required
              >
                <input
                  required
                  value={
                    form.maHoiVien
                  }
                  disabled={
                    isChiHoiTruong
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      maHoiVien:
                        event.target.value.toUpperCase(),
                    })
                  }
                  className="control disabled:cursor-not-allowed disabled:bg-slate-100"
                  placeholder="Ví dụ: HV001"
                />
              </Field>

              <Field
                label="Họ và tên"
                required
              >
                <input
                  required
                  value={
                    form.hoTen
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      hoTen:
                        event.target.value,
                    })
                  }
                  className="control"
                  placeholder="Nhập họ và tên"
                />
              </Field>

              <Field label="Ngày sinh">
                <input
                  type="date"
                  value={
                    form.ngaySinh
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      ngaySinh:
                        event.target.value,
                    })
                  }
                  className="control"
                />
              </Field>

              <Field label="Giới tính">
                <select
                  value={
                    form.gioiTinh
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      gioiTinh:
                        event.target
                          .value as GioiTinh,
                    })
                  }
                  className="control"
                >
                  <option value="NAM">
                    Nam
                  </option>

                  <option value="NU">
                    Nữ
                  </option>

                  <option value="KHAC">
                    Khác
                  </option>
                </select>
              </Field>

              <Field
                label="Chi hội"
                required
              >
                <select
                  required
                  disabled={
                    isChiHoiTruong
                  }
                  value={
                    form.chiHoiId
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      chiHoiId:
                        event.target.value,
                    })
                  }
                  className="control disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">
                    Chọn Chi hội
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={
                          branch._id
                        }
                        value={
                          branch._id
                        }
                      >
                        {
                          branch.maChiHoi
                        }{" "}
                        -{" "}
                        {
                          branch.tenChiHoi
                        }
                      </option>
                    ),
                  )}

                  {/*
                    Nếu CHT đang sửa Hội viên
                    nhưng branches chưa có,
                    vẫn giữ được Chi hội hiện tại.
                  */}
                  {isChiHoiTruong &&
                    form.chiHoiId &&
                    !branches.some(
                      (branch) =>
                        branch._id ===
                        form.chiHoiId,
                    ) && (
                      <option
                        value={
                          form.chiHoiId
                        }
                      >
                        Chi hội hiện tại
                      </option>
                    )}
                </select>
              </Field>

              <Field label="Lớp">
                <input
                  value={
                    form.lop
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      lop:
                        event.target.value,
                    })
                  }
                  className="control"
                  placeholder="Nhập lớp"
                />
              </Field>

              <Field label="Khóa học">
                <input
                  value={
                    form.khoaHoc
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      khoaHoc:
                        event.target.value,
                    })
                  }
                  className="control"
                  placeholder="Ví dụ: 2023 - 2027"
                />
              </Field>

              <Field label="Số điện thoại">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={
                    form.soDienThoai
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      soDienThoai:
                        event.target.value
                          .replace(
                            /\D/g,
                            "",
                          )
                          .slice(
                            0,
                            10,
                          ),
                    })
                  }
                  className="control"
                  placeholder="Ví dụ: 0912345678"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Số điện thoại gồm
                  10 chữ số và bắt
                  đầu bằng 0.
                </p>
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,

                      email:
                        event.target.value,
                    })
                  }
                  className="control"
                  placeholder="Nhập email"
                />
              </Field>

              {canDirectManageMember && (
                <Field label="Trạng thái">
                  <select
                    value={
                      form.trangThai
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm({
                        ...form,

                        trangThai:
                          event.target
                            .value as TrangThaiHoiVien,
                      })
                    }
                    className="control"
                  >
                    <option value="DANG_HOAT_DONG">
                      Đang hoạt động
                    </option>

                    <option value="TAM_NGUNG">
                      Tạm ngừng
                    </option>
                  </select>
                </Field>
              )}

              <div className="sm:col-span-2">
                <Field label="Địa chỉ">
                  <textarea
                    value={
                      form.diaChi
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm({
                        ...form,

                        diaChi:
                          event.target.value,
                      })
                    }
                    className="control min-h-24 resize-y py-3"
                    placeholder="Nhập địa chỉ"
                  />
                </Field>
              </div>
            </div>

            <ModalFooter
              submitting={
                submitting
              }
              submitText={
                editingMember
                  ? "Lưu thay đổi"
                  : "Thêm Hội viên"
              }
              onCancel={() =>
                setFormOpen(
                  false,
                )
              }
            />
          </form>
        </Modal>
      )}

      {/* ===================================================
          VIEW DETAIL
      =================================================== */}

      {viewMember && (
        <Modal
          title="Thông tin Hội viên"
          description={`${viewMember.maHoiVien} - ${viewMember.hoTen}`}
          onClose={() =>
            setViewMember(
              null,
            )
          }
        >
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Info
              label="Mã Hội viên"
              value={
                viewMember.maHoiVien
              }
            />

            <Info
              label="Họ và tên"
              value={
                viewMember.hoTen
              }
            />

            <Info
              label="Ngày sinh"
              value={formatDate(
                viewMember.ngaySinh,
              )}
            />

            <Info
              label="Giới tính"
              value={formatGender(
                viewMember.gioiTinh,
              )}
            />

            <Info
              label="Chi hội"
              value={
                getChiHoi(
                  viewMember,
                )
                  ? `${getChiHoi(viewMember)?.maChiHoi} - ${getChiHoi(viewMember)?.tenChiHoi}`
                  : "Chưa xác định"
              }
            />

            <Info
              label="Lớp"
              value={
                viewMember.lop ||
                "—"
              }
            />

            <Info
              label="Khóa học"
              value={
                viewMember.khoaHoc ||
                "—"
              }
            />

            <Info
              label="Số điện thoại"
              value={
                viewMember.soDienThoai ||
                "—"
              }
            />

            <Info
              label="Email"
              value={
                viewMember.email ||
                "—"
              }
            />

            <Info
              label="Tài khoản"
              value={
                getTaiKhoan(
                  viewMember,
                )?.username ||
                "Chưa cấp"
              }
            />

            <Info
              label="Xếp loại"
              value={formatRating(
                viewMember.danhGia
                  ?.xepLoai,
              )}
            />

            <Info
              label="Trạng thái"
              value={
                viewMember.trangThai ===
                "DANG_HOAT_DONG"
                  ? "Đang hoạt động"
                  : "Tạm ngừng"
              }
            />

            <div className="sm:col-span-2">
              <Info
                label="Địa chỉ"
                value={
                  viewMember.diaChi ||
                  "—"
                }
              />
            </div>

            {viewMember
              .danhGia
              ?.nhanXet && (
              <div className="sm:col-span-2">
                <Info
                  label="Nhận xét đánh giá"
                  value={
                    viewMember
                      .danhGia
                      .nhanXet
                  }
                />
              </div>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-200 p-4 sm:px-6">
            <button
              type="button"
              onClick={() =>
                setViewMember(
                  null,
                )
              }
              className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}

      {/* ===================================================
          RATING
      =================================================== */}

      {ratingMember && (
        <Modal
          title="Đánh giá Hội viên"
          description={`${ratingMember.maHoiVien} - ${ratingMember.hoTen}`}
          maxWidth="max-w-xl"
          onClose={() => {
            if (
              !submitting
            ) {
              setRatingMember(
                null,
              );
            }
          }}
        >
          <form
            onSubmit={
              handleSaveRating
            }
          >
            <div className="space-y-4 p-5 sm:p-6">
              <Field
                label="Xếp loại"
                required
              >
                <select
                  value={
                    ratingForm.xepLoai
                  }
                  onChange={(
                    event,
                  ) =>
                    setRatingForm({
                      ...ratingForm,

                      xepLoai:
                        event.target
                          .value as XepLoai,
                    })
                  }
                  className="control"
                >
                  <option value="XUAT_SAC">
                    Xuất sắc
                  </option>

                  <option value="TOT">
                    Tốt
                  </option>

                  <option value="KHA">
                    Khá
                  </option>

                  <option value="TRUNG_BINH">
                    Trung bình
                  </option>

                  <option value="YEU">
                    Yếu
                  </option>
                </select>
              </Field>

              <Field label="Nhận xét">
                <textarea
                  maxLength={
                    1000
                  }
                  value={
                    ratingForm.nhanXet
                  }
                  onChange={(
                    event,
                  ) =>
                    setRatingForm({
                      ...ratingForm,

                      nhanXet:
                        event.target.value,
                    })
                  }
                  className="control min-h-36 resize-y py-3"
                  placeholder="Nhập nhận xét"
                />

                <p className="mt-1 text-right text-xs text-slate-500">
                  {
                    ratingForm
                      .nhanXet
                      .length
                  }
                  /1000
                </p>
              </Field>

              {isChiHoiTruong && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-700">
                  Đây là đánh giá của
                  Chi hội trưởng. Luồng
                  đề xuất/phê duyệt đánh
                  giá sẽ được hoàn thiện
                  ở module đánh giá.
                </div>
              )}
            </div>

            <ModalFooter
              submitting={
                submitting
              }
              submitText="Lưu đánh giá"
              onCancel={() =>
                setRatingMember(
                  null,
                )
              }
            />
          </form>
        </Modal>
      )}

      {/* ===================================================
          ACCOUNT
      =================================================== */}

      {accountMember &&
        canDirectManageMember && (
          <Modal
            title="Cấp tài khoản Hội viên"
            description={`${accountMember.maHoiVien} - ${accountMember.hoTen}`}
            maxWidth="max-w-xl"
            onClose={() => {
              if (
                !submitting
              ) {
                setAccountMember(
                  null,
                );
              }
            }}
          >
            <form
              onSubmit={
                handleCreateAccount
              }
            >
              <div className="space-y-4 p-5 sm:p-6">
                <Field
                  label="Tên đăng nhập"
                  required
                >
                  <input
                    required
                    value={
                      accountForm.username
                    }
                    onChange={(
                      event,
                    ) =>
                      setAccountForm({
                        ...accountForm,

                        username:
                          event.target.value,
                      })
                    }
                    className="control"
                    placeholder="Nhập tên đăng nhập"
                    autoComplete="username"
                  />
                </Field>

                <Field
                  label="Mật khẩu"
                  required
                >
                  <div className="relative">
                    <input
                      required
                      minLength={6}
                      type={
                        showAccountPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        accountForm.password
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm({
                          ...accountForm,

                          password:
                            event.target
                              .value,
                        })
                      }
                      className="control pr-12"
                      placeholder="Nhập mật khẩu từ 6 ký tự"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowAccountPassword(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                      className="absolute right-1 top-1/2 flex h-9 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                      aria-label={
                        showAccountPassword
                          ? "Ẩn mật khẩu"
                          : "Hiện mật khẩu"
                      }
                    >
                      {showAccountPassword ? (
                        <EyeOff
                          size={
                            18
                          }
                        />
                      ) : (
                        <Eye
                          size={
                            18
                          }
                        />
                      )}
                    </button>
                  </div>
                </Field>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  Sau khi cấp, mật khẩu
                  được mã hóa và không thể
                  đọc lại. Có thể sử dụng
                  chức năng đặt lại mật
                  khẩu khi cần.
                </div>
              </div>

              <ModalFooter
                submitting={
                  submitting
                }
                submitText="Cấp tài khoản"
                onCancel={() =>
                  setAccountMember(
                    null,
                  )
                }
              />
            </form>
          </Modal>
        )}

      {/* ===================================================
          DELETE
      =================================================== */}

      {deleteMember &&
        canDirectManageMember && (
          <ConfirmModal
            title="Xóa Hội viên"
            message={
              <>
                Bạn có chắc chắn muốn
                xóa Hội viên{" "}
                <strong>
                  {
                    deleteMember.hoTen
                  }
                </strong>
                ? Dữ liệu đã xóa không
                thể khôi phục.
              </>
            }
            confirmText="Xóa Hội viên"
            submitting={
              submitting
            }
            danger
            onCancel={() =>
              setDeleteMember(
                null,
              )
            }
            onConfirm={
              handleDeleteMember
            }
          />
        )}

      {/* ===================================================
          STATUS
      =================================================== */}

      {statusMember &&
        canDirectManageMember && (
          <ConfirmModal
            title={
              statusMember.trangThai ===
              "DANG_HOAT_DONG"
                ? "Ngừng hoạt động Hội viên"
                : "Kích hoạt lại Hội viên"
            }
            message={
              statusMember.trangThai ===
              "DANG_HOAT_DONG" ? (
                <>
                  Bạn có muốn ngừng hoạt
                  động Hội viên{" "}
                  <strong>
                    {
                      statusMember.hoTen
                    }
                  </strong>
                  ? Tài khoản liên kết sẽ
                  không thể đăng nhập.
                </>
              ) : (
                <>
                  Bạn có muốn kích hoạt
                  lại Hội viên{" "}
                  <strong>
                    {
                      statusMember.hoTen
                    }
                  </strong>
                  ?
                </>
              )
            }
            confirmText={
              statusMember.trangThai ===
              "DANG_HOAT_DONG"
                ? "Ngừng hoạt động"
                : "Kích hoạt lại"
            }
            submitting={
              submitting
            }
            danger={
              statusMember.trangThai ===
              "DANG_HOAT_DONG"
            }
            onCancel={() =>
              setStatusMember(
                null,
              )
            }
            onConfirm={
              handleChangeStatus
            }
          />
        )}

      {/* ===================================================
          REFRESH
      =================================================== */}

      {refreshConfirmOpen && (
        <ConfirmModal
          title="Xác nhận làm mới"
          message={
            <>
              Bạn có muốn làm mới danh
              sách không? Hệ thống sẽ
              đặt lại tìm kiếm, bộ lọc
              và tải dữ liệu mới nhất.
              Thao tác này{" "}
              <strong>
                không xóa Hội viên
              </strong>
              .
            </>
          }
          confirmText="Đồng ý làm mới"
          submitting={
            loading
          }
          onCancel={() =>
            setRefreshConfirmOpen(
              false,
            )
          }
          onConfirm={
            handleRefresh
          }
        />
      )}

      {/* ===================================================
          RESET PASSWORD
      =================================================== */}

      {canDirectManageMember && (
        <ResetMatKhauHoiVienModal
          open={Boolean(
            resetMember,
          )}
          hoiVien={
            resetMember &&
            resetAccount
              ? {
                  _id:
                    resetMember._id,

                  maHoiVien:
                    resetMember.maHoiVien,

                  hoTen:
                    resetMember.hoTen,

                  username:
                    resetAccount.username,
                }
              : null
          }
          onClose={() =>
            setResetMember(
              null,
            )
          }
          onSuccess={(
            successMessage,
          ) => {
            setError("");

            setMessage(
              successMessage,
            );

            setResetMember(
              null,
            );

            void loadData();
          }}
        />
      )}

      {/* ===================================================
          GLOBAL CONTROL STYLE
      =================================================== */}

      <style jsx global>{`
        .control {
          width: 100%;
          min-height: 44px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding-left: 12px;
          padding-right: 12px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .control::placeholder {
          color: #94a3b8;
        }

        .control:focus {
          border-color: #12345b;
          box-shadow: 0 0 0 3px
            rgba(18, 52, 91, 0.1);
        }

        .control:disabled {
          cursor: not-allowed;
        }

        input[type="search"]::-webkit-search-cancel-button {
          display: none;
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  description,
  maxWidth = "max-w-2xl",
  onClose,
  children,
}: {
  title: string;
  description?: string;
  maxWidth?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[94vh] w-full ${maxWidth} overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-sm text-slate-600">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X
              size={20}
            />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="flex min-h-24 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div>
        <p className="text-xs font-medium text-slate-600 sm:text-sm">
          {label}
        </p>

        <p className="mt-2 text-2xl font-bold text-slate-950">
          {value}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${iconClass}`}
      >
        {icon}
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-600">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

/* =========================================================
   INFO
========================================================= */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>

      <dd className="mt-1.5 break-words text-sm font-medium leading-6 text-slate-800">
        {value}
      </dd>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  value,
}: {
  value: TrangThaiHoiVien;
}) {
  if (
    value ===
    "DANG_HOAT_DONG"
  ) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Đang hoạt động
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
      Tạm ngừng
    </span>
  );
}

/* =========================================================
   RATING BADGE
========================================================= */

function RatingBadge({
  value,
}: {
  value?: XepLoai;
}) {
  if (!value) {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        Chưa đánh giá
      </span>
    );
  }

  const styles: Record<
    XepLoai,
    string
  > = {
    XUAT_SAC:
      "bg-violet-50 text-violet-700",

    TOT:
      "bg-emerald-50 text-emerald-700",

    KHA:
      "bg-blue-50 text-blue-700",

    TRUNG_BINH:
      "bg-amber-50 text-amber-700",

    YEU:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value]}`}
    >
      {formatRating(
        value,
      )}
    </span>
  );
}

/* =========================================================
   ICON BUTTON
========================================================= */

function IconButton({
  title,
  danger = false,
  onClick,
  children,
}: {
  title: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-600 hover:bg-slate-100 hover:text-[#12345B]"
      }`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   MOBILE BUTTON
========================================================= */

function MobileButton({
  danger = false,
  onClick,
  children,
}: {
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/* =========================================================
   MODAL FOOTER
========================================================= */

function ModalFooter({
  submitting,
  submitText,
  onCancel,
}: {
  submitting: boolean;
  submitText: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:px-6">
      <button
        type="button"
        disabled={
          submitting
        }
        onClick={
          onCancel
        }
        className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Hủy
      </button>

      <button
        type="submit"
        disabled={
          submitting
        }
        className="h-11 rounded-lg bg-[#12345B] px-5 text-sm font-semibold text-white hover:bg-[#0D2947] disabled:opacity-60"
      >
        {submitting
          ? "Đang xử lý..."
          : submitText}
      </button>
    </div>
  );
}

/* =========================================================
   CONFIRM MODAL
========================================================= */

function ConfirmModal({
  title,
  message,
  confirmText,
  submitting,
  danger = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: ReactNode;
  confirmText: string;
  submitting: boolean;
  danger?: boolean;
  onCancel: () => void;

  onConfirm:
    () =>
      | void
      | Promise<void>;
}) {
  return (
    <Modal
      title={title}
      maxWidth="max-w-md"
      onClose={
        onCancel
      }
    >
      <div className="px-5 py-5 sm:px-6">
        <div className="text-sm leading-6 text-slate-600">
          {message}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          disabled={
            submitting
          }
          onClick={
            onCancel
          }
          className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Hủy
        </button>

        <button
          type="button"
          disabled={
            submitting
          }
          onClick={() =>
            void onConfirm()
          }
          className={`h-11 rounded-lg px-5 text-sm font-semibold text-white disabled:opacity-60 ${
            danger
              ? "bg-red-600 hover:bg-red-700"
              : "bg-[#12345B] hover:bg-[#0D2947]"
          }`}
        >
          {submitting
            ? "Đang xử lý..."
            : confirmText}
        </button>
      </div>
    </Modal>
  );
}
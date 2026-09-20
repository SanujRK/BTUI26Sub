import type { Role } from "./auth";

export const isStaffRole = (role?: Role) => role === "teacher" || role === "admin";

export const isAdminRole = (role?: Role) => role === "admin";

export const roleLabel: Record<Role, string> = {
  student: "Student",
  parent: "Parent",
  teacher: "Teacher",
  admin: "Admin",
};
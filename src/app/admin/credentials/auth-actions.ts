"use server";

import { redirect } from "next/navigation";
import { deleteSession, requireAdmin } from "@/app/lib/auth";

export async function logoutAction(): Promise<void> {
  await requireAdmin();
  await deleteSession();
  redirect("/login");
}

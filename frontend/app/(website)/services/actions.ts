"use server";

import { getServices } from "@/service/services";

export async function getServicesAction() {
  return await getServices();
}

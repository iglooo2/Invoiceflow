import { redirect } from "next/navigation";
import { ESTIMATE_NEW_PATH } from "@/lib/estimates";

export default function NewProposalRedirect() {
  redirect(ESTIMATE_NEW_PATH);
}

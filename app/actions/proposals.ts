"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { addDays } from "date-fns";
import { databaseRuntimeStatus, prisma } from "@/lib/db";
import { documentWriteFailureMessage, errorRedirect, safeErrorLog } from "@/lib/db-errors";
import { insertProposalWithSections, replaceProposalSections } from "@/lib/document-writes";
import { parseProposalForm } from "@/lib/proposal-input";
import { planFromUser, requireUser } from "@/lib/session";
import { assertCanCreate, newPublicToken, redirectIfLimitReached } from "@/lib/documents";
import { SEED_TEMPLATES, type ProposalTemplatePayload } from "@/lib/templates";
import { publicProposalUrl, sendDocumentEmail } from "@/lib/email";

export type ProposalActionResult = { error: string };

async function revalidateProposalPaths(proposalId?: string) {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/proposals");
    if (proposalId) revalidatePath(`/dashboard/proposals/${proposalId}`);
  } catch (error) {
    console.error("proposal revalidatePath", safeErrorLog(error));
  }
}

export async function createProposal(formData: FormData): Promise<ProposalActionResult | void> {
  const user = await requireUser();
  let proposalId: string;
  try {
    try {
      await assertCanCreate(user.id, planFromUser(user), "proposal");
    } catch (error) {
      redirectIfLimitReached(error);
    }
    const parsed = parseProposalForm(formData);
    if (!parsed.success) return { error: parsed.error };
    const proposal = await insertProposalWithSections(
      prisma,
      {
        userId: user.id,
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        status: parsed.data.status,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        notes: parsed.data.notes,
        publicToken: newPublicToken(),
        clientName: parsed.data.clientName,
        clientEmail: parsed.data.clientEmail,
        clientCompany: parsed.data.clientCompany,
      },
      parsed.data.sections,
    );
    proposalId = proposal.id;
  } catch (error) {
    unstable_rethrow(error);
    console.error("createProposal failed", safeErrorLog(error), databaseRuntimeStatus());
    return { error: documentWriteFailureMessage(error) };
  }
  await revalidateProposalPaths();
  redirect(`/dashboard/proposals/${proposalId}`);
}

export async function updateProposal(
  proposalId: string,
  formData: FormData,
): Promise<ProposalActionResult | void> {
  const user = await requireUser();
  try {
    const existing = await prisma.proposal.findFirst({
      where: { id: proposalId, userId: user.id },
    });
    if (!existing) return { error: "Proposal not found." };
    const parsed = parseProposalForm(formData);
    if (!parsed.success) return { error: parsed.error };
    await replaceProposalSections(
      prisma,
      proposalId,
      {
        clientId: parsed.data.clientId,
        title: parsed.data.title,
        status: parsed.data.status,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        notes: parsed.data.notes,
        clientName: parsed.data.clientName,
        clientEmail: parsed.data.clientEmail,
        clientCompany: parsed.data.clientCompany,
      },
      parsed.data.sections,
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("updateProposal failed", safeErrorLog(error), databaseRuntimeStatus());
    return { error: documentWriteFailureMessage(error) };
  }
  await revalidateProposalPaths(proposalId);
  redirect(`/dashboard/proposals/${proposalId}`);
}

export async function deleteProposal(proposalId: string) {
  const user = await requireUser();
  await prisma.proposal.deleteMany({ where: { id: proposalId, userId: user.id } });
  revalidatePath("/dashboard/proposals");
  redirect("/dashboard/proposals");
}

export async function createProposalFromTemplate(slug: string) {
  const user = await requireUser();
  try {
    try {
      await assertCanCreate(user.id, planFromUser(user), "proposal");
    } catch (error) {
      redirectIfLimitReached(error);
    }
    const template =
      (await prisma.documentTemplate.findUnique({ where: { slug } })) ??
      SEED_TEMPLATES.find((item) => item.slug === slug);
    if (!template || template.kind !== "proposal") {
      throw new Error("Template not found");
    }
    const payload = template.payload as ProposalTemplatePayload;
    const proposal = await insertProposalWithSections(
      prisma,
      {
        userId: user.id,
        title: payload.title,
        status: "draft",
        validUntil: payload.validForDays ? addDays(new Date(), payload.validForDays) : null,
        notes: payload.notes,
        publicToken: newPublicToken(),
        clientName: "New client",
      },
      payload.sections.map((section) => ({
        heading: section.heading,
        body: section.body,
        amount: section.amount ?? null,
      })),
    );
    await revalidateProposalPaths();
    redirect(`/dashboard/proposals/${proposal.id}/edit`);
  } catch (error) {
    unstable_rethrow(error);
    console.error("createProposalFromTemplate failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect("/dashboard/proposals/new", documentWriteFailureMessage(error)));
  }
}

export async function emailProposal(proposalId: string) {
  const user = await requireUser();
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId: user.id },
  });
  if (!proposal?.clientEmail) {
    return;
  }
  await sendDocumentEmail({
    to: proposal.clientEmail,
    subject: `${proposal.title} — proposal from ${user.businessName || user.name || "your freelancer"}`,
    heading: proposal.title,
    body: "Open the proposal to review, then accept or decline.",
    link: publicProposalUrl(proposal.publicToken),
  });
  if (proposal.status === "draft") {
    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "sent" } });
  }
  revalidatePath(`/dashboard/proposals/${proposalId}`);
}

export async function respondToProposal(token: string, decision: "accepted" | "declined") {
  const proposal = await prisma.proposal.findUnique({ where: { publicToken: token } });
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status === "accepted" || proposal.status === "declined") {
    return;
  }
  await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: decision },
  });
  revalidatePath(`/share/p/${token}`);
}

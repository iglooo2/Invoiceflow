"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { planFromUser, requireUser } from "@/lib/session";
import { assertCanCreate, newPublicToken, redirectIfLimitReached } from "@/lib/documents";
import { dollarsFromInput } from "@/lib/money";
import { SEED_TEMPLATES, type ProposalTemplatePayload } from "@/lib/templates";
import { publicProposalUrl, sendDocumentEmail } from "@/lib/email";

const sectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  amount: z.number().nullable(),
});

const proposalSchema = z.object({
  clientId: z.string().optional(),
  title: z.string().min(1),
  clientName: z.string().min(1),
  clientEmail: z.string().optional(),
  clientCompany: z.string().optional(),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "declined"]),
  sections: z.array(sectionSchema).min(1),
});

function parseProposalForm(formData: FormData) {
  const raw = formData.get("sectionsJson");
  const sections = raw ? JSON.parse(String(raw)) : [];
  return proposalSchema.parse({
    clientId: String(formData.get("clientId") || "") || undefined,
    title: String(formData.get("title") || ""),
    clientName: String(formData.get("clientName") || ""),
    clientEmail: String(formData.get("clientEmail") || "") || undefined,
    clientCompany: String(formData.get("clientCompany") || "") || undefined,
    validUntil: String(formData.get("validUntil") || "") || undefined,
    notes: String(formData.get("notes") || "") || undefined,
    status: String(formData.get("status") || "draft"),
    sections: (sections as { heading: string; body: string; amount: string }[]).map((section) => ({
      heading: section.heading,
      body: section.body,
      amount: section.amount === "" || section.amount == null ? null : dollarsFromInput(section.amount),
    })),
  });
}

export async function createProposal(formData: FormData) {
  const user = await requireUser();
  try {
    await assertCanCreate(user.id, planFromUser(user), "proposal");
  } catch (error) {
    redirectIfLimitReached(error);
  }
  const data = parseProposalForm(formData);
  const proposal = await prisma.proposal.create({
    data: {
      userId: user.id,
      clientId: data.clientId,
      title: data.title,
      status: data.status,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes,
      publicToken: newPublicToken(),
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientCompany: data.clientCompany,
      sections: {
        create: data.sections.map((section, index) => ({
          ...section,
          sortOrder: index,
        })),
      },
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/proposals");
  redirect(`/dashboard/proposals/${proposal.id}`);
}

export async function updateProposal(proposalId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.proposal.findFirst({
    where: { id: proposalId, userId: user.id },
  });
  if (!existing) throw new Error("Proposal not found");
  const data = parseProposalForm(formData);
  await prisma.$transaction([
    prisma.proposalSection.deleteMany({ where: { proposalId } }),
    prisma.proposal.update({
      where: { id: proposalId },
      data: {
        clientId: data.clientId,
        title: data.title,
        status: data.status,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientCompany: data.clientCompany,
        sections: {
          create: data.sections.map((section, index) => ({
            ...section,
            sortOrder: index,
          })),
        },
      },
    }),
  ]);
  revalidatePath(`/dashboard/proposals/${proposalId}`);
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
  const proposal = await prisma.proposal.create({
    data: {
      userId: user.id,
      title: payload.title,
      status: "draft",
      validUntil: payload.validForDays ? addDays(new Date(), payload.validForDays) : null,
      notes: payload.notes,
      publicToken: newPublicToken(),
      clientName: "New client",
      sections: {
        create: payload.sections.map((section, index) => ({
          heading: section.heading,
          body: section.body,
          amount: section.amount ?? null,
          sortOrder: index,
        })),
      },
    },
  });
  redirect(`/dashboard/proposals/${proposal.id}/edit`);
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { addDays } from "date-fns";
import { databaseRuntimeStatus, prisma } from "@/lib/db";
import { documentWriteFailureMessage, errorRedirect, safeErrorLog } from "@/lib/db-errors";
import { insertProposalWithSections, replaceProposalSections } from "@/lib/document-writes";
import { ESTIMATE_LIST_PATH, ESTIMATE_NEW_PATH, estimateDetailPath, estimateEditPath } from "@/lib/estimates";
import { parseProposalDecisionForm, parseProposalForm, parseProposalIdForm } from "@/lib/proposal-input";
import { planFromUser, requireUser } from "@/lib/session";
import { assertCanCreate, newPublicToken, redirectIfLimitReached } from "@/lib/documents";
import { SEED_TEMPLATES, type ProposalTemplatePayload } from "@/lib/templates";
import { publicProposalUrl, sendDocumentEmail } from "@/lib/email";
import { appCopy } from "@/lib/i18n-request";
import { shouldNotify } from "@/lib/studio-settings";
import { loadStudioSettings } from "@/lib/studio-settings-store";

export type ProposalActionResult = { error: string };

async function revalidateProposalPaths(proposalId?: string) {
  try {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/proposals");
    revalidatePath(ESTIMATE_LIST_PATH);
    if (proposalId) {
      revalidatePath(`/dashboard/proposals/${proposalId}`);
      revalidatePath(estimateDetailPath(proposalId));
    }
  } catch (error) {
    console.error("proposal revalidatePath", safeErrorLog(error));
  }
}

function ownerEmail(user: { businessEmail?: string | null; email?: string | null }) {
  return user.businessEmail || user.email || null;
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
    const settings = await loadStudioSettings(user.id);
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
        taxRate: parsed.data.taxRate,
        markupRate: parsed.data.markupRate,
        attachments: parsed.data.attachments,
        currency: settings.settings.defaultCurrency,
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
  redirect(estimateDetailPath(proposalId));
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
    if (!existing) {
      const { dict } = await appCopy();
      return { error: dict.app.errors.estimateNotFound };
    }
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
        taxRate: parsed.data.taxRate,
        markupRate: parsed.data.markupRate,
        attachments: parsed.data.attachments,
      },
      parsed.data.sections,
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("updateProposal failed", safeErrorLog(error), databaseRuntimeStatus());
    return { error: documentWriteFailureMessage(error) };
  }
  await revalidateProposalPaths(proposalId);
  redirect(estimateDetailPath(proposalId));
}

export async function deleteProposal(formData: FormData) {
  const user = await requireUser();
  const parsed = parseProposalIdForm(formData);
  if (!parsed.success) {
    redirect(errorRedirect(ESTIMATE_LIST_PATH, parsed.error));
  }
  const proposalId = parsed.data.proposalId;
  try {
    await prisma.proposal.deleteMany({ where: { id: proposalId, userId: user.id } });
  } catch (error) {
    unstable_rethrow(error);
    console.error("deleteProposal failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect(estimateDetailPath(proposalId), documentWriteFailureMessage(error)));
  }
  await revalidateProposalPaths();
  redirect(ESTIMATE_LIST_PATH);
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
    const settings = await loadStudioSettings(user.id);
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
        taxRate: 0,
        markupRate: settings.settings.defaultMarkupPercent,
        currency: settings.settings.defaultCurrency,
      },
      payload.sections.map((section) => ({
        heading: section.heading,
        body: section.body,
        amount: section.amount ?? null,
      })),
    );
    await revalidateProposalPaths();
    redirect(estimateEditPath(proposal.id));
  } catch (error) {
    unstable_rethrow(error);
    console.error("createProposalFromTemplate failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect(ESTIMATE_NEW_PATH, documentWriteFailureMessage(error)));
  }
}

export async function emailProposal(formData: FormData) {
  const user = await requireUser();
  const parsed = parseProposalIdForm(formData);
  if (!parsed.success) {
    redirect(errorRedirect(ESTIMATE_LIST_PATH, parsed.error));
  }
  const proposalId = parsed.data.proposalId;
  const detailPath = estimateDetailPath(proposalId);
  try {
    const proposal = await prisma.proposal.findFirst({
      where: { id: proposalId, userId: user.id },
    });
    if (!proposal) {
      const { dict } = await appCopy();
      redirect(errorRedirect(ESTIMATE_LIST_PATH, dict.app.errors.estimateNotFound));
    }
    if (!proposal.clientEmail) {
      const { dict } = await appCopy();
      redirect(errorRedirect(detailPath, dict.app.errors.clientEmailRequired));
    }
    await sendDocumentEmail({
      to: proposal.clientEmail,
      subject: `${proposal.title} — estimate from ${user.businessName || user.name || "your freelancer"}`,
      heading: proposal.title,
      body: (await loadStudioSettings(user.id)).settings.emailEstimateMessage,
      link: publicProposalUrl(proposal.publicToken),
    });
    if (proposal.status === "draft") {
      await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "sent" } });
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("emailProposal failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect(detailPath, documentWriteFailureMessage(error)));
  }
  await revalidateProposalPaths(proposalId);
  redirect(detailPath);
}

export async function markEstimateOpened(token: string) {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { publicToken: token },
      include: { user: true },
    });
    if (!proposal || proposal.viewedAt) return;
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { viewedAt: new Date() },
    });
    const to = ownerEmail(proposal.user);
    const settings = await loadStudioSettings(proposal.userId);
    if (to && shouldNotify(settings.settings, "opens")) {
      await sendDocumentEmail({
        to,
        subject: `${proposal.title} was opened`,
        heading: proposal.title,
        body: `${proposal.clientName} opened your estimate.`,
        link: publicProposalUrl(proposal.publicToken),
      });
    }
    revalidatePath(estimateDetailPath(proposal.id));
    revalidatePath(ESTIMATE_LIST_PATH);
  } catch (error) {
    console.error("markEstimateOpened failed", safeErrorLog(error));
  }
}

export async function respondToProposal(formData: FormData) {
  const parsed = parseProposalDecisionForm(formData);
  const token = parsed.success ? parsed.data.token : String(formData.get("token") || "");
  const sharePath = token ? `/share/p/${token}` : "/";
  if (!parsed.success) {
    redirect(errorRedirect(sharePath === "/" ? "/dashboard" : sharePath, parsed.error));
  }
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { publicToken: parsed.data.token },
      include: { user: true },
    });
    if (!proposal) {
      const { dict } = await appCopy();
      redirect(errorRedirect(sharePath, dict.app.errors.estimateNotFound));
    }
    if (proposal.status !== "accepted" && proposal.status !== "declined") {
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          status: parsed.data.decision,
          signedName: parsed.data.decision === "accepted" ? parsed.data.signedName ?? null : proposal.signedName,
          signedAt: parsed.data.decision === "accepted" ? new Date() : proposal.signedAt,
        },
      });
      const to = ownerEmail(proposal.user);
      const settings = await loadStudioSettings(proposal.userId);
      if (to && shouldNotify(settings.settings, "signs")) {
        const approved = parsed.data.decision === "accepted";
        await sendDocumentEmail({
          to,
          subject: approved ? `${proposal.title} was approved` : `${proposal.title} was declined`,
          heading: proposal.title,
          body: approved
            ? `${parsed.data.signedName || proposal.clientName} approved your estimate online.`
            : `${proposal.clientName} declined this estimate.`,
          link: publicProposalUrl(proposal.publicToken),
        });
      }
    }
  } catch (error) {
    unstable_rethrow(error);
    console.error("respondToProposal failed", safeErrorLog(error), databaseRuntimeStatus());
    redirect(errorRedirect(sharePath, documentWriteFailureMessage(error)));
  }
  try {
    revalidatePath(sharePath);
  } catch (error) {
    console.error("proposal respond revalidatePath", safeErrorLog(error));
  }
  redirect(sharePath);
}

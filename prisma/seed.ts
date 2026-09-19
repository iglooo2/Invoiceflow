import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";
import { SEED_TEMPLATES } from "../lib/templates";
import { nanoid } from "nanoid";
import { prisma } from "../lib/db";

async function main() {
  for (const template of SEED_TEMPLATES) {
    await prisma.documentTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        kind: template.kind,
        description: template.description,
        payload: template.payload,
      },
      create: {
        slug: template.slug,
        name: template.name,
        kind: template.kind,
        description: template.description,
        payload: template.payload,
      },
    });
  }

  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@invoiceflow.dev" },
    update: {
      name: "Maya Chen",
      businessName: "Studio North",
      businessEmail: "maya@studionorth.example",
      businessPhone: "(415) 555-0148",
      businessAddress: "14 Shotwell St, San Francisco, CA",
      website: "studionorth.example",
      phone: "+14155550148",
      employeeCount: "2-5",
      industry: "design",
      onboardingComplete: true,
      passwordHash,
    },
    create: {
      email: "demo@invoiceflow.dev",
      name: "Maya Chen",
      businessName: "Studio North",
      businessEmail: "maya@studionorth.example",
      businessPhone: "(415) 555-0148",
      businessAddress: "14 Shotwell St, San Francisco, CA",
      website: "studionorth.example",
      phone: "+14155550148",
      employeeCount: "2-5",
      industry: "design",
      onboardingComplete: true,
      passwordHash,
      plan: "free",
    },
  });

  await prisma.studioSettings.upsert({
    where: { userId: user.id },
    update: {
      firstName: "Maya",
      lastName: "Chen",
      addressLine1: "14 Shotwell St",
      city: "San Francisco",
      region: "CA",
      country: "United States",
      postalCode: "94110",
      industry: "design",
      emailEstimateMessage: "We are excited about the possibility of working with you.",
      emailInvoiceMessage: "Thanks for your business!",
      paymentTermsDays: 14,
    },
    create: {
      userId: user.id,
      firstName: "Maya",
      lastName: "Chen",
      addressLine1: "14 Shotwell St",
      city: "San Francisco",
      region: "CA",
      country: "United States",
      postalCode: "94110",
      industry: "design",
      emailEstimateMessage: "We are excited about the possibility of working with you.",
      emailInvoiceMessage: "Thanks for your business!",
      paymentTermsDays: 14,
    },
  });

  await prisma.contract.upsert({
    where: { id: "seed-contract-generic" },
    update: {
      name: "Generic Contract",
      details:
        "By signing this document, the customer agrees to the services and conditions outlined in this document.",
      defaultForEstimates: true,
      defaultForInvoices: true,
    },
    create: {
      id: "seed-contract-generic",
      userId: user.id,
      name: "Generic Contract",
      details:
        "By signing this document, the customer agrees to the services and conditions outlined in this document.",
      defaultForEstimates: true,
      defaultForInvoices: true,
    },
  });

  const luna = await prisma.client.upsert({
    where: { id: "seed-client-luna" },
    update: {},
    create: {
      id: "seed-client-luna",
      userId: user.id,
      name: "Luna Alvarez",
      email: "luna@hearthgoods.example",
      company: "Hearth Goods",
      address: "88 Valencia, San Francisco, CA",
    },
  });

  const oak = await prisma.client.upsert({
    where: { id: "seed-client-oak" },
    update: {},
    create: {
      id: "seed-client-oak",
      userId: user.id,
      name: "Priya Shah",
      email: "priya@oakandfilm.example",
      company: "Oak & Film",
      address: "Portland, OR",
    },
  });

  const existingInvoice = await prisma.invoice.findFirst({
    where: { userId: user.id, number: "INV-2026-0001" },
  });
  if (!existingInvoice) {
    await prisma.invoice.create({
      data: {
        userId: user.id,
        clientId: luna.id,
        number: "INV-2026-0001",
        status: "sent",
        issueDate: subDays(new Date(), 6),
        dueDate: addDays(new Date(), 8),
        taxRate: 0,
        notes: "50% due to start, remainder on delivery.",
        publicToken: nanoid(12),
        clientName: luna.name,
        clientEmail: luna.email,
        clientCompany: luna.company,
        clientAddress: luna.address,
        items: {
          create: [
            { description: "Brand discovery workshop (half-day)", quantity: 1, rate: 850, sortOrder: 0 },
            { description: "Visual identity system", quantity: 1, rate: 2400, sortOrder: 1 },
            { description: "Logo suite — primary, mark, wordmark", quantity: 1, rate: 1200, sortOrder: 2 },
          ],
        },
      },
    });
  }

  const existingProposal = await prisma.proposal.findFirst({
    where: { userId: user.id, title: "Picture edit & sound pass" },
  });
  if (!existingProposal) {
    await prisma.proposal.create({
      data: {
        userId: user.id,
        clientId: oak.id,
        title: "Picture edit & sound pass",
        status: "sent",
        validUntil: addDays(new Date(), 21),
        notes: "Two revision rounds included.",
        publicToken: nanoid(12),
        clientName: oak.name,
        clientEmail: oak.email,
        clientCompany: oak.company,
        sections: {
          create: [
            {
              heading: "The cut",
              body: "A picture lock that respects your footage and the brief — pacing, selects, lower-thirds, and a color-consistent timeline.",
              sortOrder: 0,
            },
            {
              heading: "Deliverables",
              body: "Master ProRes, social crops (9:16 and 1:1), caption file, and a project archive.",
              sortOrder: 1,
            },
            {
              heading: "Investment",
              body: "Assembly, fine cut, basic sound design, and music supervision.",
              amount: 3200,
              sortOrder: 2,
            },
          ],
        },
      },
    });
  }

  console.log("Seeded templates, demo user demo@invoiceflow.dev / demo1234, plus sample docs.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

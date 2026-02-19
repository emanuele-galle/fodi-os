-- CreateTable
CREATE TABLE "profit_goals" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoices" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "supplierName" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" TEXT NOT NULL,
    "firstDate" DATE NOT NULL,
    "lastPaidDate" DATE,
    "nextDueDate" DATE,
    "totalPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "bankAccountId" TEXT,
    "businessEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profit_goals_year_idx" ON "profit_goals"("year");

-- CreateIndex
CREATE UNIQUE INDEX "profit_goals_year_month_key" ON "profit_goals"("year", "month");

-- CreateIndex
CREATE INDEX "recurring_invoices_isActive_idx" ON "recurring_invoices"("isActive");

-- CreateIndex
CREATE INDEX "recurring_invoices_nextDueDate_idx" ON "recurring_invoices"("nextDueDate");

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_businessEntityId_fkey" FOREIGN KEY ("businessEntityId") REFERENCES "business_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

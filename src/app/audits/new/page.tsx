"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { AppShell } from "@/components/app/app-shell";
import { RoleGuard } from "@/components/app/role-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NewAuditPage() {
  const router = useRouter();
  const templates = useQuery(api.templates.listPublishedTemplatesForStart);
  const startAudit = useMutation(api.audits.startAudit);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);

  const onStart = async (templateId: Id<"auditTemplates">) => {
    setLoadingTemplateId(templateId);
    try {
      const auditId = await startAudit({ templateId });
      router.push(`/audits/${auditId}`);
    } finally {
      setLoadingTemplateId(null);
    }
  };

  return (
    <AppShell title="Start Audit" subtitle="Choose a published template.">
      <RoleGuard allowed={["auditor", "admin"]}>
        <div className="grid gap-3">
          {(templates ?? []).map((template) => (
            <Card key={template._id}>
              <CardHeader>
                <CardTitle>{template.title}</CardTitle>
                <CardDescription>
                  Version {template.version} • Published {template.publishedAt ? new Date(template.publishedAt).toLocaleString() : "Not available"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <Button
                  onClick={() => onStart(template._id)}
                  disabled={loadingTemplateId === template._id}
                >
                  {loadingTemplateId === template._id ? "Starting..." : "Start from template"}
                </Button>
              </CardContent>
            </Card>
          ))}
          {templates && templates.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                No published templates are available.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </RoleGuard>
    </AppShell>
  );
}

